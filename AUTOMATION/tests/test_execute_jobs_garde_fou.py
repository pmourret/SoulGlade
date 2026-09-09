# -*- coding: utf-8 -*-
"""`execute_jobs` : un job qui leve n'emporte pas le lot (09/09/2026).

POURQUOI CE TEST EXISTE. Avant le 09/09, seules les erreurs de ComfyUI
(`queue`/`wait`) devenaient un verdict ERREUR. Tout le reste du corps du job
— `api_for` et la resolution de ses roles, le QC d'identite, l'expression, le
grain, les mesures, le rangement, l'export — remontait tel quel : un lot de
40 images mourait a la 12e, et emportait aussi son journal, `append_log`
n'etant appele qu'APRES la boucle. C'est exactement le mode de panne qu'une
semaine de production ne doit pas connaitre (IT-4, et le critere de sortie V1
« aucun crash silencieux »).

Deux chemins couverts, un de chaque cote de la generation :
  [1] `api_for` leve            — le role manquant / ambigu dans le graphe ;
  [2] `mesurer_realisme` leve   — n'importe quel traitement d'apres-coup.

Aucun appel a ComfyUI : un faux `runner` depose un vrai PNG minuscule sous
COMFY_OUTPUT, comme le ferait ComfyUI. `checker=None` (ni InsightFace ni cv2
ne sont necessaires ici) — meme montage que test_execute_jobs_sink.py.

Lancer :  python AUTOMATION\\tests\\test_execute_jobs_garde_fou.py
"""
import shutil
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
AUTOMATION = HERE.parent
OFM = AUTOMATION.parent
sys.path.insert(0, str(AUTOMATION))

import runner as lb                      # noqa: E402
from runner import sortie, COMFY_OUTPUT  # noqa: E402

KO = 0


def verifie(ok, texte):
    global KO
    print(f"  {'ok   ' if ok else 'ECHEC'} {texte}")
    if not ok:
        KO += 1


CID = "probe_garde_fou"
PROD_CID = OFM / "PROD" / CID.upper()
JOURNAL = OFM / "PROD" / "journal_batch.csv"

CFG = {"comfy_url": "http://127.0.0.1:8188", "base_gelee": "x.png",
       "preset": {"grain_telephone": False, "expression": False},
       "export": {"enabled": True, "format": "jpg", "quality": 92},
       "export_sizes": {"1:1": [512, 512]}, "formats": {"1:1": [512, 512]},
       "qc": {"threshold_ok": 0.5, "threshold_watch": 0.3}}


def _job(seed):
    return {"character_id": CID, "scene": "probe_garde", "category": "probe",
            "intention": "probe", "tone": "", "intensity": 0, "outfit": "",
            "format": "1:1", "variant": "", "index": 1,
            "prompt": "prompt de test", "fragments": [], "seed": seed,
            "overrides": {}, "pose": None}


class _StubRunner:
    """Depose un vrai PNG la ou execute_jobs ira le chercher. `boom_seed` fait
    lever `api_for` pour CE seed uniquement — le graphe dont un role manque."""

    def __init__(self, boom_seed=None):
        self.n = 0
        self.boom_seed = boom_seed

    def api_for(self, job, batch_id):
        if job["seed"] == self.boom_seed:
            raise RuntimeError(
                "verrou PuLID-Flux : role « pulid_apply » introuvable")
        return {}

    def queue(self, api):
        from PIL import Image
        self.n += 1
        name = f"garde_fou_{self.n}.png"
        Image.new("RGB", (8, 8), (30, 140, 90)).save(COMFY_OUTPUT / name)
        self._name = name
        return "fake_prompt_id", None

    def wait(self, prompt_id, timeout=900):
        return [{"filename": self._name, "subfolder": ""}], None, 0.05


_VRAI_REALISME = sortie.mesurer_realisme

try:
    print("=" * 70)
    print("execute_jobs : un job qui leve n'emporte pas le lot")
    print("=" * 70)

    # -------------------------------------- [1] api_for leve sur le job du milieu
    print("\n[1] `api_for` leve sur le 2e des 3 jobs")
    vus = []
    rows, stats = lb.execute_jobs(
        [_job(101), _job(102), _job(103)], CFG, checker=None,
        batch_id="probe-garde-1", character_id=CID,
        runner=_StubRunner(boom_seed=102),
        on_event=lambda kind, **kw: vus.append(kind) if kind == "done" else None)

    verifie(len(vus) == 3,
            f"les 3 jobs sont alles au bout de la boucle ({len(vus)} vus)")
    verifie(stats["ERREUR"] == 1, f"1 seul ERREUR compte ({stats['ERREUR']})")
    verifie(stats["OK"] == 2, f"les 2 autres sont produits ({stats['OK']})")
    verifie(len(rows) == 2, f"2 lignes de journal rendues ({len(rows)})")
    verifie(JOURNAL.is_file()
            and any(f";{CID};" in l
                    for l in JOURNAL.read_text(encoding="utf-8").splitlines()),
            "le journal du lot est ecrit malgre le job perdu")

    # ------------------------- [2] un traitement d'apres-coup leve (mesures)
    print("\n[2] `mesurer_realisme` leve sur le 2e des 3 jobs")

    def _realisme_qui_leve(path, bbox):
        _realisme_qui_leve.n += 1
        if _realisme_qui_leve.n == 2:
            raise ValueError("cv2 absent")
        return _VRAI_REALISME(path, bbox)

    _realisme_qui_leve.n = 0
    sortie.mesurer_realisme = _realisme_qui_leve
    vus2 = []
    rows2, stats2 = lb.execute_jobs(
        [_job(201), _job(202), _job(203)], CFG, checker=None,
        batch_id="probe-garde-2", character_id=CID, runner=_StubRunner(),
        on_event=lambda kind, **kw: vus2.append(kind) if kind == "done" else None)

    verifie(len(vus2) == 3,
            f"les 3 jobs sont alles au bout de la boucle ({len(vus2)} vus)")
    verifie(stats2["ERREUR"] == 1, f"1 seul ERREUR compte ({stats2['ERREUR']})")
    verifie(stats2["OK"] == 2, f"les 2 autres sont ranges ({stats2['OK']})")

    print("\n" + "=" * 70)
    print("tout est vert" if not KO else f"{KO} ECHEC(S)")
    print("=" * 70)
finally:
    sortie.mesurer_realisme = _VRAI_REALISME
    shutil.rmtree(PROD_CID, ignore_errors=True)
    shutil.rmtree(OFM / "PROD" / "EXPORT" / CID, ignore_errors=True)
    if JOURNAL.is_file():
        lignes = JOURNAL.read_text(encoding="utf-8").splitlines(keepends=True)
        propre = [l for l in lignes if f";{CID};" not in l]
        if propre != lignes:
            JOURNAL.write_text("".join(propre), encoding="utf-8")
    try:
        import base
        with base.ouvrir() as cx:
            cx.execute("DELETE FROM image WHERE character_id = ?", (CID,))
            cx.execute("DELETE FROM batch WHERE character_id = ?", (CID,))
            cx.commit()
    except Exception:
        pass
    try:
        import mesures as mes
        d = mes.charger()
        propre = {k: v for k, v in d.items() if not k.startswith("probe_garde_")}
        if propre != d:
            mes._ecrire(propre)
    except Exception:
        pass

sys.exit(1 if KO else 0)
