# -*- coding: utf-8 -*-
"""L'espace suit le palier, jamais le pipeline (21/09). Sans GPU.

POURQUOI CE TEST EXISTE. Jusqu'au 21/09 seule la voie d'EDITION ecrivait dans
l'arbre `_NSFW`. Un palier qui GENERE sans exporter — « Suggestif » — rangeait
donc ses images dans l'arbre SFW : elles entraient dans le gabarit d'identite
et comptaient dans les stats de leur scene, tout en se declarant non
publiables. Cinq images de Lena etaient dans ce cas.

La regle tient en deux moitiees, et ce test garde les deux :

  - la POLITIQUE (`services/creative.apply_tier_rules`) traduit le palier en
    configuration : ce qu'il exporte, et l'espace ou il ecrit ;
  - le RUNNER (`sort_and_export`) obeit a la cle `_espace` sans rien savoir des
    paliers (CLAUDE.md §8.2).

Le cas qui les separe : le palier qui EDITE. Sa passe de generation tourne au
`base_level`, qui exporte — l'image intermediaire reste SFW, et une regle prise
sur le seul niveau demande la ferait basculer a tort.

Cree un personnage jetable (`espace_probe`) et son arbre PROD, les supprime a
la fin. Git-ignore : rien ne fuit dans l'historique (ADR-0005).

Lancer :  python.exe AUTOMATION\\tests\\test_espace_par_palier.py
"""
import json
import shutil
import sqlite3
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
AUTOMATION = HERE.parent
OFM = AUTOMATION.parent
sys.path.insert(0, str(AUTOMATION))
sys.path.insert(0, str(AUTOMATION / "web"))
sys.path.insert(0, str(AUTOMATION / "web"))

import base                                            # noqa: E402
import nsfw_batch                                      # noqa: E402
import runner as lb                                    # noqa: E402
from api.services.creative import apply_tier_rules     # noqa: E402

CID = "espace_probe"
DIRS = [OFM / "CHARACTERS" / CID, OFM / "PROD" / CID.upper()]
KO = 0

PALIERS = [
    {"level": 0, "key": "sfw", "label": "SFW", "pipeline": "produce",
     "wardrobe": "covered", "export": True, "requires": None},
    {"level": 2, "key": "suggestif", "label": "Suggestif", "pipeline": "produce",
     "wardrobe": "swimwear", "export": False, "requires": "confirm"},
    {"level": 3, "key": "nsfw", "label": "NSFW", "pipeline": "edit",
     "base_level": 0, "wardrobe": "loungewear", "export": False,
     "requires": "armed"},
    # Palier NATIF (21/09) : il GENERE du contenu adulte sur le checkpoint du
    # pack, donc `produce`, non exportable, arme, et il declare le LoRA.
    {"level": 4, "key": "natif", "label": "Natif", "pipeline": "produce",
     "wardrobe": "nude", "export": False, "requires": "armed",
     "lora_adulte": True},
]


def verifie(ok, texte):
    global KO
    print(f"  {'ok   ' if ok else 'ECHEC'} {texte}")
    if not ok:
        KO += 1


def semer():
    for d in DIRS:
        d.mkdir(parents=True, exist_ok=True)
    d = OFM / "CHARACTERS" / CID
    (d / "character.json").write_text(json.dumps(
        {"id": CID, "name": CID, "universe": "instagram-influenceur",
         "type": "instagram-influenceur", "output_style": "realiste",
         "nsfw": True, "content_types": {"image": True}}, ensure_ascii=False),
        encoding="utf-8")
    (d / "creative.json").write_text(
        json.dumps({"intentions": [], "tones": [], "intensity": PALIERS}),
        encoding="utf-8")


def config():
    """Le minimum que `sort_and_export` lit, et rien de plus."""
    return {"export": {"enabled": True, "format": "jpg", "quality": 92},
            "export_sizes": {"4:5": (1080, 1350)}}


def job():
    return {"index": 1, "scene": "chambre_matin", "category": "intime",
            "format": "4:5", "seed": 1, "prompt": "", "variant": "",
            "intensity": 2}


