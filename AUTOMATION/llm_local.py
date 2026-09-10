# -*- coding: utf-8 -*-
"""Parler au modele de langage LOCAL, celui que ComfyUI sert deja.

Le noeud coeur `TextGenerate`, alimente par `qwen3vl_4b_fp8_scaled` (declare au
manifeste, ADR-0022), est un modele VISION-LANGAGE : son entree `image` est
optionnelle. Le meme appel fait donc la reformulation et la lecture d'image.
Rien ne sort de la machine, aucune API payante, aucune dependance de plus.

POURQUOI CE MODULE EXISTE. `compose.py` savait deja soumettre ce graphe et
relire le texte ; `expression.py` savait deja faire ENTRER une image dans un
graphe (copie temporaire vers ComfyUI/input, noeud LoadImage, et le piege du
cache qui va avec). Le legendeur du jeu d'entrainement a besoin des deux. Ecrire
une seconde conversation avec ComfyUI a cote de la premiere, c'est « deux
implementations, une verite » -- la faute qui a coute deux corrections cette
semaine (checker_partage le 09/09, mesures.json le 10/09).

Ollama tourne sur ce poste et ferait le travail. Il n'est reference nulle part
dans le depot : l'employer ajouterait une dependance externe non declaree,
contre la promesse d'E10 (« tout reste dans le depot ») et contre l'invariant 12,
pour une capacite deja presente. Ecarte, et ecrit dans
DOCS/cadrage/2026-09-10-legendage-du-jeu-d-entrainement.md.
"""
import json
import shutil
import time
import urllib.request
import uuid
from pathlib import Path

import env_config

COMFY_INPUT = env_config.comfyui_input()

# Le modele servi par ComfyUI. `type="krea2"` vient de compose.build_graph :
# c'est le chargeur que ce CLIP attend, pas un choix.
CLIP_MODEL = "qwen3vl_4b_fp8_scaled.safetensors"
CLIP_TYPE = "krea2"

# Prefixe des copies temporaires dans ComfyUI/input. Meme convention que
# expression.py : reconnaissable, et nettoye par l'appelant.
PREFIXE = "_SG_LLM_"

SORTIE = "3"          # id du noeud PreviewAny dans le graphe ci-dessous


class LLMError(RuntimeError):
    """L'appel au modele local a echoue. Jamais avale ici : l'appelant decide
    s'il retombe sur une valeur sure ou s'il remonte l'erreur."""


def graphe_texte(prompt, image=None, seed=None, max_length=512,
                 temperature=0.7):
    """Graphe `CLIPLoader -> TextGenerate -> PreviewAny`, avec image optionnelle.

    `image` est le NOM d'un fichier deja depose dans ComfyUI/input — LoadImage
    ne lit que ce dossier. C'est `texte()` qui s'occupe de la copie.
    """
    g = {
        "1": {"class_type": "CLIPLoader",
              "inputs": {"clip_name": CLIP_MODEL, "type": CLIP_TYPE,
                         "device": "default"}},
        "2": {"class_type": "TextGenerate",
              "inputs": {"clip": ["1", 0], "prompt": prompt,
                         "max_length": int(max_length),
                         "sampling_mode": "on",
                         "sampling_mode.temperature": float(temperature),
                         "sampling_mode.top_k": 64,
                         "sampling_mode.top_p": 0.95,
                         "sampling_mode.min_p": 0.05,
                         "sampling_mode.repetition_penalty": 1.05,
                         "sampling_mode.seed": int(
                             seed if seed is not None else time.time() % 100000)}},
        SORTIE: {"class_type": "PreviewAny", "inputs": {"source": ["2", 0]}},
    }
    if image:
        g["4"] = {"class_type": "LoadImage", "inputs": {"image": image}}
        g["2"]["inputs"]["image"] = ["4", 0]
    return g


def _soumettre(graphe, comfy_url, timeout, client_id):
    req = urllib.request.Request(
        comfy_url.rstrip("/") + "/prompt",
        data=json.dumps({"prompt": graphe, "client_id": client_id}).encode(),
        headers={"Content-Type": "application/json"})
    try:
        pid = json.load(urllib.request.urlopen(req, timeout=60))["prompt_id"]
    except Exception as e:                                   # noqa: BLE001
        raise LLMError(f"soumission refusee par ComfyUI : {e}") from e
    t0 = time.time()
    while time.time() - t0 < timeout:
        with urllib.request.urlopen(f"{comfy_url}/history/{pid}", timeout=30) as r:
            hist = json.load(r)
        if pid in hist:
            entree = hist[pid]
            erreurs = [m for m in entree.get("status", {}).get("messages", [])
                       if m[0] == "execution_error"]
            if erreurs:
                raise LLMError(erreurs[0][1].get("exception_message", "erreur"))
            return "".join(entree.get("outputs", {}).get(SORTIE, {}).get("text", []))
        time.sleep(1)
    raise LLMError(f"aucune reponse du modele local apres {timeout} s")


def texte(prompt, image=None, comfy_url=None, timeout=300, seed=None,
          max_length=512, temperature=0.7, client_id="soulglade_llm"):
    """Rend la reponse du modele local. `image` : un Path a lire, ou None.

    L'image est copiee dans ComfyUI/input sous un nom UNIQUE, puis supprimee.
    Le nom unique n'est pas de la coquetterie : ComfyUI met en cache par
    signature de noeud, et deux appels d'affilee sur un LoadImage de meme nom
    renvoient la reponse du premier -- pour un legendage image par image, ce
    serait la meme legende partout, sans un seul message d'erreur.
    """
    comfy_url = comfy_url or env_config.comfy_url()
    tmp = None
    try:
        nom = None
        if image is not None:
            src = Path(image)
            if not src.is_file():
                raise LLMError(f"image introuvable : {src}")
            COMFY_INPUT.mkdir(parents=True, exist_ok=True)
            tmp = COMFY_INPUT / f"{PREFIXE}{uuid.uuid4().hex[:8]}_{src.name}"
            shutil.copy(src, tmp)
            nom = tmp.name
        return _soumettre(graphe_texte(prompt, nom, seed, max_length, temperature),
                          comfy_url, timeout, client_id)
    finally:
        if tmp is not None:
            tmp.unlink(missing_ok=True)


def nettoyer_scratch():
    """Retire les copies temporaires qu'un arret brutal aurait laissees."""
    n = 0
    if COMFY_INPUT.exists():
        for f in COMFY_INPUT.glob(PREFIXE + "*"):
            f.unlink(missing_ok=True)
            n += 1
    return n
