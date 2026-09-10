# -*- coding: utf-8 -*-
"""Render the project board from its data file.

The board is the single source of truth for PROJECT STATE: epic breakdown,
per-item status, iteration sequence. Reasoning lives elsewhere -- PROJET.md,
CLAUDE.md, DOCS/adr/, DOCS/cadrage/, DOCS/retros/ -- and this file never
duplicates it.

The HTML is a BUILD OUTPUT: never hand-edited. State changes go to
soulglade-tableau-de-bord.data.json, layout changes to the template. Splitting
them buys a loud failure -- json.load raises on a stray comma here, where a
malformed JS object literal used to render a blank page at open time.

    python AUTOMATION/tools/build_tableau_de_bord.py
    python AUTOMATION/tools/build_tableau_de_bord.py --check
"""
import json
import re
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
DATA = REPO / "soulglade-tableau-de-bord.data.json"
TEMPLATE = Path(__file__).with_name("templates") / "tableau-de-bord.html"
OUT = REPO / "soulglade-tableau-de-bord.html"
MARKER = "/* @@BOARD_DATA@@ */"

VALID_STATES = {"fait", "cours", "faire", "dette", "veille"}

# Un fichier d'etat qui accumule du recit cesse d'etre lu, donc cesse d'etre
# vrai. Ces plafonds refusent le build : le detail vit dans le document que
# `ref` pointe, jamais recopie ici (skill tableau-de-bord).
CADRATIN = "—"
PLAFONDS = {"quoi": 500, "dod": 400, "item": 300, "decision": 500, "horizon": 500}


def surcharge(data):
    """Name the fields that outgrew the board. Feeds check(), so it blocks."""
    trop = []

    def voir(ou, texte, plafond):
        if len(texte) > plafond:
            trop.append((len(texte) - plafond, f"{ou} : {len(texte)} car. pour {plafond}"))
        if texte.count(CADRATIN) > 1:
            trop.append((0, f"{ou} : {texte.count(CADRATIN)} tirets cadratins pour 1"))

    for it in data["iterations"]:
        voir(f"{it['id']}.quoi", it["quoi"], PLAFONDS["quoi"])
        voir(f"{it['id']}.dod", it["dod"], PLAFONDS["dod"])
    for epic in data["epics"]:
        for item in epic["items"]:
            voir(f"{epic['id']} \"{item['t'][:34]}\"", item.get("d", ""), PLAFONDS["item"])
    for dec in data["decisions"]:
        voir(f"decision \"{dec['t'][:34]}\"", dec["d"], PLAFONDS["decision"])
    for key in ("horizon", "ecartees"):
        for entry in data[key]["items"]:
            voir(f"{key} \"{entry['t'][:34]}\"", entry["d"], PLAFONDS["horizon"])
    return [ligne for _, ligne in sorted(trop, key=lambda x: -x[0])]


def check(data):
    """Fail loudly on the mistakes a hand edit actually makes."""
    errors = []
    ids = [e["id"] for e in data["epics"]]
    if len(ids) != len(set(ids)):
        errors.append("identifiant d'EPIC en double")
    iterations = {it["id"] for it in data["iterations"]}
    for epic in data["epics"]:
        if not epic["items"]:
            errors.append(f"{epic['id']} : aucun travail")
        for item in epic["items"]:
            if item["s"] not in VALID_STATES:
                errors.append(f"{epic['id']} : statut inconnu '{item['s']}' sur \"{item['t']}\"")
            if item.get("it") and item["it"] not in iterations:
                errors.append(f"{epic['id']} : \"{item['t']}\" rattache a l'iteration inconnue '{item['it']}'")
    known = set(ids)
    for it in data["iterations"]:
        mere = re.fullmatch(r"(IT-\d+)[a-z]", it["id"])
        if mere and mere.group(1) not in iterations:
            errors.append(f"{it['id']} : sous-phase sans phase mere '{mere.group(1)}'")
        if it["state"] not in data["etats"]:
            errors.append(f"{it['id']} : etat inconnu '{it['state']}'")
        for ref in (x.strip() for x in it.get("dep", "").split(",") if x.strip()):
            if ref == it["id"]:
                errors.append(f"{it['id']} : depend d'elle-meme")
            elif ref not in iterations:
                errors.append(f"{it['id']} : depend de l'iteration inconnue '{ref}'")
        for ref in (x.strip() for x in it.get("epics", "").split(",") if x.strip()):
            if ref not in known:
                errors.append(f"{it['id']} : renvoie vers l'EPIC inconnu '{ref}'")
    errors += surcharge(data)
    if sum(1 for it in data["iterations"] if it.get("state") == "now") > 1:
        errors.append("plus d'une itération ouverte -- une seule à la fois")
    for key in ("horizon", "ecartees"):
        section = data.get(key, {})
        if not section.get("note"):
            errors.append(f"{key} : note manquante")
        for entry in section.get("items", []):
            if not entry.get("t") or not entry.get("d"):
                errors.append(f"{key} : entrée sans titre ou sans description")
    return errors


def render():
    data = json.loads(DATA.read_text(encoding="utf-8"))
    errors = check(data)
    if errors:
        sys.exit("!! " + "\n!! ".join(errors))
    template = TEMPLATE.read_text(encoding="utf-8")
    if MARKER not in template:
        sys.exit(f"!! marqueur {MARKER} absent de {TEMPLATE}")
    block = "const D = " + json.dumps(data, indent=2, ensure_ascii=False) + ";"
    return data, template.replace(MARKER, block)


def main():
    data, html = render()
    if "--check" in sys.argv:
        same = OUT.exists() and OUT.read_text(encoding="utf-8") == html
        print("a jour" if same else "PERIME - relancer sans --check")
        sys.exit(0 if same else 1)
    OUT.write_text(html, encoding="utf-8")
    total = sum(len(e["items"]) for e in data["epics"])
    done = sum(1 for e in data["epics"] for i in e["items"] if i["s"] == "fait")
    lies = sum(1 for e in data["epics"] for i in e["items"] if i.get("it"))
    print(f"{OUT.name} - {len(html)} o | {len(data['epics'])} EPIC, "
          f"{done}/{total} travaux faits, {len(data['iterations'])} iterations, "
          f"{lies} travaux rattaches a une iteration")


if __name__ == "__main__":
    main()
