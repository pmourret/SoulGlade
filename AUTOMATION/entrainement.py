# -*- coding: utf-8 -*-
"""Sur quoi entrainerait-on un LoRA d'identite, et est-ce assez ?

    python AUTOMATION/entrainement.py [personnage]

CE MODULE NE LANCE RIEN. Il lit la base et rend une PROPOSITION : combien
d'images, lesquelles, ce qui a ete ecarte et pourquoi, la diversite, et quel
critere manque. C'est Pierre qui decide (PROJET.md : la plateforme n'arbitre
jamais a la place de l'utilisateur), et une proposition qui ne sait pas dire
POURQUOI elle n'aboutit pas ne sert a rien.

DEUX OBJETS, PAS UN. Le GABARIT (base.construire_jeu) est un instrument de
mesure : il veut couvrir l'espace de conditions de la production, donc il
admet tout ce qui est bien le personnage, mains cassees comprises -- une main
ne deforme pas un visage. La FILE D'ENTRAINEMENT veut de la qualite : elle
ecarte en plus le DEFAUT OBJECTIF. Le schema du 09/09 les faisait passer sous
une seule fleche ; l'annotation manuelle des rejets de Lena, le 10/09, a montre
que le portillon d'identite laissait passer 6 mains cassees sur 12 -- il ne les
filtre pas, il les tire a pile ou face.

CE QU'ON N'ECARTE PAS : le gout. `flag == 'ia'` (« ca fait IA ») est un
jugement de realisme que l'utilisateur final fait lui-meme, et il est mesure
sans effet sur l'identite (0.1 sigma contre le gabarit, 10/09). Seuls les axes
de defaut OBJECTIF comptent ici -- une main a six doigts n'est pas un choix
creatif (PROJET.md, amendement du 07/09).
"""
import math
import sys
from collections import Counter
from pathlib import Path

HERE = Path(__file__).resolve().parent
if str(HERE) not in sys.path:
    sys.path.insert(0, str(HERE))

import base                                                    # noqa: E402

# Axes de defaut objectif qui ecartent de la file. `flag` n'y est PAS, et c'est
# la decision du 10/09 : la plateforme juge l'identite, l'humain juge
# l'anatomie, son gout ne rentre dans aucune des deux.
AXES_OBJECTIFS = ("mains_juge", "anatomie")
# Un membre dont le score contre le gabarit tombe a plus de 2 ecarts-types
# sous la moyenne de la file. Signale, jamais ecarte tout seul.
Z_OUTLIER = -2.0
# Axes de diversite. Ce sont les colonnes que la production remplit deja
# (43/45 chez Lena) ; `variante` en est absente, elle n'est renseignee que sur
# 6 images sur 45.
AXES_DIVERSITE = ("scene", "intention", "ton", "format")


def categories_effectives(valeurs):
    """Nombre EFFECTIF de categories : exp(entropie de Shannon).

    Un compte de valeurs distinctes mentirait. 13 scenes dont trois pesent la
    moitie du lot ne font pas 13 observations differentes -- c'est la regle 9
    du mecanisme d'identite : « 30 observations differentes, pas 30 images
    presque identiques ». Cette mesure rend 13 quand tout est equilibre, et
    tombe vers 1 quand une categorie ecrase les autres.

    Les valeurs vides sont ignorees : une metadonnee absente n'est pas une
    categorie, elle est une inconnue (rendue a part par `diversite`).
    """
    v = [x for x in valeurs if x]
    if not v:
        return 0.0
    c = Counter(v)
    n = sum(c.values())
    h = -sum((k / n) * math.log(k / n) for k in c.values())
    return math.exp(h)


def diversite(lignes):
    """Par axe : categories distinctes, effectives, et images sans la donnee."""
    out = {}
    for axe in AXES_DIVERSITE:
        valeurs = [r[axe] for r in lignes]
        out[axe] = {"distinctes": len({x for x in valeurs if x}),
                    "effectives": categories_effectives(valeurs),
                    "sans": sum(1 for x in valeurs if not x)}
    return out


