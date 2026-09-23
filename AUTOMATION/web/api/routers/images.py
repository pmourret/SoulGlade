"""Image bytes, thumbnails, pose skeletons.

Port of `routes/vignettes.py` — same 4 URLs, same bodies, same status codes.
Plus the pose EDITOR's own routes (2026-09-02), added at the end of this
file: keypoints/presets are JSON, not bytes, but they live here with the
rest of the pose bank rather than a new router for four routes.

    /img                serves an image of a sorting bucket (thumbnail on demand)
    /img/pose           serves a pose skeleton from INPUTS/POSE/
    /api/pose/extract   a photo -> an OpenPose skeleton
    /api/pose/delete    removes a skeleton
    /api/pose/keypoints the editable frame behind a skeleton PNG
    /api/pose/bank          every skeleton, with its label and provenance
    /api/pose/presets       starter templates for a pose made from scratch
    /api/pose/preset  GET   the frame of one starter template
    /api/pose/preset  POST  saves the current frame AS a new template
    /api/pose/save          renders + writes an edited or brand-new skeleton
    /api/pose/render        renders WITHOUT writing — an on-demand preview

`/static/*` is not here: it is mounted in api/main.py, with the rest of the
assembly, exactly as `web.static` was registered in web/app.py.
"""
import asyncio
import base64
import io
import logging
import re
from typing import Optional

from fastapi import APIRouter, Query
from fastapi.responses import FileResponse, JSONResponse, Response

import env_config
import logs
import pose_tools
import shared_state as ss

from ..dependencies import RequiredCharacterId
from ..schemas.common import ActionResponse, ERROR_RESPONSES
from ..schemas.images import (
    ImageNotFound, PoseBankResponse, PoseDeleteRequest, PoseExtractRequest,
    PoseExtractResponse, PosePresetSaveRequest, PosePresetSaveResponse,
    PosePresetsResponse, PoseRenderRequest, PoseSaveRequest, PoseSaveResponse,
)

LOG = logging.getLogger("images")

router = APIRouter(responses=ERROR_RESPONSES)

_IMAGE_RESPONSES = {
    200: {"content": {"image/png": {}, "image/jpeg": {}},
          "description": "Octets de l'image"},
    404: {"model": ImageNotFound, "description": "Absente de l'arbre du personnage"},
}


def _not_found(message):
    return JSONResponse({"ok": False, "erreur": message}, status_code=404)


@router.get("/img", response_class=FileResponse, responses=_IMAGE_RESPONSES,
            summary="Octets d'une image de tri")
async def serve_image(
        character_id: RequiredCharacterId,
        bucket: str = Query("OK", description="OK, A_REVOIR, REJET, SANS_VISAGE, ARCHIVE"),
        space: Optional[str] = Query(None, description="sfw (défaut) ou nsfw"),
        name: str = Query("", description="Nom de fichier, motif SAFE_NAME"),
        thumb: Optional[str] = Query(
            None, description="Non vide : servir la vignette 420×560 au lieu de "
                              "l'original. N'importe quelle valeur non vide "
                              "compte, « 0 » y compris."),
        v: Optional[str] = Query(
            None, description="Jeton de cache, IGNORÉ par le serveur. Voir la "
                              "note dans le code : il ne sert qu'à l'URL.")):
    """Bytes of an image from a sorting bucket. `character=` is MANDATORY here.

    This route serves character data: leaving it a default means serving Léna's
    images to whoever did not ask for them — which is exactly what happened
    before 29/08/2026, where Abyssiaelle's Review screen displayed Léna's
    gallery. A name that is not in the requested character's tree comes out as
    404, never through a fallback onto another tree.

    ┌── COUPLING TO PRESERVE — migration brief §4.1, AUDIT §5.6.1 ────────────┐
    │ `v` IS DECLARED SO THAT IT IS IGNORED, AND THAT IS THE WHOLE POINT.     │
    │                                                                         │
    │ `v` is the mtime of the bytes, produced by /api/gallery (see            │
    │ routers/review.py, same box) and appended to the URL by the single      │
    │ image-URL builder of the frontend, `imgUrl()` in static/api.js. The     │
    │ server has never read it and must never start: it exists solely to      │
    │ make the URL change when the bytes change.                              │
    │                                                                         │
    │ WHY IT EXISTS. Since the editor learned to overwrite its source         │
    │ (`/api/edit/save?remplacer`, F3.3), one file name can designate two     │
    │ different images. Without `v` in the URL the browser re-serves its      │
    │ cached copy and the screen shows the image from before, on a file that  │
    │ has changed.                                                            │
    │                                                                         │
    │ THREE WAYS TO BREAK IT, all silent — no error, just a stale image:      │
    │   - rejecting the parameter as unknown (a strict query model would);    │
    │   - reading it, and serving from a cache keyed on it;                   │
    │   - changing its format, or emitting it where /api/gallery does not     │
    │     (STATE.recent carries no `v`, and `imgUrl` then omits it — the URL  │
    │     stays character-for-character the one from before).                 │
    │                                                                         │
    │ It is declared here rather than left implicit so /docs states the       │
    │ contract, and so nobody "cleans up" an undeclared parameter.            │
    └─────────────────────────────────────────────────────────────────────────┘
    """
    cid = character_id
    space = ss.space_id(space)
    if not ss.SAFE_NAME.match(name):
        ss.bad_request("nom invalide")
    path = ss.bucket_dir(bucket, space, cid) / name
    if not path.exists():
        return _not_found("image introuvable")
    if thumb:
        tdir = ss.THUMBS / cid / space / bucket
        tdir.mkdir(parents=True, exist_ok=True)
        thumbnail = tdir / (path.stem + ".jpg")
        if not thumbnail.exists() or thumbnail.stat().st_mtime < path.stat().st_mtime:
            async with ss.VIGNETTES:
                # re-test under the lock: the grid asks for 200 thumbnails at
                # once, and several requests often target the same file
                if (not thumbnail.exists()
                        or thumbnail.stat().st_mtime < path.stat().st_mtime):
                    await asyncio.get_running_loop().run_in_executor(
                        None, ss._faire_vignette, path, thumbnail)
        path = thumbnail
    return FileResponse(path)


