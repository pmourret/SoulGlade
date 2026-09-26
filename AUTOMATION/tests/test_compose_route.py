# -*- coding: utf-8 -*-
"""Le composeur de scenes, redefini sur le modele d'ADR-0027 (IT-11 chantier 6).

Ce que ce test verrouille, SANS ComfyUI (le modele local est remplace par un
bouchon qui rend des propositions fixes et note ce qu'on lui a donne) :
  1. le texte libre s'appelle `brief` ; vide, il est refuse ;
  2. un lieu inconnu du monde du personnage est refuse avant tout appel ;
  3. l'intention et le lieu CHOISIS sont poses sur chaque proposition, qui
     ressort `origin: "compose"` ; le texte du decor est donne au modele ;
  4. les ids sont dedoublonnes contre la banque ;
  5. proposer n'ecrit rien : ni la banque, ni le monde (octet pour octet) ;
  6. `build_graph` porte le decor dans le prompt du modele, et ne l'y met pas
     sans lieu.

Lancer :  python AUTOMATION/tests/test_compose_route.py
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
from api.routers import bank as bank_router   # noqa: E402
from fastapi.testclient import TestClient     # noqa: E402

WORLD = "probe-compose-world"
WORLD_PATH = worlds.world_path(WORLD)
CHAR = "probe-compose"
CHAR_DIR = OFM / "CHARACTERS" / CHAR
KO = 0
CLIENT = TestClient(app, base_url="http://127.0.0.1")


def verifie(ok, texte):
    global KO
    print(f"  {'ok   ' if ok else 'ECHEC'} {texte}")
    if not ok:
        KO += 1


APPELS = []


def bouchon(brief, count, creative, comfy_url, decor="", formats=()):
    APPELS.append({"brief": brief, "count": count, "decor": decor})
    return ([{"id": "p1", "intention": "lifestyle", "format": "4:5", "count": 1,
              "tags": [], "tones": [], "intensity": 0, "prompt": "stirring a pot",
              "wardrobe": {"0": "a linen apron"}, "variants": [], "alertes": []},
             {"id": "mug", "intention": "lifestyle", "format": "4:5", "count": 1,
              "tags": [], "tones": [], "intensity": 0, "prompt": "holding a mug",
              "wardrobe": {"0": "a sweater"}, "variants": [], "alertes": []}], "[...]")


vrai_compose = bank_router.composer.compose
try:
    WORLD_PATH.write_text(json.dumps({
        "id": WORLD, "label": "Monde du composeur", "compatible_families": ["flux"],
        "assets": {"lora": None, "lora_strength": None, "prompt_add": ""},
        "places": [{"id": "cuisine", "label": "Cuisine", "prompt": "a small sunlit kitchen"}],
        "intentions": [{"key": "lifestyle", "label": "Lifestyle"},
                       {"key": "sport", "label": "Sport"}],
        "scenes": [{"id": "p1", "label": "Scene 1", "intention": "lifestyle",
                    "place": "cuisine", "prompt": "reading"}],
    }), encoding="utf-8")
    if CHAR_DIR.exists():
        shutil.rmtree(CHAR_DIR)
    CHAR_DIR.mkdir(parents=True)
    (CHAR_DIR / "character.json").write_text(json.dumps({
        "id": CHAR, "name": CHAR, "universe": "instagram-influenceur",
        "type": "instagram-influenceur", "output_style": "realiste",
        "world": WORLD, "content_types": {"image": True}, "nsfw": False}), encoding="utf-8")
    lena = OFM / "CHARACTERS" / "lena"
    shutil.copy(lena / "config.json", CHAR_DIR / "config.json")
    shutil.copy(lena / "creative.json", CHAR_DIR / "creative.json")
    (CHAR_DIR / "scenes.json").write_text(json.dumps({
        "prefix": "PROBE", "anchor": "probe anchor", "texture": "probe texture",
        "world": WORLD, "scenes": [worlds.merge_scene(WORLD, "p1", {"wardrobe": {"0": ""}})],
    }), encoding="utf-8")
    bank_router.composer.compose = bouchon
    avant_banque = (CHAR_DIR / "scenes.json").read_bytes()
    avant_monde = WORLD_PATH.read_bytes()
    url = f"/api/compose?character={CHAR}"

    print("\n[1] le texte libre s'appelle brief, et vide il est refuse")
    r = CLIENT.post(url, json={"brief": "   ", "count": 2})
    verifie(r.status_code == 400 and not APPELS, f"brief vide : 400, modele jamais appele ({r.status_code})")

    print("\n[2] un lieu inconnu du monde est refuse avant tout appel")
    r = CLIENT.post(url, json={"brief": "cuisiner", "place": "nulle_part"})
    verifie(r.status_code == 400 and "nulle_part" in r.text and not APPELS,
            f"lieu inconnu : 400 qui le nomme ({r.status_code})")

    print("\n[3] intention et lieu choisis, origine compose, decor donne au modele")
    r = CLIENT.post(url, json={"brief": "elle cuisine le matin", "intention": "sport",
                               "place": "cuisine", "count": 2})
    body = r.json()
    verifie(r.status_code == 200 and len(body["scenes"]) == 2, f"deux propositions ({r.status_code})")
    verifie(all(s["intention"] == "sport" and s["place"] == "cuisine" and s["origin"] == "compose"
                for s in body["scenes"]),
            "chaque proposition porte l'intention et le lieu choisis, origin compose")
    verifie(APPELS and APPELS[-1]["decor"] == "a small sunlit kitchen"
            and APPELS[-1]["brief"] == "elle cuisine le matin",
            f"le modele recoit le brief et le texte du decor ({APPELS[-1:]})")
    r = CLIENT.post(url, json={"brief": "un cafe"})
    verifie(r.status_code == 200 and all("place" not in s for s in r.json()["scenes"])
            and APPELS[-1]["decor"] == "",
            "sans lieu : aucun decor donne, aucun lieu pose")

    print("\n[4] les ids sont dedoublonnes contre la banque")
    verifie([s["id"] for s in body["scenes"]] == ["p1_2", "mug"],
            f"p1 existe deja : p1_2 ({[s['id'] for s in body['scenes']]})")

    print("\n[5] proposer n'ecrit rien")
    verifie((CHAR_DIR / "scenes.json").read_bytes() == avant_banque,
            "scenes.json du personnage octet pour octet identique")
    verifie(WORLD_PATH.read_bytes() == avant_monde, "WORLDS/<monde>.json octet pour octet identique")

    print("\n[6] le prompt du modele porte le decor, et seulement avec un lieu")
    creative = {"intentions": [{"key": "lifestyle"}], "tones": [{"key": "doux"}]}
    texte = json.dumps(compose.build_graph("cuisiner", 2, creative, 1, "a small sunlit kitchen"))
    verifie("a small sunlit kitchen" in texte and "Do not describe the place again" in texte
            and "cuisiner" in texte, "avec lieu : le decor et la consigne de ne pas le decrire")
    texte = json.dumps(compose.build_graph("cuisiner", 2, creative, 1))
    verifie("PLACE, already described" not in texte, "sans lieu : aucune mention de decor")
finally:
    bank_router.composer.compose = vrai_compose
    shutil.rmtree(CHAR_DIR, ignore_errors=True)
    WORLD_PATH.unlink(missing_ok=True)

print()
print("=" * 70)
print(f"{KO} ECHEC(S)" if KO else "tout est vert")
print("=" * 70)
sys.exit(1 if KO else 0)
