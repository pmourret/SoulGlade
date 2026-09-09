"""Calcule les embeddings manquants, puis construit le jeu de reference d'identite.

    python_embeded\\python.exe ComfyUI\\output\\OFM\\AUTOMATION\\tests\\backfill_embeddings.py

Une passe InsightFace coute ~190 ms par image. Une fois l'embedding en base, tout
le reste se refait sans jamais relire un PNG : changer de seuil ou de reference
devient une requete.

Le jeu de reference obeit aux garde-fous deja poses (voir la docstring de
`base.construire_jeu`, qui les applique) — ce script ne fait que l'appeler et
montrer le bilan.
"""
import sys
from datetime import datetime
from pathlib import Path

HERE = Path(__file__).resolve().parent
AUTOMATION = HERE.parent
sys.path.insert(0, str(AUTOMATION))

import base          # noqa: E402
import env_config    # noqa: E402
import mesures       # noqa: E402
import runner as lb      # noqa: E402

OFM = AUTOMATION.parent
COMFY = env_config.comfyui_root()

# Le personnage mesure. En argument pour ne plus etre un litteral repete :
#   python AUTOMATION/tests/backfill_embeddings.py [personnage]
PERSONNAGE = (sys.argv[1] if len(sys.argv) > 1 else 'lena').lower()


def fichiers_sur_disque():
    """nom -> chemin, pour tout ce qui est range quelque part."""
    out = {}
    # un arbre par personnage (le NSFW y est un sous-arbre) + le corpus de
    # reference, qui lui reste commun a toute la plateforme
    racines = [OFM / "PROD" / c.upper() for c in lb.list_characters()]
    for racine in racines + [OFM / "INPUTS" / "REALISME"]:
        if not racine.exists():
            continue
        for f in racine.rglob("*.png"):
            if "_BATCH" not in f.parts:
                out.setdefault(f.name, f)
    return out


