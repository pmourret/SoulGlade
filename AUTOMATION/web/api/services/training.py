"""Le jeu d'entrainement d'un personnage, mis en forme pour l'ecran.

CE SERVICE NE CALCULE RIEN. `AUTOMATION/entrainement.py` sait deja dire sur
quoi on entrainerait, ce qui a ete ecarte et pourquoi ; il n'existait qu'en
ligne de commande. Ce module traduit sa sortie pour le fil, lit les manifestes
des exports passes, et lance l'export. Toute regle qui deciderait d'admettre
ou d'ecarter une image reste la-bas.

DEUX CHOSES NE PASSENT JAMAIS SUR LE FIL, et c'est deliberé :

  - `vec`, l'embedding brut de chaque ligne. Des octets numpy que l'ecran ne
    saurait pas lire et n'a aucune raison de recevoir ;
  - `prompt`, qui sert ici a compter les legendes et rien d'autre.

Ne connait pas `fastapi` (`.claude/rules/backend.md`) : il refuse par
`ss.bad_request()` et rend du Python nu.
"""
import json

import base
import entrainement
import legende
import runner as lb
import shared_state as ss

# Les colonnes d'une ligne de la file qui ont un sens a l'ecran. Une liste
# blanche, pas une liste noire : une colonne ajoutee un jour a la requete de
# `candidats` ne doit pas se retrouver publiee par accident.
CHAMPS_IMAGE = ("fichier", "scene", "intention", "ton", "format",
                "anatomie", "mains_juge", "lora_identite")


def _ancre(character_id):
    """L'identite en toutes lettres (`scenes.json / anchor`), ou "".

    C'est contre elle que la legende se fabrique par substitution exacte, donc
    c'est elle qui decide si une image coute un appel au legendeur ou rien.
    """
    try:
        return (lb.load_scenes(character_id) or {}).get("anchor") or ""
    except Exception:                                        # noqa: BLE001
        return ""


def _image(ligne, sans_fichier, sans_etiquette):
    d = {k: ligne.get(k) for k in CHAMPS_IMAGE}
    d["sans_fichier"] = ligne["fichier"] in sans_fichier
    d["sans_etiquette"] = ligne["fichier"] in sans_etiquette
    return d


def _sources_de_legende(lignes, character_id, configuration):
    """Combien de legendes viendront du prompt, combien du legendeur.

    POURQUOI CE COMPTE EXISTE. La legende vient du prompt par substitution
    exacte et ne coute rien ; le legendeur de vision n'est qu'un repli, et il
    appelle ComfyUI avec un delai maximum de 300 s par image. Chez Lena, 22
    prompts sur 22 passent par la substitution, donc l'export est une copie de
    fichiers et rien de plus. Annoncer le compte AVANT le clic est ce qui
    evite de decouvrir apres coup qu'un export va durer une heure.

    ponytail: l'export reste une seule requete tant que ce compte est bas. Le
    jour ou un corpus demande beaucoup de replis, cette route passe au contrat
    en paquets `{faites, restant}` deja eprouve par /api/mesurer -- meme
    patron, pas une infrastructure de push que le depot n'a nulle part.
    """
    ancre = _ancre(character_id)
    trigger, _ = entrainement.trigger_du_personnage(
        character_id, configuration, ecrire=False)
    depuis_prompt = sum(1 for r in lignes
                        if legende.base(r.get("prompt"), ancre, trigger))
    return trigger, {"prompt": depuis_prompt,
                     "repli_vision": len(lignes) - depuis_prompt}


def _pour_le_fil(rapport, character_id, configuration):
    sans_fichier = {r["fichier"] for r in rapport["sans_fichier"]}
    sans_etiquette = {r["fichier"] for r in rapport["sans_etiquette"]}
    trigger, legendes = _sources_de_legende(
        rapport["file"], character_id, configuration)
    jeu = rapport["jeu"]
    return {
        "ok": True,
        "personnage": character_id,
        "declencheur": trigger,
        "jeu": None if jeu is None else {
            "id": jeu["id"], "sante": jeu.get("sante"),
            "cohesion": jeu.get("cohesion"),
            "modele_embedding": jeu.get("modele"),
        },
        "pret": rapport["pret"],
        "blocage": rapport["blocage"],
        "compteurs": {
            "file": len(rapport["file"]),
            "exportables": len(rapport["file"]) - len(sans_fichier),
            "sans_fichier": len(sans_fichier),
            "sans_etiquette": len(sans_etiquette),
            "derives": rapport["derives"],
            "ecartes": len(rapport["ecartes"]),
        },
        "file": [_image(r, sans_fichier, sans_etiquette) for r in rapport["file"]],
        "ecartes": [{"fichier": r["fichier"], "raison": r["raison"]}
                    for r in rapport["ecartes"]],
        "cohesion": rapport["cohesion"],
        "ecart_type": rapport["ecart_type"],
        "outliers": rapport["outliers"],
        "diversite": rapport["diversite"],
        "criteres": rapport["criteres"],
        "legendes": legendes,
    }