# Same alphabet as `ss.SAFE_NAME`, plus `webp`. `base_portrait.freeze()`
# accepts png/jpg/jpeg/webp, `SAFE_NAME` only the first three — a webp base
# would 404 for a reason that has nothing to do with the request. Widening
# `SAFE_NAME` itself would change what `/img` accepts for no reason, so the
# two alphabets stay separate. Neither allows a path separator, which is what
# makes this a traversal guard and not decoration.
_BASE_NAME = re.compile(r"^[A-Za-z0-9_.\-]+\.(png|jpg|jpeg|webp)$")


@router.get("/img/base", response_class=FileResponse, responses=_IMAGE_RESPONSES,
            summary="Portrait de base gelée du personnage courant")
async def serve_frozen_base(character_id: RequiredCharacterId):
    """Thumbnail of the CURRENT character's frozen identity base.

    ┌── WHY THIS ROUTE TAKES NO FILE NAME ────────────────────────────────────┐
    │ It is the whole design, not a convenience. The name is READ from that   │
    │ character's own `config.json` (`base_gelee`); the client cannot name a  │
    │ file, so it cannot name someone else's.                                 │
    │                                                                         │
    │ `ComfyUI/input/` is a FLAT, SHARED folder — 88 files on the reference   │
    │ machine, including `DEMORA_BASE.png` and `MILA_BASE.png`, bases of      │
    │ characters that are not even in the registry. A `?name=` parameter here │
    │ would hand every one of them to anyone who asked, which is the exact    │
    │ shape of the leak closed on 29/08/2026 (`bucket_dir()` returning        │
    │ PROD/LENA/ whoever asked, and `/img` with no `character`).              │
    │                                                                         │
    │ So: the identifier decides the path, never the client. Same rule as     │
    │ `serve_image` above, applied to a folder we do not own.                 │
    └─────────────────────────────────────────────────────────────────────────┘

    The names are legacy and arbitrary (`OFM_LENA_BASE_00025_.png`,
    `ABY_MAIN_REF.jpg`) — they are NOT derivable from the cid, which is why
    the config is read rather than the name rebuilt from `frozen_name()`.

    404 JSON when the character has no base, or when the file it names is
    gone: `FrozenBaseBrief.present` already tells the sheet which of the two
    it is, so this route does not have to.
    """
    cid = character_id
    name = (ss.cfg(cid) or {}).get("base_gelee") or ""
    if not _BASE_NAME.match(name):
        # No base declared, or a name we refuse to resolve. Same answer either
        # way: there is nothing to serve. The sheet falls back on the initial.
        return _not_found("aucune base gelée pour ce personnage")

    source = env_config.comfyui_input() / name
    if not source.is_file():
        return _not_found("base gelée introuvable dans les entrées de ComfyUI")

    # Thumbnail cached per character, beside the sorting ones. `base` is not a
    # bucket name, and cannot collide with one: buckets are upper-case.
    tdir = ss.THUMBS / cid / "base"
    thumbnail = tdir / (source.stem + ".jpg")
    try:
        if not thumbnail.exists() or thumbnail.stat().st_mtime < source.stat().st_mtime:
            tdir.mkdir(parents=True, exist_ok=True)
            async with ss.VIGNETTES:
                # re-test under the lock, like `serve_image`
                if (not thumbnail.exists()
                        or thumbnail.stat().st_mtime < source.stat().st_mtime):
                    await asyncio.get_running_loop().run_in_executor(
                        None, ss._faire_vignette, source, thumbnail)
    except Exception as exc:
        # A broad catch IN THE ROUTE THAT AWAITS IT (.claude/rules/backend.md):
        # an exception escaping an executor under LocalOriginGuardMiddleware
        # never delivers a response at all, and wedges the NEXT request too
        # (incident of 2026-09-03 on /api/expression/preview). An unreadable
        # base must degrade to « no portrait », never to a hung server.
        ss.push_log(logs.report(LOG, exc, f"vignette de la base gelée de {cid}"),
                    journal=False)
        return _not_found("base gelée illisible")

    return FileResponse(thumbnail)


