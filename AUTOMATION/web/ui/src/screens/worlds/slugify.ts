/* An identifier PROPOSED from a name (design-pass screen-11 §S7).

   A world id and a place id are both typed by hand today, in a field sitting
   right under the name that has just been typed — and « Terres sauvages »
   becomes `terres_sauvages` every single time. The proposal removes the
   transcription, not the choice: the field stays editable, and the moment it
   is edited by hand it stops following (that state lives in the form, not
   here).

   A FUNCTION, NOT A HOOK (`.claude/rules/frontend.md`): it computes, it holds
   nothing. It is tested without mounting React — `AUTOMATION/tests/test_slugify.js`.

   WHY NFD. `é`.toLowerCase() is `é`, not `e`: decomposing first turns it into
   `e` + a combining acute, and the acute is in the block stripped on the next
   line. Without it every accent would fall into the forbidden-character
   branch and become `_`, so « Café » would propose `caf_` rather than `cafe`. */

/** What a world id must match — the frontend mirror of `_WID_RE`
    (`AUTOMATION/worlds.py`). A letter first, then letters, digits, `-`, `_`. */
export const ID_RE = /^[a-z][a-z0-9_-]*$/

export function isValidId(id: string): boolean {
  return ID_RE.test(id)
}

/** The id this name proposes. Empty when the name holds nothing usable — the
    caller then shows no proposal rather than a lone prefix. */
export function slugify(name: string): string {
  const base = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_+|_+$/g, '')
  if (!base) return ''
  /* `ID_RE` wants a letter first, and a name may legitimately start with a
     digit (« 3 collines »). Prefixing is the only way to keep the whole name
     — dropping the leading digits would propose `collines` for two different
     worlds. */
  return /^[a-z]/.test(base) ? base : `id_${base}`
}

/** What a tone key must match — the mirror of `_TONE_KEY_RE`
    (`api/services/worlds.py`). No `-`: a tone key travels in scenes, journal
    rows and export manifests, where it has always been a plain word. */
export const TONE_KEY_RE = /^[a-z0-9_]+$/

/** The tone key a name proposes — `slugify` with its `-` turned into `_`,
    and no `id_` prefix (a key may start with a digit). */
export function toneKey(name: string): string {
  return slugify(name).replace(/^id_/, '').replace(/-/g, '_')
}