def main():
    cfg = lb.load_config(PERSONNAGE)
    checker = lb.make_checker(cfg)
    disque = fichiers_sur_disque()

    with base.ouvrir() as cx:
        # LE FILTRE PAR PERSONNAGE N'EST PAS DECORATIF. Ce script mesure contre
        # l'ancre de PERSONNAGE (checker construit sur SON config.json) et
        # reenregistre sous SON character_id. Sans le filtre, une image d'un
        # AUTRE personnage sans embedding partait dans la meme passe : scoree
        # contre la mauvaise base gelee, et creee en DOUBLE puisque la cle
        # d'enregistrer_image est (character_id, fichier). C'est le meme melange
        # entre deux personnages que le bug de checker_partage (09/09) -- aucune
        # image d'Abyssiaelle n'en manquait ce jour-la, mais ca tenait au hasard.
        manquants = [r["fichier"] for r in cx.execute(
            "SELECT i.fichier FROM image i LEFT JOIN embedding e ON e.image_id = i.id "
            "WHERE e.image_id IS NULL AND i.character_id = ?", (PERSONNAGE,))]
        etrangers = cx.execute(
            "SELECT COUNT(*) FROM image i LEFT JOIN embedding e ON e.image_id = i.id "
            "WHERE e.image_id IS NULL AND i.character_id != ?", (PERSONNAGE,)).fetchone()[0]
        a_faire = [(n, disque[n]) for n in manquants if n in disque]
        absents = len(manquants) - len(a_faire)
        print(f"  {len(manquants)} image(s) de {PERSONNAGE} sans embedding, dont "
              f"{len(a_faire)} presentes sur le disque ({absents} disparues)")
        if etrangers:
            print(f"  {etrangers} image(s) d'un AUTRE personnage sans embedding : "
                  f"laissees intactes, ce script ne mesure que {PERSONNAGE}")

        faits = sans_visage = 0
        for nom, chemin in a_faire:
            m = checker.mesure(chemin)
            if m["embedding"] is None:
                sans_visage += 1
                continue
            iid = base.enregistrer_image(cx, nom, character_id=PERSONNAGE)
            base.enregistrer_embedding(cx, iid, m["embedding"])
            base.enregistrer_score(cx, iid, "identite", m["score"])
            # LA DOUBLE ECRITURE, dans ce sens aussi. Ce que ce script produit est
            # une RE-MESURE du fichier tel qu'il est sur le disque -- apres
            # expression et apres grain -- c'est-a-dire exactement ce que
            # mesures.json est cense porter (cf. test_coherence_base.py : le score
            # de la base doit venir du journal OU de mesures.json). N'ecrire qu'en
            # base creait un troisieme chiffre que rien n'expliquait, et l'ecran,
            # qui lit mesures.json, continuait d'afficher l'ancien.
            mesures.maj(nom, identite=m["score"],
                        mesure_le=datetime.now().isoformat(timespec="seconds"))
            faits += 1
        cx.commit()
        print(f"  {faits} embedding(s) calcule(s), {sans_visage} sans visage detecte")

        # la base gelee elle-meme : c'est l'ancre, elle merite d'etre en base
        gelee = COMFY / "input" / cfg["base_gelee"]
        if gelee.exists():
            m = checker.mesure(gelee)
            if m["embedding"] is not None:
                iid = base.enregistrer_image(cx, gelee.name, character_id=PERSONNAGE,
                                             role="base_gelee", espace="reference")
                base.enregistrer_embedding(cx, iid, m["embedding"])
                cx.commit()
                print(f"  base gelee enregistree : {gelee.name}")

        seuil = cfg["qc"].get("threshold_high", 0.74)
        bilan = base.construire_jeu(cx, PERSONNAGE, checker.base, seuil,
                                    libelle=f"auto — backfill {PERSONNAGE}")
        cx.commit()
        print(f"\n  === jeu de reference d'identite ===")
        print(f"    portillon d'entree      : identite vs base gelee >= {bilan['seuil']}")
        print(f"    membres                 : {bilan['membres']}")
        if bilan["membres"]:
            print(f"    membres vs base gelee   : {bilan['sim_membres']:.4f} en moyenne")
            print(f"    centroide vs base gelee : {bilan['sante_abs']:.4f}")
            print(f"    sante (rapport)         : {bilan['sante']:.4f}"
                  f"   seuil {base.SANTE_MINI}")
            print(f"      sous 1 = les membres derivent dans une direction COMMUNE")
            print(f"    cohesion interne        : {bilan['cohesion']:.4f}"
                  f"   (a quel point la production se ressemble)")
        print(f"    actif                   : "
              f"{'oui' if bilan['actif'] else 'NON — derive commune, jeu gele'}")

        if bilan["membres"]:
            c = base.centroide(cx, bilan["id"])
            n = base.rescorer(cx, PERSONNAGE, c)
            cx.commit()
            print(f"\n  {n} image(s) re-scorees contre le centroide, sans relire un PNG")
            q = ("SELECT i.fichier AS f, "
                 "  MAX(CASE WHEN s.genre='identite' THEN s.valeur END) AS base_, "
                 "  MAX(CASE WHEN s.genre='identite_centroide' THEN s.valeur END) AS cen "
                 "FROM image i JOIN score s ON s.image_id = i.id "
                 "WHERE i.espace='lena' AND i.role IS NULL AND i.character_id = ? "
                 "GROUP BY i.id "
                 "HAVING base_ IS NOT NULL AND cen IS NOT NULL ORDER BY base_ LIMIT 8")
            print(f"\n    {'fichier':44}{'vs base':>9}{'vs centroide':>14}{'ecart':>8}")
            for r in cx.execute(q, (PERSONNAGE,)):
                print(f"    {r['f'][:42]:44}{r['base_']:>9.3f}{r['cen']:>14.3f}"
                      f"{r['cen'] - r['base_']:>+8.3f}")

        print(f"\n  contenu de la base : {base.resume(cx)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
