"""Shapes shared by several modules."""
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class ActionResponse(BaseModel):
    """The universal answer of an action route, `{ok: bool, erreur?: str}`.

    AUDIT §5.4: the convention holds on 4xx and 5xx too — `api.js` reads a JSON
    body on every response, whatever the status.

    ALWAYS DECLARE IT WITH `response_model_exclude_unset=True`. The old handlers
    returned `{"ok": true}` and nothing else on success; a plain response_model
    would add `"erreur": null` to every one of them. Harmless to `erreurDe()`,
    which only tests `ok === false` — but this migration is meant to keep the
    bodies identical, and a shape that drifts once drifts twice.
    """
    model_config = ConfigDict(extra="allow")

    ok: bool
    erreur: Optional[str] = None


class ErrorResponse(BaseModel):
    """What every rejection looks like. `erreur` is French: it is displayed to
    the user verbatim (AUDIT §5.5)."""
    ok: bool = False
    erreur: str


# Attached to the routes so the OpenAPI page shows the real rejection shape
# instead of FastAPI's default `{detail: ...}`.
ERROR_RESPONSES = {
    400: {"model": ErrorResponse, "description": "Requête refusée"},
}


# ------------------------------------------------------------------ render trials
# The same scene at the same seed, with and without what is tried: a tone
# (routers/expression.py) or a light (routers/lights.py, IT-10 7 bis).
class TrialStarted(BaseModel):
    ok: bool
    id: str
    seed: int


class TrialResult(BaseModel):
    model_config = ConfigDict(extra="allow")

    verdict: str
    score: Optional[float] = None
    measures: dict[str, float] = Field(default_factory=dict)


class TrialState(BaseModel):
    """The character's current or last trial of one kind (`ton`, `lumiere`).
    `results` is keyed by label — `sans_ton`, `fragment_seul`, the tone's key;
    `sans_lumiere`, `avec_lumiere`. `tone` or `light` says what was tried, and
    `sentence` the light's sentence. Paths never leave the server."""
    model_config = ConfigDict(extra="allow")

    id: str
    kind: str = "ton"
    scene: str
    seed: int
    running: bool
    tone: str = ""
    light: str = ""
    sentence: str = ""
    results: dict[str, TrialResult] = Field(default_factory=dict)


class TrialResponse(BaseModel):
    essai: Optional[TrialState] = None
