# -*- coding: utf-8 -*-
"""Le portillon de `base.construire_jeu` : ancre a l'amorcage, gabarit ensuite.

POURQUOI CE TEST EXISTE. L'ANCRE N'EST PAS LE GABARIT. L'ancre (base gelee) dit
QUI est le personnage et ne bouge jamais ; le gabarit dit CONTRE QUOI on mesure
et il est versionne. Verdict de la phase de recherche du 2026-09-09
(DOCS/recherche/2026-09-09-l-ancre-n-est-pas-le-gabarit.md) : une photographie
unique et figee est une reference HORS DISTRIBUTION de la production qu'on lui
compare -- les 29 images qui portaient un embedding scoraient TOUTES plus haut
contre leurs pairs que contre leur ancre.

Ce que ce test verrouille, et qui ne se devine pas :

  1. AMORCAGE. Sans jeu actif, le portillon score contre l'ancre. C'est ce qui
     tourne au premier jour d'un personnage, quand aucun gabarit n'existe.
  2. Un seuil de gabarit ABSENT laisse en amorcage. Jamais de valeur par defaut
     dans le code : un seuil calibre contre l'ancre (~0.74) ne veut rien dire
     contre un gabarit (~0.93), il admettrait tout.
  3. Des qu'un jeu actif et un seuil existent, le portillon score contre le
     GABARIT -- et admet des images que l'ancre refusait, sans admettre
     d'etranger.
  4. L'ANCRE RESTE LE JUGE : la sante est toujours calculee contre elle. Le
     gabarit ne se valide jamais lui-meme.
  5. Un jeu ne melange jamais deux MODELES d'embedding. Un cosinus entre deux
     espaces ne veut rien dire -- meme faute que melanger deux personnages, en
     moins visible.
  6. Ni deux personnages.
  7. `derives` compte les membres issus d'un modele derive (image.lora_identite).

Aucun GPU, aucune image : des vecteurs construits a la main, une base temporaire.

Lancer :  python AUTOMATION\\tests\\test_gabarit.py
"""
import shutil
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
AUTOMATION = HERE.parent
sys.path.insert(0, str(AUTOMATION))

import numpy as np      # noqa: E402
import base as db       # noqa: E402

KO = 0


def verifie(ok, texte):
    global KO
    print(f"  {'ok   ' if ok else 'ECHEC'} {texte}")
    if not ok:
        KO += 1


def unite(v):
    v = np.asarray(v, dtype=np.float32)
    return v / np.linalg.norm(v)


# Geometrie : l'ancre pointe sur U. La production vit autour de P, nettement
# decalee — c'est le cas reel d'Abyssiaelle (ancre photo, production stylisee)
# et, en plus discret, celui de Lena.
DIM = 8
U = unite([1] + [0] * (DIM - 1))
W = unite([0, 1] + [0] * (DIM - 2))


def image_a(alpha, bruit=0.0, graine=0):
    """Vecteur dont le cosinus a l'ancre vaut environ `alpha`."""
    rng = np.random.default_rng(graine)
    v = alpha * U + np.sqrt(max(0.0, 1 - alpha ** 2)) * W
    if bruit:
        v = v + bruit * unite(rng.normal(size=DIM))
    return unite(v)


racine = Path(tempfile.mkdtemp(prefix="gabarit_"))
db.FICHIER = racine / "PROD" / "soulglade.db"

# 6 images de production serrees autour de P (cos ~0.62 a 0.86 de l'ancre) : le
# bloc que l'ancre coupe en deux et que le gabarit doit reunir.
PROD = {f"prod_{i}.png": image_a(a, bruit=0.03, graine=i)
        for i, a in enumerate((0.86, 0.84, 0.82, 0.70, 0.66, 0.62))}
ETRANGER = unite([0, 0, 1] + [0] * (DIM - 3))       # orthogonal : un autre visage

SEUIL_ANCRE = 0.80


def peupler(cx):
    for nom, v in PROD.items():
        iid = db.enregistrer_image(cx, nom, character_id="lena")
        db.enregistrer_embedding(cx, iid, v)
    iid = db.enregistrer_image(cx, "autre_perso.png", character_id="abyssiaelle")
    db.enregistrer_embedding(cx, iid, ETRANGER)
    cx.commit()


print("=" * 70)
print("construire_jeu : l'ancre amorce, le gabarit prend le relais")
print("=" * 70)

