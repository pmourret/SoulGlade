"""La boucle courte ne s'arrete plus a la premiere image NSFW.

Produire, juger, repartir de l'image : c'est la boucle du studio. En espace
NSFW elle s'arretait au premier tour — `/api/decline` ne lit que le journal
principal, et une image nee de la voie d'edition a le sien
(`PROD/<CID>/_NSFW/journal_nsfw.csv`), sans scene ni seed. Le dialogue entier
repondait 404.

Ce que ce test verrouille (cadrage DOCS/cadrage/2026-09-21-flux-nsfw.md,
etape 3) : le dialogue s'ouvre, il n'offre que la porte qui a du sens —
editer a nouveau — et il dit pourquoi les autres sont absentes plutot que de
renvoyer vers l'espace ou l'on est deja. Une image NSFW nee de la GENERATION
(palier non exportable) garde, elle, toutes ses declinaisons : elle a une
ligne au journal principal.

Aucun appel a ComfyUI, aucune donnee de `CHARACTERS/*` supposee presente
(CLAUDE.md, section Donnees) : les deux journaux, la fiche creative et l'etat
de l'outil d'edition sont des doublures.

Lancer :  python AUTOMATION\\tests\\test_boucle_courte_nsfw.py
"""
import asyncio
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
AUTOMATION = HERE.parent
sys.path.insert(0, str(AUTOMATION / "web"))
sys.path.insert(0, str(AUTOMATION))

from api.routers import production as prod       # noqa: E402
from api.schemas.production import DeclineRequest  # noqa: E402

CID = "probe_boucle"
EDITEE = "intime_chambre_matin_20260921_01_edit.png"    # nee de l'edition
GENEREE = "intime_chambre_matin_20260921_01.png"        # nee du curseur
CREATIVE = {
    "tones": [{"key": "doux", "label": "Doux"}, {"key": "cru", "label": "Cru"}],
    "intensity": [{"level": 0, "key": "sfw", "label": "SFW", "pipeline": "produce"},
                  {"level": 3, "key": "nsfw", "label": "NSFW", "pipeline": "edit",
                   "requires": "armed", "export": False}],
}
KO = 0


def verifie(ok, texte):
    global KO
    print(f"  {'ok   ' if ok else 'ECHEC'} {texte}")
    if not ok:
        KO += 1


def appelle(**champs):
    return asyncio.run(prod.decline_image(DeclineRequest(**champs), character_id=CID))


def corps(reponse):
    import json
    if hasattr(reponse, "body"):
        return json.loads(reponse.body)
    return reponse


def main():
    vrais = {n: getattr(prod.ss, n, None) for n in ("journal_index", "cfg")}
    vrai_nsfw_index = prod.nsfw_journal_index
    vrai_creative, vrai_scenes = prod.lb.load_creative, prod.lb.scenes_path
    vrai_outil, vrai_source = prod.nsfw_batch.edit_tool_state, prod.nsfw_batch.resoudre_source
    vrais_jobs = prod.lb.jobs_declinaison

    prod.ss.journal_index = lambda c: {
        GENEREE: {"scene": "chambre_matin", "intensite": "2", "ton": "doux",
                  "seed": "42", "format": "4:5", "categorie": "intime"}}
    prod.nsfw_journal_index = lambda c: {
        EDITEE: {"scene": GENEREE, "score_identite": "0.81", "seed": "",
                 "categorie": "nsfw", "format": "", "prompt": "instruction"}}
    prod.ss.cfg = lambda c: {}
    prod.lb.load_creative = lambda c: CREATIVE
    prod.lb.scenes_path = lambda c: HERE / "fixtures" / "scenes.json"
    prod.nsfw_batch.edit_tool_state = lambda c: {"available": True, "reason": ""}
    prod.nsfw_batch.resoudre_source = lambda nom, cfg, cid: Path("peu/importe.png")
    prod.lb.jobs_declinaison = lambda *a, **k: [{"job": 1}, {"job": 2}]
    try:
        # ------------------------------------------- [1] l'image editee
        print("[1] une image nee de l'edition ouvre le dialogue")
        d = corps(appelle(name=EDITEE, dry=True))
        verifie(d.get("ok") is True, f"plus de 404 : {d.get('erreur') or 'ok'}")
        verifie(d.get("origine_edition") is True,
                "la reponse dit d'ou vient l'image")
        verifie(d["modes"].get("editer") is True,
                "la porte « editer a nouveau » est ouverte")
        verifie(not d["modes"].get("lumiere") and not d["modes"].get("seeds")
                and not d["modes"].get("intensite") and not d["modes"].get("ton"),
                f"et aucune declinaison a reconstruire : {d['modes']}")

        # ------------------------------------------- [2] le refus a une raison
        print("\n[2] lui demander une declinaison est refuse, avec sa raison")
        r = appelle(name=EDITEE, mode="seeds")
        d = corps(r)
        verifie(getattr(r, "status_code", 200) == 400, "refus en 400, pas en 404")
        raison = d.get("erreur") or ""
        verifie("dition" in raison and "diter" in raison,
                f"la raison nomme l'edition et la reprise possible : {raison}")

        # ------------------------------------------- [3] l'image generee
        print("\n[3] une image NSFW nee du curseur garde toutes ses portes")
        d = corps(appelle(name=GENEREE, dry=True))
        verifie(d.get("ok") is True and not d.get("origine_edition"),
                "elle vient du journal principal")
        verifie(d["modes"].get("lumiere") and d["modes"].get("seeds"),
                f"ses declinaisons sont la : {d['modes']}")
        verifie(len(d["modes"].get("ton") or []) == 1,
                "et le ton propose l'autre ton, pas le sien")
    finally:
        for n, v in vrais.items():
            setattr(prod.ss, n, v)
        prod.nsfw_journal_index = vrai_nsfw_index
        prod.lb.load_creative, prod.lb.scenes_path = vrai_creative, vrai_scenes
        prod.nsfw_batch.edit_tool_state = vrai_outil
        prod.nsfw_batch.resoudre_source = vrai_source
        prod.lb.jobs_declinaison = vrais_jobs

    print("\n" + "=" * 70)
    print("tout est vert" if KO == 0 else f"{KO} ECHEC(S)")
    print("=" * 70)
    return 1 if KO else 0


if __name__ == "__main__":
    sys.exit(main())
