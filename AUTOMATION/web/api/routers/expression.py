"""Facial expression editor.

    POST /api/expression/preview   render trial params on an already-produced
                                    photo, WITHOUT saving anything
    POST /api/expression/tone      save one tone's expression RANGE into
                                    creative.json
    POST /api/tones/essai           render one scene at one seed, without and
                                    with a tone (IT-10), out of production
    GET  /api/tones/essai           that trial's state and measures
    GET  /api/tones/essai/image/{label}   one of its two images

Both are character-scoped through `RequiredCharacterId`: the preview never
reads outside this character's `PROD/` tree (`bucket_dir`), the save never
writes outside this character's `creative.json`
(`tests/test_expression_isolation.py`).
"""
import asyncio

from fastapi import APIRouter
from fastapi.responses import FileResponse, JSONResponse, Response

import expression
import shared_state as ss

from ..dependencies import RequiredCharacterId
from ..schemas.common import ActionResponse, ERROR_RESPONSES
from ..schemas.expression import (
    ExpressionPreviewRequest, ExpressionToneSaveRequest, ToneTrialRequest,
    ToneTrialResponse, ToneTrialStarted,
)
from ..services.batch import start_tone_trial, trial_image, trial_state
from ..services.expression import (
    render_expression_preview, resolve_photo, save_tone_expression,
)

router = APIRouter(responses=ERROR_RESPONSES)


@router.post("/api/expression/preview",
             responses={404: {"description": "Photo introuvable"},
                       503: {"description": "ComfyUI hors ligne"}},
             summary="Aperçu d'une expression sur une photo déjà produite, sans l'enregistrer")
async def preview_expression(payload: ExpressionPreviewRequest, character_id: RequiredCharacterId):
    """Runs the render in an executor: the ComfyUI round-trip uses blocking
    urllib (same reason as `/api/pose/extract` — a blocking call in an async
    handler freezes the whole server).

    Order matters: the photo is resolved (character isolation) BEFORE
    `comfy_alive()` is even asked — see `resolve_photo`'s own note."""
    try:
        path = resolve_photo(character_id, payload.bucket, payload.space, payload.name)
    except FileNotFoundError as e:
        return JSONResponse({"ok": False, "erreur": str(e)}, status_code=404)
    if not await ss.comfy_alive():
        return JSONResponse({"ok": False, "erreur": "ComfyUI hors ligne"}, status_code=503)
    params = payload.params.model_dump(exclude_none=True)
    try:
        png, score = await asyncio.get_running_loop().run_in_executor(
            None, render_expression_preview, character_id, path, params)
    except expression.RenderError as e:
        return JSONResponse({"ok": False, "erreur": str(e)}, status_code=400)
    except Exception as e:
        # Caught HERE, deliberately, rather than left to fall through to
        # api/errors.py's generic handler: an exception raised inside
        # `run_in_executor` that reaches the OUTER handler instead of being
        # caught in the route hangs the response under
        # `LocalOriginGuardMiddleware` (Starlette's `BaseHTTPMiddleware` has
        # a known bad interaction with an executor exception surfacing past
        # the endpoint that awaited it) — confirmed live: the client got a
        # 500 whose BODY never arrived, and the next request on that
        # dashboard hung too. Every other route already wrapping
        # `run_in_executor` (`/api/pose/extract`) catches its own specific
        # exception locally for the same reason; this is the same fix for a
        # failure this route cannot enumerate in advance (e.g. a missing
        # `cv2` in the interpreter — `qc_identity.py`, not this module).
        ss.push_log(f"/api/expression/preview : {type(e).__name__} — {e}")
        return JSONResponse({"ok": False, "erreur": f"{type(e).__name__} : {e}"}, status_code=500)
    headers = {"X-Identity-After": f"{score:.4f}"} if score is not None else {}
    return Response(content=png, media_type="image/png", headers=headers)


@router.post("/api/expression/tone", response_model=ActionResponse,
             response_model_exclude_unset=True,
             summary="Enregistrer la plage d'expression d'un ton")
async def save_expression_tone(payload: ExpressionToneSaveRequest, character_id: RequiredCharacterId):
    params = payload.params.model_dump(exclude_none=True)
    try:
        save_tone_expression(character_id, payload.tone, params)
    except ValueError as e:
        ss.bad_request(str(e))
    ss.push_log(f"expression du ton {payload.tone!r} enregistrée ({character_id})")
    return {"ok": True}


# ------------------------------------------------------------------ tone trial
@router.post("/api/tones/essai", response_model=ToneTrialStarted,
             responses={409: {"description": "Un batch tourne déjà"}},
             summary="Essai de rendu d'un ton : même scène, même graine, sans puis avec")
async def start_trial(payload: ToneTrialRequest, character_id: RequiredCharacterId):
    """Same guard as /api/run, for the same reason: no `await` between the
    `running` test and the launch, so two requests cannot both pass it."""
    if ss.STATE["running"]:
        return JSONResponse({"ok": False, "erreur": "un batch tourne deja"}, status_code=409)
    try:
        trial_id = start_tone_trial(character_id, payload.scene, payload.tone, payload.seed)
    except ValueError as e:
        ss.bad_request(str(e))
    return {"ok": True, "id": trial_id, "seed": ss.STATE["essai"]["seed"]}


@router.get("/api/tones/essai", response_model=ToneTrialResponse,
            summary="État de l'essai de ton du personnage")
async def get_trial(character_id: RequiredCharacterId):
    return {"essai": trial_state(character_id)}


@router.get("/api/tones/essai/image/{label}", summary="Une image de l'essai de ton",
            responses={404: {"description": "Pas d'image pour ce libellé"}})
async def get_trial_image(label: str, character_id: RequiredCharacterId):
    path = trial_image(character_id, label)
    if not path:
        return JSONResponse({"ok": False, "erreur": "aucune image d'essai pour ce libellé"},
                            status_code=404)
    return FileResponse(path, media_type="image/png")
