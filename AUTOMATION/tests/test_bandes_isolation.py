"""Les bandes d'etalonnage de la Revue ne melangent pas deux personnages.

`PROD/mesures.json` est indexe par nom de fichier NU, sans champ personnage :
`mesures.charger()` rend donc les entrees de tout le monde dans un seul
dictionnaire. La Revue s'en servait telle quelle pour calculer ses bandes, dans
une route dont le reste est deja par personnage — un personnage sans corpus de
reference voyait ses bandes calibrees sur les jugements d'un autre.

Meme famille que le bug d'isolation du 29/08 (`shared_state.bucket_dir`,
`journal_index`) : ce que le nom de fichier ne dit pas, l'appelant doit le
filtrer.

Verifie aussi que le corpus de reference, lui, reste commun : il appartient a
la plateforme (`INPUTS/REALISME/`), pas a un personnage.

Aucun appel a ComfyUI, aucune image decodee, aucune donnee de personnage reelle
supposee presente (CLAUDE.md, section Donnees) : la route est appelee
directement, le store est detourne vers un fichier temporaire.

Lancer :  python AUTOMATION\\tests\\test_bandes_isolation.py
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

import mesures as mes                           # noqa: E402
import shared_state as ss                       # noqa: E402
from api.routers import review                  # noqa: E402

A, B = "probe_bandes_a", "probe_bandes_b"
PARTAGE = "lifestyle_cafe_terrasse_20260920_01.png"   # les deux le produisent
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


def entrees(prefixe, nettete, n=8):
    """n images jugees « ok », toutes a la meme nettete : la bande est alors
    cette valeur exactement, et on voit tout de suite laquelle a servi."""
    return {f"{prefixe}_{i:02d}.png": {"nettete": nettete, "texture_visage": 4.0,
                                       "bruit_fond": 1.0, "flag": "ok"}
            for i in range(n)}


def main():
    tmp = Path(tempfile.mkdtemp(prefix="bandes_isolation_"))
    vrai_store = mes.FICHIER
    mes.FICHIER = tmp / "mesures.json"
    noms_a, noms_b = entrees("a", 100.0), entrees("b", 900.0)
    poser_arbre(A, list(noms_a) + [PARTAGE])
    poser_arbre(B, list(noms_b) + [PARTAGE])
    try:
        # ------------------------------------------- [1] l'arbre d'un personnage
        print("[1] fichiers_du_personnage ne voit que l'arbre du personnage")
        fa, fb = ss.fichiers_du_personnage(A), ss.fichiers_du_personnage(B)
        verifie(set(noms_a) <= fa and not set(noms_b) & fa,
                f"{A} voit ses 8 fichiers et aucun de l'autre ({len(fa)})")
        verifie(PARTAGE in fa and PARTAGE in fb,
                "un nom porte par les deux est vu des deux cotes")
        verifie(not (fa - {PARTAGE}) & (fb - {PARTAGE}),
                "aucun autre nom ne fuit d'un arbre a l'autre")

        # ------------------------------------------- [2] bandes sans corpus
        print("\n[2] sans corpus, chaque Revue se calibre sur SES jugements")
        mes.FICHIER.write_text(json.dumps({**noms_a, **noms_b}), encoding="utf-8")
        ga = asyncio.run(review.get_gallery(character_id=A, bucket="OK"))
        gb = asyncio.run(review.get_gallery(character_id=B, bucket="OK"))
        ba, bb = ga["bandes"]["nettete"], gb["bandes"]["nettete"]
        verifie(ba and ba["median"] == 100.0,
                f"la bande de {A} vaut ses 100.0 : {ba and ba['median']}")
        verifie(bb and bb["median"] == 900.0,
                f"la bande de {B} vaut ses 900.0 : {bb and bb['median']}")
        verifie(ga["juges"] == 8 and gb["juges"] == 8,
                f"chacun compte ses 8 jugements ({ga['juges']} / {gb['juges']})")

        # ------------------------------------------- [3] le corpus reste commun
        print("\n[3] le corpus de reference est de plateforme, pas de personnage")
        corpus = {f"ref_{i}.png": {"nettete": 500.0, "texture_visage": 4.5,
                                   "bruit_fond": 1.2, "role": "reference"}
                  for i in range(3)}
        mes.FICHIER.write_text(json.dumps({**noms_a, **noms_b, **corpus}),
                               encoding="utf-8")
        ga = asyncio.run(review.get_gallery(character_id=A, bucket="OK"))
        gb = asyncio.run(review.get_gallery(character_id=B, bucket="OK"))
        verifie(ga["bandes"]["nettete"]["source"] == "reference"
                and gb["bandes"]["nettete"]["source"] == "reference",
                "le corpus prime des deux cotes")
        verifie(ga["bandes"]["nettete"] == gb["bandes"]["nettete"],
                "et il donne la MEME bande aux deux personnages")
        verifie(ga["references"]["mesurees"] == 3,
                f"les 3 references sont comptees ({ga['references']['mesurees']})")

        # ------------------------------------------- [4] corpus sans identite
        print("\n[4] le corpus n'est jamais score contre l'ancre d'un personnage")
        appels = []
        vrai_mesurer, vrais_fichiers = mes.mesurer, mes.fichiers_reference
        mes.mesurer = lambda path, **kw: appels.append(kw) or {"nettete": 1}
        mes.fichiers_reference = lambda: [tmp / "corpus.png"]
        mes.FICHIER.write_text("{}", encoding="utf-8")
        try:
            mes.mesurer_references(checker=None)
        finally:
            mes.mesurer, mes.fichiers_reference = vrai_mesurer, vrais_fichiers
        verifie(len(appels) == 1 and "checker" not in appels[0],
                f"mesurer() est appele sans checker : {appels}")
        verifie(appels and "bbox" in appels[0],
                "et avec la bbox, dont qc_realisme a besoin pour la texture")
    finally:
        mes.FICHIER = vrai_store
        for cid in (A, B):
            shutil.rmtree(OFM / "PROD" / cid.upper(), ignore_errors=True)
        shutil.rmtree(tmp, ignore_errors=True)

    print("\n" + "=" * 70)
    print("tout est vert" if KO == 0 else f"{KO} ECHEC(S)")
    print("=" * 70)
    return 1 if KO else 0


if __name__ == "__main__":
    sys.exit(main())
