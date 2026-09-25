/* The registry column (design-pass screen-11 §S3) — 260 px of worlds, and the
   button that creates one. Presentation only: props and callbacks, no API call
   (`.claude/rules/frontend.md`).

   IT REPLACED A GRID OF CARDS. `/worlds` used to be a page of 220 px cards, one
   per world, each linking to a second screen. A registry is read down a column,
   not across a grid: the eye compares « N lieux » between neighbours, which a
   wrapping grid makes impossible. */
import { moveFocusInList, tabIndexInList } from './listKeys'
import type { WorldSummary } from './useWorldRegistry'

const ROW =
  /* The left rule is the selection marker (§S3), so the three other sides are
     zeroed EXPLICITLY rather than through `border-0`: both are border-width
     utilities, and which one wins would be decided by the sheet's sort order
     instead of by this line. */
  'block w-full cursor-pointer border-y-0 border-r-0 border-l-2 bg-transparent ' +
  'px-[10px] py-[7px] text-left ' +
  'focus-visible:outline-2 focus-visible:outline-focus focus-visible:outline-offset-[-2px]'
const ROW_ON = 'border-l-acc bg-panel3'
const ROW_OFF = 'border-l-transparent hover:bg-panel'

export function WorldList({
  worlds,
  selectedId,
  onSelect,
  onNew,
}: {
  worlds: WorldSummary[]
  selectedId: string | null
  onSelect: (id: string) => void
  onNew: () => void
}) {
  return (
    <>
      <h2 className="m-0 flex-none px-[10px] py-[10px] text-[10.5px]">Mondes · {worlds.length}</h2>

      <div
        className="min-h-0 flex-1 overflow-y-auto pb-[8px]"
        role="listbox"
        aria-label="Registre des mondes"
      >
        {worlds.map((world, index) => {
          const on = world.id === selectedId
          return (
            <button
              key={world.id}
              type="button"
              role="option"
              aria-selected={on}
              data-world-card
              tabIndex={tabIndexInList(on, index === 0, Boolean(selectedId))}
              className={`${ROW} ${on ? ROW_ON : ROW_OFF}`}
              onClick={() => onSelect(world.id)}
              onKeyDown={moveFocusInList}
            >
              <span className="flex items-baseline gap-[8px]">
                <span className={`min-w-0 flex-1 truncate text-[13.5px] ${on ? 'font-semibold' : ''}`}>
                  {world.label}
                </span>
                <span className="flex-none text-[11.5px] tabular-nums text-dim2">
                  {world.places_count > 0
                    ? `${world.places_count} lieu${world.places_count > 1 ? 'x' : ''}`
                    : 'vide'}
                </span>
              </span>
              <span className="mt-[2px] block truncate text-[11px] text-dim2">
                <code className="font-code text-[11px] leading-[normal]">{world.id}</code>
                {(world.compatible_families ?? []).length > 0 && (
                  <> · {(world.compatible_families ?? []).join(', ')}</>
                )}
              </span>
            </button>
          )
        })}
      </div>

      <div className="flex-none border-t border-t-line p-[10px]">
        <button type="button" className="btn sm w-full" data-new onClick={onNew}>
          + Nouveau monde
        </button>
      </div>
    </>
  )
}
