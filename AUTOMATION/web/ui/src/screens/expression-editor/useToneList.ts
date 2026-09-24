/* The tones of the character, straight from the taxonomy already loaded
   app-wide (`useTaxonomy` — `GET /api/creative`). No route, no fetch of its
   own: tones are hand-authored in `creative.json`, and this workshop only
   reads what each one has configured.

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
}

export const PARAM_NAMES = Object.keys(PARAM_BOUNDS) as ExpressionParamName[]

export function useToneList() {
  const { creative } = useTaxonomy()
  const rows: ToneRow[] = (creative?.tones ?? []).map((tone) => ({
    key: tone.key,
    label: tone.label || tone.key,
    configuredParams: PARAM_NAMES.filter((name) => tone.expression?.[name] != null),
  }))
  return { rows, loaded: creative !== null }
}
