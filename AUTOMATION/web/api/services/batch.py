"""The run supervisor: one launch path, one state, one panel.

WHAT THIS MODULE OWNS. Everything between « the routes agreed to launch » and
« the runner is executing »: arming `ss.STATE`, the log header, pushing the
blocking work off the event loop, relaying each output to the live strip, and
putting the state back to rest whatever happens.

WHAT IT DOES NOT OWN. It does not decide whether a launch is allowed
(services/creative.py) and it does not execute anything itself: `lb.execute_jobs`
and `nsfw_batch.run` stay the only two cores, called by the CLI just the same
(§8.2). This module hands them jobs and reports.

TWO INVARIANTS THAT LIVE HERE, AND NOWHERE ELSE.

  - ONE launch path. `start_batch` serves /api/run AND /api/decline;
    `start_edit_batch` is its edit counterpart, on the SAME state and the SAME
    panel. Duplicating either block is how two behaviours start drifting apart.
  - ONE run state. `ss.STATE` is a process global of the single uvicorn worker
    and is always reached through the module object, never imported by name —
    `_launch`'s `finally` is what guarantees a crashed batch does not leave the
    interface stuck on « running ».

The level-3 chaining hook is here too: it is not a rule (it decides nothing) but
a stage of the run, handed to `execute_jobs` as `after=`.
"""
import asyncio
import logging
import random
from datetime import datetime
from types import SimpleNamespace

import logs
import nsfw_batch
import runner as lb
import shared_state as ss
from runner.sortie import Sink
from .creative import apply_tier_rules, is_edit_tier

LOG = logging.getLogger("batch")


def nsfw_chaining_hook(configuration, use_qc, batch_id, character):
    """Level-3 hook: edit the SFW output, with no intermediate sorting.

    Returns None when the batch is not level 3. The guards do not move: the
    output goes to PROD/<CID>/_NSFW, it is never exported, and `editer` checks
    the arming a second time.
    """
    level = configuration.get("_intensity", 0)
    tier = lb.by_level(lb.load_creative(character), level)
    if not is_edit_tier(tier):
        return None
    instruction = configuration.get("_edit_instruction", "")
    state = {"runner": None, "rows": []}

    allowed = configuration.get("nsfw", {}).get("chainer_si", ["OK", "A_REVOIR"])

    def hook(job, verdict, dest):
        # The NSFW stage RE-RENDERS the face from the frozen base (PuLID +
        # FaceDetailer): measured 24/08/2026 over 9 chainings, identity gains
        # +0.028 on average, 8 times out of 9. A slightly low source therefore
        # very often produces a compliant output. Refusing on the OK verdict
        # alone rejected work that succeeds. We only cut below the watch band,
        # or when no face was detected: there, PuLID has nothing coherent to
        # catch up on.
        if verdict not in allowed:
            ss.push_log(f"{dest.name} : passe SFW {verdict}, édition non enchaînée")
            return
        if state["runner"] is None:               # built only once
            state["runner"] = nsfw_batch.NsfwRunner(configuration, character)
        result, row = nsfw_batch.editer(
            dest, instruction, configuration, ss.checker_partage(configuration) if use_qc else None,
            runner=state["runner"], batch_id=batch_id, character_id=character)
        if row:
            state["rows"].append(row)
            nsfw_batch.journal([row], character)
            sc = f" ({result['score']:.3f})" if result.get("score") else ""
            ss.push_log(f"→ NSFW {result['fichier']} : {result['verdict']}{sc} "
                        f"— {result['duree']:.0f}s")
            # the live strip only showed the SFW pass: at level 3 we were
            # therefore looking at the intermediate image, never the produced one
            ss.STATE["recent"].append({"bucket": result["verdict"],
                                       "name": result["fichier"],
                                       "scene": f"{job['scene']} · édité",
                                       "space": "nsfw", "score": result.get("score")})
            del ss.STATE["recent"][:-24]
        else:
            ss.push_log(f"→ NSFW échec sur {dest.name} : {result.get('error')}")

    return hook


def run_batch_blocking(jobs, configuration, batch_id, use_qc, character):
    if use_qc:
        ss.checker_partage(configuration)

    def on_event(kind, **kw):
        if kind == "start":
            ss.STATE.update(index=kw["index"], total=kw["total"],
                            current=f"{kw['job']['scene']} ({kw['job']['format']})")
        else:
            job, r = kw["job"], kw["result"]
            if r["verdict"] == "ERREUR":
                ss.push_log(f"{kw['index']}/{kw['total']} {job['scene']} : ECHEC — "
                            f"{r.get('error')}")
            else:
                sc = f" ({r['score']:.3f})" if r.get("score") else ""
                ss.push_log(f"{kw['index']}/{kw['total']} {job['scene']} : "
                            f"{r['verdict']}{sc} — {r['duree']:.0f}s")
                # the batch's space, never a hardcoded 'sfw': since 21/09 a
                # tier that does not export GENERATES into the NSFW space, and
                # the « recent » panel points at the tree holding the image
                ss.STATE["recent"].append({"bucket": r["verdict"], "name": r["fichier"],
                                           "scene": job["scene"],
                                           "space": lb.espace_de(configuration),
                                           "score": r.get("score")})
                del ss.STATE["recent"][:-24]

    rows, stats = lb.execute_jobs(jobs, configuration,
                                  ss.checker_partage(configuration) if use_qc else None, batch_id,
                                  character_id=character, on_event=on_event,
                                  should_stop=lambda: ss.STATE["stop"],
                                  after=nsfw_chaining_hook(configuration, use_qc,
                                                           batch_id, character))
    return stats


