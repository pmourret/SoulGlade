"""Light catalogue — a scene lighting reused from one scene to the next
(IT-10 chantier 7).

    GET  /api/lights          this character's lights, layered and resolved
    POST /api/lights/create   a new light, character or world side
    POST /api/lights/save     its label and/or text
    POST /api/lights/delete   drops the light, or only this character's tweak

A scene wears a light through its `light` field or a variant line
« @<key> », resolved before the prompt assembler (`lights.resolve_bank`).
`import lights` is the core module (`AUTOMATION/lights.py`), the same
arrangement as `routers/outfits.py`. Nothing here is blocking: no executor.
"""
from fastapi import APIRouter
from fastapi.responses import JSONResponse

import layered_catalog
import lights
import shared_state as ss

from ..dependencies import RequiredCharacterId
from ..schemas.common import ERROR_RESPONSES
from ..schemas.lights import (
    LightCreateRequest, LightDeleteResponse, LightKeyRequest,
    LightResponse, LightSaveRequest, LightsResponse,
)

router = APIRouter(responses=ERROR_RESPONSES)


def _refus(message, status=400):
    return JSONResponse({"ok": False, "erreur": message}, status_code=status)


@router.get("/api/lights", response_model=LightsResponse,
            summary="Lumières de ce personnage")
async def get_lights(character_id: RequiredCharacterId):
    """The world's lights, adjusted by this character, plus its own."""
    return {"lights": lights.catalog(character_id), "marqueur": layered_catalog.MARKER}


@router.post("/api/lights/create", response_model=LightResponse,
             summary="Créer une lumière")
async def create_light(payload: LightCreateRequest, character_id: RequiredCharacterId):
    try:
        entry = lights.create(character_id, payload.label, payload.text,
                              to_world=payload.au_monde)
    except lights.LightError as e:
        return _refus(str(e))
    ss.push_log(f"lumière créée : {entry['key']} ({entry['couche']})")
    return {"ok": True, "light": entry}


@router.post("/api/lights/save", response_model=LightResponse,
             summary="Ajuster le libellé ou le texte d'une lumière")
async def save_light(payload: LightSaveRequest, character_id: RequiredCharacterId):
    """Writes this character's adjustment — or the world's own entry with
    `au_monde`, which only a light the world owns accepts."""
    fields = {}
    if payload.label is not None:
        fields["label"] = payload.label
    if payload.text is not None:
        fields["text"] = payload.text
    if not fields:
        return _refus("rien à enregistrer")
    try:
        entry = lights.save(character_id, payload.key.strip(), fields,
                            to_world=payload.au_monde)
    except lights.LightError as e:
        return _refus(str(e))
    ss.push_log(f"lumière {payload.key!r} ajustée ({', '.join(fields)})"
                + (" dans le monde" if payload.au_monde else ""))
    return {"ok": True, "light": entry}


@router.post("/api/lights/delete", response_model=LightDeleteResponse,
             summary="Retirer une lumière")
async def delete_light(payload: LightKeyRequest, character_id: RequiredCharacterId):
    """Removes the light from the layer it lives in — refused while a scene
    wears it. On an adjusted world light only the adjustment goes."""
    try:
        couche = lights.delete(character_id, payload.key.strip())
    except lights.LightError as e:
        return _refus(str(e))
    ss.push_log(f"lumière {payload.key!r} retirée ({couche})")
    return {"ok": True, "couche": couche}
