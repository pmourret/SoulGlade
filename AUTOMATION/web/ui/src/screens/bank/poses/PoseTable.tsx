/* The pose bank, read in columns (design-pass screen-7d §S3) — purely
   presentational (frontend.md: a sub-component never calls the API).

   IT REPLACES A GRID OF CARDS. The grid showed a thumbnail and a label; the
   provenance was a badge one had to hover, the scenes using a pose were a
   `title` attribute, and the date existed only as a sort order. Everything a
   person asks of a skeleton is now a column one reads without a gesture.

   A REAL <table>, not a grid of divs: `styles/screens.css` already styles
   `table/th/td` for the studio, a screen reader announces the row and column
   of whatever it lands on, and `aria-sort` on the sorted header is a single
   attribute where a fake table needs a paragraph of ARIA.

   `data-pose-card` / `data-n` moved from the card to the `<tr>`, unchanged:
   three browser smoke tests identify a pose by them (test_pose_bank,
   test_pose_extract, test_pose_editor), and so does `#poseGrid`, which is now
   this table. */
import type { PoseBankRow, SortBy, SortDir } from './usePoseBank'

/** `gabarit` and `photo` are the only two provenances the data actually
    distinguishes (`source: "preset" | "extraction"`) — a from-scratch pose
    hand-adjusted from a template is still `"preset"`, same as an untouched
    one, since nothing separates "started as a template" from "and then
    hand-edited" once saved. A pose extracted before the JSON sidecar existed
    is called « Ancienne » rather than given a fabricated provenance. */
export function provenanceLabel(source: string | null): string {
  if (source === 'preset') return 'Gabarit'
  if (source === 'extraction') return 'Photo'
  return 'Ancienne'
}

/** Day and month, never a time: a skeleton is dated to tell recent from old,
    and « 14:32 » is noise in a column one scans. */
function shortDate(iso: string | null): string {
  if (!iso) return '—'
  const date = new Date(iso)
  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: '2-digit' })
}

const HEAD =
  'sticky top-0 z-[1] bg-sub' as const