def _launch(work):
    """Common execution loop: `work()` off the event loop.

    Files the stats away, surfaces the error to the screen, and puts STATE back
    to rest whatever happens. Shared by production and editing: that is what
    guarantees a single batch runs, and that a single panel shows it.
    """
    async def runner():
        try:
            stats = await asyncio.get_running_loop().run_in_executor(None, work)
            ss.STATE["stats"] = stats
            ss.push_log("termine — " + " | ".join(f"{k} {v}" for k, v in stats.items() if v))
        except Exception as e:                       # surface the error on screen
            # Le lot entier est tombe — pas une image (execute_jobs encaisse
            # celle-la). C'est le dernier filet avant le silence : la pile part
            # au fichier via `logs.report`, le message reste identique a
            # l'ecran et dans `last_error`, que le chrome affiche meme apres
            # avoir quitte l'ecran Creer.
            logs.report(LOG, e, "lot interrompu")
            ss.push_log(f"ERREUR : {type(e).__name__} — {e}", journal=False)
            ss.STATE["last_error"] = {
                "at": datetime.now().strftime("%H:%M:%S"),
                "msg": f"{type(e).__name__} — {e}"}
        finally:
            ss.STATE.update(running=False, current=None)

    asyncio.create_task(runner())


def edit_batch_blocking(sources, instruction, configuration, use_qc, character):
    """Editing already validated images, on the same STATE as production."""
    if use_qc:
        ss.checker_partage(configuration)

    def on_event(kind, **kw):
        if kind == "start":
            ss.STATE.update(index=kw["index"], total=kw["total"], current=kw["source"])
        else:
            r = kw["result"]
            if r["verdict"] == "ERREUR":
                ss.push_log(f"{kw['index']}/{kw['total']} {kw['source']} : ECHEC — "
                            f"{r.get('error')}")
            else:
                sc = f" ({r['score']:.3f})" if r.get("score") else ""
                ss.push_log(f"{kw['index']}/{kw['total']} {kw['source']} : "
                            f"{r['verdict']}{sc} — {r['duree']:.0f}s")
                # space nsfw: the output lives in PROD/<CID>/_NSFW, /img looks there
                ss.STATE["recent"].append({"bucket": r["verdict"], "name": r["fichier"],
                                           "scene": kw["source"], "space": "nsfw",
                                           "score": r.get("score")})
                del ss.STATE["recent"][:-24]

    return nsfw_batch.run(sources, instruction, configuration,
                          ss.checker_partage(configuration) if use_qc else None, on_event,
                          should_stop=lambda: ss.STATE["stop"],
                          character_id=character)[1]


def start_edit_batch(sources, instruction, configuration, use_qc, level, character):
    """Launches an edit. Counterpart of `start_batch`, same state, same panel."""
    batch_id = datetime.now().strftime("%Y%m%d_%H%M%S")
    ss.STATE.update(running=True, stop=False, batch_id=batch_id, index=0,
                    total=len(sources), current=None, stats={}, recent=[],
                    intensity=level, character=character, last_error=None,
                    edition=True,
                    started_at=datetime.now().isoformat(timespec="seconds"))
    ss.push_log(f"édition {batch_id} — {len(sources)} image(s) déjà validée(s) "
                f"· sortie dans PROD/{character.upper()}/_NSFW · hors export")
    ss.push_log(f"instruction : {instruction[:100]}")
    for a in nsfw_batch.alertes_instruction(instruction):
        ss.push_log(f"  ! {a}")
    _launch(lambda: edit_batch_blocking(sources, instruction, configuration, use_qc,
                                        character))
    return batch_id


def start_batch(jobs, configuration, use_qc, character, header=None):
    """Starts a batch and returns its identifier. ONE launch path.

    Used by /api/run (production) and /api/decline (refinement loop).
    Duplicating this block guarantees two behaviours that drift apart.
    """
    batch_id = datetime.now().strftime("%Y%m%d_%H%M%S")
    ss.STATE.update(running=True, stop=False, batch_id=batch_id, index=0,
                    total=len(jobs), current=None, stats={}, recent=[],
                    character=character, last_error=None, edition=False,
                    started_at=datetime.now().isoformat(timespec="seconds"))
    p = configuration["preset"]
    # the REQUESTED level, not the generation pass's: at level 3 the jobs are
    # built in Soft, and announcing « Soft » would mislead
    requested = configuration.get("_intensity", jobs[0]["intensity"])
    tier = lb.by_level(lb.load_creative(character), requested)
    ss.STATE["intensity"] = requested
    exported = "" if not tier or tier.get("export", True) else " · hors export"
    ss.push_log(header or (f"batch {batch_id} — intensite "
                           f"« {tier['label'] if tier else '?'} »"
                           + (f" · ton {jobs[0]['tone']}" if jobs[0]["tone"] else "")
                           + exported))
    ss.push_log(f"batch {batch_id} — {len(jobs)} image(s) · guidance {p['guidance']} · "
                f"refiner {'ON' if p['refiner'] else 'OFF'} · "
                f"detail {'ON' if p['facedetailer'] else 'OFF'} · "
                f"grain {'ON' if p['grain_export'] else 'OFF'}")

    _launch(lambda: run_batch_blocking(jobs, configuration, batch_id, use_qc,
                                       character))
    return batch_id


