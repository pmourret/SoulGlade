# -*- coding: utf-8 -*-
"""Monte en base les etiquettes de corpus qui n'existaient que dans mesures.json.

    python AUTOMATION/tests/backfill_etiquettes.py [personnage]

Les axes `anatomie` et `mains_juge` (mesures.ETIQUETTES, P4.5.1) ne vivaient
que dans le store JSON : `poser_etiquette` l'assumait et posait la condition de
sa propre migration -- « migrer le jour ou une SECONDE LECTURE le demande ». La
file d'entrainement (AUTOMATION/entrainement.py) est cette seconde lecture, et
elle DECIDE depuis ces etiquettes.

Idempotent : relancable sans effet. FILTRE PAR PERSONNAGE, comme
backfill_embeddings -- une etiquette ecrite sous le mauvais character_id creerait
une ligne fantome, la cle d'enregistrer_image etant (character_id, fichier).
Les images d'un autre personnage sont laissees intactes, et comptees.
"""
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
AUTOMATION = HERE.parent
sys.path.insert(0, str(AUTOMATION))

import base            # noqa: E402
import mesures as mes  # noqa: E402

PERSONNAGE = (sys.argv[1] if len(sys.argv) > 1 else "lena").lower()


def main():
    store = mes.charger()
    champs = [champ for champ, _ in mes.ETIQUETTES.values()]

    with base.ouvrir() as cx:
        connues = {r["fichier"]: r["id"] for r in cx.execute(
            "SELECT id, fichier FROM image WHERE character_id = ?", (PERSONNAGE,))}
        autres = {r["fichier"] for r in cx.execute(
            "SELECT fichier FROM image WHERE character_id != ?", (PERSONNAGE,))}

        posees = ignorees = absentes = 0
        for nom, entree in store.items():
            valeurs = {c: entree.get(c) for c in champs if entree.get(c)}
            if not valeurs:
                continue
            if nom not in connues:
                if nom in autres:
                    ignorees += 1        # appartient a un autre personnage
                else:
                    absentes += 1        # corpus de reference, ou image disparue
                continue
            for champ, valeur in valeurs.items():
                base.enregistrer_etiquette(cx, connues[nom], champ, valeur)
                posees += 1
        cx.commit()

        total = cx.execute(
            "SELECT COUNT(*) FROM jugement j JOIN image i ON i.id = j.image_id "
            "WHERE i.character_id = ? AND (j.anatomie IS NOT NULL "
            "OR j.mains_juge IS NOT NULL)", (PERSONNAGE,)).fetchone()[0]

    print(f"  {posees} etiquette(s) ecrite(s) en base pour {PERSONNAGE}")
    if ignorees:
        print(f"  {ignorees} image(s) d'un AUTRE personnage : laissees intactes")
    if absentes:
        print(f"  {absentes} image(s) inconnues de la base (corpus de reference "
              f"ou fichier disparu) : ignorees")
    print(f"  {total} image(s) de {PERSONNAGE} portent desormais une etiquette en base")
    return 0


if __name__ == "__main__":
    sys.exit(main())
