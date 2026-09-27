/* The English words of a free effect colour (design-pass lumieres, S6).

   The prompt receives WORDS, never a colour value: a model reads « deep
   violet », not `oklch(0.4 0.14 298)`. This file turns a colour picked on the
   wheel into those words, and reads them back into an approximate colour for
   the swatch after a reload — only the words are stored.

   Pure and import-free: `AUTOMATION/tests/test_color_name.js` imports it as
   source under Node, like `boardLayout.ts`. The hex conversion is the
   caller's (`chrome/theme/oklch.ts`).

   CALIBRATED on the six hues of `PLATFORM/lighting.json`: each swatch, read in
   OKLCH, falls on its own name (red 27°, amber 72°, green 148°, cyan 208°,
   blue 266°, magenta 349°), at least 5° from a bound. The test holds it. */

export type Oklch = { l: number; c: number; h: number }

/** Hue names by OKLCH hue range, `[from, to)`, in wheel order. */
const HUES: { name: string; from: number; to: number; fr: string }[] = [
  { name: 'rose', from: 0, to: 12, fr: 'Vieux rose' },
  { name: 'red', from: 12, to: 38, fr: 'Rouge' },
  { name: 'coral', from: 38, to: 50, fr: 'Corail' },
  { name: 'orange', from: 50, to: 63, fr: 'Orange' },
  { name: 'amber', from: 63, to: 80, fr: 'Ambre' },
  { name: 'gold', from: 80, to: 92, fr: 'Or' },
  { name: 'yellow', from: 92, to: 112, fr: 'Jaune' },
  { name: 'lime', from: 112, to: 132, fr: 'Citron vert' },
  { name: 'green', from: 132, to: 160, fr: 'Vert' },
  { name: 'emerald', from: 160, to: 176, fr: 'Émeraude' },
  { name: 'teal', from: 176, to: 195, fr: 'Bleu canard' },
  { name: 'cyan', from: 195, to: 222, fr: 'Cyan' },
  { name: 'sky blue', from: 222, to: 245, fr: 'Bleu ciel' },
  { name: 'blue', from: 245, to: 275, fr: 'Bleu' },
  { name: 'indigo', from: 275, to: 290, fr: 'Indigo' },
  { name: 'violet', from: 290, to: 306, fr: 'Violet' },
  { name: 'purple', from: 306, to: 328, fr: 'Pourpre' },
  { name: 'magenta', from: 328, to: 354, fr: 'Magenta' },
  { name: 'pink', from: 354, to: 360, fr: 'Rose' },
]

/* The thresholds the slider words share with the qualifiers: the word next to
   a slider says what the name is about to receive. */
const LOW_C = 0.08
const HIGH_C = 0.19
const LOW_L = 0.45
const HIGH_L = 0.8

/** At most one qualifier, in this order of priority. */
const QUALIFIERS: { name: string; fr: string; test: (o: Oklch) => boolean; l?: number; c?: number }[] = [
  { name: 'muted', fr: 'éteint', test: (o) => o.c < LOW_C, c: 0.05 },
  { name: 'deep', fr: 'profond', test: (o) => o.l < LOW_L, l: 0.4 },
  { name: 'pale', fr: 'pâle', test: (o) => o.l > HIGH_L, l: 0.86 },
  { name: 'vivid', fr: 'vif', test: (o) => o.c > HIGH_C, c: 0.22 },
]

/** Where a name without a qualifier lands: between every threshold. */
export const DEFAULT_COLOR: Oklch = { l: 0.65, c: 0.14, h: 298 }

const wrap = (h: number) => ((h % 360) + 360) % 360

function hueOf(h: number) {
  const x = wrap(h)
  return HUES.find((entry) => x >= entry.from && x < entry.to) ?? HUES[0]
}

/** The English words for a colour: `[qualifier ]hue`, e.g. « deep violet ». */
export function colorName(color: Oklch): string {
  const qualifier = QUALIFIERS.find((q) => q.test(color))
  const hue = hueOf(color.h).name
  return qualifier ? `${qualifier.name} ${hue}` : hue
}

function parse(text: string) {
  const words = text.trim().toLowerCase().replace(/\s+/g, ' ')
  for (const qualifier of [null, ...QUALIFIERS]) {
    const rest = qualifier ? (words.startsWith(`${qualifier.name} `) ? words.slice(qualifier.name.length + 1) : null) : words
    const hue = rest !== null ? HUES.find((entry) => entry.name === rest) : undefined
    if (hue) return { qualifier, hue }
  }
  return null
}

/** The colour a name stands for, approximately (centre of its hue range), or
    `null` for words the table does not know. */
export function colorFromName(text: string): Oklch | null {
  const found = parse(text)
  if (!found) return null
  const { qualifier, hue } = found
  return {
    l: qualifier?.l ?? DEFAULT_COLOR.l,
    c: qualifier?.c ?? DEFAULT_COLOR.c,
    h: (hue.from + hue.to) / 2,
  }
}

/** The French label of a name the table knows, e.g. « Violet profond ». */
export function frenchName(text: string): string | null {
  const found = parse(text)
  if (!found) return null
  return found.qualifier ? `${found.hue.fr} ${found.qualifier.fr}` : found.hue.fr
}

export const lightnessWord = (l: number) => (l < LOW_L ? 'sombre' : l > HIGH_L ? 'claire' : 'moyenne')
export const intensityWord = (c: number) => (c < LOW_C ? 'éteinte' : c > HIGH_C ? 'vive' : 'moyenne')

/** Every hue name, for the test. */
export const HUE_NAMES = HUES.map((entry) => entry.name)
export const QUALIFIER_NAMES = QUALIFIERS.map((q) => q.name)
