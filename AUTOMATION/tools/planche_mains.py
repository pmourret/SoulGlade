# -*- coding: utf-8 -*-
"""Planche de crops de mains : l'instrument de jugement de l'etape mains
(IT-3b, front 1 — DOCS/cadrage/2026-09-08-phase-rd-juge-generaliste.md).

POURQUOI PAS UNE MESURE. Le corpus du 08/09 a chiffre `mains` (taux de
detection DWPose) a 25 % de rappel sur 53 mains jugeables : il ne peut pas
rendre le verdict. Et la sonde du 07/09 avait deja ferme la piste
geometrique — l'information n'est pas dans le squelette. Ce qui reste vrai
de DWPose, c'est qu'il LOCALISE tres bien. Cet outil s'en sert pour ca et
pour rien d'autre : il decoupe les mains, les pose en planche, et c'est
l'oeil qui juge. Le resultat est un TAUX par variante, pas une preference
entre deux images — sur un defaut qui touche trois images sur quatre,
savoir laquelle est la moins pire ne dit pas si on est passe sous la barre.

CE QUI NE DOIT PAS SORTIR DE L'ECHANTILLON. Une main que DWPose ne trouve
pas est justement le cas le plus suspect. `qc_mains.boite_main` rend donc
une boite meme la, calee sur le poignet, et la tuile est marquee « ? ».
Laisser ces mains hors de la planche biaiserait le taux dans le sens qui
arrange — c'est la meme faute que le banc corrigeait le 09/09 au matin sur
le genre « mains » a n=3.

Deux passes, la seconde apres que Pierre a regarde :

    python AUTOMATION/tools/planche_mains.py PROD/LENA/_BENCH/<bench_id>
    python AUTOMATION/tools/planche_mains.py PROD/LENA/_BENCH/<bench_id> --ko 3,7,12
"""
import argparse
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
AUTOMATION = HERE.parent
OFM = AUTOMATION.parent
sys.path.insert(0, str(AUTOMATION))

from PIL import Image, ImageDraw, ImageFont   # noqa: E402

import base                                   # noqa: E402
import env_config                             # noqa: E402
import qc_mains                               # noqa: E402

INDEX = "planche-index.json"


def _police(taille):
    for nom in ("DejaVuSans-Bold.ttf", "arialbd.ttf"):
        try:
            return ImageFont.truetype(nom, taille)
        except OSError:
            continue
    return ImageFont.load_default()


def variantes(racine):
    """{nom: [images]} — un sous-dossier immediat par variante, comme les
    range `run_bench` (<bench_id>/<variante>/<verdict>/*.png). Un dossier
    d'images sans sous-dossier compte pour une seule variante."""
    sous = sorted(d for d in racine.iterdir() if d.is_dir())
    if not sous:
        return {racine.name: sorted(racine.glob("*.png"))}
    return {d.name: sorted(d.rglob("*.png")) for d in sous}


def variantes_du_banc(racine):
    """Idem, mais la liste vient de la BASE : une image par (variante, seed),
    dans l'ordre des seeds, et rien d'autre.

    Pourquoi ce mode existe (09/09) : le poste s'est mis en veille pendant le
    banc mains, le processus a repris tout seul au reveil et a tourne en
    parallele de la reprise lancee a la main. Resultat sur le disque, 58
    images pour 30 seeds — mais la base, elle, etait juste : `bench_score` est
    unique par (variante, seed, genre), et elle cite un seul fichier par seed.
    Balayer le dossier aurait compte deux fois la moitie d'une variante et
    fausse le taux ; la base sait ce qui appartient au banc.

    Effet de bord utile : les deux planches sortent dans le meme ordre de
    seeds, donc la tuile n de l'une et la tuile n de l'autre sont la meme
    image a un reglage pres.
    """
    with base.ouvrir() as cx:
        lignes = base.bench_fichiers(cx, racine.name)
    if not lignes:
        raise SystemExit(
            f"aucune image en base pour le banc {racine.name!r}. Sans --banc, "
            "les images sont prises dans le dossier.")
    par_variante, introuvables = {}, []
    for r in lignes:
        trouve = next((p for p in (racine / r["label"]).rglob(r["fichier"])), None)
        if trouve is None:
            introuvables.append(f"{r['label']}/{r['fichier']}")
            continue
        par_variante.setdefault(r["label"], []).append(trouve)
    if introuvables:
        print(f"  !! {len(introuvables)} images citees en base et absentes du "
              f"disque : {introuvables[:3]}")
    return par_variante


def crops(images, url):
    """[(image, cote, crop PIL, complete)] pour toutes les mains localisees."""
    trouves = []
    for img in images:
        try:
            people = qc_mains.extraire(img, url)
        except Exception as e:
            print(f"  !! {img.name} : {type(e).__name__} — {e}")
            continue
        if not people:
            continue
        source = Image.open(img).convert("RGB")
        for cote in qc_mains.COTES:
            boite = qc_mains.boite_main(people[0], cote)
            if boite is None:
                continue
            x0, y0, x1, y1, complete = boite
            trouves.append((img, cote, source.crop((int(x0), int(y0),
                                                    int(x1), int(y1))), complete))
    return trouves


