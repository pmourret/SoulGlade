# -*- coding: utf-8 -*-
"""Le genre declare d'un personnage (`DOCS/cadrage/2026-09-27-genre-du-
personnage.md`).

POURQUOI CE TEST EXISTE. `POST /api/character/gender` ecrit dans
`CHARACTERS/<id>/character.json`, le meme fichier que le NSFW et l'apparence.
`.claude/rules/backend.md` : une route generalisee vient avec un test qui
aurait detecte un melange entre deux personnages. Il tient aussi :
  - le refus EXPLICITE d'une valeur hors des trois (400, jamais devinee) ;
  - `null` qui fait DISPARAITRE la cle : l'absence veut dire « non dit » ;
  - aucune autre cle de `character.json` qui bouge ;
  - `GET /api/character` qui rend ce qui a ete ecrit.

Personnages jetables (git-ignore), nettoyes a la fin.

Lancer :  python AUTOMATION/tests/test_character_gender.py
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

from api.main import app                       # noqa: E402
from fastapi.testclient import TestClient      # noqa: E402

CHAR_A, CHAR_B = "probe-gender-a", "probe-gender-b"
KO = 0
CLIENT = TestClient(app, base_url="http://127.0.0.1")


def verifie(ok, texte):
    global KO
    print(f"  {'ok   ' if ok else 'ECHEC'} {texte}")
    if not ok:
        KO += 1


def poser_personnage(cid):
    d = OFM / "CHARACTERS" / cid
    if d.exists():
        shutil.rmtree(d)
    d.mkdir(parents=True)
    (d / "character.json").write_text(json.dumps({
        "id": cid, "name": cid, "universe": "instagram-influenceur",
        "type": "instagram-influenceur", "output_style": "realiste",
        "world": "slow-life", "content_types": {"image": True}, "nsfw": False,
    }, ensure_ascii=False, indent=2), encoding="utf-8")
    lena = OFM / "CHARACTERS" / "lena"
    for f in ("config.json", "creative.json", "scenes.json"):
        shutil.copy(lena / f, d / f)


def registre(cid):
    return json.loads((OFM / "CHARACTERS" / cid / "character.json").read_text(encoding="utf-8"))


try:
    print("=" * 70)
    print("genre declare : POST /api/character/gender")
    print("=" * 70)
    poser_personnage(CHAR_A)
    poser_personnage(CHAR_B)
    avant_a = registre(CHAR_A)

    print(f"\n[1] n'ecrit que {CHAR_A}, et rien d'autre que la cle `gender`")
    avant_b = (OFM / "CHARACTERS" / CHAR_B / "character.json").read_bytes()
    r = CLIENT.post(f"/api/character/gender?character={CHAR_A}", json={"gender": "feminine"})
    verifie(r.status_code == 200 and r.json() == {"gender": "feminine"},
            f"la declaration est acceptee ({r.status_code} — {r.text[:120]})")
    verifie((OFM / "CHARACTERS" / CHAR_B / "character.json").read_bytes() == avant_b,
            f"character.json de {CHAR_B} octet pour octet identique")
    apres = registre(CHAR_A)
    verifie(apres.get("gender") == "feminine", f"{CHAR_A} porte `feminine`")
    verifie({k: v for k, v in apres.items() if k != "gender"} == avant_a,
            "aucune autre cle n'a bouge")
    verifie(CLIENT.get(f"/api/character?character={CHAR_A}").json().get("gender") == "feminine",
            "la fiche le rend")
    verifie(CLIENT.get(f"/api/character?character={CHAR_B}").json().get("gender") is None,
            f"la fiche de {CHAR_B} ne dit rien")

    print("\n[2] une valeur inconnue est refusee, rien n'est ecrit")
    fige = (OFM / "CHARACTERS" / CHAR_A / "character.json").read_bytes()
    for mauvais in ("female", "", "Feminine", 3):
        r = CLIENT.post(f"/api/character/gender?character={CHAR_A}", json={"gender": mauvais})
        verifie(r.status_code == 400 and r.json().get("ok") is False,
                f"{mauvais!r} refuse ({r.status_code})")
    verifie((OFM / "CHARACTERS" / CHAR_A / "character.json").read_bytes() == fige,
            "le fichier n'a pas change apres les refus")

    print("\n[3] `null` retire la cle : l'absence veut dire « non dit »")
    r = CLIENT.post(f"/api/character/gender?character={CHAR_A}", json={"gender": None})
    verifie(r.status_code == 200, f"le retrait est accepte ({r.status_code})")
    verifie("gender" not in registre(CHAR_A), "la cle `gender` a disparu, pas une chaine vide")
    verifie(registre(CHAR_A) == avant_a, "le fichier est revenu a son contenu de depart")

finally:
    shutil.rmtree(OFM / "CHARACTERS" / CHAR_A, ignore_errors=True)
    shutil.rmtree(OFM / "CHARACTERS" / CHAR_B, ignore_errors=True)

print()
print("=" * 70)
print(f"{KO} ECHEC(S)" if KO else "tout est vert")
print("=" * 70)
sys.exit(1 if KO else 0)
