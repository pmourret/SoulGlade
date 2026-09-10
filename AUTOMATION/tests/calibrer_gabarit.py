# -*- coding: utf-8 -*-
"""Propose le seuil du portillon contre le GABARIT, mesure sur la base.

    python AUTOMATION/tests/calibrer_gabarit.py [personnage]

LECTURE SEULE : aucun GPU, aucune passe InsightFace, aucune ecriture. Tout se
calcule sur les embeddings deja en base -- c'est exactement ce que le stockage
des embeddings a rendu possible (voir base.rescorer).

POURQUOI CE SCRIPT EXISTE. `qc.threshold_gabarit` n'a pas de valeur par defaut
dans le code, et c'est voulu : un seuil se mesure PAR PERSONNAGE (invariant 4,
et les bandes QC d'Abyssiaelle ont ete posees comme ca, cf. ses `_notes`). Un
seuil calibre contre l'ancre ne veut RIEN dire contre le gabarit : les membres
sont a ~0.77 de l'ancre et a ~0.93 du gabarit. Recopier 0.74 admettrait tout.

Ce script imprime ; il ne decide pas. La valeur retenue va a la main dans
CHARACTERS/<nom>/config.json, cle qc.threshold_gabarit.
"""
import sqlite3
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
AUTOMATION = HERE.parent
sys.path.insert(0, str(AUTOMATION))

import numpy as np      # noqa: E402
import base             # noqa: E402

PERSONNAGE = (sys.argv[1] if len(sys.argv) > 1 else "lena").lower()
KS = (1.0, 1.5, 2.0, 2.5, 3.0)


def vecteurs(cx, ou, args):
    """(id, fichier, vecteur) pour les images de production qui portent un
    embedding DU MEME MODELE que le jeu — jamais deux espaces melanges."""
    q = ("SELECT i.id AS id, i.fichier AS f, e.vec AS vec FROM image i "
         "JOIN embedding e ON e.image_id = i.id "
         "WHERE i.role IS NULL AND i.espace = 'lena' AND e.modele = ? AND " + ou)
    return [(r["id"], r["f"], np.frombuffer(r["vec"], dtype=np.float32))
            for r in cx.execute(q, (base.MODELE_EMBEDDING,) + args)]


def main():
    with base.ouvrir() as cx:
        actif = base.jeu_actif(cx, PERSONNAGE)
        if not actif:
            print(f"  aucun jeu de reference actif pour {PERSONNAGE!r}.")
            print("  Le portillon est en AMORCAGE : il score contre l'ancre gelee,")
            print("  et il n'y a pas encore de gabarit a calibrer. Lancer d'abord")
            print("  backfill_embeddings.py pour construire un premier jeu.")
            return 0
        gab = base.centroide(cx, actif["id"])
        if gab is None:
            print(f"  le jeu actif #{actif['id']} est vide : rien a calibrer.")
            return 1

        membres = {r["image_id"] for r in cx.execute(
            "SELECT image_id FROM reference_member WHERE set_id = ?", (actif["id"],))}
        siens = vecteurs(cx, "i.character_id = ?", (PERSONNAGE,))
        etrangers = vecteurs(cx, "i.character_id != ?", (PERSONNAGE,))

    if not siens:
        print(f"  aucune image de {PERSONNAGE!r} avec embedding : rien a calibrer.")
        return 1

    sg = np.array([float(np.dot(gab, v)) for _, _, v in siens])
    mm = np.array([float(np.dot(gab, v)) for i, _, v in siens if i in membres])
    ig = np.array([float(np.dot(gab, v)) for _, _, v in etrangers])

    print(f"  jeu actif #{actif['id']} — {len(membres)} membre(s), "
          f"modele {actif.get('modele') or base.MODELE_EMBEDDING}, "
          f"sante {actif['sante']:.4f}")
    print(f"\n  MEMBRES contre le gabarit : moy {mm.mean():.4f}  "
          f"ecart-type {mm.std():.4f}  min {mm.min():.4f}")
    print(f"  TOUTES ses images ({len(sg)}) : {sg.min():.4f} .. {sg.max():.4f}")
    if len(ig):
        print(f"  BANDE IMPOSTEUR ({len(ig)} image(s) d'un autre personnage) : "
              f"{ig.min():.4f} .. {ig.max():.4f}")
    else:
        print("  BANDE IMPOSTEUR : AUCUNE — pas d'autre personnage en base.")
        print("    Sans classe negative, aucun seuil ne peut etre valide ici :")
        print("    on ne saurait pas dire ce qu'il laisse passer. (Cohorte")
        print("    d'imposteurs : entree d'horizon du tableau de bord.)")

    print(f"\n  seuil = moy(membres) - k x ecart-type :")
    print(f"    {'k':<6}{'seuil':>9}{'admises':>10}{'etrangers':>11}{'marge':>9}")
    for k in KS:
        s = float(mm.mean() - k * mm.std())
        admis = int((sg >= s).sum())
        faux = int((ig >= s).sum()) if len(ig) else 0
        marge = (s - float(ig.max())) if len(ig) else float("nan")
        print(f"    {k:<6}{s:>9.4f}{admis:>7}/{len(sg):<3}{faux:>11}{marge:>9.3f}")

    reco = float(mm.mean() - 2.0 * mm.std())
    print(f"\n  A ECRIRE A LA MAIN dans CHARACTERS/{PERSONNAGE}/config.json :")
    print(f'      "qc": {{ ..., "threshold_gabarit": {reco:.4f} }}')
    print("  k=2 par defaut : il ouvre le portillon sans approcher la bande")
    print("  imposteur. Monter k admet plus d'images et rapproche du bruit ;")
    print("  le descendre resserre le gabarit sur ce qui lui ressemble deja.")
    print("\n  L'ecart-type ci-dessus est celui des MEMBRES, donc mesure sur des")
    print("  images que le gabarit contient : il sous-estime la vraie dispersion.")
    print("  C'est la marge a la bande imposteur qui dit si le seuil tient.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
