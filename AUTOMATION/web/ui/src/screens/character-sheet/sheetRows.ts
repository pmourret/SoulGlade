/* Pure derivations behind the character sheet: sheet + counts -> what each row
   shows. No React, no DOM — they read and test without mounting anything
   (.claude/rules/frontend.md, "une fonction pure sort en fonction, pas en
   hook").

   Nothing here INVENTS a value. Every function returns a discriminated state
   the presentation maps to a wording, so that "unknown" is a case the screen
   handles rather than a blank it prints. */
import type { CharacterSheet } from '../../character/CharacterContext'

/* Output styles are declared by a pack (`PACKS/<id>/universe.json`,
   `output_styles`), so this table can never be exhaustive: it covers the four
   that ship today and `styleLabel` degrades gracefully for a fifth rather than
   showing a raw slug or, worse, nothing. */
export const STYLE_LABELS: Record<string, string> = {
  realiste: 'Réaliste',
  fantastique: 'Fantastique',
  cartoon: 'Cartoon',
  manga: 'Manga',
}

/** Human label of an output style, falling back on the capitalised slug. */
export function styleLabel(raw: string | null | undefined): string | null {
  const key = (raw ?? '').trim()
  if (!key) return null
  return STYLE_LABELS[key] ?? key.charAt(0).toUpperCase() + key.slice(1)
}

/* THE THREE STATES OF A FROZEN BASE, never merged into "unavailable". They are
   three different problems: nothing was ever frozen; something was frozen and
   the file is gone; everything is fine. The sheet exists to read which. */
export type BaseState = 'present' | 'missing' | 'absent'

export function baseState(sheet: CharacterSheet | null): BaseState {
  if (sheet?.base?.present) return 'present'
  return sheet?.base?.name ? 'missing' : 'absent'
}

/** File name of the frozen base, or null when none was ever declared. */
export function baseName(sheet: CharacterSheet | null): string | null {
  return sheet?.base?.name || null
}

/* Active content types: the CREATION registry (ADR-0004), an axis transverse
   to packs. In V1 only `image` is active everywhere; video and voice are
   declared and dormant, so turning them on later is a change of value, not of
   schema. The sheet says so rather than letting it look like a gap. */
export const CONTENT_LABELS: Record<string, string> = {
  image: 'Image',
  video: 'Vidéo',
  voice: 'Voix',
  staging: 'Mise en scène',
}

export function contentTypes(sheet: CharacterSheet | null): {
  active: string[]
  dormant: string[]
} {
  const declared = (sheet?.content_types ?? {}) as Record<string, unknown>
  const keys = Object.keys(CONTENT_LABELS)
  return {
    active: keys.filter((key) => declared[key]).map((key) => CONTENT_LABELS[key]),
    dormant: keys
      .filter((key) => key in declared && !declared[key])
      .map((key) => CONTENT_LABELS[key]),
  }
}

/* State of the adult branch, READ. Three distinct states, never merged: the
   character's switch, the pack's edit graph, and the two together. A character
   armed whose pack has no tool does not have the same problem as one simply
   off.

   Two conditions, two sentences: what the state IS, then what it CHANGES on
   the Produire screen. Without the second, « activé » does not say whether a
   step appears anywhere, which is the only question one asks reading this. */
export type AdultState = {
  armed: boolean
  hasGraph: boolean
  label: string
  effect: string
  /** Server-provided sentence when the pack has no edit graph, AND the
      character is armed. Never reworded here: the Application screen shows the
      same one.

      WHY IT IS GATED ON `armed` (audit of 23/09/2026). The design-pass asked
      for it on `!has_graph` alone, and the previous sheet did that. Measured on
      Abyssiaelle — disarmed, on a pack with no edit graph — it printed « l'outil
      de modification live par IA n'existe pas encore pour ce pack » directly
      under the word « Désactivé », with nothing between them: it reads as the
      REASON she is disarmed, which is false. She is disarmed because nobody
      armed her. The two facts are independent, and the sentence only explains
      the current state when the switch is on and the tool is missing. When it
      is off, the « Effet » row already says there is no edit step. */
  reason: string | null
}

export function adultState(sheet: CharacterSheet | null): AdultState {
  const tool = sheet?.nsfw_tool
  const armed = Boolean(sheet?.nsfw || tool?.armed)
  const hasGraph = Boolean(tool?.has_graph)
  return {
    armed,
    hasGraph,
    label: armed ? (hasGraph ? 'Activé' : "Activé, sans outil d'édition dans ce pack") : 'Désactivé',
    effect: !armed
      ? "aucun cran d'édition sur Produire, aucune sortie NSFW"
      : hasGraph
        ? "le cran d'édition est proposé sur Produire"
        : "aucun cran sur Produire tant que le pack n'a pas son graphe",
    reason: armed && !hasGraph && tool?.reason ? String(tool.reason) : null,
  }
}

/* Production counts. The keys are the buckets the server actually writes —
   `OK`, `A_REVOIR`, `REJET` (routers/state.py) — and a MISSING key drops its
   row rather than printing a zero we did not measure. `REJET` has no row: the
   sheet reports what is waiting and what is kept, not what was thrown away. */
export type ProductionRow = { key: string; term: string; value: number; to: string; link: string }

export function productionRows(
  counts: Record<string, number> | null | undefined,
  paths: { review: string; gallery: string },
): ProductionRow[] {
  const rows: ProductionRow[] = []
  const known = counts ?? {}
  if (typeof known.A_REVOIR === 'number') {
    rows.push({
      key: 'A_REVOIR',
      term: 'À revoir',
      value: known.A_REVOIR,
      to: paths.review,
      link: 'Ouvrir la Revue',
    })
  }
  if (typeof known.OK === 'number') {
    rows.push({
      key: 'OK',
      term: 'Validées',
      value: known.OK,
      to: paths.gallery,
      link: 'Ouvrir la Galerie',
    })
  }
  return rows
}
