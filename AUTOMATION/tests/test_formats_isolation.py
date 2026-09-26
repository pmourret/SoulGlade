# -*- coding: utf-8 -*-
"""Les formats d'un personnage sont les siens (IT-10 chantier 3).

`config.formats` est la seule liste de ce qu'un personnage sait rendre : un
format hors liste cassait le lot sur une KeyError, au fond du runner. Deux
personnages sondes, SANS ComfyUI :
  - A porte cinq formats, dont 16:9 ;
  - B ne porte que 1:1.
Le meme 16:9 est accepte chez A et refuse chez B : a l'enregistrement de la
banque, au plan et au lancement. Un melange des deux configs se verrait ici.
Et le composeur ramene un format hors liste au premier de la liste.

Lancer :  python AUTOMATION/tests/test_formats_isolation.py
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

import compose                                # noqa: E402
import worlds                                 # noqa: E402
from api.main import app                      # noqa: E402
from fastapi.testclient import TestClient     # noqa: E402

WORLD = "probe-formats-world"
WORLD_PATH = worlds.world_path(WORLD)
A, B = "probe-formats-a", "probe-formats-b"
LENA = OFM / "CHARACTERS" / "lena"
KO = 0
CLIENT = TestClient(app, base_url="http://127.0.0.1")


def verifie(ok, texte):
    global KO
    print(f"  {'ok   ' if ok else 'ECHEC'} {texte}")
    if not ok:
        KO += 1


def banque(fmt):
    return {"prefix": "PROBE", "anchor": "probe anchor", "texture": "probe texture",
            "world": WORLD, "scenes": [{"id": "large", "world": WORLD, "origin": "manual",
                                        "intention": "lifestyle", "prompt": "a wide view",
                                        "intensity": 0, "wardrobe": {"0": "a coat"},
                                        "format": fmt, "count": 1}]}


def personnage(cid, formats):
    d = OFM / "CHARACTERS" / cid
    shutil.rmtree(d, ignore_errors=True)
    d.mkdir(parents=True)
    (d / "character.json").write_text(json.dumps({
        "id": cid, "name": cid, "universe": "instagram-influenceur",
        "type": "instagram-influenceur", "output_style": "realiste",
        "world": WORLD, "content_types": {"image": True}, "nsfw": False}), encoding="utf-8")
    config = json.loads((LENA / "config.json").read_text(encoding="utf-8"))
    config["formats"] = {k: [1024, 1024] for k in formats}
    config["export_sizes"] = {k: [1080, 1080] for k in formats}
    (d / "config.json").write_text(json.dumps(config), encoding="utf-8")
    shutil.copy(LENA / "creative.json", d / "creative.json")
    (d / "scenes.json").write_text(json.dumps(banque(formats[0])), encoding="utf-8")


try:
    WORLD_PATH.write_text(json.dumps({
        "id": WORLD, "label": "Monde des formats", "compatible_families": ["flux"],
        "assets": {"lora": None, "lora_strength": None, "prompt_add": ""},
        "intentions": [{"key": "lifestyle", "label": "Lifestyle"}], "scenes": [],
    }), encoding="utf-8")
    personnage(A, ["4:5", "2:3", "9:16", "1:1", "16:9"])
    personnage(B, ["1:1"])

    print("\n[1] la banque accepte les formats du personnage, et eux seuls")
    r = CLIENT.post(f"/api/scenes?character={A}", json={"data": banque("16:9")})
    verifie(r.status_code == 200, f"A : scene en 16:9 enregistree ({r.status_code} {r.text[:120]})")
    avant = (OFM / "CHARACTERS" / B / "scenes.json").read_bytes()
    r = CLIENT.post(f"/api/scenes?character={B}", json={"data": banque("16:9")})
    verifie(r.status_code == 400 and "16:9" in r.text and "1:1" in r.text,
            f"B : 16:9 refuse, en nommant ses formats ({r.status_code})")
    verifie((OFM / "CHARACTERS" / B / "scenes.json").read_bytes() == avant,
            "B : scenes.json intact apres le refus")

    print("\n[2] Produire : un format impose hors liste est refuse avant le lancement")
    r = CLIENT.post(f"/api/plan?character={A}", json={"format": "16:9"})
    jobs = r.json().get("jobs", [])
    verifie(r.status_code == 200 and jobs and all(j["format"] == "16:9" for j in jobs),
            f"A : le plan porte le 16:9 impose ({r.json().get('erreur')})")
    r = CLIENT.post(f"/api/plan?character={B}", json={"format": "16:9"})
    verifie(not r.json().get("jobs") and "16:9" in (r.json().get("erreur") or ""),
            f"B : le plan refuse le 16:9 ({r.json().get('erreur')})")
    r = CLIENT.post(f"/api/run?character={B}", json={"format": "16:9"})
    verifie(r.status_code == 400 and "16:9" in r.text, f"B : le lancement refuse le 16:9 ({r.status_code})")

    print("\n[3] le composeur ne propose que les formats du personnage")
    brut = {"id": "x", "prompt": "a wide view", "format": "16:9"}
    verifie(compose.clean(brut, formats=["4:5", "16:9"])["format"] == "16:9",
            "16:9 garde chez un personnage qui le porte")
    verifie(compose.clean(brut, formats=["1:1"])["format"] == "1:1",
            "16:9 ramene au premier format chez un personnage a 1:1 seul")
    texte = json.dumps(compose.build_graph("un panorama", 1, {}, 1, formats=["1:1", "16:9"]))
    verifie("1:1, 16:9" in texte, "le prompt du modele enumere les formats du personnage")
finally:
    for cid in (A, B):
        shutil.rmtree(OFM / "CHARACTERS" / cid, ignore_errors=True)
    WORLD_PATH.unlink(missing_ok=True)

print()
print("=" * 70)
print(f"{KO} ECHEC(S)" if KO else "tout est vert")
print("=" * 70)
sys.exit(1 if KO else 0)
