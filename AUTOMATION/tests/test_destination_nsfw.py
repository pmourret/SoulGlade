"""La destination d'une image NSFW : export dedie, identite, mesures.

Arbitrage 2 du cadrage DOCS/cadrage/2026-09-21-flux-nsfw.md, en deux moities.

D'ABORD LA SORTIE : la branche NSFW a une sortie, et ce n'est jamais celle de
Meta.

Jusqu'au 21/09 `services/journal.export_image` refusait en dur tout fichier
d'espace NSFW : la branche produisait, mesurait, validait, et ne debouchait
sur rien. Elle exporte desormais dans un arbre a elle.

DEUX ARBRES FRERES, PAS UN SOUS-DOSSIER. `PROD/EXPORT/` est l'arbre qu'on
synchronise vers une plateforme de publication, et `PROJET.md` declare le
contenu adulte incompatible avec Meta. Range sous le meme personnage, la
branche partirait avec au premier glisser-deposer : c'est ce que ce test
interdit (cadrage DOCS/cadrage/2026-09-21-flux-nsfw.md, arbitrage 2).

Le piege de sortie du meme cadrage : un homonyme. Le meme nom de fichier peut
exister dans les deux espaces d'un meme personnage — `nom_libre` garantit
l'unicite dans l'arbre du personnage, les deux espaces compris, mais l'export
est un second arbre ou rien ne l'impose. Retirer l'un ne doit pas retirer
l'autre.

PUIS L'IDENTITE ET LES MESURES (section 5) : l'espace cesse d'etre un critere.
Les trois requetes de `base.py` qui filtraient `espace = 'sfw'` ne filtrent
plus dessus — une image de la branche adulte montre le meme visage et passe la
meme chaine de mesures — et ce qui doit encore separer, le personnage, separe
toujours.

Aucun appel a ComfyUI, aucune donnee de `CHARACTERS/*` supposee presente
(CLAUDE.md, section Donnees) : la configuration d'export est un dictionnaire
de test, le journal est vide, la base de la section 5 est temporaire.

Lancer :  python AUTOMATION\\tests\\test_destination_nsfw.py
"""
import shutil
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
AUTOMATION = HERE.parent
OFM = AUTOMATION.parent
sys.path.insert(0, str(AUTOMATION / "web"))
sys.path.insert(0, str(AUTOMATION))

import shared_state as ss                         # noqa: E402
from api.services import journal                  # noqa: E402

CID = "probe_export"
NOM = "lifestyle_cafe_terrasse_20260921_01.png"   # le meme des deux cotes
CFG = {"export": {"enabled": True, "format": "jpg", "quality": 92},
       "export_sizes": {"4:5": [8, 10]}}
KO = 0


def verifie(ok, texte):
    global KO
    print(f"  {'ok   ' if ok else 'ECHEC'} {texte}")
    if not ok:
        KO += 1


def source(dossier, nom):
    from PIL import Image
    dossier.mkdir(parents=True, exist_ok=True)
    p = dossier / nom
    Image.new("RGB", (8, 10), (120, 90, 60)).save(p)
    return p


def verifie_filtres():
    """L'espace n'est plus un critere d'identite ni de statistique.

    Les trois requetes de `base.py` filtraient `espace = 'sfw'`. Arbitrage 2
    du 21/09 : le filtre ne se deplace pas, il disparait. Ce qui reste filtre
    est ce qui a toujours vraiment filtre — le portillon, le role, le modele
    d'embedding, et le personnage.
    """
    import tempfile
    import numpy as np
    import base as db
    tmp = Path(tempfile.mkdtemp(prefix="destination_nsfw_"))
    vraie_base = db.FICHIER
    db.FICHIER = tmp / "soulglade.db"

    def vecteur(graine):
        v = np.random.RandomState(graine).rand(8).astype("float32")
        return v / np.linalg.norm(v)

    try:
        with db.ouvrir() as cx:
            ids = {}
            for cid, espace, scene, graine in (
                    ("probe_a", "sfw", "terrasse", 1), ("probe_a", "nsfw", "terrasse", 1),
                    ("probe_b", "nsfw", "terrasse", 9)):
                iid = db.enregistrer_image(cx, f"{cid}_{espace}_{graine}.png",
                                           character_id=cid, espace=espace,
                                           bucket="OK", scene=scene,
                                           cree_le=f"2026-09-2{graine}T10:00:00")
                db.enregistrer_score(cx, iid, "identite", 0.8)
                db.enregistrer_embedding(cx, iid, vecteur(graine))
                ids[(cid, espace)] = iid
            cx.commit()

            stats = db.stats_par_scene(cx, "probe_a")
            verifie(stats.get("terrasse", {}).get("n") == 2,
                    f"stats_par_scene compte les deux espaces : {stats}")
            derive = db.derive_par_scene(cx, "probe_a", mini=1)
            verifie(len(derive.get("terrasse", [])) == 2,
                    f"derive_par_scene suit les deux espaces : {derive}")

            bilan = db.construire_jeu(cx, "probe_a", vecteur(1), seuil_haut=-1.0,
                                      libelle="test destination")
            cx.commit()
            membres = {r["image_id"] for r in cx.execute(
                "SELECT image_id FROM reference_member WHERE set_id = ?", (bilan["id"],))}
            verifie(ids[("probe_a", "nsfw")] in membres,
                    "l'image NSFW du personnage entre dans le gabarit")
            verifie(ids[("probe_b", "nsfw")] not in membres,
                    "celle d'un AUTRE personnage n'y entre jamais")
            verifie(membres == {ids[("probe_a", "sfw")], ids[("probe_a", "nsfw")]},
                    f"le jeu est exactement les deux images du personnage : {membres}")
    finally:
        db.FICHIER = vraie_base
        shutil.rmtree(tmp, ignore_errors=True)


