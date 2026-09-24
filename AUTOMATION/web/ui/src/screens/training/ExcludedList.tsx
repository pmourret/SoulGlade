/* What did NOT make the queue, and what is merely flagged. Pure presentation.

   TWO FOLDS, ONE BLOCK, AND THEY ARE NOT THE SAME THING. An EXCLUDED image left
   on an objective defect, named on the line — a six-fingered hand is not a
   creative choice (PROJET.md, 07/09). An OUTLIER is still in the queue: it is
   signalled, never removed on its own. Taste excludes nothing: `flag == 'ia'`
   stays in the queue on purpose, and measured at 0,1 σ it changes nothing about
   identity.

   Folded because they are long, one click away because they are the half of the
   report one goes looking for. The summary of each fold says enough to decide
   whether to open it. */
const AXIS_LABELS: Record<string, string> = {
  mains_juge: 'mains',
  anatomie: 'anatomie',
}

export type Excluded = { fichier: string; raison: string[] }
export type Outlier = { fichier: string; score: number; z: number }

function Fold({ title, summary, rule, children }:
              { title: string; summary: string; rule: string; children: React.ReactNode }) {
  return (
    <details className="adv">
      <summary>
        <b className="font-[600] text-txt">{title}</b>
        <span className="text-dim">{summary}</span>
        <span className="ml-auto text-dim2">{rule}</span>
      </summary>
      {children}
    </details>
  )
}

export function ExcludedList({ rows, outliers }:
                             { rows: Excluded[]; outliers: Outlier[] }) {
  if (!rows.length && !outliers.length) {
    return null
  }
  /* Grouped by reason so the shape of the corpus is readable at a glance:
     « 12 mains · 4 anatomie » says something « 16 écartées » does not. */
  const byAxis = new Map<string, number>()
  for (const row of rows) {
    for (const axis of row.raison) {
      byAxis.set(axis, (byAxis.get(axis) ?? 0) + 1)
    }
  }
  const byReason = [...byAxis.entries()]
    .map(([axis, n]) => `${n} ${AXIS_LABELS[axis] ?? axis}`)
    .join(' · ')

  return (
    <div className="mt-[22px] rounded-[6px] border border-line2" id="trainingFolds">
      {rows.length ? (
        <Fold
          rule="le goût n’écarte jamais"
          summary={byReason}
          title={`${rows.length} image(s) écartée(s) pour défaut objectif`}
        >
          <table>
            <thead>
              <tr>
                <th>fichier</th>
                <th>raison</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.fichier}>
                  <td>{row.fichier}</td>
                  <td>{row.raison.map((axis) => AXIS_LABELS[axis] ?? axis).join(', ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Fold>
      ) : null}

      {outliers.length ? (
        <Fold
          rule="z ≤ −2"
          summary="signalées, jamais écartées seules"
          title={`${outliers.length} atypique(s)`}
        >
          <table>
            <thead>
              <tr>
                <th>fichier</th>
                <th>score</th>
                <th>z</th>
              </tr>
            </thead>
            <tbody>
              {outliers.map((outlier) => (
                <tr key={outlier.fichier}>
                  <td>{outlier.fichier}</td>
                  <td className="num">{outlier.score.toFixed(3)}</td>
                  <td className="num">{outlier.z.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Fold>
      ) : null}
    </div>
  )
}
