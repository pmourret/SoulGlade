/* A journal verdict in words and in shape (design-pass screen-12 §S7).

   The CSV carries the raw code (`A_REVOIR`); the table shows what it means.
   Pure and apart so a test reads it without mounting React
   (AUTOMATION/tests/test_verdict_labels.js). An unknown code is shown as it
   is: a verdict the front does not know yet must still be visible, never
   blanked out. */
import type { Tone } from './StatusPill'

export type VerdictLabel = { text: string; tone: Tone }

const LABELS: Record<string, VerdictLabel> = {
  OK: { text: 'OK', tone: 'ok' },
  A_REVOIR: { text: 'À revoir', tone: 'warn' },
  REJET: { text: 'Rejet', tone: 'bad' },
}

export function verdictLabel(code: string | undefined): VerdictLabel {
  if (!code) return { text: '', tone: 'none' }
  return LABELS[code] ?? { text: code, tone: 'none' }
}

/* The segmented filter's entries, in their legacy order; `''` is everything. */
export const VERDICT_FILTERS: { value: string; label: string }[] = [
  { value: '', label: 'Tout' },
  { value: 'OK', label: 'OK' },
  { value: 'A_REVOIR', label: 'À revoir' },
  { value: 'REJET', label: 'Rejet' },
]

/** How many rows each filter would show — computed client side, from the
    rows already loaded. */
export function verdictCounts(rows: { verdict?: string }[]): Record<string, number> {
  const counts: Record<string, number> = { '': rows.length }
  for (const row of rows) if (row.verdict) counts[row.verdict] = (counts[row.verdict] ?? 0) + 1
  return counts
}
