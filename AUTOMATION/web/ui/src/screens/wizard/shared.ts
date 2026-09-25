/* What the wizard's parts all need: the steps, the shape of a choice, and the
   note styles.

   It exists because `StepBody`, `WizardSteps`, `WizardFooter` and the screen
   all sit on the same seam — a constant exported from one of them would make
   the others depend on it for a reason unrelated to what it does. */
import type { Schema } from '../../api/client'

export { STEPS, type Step } from './missingFor'

export type CharacterType = Schema<'WizardType'>
export const candidateUrl = (file: string) =>
  `/api/characters/base/image?file=${encodeURIComponent(file)}`

export type CandidateState = { file: string; state: string; detail?: string | null }
export const NOTE = 'rounded-card border px-[16px] py-[14px] text-[13px] leading-[1.55] bg-panel'
export const NOTE_OK = NOTE + ' border-line text-dim'
export const NOTE_ERR = NOTE + ' border-danger-line text-danger-txt'
/* The loading placeholder: the shape of an option card with nothing in it,
   never a spinner or a sentence — the steps have a known layout before the
   network answers. */
export const SKELETON_CARD = 'block h-[58px] rounded-card border border-line bg-panel2 motion-safe:animate-pulse'
/* THE SPINNER. Each side names its own colour: `border-line2` + `border-t-acc`
   would be a shorthand/longhand pair, and Tailwind emits `border-top-color`
   BEFORE `border-color` — the accent would be wiped by the grey. */
export const SPIN =
  'inline-block h-[16px] w-[16px] rounded-[50%] border-2 border-t-acc border-r-line2 border-b-line2 ' +
  'border-l-line2 animate-[wizspin_.8s_linear_infinite] motion-reduce:animate-none'

/* Said ONCE, under the title of the three frozen steps — it used to hang on
   every card. */
export const FROZEN_HINT = 'Figé à la création. Un autre choix = un autre personnage.'
