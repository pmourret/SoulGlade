# -*- coding: utf-8 -*-
"""Fait de la place au palier NATIF : l'edition passe du niveau 3 au niveau 4.

    python AUTOMATION\\tests\\migrer_palier_natif.py [personnage]
    ... --appliquer        pour ecrire (sans ce drapeau : simulation)

POURQUOI. Le palier natif genere du contenu adulte sur le checkpoint du pack
(decision du 21/09). Sa place dans l'echelle est au-dessus du Suggestif et
EN DESSOUS de l'edition : on produit de plus en plus explicite, puis
l'edition vient transformer ce qui existe deja. Le curseur se lit alors dans
l'ordre, ce qui n'aurait pas ete le cas avec un natif pose au-dessus de
l'edition.

CE QUE CA DEPLACE. Le niveau 3 signifiait « edition » ; il signifiera
« natif ». Les lignes deja ecrites avec `intensite = 3` viennent donc toutes
de la voie d'edition, et ce script les passe a 4 pour qu'elles gardent leur
sens. Il tourne UNE FOIS, avant qu'une seule image native n'existe : apres,
un 3 dans l'espace NSFW serait ambigu, et le script refuse de deviner.

Ce qu'il ne touche pas : `base_level`, qui reste 1 (la passe de generation
d'une requete d'edition tourne toujours en Soft), et les tenues des scenes,
dont aucune ne declare de niveau 3 aujourd'hui.
"""
import csv
import json
import sqlite3
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
AUTOMATION = HERE.parent
OFM = AUTOMATION.parent
sys.path.insert(0, str(AUTOMATION))

ANCIEN, NOUVEAU = 3, 4


def creative_path(cid):
    return OFM / "CHARACTERS" / cid / "creative.json"


def migrer_creative(cid, appliquer):
    p = creative_path(cid)
    if not p.exists():
        print(f"  creative.json absent pour {cid!r}"); return False
    d = json.loads(p.read_text(encoding="utf-8"))
    paliers = d.get("intensity", [])
    edit = [t for t in paliers if t.get("pipeline") == "edit"]
    if not edit:
        print("  aucun palier d'edition : rien a deplacer"); return False
    if len(edit) > 1:
        print("  plusieurs paliers d'edition : a trancher a la main"); return False
    t = edit[0]
    if t["level"] == NOUVEAU:
        print(f"  le palier d'edition est deja au niveau {NOUVEAU}"); return False
    if t["level"] != ANCIEN:
        print(f"  le palier d'edition est au niveau {t['level']}, pas "
              f"{ANCIEN} : rien de sur a faire"); return False
    if any(x["level"] == NOUVEAU for x in paliers):
        print(f"  le niveau {NOUVEAU} est deja pris"); return False
    print(f"  palier « {t.get('label')} » : niveau {ANCIEN} -> {NOUVEAU}")
    if appliquer:
        t["level"] = NOUVEAU
        d["intensity"] = sorted(paliers, key=lambda x: x["level"])
        p.write_text(json.dumps(d, ensure_ascii=False, indent=2) + "\n",
                     encoding="utf-8")
    return True


def migrer_base(cid, appliquer):
    import base as db
    with db.ouvrir() as cx:
        cx.row_factory = sqlite3.Row
        lignes = cx.execute(
            "SELECT id, fichier, espace FROM image WHERE character_id = ? "
            "AND intensite = ?", (cid, ANCIEN)).fetchall()
        hors = [r["fichier"] for r in lignes if r["espace"] != "nsfw"]
        if hors:
            print(f"  ATTENTION : {len(hors)} ligne(s) a l'intensite {ANCIEN} hors "
                  f"de l'espace NSFW, elles ne viennent pas de l'edition : "
                  f"{hors[:3]}")
            return 0
        print(f"  base : {len(lignes)} ligne(s) a passer de {ANCIEN} a {NOUVEAU}")
        if appliquer and lignes:
            cx.execute("UPDATE image SET intensite = ? WHERE character_id = ? "
                       "AND intensite = ?", (NOUVEAU, cid, ANCIEN))
            cx.commit()
        return len(lignes)


def migrer_journal(cid, appliquer):
    chemin = OFM / "PROD" / "journal_batch.csv"
    if not chemin.exists():
        print("  journal absent"); return 0
    with open(chemin, encoding="utf-8", newline="") as f:
        lecteur = csv.DictReader(f, delimiter=";")
        colonnes, rows = lecteur.fieldnames, list(lecteur)
    vises = [r for r in rows
             if (r.get("character") or "") == cid
             and (r.get("intensite") or "") == str(ANCIEN)]
    print(f"  journal : {len(vises)} ligne(s) a passer de {ANCIEN} a {NOUVEAU}")
    if appliquer and vises:
        for r in vises:
            r["intensite"] = str(NOUVEAU)
        tmp = chemin.with_suffix(".csv.tmp")
        with open(tmp, "w", encoding="utf-8", newline="") as f:
            w = csv.DictWriter(f, fieldnames=colonnes, delimiter=";")
            w.writeheader(); w.writerows(rows)
        tmp.replace(chemin)
    return len(vises)


def main(argv):
    appliquer = "--appliquer" in argv
    cid = next((a for a in argv[1:] if not a.startswith("-")), "lena")
    print(f"personnage : {cid}   mode : "
          f"{'ECRITURE' if appliquer else 'simulation (ajouter --appliquer)'}")
    migrer_creative(cid, appliquer)
    migrer_base(cid, appliquer)
    migrer_journal(cid, appliquer)
    if not appliquer:
        print("\nrien n'a ete ecrit.")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