@router.get("/img/pose", response_class=FileResponse, responses=_IMAGE_RESPONSES,
            summary="Squelette de pose")
async def serve_pose(
        name: str = Query("", description="Nom de fichier, motif SAFE_NAME")):
    """Thumbnail of a skeleton from INPUTS/POSE/, for the scene card's pose
    picker. No bucket here — it is a flat folder, not a sorting tree — so not
    the same path as `serve_image`. Files are small (~50 KB, transparent
    background): no resized thumbnail needed.

    No `character=` either, and that is not an oversight: the pose bank is
    shared by every character, like INPUTS/REALISME/ (AUDIT §5.2 lists the two
    global remainders).
    """
    if not ss.SAFE_NAME.match(name):
        ss.bad_request("nom invalide")
    path = pose_tools.POSE_DIR / name
    if not path.exists():
        return _not_found("squelette introuvable")
    return FileResponse(path)


@router.post("/api/pose/extract", response_model=PoseExtractResponse,
             responses={503: {"description": "ComfyUI hors ligne"}},
             summary="Photo -> squelette OpenPose")
async def extract_pose(payload: PoseExtractRequest):
    """A photo sent by the user -> an OpenPose skeleton, into INPUTS/POSE/.

    The only web entry point where a real photograph of a third party can
    arrive — see AUTOMATION/pose_tools.py, which guarantees it is never
    persisted.

    The extraction runs in an executor: `pose_tools.extraire` talks to ComfyUI
    with blocking urllib, and a blocking call in an async handler freezes the
    whole server (the 2005 ms measured on 24/08, see `comfy_alive`).
    """
    b64 = payload.data_base64 or ""
    name = payload.filename.strip()
    if not b64:
        return JSONResponse({"ok": False, "erreur": "aucune image reçue"},
                            status_code=400)
    try:
        data = base64.b64decode(b64, validate=True)
    except Exception:
        return JSONResponse({"ok": False, "erreur": "image mal encodée"},
                            status_code=400)
    if len(data) > ss.TAILLE_MAX_PHOTO:
        return JSONResponse({"ok": False, "erreur": "image trop lourde (20 Mo max)"},
                            status_code=400)
    if not await ss.comfy_alive():
        return JSONResponse({"ok": False, "erreur": "ComfyUI hors ligne"},
                            status_code=503)
    try:
        skeleton = await asyncio.get_running_loop().run_in_executor(
            None, pose_tools.extraire, data, name, env_config.comfy_url())
    except pose_tools.ExtractionError as e:
        return JSONResponse({"ok": False, "erreur": str(e)}, status_code=400)
    ss.push_log(f"squelette extrait : {skeleton}")
    return {"ok": True, "name": skeleton}


@router.post("/api/pose/delete", response_model=ActionResponse,
             response_model_exclude_unset=True,
             responses={404: {"description": "Squelette introuvable"}},
             summary="Retirer un squelette")
async def delete_pose(payload: PoseDeleteRequest):
    name = payload.name.strip()
    if not ss.SAFE_NAME.match(name):
        ss.bad_request("nom de fichier invalide")
    if not pose_tools.supprimer_pose(name):
        return JSONResponse({"ok": False, "erreur": "squelette introuvable"},
                            status_code=404)
    ss.push_log(f"squelette retiré : {name}")
    return {"ok": True}


