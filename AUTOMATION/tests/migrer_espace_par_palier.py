"""Aligne l'axe `espace` sur la decision du 21/09. A lancer une fois.

    python AUTOMATION/tests/migrer_espace_par_palier.py          # plan seul
    python AUTOMATION/tests/migrer_espace_par_palier.py --faire  # applique

Deux passes, dans cet ordre, toutes les deux relancables sans risque :

  1. VOCABULAIRE. `image.espace` ecrivait 'lena' pour le SFW : un nom de
     personnage pour un axe qui n'en est pas un. La valeur canonique est 'sfw',
     celle que les routes emploient deja.

  2. PALIER. L'espace suivait le PIPELINE — seule la voie d'edition ecrivait
     dans l'arbre `_NSFW` — au lieu de suivre le palier. Une image produite a un
     palier non exportable (« Suggestif ») atterrissait donc dans l'arbre SFW,
     entrait dans le gabarit d'identite et comptait dans les stats de sa scene,
     tout en se declarant non publiable. Elle passe ici dans l'espace NSFW :
     fichier deplace, ligne mise a jour, vignette oubliee.

Le palier qui EDITE n'est pas concerne : ses sorties sont deja dans `_NSFW`, et
sa passe de generation intermediaire tourne au `base_level`, qui exporte.

Voir DOCS/cadrage/2026-09-21-flux-nsfw.md (arbitrage 1).
"""
import json
import shutil
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
AUTOMATION = HERE.parent
OFM = AUTOMATION.parent
sys.path.insert(0, str(AUTOMATION))

import base  # noqa: E402

PROD = OFM / "PROD"
THUMBS = PROD / ".thumbs"


def paliers_non_exportables(character_id):
    """Niveaux qui GENERENT sans exporter, pour CE personnage.

    Lu dans `creative.json` et jamais code en dur : le decoupage en paliers
    appartient au personnage, et un autre pack peut poser le sien ailleurs
    (invariant 4).
    """
    chemin = OFM / "CHARACTERS" / character_id / "creative.json"
    if not chemin.exists():
        return set()
    creative = json.loads(chemin.read_text(encoding="utf-8"))
    return {t["level"] for t in creative.get("intensity", [])
            if not t.get("export", True) and t.get("pipeline") != "edit"}


def source_sur_disque(character_id, bucket, fichier):
    """Le fichier, tel qu'il est range aujourd'hui dans l'arbre SFW.

    Le bucket de la base fait foi en premier ; s'il ne dit pas vrai — un tri
    fait hors outil, une ligne en retard — on balaye les dossiers de tri du
    personnage plutot que de sauter l'image en silence.
    """
    racine = PROD / character_id.upper()
    if bucket:
        direct = racine / bucket / fichier
        if direct.exists():
            return direct
    for dossier in sorted(d for d in racine.glob("*") if d.is_dir() and d.name != "_NSFW"):
        candidat = dossier / fichier
        if candidat.exists():
            return candidat
    return None


def main(faire):
    deplacements, deja, introuvables = [], [], []
    with base.ouvrir() as cx:
        anciens = cx.execute("SELECT COUNT(*) FROM image WHERE espace = 'lena'"
                             ).fetchone()[0]
        lignes = cx.execute(
            "SELECT id, character_id, fichier, bucket, intensite FROM image "
            "WHERE espace IN ('lena', 'sfw') AND role IS NULL").fetchall()
        paliers = {}
        for r in lignes:
            cid = r["character_id"]
            if cid not in paliers:
                paliers[cid] = paliers_non_exportables(cid)
            if r["intensite"] not in paliers[cid]:
                continue
            src = source_sur_disque(cid, r["bucket"], r["fichier"])
            dest_dir = PROD / cid.upper() / "_NSFW" / (r["bucket"] or "OK")
            if src is None:
                if (dest_dir / r["fichier"]).exists():
                    deja.append((r["id"], cid, r["fichier"]))
                else:
                    introuvables.append((cid, r["fichier"]))
                continue
            deplacements.append((r["id"], cid, src, dest_dir / r["fichier"],
                                 r["bucket"], r["intensite"]))

        print(f"1. vocabulaire : {anciens} ligne(s) 'lena' -> 'sfw'")
        print(f"2. palier      : {len(deplacements)} image(s) a deplacer vers _NSFW, "
              f"{len(deja)} deja sur place, {len(introuvables)} fichier(s) absent(s)")
        for _, cid, src, dest, bucket, niveau in deplacements:
            print(f"   {cid} · niveau {niveau} · {bucket} · {src.name}")
        for cid, fichier in introuvables:
            print(f"   ! {cid} · {fichier} : aucun fichier, ligne mise a jour seule")

        if not faire:
            print("\nplan seul — relancer avec --faire pour appliquer")
            return 0

        cx.execute("UPDATE image SET espace = 'sfw' WHERE espace = 'lena'")
        for iid, cid, src, dest, bucket, _ in deplacements:
            dest.parent.mkdir(parents=True, exist_ok=True)
            shutil.move(str(src), str(dest))
            # la vignette est rangee par personnage/espace/bucket : celle de
            # l'arbre SFW ne designe plus rien, et celle de l'arbre NSFW se
            # regenere a la demande
            (THUMBS / cid / "sfw" / (bucket or "OK")
             / (Path(src.name).stem + ".jpg")).unlink(missing_ok=True)
            cx.execute("UPDATE image SET espace = 'nsfw' WHERE id = ?", (iid,))
        for iid, _, _ in deja:
            cx.execute("UPDATE image SET espace = 'nsfw' WHERE id = ?", (iid,))
        for cid, fichier in introuvables:
            cx.execute("UPDATE image SET espace = 'nsfw' WHERE fichier = ? AND "
                       "character_id = ?", (fichier, cid))
        cx.commit()
    print("\nfait.")
    return 0


if __name__ == "__main__":
    sys.exit(main("--faire" in sys.argv[1:]))
