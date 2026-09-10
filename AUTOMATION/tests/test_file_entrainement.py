# -*- coding: utf-8 -*-
"""La file d'entrainement : identite ET absence de defaut objectif.

POURQUOI CE TEST EXISTE. Le portillon d'identite ne filtre pas les mains, il
les tire a pile ou face -- mesure le 2026-09-10 en croisant l'annotation
manuelle des rejets de Lena avec le gabarit : 6 mains cassees admises sur 12,
parce qu'une main ne deforme pas un visage. Entrainer un LoRA la-dessus lui
apprend des mains cassees, et une main a six doigts est un defaut OBJECTIF
(PROJET.md, amendement du 07/09), pas un choix creatif.

Ce test verrouille, dans l'ordre de ce qui casserait le plus silencieusement :

  1. un `ko` sur un axe objectif ecarte, et la raison est rendue ;
  2. le GOUT n'ecarte JAMAIS. `flag == 'ia'` reste dans la file : c'est un
     jugement de realisme que l'utilisateur final fait lui-meme, et il est sans
     effet mesure sur l'identite (0.1 sigma). C'est la ligne la plus facile a
     franchir par inadvertance, et elle trahirait l'agnosticisme de PROJET.md ;
  3. `na` et non-etiquetee entrent, la non-etiquetee etant comptee A PART : son
     absence de defaut est supposee, pas connue ;
  4. la diversite se mesure en categories EFFECTIVES : un lot de quasi-doublons
     s'effondre vers 1 la ou un compte de valeurs distinctes mentirait ;
  5. un seuil absent ne produit jamais un « pret », et la proposition NOMME le
     critere qui bloque au lieu de refuser sec ;
  6. deux personnages ne se melangent jamais (CLAUDE.md, §Methode).

Aucun GPU, aucune image : des vecteurs a la main, une base temporaire.

Lancer :  python AUTOMATION\\tests\\test_file_entrainement.py
"""
import shutil
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
AUTOMATION = HERE.parent
sys.path.insert(0, str(AUTOMATION))

import numpy as np        # noqa: E402
import base as db         # noqa: E402
import entrainement as en  # noqa: E402

KO = 0


def verifie(ok, texte):
    global KO
    print(f"  {'ok   ' if ok else 'ECHEC'} {texte}")
    if not ok:
        KO += 1


DIM = 8
U = np.zeros(DIM, dtype=np.float32); U[0] = 1.0


def vec(alpha, graine=0):
    rng = np.random.default_rng(graine)
    w = rng.normal(size=DIM).astype(np.float32); w[0] = 0
    w /= np.linalg.norm(w)
    v = alpha * U + np.sqrt(max(0.0, 1 - alpha ** 2)) * w
    return (v / np.linalg.norm(v)).astype(np.float32)


racine = Path(tempfile.mkdtemp(prefix="file_entr_"))
db.FICHIER = racine / "PROD" / "soulglade.db"

# 8 images de Lena, toutes assez proches de l'ancre pour passer le portillon
# d'identite. Ce sont leurs ETIQUETTES et leurs metadonnees qui different.
IMAGES = [
    # fichier            scene        ton     flag  mains  anatomie
    ("a.png", "cuisine", "doux",     "ok",  "ok",  "ok"),
    ("b.png", "cafe",    "joueur",   "ia",  "ok",  "ok"),   # gout KO : reste
    ("c.png", "chambre", "intime",   "ok",  "ko",  "ok"),   # main cassee : sort
    ("d.png", "sport",   "doux",     "ok",  "na",  "ok"),
    ("e.png", "ruelle",  "elegant",  "ia",  "na",  "ko"),   # anatomie : sort
    ("f.png", "cuisine", "doux",     None,  None,  None),   # jamais etiquetee
    ("g.png", "cafe",    "intime",   "ok",  "ok",  "na"),
    ("h.png", "rando",   "joueur",   "ok",  "ko",  "ko"),   # deux fautes : sort
]

print("=" * 70)
print("File d'entrainement : le defaut objectif ecarte, le gout jamais")
print("=" * 70)