def proposal(character_id, configuration):
    """La proposition d'entrainement du personnage. LECTURE SEULE.

    Aucune ecriture, y compris celle qu'on ne voit pas : le declencheur se lit
    avec `ecrire=False`. Il est grave dans le LoRA entraine avec lui, et une
    consultation d'ecran n'a jamais a le graver.
    """
    with base.ouvrir() as cx:
        rapport = entrainement.proposition(cx, character_id, configuration)
    return _pour_le_fil(rapport, character_id, configuration)


def exports(character_id):
    """Les exports passes du personnage, du plus recent au plus ancien.

    Lit les manifestes plutot que de refaire le calcul : un export est une
    piece d'historique, et ce qu'il dit de lui-meme fait foi. Un dossier sans
    manifeste lisible est SIGNALE, pas ignore -- un export a moitie ecrit est
    une information, son silence n'en est pas une.
    """
    racine = entrainement.RACINE_EXPORT / character_id
    if not racine.is_dir():
        return {"ok": True, "exports": []}
    out = []
    for d in sorted(racine.iterdir(), reverse=True):
        if not d.is_dir():
            continue
        chemin = d / "manifeste.json"
        try:
            m = json.loads(chemin.read_text(encoding="utf-8"))
        except Exception as e:                               # noqa: BLE001
            out.append({"horodatage": d.name, "dossier": str(d), "illisible": str(e)})
            continue
        ent = m.get("entrainement") or {}
        out.append({
            "horodatage": d.name,
            "dossier": str(d),
            "exporte_le": m.get("exporte_le"),
            "images": len(m.get("images") or []),
            "ancre_reinjectee": m.get("ancre_reinjectee"),
            "declencheur": m.get("declencheur"),
            "famille": ent.get("famille"),
            "repetitions": ent.get("repetitions"),
            "repetitions_defaut": ent.get("repetitions_defaut"),
            "script": ent.get("script"),
            "dossier_images": ent.get("dossier_images"),
            "illisible": None,
        })
    return {"ok": True, "exports": out}


def run_export(character_id, configuration, repetitions=None, avec_vision=True):
    """Rassemble le jeu dans un dossier date. BLOQUANT : appele dans un thread.

    ECRIT REELLEMENT, et deux fois plutot qu'une : le dossier d'export, et le
    declencheur dans `config.json` si le personnage n'en avait pas encore. La
    lecture (`proposal`) ne fait ni l'un ni l'autre.

    N'ecrase jamais un export existant -- `entrainement.exporter` refuse un
    horodatage deja pris. Deux exports dans la meme seconde sont donc un
    `FileExistsError`, que la route traduit.
    """
    if repetitions is not None and repetitions < 1:
        ss.bad_request("le nombre de repetitions doit valoir au moins 1")
    with base.ouvrir() as cx:
        r = entrainement.exporter(cx, character_id, configuration,
                                  avec_vision=avec_vision, repetitions=repetitions)
    if not r.get("dossier"):
        ss.bad_request(r.get("blocage")
                       or "rien a exporter : la file est vide ou sans fichier sur le disque")
    par_source = {}
    for v in (r.get("legendes") or {}).values():
        par_source[v["source"]] = par_source.get(v["source"], 0) + 1
    return {
        "ok": True,
        "dossier": str(r["dossier"]),
        "dossier_images": str(r["dossier_images"]),
        "images": len(r["exportes"]),
        "ancre_reinjectee": r.get("ancre_reinjectee"),
        "declencheur": r.get("declencheur"),
        "declencheur_cree": bool(r.get("declencheur_cree")),
        "famille": r.get("famille"),
        "repetitions": r.get("repetitions"),
        "script": r.get("script_kohya"),
        "legendes": par_source,
    }