# ------------------------------------------------------------------ tone trial
# IT-10, 25/09. The same scene at the same seed, WITHOUT and WITH a tone: the
# gesture that found `joueur`'s « slight motion blur » by hand. It runs as a
# batch like any other — same STATE, same panel, same single-GPU lock through
# `_launch` — and through `execute_jobs` (§8.2), but with a `Sink`: the images
# land under PROD/<CID>/_BENCH/, out of the Revue, the export and the
# production tables, like the bench's.

TRIAL_WITHOUT = "sans_ton"


def trial_jobs(character, scene, tone, seed):
    """The two jobs of a trial, or [] when the scene does not resolve at the
    base level. Only the tone differs between them."""
    jobs = []
    for label, tone_key in ((TRIAL_WITHOUT, None), (tone, tone)):
        filters = SimpleNamespace(scene=[scene], category=None, format=None, count=1,
                                  limit=1, seed=seed, no_variants=True, tone=tone_key,
                                  intention=None, intensity=0)
        built = lb.build_jobs(lb.scenes_path(character), filters, character_id=character)
        if not built:
            return []
        jobs.append((label, {**built[0], "seed": seed}))
    return jobs


def start_tone_trial(character, scene, tone, seed=None):
    """Launches a tone trial and returns its id. Raises ValueError when the
    tone or the scene does not resolve — checked before STATE is armed."""
    if lb.by_key(lb.load_creative(character).get("tones", []), tone) is None:
        raise ValueError(f"ton inconnu : {tone!r}")
    seed = int(seed) if seed is not None else random.randint(1, 2**31 - 1)
    jobs = trial_jobs(character, scene, tone, seed)
    if not jobs:
        raise ValueError(f"scène introuvable au niveau de base : {scene!r}")

    trial_id = f"essai-ton-{datetime.now():%Y%m%d_%H%M%S}"
    configuration = ss.cfg(character)
    configuration["_intensity"] = 0
    apply_tier_rules(configuration, 0, character)
    root = lb.OFM / "PROD" / character.upper() / "_BENCH" / trial_id
    ss.STATE.update(running=True, stop=False, batch_id=trial_id, index=0, total=2,
                    current=None, stats={}, recent=[], intensity=0, character=character,
                    last_error=None, edition=False,
                    started_at=datetime.now().isoformat(timespec="seconds"))
    ss.STATE["essai"] = {"id": trial_id, "character": character, "scene": scene,
                         "tone": tone, "seed": seed, "results": {}}
    ss.push_log(f"essai de ton {trial_id} — « {scene} », sans ton puis « {tone} », "
                f"graine {seed} · hors production")

    def work():
        checker = ss.checker_partage(configuration)
        total = {"OK": 0, "A_REVOIR": 0, "REJET": 0, "ERREUR": 0}
        for index, (label, job) in enumerate(jobs, start=1):
            if ss.STATE["stop"]:
                break
            ss.STATE.update(index=index, current=f"{scene} · {label}")

            def record(job, verdict, score, reel, dest, label=label):
                ss.STATE["essai"]["results"][label] = {
                    "path": str(dest), "verdict": verdict, "score": score,
                    "measures": {k: v for k, v in (reel or {}).items()
                                 if isinstance(v, (int, float))}}

            _, stats = lb.execute_jobs([job], configuration, checker, f"{trial_id}-{label}",
                                       character_id=character,
                                       should_stop=lambda: ss.STATE["stop"],
                                       sink=Sink(dest_root=root / label, record=record))
            for k, v in (stats or {}).items():
                total[k] = total.get(k, 0) + v
        return total

    _launch(work)
    return trial_id


def trial_state(character):
    """The current (or last) trial of THIS character, without file paths —
    those stay on the server. None when there is none."""
    essai = ss.STATE.get("essai")
    if not essai or essai.get("character") != character:
        return None
    return {**{k: v for k, v in essai.items() if k != "results"},
            "running": bool(ss.STATE["running"]) and ss.STATE.get("batch_id") == essai["id"],
            "results": {label: {k: v for k, v in r.items() if k != "path"}
                        for label, r in essai["results"].items()}}


def trial_image(character, label):
    """The path of one image of THIS character's current trial, or None. The
    path comes from the server's own record, never from the request."""
    essai = ss.STATE.get("essai")
    if not essai or essai.get("character") != character:
        return None
    result = essai["results"].get(label)
    return result and result["path"]
