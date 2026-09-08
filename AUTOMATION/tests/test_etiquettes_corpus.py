# -*- coding: utf-8 -*-
"""Les etiquettes de corpus (P4.5.1) sont des axes SEPARES, pas le champ `flag`.

POURQUOI CE TEST EXISTE. Le corpus etiquete que reclame ADR-0025 avant qu'une
mesure ait le droit d'ecarter une image se recolte par ces champs — `anatomie`
(proportions) et `mains_juge` (mains). Trois facons de le casser en silence,
toutes verrouillees ici :

  - ECRIRE DANS `flag`. Une image peut etre convaincante comme photographie ET
    avoir un bras trop long ET des mains propres. Or `mesures.bande` etalonne le
    realisme sur `flag == "ok"` : partager le champ fausserait l'etalonnage du
    realisme ET l'etiquetage, sans qu'aucun ecran ne le montre.
  - ECRIRE L'ETIQUETTE MAINS DANS `mains`. Ce nom porte deja le taux de
    detection DWPose, un float mesure automatiquement et affiche comme un score
    dans la Revue. Un jugement humain a cette place passerait pour une mesure.
  - ACCEPTER N'IMPORTE QUELLE VALEUR. Un "KO" majuscule ou un "faux" ecrit a la
    main ferait une classe muette de plus dans le corpus, que P4.5.2 compterait
    comme une categorie au lieu de la refuser.

Lancer :  python AUTOMATION\tests\test_etiquettes_corpus.py
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


racine = Path(tempfile.mkdtemp(prefix="etiquettes_"))
mes.FICHIER = racine / "mesures.json"       # jamais le store reel
# ni la base reelle : `poser_flag` (etape 3) double son ecriture dans
# `PROD/soulglade.db`, et une image de test y laisserait une ligne orpheline que
# `test_coherence_base.py` compterait comme un vrai ecart.
db.FICHIER = racine / "soulglade.db"
IMG = "lifestyle_cuisine_matin_20260908_01.png"

try:
    print("\n[1] chaque axe accepte ses trois valeurs, qui se remplacent")
    for axe, (champ, vocabulaire) in mes.ETIQUETTES.items():
        for valeur in vocabulaire:
            e = mes.poser_etiquette(IMG, axe, valeur)
            verifie(e.get(champ) == valeur, f"{axe} = « {valeur} » enregistree")
        verifie(f"{champ}_le" in mes.charger()[IMG],
                f"{axe} : la date du jugement est posee")

    print("\n[2] hors vocabulaire ou hors axe : refus, pas rangement silencieux")
    for mauvais in ("KO", "faux", "ia", ""):
        try:
            mes.poser_etiquette(IMG, "anatomie", mauvais)
            verifie(False, f"« {mauvais} » aurait du lever")
        except ValueError:
            verifie(True, f"« {mauvais} » refusee")
    try:
        mes.poser_etiquette(IMG, "realisme", "ok")
        verifie(False, "l'axe realisme aurait du lever (il passe par poser_flag)")
    except ValueError:
        verifie(True, "un axe inconnu est refuse")
    verifie(mes.charger()[IMG].get("anatomie") == "na",
            "l'etiquette valide precedente est intacte apres les refus")

    print("\n[3] les axes sont independants entre eux et du realisme")
    verifie("mains" not in mes.charger()[IMG],
            "l'etiquette mains n'ecrit JAMAIS dans `mains` (le score DWPose)")
    mes.poser_flag(IMG, "ok", "lena")
    mes.poser_etiquette(IMG, "anatomie", "ko")
    e = mes.poser_etiquette(IMG, "mains", "na")
    verifie(e.get("flag") == "ok" and e.get("anatomie") == "ko"
            and e.get("mains_juge") == "na",
            "convaincante, proportions fausses et mains non jugeables coexistent")
    e = mes.poser_flag(IMG, "ia", "lena")
    verifie(e.get("anatomie") == "ko" and e.get("mains_juge") == "na",
            "changer le realisme ne touche aucune etiquette")

    print("\n[4] None retire une etiquette sans emporter les autres")
    e = mes.poser_etiquette(IMG, "anatomie", None)
    verifie("anatomie" not in e and "anatomie_le" not in e, "etiquette retiree")
    verifie(e.get("mains_juge") == "na", "l'autre axe survit au retrait")
    verifie(e.get("flag") == "ia", "le jugement de realisme aussi")

    print("\n[5] le tri suit le fichier : renommer emporte les etiquettes")
    mes.poser_etiquette(IMG, "anatomie", "ok")
    mes.renommer(IMG, "renommee.png")
    apres = mes.charger().get("renommee.png", {})
    verifie(apres.get("anatomie") == "ok" and apres.get("mains_juge") == "na",
            "les deux etiquettes suivent le fichier renomme par le tri")

finally:
    shutil.rmtree(racine, ignore_errors=True)

print()
print("=" * 70)
print(f"{KO} ECHEC(S)" if KO else "tout est vert")
sys.exit(1 if KO else 0)