try:
    with db.ouvrir() as cx:
        peupler(cx)

        attendus = {n for n, v in PROD.items() if float(np.dot(U, v)) >= SEUIL_ANCRE}
        print(f"\n[1] amorcage : aucun jeu actif -> portillon contre l'ANCRE")
        b1 = db.construire_jeu(cx, "lena", U, SEUIL_ANCRE, libelle="amorcage")
        cx.commit()
        verifie(b1["voie"] == "ancre", f"voie = {b1['voie']!r}")
        verifie(b1["membres"] == len(attendus),
                f"{b1['membres']} membre(s), les {len(attendus)} au-dessus de "
                f"{SEUIL_ANCRE} contre l'ancre")
        verifie(b1["actif"], f"jeu actif (sante {b1['sante']:.4f})")
        verifie(b1["modele"] == db.MODELE_EMBEDDING,
                f"le jeu porte son modele d'embedding ({b1['modele']})")

        print("\n[2] un jeu actif existe, mais AUCUN seuil de gabarit configure")
        b2 = db.construire_jeu(cx, "lena", U, SEUIL_ANCRE, libelle="sans seuil")
        cx.commit()
        verifie(b2["voie"] == "ancre",
                "on reste en amorcage — pas de valeur par defaut dans le code")

        print("\n[3] jeu actif + seuil de gabarit -> portillon contre le GABARIT")
        gab = db.centroide(cx, db.jeu_actif(cx, "lena")["id"])
        contre_gab = {n: float(np.dot(gab, v)) for n, v in PROD.items()}
        seuil_gab = min(contre_gab[n] for n in attendus) - 0.02
        b3 = db.construire_jeu(cx, "lena", U, SEUIL_ANCRE, libelle="gabarit",
                               seuil_gabarit=seuil_gab)
        cx.commit()
        verifie(b3["voie"] == "gabarit", f"voie = {b3['voie']!r}")
        attendus_gab = {n for n, s in contre_gab.items() if s >= seuil_gab}
        verifie(b3["membres"] == len(attendus_gab),
                f"{b3['membres']} membre(s) contre {len(attendus_gab)} attendu(s) "
                f"au seuil {seuil_gab:.4f}")
        verifie(b3["membres"] > b1["membres"],
                f"le gabarit admet PLUS que l'ancre ({b3['membres']} contre "
                f"{b1['membres']}) — c'est tout l'objet du changement")
        verifie(float(np.dot(gab, ETRANGER)) < seuil_gab,
                f"et l'etranger reste dehors ({float(np.dot(gab, ETRANGER)):.3f} "
                f"sous {seuil_gab:.4f})")

        print("\n[4] l'ancre reste le juge : la sante se calcule contre elle")
        c3 = db.centroide(cx, b3["id"])
        verifie(abs(b3["sante_abs"] - float(np.dot(U, c3))) < 1e-6,
                "sante_abs = cos(ancre, centroide), jamais cos(gabarit, centroide)")

        print("\n[5] un jeu ne melange jamais deux modeles d'embedding")
        iid = db.enregistrer_image(cx, "autre_modele.png", character_id="lena")
        db.enregistrer_embedding(cx, iid, image_a(0.99), modele="ccip")
        cx.commit()
        b5 = db.construire_jeu(cx, "lena", U, SEUIL_ANCRE, libelle="modeles")
        cx.commit()
        membres5 = {r["fichier"] for r in cx.execute(
            "SELECT i.fichier FROM reference_member m JOIN image i ON i.id = m.image_id "
            "WHERE m.set_id = ?", (b5["id"],))}
        verifie("autre_modele.png" not in membres5,
                "l'embedding d'un autre modele n'entre pas, meme a cos 0.99 "
                "de l'ancre")

        print("\n[6] ni deux personnages")
        verifie("autre_perso.png" not in membres5,
                "l'image d'un autre personnage n'entre pas")

        print("\n[7] les membres issus d'un modele derive sont comptes")
        db.enregistrer_image(cx, "prod_0.png", character_id="lena",
                             lora_identite="lena_v1.safetensors")
        cx.commit()
        b7 = db.construire_jeu(cx, "lena", U, SEUIL_ANCRE, libelle="derives")
        cx.commit()
        verifie(b7["derives"] == 1,
                f"{b7['derives']} membre(s) DERIVED sur {b7['membres']}")
finally:
    shutil.rmtree(racine, ignore_errors=True)

print("\n" + "=" * 70)
print("tout est vert" if not KO else f"{KO} ECHEC(S)")
sys.exit(1 if KO else 0)
