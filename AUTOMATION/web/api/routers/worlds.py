"""World registry and catalog.

    /api/worlds                     GET the registry, POST to create one (ADR-0016)
    /api/worlds/options              packs available to derive a new world from
    /api/worlds/{world_id}/places       GET the places (decors), POST to save them
    /api/worlds/{world_id}/intentions   GET the intentions, POST to save them
    /api/worlds/{world_id}/scenes       GET the scenes, POST to save them (ADR-0027)
    /api/worlds/{world_id}/tones    GET the tones, POST to save them (25/09)

These routes touch ONLY `WORLDS/<world_id>.json` files. They are a world
resource, not a character one — no `?character=` dependency, unlike every
other router here. `POST /api/scenes` (api/routers/bank.py) never writes
here, and this module never writes `CHARACTERS/<id>/scenes.json`: that split
IS the isolation guarantee (`tests/test_world_catalog_isolation.py`,
`tests/test_world_creation_isolation.py`).
"""
from fastapi import APIRouter
from fastapi.responses import JSONResponse

import shared_state as ss
import universe
import worlds

from ..schemas.common import ActionResponse, ERROR_RESPONSES
from ..schemas.worlds import (
    CatalogRejected, CreateWorldRequest, CreateWorldResponse, PackOption,
    SaveTonesRequest, SaveWorldIntentionsRequest, SaveWorldPlacesRequest,
    SaveWorldScenesRequest, TonesResponse, WorldIntentionsResponse,
    WorldListResponse, WorldOptionsResponse, WorldPlacesResponse,
    WorldScenesResponse, WorldSummary,
)
from ..services.worlds import (
    validate_intentions, validate_places, validate_scenes, validate_tones,
)

router = APIRouter(responses=ERROR_RESPONSES)


@router.get("/api/worlds", response_model=WorldListResponse,
            summary="Registre des mondes")
async def get_world_registry():
    """One row per `WORLDS/<id>.json` — the « Mondes » screen's registry.
    Mirrors `GET /api/characters` (state.py): listing only, no validation
    beyond what `worlds.list_worlds()` already scans."""
    out = []
    for wid in worlds.list_worlds():
        w = worlds.load_world(wid)
        out.append({"id": wid, "label": w.get("label", wid),
                    "compatible_families": w.get("compatible_families", []),
                    "tone": w.get("tone", ""),
                    "places_count": len(w.get("places", [])),
                    "intentions_count": len(w.get("intentions", [])),
                    "scenes_count": len(w.get("scenes", [])),
                    "tones_count": len(w.get("tones", []))})
    return {"worlds": out}


@router.get("/api/worlds/options", response_model=WorldOptionsResponse,
            summary="Packs proposables pour créer un monde")
async def get_world_options():
    """Packs to pick FROM when creating a world (ADR-0016) — never a family
    field: `compatible_families` is derived server-side from the chosen
    pack, the form never types it."""
    packs = [{"id": uid, "label": universe.load_universe(uid).get("label", uid),
             "family": universe.model_family(uid)}
            for uid in universe.list_universes()]
    return {"packs": packs}


@router.post("/api/worlds", response_model=CreateWorldResponse,
             summary="Créer un monde (catalogue vide, pack curaté)")
async def create_world(payload: CreateWorldRequest):
    """Writes a new `WORLDS/<id>.json` with EMPTY catalogs (ADR-0016). The pack is a proposal used once to derive
    `compatible_families`/`suggested_styles` — never a routing change:
    `universe.resolve()` is not touched, and neither is `CHARACTERS/` (this
    world is assigned to no character, ever, by this route)."""
    try:
        wid = worlds.create_world(
            payload.id.strip(), payload.label.strip(), payload.pack.strip(),
            payload.tone.strip())
    except (ValueError, FileExistsError) as e:
        ss.bad_request(str(e))
    ss.push_log(f"monde cree : {wid!r} (pack {payload.pack!r})")
    return {"ok": True, "id": wid}


def _refused(world_id, what, problems):
    ss.push_log(f"WORLDS/{world_id}.json {what} REFUSE — {problems[0]}")
    return JSONResponse({"ok": False, "erreur": problems[0],
                         "problemes": problems}, status_code=400)


