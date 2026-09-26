# -*- coding: utf-8 -*-
"""Bibliotheque d'assets importes : une image classee, et le fragment de
prompt que le modele vision local en tire.

IT-10 chantier 5 — DOCS/cadrage/2026-09-26-it10-c5-importeur-assets.md.

DEUX MOITIES, COMME UNE POSE. Un asset porte un FRAGMENT de prompt, utilisable
tout de suite par le composeur, et son FICHIER, garde pour le jour ou un graphe
saura le greffer (IP-Adapter d'un vetement, compositing d'un fond). Ce module
livre la premiere moitie et range la seconde : il ne soumet aucun graphe de
production, seulement l'appel vision de `llm_local`.

QUI POSSEDE. Le monde possede, le personnage surcharge (ADR-0019) — la
mecanique des tons, `_merge_fields_by_key` : un personnage ajuste le libelle ou
le fragment d'un asset du monde sans en reimporter le fichier. Un catalogue
d'assets livre par un monde n'habille personne tout seul, contrairement a la
garde-robe d'une scene (`worlds.CHARACTER_ONLY_SCENE_KEYS`, ADR-0014 §2) :
c'est l'utilisateur qui va l'y chercher, scene par scene.

OU VIVENT LES OCTETS. Dans INPUTS/ASSETS/, hors git comme la banque de poses :
une image importee peut etre une photo reelle, et c'est la raison ecrite dans
`.gitignore`. La fiche, elle, vit dans le catalogue de son proprietaire —
`WORLDS/<id>.json / library`, ou `creative.json / library`.
"""
import io
import json
import re
import sys
from datetime import datetime
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

import llm_local                 # noqa: E402
import pose_texte                # noqa: E402
import runner as lb              # noqa: E402
import tenues                    # noqa: E402
import worlds                    # noqa: E402

OFM = HERE.parent
ASSETS_DIR = OFM / "INPUTS" / "ASSETS"

MAX_OCTETS = 20 * 1024 * 1024
_FORMAT_EXT = {"PNG": ".png", "JPEG": ".jpg", "WEBP": ".webp"}

# Sortie du modele -> fragment de prompt. Le meme nettoyage qu'un texte de
# pose (liste de clauses, visage retire, invariant 6) : un fragment d'asset a
# la meme forme, et la reparation des moignons de
# `legende.sans_clause_de_visage` viserait une legende narrative, pas une
# liste ou « white cotton » est une clause entiere.
_propre = pose_texte.propre

# LES CLASSES. Une par destination qui existe dans le composeur — la lumiere
# attend son chantier, la pose a deja sa banque. `champ` est le champ de scene
# ou le fragment atterrit ; None = bibliotheque seule, aucune destination
# aujourd'hui. C'est cette table que lit le selecteur, jamais un `if` sur la
# classe dans un panneau (invariant 7).
#
# LA CONSIGNE DEMANDE DU JSON, et ce n'est pas une preference de forme. Mesure
# du 26/09 sur une image reelle, consigne en prose : le modele REPETE la
# demande et raisonne a voix haute (« The user has requested a description of
# the garment... »), 500 caracteres inutilisables comme fragment. C'est le meme
# echec que `legende.py` le 10/09 et que `pose_texte` le 26/09, et le meme
# remede, deja mesure : une consigne cadree, une reponse JSON, rien d'autre.
CONSIGNE = """You write prompt fragments for an image generation model.

Describe %(quoi)s: %(cles)s.
Do not describe %(sans)s.

Answer with one JSON object and nothing else, no explanation, no repetition of this task:
{"fragment": "<short comma-separated phrase>"}
"""

CLASSES = {
    "vetement": {
        "label": "Vêtement",
        "champ": "wardrobe",
        "consigne": CONSIGNE % {
            "quoi": "the garment worn in this image",
            "cles": "type, cut, fabric, colour, pattern, notable details",
            "sans": "the person, the face, the pose, the background"},
    },
    "decor": {
        "label": "Décor",
        "champ": "prompt",
        "consigne": CONSIGNE % {
            "quoi": "the place in this image",
            "cles": "location, architecture or landscape, objects, time of day, light",
            "sans": "any person, any face, any clothing"},
    },
    "reference": {
        "label": "Référence",
        "champ": None,
        "consigne": CONSIGNE % {
            "quoi": "this image",
            "cles": "subject, materials, colours, style, light",
            "sans": "any face"},
    },
}