def planche(tuiles, tuile, colonnes):
    """Grille numerotee. Le numero est celui de l'index, pas la position :
    Pierre lit une planche et repond des numeros."""
    bandeau = max(18, tuile // 12)
    lignes = (len(tuiles) + colonnes - 1) // colonnes
    feuille = Image.new("RGB", (colonnes * tuile, lignes * (tuile + bandeau)), (24, 24, 24))
    dessin = ImageDraw.Draw(feuille)
    police = _police(bandeau - 4)
    for i, (numero, crop, complete) in enumerate(tuiles):
        x, y = (i % colonnes) * tuile, (i // colonnes) * (tuile + bandeau)
        feuille.paste(crop.resize((tuile, tuile), Image.LANCZOS), (x, y))
        dessin.rectangle([x, y + tuile, x + tuile, y + tuile + bandeau],
                         fill=(0, 0, 0) if complete else (110, 60, 0))
        dessin.text((x + 4, y + tuile + 1),
                    f"{numero}" + ("" if complete else "  ? main non trouvee"),
                    font=police, fill=(255, 255, 255))
    return feuille


def taux(index, ko, na):
    """Taux de mains ratees par variante, sur les mains JUGEABLES, avec son
    erreur-type binomiale. Le chiffre que l'etape doit rendre — pas une
    impression.

    Le « na » n'est pas une commodite : c'est ce qui rend ce taux comparable
    aux 75 % du corpus du 08/09, qui comptait 40 ratees sur 53 JUGEABLES et
    laissait les 49 autres de cote. Sans lui, une main hors cadre compterait
    pour une main reussie et diluerait le taux — dans le sens qui arrange.
    """
    par_variante = {}
    for e in index["mains"]:
        v = par_variante.setdefault(e["variante"], [0, 0, 0])
        if e["numero"] in na:
            v[2] += 1
            continue
        v[0] += 1
        v[1] += e["numero"] in ko
    inconnus = (ko | na) - {e["numero"] for e in index["mains"]}
    if inconnus:
        print(f"  !! numeros absents de l'index, ignores : {sorted(inconnus)}")
    if ko & na:
        print(f"  !! numeros a la fois ko et na : {sorted(ko & na)}")
    print(f"\n  {'variante':26} {'jugeables':>10} {'ratees':>7} {'na':>4} "
          f"{'taux':>8} {'+/-':>7}")
    for nom, (n, k, hors) in sorted(par_variante.items()):
        p = k / n if n else 0.0
        # erreur-type binomiale : ce qui dit si l'ecart entre deux variantes
        # merite d'etre lu, exactement comme min_sigma au banc.
        et = (p * (1 - p) / n) ** 0.5 if n else 0.0
        print(f"  {nom:26} {n:10} {k:7} {hors:4} {p:7.1%} {et:6.1%}")
    print("\n  Deux variantes ne different que si l'ecart depasse la somme "
          "des deux +/-.")


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("dossier", help="dossier de banc, ou dossier d'images")
    ap.add_argument("--url", default=None, help="ComfyUI (defaut : .env)")
    ap.add_argument("--out", default=None, help="ou ecrire (defaut : le dossier)")
    ap.add_argument("--banc", action="store_true",
                    help="prendre la liste des images dans la base plutot que "
                         "dans le dossier — le nom du dossier est le bench_id")
    ap.add_argument("--tuile", type=int, default=320)
    ap.add_argument("--colonnes", type=int, default=6)
    ap.add_argument("--ko", default=None,
                    help="numeros juges rates, separes par des virgules — "
                         "seconde passe, apres avoir regarde les planches")
    ap.add_argument("--na", default="",
                    help="numeros NON JUGEABLES (main hors cadre, trop petite) — "
                         "exclus du denominateur, comme dans le corpus du 08/09")
    args = ap.parse_args()

    racine = Path(args.dossier)
    if not racine.is_absolute():
        racine = OFM / args.dossier
    sortie = Path(args.out) if args.out else racine

    if args.ko is not None:
        index = json.loads((sortie / INDEX).read_text(encoding="utf-8"))

        def nombres(texte):
            return {int(n) for n in texte.replace(" ", ",").split(",") if n}

        return taux(index, nombres(args.ko), nombres(args.na))

    url = args.url or env_config.comfy_url()
    index, numero = {"dossier": str(racine), "mains": []}, 0
    sources = variantes_du_banc(racine) if args.banc else variantes(racine)
    for nom, images in sources.items():
        print(f"\n[{nom}] {len(images)} images")
        tuiles = []
        for img, cote, crop, complete in crops(images, url):
            numero += 1
            tuiles.append((numero, crop, complete))
            index["mains"].append({"numero": numero, "variante": nom,
                                   "image": img.name, "cote": cote,
                                   "localisee": complete})
        if not tuiles:
            print("  aucune main localisee — scene sans main dans le cadre ?")
            continue
        chemin = sortie / f"planche-{nom}.png"
        planche(tuiles, args.tuile, args.colonnes).save(chemin)
        manquantes = sum(1 for t in tuiles if not t[2])
        print(f"  {len(tuiles)} mains ({manquantes} non localisees) -> {chemin.name}")
    (sortie / INDEX).write_text(json.dumps(index, ensure_ascii=False, indent=1),
                                encoding="utf-8")
    print(f"\nIndex : {sortie / INDEX}")
    print("Regarder les planches, puis relancer avec --ko <numeros ratees>.")


if __name__ == "__main__":
    main()
