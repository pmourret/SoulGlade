# -*- coding: utf-8 -*-
"""L'amelioration des prompts par IA (IT-10 chantier 8).

Ce que ce test verrouille, SANS ComfyUI (le modele local est remplace par un
bouchon qui note chaque consigne recue et rend une reponse fixe) :
  1. la detection de langue, sans appel au modele ;
  2. « son/sa/ses » neutralises AVANT le modele, sans toucher « sans », « sable » ;
  3. anglais : un seul appel (amelioration) ; francais : traduction puis
     amelioration ; consigne d'edition : traduite, jamais amelioree ;
  3b. un mot de l'entree perdu : UNE relance qui le nomme, puis ce qui manque
     encore est rendu dans `lost`, jamais tu ;
  4. reponse illisible, champ vide, type inconnu : refuses, jamais avales ;
  5. la route n'accepte AUCUNE cle de plus — ni personnage ni ancre ne peut
     atteindre le modele (invariant 3), et le refus arrive avant tout appel ;
  6. le modele vient de PLATFORM/llm.json, et d'un seul endroit.

Lancer :  python AUTOMATION/tests/test_enhance.py
"""
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
AUTOMATION = HERE.parent
sys.path.insert(0, str(AUTOMATION / "web"))
sys.path.insert(0, str(AUTOMATION))

import compose                                # noqa: E402
import enhance                                # noqa: E402
import llm_local                              # noqa: E402
import shared_state as ss                     # noqa: E402
from api.main import app                      # noqa: E402
from fastapi.testclient import TestClient     # noqa: E402

KO = 0
CLIENT = TestClient(app, base_url="http://127.0.0.1")


def verifie(ok, texte):
    global KO
    print(f"  {'ok   ' if ok else 'ECHEC'} {texte}")
    if not ok:
        KO += 1


APPELS = []
REPONSE = {"brut": '{"text": "standing, holding a \\"mug\\""}'}


def bouchon(prompt, **_):
    APPELS.append(prompt)
    brut = REPONSE["brut"]
    return brut.pop(0) if isinstance(brut, list) else brut


llm_local.texte = bouchon


async def vivant():
    return True


ss.comfy_alive = vivant


def appels(fn):
    APPELS.clear()
    try:
        return fn(), list(APPELS)
    except Exception as e:                    # noqa: BLE001
        return e, list(APPELS)


print("1. detection de langue")
verifie(enhance.looks_french("elle lit un livre assise sur le rebord de la fenêtre"), "francais reconnu")
verifie(enhance.looks_french("néon rose, sol mouillé"), "francais court, par ses accents")
verifie(not enhance.looks_french("standing holding a mug, soft window light from the left"), "anglais reconnu")
verifie(not enhance.looks_french("   "), "vide : pas francais")

print("2. possessifs neutralises")
verifie(enhance.neutral_possessives("déboutonne sa chemise, son épaule, ses cheveux")
        == "déboutonne la chemise, le épaule, les cheveux", "son/sa/ses -> le/la/les")
verifie(enhance.neutral_possessives("sans sable, en saison") == "sans sable, en saison",
        "mots qui les contiennent intacts")

print("3. les etapes")
r, a = appels(lambda: enhance.enhance("scene", "standing holding a mug"))
verifie(len(a) == 1 and "OLD: standing holding a mug" in a[0], "anglais : une amelioration seule")
verifie(enhance.KINDS["scene"] in a[0], "la consigne porte le type du fragment")
verifie(r == {"text": 'standing, holding a "mug"', "translated": False, "lost": []}, "reponse JSON relue, guillemets echappes")
r, a = appels(lambda: enhance.enhance("pose", "debout, sa main sur la hanche"))
verifie(len(a) == 2 and "TEXT: debout, la main sur la hanche" in a[0], "francais : traduit, possessif neutre")
verifie("OLD: standing" in a[1] and r["translated"], "puis ameliore depuis la traduction")
r, a = appels(lambda: enhance.enhance("edit", "remove the bra"))
verifie(a == [] and r == {"text": "remove the bra", "translated": False, "lost": []},
        "consigne d'edition anglaise : rendue telle quelle, sans appel")