function SortHeader({
  column, label, sortBy, sortDir, onSort, className,
}: {
  column: SortBy
  label: string
  sortBy: SortBy
  sortDir: SortDir
  onSort: (column: SortBy) => void
  className?: string
}) {
  const active = sortBy === column
  return (
    <th
      scope="col"
      className={`${HEAD} ${className ?? ''}`}
      /* The ONLY place the sorted state is announced: `aria-sort` belongs to
         the header cell, not to the button inside it. */
      aria-sort={active ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      <button
        type="button"
        className={`flex w-full cursor-pointer items-center gap-[5px] border-0 bg-transparent p-0
                    text-left text-[11px] uppercase tracking-[.5px] focus-visible:outline-2
                    focus-visible:outline-focus focus-visible:outline-offset-2 ${
                      active ? 'text-txt' : 'text-dim hover:text-txt'
                    }`}
        data-sort={column}
        onClick={() => onSort(column)}
      >
        {label}
        {/* Never the sort state by an arrow ALONE (frontend.md: statut jamais
            par la couleur seule, same reasoning for a lone glyph) — the
            arrow doubles `aria-sort`, which is what actually carries it. */}
        <span aria-hidden="true" className={active ? 'text-acc' : 'invisible'}>
          {sortDir === 'asc' ? '▲' : '▼'}
        </span>
      </button>
    </th>
  )
}

export function PoseTable({
  rows, totalCount, selected, busyNames, sortBy, sortDir, withDate,
  onSort, onSelect, onOpen, onDelete, onResetFilters,
}: {
  rows: PoseBankRow[]
  totalCount: number
  selected: string | null
  busyNames: ReadonlySet<string>
  sortBy: SortBy
  sortDir: SortDir
  onSort: (column: SortBy) => void
  /** False when NO pose in the bank carries a date — a column of « — » says
      nothing (design-pass §S3: the column exists only if the data does). */
  withDate: boolean
  onSelect: (name: string) => void
  onOpen: (name: string) => void
  onDelete: (row: PoseBankRow) => void
  onResetFilters: () => void
}) {
  const columns = withDate ? 5 : 4

  /* Arrows move the SELECTION, which is also what carries the roving
     tabindex — one concept, not a focused row and a selected row that can
     drift apart. */
  const onKeyDown = (event: React.KeyboardEvent<HTMLTableSectionElement>, index: number) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      const next = rows[index + (event.key === 'ArrowDown' ? 1 : -1)]
      if (!next) return
      onSelect(next.name)
      event.currentTarget
        .querySelector<HTMLElement>(`[data-n="${CSS.escape(next.name)}"]`)
        ?.focus()
    } else if (event.key === 'Enter') {
      event.preventDefault()
      onSelect(rows[index].name)
    } else if (event.key === 'Delete') {
      event.preventDefault()
      onDelete(rows[index])
    }
  }

  return (
    <table id="poseGrid" className="w-full">
      <caption className="sr-only">Squelettes de pose</caption>
      <thead>
        <tr>
          <th scope="col" className={`${HEAD} w-[60px]`}>
            <span className="sr-only">Aperçu</span>
          </th>
          <SortHeader column="name" label="Libellé" sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
          <th scope="col" className={`${HEAD} w-[110px]`}>Provenance</th>
          <SortHeader column="usage" label="Utilisée par" sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
          {withDate && (
            <SortHeader
              column="recent" label="Ajoutée" sortBy={sortBy} sortDir={sortDir}
              /* §S7: the date is the first column to go under 1100 px, where
                 the inspector becomes a drawer laid OVER the table. */
              onSort={onSort} className="w-[110px] max-[1100px]:hidden"
            />
          )}
        </tr>
      </thead>
      <tbody onKeyDown={(event) => {
        const row = (event.target as HTMLElement).closest<HTMLElement>('[data-pose-card]')
        const index = row ? rows.findIndex((r) => r.name === row.dataset.n) : -1
        if (index >= 0) onKeyDown(event, index)
      }}>
        {rows.length === 0 ? (
          <tr>
            <td className="empty" colSpan={columns}>
              {totalCount === 0 ? (
                <>
                  <b>Aucun squelette pour l'instant.</b>
                  Extrais-en un d'une photo, ou pars d'un gabarit — les deux
                  actions sont dans la barre ci-dessus.
                </>
              ) : (
                <>
                  Aucun squelette ne correspond à ces filtres
                  <button
                    type="button"
                    className="btn sm ml-[10px]"
                    id="btnPoseResetFilters"
                    onClick={onResetFilters}
                  >
                    Réinitialiser les filtres
                  </button>
                </>
              )}
            </td>
          </tr>
        ) : (
          rows.map((row, index) => {
            const busy = busyNames.has(row.name)
            const active = selected === row.name
            return (
              <tr
                key={row.name}
                data-pose-card
                data-n={row.name}
                aria-selected={active}
                aria-busy={busy || undefined}
                /* Roving tabindex: ONE row in the tab order, the selected one
                   (the first when nothing is selected yet). */
                tabIndex={active || (!selected && index === 0) ? 0 : -1}
                className={`h-[58px] cursor-pointer ${busy ? 'opacity-50' : ''} ${
                  active ? 'bg-panel3 shadow-[inset_2px_0_0_var(--acc)]' : ''
                } focus-visible:outline-2 focus-visible:outline-focus focus-visible:-outline-offset-2`}
                onClick={() => onSelect(row.name)}
                onDoubleClick={() => onOpen(row.name)}
              >
                <td>
                  <img
                    className="h-[44px] w-[44px] rounded-[4px] bg-black object-contain"
                    loading="lazy"
                    src={`/img/pose?name=${encodeURIComponent(row.name)}`}
                    alt={row.label || row.name}
                  />
                </td>
                <td>
                  <span className={`block truncate text-[13px] ${active ? 'font-semibold text-txt' : 'text-txt'}`}>
                    {row.label || row.name}
                  </span>
                  <span className="block truncate font-code text-[11px] text-dim2">{row.name}</span>
                </td>
                <td className="text-[12px] text-dim">{provenanceLabel(row.source)}</td>
                <td className="max-w-0 text-[12px]">
                  {row.scenesUsing.length ? (
                    <span className="block truncate text-txt">
                      {row.scenesUsing.length} · {row.scenesUsing.join(', ')}
                    </span>
                  ) : (
                    <span className="text-dim2">non utilisée</span>
                  )}
                </td>
                {withDate && (
                  <td className="num text-[12px] text-dim max-[1100px]:hidden">{shortDate(row.createdAt)}</td>
                )}
              </tr>
            )
          })
        )}
      </tbody>
    </table>
  )
}
