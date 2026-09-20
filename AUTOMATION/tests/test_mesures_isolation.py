"""Les mesures d'une image appartiennent a UN personnage.

`PROD/mesures.json` est indexe par nom de fichier NU, sans champ personnage.
Deux personnages d'un meme monde heritent du meme catalogue de scenes
(ADR-0019) : ils peuvent produire le meme nom de fichier, et n'avoir la-bas
qu'une seule entree pour deux images. La base, elle, porte la bonne cle depuis
le depart — UNIQUE(character_id, fichier).

Ce test verrouille les quatre consequences (cadrage du 20/09,
`DOCS/cadrage/2026-09-20-mesures-par-personnage.md`) :

  1. deux images homonymes affichent chacune SES mesures et SON jugement ;
  2. les bandes d'etalonnage d'un personnage ignorent les jugements de l'autre ;
  3. le corpus de reference, lui, reste commun : il est de plateforme ;
  4. le repli sur le store ne sert qu'aux images que la base ne connait a
     personne, jamais a celles d'un autre personnage.

Plus deux gardes de meme famille : effacer les mesures d'une image dont les
pixels ont change les efface AUSSI en base, et le corpus n'est jamais score
contre l'ancre du personnage qui lance la mesure en premier.

Aucun appel a ComfyUI, aucune image decodee, aucune donnee de `CHARACTERS/*`
supposee presente (CLAUDE.md, section Donnees) : la route est appelee
directement, la base et le store sont detournes vers des fichiers temporaires.

Lancer :  python AUTOMATION\\tests\\test_mesures_isolation.py
"""
import asyncio
import json
import shutil
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
AUTOMATION = HERE.parent
OFM = AUTOMATION.parent
sys.path.insert(0, str(AUTOMATION / "web"))
sys.path.insert(0, str(AUTOMATION))

import base as db                              # noqa: E402
import mesures as mes                          # noqa: E402
from api.routers import review                 # noqa: E402

A, B = "probe_mesures_a", "probe_mesures_b"
PARTAGE = "lifestyle_cafe_terrasse_20260920_01.png"   # les deux le produisent
LEGACY = "vieille_image_20260701_01.png"              # connue de personne en base
VOLEE = "image_de_b_20260902_01.png"                  # en base, mais pour B
KO = 0


def verifie(ok, texte):
    global KO
    print(f"  {'ok   ' if ok else 'ECHEC'} {texte}")
    if not ok:
        KO += 1


def poser_arbre(cid, noms):
    d = OFM / "PROD" / cid.upper() / "OK"
    d.mkdir(parents=True, exist_ok=True)
    for n in noms:
        (d / n).write_bytes(b"")
    return d


def enregistrer(cx, cid, nom, nettete, flag=None, anatomie=None):
    iid = db.enregistrer_image(cx, nom, character_id=cid, bucket="OK")
    db.enregistrer_score(cx, iid, "nettete", nettete)
    db.enregistrer_score(cx, iid, "texture_visage", 4.0)
    db.enregistrer_score(cx, iid, "bruit_fond", 1.0)
    if flag:
        db.enregistrer_jugement(cx, iid, flag)
    if anatomie:
        db.enregistrer_etiquette(cx, iid, "anatomie", anatomie)
    return iid


def galerie(cid):
    return asyncio.run(review.get_gallery(character_id=cid, bucket="OK"))


def item(g, nom):
    return next((i for i in g["items"] if i["name"] == nom), None)


