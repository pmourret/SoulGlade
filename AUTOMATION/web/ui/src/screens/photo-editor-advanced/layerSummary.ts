/* WHICH SETTINGS BELONG TO WHICH SECTION of the right panel, and how far
   each section is from neutral (design-pass screen-10 §S5.3: every header
   carries « neutre » or « N modifiés », and a « Réinitialiser » that puts
   its own section back in ONE history step).

   A pure function, not a hook (frontend.md): it reads and tests without
   mounting React, and it is the ONLY place that knows the mapping. Each
   panel asking « am I modified? » on its own would be the same question
   answered five times, and answered differently the day a field moves.

   `NEUTRAL_SETTINGS` stays the single source of what neutral means — this
   file only says which keys a section owns, never what their neutral value
   is. Curves, HSL and masks are compared by the predicates that already
   exist for them rather than by a fresh deep-equal. */
import { isIdentityCurve } from './curvesMath'
import { isHslNeutral } from './hslMath'
import { DEFAULT_MASK } from './MaskPicker'
import { NEUTRAL_SETTINGS, type LayerSettings, type Mask } from './photoEditorLayersPixels'

export type SectionKey = 'base' | 'color' | 'sharpen' | 'perspective' | 'ai'

/* `curveChannel` is deliberately absent: it says which channel TAB is open,
   not what the pixels do. Counting it would make a section read « 1 modifié »
   for having looked at the red curve. */
const KEYS: Record<SectionKey, readonly (keyof LayerSettings)[]> = {
  base: ['expo', 'contrast', 'sat', 'temp'],
  color: ['curves', 'levelBlack', 'levelMid', 'levelWhite', 'hsl'],
  sharpen: ['sharpen', 'blurOn', 'blurRadius', 'blurStrength', 'blurMask'],
  perspective: ['perspH', 'perspV'],
  ai: ['aiBrushSize', 'aiPrompt', 'aiMask'],
}

const emptyMask = (mask: Mask | null | undefined): boolean =>
  !mask || (mask.strokes.length === 0 && !mask.gradient && !mask.radial)

/** Is this one setting still at rest? The three structured fields answer
    through their own existing predicate; everything else is a number, a
    boolean or a string, and compares by value. */
function atRest(key: keyof LayerSettings, settings: LayerSettings): boolean {
  if (key === 'curves') {
    const c = settings.curves
    return isIdentityCurve(c.rgb) && isIdentityCurve(c.r) && isIdentityCurve(c.g) && isIdentityCurve(c.b)
  }
  if (key === 'hsl') return isHslNeutral(settings.hsl)
  if (key === 'blurMask') return emptyMask(settings.blurMask)
  if (key === 'aiMask') return emptyMask(settings.aiMask)
  return settings[key] === NEUTRAL_SETTINGS[key]
}

/** How many settings of this section differ from neutral. 0 means the
    section has nothing to reset, which is also what hides its link. */
export function changedCount(section: SectionKey, settings: LayerSettings): number {
  return KEYS[section].filter((key) => !atRest(key, settings)).length
}

/** What the header says under its title. */
export const sectionSummary = (section: SectionKey, settings: LayerSettings): string => {
  const n = changedCount(section, settings)
  return n === 0 ? 'neutre' : `${n} modifié${n > 1 ? 's' : ''}`
}

/** The patch that puts this section — and only this section — back at rest.
    Masks come back as `DEFAULT_MASK` rather than as an absent field: the
    panels read `?? DEFAULT_MASK` anyway, and an explicit empty mask keeps
    the mode the picker is showing from jumping under the pointer. */
export function neutralPatch(section: SectionKey, settings: LayerSettings): Partial<LayerSettings> {
  const patch: Partial<LayerSettings> = {}
  for (const key of KEYS[section]) {
    if (key === 'blurMask') patch.blurMask = { ...DEFAULT_MASK, mode: (settings.blurMask ?? DEFAULT_MASK).mode }
    else if (key === 'aiMask') patch.aiMask = { ...DEFAULT_MASK, mode: (settings.aiMask ?? DEFAULT_MASK).mode }
    else Object.assign(patch, { [key]: NEUTRAL_SETTINGS[key] })
  }
  return patch
}
