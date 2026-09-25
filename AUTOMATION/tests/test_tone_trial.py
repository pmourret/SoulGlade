# -*- coding: utf-8 -*-
"""Essai de rendu d'un ton : garde, refus et isolation (IT-10, 25/09).

POURQUOI CE TEST EXISTE. L'essai lance ComfyUI sur la meme scene a la meme
graine, sans puis avec un ton : c'est le geste qui a trouve le « slight motion
blur » de `joueur`. Il passe par le meme etat de lot que la production. Ce test
verrouille, SANS ComfyUI, ce qui doit tenir avant tout rendu :

  1. un ton ou une scene inconnus sont refuses AVANT d'armer l'etat de lot —
     un refus qui laisserait `running` a vrai bloquerait tout le studio ;
  2. un lot en cours refuse l'essai en 409 (un seul GPU) ;
  3. deux jobs, et seul le ton les separe : meme scene, meme graine ;
  4. ISOLATION : l'essai d'un personnage n'est ni lisible ni servi a un autre,
     et les chemins d'images ne quittent jamais le serveur — l'ecran demande
     une image par son libelle, jamais par un chemin.

Le rendu reel se verifie a la main contre ComfyUI (cadrage, etape 4).

Lancer :  python AUTOMATION/tests/test_tone_trial.py
"""
import json
import shutil
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
AUTOMATION = HERE.parent
OFM = AUTOMATION.parent
sys.path.insert(0, str(AUTOMATION / "web"))
sys.path.insert(0, str(AUTOMATION))

import shared_state as ss                                   # noqa: E402
import worlds                                               # noqa: E402
from api.main import app                                    # noqa: E402
from api.services.batch import trial_jobs                   # noqa: E402
from fastapi.testclient import TestClient                   # noqa: E402

W = "probe-trial-world"
CA, CB = "probe-trial-a", "probe-trial-b"
KO = 0
CLIENT = TestClient(app, base_url="http://127.0.0.1")


def verifie(ok, texte):
    global KO
    print(f"  {'ok   ' if ok else 'ECHEC'} {texte}")
    if not ok:
        KO += 1


def poser():
    worlds.world_path(W).write_text(json.dumps({
        "id": W, "label": W, "compatible_families": ["flux"], "suggested_styles": ["realiste"],
        "assets": {"lora": None, "lora_strength": None, "prompt_add": ""},
        "tone": "", "ui_skin_token": f"world-{W}", "places": [],
        "tones": [{"key": "joueur", "label": "Joueur", "prompt_add": "candid movement"}],
    }), encoding="utf-8")
    for cid in (CA, CB):
        d = OFM / "CHARACTERS" / cid
        shutil.rmtree(d, ignore_errors=True)
        d.mkdir(parents=True)
        (d / "character.json").write_text(json.dumps({
            "id": cid, "name": cid, "world": W, "content_types": {"image": True},
            "universe": "instagram-influenceur", "type": "instagram-influenceur",
            "output_style": "realiste"}), encoding="utf-8")
        (d / "creative.json").write_text(json.dumps(
            {"intentions": [], "tones": [], "intensity": [
                {"level": 0, "key": "sfw", "label": "SFW strict", "pipeline": "produce",
                 "wardrobe": "fully covered everyday clothing", "prompt_add": ""}]}),
            encoding="utf-8")
        (d / "scenes.json").write_text(json.dumps({
            "prefix": "PROBE", "anchor": "probe anchor", "texture": "probe texture",
            "direction": "", "world": W,
            "scenes": [{"id": "s1", "intention": "lifestyle", "format": "4:5", "count": 1,
                        "intensity": 0, "prompt": "a quiet room",
                        "wardrobe": {"0": "a grey sweater"}, "tones": [], "variants": []}],
        }), encoding="utf-8")


