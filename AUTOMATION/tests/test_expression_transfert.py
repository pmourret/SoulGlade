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

print("\n" + ("tout est vert" if KO == 0 else f"{KO} ECHEC(S)"))
sys.exit(1 if KO else 0)