try:
    with db.ouvrir() as cx:
        for i, (nom, scene, ton, flag, mains, anat) in enumerate(IMAGES):
            iid = db.enregistrer_image(cx, nom, character_id="lena",
                                       scene=scene, ton=ton, format="4:5",
                                       intention="lifestyle")
            db.enregistrer_embedding(cx, iid, vec(0.90 + 0.005 * i, graine=i))
            if flag:
                db.enregistrer_jugement(cx, iid, flag)
            if mains:
                db.enregistrer_etiquette(cx, iid, "mains_juge", mains)
            if anat:
                db.enregistrer_etiquette(cx, iid, "anatomie", anat)
        # un autre personnage, avec une main cassee lui aussi
        autre = db.enregistrer_image(cx, "autre.png", character_id="abyssiaelle",
                                     scene="taverne", ton="sombre")
        db.enregistrer_embedding(cx, autre, vec(0.95, graine=99))
        db.enregistrer_etiquette(cx, autre, "mains_juge", "ko")
        db.construire_jeu(cx, "lena", U, 0.5, libelle="test")
        cx.commit()

        print("\n[1] le defaut objectif ecarte, avec sa raison")
        d = en.candidats(cx, "lena")
        noms = {r["fichier"] for r in d["file"]}
        sortis = {e["fichier"]: e["raison"] for e in d["ecartes"]}
        verifie(noms == {"a.png", "b.png", "d.png", "f.png", "g.png"},
                f"file = {sorted(noms)}")
        verifie(sortis.get("c.png") == ["mains_juge"], "c.png sort pour mains_juge")
        verifie(sortis.get("e.png") == ["anatomie"], "e.png sort pour anatomie")
        verifie(sorted(sortis.get("h.png") or []) == ["anatomie", "mains_juge"],
                "h.png sort pour LES DEUX, et les deux sont nommes")

        print("\n[2] le GOUT n'ecarte jamais")
        verifie("b.png" in noms,
                "b.png porte flag='ia' et reste dans la file — le realisme est "
                "un jugement de l'utilisateur, pas un defaut objectif")

        print("\n[3] la non-etiquetee entre, et elle est comptee a part")
        verifie("f.png" in noms, "f.png entre")
        verifie({r["fichier"] for r in d["sans_etiquette"]} == {"f.png"},
                "et elle est la seule signalee comme non verifiee")
        verifie("d.png" in noms and "g.png" in noms,
                "'na' n'est pas un defaut : d.png et g.png entrent")

        print("\n[4] la diversite se compte en categories EFFECTIVES")
        div = en.diversite(d["file"])
        # la file retenue est cuisine x2, cafe x2, sport x1
        verifie(div["scene"]["distinctes"] == 3,
                f"3 scenes distinctes dans la file ({div['scene']['distinctes']})")
        verifie(2.5 < div["scene"]["effectives"] < 3.0,
                f"{div['scene']['effectives']:.2f} effectives — SOUS le compte "
                f"distinct, parce que cuisine et cafe pesent double et que sport "
                f"ne pese qu'une image")
        doublons = [{"scene": "cuisine", "intention": None, "ton": None,
                     "format": None}] * 10
        verifie(abs(en.diversite(doublons)["scene"]["effectives"] - 1.0) < 1e-9,
                "10 quasi-doublons -> 1.0 categorie effective, la ou un compte "
                "distinct aurait dit 1 aussi mais pour 10 scenes differentes "
                "aurait dit 10")
        varie = [{"scene": f"s{i}", "intention": None, "ton": None,
                  "format": None} for i in range(10)]
        verifie(abs(en.diversite(varie)["scene"]["effectives"] - 10.0) < 1e-6,
                "10 scenes equilibrees -> 10.0 effectives")

        print("\n[5] un seuil absent ne conclut jamais")
        r = en.proposition(cx, "lena", {})
        verifie(r["pret"] is False, "pas de proposition sans seuil")
        verifie("seuil" in r["blocage"] and "entrainement" in r["blocage"],
                f"et le blocage dit quoi faire : « {r['blocage'][:64]}… »")
        verifie(all(c["verdict"] == "sans seuil" for c in r["criteres"]),
                "chaque critere est rendu « sans seuil », jamais « manque »")

        print("\n[6] avec des seuils, le verdict est motive")
        r2 = en.proposition(cx, "lena", {"entrainement": {"n_min": 3,
                                                          "diversite_min": 2.0}})
        verifie(r2["pret"] is True, "5 images et 2.9 scenes effectives : pret")
        r3 = en.proposition(cx, "lena", {"entrainement": {"n_min": 40,
                                                          "diversite_min": 2.0}})
        verifie(r3["pret"] is False and "40" in r3["blocage"],
                f"seuil trop haut : « {r3['blocage']} »")
        verifie("image(s) dans la file" in r3["blocage"],
                "le blocage NOMME le critere, il ne dit pas « refuse »")

        print("\n[7] deux personnages ne se melangent jamais")
        verifie("autre.png" not in noms
                and "autre.png" not in {e["fichier"] for e in d["ecartes"]},
                "l'image d'abyssiaelle n'apparait ni dans la file ni dans les "
                "ecartees de lena")
        verifie(en.candidats(cx, "abyssiaelle")["jeu"] is None,
                "et abyssiaelle n'a pas de jeu actif, donc pas de file")
finally:
    shutil.rmtree(racine, ignore_errors=True)

print("\n" + "=" * 70)
print("tout est vert" if not KO else f"{KO} ECHEC(S)")
sys.exit(1 if KO else 0)
