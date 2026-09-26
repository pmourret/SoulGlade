"""Light catalogue — a scene lighting reused from one scene to the next
(IT-10 chantier 7).

    GET  /api/lighting        the platform vocabulary a studio sheet is made of
    GET  /api/lights          this character's lights, layered and resolved
    POST /api/lights/create   a new light, character or world side
    POST /api/lights/save     its label, text and/or sheet
    POST /api/lights/delete   drops the light, or only this character's tweak
    GET  /api/light-effects   the user's own effects (7 bis), layered
    POST /api/light-effects/create|save|delete   the same three verbs
    POST /api/lights/essai    render one scene at one seed, without then with
                              the sheet as it is on screen (7 bis)
    GET  /api/lights/essai    that trial's state and measures
    GET  /api/lights/essai/image/{label}   one of its two images

A scene wears a light through its `light` field or a variant line
« @<key> », resolved before the prompt assembler (`lights.resolve_bank`).
`import lights` is the core module (`AUTOMATION/lights.py`), the same
arrangement as `routers/outfits.py`. Nothing here is blocking: no executor.
"""
from fastapi import APIRouter
from fastapi.responses import FileResponse, JSONResponse

import layered_catalog
import lights
import shared_state as ss

from ..dependencies import RequiredCharacterId
from ..schemas.common import ERROR_RESPONSES, TrialResponse, TrialStarted
from ..schemas.lights import (
    LightCreateRequest, LightDeleteResponse, LightEffectCreateRequest,
    LightEffectResponse, LightEffectSaveRequest, LightEffectsResponse,
    LightingVocabulary, LightKeyRequest, LightResponse, LightSaveRequest,
    LightsResponse, LightTrialRequest,
)
from ..services.batch import start_light_trial, trial_image, trial_state

router = APIRouter(responses=ERROR_RESPONSES)


def _refus(message, status=400):
    return JSONResponse({"ok": False, "erreur": message}, status_code=status)


def _setup(model):
    return model.model_dump(exclude_none=True) if model is not None else None


@router.get("/api/lighting", response_model=LightingVocabulary,
            summary="Vocabulaire de la lumière (plateforme)")
async def get_lighting():
    """Settings, effects, palette and starting schemes — the same for every
    character, so no `character` parameter."""
    return lights.vocabulary()


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
                              to_world=payload.au_monde, setup=_setup(payload.setup))
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
    if payload.setup is not None:
        fields["setup"] = _setup(payload.setup)
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


# ------------------------------------------------ the user's own effects (7 bis)
@router.get("/api/light-effects", response_model=LightEffectsResponse,
            summary="Effets de lumière de ce personnage")
async def get_light_effects(character_id: RequiredCharacterId):
    """The world's effects, adjusted by this character, plus its own — offered
    next to the platform's in a light's sheet."""
    return {"effects": lights.effects(character_id)}


@router.post("/api/light-effects/create", response_model=LightEffectResponse,
             summary="Créer un effet de lumière")
async def create_light_effect(payload: LightEffectCreateRequest,
                              character_id: RequiredCharacterId):
    try:
        entry = lights.create_effect(character_id, payload.label, payload.fragment,
                                     to_world=payload.au_monde)
    except lights.LightError as e:
        return _refus(str(e))
    ss.push_log(f"effet de lumière créé : {entry['key']} ({entry['couche']})")
    return {"ok": True, "effect": entry}


@router.post("/api/light-effects/save", response_model=LightEffectResponse,
             summary="Ajuster un effet de lumière")
async def save_light_effect(payload: LightEffectSaveRequest,
                            character_id: RequiredCharacterId):
    fields = {k: v for k, v in (("label", payload.label), ("fragment", payload.fragment))
              if v is not None}
    if not fields:
        return _refus("rien à enregistrer")
    try:
        entry = lights.save_effect(character_id, payload.key.strip(), fields,
                                   to_world=payload.au_monde)
    except lights.LightError as e:
        return _refus(str(e))
    ss.push_log(f"effet de lumière {payload.key!r} ajusté ({', '.join(fields)})"
                + (" dans le monde" if payload.au_monde else ""))
    return {"ok": True, "effect": entry}


@router.post("/api/light-effects/delete", response_model=LightDeleteResponse,
             summary="Retirer un effet de lumière")
async def delete_light_effect(payload: LightKeyRequest, character_id: RequiredCharacterId):
    """Refused while a light's sheet carries it."""
    try:
        couche = lights.delete_effect(character_id, payload.key.strip())
    except lights.LightError as e:
        return _refus(str(e))
    ss.push_log(f"effet de lumière {payload.key!r} retiré ({couche})")
    return {"ok": True, "couche": couche}


# ------------------------------------------------------------------ render trial
@router.post("/api/lights/essai", response_model=TrialStarted,
             responses={409: {"description": "Un batch tourne déjà"}},
             summary="Essai de rendu d'une lumière : même scène, même graine, sans puis avec")
async def start_light_trial_route(payload: LightTrialRequest, character_id: RequiredCharacterId):
    """Same guard as /api/run and the tone trial: no `await` between the
    `running` test and the launch, so two requests cannot both pass it."""
    if ss.STATE["running"]:
        return JSONResponse({"ok": False, "erreur": "un batch tourne deja"}, status_code=409)
    try:
        trial_id = start_light_trial(character_id, payload.scene, payload.key.strip(),
                                     _setup(payload.setup), payload.text, payload.seed)
    except ValueError as e:
        return _refus(str(e))
    return {"ok": True, "id": trial_id, "seed": ss.STATE["essai"]["seed"]}


@router.get("/api/lights/essai", response_model=TrialResponse,
            summary="État de l'essai de lumière du personnage")
async def get_light_trial(character_id: RequiredCharacterId):
    return {"essai": trial_state(character_id, "lumiere")}


@router.get("/api/lights/essai/image/{label}", summary="Une image de l'essai de lumière",
            responses={404: {"description": "Pas d'image pour ce libellé"}})
async def get_light_trial_image(label: str, character_id: RequiredCharacterId):
    path = trial_image(character_id, label, "lumiere")
    if not path:
        return _refus("aucune image d'essai pour ce libellé", 404)
    return FileResponse(path, media_type="image/png")