try:
    print("=" * 70)
    print("essai de rendu d'un ton : garde, refus, isolation")
    print("=" * 70)
    poser()
    etat_initial = dict(ss.STATE)

    print("\n[1] refus avant d'armer l'etat de lot")
    r = CLIENT.post(f"/api/tones/essai?character={CA}", json={"scene": "s1", "tone": "inconnu"})
    verifie(r.status_code == 400 and not ss.STATE["running"],
            f"ton inconnu : 400, lot non arme ({r.status_code})")
    r = CLIENT.post(f"/api/tones/essai?character={CA}", json={"scene": "nulle", "tone": "joueur"})
    verifie(r.status_code == 400 and not ss.STATE["running"],
            f"scene inconnue : 400, lot non arme ({r.status_code} — {r.text[:120]})")
    verifie("scène introuvable" in r.json().get("erreur", ""), "et pour la bonne raison")

    print("\n[2] un lot en cours refuse l'essai")
    ss.STATE["running"] = True
    r = CLIENT.post(f"/api/tones/essai?character={CA}", json={"scene": "s1", "tone": "joueur"})
    verifie(r.status_code == 409, f"409 pendant un lot ({r.status_code})")
    ss.STATE["running"] = False

    print("\n[3] deux jobs, seul le ton change")
    jobs = trial_jobs(CA, "s1", "joueur", 1001)
    verifie([label for label, _ in jobs] == ["sans_ton", "joueur"], "sans ton, puis le ton")
    (_, a), (_, b) = jobs
    verifie(a["seed"] == b["seed"] == 1001 and a["scene"] == b["scene"] == "s1",
            "meme scene, meme graine")
    verifie("candid movement" in b["prompt"] and "candid movement" not in a["prompt"],
            "le fragment du ton n'est que dans le second prompt")
    verifie(a["prompt"] == b["prompt"].replace(", candid movement", ""),
            "et c'est la seule difference entre les deux prompts")

    print("\n[4] isolation : l'essai d'un personnage n'est pas celui d'un autre")
    image = OFM / "PROD" / CA.upper() / "_BENCH" / "essai-ton-probe" / "joueur" / "x.png"
    image.parent.mkdir(parents=True, exist_ok=True)
    image.write_bytes(b"\x89PNG probe")
    ss.STATE["essai"] = {"id": "essai-ton-probe", "character": CA, "scene": "s1",
                         "tone": "joueur", "seed": 1001,
                         "results": {"joueur": {"path": str(image), "verdict": "OK",
                                                "score": 0.75, "measures": {"bruit_fond": 1.6}}}}
    r = CLIENT.get(f"/api/tones/essai?character={CA}")
    corps = r.text
    verifie(r.status_code == 200 and r.json()["essai"]["results"]["joueur"]["measures"]["bruit_fond"] == 1.6,
            "le personnage lit son essai et ses mesures")
    verifie(str(image.parent) not in corps and "path" not in corps,
            "aucun chemin d'image ne sort du serveur")
    verifie(CLIENT.get(f"/api/tones/essai/image/joueur?character={CA}").content == b"\x89PNG probe",
            "son image est servie par son libelle")
    verifie(CLIENT.get(f"/api/tones/essai?character={CB}").json()["essai"] is None,
            "un autre personnage ne voit pas cet essai")
    verifie(CLIENT.get(f"/api/tones/essai/image/joueur?character={CB}").status_code == 404,
            "et ne se fait pas servir son image")
    verifie(CLIENT.get(f"/api/tones/essai/image/..%2F..%2Fconfig?character={CA}").status_code == 404,
            "un libelle qui ressemble a un chemin ne mene nulle part")

finally:
    ss.STATE.pop("essai", None)
    ss.STATE["running"] = False
    if worlds.world_path(W).exists():
        worlds.world_path(W).unlink()
    for cid in (CA, CB):
        shutil.rmtree(OFM / "CHARACTERS" / cid, ignore_errors=True)
        shutil.rmtree(OFM / "PROD" / cid.upper(), ignore_errors=True)

print("\n" + ("TOUT EST VERT" if KO == 0 else f"{KO} ECHEC(S)"))
sys.exit(1 if KO else 0)
