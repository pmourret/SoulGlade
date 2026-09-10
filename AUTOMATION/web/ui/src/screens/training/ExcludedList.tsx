/* What did NOT make the queue, and why. Pure presentation.

   WHY THIS LIST IS NOT COLLAPSIBLE-AND-FORGOTTEN. A training set that hides
   its rejections is a set nobody can argue with. Every line names the axis of
   OBJECTIVE defect that removed it — a six-fingered hand is not a creative
   choice (PROJET.md, 07/09) — never a taste judgement: `flag == 'ia'` stays in
   the queue on purpose, and measured at 0,1 σ it changes nothing about
   identity.

   Folded by default because it is long, open in one click because it is the
   half of the report one goes looking for. */
const AXIS_LABELS: Record<string, string> = {
  mains_juge: 'mains',
  anatomie: 'anatomie',
}

export type Excluded = { fichier: string; raison: string[] }

export function ExcludedList({ rows }: { rows: Excluded[] }) {
  if (!rows.length) {
    return null
  }
  /* Grouped by reason so the shape of the corpus is readable at a glance:
     « 12 mains, 4 anatomie » says something « 16 écartées » does not. */
  const byAxis = new Map<string, number>()
  for (const row of rows) {
    for (const axis of row.raison) {
      byAxis.set(axis, (byAxis.get(axis) ?? 0) + 1)
    }
  }
  const summary = [...byAxis.entries()]
    .map(([axis, n]) => `${n} ${AXIS_LABELS[axis] ?? axis}`)
    .join(' · ')

  return (
    <details className="adv">
      <summary>
        {rows.length} image(s) écartée(s) pour défaut objectif — {summary}
      </summary>
      <p className="tiny mt-[8px]">
        Le <b>goût</b> n’écarte jamais : une image jugée « ça fait IA » reste
        dans la file. Seul le défaut objectif sort, et il est nommé.
      </p>
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
    </details>
  )
}
