# -*- coding: utf-8 -*-
"""AUTOMATION/logs.py : le journal ecrit, tourne, et classe ce qu'il attrape.

POURQUOI CE TEST EXISTE. Le journal n'a de valeur que le jour ou quelque
chose casse — c'est-a-dire le seul jour ou personne ne le relira avant de
s'en servir. Les quatre choses qu'il doit garantir se verrouillent donc ici :

  [1] la classification decide du NIVEAU et de la PILE (les trois familles de
      logs.report). Une pile sur « ComfyUI est eteint » est du bruit ; son
      absence sur un KeyError inattendu est une enquete perdue ;
  [2] le fichier TOURNE. Sans rotation, un journal qui marche est un disque
      qui se remplit — la panne arrive plus tard et fait plus mal ;
  [3] le niveau est configurable depuis l'environnement, sans toucher au code ;
  [4] une erreur n'est ecrite QU'UNE FOIS. `push_log(journal=False)` est ce
      qui l'empeche de partir deux fois quand elle est deja passee par
      `report` — regle qui ne se devine pas en lisant les appelants.

Aucun ComfyUI, aucun personnage, aucune ecriture hors du dossier temporaire :
`setup(log_dir=...)` detourne le journal, LOGS/ du depot n'est jamais touche.

Lancer :  python AUTOMATION\\tests\\test_logs.py
"""
import logging
import os
import shutil
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
AUTOMATION = HERE.parent
sys.path.insert(0, str(AUTOMATION))
sys.path.insert(0, str(AUTOMATION / "web"))

import logs  # noqa: E402

KO = 0


def verifie(ok, texte):
    global KO
    print(f"  {'ok   ' if ok else 'ECHEC'} {texte}")
    if not ok:
        KO += 1


TMP = Path(tempfile.mkdtemp(prefix="soulglade_logs_"))


def journal(nom="soulglade.log"):
    p = TMP / nom
    return p.read_text(encoding="utf-8") if p.exists() else ""


def repartir(level="INFO"):
    """Un journal vierge par section, sans jamais toucher LOGS/ du depot.

    Fermer les handlers AVANT d'effacer : sous Windows un fichier encore
    ouvert par le handler de rotation ne s'efface pas (WinError 32).
    `level=None` laisse setup() lire l'environnement.
    """
    racine = logging.getLogger()
    for h in list(racine.handlers):
        racine.removeHandler(h)
        h.close()
    for f in TMP.glob("soulglade.log*"):
        f.unlink()
    logs.setup(level=level, log_dir=TMP)


