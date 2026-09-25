/* Journal de production — the batch history of the claimed character
   (design-pass screen-12 §S7). Presentation only: the rows come from
   `useJournal`, held by the Application screen because the nav counts them too.

   The verdict reads in words and in shape, never as the raw CSV code; the
   filter counts are computed client side from the rows already loaded. */
import { useMemo, useState } from 'react'

import { StatusMark } from './StatusPill'
import type { JournalRow } from './useJournal'
import { VERDICT_FILTERS, verdictCounts, verdictLabel } from './verdictLabels'

/** `2026-08-30T14:22:07` -> `08-30 14:22`, as the legacy table showed it. */
const shortDate = (value: string | undefined) => (value || '').replace('T', ' ').slice(5, 16)

const HEAD = 'sticky top-0 z-[1] bg-bg text-[10.5px] font-semibold'
const COLUMNS: { label: string; right?: boolean }[] = [
  { label: 'Date' },
  { label: 'Scène' },
  { label: 'Format' },
  { label: 'Graine', right: true },
  { label: 'Score', right: true },
  { label: 'Verdict' },
  { label: 'Durée', right: true },
]

export function ProductionJournal({
  name,
  rows,
  error,
  loading,
  onRetry,
}: {
  name: string
  rows: JournalRow[]
  error: string | null
  loading: boolean
  onRetry: () => void
}) {
  const [filter, setFilter] = useState('')
  const counts = useMemo(() => verdictCounts(rows), [rows])
  const shown = useMemo(() => rows.filter((row) => !filter || row.verdict === filter), [rows, filter])

  return (
    <section id="journal" aria-labelledby="journalTitle">
      <div className="mb-[18px] flex flex-wrap items-end gap-[16px]">
        <div className="min-w-0 flex-1">
          <h1 className="m-0 text-[22px] font-[650] text-txt" id="journalTitle">
            Journal de production
          </h1>
          <p className="mt-[8px] mb-0 text-[13px] text-dim" id="jInfo">
            {error
              ? `journal : ${error}`
              : loading
                ? 'chargement…'
                : `${name} · ${shown.length} ligne(s)`}
          </p>
        </div>
        <div className="seg" id="jFilter" role="group" aria-label="Filtrer par verdict">
          {VERDICT_FILTERS.map((entry) => (
            <button
              key={entry.value || 'tout'}
              className={filter === entry.value ? 'on' : undefined}
              data-f={entry.value}
              aria-pressed={filter === entry.value}
              onClick={() => setFilter(entry.value)}
              type="button"
            >
              {entry.label}
              <span className="n tabular-nums">{counts[entry.value] ?? 0}</span>
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <div className="rounded-card border border-line2 px-[16px] py-[14px] text-[13px]" role="alert">
          <p className="m-0 text-txt">{error}</p>
          <button className="btn sm mt-[10px]" type="button" onClick={onRetry}>
            Réessayer
          </button>
        </div>
      ) : null}

      <table id="jt" className="[&_td]:h-[34px] [&_td]:border-line [&_td]:py-0">
        <thead>
          <tr>
            {COLUMNS.map((column) => (
              <th key={column.label} scope="col" className={`${HEAD} ${column.right ? 'text-right' : ''}`}>
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading && !rows.length ? (
            Array.from({ length: 8 }, (_, index) => (
              <tr key={index} aria-hidden="true">
                <td colSpan={7}>
                  <span className="block h-[10px] w-full rounded-[3px] bg-panel2 motion-safe:animate-pulse" />
                </td>
              </tr>
            ))
          ) : shown.length ? (
            shown.map((row, index) => {
              const verdict = verdictLabel(row.verdict)
              return (
                // the CSV carries no id; a row is identified by its rank in the
                // list the server returned, stable between two renders of it
                <tr key={`${row.date ?? ''}-${index}`}>
                  <td className="whitespace-nowrap tabular-nums text-dim">{shortDate(row.date)}</td>
                  <td>
                    {row.scene || ''}
                    {row.variante ? <span className="text-dim2"> {row.variante.slice(0, 28)}</span> : null}
                  </td>
                  <td>{row.format || ''}</td>
                  <td className="num text-right font-code text-[12px]">{row.seed ?? ''}</td>
                  <td className="num text-right font-semibold">{row.score_identite ?? ''}</td>
                  <td>
                    {verdict.text && (
                      <span className="inline-flex items-center gap-[7px]">
                        <StatusMark tone={verdict.tone} />
                        {verdict.text}
                      </span>
                    )}
                  </td>
                  <td className="num text-right">{row.duree_s ? `${row.duree_s} s` : ''}</td>
                </tr>
              )
            })
          ) : (
            <tr>
              <td colSpan={7} className="empty">
                {error
                  ? 'journal indisponible'
                  : rows.length
                    ? 'aucune ligne pour ce verdict'
                    : `Aucune production pour ${name}`}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </section>
  )
}