@router.get("/api/worlds/{world_id}/places", response_model=WorldPlacesResponse,
            response_model_exclude_none=True, summary="Lieux (décors) d'un monde")
async def get_places(world_id: str):
    w = worlds.load_world(world_id)             # UnknownWorldError -> 400
    return {"world": world_id, "label": w.get("label", world_id),
            "places": worlds.places(world_id)}


@router.post("/api/worlds/{world_id}/places", response_model=ActionResponse,
             response_model_exclude_unset=True,
             responses={400: {"model": CatalogRejected, "description": "Lieux refusés"}},
             summary="Enregistrer les lieux d'un monde")
async def save_places(world_id: str, payload: SaveWorldPlacesRequest):
    """Replaces the world's WHOLE `places` list. A place a scene still uses
    cannot leave: the server says which scenes (ADR-0027)."""
    worlds.load_world(world_id)
    problems = validate_places(world_id, payload.places)
    if problems:
        return _refused(world_id, "places", problems)
    worlds.save_places(world_id, payload.places)
    ss.push_log(f"WORLDS/{world_id}.json : lieux enregistrés ({len(payload.places)})")
    return {"ok": True}


@router.get("/api/worlds/{world_id}/intentions", response_model=WorldIntentionsResponse,
            response_model_exclude_none=True, summary="Intentions d'un monde")
async def get_intentions(world_id: str):
    w = worlds.load_world(world_id)
    return {"world": world_id, "label": w.get("label", world_id),
            "intentions": worlds.intentions(world_id)}


@router.post("/api/worlds/{world_id}/intentions", response_model=ActionResponse,
             response_model_exclude_unset=True,
             responses={400: {"model": CatalogRejected, "description": "Intentions refusées"}},
             summary="Enregistrer les intentions d'un monde")
async def save_intentions(world_id: str, payload: SaveWorldIntentionsRequest):
    """Replaces the world's WHOLE `intentions` list. An intention a scene
    still carries cannot leave: the server says which scenes."""
    worlds.load_world(world_id)
    problems = validate_intentions(world_id, payload.intentions)
    if problems:
        return _refused(world_id, "intentions", problems)
    worlds.save_intentions(world_id, payload.intentions)
    ss.push_log(f"WORLDS/{world_id}.json : intentions enregistrées "
                f"({len(payload.intentions)})")
    return {"ok": True}


@router.get("/api/worlds/{world_id}/scenes", response_model=WorldScenesResponse,
            response_model_exclude_none=True,
            summary="Scènes d'un monde")
async def get_scenes(world_id: str):
    """`worlds.load_world` raises `UnknownWorldError` (a ValueError) on an
    unknown id — the generic ValueError handler turns that into a clean 400,
    nothing to catch here."""
    w = worlds.load_world(world_id)
    return {"world": world_id, "label": w.get("label", world_id),
            "scenes": worlds.scenes(world_id)}


@router.post("/api/worlds/{world_id}/scenes", response_model=ActionResponse,
             response_model_exclude_unset=True,
             responses={400: {"model": CatalogRejected,
                              "description": "Scènes refusées"}},
             summary="Enregistrer les scènes d'un monde")
async def save_scenes(world_id: str, payload: SaveWorldScenesRequest):
    """Replaces the world's WHOLE `scenes` list, like `POST /api/scenes`
    replaces a character's whole scene bank — same shape of contract, one
    level up. Affects every character composing in this world: the frontend
    warns before calling this, the server does not soften it."""
    worlds.load_world(world_id)             # UnknownWorldError -> 400
    problems = validate_scenes(world_id, payload.scenes)
    if problems:
        ss.push_log(f"WORLDS/{world_id}.json scenes REFUSE — {problems[0]}")
        return JSONResponse({"ok": False, "erreur": problems[0],
                             "problemes": problems}, status_code=400)
    worlds.save_scenes(world_id, payload.scenes)
    ss.push_log(f"WORLDS/{world_id}.json : scènes enregistrées "
               f"({len(payload.scenes)} scène(s))")
    return {"ok": True}