r, a = appels(lambda: enhance.enhance("edit", "déboutonne sa chemise"))
verifie(len(a) == 1 and "TEXT:" in a[0], "consigne d'edition francaise : traduite, jamais amelioree")

print("3b. les idees perdues")
verifie(enhance.lost_words("topless, lying naked, sensual", "lying topless, soft light") == ["naked", "sensual"],
        "les mots disparus, dans l'ordre")
verifie(enhance.lost_words("soft light illuminates her", "light softly illuminating the room") == [],
        "meme racine, mot outil, pronom : pas une perte")
REPONSE["brut"] = ['{"text": "lying on the bed"}', '{"text": "lying naked on the bed"}']
r, a = appels(lambda: enhance.enhance("scene", "lying naked on the bed"))
verifie(len(a) == 2 and "dropped these words of OLD: naked" in a[1], "perte : une relance qui nomme le mot")
verifie(r["text"] == "lying naked on the bed" and r["lost"] == [], "rendu par la relance : plus rien de perdu")
REPONSE["brut"] = ['{"text": "lying on the bed"}', '{"text": "lying on a bed"}']
r, a = appels(lambda: enhance.enhance("scene", "lying naked on the bed"))
verifie(len(a) == 2 and r["lost"] == ["naked"], "toujours perdu : une seule relance, et le mot signale")
REPONSE["brut"] = '{"text": "standing, holding a mug"}'

print("4. refus")
r, a = appels(lambda: enhance.enhance("scene", "  "))
verifie(isinstance(r, ValueError) and a == [], "champ vide refuse avant le modele")
r, a = appels(lambda: enhance.enhance("anchor", "a woman"))
verifie(isinstance(r, ValueError) and a == [], "type inconnu refuse avant le modele")
REPONSE["brut"] = "user\n"
r, a = appels(lambda: enhance.enhance("scene", "standing"))
verifie(isinstance(r, llm_local.LLMError) and "illisible" in str(r), "reponse illisible : erreur, jamais le texte brut")
REPONSE["brut"] = '{"text": "standing, holding a mug"}'

print("5. la route")
APPELS.clear()
rep = CLIENT.post("/api/enhance", json={"kind": "scene", "text": "standing",
                                        "anchor": "a woman in her thirties"})
verifie(rep.status_code == 400 and APPELS == [], "une ancre dans le payload : refusee, modele jamais appele")
rep = CLIENT.post("/api/enhance", json={"kind": "scene", "text": "standing",
                                        "character": "lena"})
verifie(rep.status_code == 400 and APPELS == [], "un personnage dans le payload : refuse")
rep = CLIENT.post("/api/enhance", json={"kind": "scene", "text": "standing"})
verifie(rep.status_code == 200 and rep.json() == {"ok": True, "text": "standing, holding a mug",
                                                  "translated": False, "lost": []},
        "proposition rendue")
rep = CLIENT.post("/api/enhance", json={"kind": "scene", "text": ""})
verifie(rep.status_code == 400 and rep.json()["ok"] is False and rep.json()["erreur"],
        "champ vide : 400 avec une cause lisible")
REPONSE["brut"] = "rien"
rep = CLIENT.post("/api/enhance", json={"kind": "scene", "text": "standing"})
verifie(rep.status_code == 400 and "illisible" in rep.json()["erreur"], "echec du modele : 400 avec sa cause")


async def eteint():
    return False


ss.comfy_alive = eteint
rep = CLIENT.post("/api/enhance", json={"kind": "scene", "text": "standing"})
verifie(rep.status_code == 503 and rep.json()["erreur"] == "ComfyUI hors ligne", "ComfyUI eteint : 503")

print("6. le modele, regle a la plateforme")
reglage = json.loads(llm_local.SETTINGS_PATH.read_text(encoding="utf-8"))
graphe = llm_local.graphe_texte("x")
verifie(graphe["1"]["inputs"]["clip_name"] == reglage["model"]
        and graphe["1"]["inputs"]["type"] == reglage["loader_type"], "le graphe charge le modele de PLATFORM/llm.json")
verifie(not hasattr(compose, "CLIP_MODEL"), "compose ne porte plus sa propre copie du nom")

print(f"\n{'OK' if not KO else f'{KO} ECHEC(S)'}")
sys.exit(1 if KO else 0)
