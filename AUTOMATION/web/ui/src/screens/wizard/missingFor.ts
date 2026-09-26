/* The wizard's gating, as one pure function (design-pass screen-14 §S9).

   Each step has exactly one condition, and what is missing is SAID in the
   bottom bar rather than only refused by a greyed button. The last step
   passes when every step before it does: nothing is created half-chosen.

   No import on purpose: `AUTOMATION/tests/test_wizard_missing.js` loads this
   file straight into Node (types stripped), without a bundler. */

export const STEPS = ['identity', 'type', 'style', 'world', 'base'] as const
export type Step = (typeof STEPS)[number]

export type WizardChoices = {
  name: string
  cidValid: boolean
  /** The identity anchor: what follows « photo of » in every prompt. */
  anchor: string
  type: string | null
  style: string | null
  world: string | null
  frozenBase: string | null
}

/** What this step still lacks, as the end of « Il manque : … », or null. */
export function missingFor(step: Step, choices: WizardChoices): string | null {
  switch (step) {
    case 'identity':
      if (!choices.name.trim()) return 'un nom affiché'
      if (!choices.cidValid) return 'un identifiant valide'
      return choices.anchor.trim() ? null : "une ancre d'identité"
    case 'type':
      return choices.type ? null : 'choisir un type'
    case 'style':
      return choices.style ? null : 'choisir un style'
    case 'world':
      return choices.world ? null : 'choisir un monde'
    case 'base':
      return choices.frozenBase ? null : "une base d'identité, générée ou fournie"
  }
}

/** The first thing missing from the first step up to `step` included. */
export function missingUpTo(step: Step, choices: WizardChoices): string | null {
  for (const each of STEPS.slice(0, STEPS.indexOf(step) + 1)) {
    const missing = missingFor(each, choices)
    if (missing) return missing
  }
  return null
}
