# -*- coding: utf-8 -*-
"""Le transfert de mouvement de l'expression, sur images synthetiques (25/09).

POURQUOI CE TEST EXISTE. La passe d'expression directe regenerait le visage a
512 et le recollait : cheveux crepes, peau grenue, sur toute image touchee. Le
transfert de mouvement (`expression.transferer_mouvement`) ne garde du noeud
que le deplacement, et l'applique a l'original. Ce test verrouille, sans
ComfyUI, les quatre proprietes qui font la difference :

  1. aucune expression (neutre == expressive) : la source ressort intacte ;
  2. un motif deplace entre neutre et expressive : la source se deforme dans
     cette zone, et reste identique ailleurs ;
  3. un contenu NEUF dans l'expressive (des dents) : il est recolle ;
  4. la texture fine de la source survit hors de la zone deformee — la
     propriete que la passe directe detruisait.

cv2 est celui de l'interpreteur de ComfyUI (python_embeded) ; sans lui le test
s'ignore proprement.

Lancer :  python_embeded\\python.exe AUTOMATION\\tests\\test_expression_transfert.py
"""
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))

try:
    import cv2
    import numpy as np
except ImportError:
    print("  IGNORE — cv2 absent (lancer avec python_embeded)")
    sys.exit(0)

import expression as ex  # noqa: E402

KO = 0


def verifie(ok, texte):
    global KO
    print(f"  {'ok   ' if ok else 'ECHEC'} {texte}")
    if not ok:
        KO += 1


rng = np.random.default_rng(7)
H, W = 400, 300
# La source : une texture fine partout (le « grain de peau ») sur un fond doux.
source = (np.full((H, W, 3), 120) + rng.normal(0, 12, (H, W, 3))).clip(0, 255).astype(np.uint8)
# Les sorties du noeud : une version LISSEE de la source, comme le noeud la rend
# apres son aller-retour a 512 — le dommage commun aux deux appels.
neutre = cv2.GaussianBlur(source, (0, 0), 2.5)
cv2.rectangle(neutre, (120, 150), (180, 170), (40, 40, 60), -1)      # une « bouche »

print("[1] sans expression, la source ressort intacte")
image, part = ex.transferer_mouvement(source, neutre, neutre.copy())
verifie(int(np.abs(image.astype(int) - source.astype(int)).max()) <= 1,
        f"ecart max {int(np.abs(image.astype(int) - source.astype(int)).max())} (<= 1)")
verifie(part == 0.0, "rien n'est recolle depuis la sortie du noeud")

print("[2] un motif deplace : la source se deforme la, et seulement la")
expressive = cv2.GaussianBlur(source, (0, 0), 2.5)
cv2.rectangle(expressive, (120, 156), (180, 176), (40, 40, 60), -1)  # la bouche descend de 6 px
image, part = ex.transferer_mouvement(source, neutre, expressive)
loin = (slice(0, 80), slice(0, W))                                    # haut de l'image
verifie(np.array_equal(image[loin], source[loin]), "loin du motif, l'image est la source a l'octet")
verifie(int(np.abs(image[140:190, 110:190].astype(int) - source[140:190, 110:190].astype(int)).max()) > 0,
        "dans la zone du motif, la source a ete deformee")

print("[3] un contenu neuf dans l'expressive est recolle")
expressive = neutre.copy()
cv2.rectangle(expressive, (130, 155), (170, 165), (235, 235, 235), -1)  # des « dents »
image, part = ex.transferer_mouvement(source, neutre, expressive)
verifie(part > 0, f"part recollee {part * 100:.2f} % (> 0)")
verifie(image[160, 150].mean() > 200, "les dents apparaissent dans l'image composee")
verifie(np.array_equal(image[0:80], source[0:80]), "et rien d'autre n'a bouge")

print("[4] la texture fine de la source survit hors de la zone deformee")
lap = lambda im: cv2.Laplacian(cv2.cvtColor(im, cv2.COLOR_BGR2GRAY), cv2.CV_64F)[0:120].var()
verifie(lap(image) > 0.9 * lap(source),
        f"variance du laplacien {lap(image):.0f} contre {lap(source):.0f} pour la source "
        f"(la sortie lissee du noeud : {lap(expressive):.0f})")

print("[5] les ancres d'identite tiennent par construction (26/09)")
# Un visage synthetique : ses 106 points places a la main aux zones qui
# comptent (carte de expression.ANCRES_*), la bouche a part.
pts = np.tile(np.array([150.0, 262.0]), (106, 1))                 # bouche et reste
pts[38], pts[88] = (110, 120), (190, 120)                          # pupilles : ecart 80
for i, x in zip((2, 3, 4, 5, 6, 7, 8, 0, 24, 23, 22, 21, 20, 19, 18), np.linspace(96, 204, 15)):
    pts[i] = (x, 330)                                              # machoire