def main():
    vrai_cfg, vrai_journal = ss.cfg, ss.journal_index
    ss.cfg = lambda c: CFG
    ss.journal_index = lambda c: {}
    sfw = ss.export_dir(CID, "sfw")
    nsfw = ss.export_dir(CID, "nsfw")
    src_sfw = source(OFM / "PROD" / CID.upper() / "OK", NOM)
    src_nsfw = source(OFM / "PROD" / CID.upper() / "_NSFW" / "OK", NOM)
    try:
        # ------------------------------------------------- [1] deux arbres
        print("[1] les deux espaces exportent dans deux arbres freres")
        verifie(sfw != nsfw, f"chemins distincts : {sfw.name} / {nsfw.name}")
        verifie(nsfw not in sfw.parents and sfw not in nsfw.parents,
                "aucun des deux n'est range sous l'autre")
        verifie(sfw.parent.name == "EXPORT" and nsfw.parent.name == "EXPORT_NSFW",
                f"noms explicites : {sfw.parent.name} / {nsfw.parent.name}")

        # ------------------------------------------------- [2] la branche sort
        print("\n[2] une image NSFW validee a une sortie")
        rendu = journal.export_image(src_nsfw, NOM, "nsfw", CID)
        verifie(bool(rendu), f"export_image rend un nom : {rendu!r}")
        ecrits = list(nsfw.rglob("*.jpg"))
        verifie(len(ecrits) == 1, f"un fichier ecrit dans l'arbre NSFW : {ecrits}")

        # ------------------------------------------------- [3] jamais chez Meta
        print("\n[3] et on ne la trouve jamais dans l'arbre de publication")
        verifie(not sfw.exists() or not list(sfw.rglob("*")),
                f"l'arbre SFW du personnage est vide : {list(sfw.rglob('*'))}")
        meta = OFM / "PROD" / "EXPORT"
        verifie(not list(meta.rglob(Path(NOM).stem + ".*")),
                "aucun fichier de ce nom sous PROD/EXPORT/, tous personnages confondus")

        # ------------------------------------------------- [4] l'homonyme
        print("\n[4] retirer l'un ne retire pas son homonyme de l'autre espace")
        journal.export_image(src_sfw, NOM, "sfw", CID)
        verifie(len(list(sfw.rglob("*.jpg"))) == 1, "les deux sont publies")
        retires = journal.remove_export(NOM, CID, "nsfw")
        verifie(retires == 1, f"un seul fichier retire ({retires})")
        verifie(not list(nsfw.rglob("*.jpg")), "l'export NSFW est parti")
        verifie(len(list(sfw.rglob("*.jpg"))) == 1,
                "l'export SFW du meme nom est reste")

        # ------------------------------------------------- [5] identite, stats
        print("\n[5] une image NSFW compte dans l'identite et dans les stats")
        verifie_filtres()
    finally:
        ss.cfg, ss.journal_index = vrai_cfg, vrai_journal
        for d in (OFM / "PROD" / CID.upper(), sfw, nsfw):
            shutil.rmtree(d, ignore_errors=True)
        for racine in (OFM / "PROD" / "EXPORT_NSFW",):
            if racine.exists() and not any(racine.iterdir()):
                racine.rmdir()

    print("\n" + "=" * 70)
    print("tout est vert" if KO == 0 else f"{KO} ECHEC(S)")
    print("=" * 70)
    return 1 if KO else 0


if __name__ == "__main__":
    sys.exit(main())
