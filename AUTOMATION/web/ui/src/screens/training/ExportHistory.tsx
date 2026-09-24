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

/** « 24 images + ancre · 8 rép. (défaut) · flux · flux_train_network.py », with
    every piece dropped when the manifest does not carry it. An export written
    before a field existed simply lacks it: absent, not false. */
function summarise(row: PastExport): string {
  const bits = [`${row.images ?? 0} image(s)${row.ancre_reinjectee ? ' + ancre' : ''}`]
  if (row.repetitions != null) {
    bits.push(`${row.repetitions} rép.${row.repetitions_defaut ? ' (défaut)' : ''}`)
  }
  if (row.famille) {
    bits.push(row.famille)
  }
  if (row.script) {
    bits.push(row.script)
  }
  return bits.join(' · ')
}

export function ExportHistory({ rows, fresh }:
                              { rows: PastExport[]; fresh: string | null }) {
  return (
    <section className="mt-[18px] border-t border-line pt-[14px]">
      <h2 className="m-0 text-[10.5px] font-normal uppercase tracking-[.5px] text-dim">
        Exports déjà sortis
      </h2>
      <p className="m-0 mb-[10px] text-[12px] text-dim2">Aucun n’est écrasé.</p>

      {rows.length ? (
        <ul className="m-0 list-none p-0">
          {rows.map((row) => (
            <li
              key={row.horodatage ?? row.dossier}
              /* No movement, just a ground that fades: `prefers-reduced-motion`
                 has nothing to turn off here. */
              className={`-mx-[6px] rounded-[5px] px-[6px] py-[7px] transition-colors
                          duration-700 ${
                row.dossier && row.dossier === fresh ? 'bg-panel3' : 'bg-transparent'}`}
            >
              <b className="block text-[12.5px] font-[600] text-txt">
                {readableStamp(row.horodatage)}
              </b>
              {row.illisible ? (
                <span className="block text-[12px] text-danger-txt">
                  manifeste illisible — {row.illisible}
                </span>
              ) : (
                <span className="block text-[12px] text-dim">{summarise(row)}</span>
              )}
              <code className="block overflow-hidden text-ellipsis whitespace-nowrap
                               font-code text-[11px] text-dim2"
                    title={row.dossier}>
                {row.dossier}
              </code>
            </li>
          ))}
        </ul>
      ) : (
        <p className="m-0 text-[12.5px] text-dim">Aucun export pour ce personnage.</p>
      )}
    </section>
  )
}
