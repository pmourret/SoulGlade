# -*- coding: utf-8 -*-
"""L'etiquette `anatomie` (P4.5.1) est un DEUXIEME axe, pas le champ `flag`.

POURQUOI CE TEST EXISTE. Le corpus etiquete que reclame ADR-0025 avant qu'une
mesure ait le droit d'ecarter une image se recolte par ce champ. Deux facons de
le casser en silence, toutes les deux verrouillees ici :

  - ECRIRE DANS `flag`. Une image peut etre convaincante comme photographie ET
    avoir un bras trop long. Or `mesures.bande` etalonne le realisme sur
    `flag == "ok"` : partager le champ fausserait l'etalonnage du realisme ET
    l'etiquetage des proportions, sans qu'aucun ecran ne le montre.
  - ACCEPTER N'IMPORTE QUELLE VALEUR. Un "KO" majuscule ou un "faux" ecrit a la
    main ferait une troisieme classe muette dans le corpus, que P4.5.2
    compterait comme une quatrieme categorie au lieu de la refuser.

Lancer :  python AUTOMATION\tests\test_etiquette_anatomie.py
"""
import shutil
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
AUTOMATION = HERE.parent
sys.path.insert(0, str(AUTOMATION))

import base as db       # noqa: E402
import mesures as mes    # noqa: E402

KO = 0


def verifie(ok, texte):
    global KO
    if not ok:
        KO += 1
    print(f"  {'OK  ' if ok else 'ECHEC'} {texte}")


racine = Path(tempfile.mkdtemp(prefix="anatomie_"))
mes.FICHIER = racine / "mesures.json"       # jamais le store reel
# ni la base reelle : `poser_flag` (etape 3) double son ecriture dans
# `PROD/soulglade.db`, et une image de test y laisserait une ligne orpheline
# que `test_coherence_base.py` compterait comme un vrai ecart.
db.FICHIER = racine / "soulglade.db"
IMG = "lifestyle_cuisine_matin_20260908_01.png"

try:
    print("\n[1] les trois valeurs sont acceptees et se remplacent")
    for valeur in mes.ANATOMIE:
        e = mes.poser_anatomie(IMG, valeur)
        verifie(e.get("anatomie") == valeur, f"« {valeur} » enregistree")
    verifie("anatomie_le" in mes.charger()[IMG], "la date du jugement est posee")

    print("\n[2] une valeur hors vocabulaire est refusee, pas silencieusement rangee")
    for mauvais in ("KO", "faux", "ia", ""):
        try:
            mes.poser_anatomie(IMG, mauvais)
            verifie(False, f"« {mauvais} » aurait du lever")
        except ValueError:
            verifie(True, f"« {mauvais} » refusee")
    verifie(mes.charger()[IMG].get("anatomie") == "na",
            "l'etiquette valide precedente est intacte apres les refus")

    print("\n[3] axe independant du jugement de realisme")
    mes.poser_flag(IMG, "ok", "lena")
    e = mes.poser_anatomie(IMG, "ko")
    verifie(e.get("flag") == "ok" and e.get("anatomie") == "ko",
            "convaincante comme photo ET proportions fausses coexistent")
    e = mes.poser_flag(IMG, "ia", "lena")
    verifie(e.get("anatomie") == "ko", "changer le realisme ne touche pas l'etiquette")

    print("\n[4] None retire l'etiquette sans emporter le reste")
    e = mes.poser_anatomie(IMG, None)
    verifie("anatomie" not in e and "anatomie_le" not in e, "etiquette retiree")
    verifie(e.get("flag") == "ia", "le jugement de realisme survit au retrait")

    print("\n[5] le tri suit le fichier : renommer emporte l'etiquette")
    mes.poser_anatomie(IMG, "ok")
    mes.renommer(IMG, "renommee.png")
    verifie(mes.charger().get("renommee.png", {}).get("anatomie") == "ok",
            "l'etiquette suit le fichier renomme par le tri")

finally:
    shutil.rmtree(racine, ignore_errors=True)

print()
print("=" * 70)
print(f"{KO} ECHEC(S)" if KO else "tout est vert")
sys.exit(1 if KO else 0)