def candidats(cx, character_id):
    """La file d'entrainement, et ce qui en a ete ecarte avec la raison.

    Part des membres du jeu de reference ACTIF : ils ont deja passe le
    portillon d'identite (base.construire_jeu). On n'y ajoute qu'un filtre,
    celui du defaut objectif.

    Une image JAMAIS ETIQUETEE entre, et elle est comptee a part. Son absence
    de defaut n'est pas connue, elle est supposee : la proposition l'affiche
    plutot que de trancher en silence dans un sens ou dans l'autre.
    """
    actif = base.jeu_actif(cx, character_id)
    if not actif:
        return {"jeu": None, "file": [], "ecartes": [], "sans_etiquette": []}

    lignes = [dict(r) for r in cx.execute(
        "SELECT i.id AS id, i.fichier AS fichier, i.scene AS scene, "
        "       i.intention AS intention, i.ton AS ton, i.format AS format, "
        "       i.lora_identite AS lora_identite, e.vec AS vec, "
        "       j.anatomie AS anatomie, j.mains_juge AS mains_juge "
        "FROM reference_member m "
        "JOIN image i ON i.id = m.image_id "
        "JOIN embedding e ON e.image_id = i.id "
        "LEFT JOIN jugement j ON j.image_id = i.id "
        "WHERE m.set_id = ?", (actif["id"],))]

    file_, ecartes, sans = [], [], []
    for r in lignes:
        fautes = [axe for axe in AXES_OBJECTIFS if r.get(axe) == "ko"]
        if fautes:
            ecartes.append({**r, "raison": fautes})
            continue
        file_.append(r)
        if not any(r.get(axe) for axe in AXES_OBJECTIFS):
            sans.append(r)
    return {"jeu": actif, "file": file_, "ecartes": ecartes, "sans_etiquette": sans}


def proposition(cx, character_id, configuration=None):
    """Le rapport complet, avec un verdict PAR CRITERE et sa raison.

    Un seuil absent du config.json ne devient jamais une valeur par defaut ici
    (invariant 4) : le critere est rendu « sans seuil configure », et la
    proposition ne conclut pas. Meme regle que `qc.threshold_gabarit` : un
    seuil se mesure par personnage, il ne se devine pas dans le code.
    """
    import numpy as np
    seuils = ((configuration or {}).get("entrainement") or {})
    d = candidats(cx, character_id)
    if d["jeu"] is None:
        return {**d, "pret": False, "criteres": [],
                "blocage": "aucun jeu de reference actif : le gabarit n'existe "
                           "pas encore pour ce personnage"}

    file_ = d["file"]
    rapport = {**d, "diversite": diversite(file_),
               "derives": sum(1 for r in file_ if r["lora_identite"]),
               "cohesion": None, "ecart_type": None, "outliers": []}

    if file_:
        gab = base.centroide(cx, d["jeu"]["id"])
        s = np.array([float(np.dot(gab, np.frombuffer(r["vec"], dtype=np.float32)))
                      for r in file_])
        rapport["cohesion"] = float(s.mean())
        rapport["ecart_type"] = float(s.std())
        if s.std() > 1e-9:
            z = (s - s.mean()) / s.std()
            rapport["outliers"] = [{"fichier": r["fichier"], "score": float(v),
                                    "z": float(zz)}
                                   for r, v, zz in zip(file_, s, z) if zz < Z_OUTLIER]

    # Un critere sans seuil n'est ni tenu ni manque : il est INJUGEABLE, et le
    # dire est plus utile que de trancher.
    criteres = []
    n_min = seuils.get("n_min")
    criteres.append(_critere("nombre d'images", len(file_), n_min,
                             f"{len(file_)} image(s) dans la file"))
    div_min = seuils.get("diversite_min")
    eff = rapport["diversite"]["scene"]["effectives"]
    criteres.append(_critere("diversite de scenes", eff, div_min,
                             f"{eff:.1f} categorie(s) de scene effectives"))

    manquants = [c for c in criteres if c["verdict"] == "manque"]
    injugeables = [c for c in criteres if c["verdict"] == "sans seuil"]
    rapport["criteres"] = criteres
    rapport["pret"] = bool(criteres) and not manquants and not injugeables
    if manquants:
        rapport["blocage"] = " ; ".join(c["message"] for c in manquants)
    elif injugeables:
        noms = " et ".join(c["nom"] for c in injugeables)
        verbe = "n'a pas" if len(injugeables) == 1 else "n'ont pas"
        rapport["blocage"] = (
            f"rien ne manque, mais {noms} {verbe} de seuil dans le config.json "
            f"de ce personnage (bloc `entrainement`) : impossible de conclure")
    else:
        rapport["blocage"] = ""
    return rapport