@router.get("/api/pose/keypoints", summary="Points-clés d'un squelette")
async def get_pose_keypoints(
        name: str = Query("", description="Nom de fichier PNG, motif SAFE_NAME")) -> dict:
    """The editable frame behind a skeleton PNG (`pose_tools.charger_points`).

    No `response_model`: this layer relays a shape it does not own — same
    reasoning as `/api/config` (a model here would silently drop a key a
    future extraction adds). No `character=` either, same as every other
    pose route: the bank is shared by every character.
    """
    if not ss.SAFE_NAME.match(name):
        ss.bad_request("nom invalide")
    try:
        return pose_tools.charger_points(name)
    except pose_tools.ExtractionError as e:
        return JSONResponse({"ok": False, "erreur": str(e)}, status_code=404)


@router.get("/api/pose/bank", response_model=PoseBankResponse,
            summary="Squelettes de la banque, avec libellé et provenance")
async def get_pose_bank():
    """`poses: list[str]` on `/api/scenes` is enough for a picker (name +
    thumbnail); `PosesView.tsx`'s OWN grid additionally needs a label under
    each thumbnail and a provenance badge (gabarit / photo), which is why
    this is its own route rather than a change to the scenes bank shape
    every OTHER pose picker in the app also reads."""
    return {"poses": pose_tools.poses_disponibles_detail()}


@router.get("/api/pose/presets", response_model=PosePresetsResponse,
            summary="Gabarits de pose disponibles")
async def get_pose_presets():
    """Starter templates for a pose made from scratch — entirely synthetic
    coordinates (`AUTOMATION/pose_presets/`), never a real photo."""
    return {"presets": pose_tools.presets_disponibles()}


@router.get("/api/pose/preset", summary="Points-clés d'un gabarit")
async def get_pose_preset(
        nom: str = Query("", description="Nom du gabarit, sans extension")) -> dict:
    """Same shape as `/api/pose/keypoints`, for a preset instead of a saved
    pose — the editor's "new pose from scratch" flow loads this, then
    behaves exactly as if editing any other frame."""
    try:
        return pose_tools.charger_preset(nom)
    except pose_tools.ExtractionError as e:
        return JSONResponse({"ok": False, "erreur": str(e)}, status_code=404)


@router.post("/api/pose/preset", response_model=PosePresetSaveResponse,
             summary="Enregistrer le squelette courant comme gabarit réutilisable")
async def save_pose_preset(payload: PosePresetSaveRequest):
    """« Créer un template » sur une pose from-scratch — jamais appelée
    seule, toujours À CÔTÉ d'un `/api/pose/save` normal (voir
    `pose_tools.enregistrer_preset`). Le libellé devient le nom du fichier
    (slugifié) : un gabarit n'est jamais numéroté comme une pose, il se
    retrouve par son nom dans le sélecteur."""
    if not payload.keypoints.get("people"):
        ss.bad_request("points-clés manquants ou illisibles")
    if not payload.label.strip():
        ss.bad_request("un gabarit a besoin d'un nom")
    nom = pose_tools.enregistrer_preset(payload.keypoints, payload.label)
    ss.push_log(f"gabarit enregistré : {nom}")
    return {"ok": True, "nom": nom}


@router.post("/api/pose/save", response_model=PoseSaveResponse,
             summary="Enregistrer un squelette édité ou neuf")
async def save_pose(payload: PoseSaveRequest):
    """Renders `keypoints` locally (`pose_render` — no ComfyUI, no GPU, no
    job queue) and writes the PNG+JSON pair. See `PoseSaveRequest` for the
    name contract (plain overwrite when given, brand-new — "save as new"
    while editing an existing pose included — when omitted)."""
    name = (payload.name or "").strip()
    if name and not ss.SAFE_NAME.match(name):
        ss.bad_request("nom de fichier invalide")
    if not payload.keypoints.get("people"):
        ss.bad_request("points-clés manquants ou illisibles")
    written = pose_tools.enregistrer_points(payload.keypoints, nom=(name or None))
    ss.push_log(f"squelette enregistré : {written}")
    return {"ok": True, "name": written}


@router.post("/api/pose/render", responses=_IMAGE_RESPONSES,
             summary="Aperçu du rendu d'un squelette, sans l'enregistrer")
async def render_pose_preview(payload: PoseRenderRequest):
    """Same rendering as `/api/pose/save` (`pose_tools.rendre_apercu`, itself
    `pose_render` — no ComfyUI), but returns the PNG bytes directly and
    writes nothing to INPUTS/POSE/. The advanced editor's on-demand render,
    next to a reference photo — refreshed on request, not on every drag."""
    if not payload.keypoints.get("people"):
        ss.bad_request("points-clés manquants ou illisibles")
    image = pose_tools.rendre_apercu(payload.keypoints)
    buf = io.BytesIO()
    image.save(buf, format="PNG")
    return Response(content=buf.getvalue(), media_type="image/png")
