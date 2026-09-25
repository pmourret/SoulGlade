/* One line of the registry (design-pass screen-14 §S2). Presentation only.

   A REAL LINK. `href="?character=…"` keeps Ctrl, Maj and middle click meaning
   what they mean everywhere else; a plain click is the screen's decision
   (`onOpen`), which enters the studio without a reload.

   Type and world were two pills on the card; in a list they are columns, read
   down the page. The pills that remain are the two states worth stopping on,
   each with a shape as well as a colour — a square for adult content, a diamond
   for the breakdown. */
import { CharacterPortrait } from './CharacterPortrait'
import type { CharacterRow as Row } from '../../character/CharacterContext'

/* Every row is its own grid: the columns line up only because each track is
   FIXED — an `auto` tag column shifted type and world by the width of the
   pills (audit, 25/09/2026). */
export const ROW_GRID =
  'grid grid-cols-[36px_minmax(0,1fr)_180px_200px_190px] items-center gap-x-[16px]'

const TAG = 'inline-flex items-center gap-[6px] rounded-[20px] border px-[8px] py-[2px] text-[11px] whitespace-nowrap'

export function CharacterRow({
  row,
  current,
  active,
  tabIndex,
  rowRef,
  onOpen,
  onActivate,
}: {
  row: Row
  current: boolean
  /** Hovered or focused: the row the preview shows. */
  active: boolean
  tabIndex: 0 | -1
  rowRef: (el: HTMLAnchorElement | null) => void
  onOpen: () => void
  onActivate: () => void
}) {
  return (
    <a
      ref={rowRef}
      className={`${ROW_GRID} group h-[60px] border-b border-line px-[12px] text-txt no-underline
                  focus-visible:outline-2 focus-visible:outline-focus focus-visible:outline-offset-[-2px]
                  ${active ? 'bg-panel3 shadow-[inset_2px_0_0_var(--acc)]' : 'bg-transparent'}`}
      href={`?character=${encodeURIComponent(row.id)}`}
      tabIndex={tabIndex}
      data-char-card
      data-current={current ? '1' : undefined}
      onMouseEnter={onActivate}
      onFocus={onActivate}
      onClick={(event) => {
        // a modified click keeps the browser's own meaning
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return
        event.preventDefault()
        onOpen()
      }}
    >
      <CharacterPortrait
        key={row.id}
        id={row.id}
        name={row.name}
        knownPack={row.known_universe !== false}
        className="h-[44px] w-[36px] rounded-[6px]"
        initialClass="text-[15px]"
      />
      <span className="min-w-0">
        <span className="flex items-center gap-[8px]">
          <b className="truncate text-[14px] font-semibold">{row.name || row.id}</b>
          {current && (
            <span className={`${TAG} border-line2 text-dim`}>ouvert</span>
          )}
        </span>
        {/* --dim2 on --panel3 is 4.27:1 (tokens.css): the active row lifts the
            id to --dim rather than drop under 4.5. */}
        <code className={`block truncate font-code text-[12px] leading-[normal] ${active ? 'text-dim' : 'text-dim2'}`}>
          {row.id}
        </code>
      </span>
      <span className="truncate text-[13px] text-dim" data-col="type">{row.type || '—'}</span>
      <span className="truncate text-[13px] text-dim" data-col="world">{row.world?.label || '—'}</span>
      <span className="flex items-center justify-end gap-[6px]">
        {row.nsfw && (
          <span className={`${TAG} border-warn-line bg-warn-bg text-warn-txt`} data-char-tag>
            <i className="h-[6px] w-[6px] bg-warn" aria-hidden="true" />
            NSFW
          </span>
        )}
        {/* A pack the studio cannot resolve is a breakdown, not a case to
            repair in silence (ADR-0012). */}
        {row.known_universe === false && (
          <span className={`${TAG} border-danger-line bg-danger-bg text-danger-txt`} data-char-tag>
            <i className="h-[6px] w-[6px] rotate-45 bg-bad" aria-hidden="true" />
            pack inconnu
          </span>
        )}
        {/* Under 1100 px the preview is gone: the row says what a click does. */}
        <span
          className="hidden rounded-[6px] border border-line2 bg-panel2 px-[10px] py-[3px] text-[12px] text-txt
                     max-[1100px]:group-hover:inline max-[1100px]:group-focus-visible:inline"
          aria-hidden="true"
        >
          Ouvrir
        </span>
      </span>
    </a>
  )
}
