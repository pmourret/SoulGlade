/* The tones of the character, as a list one picks from (design-pass screen-8
   §S3) — purely presentational (frontend.md: a sub-component never calls the
   API).

   IT REPLACES A GRID OF CARDS that linked OUT to a full-screen editor. Tuning
   three tones meant six navigations, and a card said which parameters a tone
   included by listing their names in a paragraph — readable for one tone,
   unreadable as a comparison across five. The count answers « is this one set
   up », the 12-marker strip answers « set up the same way as its neighbour »,
   and both are read without opening anything.

   `data-tone-card` and `data-key` moved from the card to the `<li>`, unchanged:
   `test_bank.js` identifies a tone by them. */
import type { ExpressionParamName } from './expressionBounds'
import { PARAM_NAMES } from './useToneList'

export type ToneListRow = {
  key: string
  label: string
  /** Live for the tone being edited, saved for the others — the workshop
      resolves that, this component only draws what it is handed. */
  includedParams: ExpressionParamName[]
}

export function ToneList({
  rows, selected, dirtyKey, onSelect,
}: {
  rows: ToneListRow[]
  selected: string | null
  /** The one tone with unsaved changes, if any — there is only ever one, the
      hydration of a different tone being what discards the previous edits. */
  dirtyKey: string | null
  onSelect: (key: string) => void
}) {
  const onKeyDown = (event: React.KeyboardEvent<HTMLUListElement>) => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
    event.preventDefault()
    const index = rows.findIndex((row) => row.key === selected)
    const next = rows[index + (event.key === 'ArrowDown' ? 1 : -1)]
    if (!next) return
    onSelect(next.key)
    event.currentTarget.querySelector<HTMLElement>(`[data-key="${CSS.escape(next.key)}"]`)?.focus()
  }

  return (
    <div className="flex min-h-0 flex-col border-r border-r-line bg-panel">
      <div className="flex-none px-[12px] pt-[12px] pb-[8px] lab">
        Tons · {rows.length}
      </div>
      <ul
        id="tonesGrid"
        role="listbox"
        aria-label="Tons du personnage"
        tabIndex={-1}
        className="m-0 min-h-0 flex-1 list-none overflow-y-auto p-0"
        onKeyDown={onKeyDown}
      >
        {rows.map((row, index) => {
          const active = row.key === selected
          return (
            <li
              key={row.key}
              role="option"
              data-tone-card
              data-key={row.key}
              aria-selected={active}
              /* Roving tabindex: ONE tone in the tab order, the open one (the
                 first when nothing is selected yet). */
              tabIndex={active || (!selected && index === 0) ? 0 : -1}
              className={`cursor-pointer px-[12px] py-[8px] focus-visible:outline-2
                          focus-visible:outline-focus focus-visible:-outline-offset-2 ${
                            active ? 'bg-panel3 font-semibold shadow-[inset_2px_0_0_var(--acc)]' : ''
                          }`}
              onClick={() => onSelect(row.key)}
            >
              <div className="flex items-baseline gap-[6px]">
                <span className="min-w-0 flex-1 truncate text-[13px]">{row.label}</span>
                {/* NEVER by the dot alone (frontend.md: statut jamais par la
                    couleur seule) — it doubles the banner, which names the
                    tone in full at the top of the screen. */}
                {row.key === dirtyKey && (
                  <span className="h-[6px] w-[6px] flex-none rounded-full bg-warn-line" aria-hidden="true" />
                )}
                <span className={`flex-none text-[11px] ${row.includedParams.length ? 'text-dim' : 'text-dim2'}`}>
                  {row.includedParams.length
                    ? `${row.includedParams.length} / ${PARAM_NAMES.length}`
                    : 'neutre'}
                </span>
              </div>
              {/* Decorative on purpose (`aria-hidden`): 12 markers read aloud
                  one by one would be noise, and the count right above carries
                  the same information in one word. */}
              <div className="mt-[5px] flex gap-[2px]" aria-hidden="true">
                {PARAM_NAMES.map((name) => (
                  <span
                    key={name}
                    className={`h-[3px] flex-1 rounded-[1px] ${
                      row.includedParams.includes(name) ? 'bg-acc' : 'bg-line2'
                    }`}
                  />
                ))}
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
