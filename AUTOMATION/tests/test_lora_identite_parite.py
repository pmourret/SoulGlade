# -*- coding: utf-8 -*-
"""Parite Flux/SDXL sur le LoRA d'identite : meme role, meme injection.

POURQUOI CE TEST EXISTE. Le mecanisme de CONSOMMATION d'un LoRA de personnage
existait et tournait en production -- mais d'un seul cote. `lora_sdxl.apply`
portait le bloc d'injection, `pulid_flux` ne l'avait pas : le manque cote Lena
etait dans le module d'identite, pas dans le graphe. Un bloc de quinze lignes
qui ne dependait que des roles `character_lora` et `positive` et de
`config.json / identity / lora`, donc deja agnostique de la famille de modele,
attendait juste d'etre a un endroit ou les deux pouvaient l'appeler.

Ce test verrouille les quatre facons de le recasser :

  1. UN MECANISME QUI ACCEPTE `identity.lora` SANS ROLE POUR LE RECEVOIR.
     C'est le point 7 du cadrage. Le silence produirait des images sans le
     verrou que le personnage croit avoir : on leve, et le message nomme le
     LoRA demande et le role manquant.
  2. LE ROLE QUI DIVERGE ENTRE LES DEUX. Un fragment de titre different d'un
     cote ferait resoudre le role sur un graphe et pas sur l'autre.
  3. LE ROLE QUI REDEVIENT OBLIGATOIRE. Un personnage sans LoRA -- le cas
     nominal -- ne doit rien exiger de son graphe.
  4. LES DEUX GRAPHES REELS QUI CESSENT DE RESOUDRE LE ROLE. Le graphe de Lena
     porte DEUX LoraLoaderModelOnly (realisme et Lightning) : c'est pour ca que
     le role attend un titre. Sans lui, find_node leve sur l'ambiguite et le
     role retombe a None -- en silence.

Lancer :  python AUTOMATION\\tests\\test_lora_identite_parite.py
"""
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
AUTOMATION = HERE.parent
OFM = AUTOMATION.parent
sys.path.insert(0, str(AUTOMATION))

import identity        # noqa: E402
import ui_to_api       # noqa: E402

KO = 0


def verifie(ok, texte):
    global KO
    print(f"  {'ok   ' if ok else 'ECHEC'} {texte}")
    if not ok:
        KO += 1


MECANISMES = {"pulid_flux": identity.pulid_flux, "lora_sdxl": identity.lora_sdxl}
LORA = {"name": "lena_v1.safetensors", "strength": 0.8, "trigger_word": "l3na"}


def faux_api():
    return {"1": {"inputs": {"lora_name": "", "strength_model": 0.0}},
            "2": {"inputs": {"text": "une scene"}}}


ROLES = {"character_lora": {"id": 1}, "positive": {"id": 2}}

print("=" * 70)
print("LoRA d'identite : meme role et meme injection des deux cotes")
print("=" * 70)

print("\n[1] les deux mecanismes declarent LE MEME role, et il est optionnel")
for nom, mod in MECANISMES.items():
    verifie(mod.REQUIRED_ROLES.get("character_lora") == identity.ROLE_LORA,
            f"{nom} : character_lora = {mod.REQUIRED_ROLES.get('character_lora')}")
verifie("character_lora" in identity.ROLES_OPTIONNELS,
        "et il est dans ROLES_OPTIONNELS : un graphe a le droit de ne pas l'avoir")

print("\n[2] un personnage SANS LoRA n'exige rien de son graphe")
for nom, mod in MECANISMES.items():
    api = faux_api()
    try:
        identity.injecter_lora(api, {}, {"identity": {"weight": 0.85}}, nom)
        identity.verifier_roles({"pulid_apply": 1, "pulid_ref": 1,
                                 "ipadapter_apply": 1, "ipadapter_ref": 1},
                                mod.REQUIRED_ROLES, nom)
        ok = api["1"]["inputs"]["lora_name"] == ""
    except Exception as e:                                   # noqa: BLE001
        ok = False
        print(f"        a leve : {e}")
    verifie(ok, f"{nom} : rien injecte, rien exige — cas nominal")

print("\n[3] LE POINT 7 DU CADRAGE : un LoRA demande sans role pour le recevoir")
for nom in MECANISMES:
    leve = ""
    try:
        identity.injecter_lora(faux_api(), {"positive": {"id": 2}},
                               {"identity": {"lora": LORA}}, nom)
    except RuntimeError as e:
        leve = str(e)
    verifie(bool(leve), f"{nom} : leve au lieu de produire une image sans verrou")
    verifie("lena_v1.safetensors" in leve and "character_lora" in leve,
            f"        et le message nomme le LoRA et le role manquant")

print("\n[4] quand le role est la, l'injection est identique des deux cotes")
sorties = {}
for nom in MECANISMES:
    api = faux_api()
    identity.injecter_lora(api, ROLES, {"identity": {"lora": LORA}}, nom)
    sorties[nom] = (api["1"]["inputs"]["lora_name"],
                    api["1"]["inputs"]["strength_model"],
                    api["2"]["inputs"]["text"])
    verifie(sorties[nom] == ("lena_v1.safetensors", 0.8, "l3na, une scene"),
            f"{nom} : nom, force, et mot declencheur prefixe au prompt")
verifie(len(set(sorties.values())) == 1,
        "les deux cotes produisent exactement le meme graphe injecte")

print("\n[5] les deux graphes REELS resolvent le role")
typ, titre = identity.ROLE_LORA
for nom, chemin in (("lena", "WORKFLOWS/content/lena_master_prod_ui.json"),
                    ("abyssiaelle",
                     "WORKFLOWS/content/abyssiaelle_master_prod_ui.json")):
    p = OFM / chemin
    if not p.exists():
        print(f"  note  {nom} : graphe absent, ignore")
        continue
    ui = json.loads(p.read_text(encoding="utf-8"))
    combien = sum(1 for n in ui["nodes"] if n["type"] == typ)
    try:
        node = ui_to_api.find_node(ui, typ, titre)
        verifie(True, f"{nom} : role resolu sur le noeud {node['id']} "
                      f"({combien} {typ} dans le graphe)")
        verifie(node.get("mode") == 4,
                f"        et il est livre en bypass, comme tout optionnel")
    except LookupError as e:
        verifie(False, f"{nom} : {e}")

print("\n[6] le LoRA de realisme de Lena n'est PAS le role d'identite")
ui = json.loads((OFM / "WORKFLOWS/content/lena_master_prod_ui.json").read_text(
    encoding="utf-8"))
realisme = [n for n in ui["nodes"]
            if n["type"] == typ and "realisme" in (n.get("title") or "").lower()]
verifie(len(realisme) == 1, f"le noeud de realisme existe toujours ({len(realisme)})")
verifie(titre.lower() not in (realisme[0].get("title") or "").lower(),
        f"et son titre {realisme[0].get('title')!r} ne matche pas le role "
        f"d'identite — les deux LoRA coexistent, ils ne se remplacent pas")

print("\n" + "=" * 70)
print("tout est vert" if not KO else f"{KO} ECHEC(S)")
sys.exit(1 if KO else 0)
