# -*- coding: utf-8 -*-
"""Improve a prompt fragment with the local language model (IT-10 chantier 8).

One gesture for the user, three steps behind it: the language of the input is
detected, a non-English input is first translated faithfully, then the English
text is improved for its fragment type. An edit instruction is only
translated, never improved: improving it would change what the edit does
(measured 27/09, « unbutton the shirt » came back as « … bare midriff »).

The model only ever sees the fragment and the rules of its type. It never
receives a character, and so never the identity anchor (invariant 3).

The rules come from the bench of 27/09 on qwen3vl_4b, see
DOCS/cadrage/2026-09-27-it10-c8-amelioration-ia.md: a prose instruction makes
the model answer « user » or nothing, a framed one with a JSON answer works;
the first rules let it switch to the imperative, add a « She », and invent a
camera angle. The prompt carries NO example: under a user instruction, the
model returned the example itself, word for word, as the rewrite (27/09).
"""
import json
import logging
import re

import llm_local
import llm_server

log = logging.getLogger(__name__)

# Function words and accents: enough to tell a French fragment from an English
# one without a model call. 13 out of 13 on the bench of 27/09.
FRENCH_WORDS = frozenset(
    "le la les un une des du de et est dans sur avec sous pour pas elle il "
    "son sa ses au aux qui que en près devant derrière très ma mon".split())
FRENCH_ACCENTS = re.compile(r"[àâçéèêëîïôûùüÿœ]")


def looks_french(text):
    words = re.findall(r"[a-zàâçéèêëîïôûùüÿœ']+", text.lower())
    if not words:
        return False
    hits = sum(w in FRENCH_WORDS for w in words) + len(FRENCH_ACCENTS.findall(text.lower()))
    return hits / len(words) > 0.15


# What each fragment is, and what it must never describe. The keys are the
# contract with the interface (`EnhanceRequest.kind`).
KINDS = {
    "place": "a PLACE: the setting only (architecture, objects, atmosphere). "
             "Never a person, a body, an action or clothing.",
    "intention": "an INTENTION: the purpose and framing of the shot. "
                 "Never the setting, never the person's appearance.",
    "tone": "a TONE: mood, facial expression, light quality. Never the setting.",
    "scene": "a SCENE: what the subject does, the framing, the camera angle. "
             "Never the subject's physical identity (hair, face, age, ethnicity).",
    "pose": "a POSE: body position only (limbs, orientation, weight). Nothing else.",
    "light": "a LIGHT: source, direction, quality, color, reflections. Nothing else.",
    "outfit": "an OUTFIT: garments, materials, colors, fit. Never the body or the setting.",
}
EDIT = "edit"          # translated only, see the module docstring

TRANSLATE = """You translate image prompt fragments from French to English.

TEXT: %(text)s

Task: translate TEXT into English. Keep the exact meaning. Add nothing, remove nothing.

Answer with one JSON object and nothing else:
{"text": "<translation>"}
"""

# What every rewrite must keep, whatever the image model. The writing STYLE is
# not here: it is the dialect of the model family (PLATFORM/llm.json), after
# Maestro's per-model guides (27/09). ENRICHING is allowed, within the role of
# the fragment (Pierre, 27/09): under « add nothing », the Flux dialect left
# the model copying its input; what it adds shows in the comparison.
RULES = """- Keep every idea of OLD, each one in its own phrase. Drop nothing.
- Never euphemize or soften: explicit, adult or sensual words stay exactly as written.
- Add the concrete visual specifics the image model needs, consistent with OLD and within the role of this fragment only (no light in a pose, no person in a place): materials, textures, colors, spatial arrangement. Never change what happens, never add a person, never add style or quality words. Do not pad with generic phrases.
- Never an imperative ("stand", "capture").
- No subject at the start: no "she", "he", "the woman".
- English only, at most 40 words per fragment."""

IMPROVE = """You improve prompt fragments for an image generation model.

The fragment is %(what)s

OLD: %(text)s

Task: rewrite OLD to be more precise and visual.
%(rules)s

How this image model reads a prompt:
%(dialect)s
%(instruction)s
Answer with one JSON object and nothing else:
{"text": "<rewritten fragment>"}
"""

# « sa chemise » came back « her shirt » whatever the rule said (27/09): the
# model guesses a gender the platform does not know. Removed before the model
# sees it, « la chemise » can only become « the shirt ».
POSSESSIVES = {"son": "le", "sa": "la", "ses": "les"}
_POSSESSIVE = re.compile(r"\b(son|sa|ses)\b", re.I)


def neutral_possessives(text):
    return _POSSESSIVE.sub(lambda m: POSSESSIVES[m.group(1).lower()], text)


DIALECTS = llm_local.SETTINGS.get("dialects", {})


def dialect(family):
    """The writing rules of an image model family, as prompt lines. A family
    with no dialect written yet gets the generic one: adding a family is its
    own iteration, and writes its dialect (skill `nouvel-pack`)."""
    rules = DIALECTS.get(family or "") or DIALECTS.get("generic") or []
    return "\n".join(f"- {r}" for r in rules)


_ANSWER = re.compile(r'"text"\s*:\s*("(?:[^"\\]|\\.)*")')


