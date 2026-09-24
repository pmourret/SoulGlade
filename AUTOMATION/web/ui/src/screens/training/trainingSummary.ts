/* Pure reading of the proposal: no React, no fetch, testable on its own.

   THE ONE RULE THIS FILE EXISTS TO HOLD. Four counters look like one and are
   not, and the shape of their overlap was read in `AUTOMATION/entrainement.py`
   rather than guessed:

     - `file` and `ecartes` are DISJOINT — `candidats` skips a row the moment an
       objective axis reads `ko`, so it never reaches the queue;
     - `sans_etiquette` is a SUBSET of the queue, appended after it;
     - `sans_fichier` is another SUBSET of the queue, orthogonal to the first —
       and nothing in the response says how the two cross.

   So the bar carries three parts that never overlap, and their sum is never
   written anywhere on screen: it is a visual distribution, not an announced
   total. The never-labelled ones cannot join it without claiming they are
   exportable, which nothing guarantees; they get a sub-band spanning the queue
   alone. */

export type Counters = {
  file: number
  exportables: number
  sans_fichier: number
  sans_etiquette: number
  ecartes: number
  derives: number
}

export type Criterion = { nom: string; verdict: string; message: string }

/** The active reference set, as the route exposes it. `null` for a character
    that has none yet — a state, not an error. */
export type ActiveSet = { id?: number; sante?: number | null } | null

/** `span` is the fraction of the bar this part takes, 0 to 1. The denominator
    stays in this file on purpose: it is a drawing ratio, and printing it would
    turn four counters of four natures into one announced total. */
export type Part = {
  key: string; label: string; value: number; span: number
  color?: string
  /** Hatched instead of flat: this part is not of the same kind as the others.
      The never-labelled ones are a SUBSET of the queue, so they are drawn
      apart, and the legend spells out where they sit. */
  hatched?: boolean
  note?: string
}

export type Distribution = {
  /** Left to right, as the validated mockup lays them out. Their sum is
      deliberately never printed. */
  parts: Part[]
}

export function distribution(c: Counters): Distribution {
  const raw: Omit<Part, 'span'>[] = [
    { key: 'exportables', label: 'exportables', value: c.exportables, color: 'var(--ok)' },
    { key: 'sans_fichier', label: 'sans fichier', value: c.sans_fichier, color: 'var(--dim2)' },
    { key: 'ecartes', label: 'écartées', value: c.ecartes, color: 'var(--bad)' },
    { key: 'sans_etiquette', label: 'jamais étiquetées', value: c.sans_etiquette,
      hatched: true, note: 'dans la file, absence de défaut supposée' },
  ]
  const total = raw.reduce((sum, part) => sum + part.value, 0)
  return {
    parts: raw.map((part) => ({ ...part, span: total > 0 ? part.value / total : 0 })),
  }
}

export const percent = (fraction: number) => `${(fraction * 100).toFixed(3)}%`

/** The one-line synthesis under the verdict. Every number in it comes from the
    response or from counting its criteria: nothing here is invented. */
export function verdictSummary(criteria: Criterion[], set: ActiveSet,
                               counters: Counters): string {
  const count = (verdict: string) => criteria.filter((c) => c.verdict === verdict).length
  const held = count('tenu')
  const missed = count('manque')
  const unjudgeable = count('sans seuil')

  const bits = [`${held} critère(s) tenu(s)`]
  if (missed) {
    bits.push(`${missed} manqué(s)`)
  }
  if (unjudgeable) {
    bits.push(`${unjudgeable} sans seuil`)
  }
  const parts = [bits.join(', ')]

  if (set && set.id != null) {
    const health = set.sante == null ? '' : `, santé ${set.sante.toFixed(3)}`
    parts.push(`gabarit #${set.id}${health}`)
  }
  parts.push(counters.derives
    ? `${counters.derives} image(s) produite(s) sous un LoRA`
    : 'aucune image produite sous un LoRA')
  return parts.join(' · ')
}