def _critere(nom, valeur, seuil, texte):
    if seuil is None:
        return {"nom": nom, "valeur": valeur, "seuil": None,
                "verdict": "sans seuil", "message": f"{texte}, aucun seuil configure"}
    if valeur >= seuil:
        return {"nom": nom, "valeur": valeur, "seuil": seuil, "verdict": "tenu",
                "message": f"{texte} (seuil {seuil})"}
    return {"nom": nom, "valeur": valeur, "seuil": seuil, "verdict": "manque",
            "message": f"{texte}, il en faut {seuil}"}


def _main(character_id):
    """Un outil imprime, une bibliotheque logge (.claude/rules/backend.md)."""
    import runner as lb
    try:
        configuration = lb.load_config(character_id)
    except Exception as e:                                   # noqa: BLE001
        print(f"  config.json illisible pour {character_id!r} : {e}")
        configuration = {}
    with base.ouvrir() as cx:
        r = proposition(cx, character_id, configuration)

    if r["jeu"] is None:
        print(f"  {r['blocage']}")
        return 1
    total = len(r["file"]) + len(r["ecartes"])
    print(f"  jeu de reference actif #{r['jeu']['id']} — {total} membre(s)\n")
    print(f"  FILE D'ENTRAINEMENT       : {len(r['file'])}")
    print(f"    dont jamais etiquetees  : {len(r['sans_etiquette'])}"
          + ("   (defaut objectif SUPPOSE, pas verifie)"
             if r["sans_etiquette"] else ""))
    print(f"    dont DERIVED            : {r['derives']}"
          + ("   (produites sous un LoRA du personnage)" if r["derives"] else ""))
    print(f"  ecartees (defaut objectif): {len(r['ecartes'])}")
    for axe in AXES_OBJECTIFS:
        n = sum(1 for e in r["ecartes"] if axe in e["raison"])
        if n:
            print(f"    {axe:22}: {n}")

    if r["cohesion"] is not None:
        print(f"\n  cohesion de la file       : {r['cohesion']:.4f} "
              f"(ecart-type {r['ecart_type']:.4f})")
        print(f"  outliers (z sous {Z_OUTLIER})    : {len(r['outliers'])}")
        for o in sorted(r["outliers"], key=lambda x: x["score"]):
            print(f"    {o['fichier'][:46]:48}{o['score']:.3f}  z={o['z']:+.2f}")

    print(f"\n  diversite (nombre EFFECTIF de categories, exp(entropie)) :")
    for axe, v in r["diversite"].items():
        sans = f"   {v['sans']} sans la donnee" if v["sans"] else ""
        print(f"    {axe:10} {v['distinctes']:>3} distinctes -> "
              f"{v['effectives']:>5.1f} effectives{sans}")

    print(f"\n  criteres :")
    for c in r["criteres"]:
        marque = {"tenu": "ok  ", "manque": "NON ", "sans seuil": "?   "}[c["verdict"]]
        print(f"    {marque} {c['message']}")
    print(f"\n  {'PROPOSITION D ENTRAINEMENT PRETE' if r['pret'] else 'PAS DE PROPOSITION'}")
    if r["blocage"]:
        print(f"    {r['blocage']}")
    return 0


if __name__ == "__main__":
    sys.exit(_main(sys.argv[1].lower() if len(sys.argv) > 1 else "lena"))
