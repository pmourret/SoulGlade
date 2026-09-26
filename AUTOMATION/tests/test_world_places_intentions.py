# -*- coding: utf-8 -*-
"""Lieux et intentions d'un monde, par leurs routes (IT-11 chantier 4, ADR-0027).

POURQUOI CE TEST EXISTE. Un monde neuf recoit ses lieux (decors) et ses
intentions depuis l'ecran, plus depuis un JSON ouvert a la main. Ce que ce test
verrouille :

  1. la forme : un lieu est un decor (ni intention, ni reglage de personnage),
     une intention n'a ni niveau ni format, et ne propose qu'un ton du monde ;
  2. le retrait : un lieu ou une intention qu'une scene utilise (ordinaire OU
     adulte) ne quitte pas le monde, et le refus nomme les scenes ;
  3. l'isolation : ecrire les lieux ou les intentions d'un monde ne touche ni un
     autre monde ni la banque d'un personnage, octet pour octet ;
  4. `create_world` nait avec les quatre catalogues vides.

Mondes jetables dans WORLDS/ (retires a la fin), personnage jetable idem.

Lancer :  python_embeded\\python.exe AUTOMATION\\tests\\test_world_places_intentions.py
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

import worlds                                   # noqa: E402
from api.main import app                        # noqa: E402
from api.services.worlds import validate_intentions, validate_places  # noqa: E402
from fastapi.testclient import TestClient       # noqa: E402

A, B = "probe-pi-a", "probe-pi-b"
CHAR = "probe-pi-char"
CLIENT = TestClient(app, base_url="http://127.0.0.1")
KO = 0


def verifie(ok, texte):
    global KO
    print(f"  {'ok   ' if ok else 'ECHEC'} {texte}")
    if not ok:
        KO += 1


def poser_monde(wid):
    worlds.world_path(wid).write_text(json.dumps({
        "id": wid, "label": wid, "compatible_families": ["flux"],
        "assets": {"lora": None, "lora_strength": None, "prompt_add": ""},
        "places": [{"id": "chambre", "label": "Chambre", "prompt": "a quiet bedroom"},
                   {"id": "cuisine", "label": "Cuisine", "prompt": "a sunlit kitchen"}],
        "intentions": [{"key": "lifestyle", "label": "Lifestyle"},
                       {"key": "sport", "label": "Sport"}],
        "scenes": [{"id": "matin", "intention": "lifestyle", "place": "chambre",
                    "prompt": "waking up"}],
        "tones": [{"key": "doux", "label": "Doux"}],
    }, ensure_ascii=False, indent=2), encoding="utf-8")


try:
    print("=" * 70)
    print("lieux et intentions d'un monde (ADR-0027)")
    print("=" * 70)
    poser_monde(A)
    poser_monde(B)
    worlds.save_scenes_adulte(A, [{"id": "nuit", "intention": "sport", "place": "cuisine",
                                   "prompt": "late at night"}])

    # ------------------------------------------------------------ [1] forme
    print("\n[1] la forme d'un lieu et d'une intention")
    lieux = worlds.places(A)
    verifie(validate_places(A, lieux) == [], "les lieux du monde passent tels quels")
    verifie(any("intention" in p for p in validate_places(
        A, lieux + [{"id": "salon", "prompt": "a living room", "intention": "lifestyle"}])),
        "un lieu qui porte une intention est refuse")
    verifie(any("décor est vide" in p for p in validate_places(A, lieux + [{"id": "vide"}])),
            "un lieu sans decor est refuse")
    verifie(any("identifiant" in p for p in validate_places(
        A, lieux + [{"id": "Salon Bleu", "prompt": "x"}])),
        "un identifiant hors regle est refuse")
    intentions = worlds.intentions(A)
    verifie(validate_intentions(A, intentions) == [], "les intentions du monde passent")
    verifie(any("niveau ni format" in p for p in validate_intentions(
        A, intentions + [{"key": "boudoir", "min_intensity": 2}])),
        "une intention qui porte un niveau est refusee")
    verifie(any("ton inconnu" in p for p in validate_intentions(
        A, intentions + [{"key": "mode", "defaults": {"tone": "absent"}}])),
        "une intention qui propose un ton absent du monde est refusee")
    verifie(validate_intentions(A, intentions + [{"key": "mode", "defaults": {"tone": "doux"}}])
            == [], "et un ton du monde est accepte")

    # ------------------------------------------------------------ [2] retrait
    print("\n[2] un lieu ou une intention utilises ne quittent pas le monde")
    r = CLIENT.post(f"/api/worlds/{A}/places", json={"places": lieux[1:]})
    verifie(r.status_code == 400 and "matin" in r.json()["erreur"],
            f"retirer « chambre » (scene matin) est refuse, la scene est nommee ({r.status_code})")
    r = CLIENT.post(f"/api/worlds/{A}/places", json={"places": lieux[:1]})
    verifie(r.status_code == 400 and "nuit" in r.json()["erreur"],
            "retirer « cuisine », utilise par une scene ADULTE, est refuse aussi")
    r = CLIENT.post(f"/api/worlds/{A}/intentions", json={"intentions": intentions[:1]})
    verifie(r.status_code == 400 and "nuit" in r.json()["erreur"],
            "retirer « sport », porte par une scene adulte, est refuse")
    r = CLIENT.post(f"/api/worlds/{A}/places",
                    json={"places": lieux + [{"id": "balcon", "label": "Balcon",
                                              "prompt": "a small balcony"}]})
    verifie(r.status_code == 200, f"ajouter un lieu est accepte ({r.status_code})")
    r = CLIENT.post(f"/api/worlds/{A}/places", json={"places": lieux})
    verifie(r.status_code == 200, "et retirer un lieu que rien n'utilise aussi")

    # ------------------------------------------------------------ [3] isolation
    print("\n[3] ecrire un monde ne touche ni l'autre monde ni une banque")
    d = OFM / "CHARACTERS" / CHAR
    shutil.rmtree(d, ignore_errors=True)
    d.mkdir(parents=True)
    (d / "scenes.json").write_text(json.dumps({"world": A, "scenes": [
        {"id": "matin", "world": A, "origin": "world", "world_ref": "matin"}]}),
        encoding="utf-8")
    avant_b = worlds.world_path(B).read_bytes()
    avant_banque = (d / "scenes.json").read_bytes()
    r1 = CLIENT.post(f"/api/worlds/{A}/intentions",
                     json={"intentions": intentions + [{"key": "voyage", "label": "Voyage"}]})
    r2 = CLIENT.post(f"/api/worlds/{A}/places",
                     json={"places": [{**lieux[0], "prompt": "a quiet bedroom, linen"}, lieux[1]]})
    verifie(r1.status_code == 200 and r2.status_code == 200, "les deux ecritures sont acceptees")
    verifie(worlds.world_path(B).read_bytes() == avant_b,
            f"WORLDS/{B}.json octet pour octet identique")
    verifie((d / "scenes.json").read_bytes() == avant_banque,
            "la banque du personnage octet pour octet identique")
    verifie([i["key"] for i in CLIENT.get(f"/api/worlds/{A}/intentions").json()["intentions"]]
            == ["lifestyle", "sport", "voyage"], "GET relit ce qui a ete ecrit")
    lu = worlds.compose_scene_bank(worlds.refresh_scene_bank(
        json.loads((d / "scenes.json").read_text(encoding="utf-8"))))
    verifie(lu["scenes"][0]["prompt"] == "waking up, a quiet bedroom, linen",
            "corriger un lieu atteint la scene composee au lancement")
    reg = {w["id"]: w for w in CLIENT.get("/api/worlds").json()["worlds"]}
    verifie(reg[A]["intentions_count"] == 3 and reg[A]["places_count"] == 2,
            "le registre compte lieux et intentions")

    # ------------------------------------------------------------ [4] creation
    print("\n[4] un monde neuf nait avec ses quatre catalogues vides")
    wid = "probe-pi-neuf"
    worlds.world_path(wid).unlink(missing_ok=True)
    worlds.create_world(wid, "Neuf", "instagram-influenceur")
    try:
        verifie(CLIENT.get(f"/api/worlds/{wid}/places").json()["places"] == []
                and CLIENT.get(f"/api/worlds/{wid}/intentions").json()["intentions"] == []
                and CLIENT.get(f"/api/worlds/{wid}/scenes").json()["scenes"] == []
                and CLIENT.get(f"/api/worlds/{wid}/tones").json()["tones"] == [],
                "lieux, intentions, scenes et tons vides")
    finally:
        worlds.world_path(wid).unlink(missing_ok=True)

finally:
    for w in (A, B):
        worlds.world_path(w).unlink(missing_ok=True)
        worlds.adulte_path(w).unlink(missing_ok=True)
    shutil.rmtree(OFM / "CHARACTERS" / CHAR, ignore_errors=True)

print()
print("=" * 70)
print(f"{KO} ECHEC(S)" if KO else "tout est vert")
print("=" * 70)
sys.exit(1 if KO else 0)