@router.get("/api/worlds/{world_id}/tones", response_model=TonesResponse,
            summary="Tons d'un monde")
async def get_tones(world_id: str):
    w = worlds.load_world(world_id)             # UnknownWorldError -> 400
    return {"world": world_id, "label": w.get("label", world_id),
            "tones": worlds.tones(world_id)}


@router.post("/api/worlds/{world_id}/tones", response_model=ActionResponse,
             response_model_exclude_unset=True,
             responses={400: {"model": CatalogRejected,
                              "description": "Tons refusés"}},
             summary="Enregistrer les tons d'un monde")
async def save_tones(world_id: str, payload: SaveTonesRequest):
    """Replaces the world's WHOLE `tones` list, same contract as `scenes`.
    A tone is created with its world (25/09); every character of the world
    inherits it, field by field under its own adjustments. A removed key
    breaks nothing: a scene that still lists it simply stops matching it."""
    worlds.load_world(world_id)
    problems = validate_tones(payload.tones)
    if problems:
        ss.push_log(f"WORLDS/{world_id}.json tones REFUSE — {problems[0]}")
        return JSONResponse({"ok": False, "erreur": problems[0],
                             "problemes": problems}, status_code=400)
    worlds.save_tones(world_id, payload.tones)
    ss.push_log(f"WORLDS/{world_id}.json : tons enregistrés "
                f"({len(payload.tones)} ton(s))")
    return {"ok": True}


# ------------------------------------------------------- branche adulte
# DEUX ROUTES JUMELLES, PAS UN DRAPEAU SUR LES PREMIERES. Un `?adulte=1` sur
# les routes ci-dessus aurait fait dependre d'un booleen de requete le fichier
# ecrit — et un booleen absent ecrit le mauvais. Deux chemins nommes rendent
# l'intention lisible dans le journal du serveur comme dans l'onglet reseau,
# et le catalogue adulte d'un monde reste un objet distinct (decision du
# 21/09, cadrage 2026-09-21-flux-nsfw arbitrage 3).
@router.get("/api/worlds/{world_id}/scenes-adulte", response_model=WorldScenesResponse,
            response_model_exclude_none=True,
            summary="Scènes adultes d'un monde")
async def get_scenes_adulte(world_id: str):
    """La branche adulte, vide si le monde n'en porte pas — ce qui est le
    cas nominal. Même forme de réponse que les scènes ordinaires : c'est le
    même objet, rangé ailleurs (ADR-0027 §6)."""
    w = worlds.load_world(world_id)
    return {"world": world_id, "label": w.get("label", world_id),
            "scenes": worlds.scenes_adulte(world_id)}


@router.post("/api/worlds/{world_id}/scenes-adulte", response_model=ActionResponse,
             response_model_exclude_unset=True,
             responses={400: {"model": CatalogRejected,
                              "description": "Scènes refusées"}},
             summary="Enregistrer les scènes adultes d'un monde")
async def save_scenes_adulte(world_id: str, payload: SaveWorldScenesRequest):
    """Remplace toute la branche adulte. MÊME VALIDATION que l'ordinaire —
    `validate_scenes`, sans variante : mêmes décors, mêmes intentions, et
    aucune clé de personnage. La nudité est la garde-robe du personnage à son
    palier natif, pas une livraison du monde (ADR-0014).

    Une liste vide retire le fichier : un monde cesse alors de porter une
    branche adulte, ce qui est un état légitime et pas une coquille."""
    worlds.load_world(world_id)             # UnknownWorldError -> 400
    problems = validate_scenes(world_id, payload.scenes)
    if problems:
        ss.push_log(f"WORLDS/{world_id}.adulte.json REFUSE — {problems[0]}")
        return JSONResponse({"ok": False, "erreur": problems[0],
                             "problemes": problems}, status_code=400)
    worlds.save_scenes_adulte(world_id, payload.scenes)
    ss.push_log(f"WORLDS/{world_id}.adulte.json : branche adulte enregistrée "
                f"({len(payload.scenes)} scène(s))")
    return {"ok": True}