def main():
    tmp = Path(tempfile.mkdtemp(prefix="mesures_isolation_"))
    vrai_store, vraie_base = mes.FICHIER, db.FICHIER
    mes.FICHIER = tmp / "mesures.json"
    db.FICHIER = tmp / "soulglade.db"
    noms_a = [f"a_{i:02d}.png" for i in range(8)]
    noms_b = [f"b_{i:02d}.png" for i in range(8)]
    poser_arbre(A, noms_a + [PARTAGE, LEGACY, VOLEE])
    poser_arbre(B, noms_b + [PARTAGE])
    try:
        with db.ouvrir() as cx:
            for n in noms_a:
                enregistrer(cx, A, n, 100.0, flag="ok")
            for n in noms_b:
                enregistrer(cx, B, n, 900.0, flag="ok")
            enregistrer(cx, A, PARTAGE, 111.0, flag="ok", anatomie="ok")
            enregistrer(cx, B, PARTAGE, 999.0, flag="ia", anatomie="ko")
            enregistrer(cx, B, VOLEE, 900.0, flag="ia")
            cx.commit()
        # Le store dit autre chose que la base, expres : on doit voir la base.
        mes.FICHIER.write_text(json.dumps({
            PARTAGE: {"nettete": 42.0, "flag": "ia"},
            VOLEE: {"nettete": 42.0, "flag": "ia"},
            LEGACY: {"nettete": 55.0, "texture_visage": 4.0, "bruit_fond": 1.0},
        }), encoding="utf-8")

        # ------------------------------------- [1] deux homonymes, deux verites
        print("[1] le meme nom de fichier chez deux personnages")
        ga, gb = galerie(A), galerie(B)
        ia, ib = item(ga, PARTAGE), item(gb, PARTAGE)
        verifie(ia and ia["nettete"] == 111.0 and ib and ib["nettete"] == 999.0,
                f"chacun voit SA nettete ({ia and ia['nettete']} / "
                f"{ib and ib['nettete']})")
        verifie(ia and ia["flag"] == "ok" and ib and ib["flag"] == "ia",
                "chacun voit SON jugement de realisme")
        verifie(ia and ia["anatomie"] == "ok" and ib and ib["anatomie"] == "ko",
                "et SON etiquette d'anatomie, que la base rend aussi")
        verifie(ia and ia["nettete"] != 42.0,
                "le store, qui dit 42.0 pour ce nom, n'est pas consulte")

        # ------------------------------------- [2] les bandes d'etalonnage
        print("\n[2] sans corpus, chaque Revue se calibre sur SES jugements")
        ba, bb = ga["bandes"]["nettete"], gb["bandes"]["nettete"]
        verifie(ba and ba["median"] == 100.0, f"la bande de A vaut 100.0 : {ba}")
        verifie(bb and bb["median"] == 900.0, f"la bande de B vaut 900.0 : {bb}")
        verifie(ga["juges"] == 9 and gb["juges"] == 10,
                f"chacun compte SES jugements ({ga['juges']} / {gb['juges']})")

        # ------------------------------------- [3] le corpus reste commun
        print("\n[3] le corpus de reference est de plateforme, pas de personnage")
        corpus = {f"ref_{i}.png": {"nettete": 500.0, "texture_visage": 4.5,
                                   "bruit_fond": 1.2, "role": "reference"}
                  for i in range(3)}
        garde = json.loads(mes.FICHIER.read_text(encoding="utf-8"))
        mes.FICHIER.write_text(json.dumps({**garde, **corpus}), encoding="utf-8")
        ga, gb = galerie(A), galerie(B)
        verifie(ga["bandes"]["nettete"]["source"] == "reference"
                and ga["bandes"]["nettete"] == gb["bandes"]["nettete"],
                "le corpus prime, et donne la MEME bande aux deux")
        verifie(ga["references"]["mesurees"] == 3,
                f"les 3 references sont comptees ({ga['references']['mesurees']})")

        # ------------------------------------- [4] le repli, et sa limite
        print("\n[4] le store ne sert de repli que pour ce que la base ignore")
        ia_legacy, ia_volee = item(ga, LEGACY), item(ga, VOLEE)
        verifie(ia_legacy and ia_legacy["nettete"] == 55.0,
                "une image anterieure a la base est lue dans le store")
        verifie(ia_volee and ia_volee["nettete"] is None,
                f"une image que la base connait pour B n'est jamais repliee "
                f"chez A : {ia_volee and ia_volee['nettete']}")

        # ------------------------------------- [5] demesurer efface en base
        print("\n[5] ecraser les pixels efface les mesures des DEUX cotes")
        mes.demesurer(PARTAGE, A)
        ga, gb = galerie(A), galerie(B)
        verifie(item(ga, PARTAGE)["nettete"] is None,
                "A n'a plus de nettete sur l'image ecrasee")
        verifie(item(ga, PARTAGE)["flag"] == "ok",
                "son jugement humain, lui, est conserve")
        verifie(item(gb, PARTAGE)["nettete"] == 999.0,
                "et l'homonyme de B n'a pas ete touche")
        verifie(ga["sans_mesure"] >= 1,
                f"elle repasse dans le compte a mesurer ({ga['sans_mesure']})")

        # ------------------------------------- [6] corpus sans identite
        print("\n[6] le corpus n'est jamais score contre l'ancre d'un personnage")
        appels = []
        vrai_mesurer, vrais_fichiers = mes.mesurer, mes.fichiers_reference
        mes.mesurer = lambda path, **kw: appels.append(kw) or {"nettete": 1}
        mes.fichiers_reference = lambda: [tmp / "corpus.png"]
        try:
            mes.mesurer_references(checker=None)
        finally:
            mes.mesurer, mes.fichiers_reference = vrai_mesurer, vrais_fichiers
        verifie(len(appels) == 1 and "checker" not in appels[0],
                f"mesurer() est appele sans checker : {appels}")
        verifie(appels and "bbox" in appels[0],
                "et avec la bbox, dont qc_realisme a besoin pour la texture")
    finally:
        mes.FICHIER, db.FICHIER = vrai_store, vraie_base
        for cid in (A, B):
            shutil.rmtree(OFM / "PROD" / cid.upper(), ignore_errors=True)
        shutil.rmtree(tmp, ignore_errors=True)

    print("\n" + "=" * 70)
    print("tout est vert" if KO == 0 else f"{KO} ECHEC(S)")
    print("=" * 70)
    return 1 if KO else 0


if __name__ == "__main__":
    sys.exit(main())