CHAMPS_AJUSTABLES = ("label", "fragment")


class AssetError(RuntimeError):
    """Refus cote bibliotheque — message deja pret pour l'ecran."""


def _slug(texte):
    return re.sub(r"[^a-z0-9]+", "-", str(texte or "").strip().lower()).strip("-")


def chemin(entree):
    """Fichier sur le disque d'une fiche d'asset."""
    return ASSETS_DIR / entree["fichier"]


def valider_image(octets):
    """Rend l'extension du format lu DANS LES OCTETS, jamais dans un champ
    client. Meme garde que la base gelee (`base_portrait.save_uploaded`) : ce
    qui n'est pas une image lisible n'entre pas dans INPUTS/."""
    if not octets:
        raise AssetError("image vide")
    if len(octets) > MAX_OCTETS:
        raise AssetError(f"image trop lourde ({len(octets) // 1024} Ko, "
                         f"max {MAX_OCTETS // 1024 // 1024} Mo)")
    from PIL import Image
    try:
        with Image.open(io.BytesIO(octets)) as im:
            im.verify()
            fmt = (im.format or "").upper()
    except Exception:                                        # noqa: BLE001
        raise AssetError("ces données ne sont pas une image lisible")
    ext = _FORMAT_EXT.get(fmt)
    if not ext:
        raise AssetError(f"format {fmt or '?'} non géré (png, jpeg ou webp)")
    return ext


def _monde(cid):
    wid = lb.character_world(cid)
    return wid if wid and worlds.exists(wid) else None


def _propres(cid):
    """(chemin de creative.json, contenu brut, bibliotheque propre) — la vue
    NON fusionnee, la seule qui dise ce qui appartient au personnage."""
    path = lb.creative_path(cid)
    raw = lb.load_json(path) if path.exists() else {}
    return path, raw, list(raw.get("library", []))


def _ecrire_propres(path, raw, bibliotheque):
    raw["library"] = bibliotheque
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(raw, ensure_ascii=False, indent=2), encoding="utf-8")


def bibliotheque(cid):
    """Les assets visibles par ce personnage : ceux de son monde, ajustes par
    les siens, plus les siens propres. Chaque fiche dit d'ou elle vient
    (`couche` : monde, surcharge, personnage)."""
    wid = _monde(cid)
    _, _, propres = _propres(cid)
    fusion = worlds.merge_library(wid, propres) if wid else list(propres)
    couches = worlds.library_layers(wid, propres)
    return [{**e, "couche": couches.get(e.get("key"), "personnage")} for e in fusion]


def trouver(cid, key):
    """La fiche fusionnee de `key`, ou AssetError."""
    entree = next((e for e in bibliotheque(cid) if e.get("key") == key), None)
    if entree is None:
        raise AssetError(f"asset inconnu : {key!r}")
    return entree


def _cle_libre(base, cid):
    prises = {e.get("key") for e in bibliotheque(cid)}
    cle, n = base, 1
    while cle in prises:
        n += 1
        cle = f"{base}-{n}"
    return cle


def analyser_fichier(fichier, classe, comfy_url=None):
    """Fragment lu sur l'image par le modele vision local. LEVE si le modele
    echoue : les deux appelants n'en font pas la meme chose."""
    brut = llm_local.texte(CLASSES[classe]["consigne"], image=fichier,
                           comfy_url=comfy_url, seed=1, max_length=160,
                           temperature=0.3, client_id="assets")
    # Le JSON est LU, jamais espere : hors de ses accolades, la reponse est le
    # raisonnement du modele, pas un fragment (mesure du 26/09).
    m = re.search(r'"fragment"\s*:\s*"([^"]*)"', brut or "")
    fragment = _propre(m.group(1)) if m else ""
    if not fragment:
        raise llm_local.LLMError(
            f"réponse illisible du modèle local : « {(brut or '')[:80]} »")
    return fragment


