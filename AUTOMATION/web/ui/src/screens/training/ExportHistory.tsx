/* The dated folders already produced for this character. Pure presentation.

   WHY IT IS ON THE SCREEN AT ALL. An export is a piece of history — the
   backend refuses to overwrite one, and two LoRA trained on two dates are only
   comparable through what their manifests recorded. Showing the list is what
   stops the same set being exported three times because nobody remembered.

   A folder whose manifest cannot be read is SHOWN as unreadable, never
   skipped: a half-written export is information, its silence is not. */
import type { PastExport } from './useTrainingSet'

/** `20260910-145723` -> `10/09/2026 14:57`. Falls back to the raw stamp if it
    is not the shape the exporter writes. */
function readableStamp(stamp: string | undefined): string {
  const m = /^(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})/.exec(stamp ?? '')
  return m ? `${m[3]}/${m[2]}/${m[1]} ${m[4]}:${m[5]}` : (stamp ?? '—')
}

export function ExportHistory({ rows }: { rows: PastExport[] }) {
  return (
    <section className="mt-[22px]">
      <h3 className="m-0 mb-[4px] text-[15px] font-semibold text-txt">
        Exports déjà sortis
      </h3>
      <p className="tiny mt-0 mb-[12px]">
        Un export n’écrase jamais le précédent. Le dossier part tel quel sur une
        machine kohya : <code>bash entrainer.sh</code> après avoir vérifié les
        chemins en tête du script.
      </p>
      <table>
        <thead>
          <tr>
            <th>date</th>
            <th>images</th>
            <th>répétitions</th>
            <th>famille</th>
            <th>dossier</th>
          </tr>
        </thead>
        <tbody>
          {rows.length ? (
            rows.map((row) => (
              <tr key={row.horodatage ?? row.dossier}>
                <td>{readableStamp(row.horodatage)}</td>
                <td className="num">
                  {row.illisible ? '—' : row.images ?? 0}
                  {row.ancre_reinjectee ? <span className="tiny"> + ancre</span> : null}
                </td>
                <td className="num">
                  {row.repetitions ?? '—'}
                  {row.repetitions_defaut ? <span className="tiny"> défaut</span> : null}
                </td>
                <td>
                  {row.famille ?? '—'}
                  {row.script ? <span className="tiny"> · {row.script}</span> : null}
                </td>
                <td>
                  {row.illisible ? (
                    <span style={{ color: 'var(--bad)' }}>
                      manifeste illisible — {row.illisible}
                    </span>
                  ) : (
                    <code className="font-code text-[11.5px] text-dim2">{row.dossier}</code>
                  )}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={5} className="empty">aucun export pour ce personnage</td>
            </tr>
          )}
        </tbody>
      </table>
    </section>
  )
}
