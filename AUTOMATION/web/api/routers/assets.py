"""Asset library — an imported image, classified, with the prompt fragment the
local vision model read on it (IT-10 chantier 5).

    GET  /api/assets          this character's library, each entry layered
    POST /api/assets/import   an image -> a classified asset and its fragment
    POST /api/assets/analyse  rewrites ONE asset's fragment from its image
    POST /api/assets/save     its label and/or fragment, character or world side
    POST /api/assets/delete   drops the asset, or only this character's tweak
    GET  /img/asset           the bytes of one asset OF THIS CHARACTER

`import assets` is the core module (`AUTOMATION/assets.py`), not this file:
routers is a package, so the bare name is the top-level module — the same
arrangement as `routers/expression.py`.

WHY THE IMAGE IS SERVED BY KEY AND NOT BY FILE NAME. `INPUTS/ASSETS/` is one
flat folder shared by every world and every character, like the pose bank. A
route taking a file name would serve any of them to anyone who guessed the
name; taking a `key` resolves through THIS character's library, so an asset
that is neither its world's nor its own comes out 404
(`tests/test_assets.py`).
"""
import asyncio
import base64
import logging

from fastapi import APIRouter, Query
from fastapi.responses import FileResponse, JSONResponse

import assets
import env_config
import llm_local
import logs
import shared_state as ss

from ..dependencies import RequiredCharacterId
from ..schemas.assets import (
    AssetDeleteResponse, AssetFragmentResponse, AssetImportRequest,
    AssetImportResponse, AssetKeyRequest, AssetSaveRequest, LibraryResponse,
)
from ..schemas.common import ERROR_RESPONSES

LOG = logging.getLogger("assets")

router = APIRouter(responses=ERROR_RESPONSES)


def _refus(message, status=400):
    return JSONResponse({"ok": False, "erreur": message}, status_code=status)


def _classes():
    return [{"key": k, "label": c["label"], "champ": c["champ"]}
            for k, c in assets.CLASSES.items()]


@router.get("/api/assets", response_model=LibraryResponse,
            summary="Bibliothèque d'assets de ce personnage")
async def get_library(character_id: RequiredCharacterId):
    """The world's assets, adjusted by this character, plus its own."""
    return {"assets": assets.bibliotheque(character_id), "classes": _classes()}


@router.post("/api/assets/import", response_model=AssetImportResponse,
             summary="Faire entrer une image dans le studio")
async def import_asset(payload: AssetImportRequest,
                       character_id: RequiredCharacterId):
    """An image in, an asset out — with the fragment the vision model read.

    ComfyUI offline does NOT refuse the import: the asset is born without a
    fragment and « Analyser » retries later. The import runs in an executor,
    like every other blocking call to ComfyUI (the 2005 ms measured on 24/08).
    """
    b64 = payload.data_base64 or ""
    if not b64:
        return _refus("aucune image reçue")
    try:
        data = base64.b64decode(b64, validate=True)
    except Exception:                                        # noqa: BLE001
        return _refus("image mal encodée")
    if len(data) > ss.TAILLE_MAX_PHOTO:
        return _refus("image trop lourde (20 Mo max)")
    try:
        entry = await asyncio.get_running_loop().run_in_executor(
            None, lambda: assets.importer(
                data, payload.filename, payload.classe.strip(), character_id,
                au_monde=payload.au_monde, comfy_url=env_config.comfy_url()))
    except assets.AssetError as e:
        return _refus(str(e))
    except Exception as e:                                   # noqa: BLE001
        # Large, DANS la route qui attend l'executor : une exception qui s'en
        # echappe ne delivre aucune reponse et bloque la requete suivante
        # (incident du 03/09 sur /api/expression/preview, `backend.md`).
        msg = logs.report(LOG, e, "import d'un asset")
        ss.push_log(msg, journal=False)
        return _refus(msg, 500)
    ss.push_log(f"asset importé : {entry['key']} ({entry['classe']}, "
                f"{entry['couche']})"
                + ("" if entry["fragment"] else " — sans fragment, à analyser"))
    return {"ok": True, "asset": entry}


@router.post("/api/assets/analyse", response_model=AssetFragmentResponse,
             responses={503: {"description": "ComfyUI hors ligne"}},
             summary="Relire l'image d'un asset")
async def analyse_asset(payload: AssetKeyRequest,
                        character_id: RequiredCharacterId):
    """Rewrites the fragment from the image. Asked for, so its failure is
    shown — unlike the silent attempt made at import."""
    key = payload.key.strip()
    if not await ss.comfy_alive():
        return _refus("ComfyUI hors ligne", 503)
    try:
        fragment = await asyncio.get_running_loop().run_in_executor(
            None, lambda: assets.analyser(character_id, key,
                                          env_config.comfy_url()))
    except assets.AssetError as e:
        return _refus(str(e))
    except llm_local.LLMError as e:
        ss.push_log(logs.report(LOG, e, f"analyse de l'asset {key}"), journal=False)
        return _refus(f"le modèle local n'a rien rendu : {e}")
    except Exception as e:                                   # noqa: BLE001
        msg = logs.report(LOG, e, f"analyse de l'asset {key}")
        ss.push_log(msg, journal=False)
        return _refus(msg, 500)
    ss.push_log(f"asset {key} relu : « {fragment[:60]} »")
    return {"ok": True, "fragment": fragment}


@router.post("/api/assets/save", response_model=AssetFragmentResponse,
             summary="Ajuster le libellé ou le fragment d'un asset")
async def save_asset(payload: AssetSaveRequest, character_id: RequiredCharacterId):
    """Writes this character's adjustment — or the world's own entry with
    `au_monde`, which only an asset the world owns accepts."""
    fields = {k: v.strip() for k, v in
              (("label", payload.label), ("fragment", payload.fragment))
              if v is not None}
    if not fields:
        return _refus("rien à enregistrer")
    try:
        assets.enregistrer(character_id, payload.key.strip(), fields,
                           au_monde=payload.au_monde)
    except assets.AssetError as e:
        return _refus(str(e))
    ss.push_log(f"asset {payload.key!r} ajusté ({', '.join(fields)})"
                + (" dans le monde" if payload.au_monde else ""))
    return {"ok": True, "fragment": fields.get("fragment", "")}


@router.post("/api/assets/delete", response_model=AssetDeleteResponse,
             summary="Retirer un asset")
async def delete_asset(payload: AssetKeyRequest, character_id: RequiredCharacterId):
    """Removes the asset from the layer it lives in. On an adjusted world
    asset only the adjustment goes — the world's asset comes back."""
    try:
        couche = assets.supprimer(character_id, payload.key.strip())
    except assets.AssetError as e:
        return _refus(str(e))
    ss.push_log(f"asset {payload.key!r} retiré ({couche})")
    return {"ok": True, "couche": couche}


@router.get("/img/asset", response_class=FileResponse,
            responses={404: {"description": "Absent de la bibliothèque de ce personnage"}},
            summary="Image d'un asset")
async def serve_asset(character_id: RequiredCharacterId,
                      key: str = Query("", description="Clé de l'asset")):
    try:
        entry = assets.trouver(character_id, key.strip())
    except assets.AssetError as e:
        return _refus(str(e), 404)
    path = assets.chemin(entry)
    if not path.is_file():
        return _refus("image introuvable", 404)
    return FileResponse(path)
