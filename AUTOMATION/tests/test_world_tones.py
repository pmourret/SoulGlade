# -*- coding: utf-8 -*-
"""Les tons d'un monde : catalogue, fusion champ a champ, couche (25/09).

POURQUOI CE TEST EXISTE. Le 25/09, le ton `joueur` degradait tous les selfies
par son fragment « slight motion blur », que le studio ne montrait nulle part.
Le chantier donne au monde un createur de tons, et ce test verrouille ce qui le
rend operant :

  1. `validate_tones` refuse ce qui casserait une scene, un journal ou un export
     (cle absente, non normalisee, en double ; plage hors des bornes du noeud).
  2. `POST /api/worlds/{id}/tones` ne reecrit que la cle `tones` du monde, et
     jamais un fichier de personnage.
  3. FUSION CHAMP A CHAMP : une surcharge `{key, expression}` garde le libelle et
     le fragment du monde, et un fragment corrige dans le monde REMONTE chez le
     personnage. Avant le 25/09, la surcharge etait une copie complete qui
     figeait le fragment : corriger le monde ne changeait rien.
  4. `save_tone_expression` n'ecrit plus que `{key, expression}`.
  5. La couche de chaque ton (`monde`, `surcharge`, `personnage`) est juste, et
     deux personnages de deux mondes ne lisent jamais les tons de l'autre.

Mondes et personnages jetables, nettoyes a la fin ; aucune donnee de
CHARACTERS/ reelle n'est lue.

Lancer :  python AUTOMATION/tests/test_world_tones.py
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

import runner as lb                                        # noqa: E402
import worlds                                              # noqa: E402
from api.main import app                                   # noqa: E402
from api.services.creative import tones_with_layers        # noqa: E402
from api.services.expression import save_tone_expression   # noqa: E402
from api.services.worlds import validate_tones             # noqa: E402
from fastapi.testclient import TestClient                  # noqa: E402

W1, W2 = "probe-tones-w1", "probe-tones-w2"
CA, CB = "probe-tones-a", "probe-tones-b"
KO = 0
CLIENT = TestClient(app, base_url="http://127.0.0.1")

JOUEUR = {"key": "joueur", "label": "Joueur",
          "prompt_add": "candid movement, slight motion blur",
          "expression": {"smile": [0.28, 0.55]}}
DOUX = {"key": "doux", "label": "Doux", "prompt_add": "soft diffuse light"}


def verifie(ok, texte):
    global KO
    print(f"  {'ok   ' if ok else 'ECHEC'} {texte}")
    if not ok:
        KO += 1


def poser_monde(wid, tones):
    worlds.world_path(wid).write_text(json.dumps({
        "id": wid, "label": wid, "compatible_families": ["flux"],
        "suggested_styles": ["realiste"],
        "assets": {"lora": None, "lora_strength": None, "prompt_add": ""},
        "readiness": {"places": False, "tones": True, "style": False},
        "tone": "ambiance d'interface", "ui_skin_token": f"world-{wid}",
        "places": [{"id": "p1", "prompt": "a quiet room"}], "tones": tones,
    }, ensure_ascii=False, indent=2), encoding="utf-8")


def poser_personnage(cid, wid, own_tones):
    d = OFM / "CHARACTERS" / cid
    if d.exists():
        shutil.rmtree(d)
    d.mkdir(parents=True)
    (d / "character.json").write_text(json.dumps({
        "id": cid, "name": cid, "world": wid, "content_types": {"image": True},
        "universe": "instagram-influenceur", "type": "instagram-influenceur",
        "output_style": "realiste",
    }), encoding="utf-8")
    (d / "creative.json").write_text(json.dumps({
        "intentions": [], "tones": own_tones, "intensity": [],
    }), encoding="utf-8")


def tons(cid):
    return {t["key"]: t for t in lb.load_creative(cid)["tones"]}


try:
    print("=" * 70)
    print("tons d'un monde : catalogue, fusion champ a champ, couche")
    print("=" * 70)

    # ================================================ [1] validation
    print("\n[1] validate_tones")
    verifie(validate_tones([JOUEUR, DOUX]) == [], "deux tons valides passent")
    verifie(validate_tones([{"key": "nu", "prompt_add": ""}]) == [],
            "un fragment vide est admis (un ton peut ne porter qu'une expression)")
    for cas, donnees in [
        ("cle absente", [{"label": "x"}]),
        ("cle non normalisee", [{"key": "Joueur Fou"}]),
        ("cle en double", [DOUX, DOUX]),
        ("fragment qui n'est pas un texte", [{"key": "a", "prompt_add": 3}]),
        ("champ inconnu", [{"key": "a", "guidance": 3}]),
        ("parametre d'expression inconnu", [{"key": "a", "expression": {"nez": [0, 1]}}]),
        ("plage hors bornes", [{"key": "a", "expression": {"smile": [0, 9]}}]),
        ("plage inversee", [{"key": "a", "expression": {"smile": [0.5, 0.1]}}]),
        ("pas une liste", {"key": "a"}),
    ]:
        verifie(validate_tones(donnees) != [], f"refuse : {cas}")
    verifie(validate_tones([{"key": "a", "_note": "libre"}]) == [],
            "une note `_` passe sans etre un champ inconnu")

    # ================================================ [2] routes du monde
    print("\n[2] POST /api/worlds/{id}/tones")
    poser_monde(W1, [JOUEUR, DOUX])
    poser_monde(W2, [{"key": "sombre", "label": "Sombre", "prompt_add": "low key"}])
    poser_personnage(CA, W1, [{"key": "doux", "expression": {"smile": [0.1, 0.3]}}])
    poser_personnage(CB, W2, [{"key": "perso", "label": "Perso", "prompt_add": "own"}])
    avant_a = (OFM / "CHARACTERS" / CA / "creative.json").read_bytes()
    avant_b = (OFM / "CHARACTERS" / CB / "creative.json").read_bytes()

    r = CLIENT.get(f"/api/worlds/{W1}/tones")
    verifie(r.status_code == 200 and [t["key"] for t in r.json()["tones"]] == ["joueur", "doux"],
            f"GET rend les tons du monde ({r.status_code})")
    corrige = {**JOUEUR, "prompt_add": "candid movement, spontaneous gesture"}
    r = CLIENT.post(f"/api/worlds/{W1}/tones", json={"tones": [corrige, DOUX]})
    verifie(r.status_code == 200, f"POST valide accepte ({r.status_code} — {r.text[:160]})")
    brut = json.loads(worlds.world_path(W1).read_text(encoding="utf-8"))
    verifie(brut["tones"][0]["prompt_add"] == "candid movement, spontaneous gesture",
            "le fragment corrige est ecrit dans le monde")
    verifie(brut["places"] == [{"id": "p1", "prompt": "a quiet room"}]
            and brut["tone"] == "ambiance d'interface" and brut["readiness"]["tones"] is True,
            "places, ambiance (`tone`) et readiness intacts")
    verifie((OFM / "CHARACTERS" / CA / "creative.json").read_bytes() == avant_a
            and (OFM / "CHARACTERS" / CB / "creative.json").read_bytes() == avant_b,
            "aucun creative.json de personnage touche")
    r = CLIENT.post(f"/api/worlds/{W1}/tones", json={"tones": [DOUX, DOUX]})
    verifie(r.status_code == 400 and "double" in r.json().get("erreur", ""),
            "POST invalide refuse en 400 avec son probleme")
    verifie(json.loads(worlds.world_path(W1).read_text(encoding="utf-8"))["tones"][0]["key"] == "joueur",
            "un refus n'ecrit rien")
    r = CLIENT.get("/api/worlds")
    ligne = next((w for w in r.json()["worlds"] if w["id"] == W1), {})
    verifie(ligne.get("tones_count") == 2, "le registre compte les tons")

    # ================================================ [3] fusion champ a champ
    print("\n[3] fusion monde + personnage, champ a champ")
    t = tons(CA)
    verifie(t["doux"]["prompt_add"] == "soft diffuse light" and t["doux"]["label"] == "Doux",
            "surcharge {key, expression} : libelle et fragment viennent du monde")
    verifie(t["doux"]["expression"] == {"smile": [0.1, 0.3]}, "l'expression vient du personnage")
    CLIENT.post(f"/api/worlds/{W1}/tones",
                json={"tones": [corrige, {**DOUX, "prompt_add": "soft light, corrige"}]})
    verifie(tons(CA)["doux"]["prompt_add"] == "soft light, corrige",
            "un fragment corrige dans le monde remonte chez le personnage qui l'a surcharge")
    verifie(tons(CA)["joueur"]["prompt_add"] == "candid movement, spontaneous gesture",
            "et chez celui qui en herite tel quel")

    # ================================================ [4] save_tone_expression
    print("\n[4] save_tone_expression n'ecrit que {key, expression}")
    save_tone_expression(CA, "joueur", {"smile": [0.2, 0.4]})
    propre = json.loads((OFM / "CHARACTERS" / CA / "creative.json").read_text(encoding="utf-8"))["tones"]
    verifie({"key": "joueur", "expression": {"smile": [0.2, 0.4]}} in propre,
            "ton herite : seule la plage est ecrite")
    verifie(tons(CA)["joueur"]["prompt_add"] == "candid movement, spontaneous gesture",
            "le fragment du monde continue de passer")
    save_tone_expression(CB, "perso", {"blink": [0, 3]})
    propre_b = json.loads((OFM / "CHARACTERS" / CB / "creative.json").read_text(encoding="utf-8"))["tones"]
    verifie(propre_b == [{"key": "perso", "label": "Perso", "prompt_add": "own",
                          "expression": {"blink": [0, 3]}}],
            "ton propre au personnage : ses autres champs sont gardes")
    try:
        save_tone_expression(CA, "inconnu", {})
        verifie(False, "un ton inconnu est refuse")
    except ValueError:
        verifie(True, "un ton inconnu est refuse")

    # ================================================ [5] couche et isolation
    print("\n[5] couche de chaque ton, et deux mondes jamais melanges")
    ca = {t["key"]: t["couche"] for t in tones_with_layers(CA, lb.load_creative(CA)["tones"])}
    verifie(ca == {"joueur": "surcharge", "doux": "surcharge"},
            f"personnage A : deux tons du monde ajustes ({ca})")
    cb = {t["key"]: t["couche"] for t in tones_with_layers(CB, lb.load_creative(CB)["tones"])}
    verifie(cb == {"sombre": "monde", "perso": "personnage"},
            f"personnage B : un ton herite, un ton propre ({cb})")
    verifie("sombre" not in tons(CA) and "joueur" not in tons(CB),
            "aucun ton ne passe d'un monde a l'autre")

    # ================================================ [5b] ajuster le texte, y revenir
    print("\n[5b] un personnage ajuste le texte d'un ton, puis le rend au monde")
    avant_b = (OFM / "CHARACTERS" / CB / "creative.json").read_bytes()
    r = CLIENT.post(f"/api/creative/tone?character={CA}",
                    json={"key": "joueur", "prompt_add": "  candid, relaxed  "})
    verifie(r.status_code == 200, f"route d'ajustement acceptee ({r.status_code} — {r.text[:160]})")
    verifie(tons(CA)["joueur"]["prompt_add"] == "candid, relaxed",
            "le fragment ajuste (et nettoye) prime sur celui du monde")
    verifie(tons(CA)["joueur"]["expression"] == {"smile": [0.2, 0.4]},
            "la plage deja reglee est gardee")
    verifie((OFM / "CHARACTERS" / CB / "creative.json").read_bytes() == avant_b,
            "le creative.json de l'autre personnage n'est pas touche")
    champs = {t["key"]: t["champs_ajustes"] for t in tones_with_layers(CA, lb.load_creative(CA)["tones"])}
    verifie(champs["joueur"] == ["prompt_add"] and champs["doux"] == [],
            f"les champs ajustes sont dits ({champs})")
    r = CLIENT.post(f"/api/creative/tone?character={CA}", json={"key": "joueur", "expression": {}})
    verifie(r.status_code == 200 and tons(CA)["joueur"]["expression"] == {"smile": [0.2, 0.4]},
            "un champ hors texte est ignore par le schema, jamais ecrit")
    r = CLIENT.post(f"/api/creative/tone?character={CA}", json={"key": "inconnu", "label": "x"})
    verifie(r.status_code == 400, "un ton inconnu est refuse en 400")

    r = CLIENT.post(f"/api/creative/tone/revert?character={CA}", json={"key": "joueur"})
    verifie(r.status_code == 200, f"revenir au monde accepte ({r.status_code})")
    verifie(tons(CA)["joueur"]["prompt_add"] == "candid movement, spontaneous gesture"
            and tons(CA)["joueur"]["expression"] == {"smile": [0.2, 0.4]},
            "le fragment revient du monde, la plage reste")
    CLIENT.post(f"/api/creative/tone?character={CA}", json={"key": "doux", "label": "Doux ajuste"})
    CLIENT.post(f"/api/creative/tone/revert?character={CA}", json={"key": "doux"})
    propre = json.loads((OFM / "CHARACTERS" / CA / "creative.json").read_text(encoding="utf-8"))["tones"]
    verifie({"key": "doux", "expression": {"smile": [0.1, 0.3]}} in propre,
            "une entree revenue au monde ne garde que sa plage")
    r = CLIENT.post(f"/api/creative/tone/revert?character={CB}", json={"key": "perso"})
    verifie(r.status_code == 400, "un ton propre au personnage n'a pas de monde vers quoi revenir")

    # ================================================ [6] un monde neuf a une liste de tons
    print("\n[6] create_world")
    neuf = "probe-tones-neuf"
    if worlds.world_path(neuf).exists():
        worlds.world_path(neuf).unlink()
    pack = worlds.universe.list_universes()[0]
    worlds.create_world(neuf, "Neuf", pack)
    verifie(json.loads(worlds.world_path(neuf).read_text(encoding="utf-8")).get("tones") == [],
            "un monde neuf nait avec une liste de tons vide")
    worlds.world_path(neuf).unlink()

finally:
    for wid in (W1, W2):
        if worlds.world_path(wid).exists():
            worlds.world_path(wid).unlink()
    for cid in (CA, CB):
        shutil.rmtree(OFM / "CHARACTERS" / cid, ignore_errors=True)

print("\n" + ("TOUT EST VERT" if KO == 0 else f"{KO} ECHEC(S)"))
sys.exit(1 if KO else 0)
