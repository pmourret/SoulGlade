# -*- coding: utf-8 -*-
"""The one place logging is configured: a rotating file, a console that did
not change, and one classification of exceptions.

WHY THIS MODULE EXISTS. Until 09/09/2026 nothing was ever written to disk:
`runner.log()` printed, `shared_state.push_log()` filled a 200-line ring shown
on screen, and the stack of an unforeseen exception went to the uvicorn console
— which closes with the window. A batch that lost its 12th image out of 40 was
noticed, never diagnosed. See DOCS/cadrage/2026-09-09-logs-structures.md.

WHAT IT IS NOT. No JSON lines, no dependency (`structlog`, `loguru`), no
correlation id, no remote sink: one machine, one user, a file read by eye.

TWO AUDIENCES, TWO JOURNALS, KEPT APART.
  - the user's journal is `push_log()` — French, on screen, the story of the
    batch. It stays exactly what it is;
  - this one is the developer's. Same messages, plus everything the screen
    never showed: levels, module names, full dates, stacks.

THE COMMAND-LINE BORDER. A tool prints, a library logs. `wf_check.py`,
`tools/*`, `env_config --diagnostic`, the `--dry-run` plan and everything in
`tests/` keep their `print`: that output IS their result, not an execution
event.

SETUP IS EXPLICIT. The four entry points call `setup()` first — web/app.py,
runner/cli.py, and the command lines of comfy_server.py / comfy_provision.py. A
module that logs without it is silent, exactly as the standard library behaves
— never a file created behind the caller's back, which importing `runner` from
a test would otherwise do.
"""
import logging
import logging.handlers
import sys
from pathlib import Path

import env_config

LOG_DIR = Path(__file__).resolve().parent.parent / "LOGS"
LOG_FILE = LOG_DIR / "soulglade.log"
MAX_BYTES = 1_000_000          # ~8000 lines of batch, a week of production
BACKUPS = 5                    # soulglade.log.1 ... .5, then the oldest goes

_INSTALLED = False


def setup(level=None, log_dir=None):
    """Install the handlers on the ROOT logger. Idempotent, cheap to re-call.

    The root logger on purpose, not a "soulglade" one: uvicorn's own loggers
    (`uvicorn.error` and the ASGI traceback it raises) propagate to root once
    `web/app.py` passes `log_config=None`. Configuring a private logger would
    leave those on stderr, i.e. out of the file, i.e. lost — which is the very
    thing this module exists to stop.

    `level` and `log_dir` are for the test; production reads the environment.
    """
    global _INSTALLED
    if _INSTALLED and level is None and log_dir is None:
        return logging.getLogger()
    level = (level or env_config.log_level()).upper()
    directory = Path(log_dir) if log_dir else LOG_DIR
    directory.mkdir(parents=True, exist_ok=True)

    to_file = logging.handlers.RotatingFileHandler(
        directory / LOG_FILE.name, maxBytes=MAX_BYTES, backupCount=BACKUPS,
        encoding="utf-8")
    to_file.setFormatter(logging.Formatter(
        "%(asctime)s %(levelname)-7s %(name)s : %(message)s"))

    # The console keeps the format `runner.log()` has always printed —
    # `[14:32:07] message` — so a production window looks identical to what it
    # looked like before this module existed. Only the file is verbose.
    # `reconfigure`: a Windows console is cp1252 and the studio's messages are
    # French ("identité", "…"). Without this, logging swallows the record and
    # prints "--- Logging error ---" instead. Absent under a captured stdout,
    # hence the guard.
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except (AttributeError, OSError, ValueError):
        pass
    to_console = logging.StreamHandler(sys.stdout)
    to_console.setFormatter(logging.Formatter("[%(asctime)s] %(message)s",
                                              "%H:%M:%S"))

    root = logging.getLogger()
    root.setLevel(level)
    for old in list(root.handlers):
        root.removeHandler(old)
        old.close()
    root.addHandler(to_file)
    root.addHandler(to_console)
    _INSTALLED = True
    return root


def report(logger, exc, context=""):
    """Log an exception by FAMILY, and give back the one line for the screen.

    The families are the ones the repo already lived by without writing them
    down — 18 hand-made exceptions, `ValueError` for a refusal and
    `RuntimeError` for an impossible operation. What is new is that the family
    now decides the level and, above all, the stack:

        ValueError & co     refusal      WARNING, no stack — the caller asked
                                         wrong, the stack says nothing new
        RuntimeError, OSError
                            environment  ERROR, no stack — ComfyUI is down, a
                                         model is missing: the stack is noise
        anything else       bug          ERROR + full stack — unforeseen by
                                         construction, and the stack is the
                                         only thing that will explain it

    It deliberately says nothing about HTTP status: `api/errors.py` keeps
    answering exactly what it answered before. A stack on "ComfyUI is off" is
    noise; its absence on an unexpected KeyError is a lost investigation.

    A best-effort failure (export, writing to base, a thumbnail) is a CALLER's
    decision, not a class of exception: those sites call `logger.warning()`
    themselves and say so in the message.
    """
    message = f"{type(exc).__name__} — {exc}"
    if context:
        message = f"{context} : {message}"
    if isinstance(exc, ValueError):
        logger.warning(message)
    elif isinstance(exc, (RuntimeError, OSError)):
        logger.error(message)
    else:
        logger.error(message, exc_info=True)
    return message