def _ask(prompt, temperature, comfy_url):
    """llama-server first (step 3 bis), ComfyUI when it cannot answer: the
    user never sees which engine spoke, only a slower answer."""
    try:
        raw = llm_server.chat(prompt, temperature=temperature, max_tokens=200)
    except llm_server.Unavailable as e:
        log.warning("enhance: fallback to ComfyUI (%s)", e)
        raw = llm_local.texte(prompt, comfy_url=comfy_url, temperature=temperature,
                              max_length=200, client_id="enhance")
    m = _ANSWER.search(raw or "")
    text = " ".join(json.loads(m.group(1)).split()).strip(" ,.") if m else ""
    if not text:
        raise llm_local.LLMError(f"réponse illisible du modèle local : « {(raw or '')[:80]} »")
    return text


# Words that carry no idea of their own: their absence is not a loss.
FUNCTION_WORDS = frozenset(
    "the and with from into onto over under for its their her his them that this "
    "very some any more most just while near across behind between around "
    # the subject pronouns the rules forbid: dropping them is the point
    "she him they".split())
STEM = 5          # « illuminating » and « illuminates » are the same idea


def lost_words(before, after):
    """Words of `before` whose stem no word of `after` starts with, in order.

    Measured 27/09: at any temperature the model softened adult fragments by
    dropping « naked », « sensual », « just after a shower », and no rule in
    the prompt stopped it. The loss is checked here instead of hoped away."""
    kept = re.findall(r"[a-z]+", after.lower())
    lost = []
    for w in re.findall(r"[a-z]+", before.lower()):
        if (len(w) >= 3 and w not in FUNCTION_WORDS and w not in lost
                and not any(k.startswith(w[:STEM]) for k in kept)):
            lost.append(w)
    return lost


RETRY = """
Your previous rewrite dropped these words of OLD: %(lost)s.
Rewrite OLD again and keep every one of them.
"""


# Maestro's wording for a user instruction appended to its enhancer guide.
INSTRUCTION = """
Follow these additional user instructions with higher priority if they conflict with the rules above:
%s
"""


def enhance(kind, text, comfy_url=None, family=None, instruction="", vary=False):
    """{"text", "translated", "lost"} for a fragment of `kind` (KINDS, or "edit").

    `lost` lists the words of the input the proposal still drops after one
    retry that names them: the interface says so, the user decides. With an
    `instruction` — the AI panel's free text, which outranks the rules —
    dropping words may be the very request (« plus court »): the lost words
    are reported, never retried. `vary` asks for another version, at a freer
    temperature. `family` is the model family of the character's pack — the
    only thing the model ever learns about the character.

    Raises ValueError on a bad request, `llm_local.LLMError` when the model
    fails: the gesture was asked for, its failure is shown."""
    text = " ".join((text or "").split())
    if not text:
        raise ValueError("rien à améliorer : le champ est vide")
    if kind != EDIT and kind not in KINDS:
        raise ValueError(f"type de fragment inconnu « {kind} »")
    translated = looks_french(text)
    if translated:
        text = _ask(TRANSLATE % {"text": neutral_possessives(text)}, 0.2, comfy_url)
    if kind == EDIT:
        return {"text": text, "translated": translated, "lost": []}
    instruction = " ".join((instruction or "").split())
    prompt = IMPROVE % {"what": KINDS[kind], "text": text, "rules": RULES,
                        "dialect": dialect(family),
                        "instruction": INSTRUCTION % instruction if instruction else ""}
    temperature = 0.7 if vary else 0.2
    improved = _ask(prompt, temperature, comfy_url)
    lost = lost_words(text, improved)
    if lost and not instruction:
        improved = _ask(prompt + RETRY % {"lost": ", ".join(lost)}, temperature, comfy_url)
        lost = lost_words(text, improved)
    return {"text": improved, "translated": translated, "lost": lost}


# The three fragments of a composer scene, and the kind each one is.
SCENE_PARTS = {"base": "scene", "light": "light", "pose": "pose"}


def enhance_scene(fragments, instruction="", only=None, vary=False, comfy_url=None, family=None):
    """The AI panel of the composer (IT-10 chantier 8, step 3): each non-empty
    fragment improved on its own, under the same instruction.

    ONE CALL PER FRAGMENT, NO CONTEXT, measured 27/09 on qwen3vl_4b: the three
    fragments in one JSON answer came back copied, and a « vary » gave the same
    text three times; each fragment seeing the other two wrote the light into
    the pose and the action, which the assembler would then say three times.
    Alone, each keeps its role, and a « vary » is a real other version.

    `only` names the one fragment to rewrite; the others, and every empty
    fragment, come back unchanged.
    {"base", "light", "pose", "translated", "lost": {part: [words]}}."""
    if only is not None and only not in SCENE_PARTS:
        raise ValueError(f"fragment inconnu « {only} »")
    parts = {k: " ".join((fragments.get(k) or "").split()) for k in SCENE_PARTS}
    targets = [k for k in ([only] if only else SCENE_PARTS) if parts[k]]
    if not targets:
        raise ValueError("rien à améliorer : la scène est vide")
    out = {**parts, "translated": False, "lost": {k: [] for k in SCENE_PARTS}}
    for k in targets:
        r = enhance(SCENE_PARTS[k], parts[k], comfy_url, family=family,
                    instruction=instruction, vary=vary)
        out[k] = r["text"]
        out["lost"][k] = r["lost"]
        out["translated"] = out["translated"] or r["translated"]
    return out
