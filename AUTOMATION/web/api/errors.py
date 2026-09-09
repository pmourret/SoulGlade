"""Every response leaves as JSON, never as an HTML page.

Port of the `garde_erreurs` aiohttp middleware. It is a set of exception
handlers here rather than a middleware because that is where FastAPI lets you
intercept `RequestValidationError`, which did not exist under aiohttp: Pydantic
now rejects before the handler runs, and those rejections must keep the exact
status and body the old hand-written validation produced (400 with
`{ok, erreur}`), not FastAPI's default 422 with `{detail: [...]}`.

Mapping, one to one with the aiohttp middleware:

    HTTPException            -> passed through, body kept as-is
    JSONDecodeError          -> 400 « corps JSON invalide »
    KeyError/ValueError/
      TypeError              -> 400 « requête invalide : ... »
    anything else            -> 500 {ok: false, erreur: "<Type> : <msg>"}

Les statuts n'ont pas bougé le 09/09/2026 quand le journal est arrivé : ce que
`logs.report` décide, c'est le NIVEAU et la PILE, jamais le code de retour. Un
refus part en WARNING sans pile, un bug en ERROR avec la sienne — et l'écran
reçoit dans les deux cas le même corps qu'avant.

One deliberate difference, noted in the migration report: an HTTPException
raised WITHOUT the studio's body — Starlette's own 404 on an unrouted path, for
instance — used to come out as plain text under aiohttp. It is wrapped into
`{ok: false, erreur}` here, so the universal response shape of AUDIT §5.4 now
holds on those too. Nothing in the frontend read those bodies.
"""
import json
import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

import logs
import shared_state as ss

LOG = logging.getLogger("api")


def error_body(message):
    """The studio's error shape. French text: it is shown on screen verbatim."""
    return {"ok": False, "erreur": message}


def _readable(errors):
    """Pydantic errors -> the one-line French sentence the screen shows.

    Only the first problem is named. The old code raised on the first bad field
    too (`entier()` called `bad_request` and stopped), so reporting the whole
    list would be new information the screen has no place for.
    """
    if not errors:
        return "corps de requête invalide"
    first = errors[0]
    field = ".".join(str(p) for p in first.get("loc", ())
                     if p not in ("body", "query"))
    msg = first.get("msg", "valeur invalide")
    return f"« {field} » : {msg}" if field else msg


async def _http_exception(request: Request, exc: StarletteHTTPException):
    detail = exc.detail
    # `BadRequest` (and anything else raised through `ss.bad_request`) already
    # carries the studio's shape — hand it over untouched.
    body = detail if isinstance(detail, dict) and "ok" in detail \
        else error_body(detail if isinstance(detail, str) else "erreur")
    # Le chemin de refus le PLUS emprunte du serveur — `ss.bad_request()` passe
    # par ici — et il n'ecrivait nulle part avant le 09/09/2026 : un ecran
    # disait « non », et il ne restait rien pour savoir a quelle requete. Un
    # refus est un WARNING sans pile (famille 1, AUTOMATION/logs.py) ; l'ecran,
    # lui, recoit exactement le meme corps qu'avant.
    LOG.warning(f"{request.url.path} : {exc.status_code} — {body.get('erreur')}")
    return JSONResponse(body, status_code=exc.status_code,
                        headers=getattr(exc, "headers", None))


async def _validation_error(request: Request, exc: RequestValidationError):
    """422 -> 400, in the studio's shape.

    Two branches, matching the two the aiohttp middleware had:
      - an unreadable body. FastAPI wraps `json.JSONDecodeError` into a
        RequestValidationError of type `json_invalid`, so the JSONDecodeError
        branch of `garde_erreurs` lives here now, same message;
      - a field of the wrong type — what `int(v)` used to raise as ValueError
        inside the handler, e.g. `count: "beaucoup"` on /api/plan.
    """
    errors = exc.errors()
    if any(e.get("type") == "json_invalid" for e in errors):
        return JSONResponse(error_body("corps JSON invalide"), status_code=400)
    # Un corps refusé n'est pas un incident : WARNING sans pile, comme tout
    # refus (famille 1 de la classification, AUTOMATION/logs.py). Pas de
    # `logs.report` ici — il n'y a pas d'exception métier à classer, seulement
    # une liste de champs invalides que Pydantic a déjà nommés.
    raison = _readable(errors)
    LOG.warning(f"{request.url.path} : corps refusé — {raison}")
    ss.push_log(f"{request.url.path} : corps refusé — {raison}", journal=False)
    return JSONResponse(error_body(f"requête invalide : {raison}"),
                        status_code=400)


async def _bad_value(request: Request, exc: Exception):
    """KeyError / ValueError / TypeError raised INSIDE a handler.

    Still reachable after the move to Pydantic: an unknown action in
    /api/action, a scene describing the face making `build_jobs` raise
    FaceInPromptError... The schemas cover the shape of a payload, not what the
    business layer does with it.
    """
    # 400 dans les trois cas, comme avant — mais pas le même journal. Une
    # `ValueError` est un refus (WARNING, pas de pile) ; un `KeyError` ou un
    # `TypeError` ont beau se répondre en 400, ils ont la forme d'un bug et
    # `logs.report` leur donne leur pile. C'est exactement ce qui manquait :
    # `KeyError — 'preset'` sur un écran, et rien nulle part pour dire d'où.
    ss.push_log(logs.report(LOG, exc, request.url.path), journal=False)
    return JSONResponse(error_body(f"requête invalide : {exc}"), status_code=400)


async def _json_decode_error(request: Request, exc: json.JSONDecodeError):
    return JSONResponse(error_body("corps JSON invalide"), status_code=400)


async def _unhandled(request: Request, exc: Exception):
    """Le fourre-tout : par construction, ce qui arrive ici est imprévu.

    Avant le 09/09/2026 il n'en restait qu'une ligne dans l'anneau d'écran, et
    la pile partait sur la console d'uvicorn — perdue à la fermeture de la
    fenêtre. `logs.report` la range dans LOGS/soulglade.log, sauf pour un
    `RuntimeError` ou une `OSError`, qui sont un problème d'environnement
    (ComfyUI éteint, disque plein) et dont la pile n'apprend rien.
    """
    ss.push_log(logs.report(LOG, exc, request.url.path), journal=False)
    return JSONResponse(error_body(f"{type(exc).__name__} : {exc}"),
                        status_code=500)


def install_error_handlers(app: FastAPI):
    """Wire the handlers above. Order of registration does not matter: FastAPI
    dispatches on the exception class, most specific first."""
    app.add_exception_handler(StarletteHTTPException, _http_exception)
    app.add_exception_handler(RequestValidationError, _validation_error)
    # JSONDecodeError subclasses ValueError — register it first so a body the
    # business layer parses itself (/api/scenes reads `text`) keeps its own
    # message instead of the generic "requête invalide".
    app.add_exception_handler(json.JSONDecodeError, _json_decode_error)
    for kind in (KeyError, ValueError, TypeError):
        app.add_exception_handler(kind, _bad_value)
    app.add_exception_handler(Exception, _unhandled)