def importer(octets, nom_fichier, classe, cid, au_monde=False, comfy_url=None):
    """Fait entrer une image dans le studio. Rend la fiche ecrite.

    L'analyse est tentee dans la foulee et N'ANNULE JAMAIS L'IMPORT : ComfyUI
    hors ligne ou modele muet, l'asset nait sans fragment et le bouton
    « Analyser » reessaie — meme regle que le texte d'une pose a l'extraction.
    """
    if classe not in CLASSES:
        raise AssetError(f"classe inconnue : {classe!r}")
    wid = _monde(cid)
    if au_monde and not wid:
        raise AssetError("ce personnage n'a pas de monde : l'asset ne peut "
                         "appartenir qu'à lui")
    ext = valider_image(octets)
    label = (Path(nom_fichier or "").stem or CLASSES[classe]["label"]).strip()
    key = _cle_libre(_slug(label) or classe, cid)

    ASSETS_DIR.mkdir(parents=True, exist_ok=True)
    fichier = f"{key}{ext}"
    (ASSETS_DIR / fichier).write_bytes(octets)

    try:
        fragment = analyser_fichier(ASSETS_DIR / fichier, classe, comfy_url)
    except Exception:                                        # noqa: BLE001
        fragment = ""
    entree = {"key": key, "label": label, "classe": classe, "fragment": fragment,
              "fichier": fichier,
              "created_at": datetime.now().isoformat(timespec="seconds")}

    if au_monde:
        worlds.save_library(wid, worlds.library(wid) + [entree])
        return {**entree, "couche": "monde"}
    path, raw, propres = _propres(cid)
    _ecrire_propres(path, raw, propres + [entree])
    return {**entree, "couche": "personnage"}


def analyser(cid, key, comfy_url=None):
    """Reecrit le fragment d'un asset depuis son image. Action demandee : son
    echec remonte (`llm_local.LLMError`), il ne se tait pas."""
    entree = trouver(cid, key)
    fichier = chemin(entree)
    if not fichier.is_file():
        raise AssetError(f"l'image de « {entree.get('label') or key} » est introuvable")
    fragment = analyser_fichier(fichier, entree.get("classe", "reference"), comfy_url)
    enregistrer(cid, key, {"fragment": fragment},
                au_monde=entree["couche"] == "monde")
    return fragment


def enregistrer(cid, key, champs, au_monde=False):
    """Ecrit le libelle et/ou le fragment d'un asset.

    Par defaut cote PERSONNAGE : un asset du monde y gagne une surcharge qui
    ne porte que les champs ajustes, le monde continuant de fournir le reste
    (fusion champ par champ, comme un ton). `au_monde` corrige la fiche du
    monde elle-meme — refuse sur un asset qui ne lui appartient pas.
    """
    inconnus = [c for c in champs if c not in CHAMPS_AJUSTABLES]
    if inconnus:
        raise AssetError(f"champ non ajustable : {', '.join(inconnus)}")
    entree = trouver(cid, key)
    if au_monde:
        if entree["couche"] == "personnage":
            raise AssetError(f"« {entree.get('label') or key} » appartient au "
                             f"personnage, pas au monde")
        wid = _monde(cid)
        worlds.save_library(wid, [{**e, **champs} if e.get("key") == key else e
                                  for e in worlds.library(wid)])
        return
    path, raw, propres = _propres(cid)
    for i, e in enumerate(propres):
        if e.get("key") == key:
            propres[i] = {**e, **champs}
            break
    else:
        propres.append({"key": key, **champs})
    _ecrire_propres(path, raw, propres)


def supprimer(cid, key):
    """Retire un asset de la couche ou il vit, et rend cette couche.

    - `personnage` : la fiche part, et son image avec ;
    - `surcharge`  : seuls les ajustements partent, l'asset du monde revient ;
    - `monde`      : la fiche part du monde, et son image avec.
    """
    entree = trouver(cid, key)
    couche = entree["couche"]
    # Un asset qu'une tenue porte ne part pas : la tenue ne se resoudrait plus
    # (IT-10 c6). Une surcharge retiree n'est pas concernee, l'asset reste.
    if couche != "surcharge":
        portee = tenues.tenues_qui_portent(cid, key, au_monde=couche == "monde")
        if portee:
            raise AssetError(f"« {entree.get('label') or key} » est porté par "
                             f"{len(portee)} tenue(s) : {', '.join(portee)} — "
                             f"l'en retirer d'abord")
    if couche == "monde":
        wid = _monde(cid)
        worlds.save_library(wid, [e for e in worlds.library(wid)
                                  if e.get("key") != key])
        chemin(entree).unlink(missing_ok=True)
        return couche
    path, raw, propres = _propres(cid)
    _ecrire_propres(path, raw, [e for e in propres if e.get("key") != key])
    if couche == "personnage":
        chemin(entree).unlink(missing_ok=True)
    return couche
