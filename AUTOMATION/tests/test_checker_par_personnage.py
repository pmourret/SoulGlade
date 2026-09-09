# -*- coding: utf-8 -*-
"""`shared_state.checker_partage` rend le QC du personnage DEMANDE.

POURQUOI CE TEST EXISTE. Le cache ne tenait qu'un seul checker, construit au
premier appel du processus ; son argument etait ensuite ignore. Tout personnage
suivant etait donc mesure contre la base gelee ET les seuils du PREMIER charge
— le melange de donnees entre deux personnages que `CLAUDE.md` (§Methode)
demande de verrouiller par un test sur toute fonction generalisee.

Ce n'etait pas theorique. Trouve le 2026-09-09 en phase de recherche, dans la
base de production :

    08:52:47  abyssiaelle  -> CHECKER construit sur ABY_MAIN_REF.jpg (0.50/0.35)
    08:56:19  lena         -> mesuree contre CETTE ancre : 0.232, verdict REJET

0.232 est la bande d'un visage ETRANGER (Lena contre ABY_MAIN_REF : 0.20-0.35,
mesure du 28/08 notee dans abyssiaelle/config.json). L'image est partie dans
PROD/LENA/REJET/. Son embedding, lui, ne depend d'aucune ancre et disait 0.784 :
c'est ce desaccord entre le score et son propre embedding qui a rendu la panne
visible, sur 1 image des 29 qui portaient un embedding.

Ce test verrouille TROIS choses :
  - changer de personnage reconstruit le checker sur SA base gelee et SES seuils ;
  - redemander le meme personnage ne reconstruit rien (InsightFace ~1 Go) ;
  - aucun appelant ne lit `ss.CHECKER` en direct : le controle d'ancre ne sert a
    rien s'il se contourne. C'est par la que le bug passait — `services/batch.py`
    lisait la globale pour la production ET pour l'edition NSFW.

`make_checker` est remplace : ce test ne charge jamais InsightFace, il verifie
l'aiguillage, pas la mesure.

Lancer :  python AUTOMATION\\tests\\test_checker_par_personnage.py
"""
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
AUTOMATION = HERE.parent
sys.path.insert(0, str(AUTOMATION))
sys.path.insert(0, str(AUTOMATION / "web"))

import shared_state as ss     # noqa: E402

KO = 0


def verifie(ok, texte):
    global KO
    print(f"  {'ok   ' if ok else 'ECHEC'} {texte}")
    if not ok:
        KO += 1


class FauxChecker:
    """Ce que make_checker rendrait, reduit a ce qui distingue un personnage."""

    def __init__(self, configuration):
        self.ancre = configuration["base_gelee"]
        self.ok = configuration["qc"]["threshold_ok"]


CONSTRUCTIONS = []


def faux_make_checker(configuration):
    CONSTRUCTIONS.append(configuration["base_gelee"])
    return FauxChecker(configuration)


ss.lb.make_checker = faux_make_checker
ss.push_log = lambda *a, **k: None          # pas de journal pendant un test

LENA = {"base_gelee": "OFM_LENA_BASE_00025_.png",
        "qc": {"threshold_ok": 0.72, "threshold_watch": 0.60}}
ABYSS = {"base_gelee": "ABY_MAIN_REF.jpg",
         "qc": {"threshold_ok": 0.50, "threshold_watch": 0.35}}

print("=" * 70)
print("checker_partage : un QC d'identite PAR PERSONNAGE")
print("=" * 70)

print("\n[1] premier personnage")
c1 = ss.checker_partage(LENA)
verifie(c1.ancre == "OFM_LENA_BASE_00025_.png",
        f"le checker de lena porte sa base gelee ({c1.ancre})")
verifie(c1.ok == 0.72, f"et ses seuils (threshold_ok={c1.ok})")

print("\n[2] le meme, redemande : rien n'est reconstruit")
c2 = ss.checker_partage(LENA)
verifie(c2 is c1, "le meme objet est rendu (InsightFace n'est pas recharge)")
verifie(len(CONSTRUCTIONS) == 1,
        f"une seule construction jusqu'ici ({len(CONSTRUCTIONS)})")

print("\n[3] LE BUG : changer de personnage")
c3 = ss.checker_partage(ABYSS)
verifie(c3 is not c1, "un nouveau checker est construit")
verifie(c3.ancre == "ABY_MAIN_REF.jpg",
        f"il porte la base gelee d'abyssiaelle ({c3.ancre}) — "
        f"c'est ici que lena etait mesuree contre ABY_MAIN_REF")
verifie(c3.ok == 0.50, f"ET ses seuils, qui decident du verdict ({c3.ok})")

print("\n[4] retour au premier : reconstruit sur SON ancre, pas sur l'autre")
c4 = ss.checker_partage(LENA)
verifie(c4.ancre == "OFM_LENA_BASE_00025_.png",
        f"lena retrouve sa base gelee ({c4.ancre})")
verifie(c4.ok == 0.72, f"et ses seuils ({c4.ok})")
verifie(CONSTRUCTIONS == ["OFM_LENA_BASE_00025_.png", "ABY_MAIN_REF.jpg",
                          "OFM_LENA_BASE_00025_.png"],
        f"trois constructions, dans cet ordre : {CONSTRUCTIONS}")

print("\n[5] personne ne contourne l'accesseur")
fautifs = []
for f in sorted((AUTOMATION / "web").rglob("*.py")):
    if f.name == "shared_state.py":
        continue                    # c'est lui qui la definit
    for n, ligne in enumerate(f.read_text(encoding="utf-8").splitlines(), 1):
        if "ss.CHECKER" in ligne or "shared_state.CHECKER" in ligne:
            fautifs.append(f"{f.relative_to(AUTOMATION)}:{n}")
verifie(not fautifs,
        "aucune lecture directe de la globale CHECKER hors shared_state"
        + (f" — trouve : {', '.join(fautifs)}" if fautifs else ""))

print("\n" + "=" * 70)
print("tout est vert" if not KO else f"{KO} ECHEC(S)")
sys.exit(1 if KO else 0)