try:
    # ------------------------------------------------- [1] la classification
    print("[1] chaque famille d'exception a son niveau et sa pile")
    repartir()
    LOG = logging.getLogger("test")

    logs.report(LOG, ValueError("scene inconnue"), "/api/run")
    t = journal()
    verifie("WARNING" in t and "ValueError — scene inconnue" in t,
            "un refus (ValueError) part en WARNING")
    verifie("Traceback" not in t,
            "un refus n'ecrit PAS de pile (elle n'apprendrait rien)")
    verifie("/api/run" in t, "le contexte donne accompagne le message")

    repartir()
    logs.report(LOG, RuntimeError("ComfyUI injoignable"), "demarrage")
    t = journal()
    verifie("ERROR" in t and "Traceback" not in t,
            "un probleme d'environnement (RuntimeError) : ERROR, sans pile")

    repartir()
    logs.report(LOG, OSError("disque plein"))
    verifie("ERROR" in journal() and "Traceback" not in journal(),
            "une OSError est classee avec l'environnement, pas avec les bugs")

    repartir()
    try:
        {"preset": 1}["absent"]
    except KeyError as e:
        logs.report(LOG, e, "/api/plan")
    t = journal()
    verifie("ERROR" in t, "un imprevu (KeyError) part en ERROR")
    verifie("Traceback" in t and "test_logs.py" in t,
            "un imprevu ecrit sa PILE COMPLETE — le seul moyen de le situer")

    repartir()
    msg = logs.report(LOG, ValueError("texte a l'ecran"), "/api/x")
    verifie(msg == "/api/x : ValueError — texte a l'ecran",
            "report rend la ligne destinee a l'ecran, pas seulement au fichier")

    # ------------------------------------------------------ [2] la rotation
    print("\n[2] le fichier tourne au lieu de remplir le disque")
    taille = logs.MAX_BYTES
    try:
        logs.MAX_BYTES = 2000
        repartir()
        for i in range(200):
            LOG.info(f"ligne de production numero {i} " + "x" * 60)
        verifie((TMP / "soulglade.log.1").exists(),
                "au-dela de la taille fixee, un .1 apparait")
        verifie((TMP / "soulglade.log").stat().st_size < 4000,
                "le journal courant repart petit (il n'a pas grossi sans fin)")
        verifie(len(list(TMP.glob("soulglade.log.*"))) <= logs.BACKUPS,
                f"jamais plus de {logs.BACKUPS} archives conservees")
    finally:
        logs.MAX_BYTES = taille

    # -------------------------------------------------------- [3] le niveau
    print("\n[3] le niveau se regle sans toucher au code")
    repartir(level="WARNING")
    LOG.info("progression banale")
    LOG.warning("quelque chose n'a pas eu lieu")
    t = journal()
    verifie("progression banale" not in t and "quelque chose" in t,
            "a WARNING, l'INFO ne s'ecrit plus")

    avant = os.environ.get("SOULGLADE_LOG_LEVEL")
    try:
        os.environ["SOULGLADE_LOG_LEVEL"] = "DEBUG"
        repartir(level=None)                       # niveau lu dans l'environnement
        LOG.debug("detail de mise au point")
        verifie("detail de mise au point" in journal(),
                "SOULGLADE_LOG_LEVEL=DEBUG est lu par setup()")
    finally:
        if avant is None:
            os.environ.pop("SOULGLADE_LOG_LEVEL", None)
        else:
            os.environ["SOULGLADE_LOG_LEVEL"] = avant

    print("\n[4] setup() est idempotent")
    repartir()
    combien = len(logging.getLogger().handlers)
    logs.setup()                                   # deja installe : ne refait rien
    verifie(len(logging.getLogger().handlers) == combien,
            "un second setup() ne double pas les handlers (ni les lignes)")

    # --------------------------------------- [5] les deux seams, et l'anneau
    print("\n[5] les deux points de passage ecrivent, sans se dedoubler")
    repartir()
    import runner as lb                            # noqa: E402
    lb.log("batch 20260909_1200 : 3 image(s) a produire")
    verifie("3 image(s) a produire" in journal(),
            "runner.log() ecrit au fichier (39 appels, aucun modifie)")

    repartir()
    import shared_state as ss                      # noqa: E402
    ss.STATE["log"] = []
    ss.push_log("1/3 portrait : OK")
    verifie("1/3 portrait : OK" in journal(),
            "push_log() ecrit au fichier (64 appels, aucun modifie)")
    verifie(any("1/3 portrait" in ligne for ligne in ss.STATE["log"]),
            "push_log() remplit toujours l'anneau affiche a l'ecran")

    repartir()
    ss.STATE["log"] = []
    ligne = logs.report(LOG, ValueError("scene absente"), "/api/run")
    ss.push_log(ligne, journal=False)
    verifie(journal().count("scene absente") == 1,
            "une erreur deja passee par report() n'est PAS reecrite par push_log")
    verifie(any("scene absente" in x for x in ss.STATE["log"]),
            "...mais elle arrive quand meme a l'ecran")

finally:
    logging.shutdown()
    shutil.rmtree(TMP, ignore_errors=True)

print("\n" + "=" * 70)
print("tout est vert" if not KO else f"{KO} ECHEC(S)")
print("=" * 70)
sys.exit(1 if KO else 0)