def main():
    semer()
    try:
        print("\n[1] la politique traduit le palier en configuration")
        for niveau, espace, exporte in ((0, "sfw", True), (2, "nsfw", False)):
            cfg = apply_tier_rules(config(), niveau, CID)
            verifie(cfg["_espace"] == espace,
                    f"niveau {niveau} -> espace {espace!r} ({cfg['_espace']!r})")
            verifie(cfg["export"]["enabled"] is exporte,
                    f"niveau {niveau} -> export {exporte} "
                    f"({cfg['export']['enabled']})")

        print("\n[2] le palier qui edite : l'intermediaire reste SFW")
        cfg = apply_tier_rules(config(), 3, CID)
        verifie(cfg["_espace"] == "sfw",
                "la passe de generation tourne au base_level, qui exporte "
                f"({cfg['_espace']!r})")
        verifie(cfg["export"]["enabled"] is False,
                "et le lot n'exporte pas pour autant : c'est le niveau DEMANDE "
                f"qui decide de l'export ({cfg['export']['enabled']})")

        print("\n[3] le runner obeit a la cle, sans connaitre les paliers")
        racine = OFM / "PROD" / CID.upper()
        for espace, attendu in (("sfw", racine / "OK"),
                                ("nsfw", racine / "_NSFW" / "OK")):
            cfg = config()
            cfg["export"]["enabled"] = False
            cfg["_espace"] = espace
            src = racine / f"transit_{espace}.png"
            src.write_bytes(b"pas une vraie image")
            dest, export = lb.sort_and_export(src, job(), "OK", 0.8, cfg,
                                              "b1", character_id=CID)
            verifie(dest.parent == attendu,
                    f"_espace {espace!r} -> {dest.parent.relative_to(OFM)}")
            verifie(not export, "et rien n'est exporte depuis ce lot")

        print("\n[4] sans la cle, c'est le comportement d'avant le 21/09")
        cfg = config()
        cfg["export"]["enabled"] = False
        src = racine / "transit_defaut.png"
        src.write_bytes(b"pas une vraie image")
        dest, _ = lb.sort_and_export(src, job(), "A_REVOIR", 0.7, cfg, "b1",
                                     character_id=CID)
        verifie(dest.parent == racine / "A_REVOIR",
                f"cle absente -> arbre SFW ({dest.parent.relative_to(OFM)})")

        print("\n[5] ce que le demenagement ne doit pas casser")
        # Une image generee au palier non exportable reste EDITABLE : elle a
        # seulement change d'arbre. Ce qui reste exclu, c'est la sortie de la
        # voie d'edition elle-meme, que son journal nomme.
        (racine / "OK").mkdir(parents=True, exist_ok=True)
        (racine / "_NSFW" / "OK").mkdir(parents=True, exist_ok=True)
        (racine / "OK" / "sfw_01.png").write_bytes(b"x")
        (racine / "_NSFW" / "OK" / "suggestif_01.png").write_bytes(b"x")
        (racine / "_NSFW" / "OK" / "edite_01.png").write_bytes(b"x")
        (racine / "_NSFW" / "journal_nsfw.csv").write_text(
            "date;batch;source;seed;score_identite;verdict;fichier;duree;instruction\n"
            "2026-09-21;b1;sfw_01.png;1;0.78;OK;edite_01.png;12;x\n",
            encoding="utf-8")
        vues = {f.name for f, _ in nsfw_batch.sources_disponibles({}, CID)}
        verifie({"sfw_01.png", "suggestif_01.png"} <= vues,
                "sources editables : les deux arbres, l'image generee sous "
                f"_NSFW comprise ({sorted(vues)})")
        verifie("edite_01.png" not in vues,
                "et jamais une sortie d'edition, que son journal nomme")
        verifie(nsfw_batch.resoudre_source("suggestif_01.png", {}, CID) is not None,
                "une image de l'arbre NSFW se resout par son nom")
        verifie(nsfw_batch.resoudre_source("edite_01.png", {}, CID) is None,
                "une sortie d'edition ne se resout pas : elle n'est pas une source")

        # Meme scene, meme jour, deux paliers : le nom doit rester unique sur
        # les DEUX arbres, sinon deux images partagent une entree de mesures.
        cfg = config()
        cfg["export"]["enabled"] = False
        pris = lb.nom_libre("suggestif_01", racine)
        verifie(pris != "suggestif_01.png",
                f"nom_libre voit l'arbre NSFW depuis la racine du personnage "
                f"({pris})")

        print("\n[6] une base d'avant le 21/09 garde son ancien defaut")
        # `CREATE TABLE IF NOT EXISTS` ne touche pas une table deja creee : la
        # colonne y reste `DEFAULT 'lena'` pour toujours. Une ligne qui s'y
        # fierait tomberait dans une valeur qu'aucun filtre ne reconnait plus —
        # le bug meme que ce chantier corrige, par un angle mort SQLite.
        ancienne = OFM / "PROD" / "_test_espace_palier.db"
        vraie = base.FICHIER
        try:
            for suffixe in ("", "-wal", "-shm"):
                Path(str(ancienne) + suffixe).unlink(missing_ok=True)
            vieux_schema = base.SCHEMA.replace("DEFAULT 'sfw'", "DEFAULT 'lena'")
            cx = sqlite3.connect(ancienne)
            cx.executescript(vieux_schema)
            cx.commit()
            cx.close()
            base.FICHIER = ancienne
            with base.ouvrir() as cx:
                base.enregistrer_image(cx, "sans_espace.png", character_id=CID)
                cx.commit()
                ligne = cx.execute("SELECT espace FROM image WHERE fichier = ?",
                                   ("sans_espace.png",)).fetchone()
                defaut = next(d[4] for d in cx.execute("PRAGMA table_info(image)")
                              if d[1] == "espace")
            verifie(defaut == "'lena'",
                    f"la table garde bien l'ancien defaut ({defaut})")
            verifie(ligne["espace"] == "sfw",
                    f"et la ligne s'ecrit 'sfw' quand meme : le defaut vit en "
                    f"Python ({ligne['espace']})")
        finally:
            base.FICHIER = vraie
            for suffixe in ("", "-wal", "-shm"):
                Path(str(ancienne) + suffixe).unlink(missing_ok=True)
        print()
        print("[7] l'interface annonce la MEME destination que le runner")
        import asyncio
        from api.routers import bank   # nsfw_batch est deja importe plus haut
        vrais = (nsfw_batch.edit_tool_state, bank.ss.scenes_data, bank.ss.cfg,
                 nsfw_batch.sources_disponibles)
        bank.ss.scenes_data = lambda c: {"scenes": []}
        bank.ss.cfg = lambda c: config()
        nsfw_batch.sources_disponibles = lambda cfg, c: []
        try:
            # L'ARMEMENT POUR TOUS, LE GRAPHE POUR CELUI QUI EDITE. Un pack
            # sans graphe d'edition doit quand meme pouvoir exposer le cran
            # natif, qui genere sur son propre checkpoint.
            for arme, graphe, attendus in ((True, True, {0, 2, 3, 4}),
                                           (True, False, {0, 2, 4}),
                                           (False, True, {0, 2})):
                nsfw_batch.edit_tool_state = (
                    lambda c, a=arme, g=graphe: {"armed": a, "has_graph": g,
                                                 "available": a and g,
                                                 "pack": "x", "reason": ""})
                rendu = asyncio.run(bank.get_creative_taxonomy(character_id=CID))
                niveaux = {p["level"] for p in rendu["intensity"]}
                verifie(niveaux == attendus,
                        f"arme={arme} graphe={graphe} -> crans {sorted(niveaux)} "
                        f"(attendu {sorted(attendus)})")
            nsfw_batch.edit_tool_state = lambda c: {
                "armed": True, "has_graph": True, "available": True,
                "pack": "x", "reason": ""}
            rendu = asyncio.run(bank.get_creative_taxonomy(character_id=CID))
            dest = {p["level"]: p["destination"] for p in rendu["intensity"]}
            verifie(dest[0].endswith(CID.upper()),
                    f"le cran exportable annonce l'arbre ordinaire ({dest[0]})")
            for niveau in (2, 3, 4):
                verifie(dest[niveau].endswith("_NSFW"),
                        f"le cran {niveau}, non exportable, annonce _NSFW "
                        f"({dest[niveau]})")
        finally:
            (nsfw_batch.edit_tool_state, bank.ss.scenes_data, bank.ss.cfg,
             nsfw_batch.sources_disponibles) = vrais
    finally:
        for d in DIRS:
            shutil.rmtree(d, ignore_errors=True)
    print(f"\n{'TOUT VERT' if not KO else str(KO) + ' ECHEC(S)'}")
    return 1 if KO else 0


if __name__ == "__main__":
    sys.exit(main())