for i, x in zip((44, 45, 46, 47, 48, 49, 50, 51), np.linspace(92, 128, 8)):
    pts[i] = (x, 95)                                               # sourcil
for i, x in zip((97, 98, 99, 100, 102, 103, 104, 105), np.linspace(172, 208, 8)):
    pts[i] = (x, 95)                                               # sourcil
for i, y in zip((10, 11, 12, 13, 14), np.linspace(185, 215, 5)):
    pts[i] = (70, y)                                               # pommette
for i, y in zip((26, 27, 28, 29, 30), np.linspace(185, 215, 5)):
    pts[i] = (230, y)                                              # pommette


BASE = {}


def ecart(image, zone):
    return float(np.abs(image[zone].astype(int) - BASE["source"][zone].astype(int)).mean())


def essai(dessin_neutre, dessin_expressif):
    """Le trait est dessine sur la source ET sur le neutre, comme dans la
    realite ou la sortie a vide montre le meme visage ; l'expressive le montre
    deplace ou deforme. Rend (libre, tenu) : sans et avec les ancres."""
    marquee = source.copy()
    dessin_neutre(marquee)
    expressive_nette = source.copy()
    dessin_expressif(expressive_nette)
    BASE["source"] = marquee
    n = cv2.GaussianBlur(marquee, (0, 0), 2.5)
    e = cv2.GaussianBlur(expressive_nette, (0, 0), 2.5)
    libre, _ = ex.transferer_mouvement(marquee, n, e)
    tenu, _ = ex.transferer_mouvement(marquee, n, e, points=pts)
    return libre, tenu


# Chaque deformation reste DANS la zone de ses points : sur un vrai visage, une
# machoire qui s'elargit deplace ses points de contour ; hors des points, le
# flux est libre par conception, et c'est la que l'expression vit.
machoire = (slice(324, 337), slice(96, 205))
libre, tenu = essai(lambda im: cv2.rectangle(im, (106, 327), (194, 333), (30, 30, 30), -1),
                    lambda im: cv2.rectangle(im, (98, 327), (202, 333), (30, 30, 30), -1))
verifie(ecart(tenu, machoire) < 0.5 * ecart(libre, machoire),
        f"une machoire qui s'elargirait garde sa forme ({ecart(libre, machoire):.2f} libre -> {ecart(tenu, machoire):.2f} tenue)")

pommette = (slice(185, 216), slice(63, 78))
libre, tenu = essai(lambda im: cv2.rectangle(im, (67, 190), (75, 210), (30, 30, 30), -1),
                    lambda im: cv2.rectangle(im, (63, 190), (71, 210), (30, 30, 30), -1))
verifie(ecart(tenu, pommette) < 0.5 * ecart(libre, pommette),
        f"une pommette ne part pas de cote ({ecart(libre, pommette):.2f} -> {ecart(tenu, pommette):.2f})")
libre, tenu = essai(lambda im: cv2.rectangle(im, (67, 190), (75, 210), (30, 30, 30), -1),
                    lambda im: cv2.rectangle(im, (67, 185), (75, 205), (30, 30, 30), -1))
verifie(ecart(tenu, pommette) > 0.5 * ecart(libre, pommette),
        f"mais elle peut monter ({ecart(libre, pommette):.2f} -> {ecart(tenu, pommette):.2f})")

sourcil = (slice(91, 100), slice(94, 127))
libre, tenu = essai(lambda im: cv2.rectangle(im, (96, 94), (124, 96), (30, 30, 30), -1),
                    lambda im: cv2.rectangle(im, (96, 92), (124, 98), (30, 30, 30), -1))
verifie(ecart(tenu, sourcil) < 0.5 * ecart(libre, sourcil),
        f"un sourcil ne s'epaissit pas ({ecart(libre, sourcil):.2f} -> {ecart(tenu, sourcil):.2f})")

iris = (slice(112, 128), slice(102, 118))
libre, tenu = essai(lambda im: cv2.circle(im, (110, 120), 7, (40, 90, 60), -1),
                    lambda im: cv2.circle(im, (110, 120), 7, (200, 60, 20), -1))
verifie(ecart(tenu, iris) < 0.5 * ecart(libre, iris),
        f"un iris recolore n'est jamais recolle ({ecart(libre, iris):.2f} -> {ecart(tenu, iris):.2f})")

bouche = (slice(245, 285), slice(115, 185))
libre, tenu = essai(lambda im: cv2.rectangle(im, (125, 258), (175, 266), (40, 40, 60), -1),
                    lambda im: cv2.rectangle(im, (125, 264), (175, 272), (40, 40, 60), -1))
verifie(ecart(tenu, bouche) > 0.8 * ecart(libre, bouche),
        f"la bouche garde tout son mouvement ({ecart(libre, bouche):.2f} -> {ecart(tenu, bouche):.2f})")

print("\n" + ("tout est vert" if KO == 0 else f"{KO} ECHEC(S)"))
sys.exit(1 if KO else 0)
