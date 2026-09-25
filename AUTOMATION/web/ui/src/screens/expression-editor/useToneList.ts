/* The tones of the character, straight from the taxonomy already loaded
   app-wide (`useTaxonomy` — `GET /api/creative`). No fetch of its own. Since
   IT-10 (25/09) a tone is created in its world and adjusted here, so each row
   also says where it comes from (`couche`) and what it adds to the prompt.

   Was `screens/bank/tones/useToneBank.ts`. It moved here with the rest of the
   sub-view (design-pass screen-8): Tons is no longer a grid of cards inside
   the bank that links OUT to an editor, it IS the editor, and the list is one
   of its three columns. */
import { useTaxonomy } from '../../state/TaxonomyContext'
import { PARAM_BOUNDS, type ExpressionParamName } from './expressionBounds'

export type ToneRow = {
  key: string
  label: string
  /** What the SAVED range includes — in `PARAM_NAMES` order, which is the
      order the 12-marker strip draws. */
  configuredParams: ExpressionParamName[]
  /** The prompt fragment in effect for this character. */
  promptAdd: string
  couche: 'monde' | 'surcharge' | 'personnage'
  /** The text fields this character sets itself — what « Revenir au monde »
      gives back. */
  adjusted: string[]
}

export const PARAM_NAMES = Object.keys(PARAM_BOUNDS) as ExpressionParamName[]

export function useToneList() {
  const { creative } = useTaxonomy()
  const rows: ToneRow[] = (creative?.tones ?? []).map((tone) => ({
    key: tone.key,
    label: tone.label || tone.key,
    configuredParams: PARAM_NAMES.filter((name) => tone.expression?.[name] != null),
    promptAdd: tone.prompt_add ?? '',
    couche: tone.couche ?? 'personnage',
    adjusted: tone.champs_ajustes ?? [],
  }))
  return { rows, loaded: creative !== null }
}
