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

Puis l'EXPORT, qui a ses propres facons de mentir :

  7. la file et l'exportable ne sont pas le meme nombre. Un embedding survit en
     base a la disparition du PNG -- chez Lena au 10/09, 27 dans la file et 24
     sur le disque. Copier en silence produirait un jeu plus petit que ce que
     le manifeste annonce ;
  8. le manifeste garde ce qui n'est PAS parti et pourquoi, l'etat du gabarit,
     le seuil qui a filtre, et la provenance de chaque image -- sans quoi
     comparer deux LoRA au banc ne voudrait rien dire. Et l'ANCRE est
     reinjectee (regle 7 du mecanisme) ;
  9. un export n'ecrase jamais le precedent : un entrainement passe est une
     piece d'historique.

Aucun GPU, aucune image : des vecteurs a la main, une base temporaire.

Lancer :  python AUTOMATION\\tests\\test_file_entrainement.py
"""
import json
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

        print("\n[7] l'export ne copie que ce qui existe sur le disque")
        # LA FILE ET L'EXPORTABLE NE SONT PAS LE MEME NOMBRE : un embedding
        # survit en base a la disparition du PNG. Chez Lena au 10/09, 27 dans
        # la file et 24 sur le disque. Le taire produirait un jeu
        # d'entrainement plus petit que le manifeste ne l'annonce.
        import env_config
        from datetime import datetime as _dt
        en.OFM = racine
        en.RACINE_EXPORT = racine / "PROD" / "_ENTRAINEMENT"
        prod = racine / "PROD" / "LENA" / "OK"
        prod.mkdir(parents=True, exist_ok=True)
        for nom in ("a.png", "b.png", "d.png", "c.png"):   # c.png est ECARTEE
            (prod / nom).write_bytes(b"\x89PNG\r\n\x1a\n")
        # f.png et g.png sont dans la file mais n'ont AUCUN fichier
        entree = racine / "input"
        entree.mkdir(parents=True, exist_ok=True)
        (entree / "LENA_BASE.png").write_bytes(b"\x89PNG\r\n\x1a\n")
        env_config.comfyui_root = lambda: racine

        # `trigger_word` fourni EXPRES : sans lui, `trigger_du_personnage` en
        # creerait un et l'ecrirait dans le vrai CHARACTERS/lena/config.json.
        # Un test n'ecrit jamais hors de son dossier temporaire.
        cfg = {"base_gelee": "LENA_BASE.png",
               "identity": {"lora": {"trigger_word": "essaitrig"}},
               "qc": {"threshold_gabarit": 0.9},
               "entrainement": {"n_min": 3, "diversite_min": 2.0}}
        # avec_vision=False : ce test ne doit jamais toucher ComfyUI, et les
        # « images » sont des octets PNG factices que rien ne saurait lire.
        # La famille de modele vient du PACK (universe.json /
        # model_family). Ce test ne suppose pas CHARACTERS/ present
        # (CLAUDE.md, §Donnees) : il la fixe, et verifie la recette,
        # pas la resolution du pack.
        en._famille_du_personnage = lambda cid: "flux"
        res = en.exporter(cx, "lena", cfg, quand=_dt(2026, 9, 10, 8, 0, 0),
                          avec_vision=False)
        dossier = res["dossier"]
        copies = {p.name for p in res["dossier_images"].glob("*.png")}
        verifie(copies == {"a.png", "b.png", "d.png", "LENA_BASE.png"},
                f"copie : {sorted(copies)}")
        verifie("c.png" not in copies,
                "l'image ecartee pour defaut objectif n'est PAS copiee")
        verifie(sorted(res["exportes"]) == ["a.png", "b.png", "d.png"],
                f"{len(res['exportes'])} image(s) exportees sur "
                f"{len(res['file'])} dans la file")

        print("\n[8] le manifeste dit ce qui n'est pas parti, et pourquoi")
        m = json.loads((dossier / "manifeste.json").read_text(encoding="utf-8"))
        verifie(sorted(m["non_exportees"]["sans_fichier"]) == ["f.png", "g.png"],
                "les images sans fichier sont nommees")
        raisons = {e["fichier"]: e["raison"] for e in m["non_exportees"]["defaut_objectif"]}
        verifie(raisons.get("c.png") == ["mains_juge"],
                "et chaque ecartee garde la raison de son exclusion")
        verifie(m["ancre_reinjectee"] == "LENA_BASE.png",
                "l'ANCRE est reinjectee — regle 7 : jamais seulement au premier "
                "tour, sinon la boucle auto-consommatrice derive")
        verifie(m["jeu_de_reference"]["id"] == d["jeu"]["id"]
                and m["seuils"]["portillon_identite"] == 0.9,
                "le manifeste garde l'etat du gabarit et le seuil qui a filtre")
        verifie(all("lora_identite" in x for x in m["images"]),
                "et la provenance de chaque image : une DERIVED reste "
                "identifiable des annees plus tard")

        print("\n[8b] chaque image emporte sa legende, et sa source")
        txts = {p.stem for p in res["dossier_images"].glob("*.txt")}
        pngs = {p.stem for p in res["dossier_images"].glob("*.png")}
        verifie(txts == pngs,
                f"un .txt par image, convention kohya ({len(txts)}/{len(pngs)})")
        verifie(all(x.get("source_legende") for x in m["images"]),
                "le manifeste dit d'ou vient chaque legende")
        verifie(all(x["legende"].startswith(m["declencheur"]) for x in m["images"]),
                f"toutes commencent par le declencheur ({m['declencheur']}) — "
                f"la constance du jeton est ce que la pratique demande le plus")
        verifie(m["legende_ancre"]["source"] == "ancre",
                "et l'ancre reinjectee a sa legende neutre a elle")
        import legende as lg
        verifie(all(lg.terme_de_visage(x["legende"]) is None for x in m["images"]),
                "aucune legende ne decrit un trait de visage")

        print("\n[8c] le dossier exporte est EXECUTABLE, pas seulement complet")
        # La famille vient du PACK (universe.json), pas d'ici : un test ne
        # suppose jamais CHARACTERS/ present (CLAUDE.md, §Donnees).
        verifie(res["dossier_images"].name == f"{res['repetitions']}_essaitrig"
                and res["dossier_images"].parent.name == "dataset",
                f"convention kohya <repetitions>_<declencheur> : "
                f"dataset/{res['dossier_images'].name}")
        toml = (dossier / "dataset.toml").read_text(encoding="utf-8")
        verifie(f'image_dir = "dataset/{res["dossier_images"].name}"' in toml
                and f"num_repeats = {res['repetitions']}" in toml,
                "dataset.toml pointe le dossier reel, avec le meme nombre de "
                "repetitions que son nom")
        verifie("keep_tokens = 1" in toml,
                "keep_tokens = 1 : le declencheur reste en tete de legende")
        octets = (dossier / "entrainer.sh").read_bytes()
        verifie(b"\r\n" not in octets,
                "entrainer.sh est en LF : un .sh en CRLF ne demarre pas sous "
                "Linux, et la machine d'entrainement en est une")
        sh = octets.decode("utf-8")
        cmd = sh[sh.index("accelerate launch"):].strip().splitlines()
        # LE PIEGE : une seule ligne sans son antislash et la commande s'arrete
        # la, sans dataset, sans sortie -- et accelerate demarre quand meme.
        verifie(all(l.rstrip().endswith("\\") for l in cmd[:-1])
                and not cmd[-1].rstrip().endswith("\\"),
                f"les {len(cmd)} lignes de la commande sont enchainees, la "
                f"derniere seule sans antislash")
        verifie("--dataset_config dataset.toml" in sh
                and f'--output_name "{m["declencheur"]}_v1"' in sh,
                "la commande lit le TOML ecrit a cote et nomme sa sortie")
        verifie(m["entrainement"]["repetitions"] == res["repetitions"]
                and m["entrainement"]["repetitions_defaut"] is True
                and m["entrainement"]["script"] == res["script_kohya"],
                "le manifeste garde la recette : un dossier se perd, le releve "
                "doit dire ce qui a ete prepare")

        print("\n[8d] les repetitions sont un DEFAUT, jamais un arbitrage")
        res3 = en.exporter(cx, "lena", cfg, quand=_dt(2026, 9, 10, 10, 0, 0),
                           avec_vision=False, repetitions=3)
        m3 = json.loads((res3["dossier"] / "manifeste.json").read_text(encoding="utf-8"))
        verifie(res3["repetitions"] == 3
                and res3["dossier_images"].name == "3_essaitrig"
                and m3["entrainement"]["repetitions_defaut"] is False,
                "--repetitions remplace le defaut, jusque dans le nom du "
                "dossier et le releve du manifeste")

        print("\n[9] un export n'ecrase jamais le precedent")
        res2 = en.exporter(cx, "lena", cfg, quand=_dt(2026, 9, 10, 9, 0, 0),
                           avec_vision=False)
        verifie(res2["dossier"] != dossier and res2["dossier"].is_dir(),
                "deux exports = deux dossiers dates")
        verifie(dossier.is_dir(), "et le premier est intact")
        rate = ""
        try:
            en.exporter(cx, "lena", cfg, quand=_dt(2026, 9, 10, 9, 0, 0))
        except FileExistsError as e:
            rate = str(e)
        verifie(bool(rate),
                "meme horodatage : on refuse plutot que d'ecraser un historique")

        print("\n[10] deux personnages ne se melangent jamais")
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
