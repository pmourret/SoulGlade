/* One image of the grid. Since the design-pass screen-5b it is an IMAGE
   again: a thumbnail, a selection box, and one line of text.

   WHAT LEFT, AND WHY. The tile used to carry a score pill over the picture,
   three realism bars, and a row of seven glyphs (♥ ⟳ ✕ ▣ ◉ ◌ 🗑). Twenty of
   them on screen turned a contact sheet into twenty dashboards: the thing one
   comes to look at — the photograph — was the smallest part of its own tile,
   and the glyphs announced themselves literally to a screen reader. The
   gestures did not disappear with the row; they have three ways in, and all
   three were already there or are named by the design-pass: the keyboard on
   the aimed tile, the bulk bar on a selection, and a context menu
   (`TileMenu.tsx`) that lists the same actions WITH their key.

   It decides NOTHING — every gesture is a callback handed down by the screen.
   What it does own is the aimed-at marker: without it, V/X/A sorted the first
   image of the list with nothing on screen to say so. */
import { Icon } from '../../chrome/Icon'
import { scoreBand, scoreClass, type GalleryItem } from './useTriage'

/* The hue of a score, by the SAME tiers the filter and the verdict use
   (`scoreClass`). Never a second set of bounds — that is how « Correctes »
   and « Excellentes » once ended up with the same badge. */
const DOT_TINT: Record<string, string> = {
  high: 'bg-high',
  ok: 'bg-ok',
  warn: 'bg-warn',
  bad: 'bg-bad',
  none: 'bg-dim2',
}

export function Tile(props: {
  item: GalleryItem
  index: number
  current: boolean
  qc: { ok: number; watch: number; high: number }
  src: string
  selected: boolean
  onSelectClick: (name: string, index: number, event: { shiftKey: boolean }) => void
  onAim: () => void
  onOpen: () => void
  /** Opens the context menu for this tile, at a point or centred on it. */
  onMenu: (at: { x: number; y: number } | null) => void
}) {
  const { item, qc } = props
  /* Shape says the VERDICT (inside the band or under it), hue says how far.
     Two signals, so the reading survives without colour — and a diamond is
     the same mark the passport and the property panel already use for a
     value that is out of band. */
  const underBand = scoreBand(item.score, qc) === 'bas'
  /* Aimed and selected must be told apart WITHOUT relying on their two hues:
     the checked box is the second signal for selection, and `aria-current`
     the second one for aimed. Both are outlines drawn inside, so a tile never
     reflows when its state changes. */
  const ring = props.current
    ? 'outline-2 outline-txt [outline-offset:-2px]'
    : props.selected
      ? 'outline-2 outline-acc [outline-offset:-2px]'
      : ''

  return (
    <div
      className={`group relative overflow-hidden rounded-[6px] border border-line bg-panel
                  ${ring} ${item.flag === 'ia' ? 'opacity-[.62]' : ''}`}
      data-tile
      data-cur={props.current ? '1' : undefined}
      aria-current={props.current ? 'true' : undefined}
      data-k={props.index}
      onMouseDown={(event) => {
        // the selection checkbox places the selection itself
        if ((event.target as HTMLElement).closest('[data-select]')) return
        props.onAim()
      }}
      /* Right-click, and the two keyboard equivalents, open the same menu.
         `preventDefault` so the browser's own menu does not cover ours. */
      onContextMenu={(event) => {
        event.preventDefault()
        props.onAim()
        props.onMenu({ x: event.clientX, y: event.clientY })
      }}
    >
      {/* Selection checkbox (design-pass screen-5, §D/§B) — feeds both the
          bulk action bar and Comparer mode. A real `<input type="checkbox">`,
          restyled: it is already a toggle, it reports `.checked`, and it is a
          SIBLING of the thumbnail button, never nested inside it (a checkbox
          inside a button is invalid HTML and breaks screen-reader semantics).
          Square 18 px per §S3.4 — a circle would read as a radio, and picking
          images for a batch is a multiple choice. */}
      <input
        type="checkbox"
        data-select
        checked={props.selected}
        aria-label={`Sélectionner ${item.scene || item.name} pour comparer`}
        /* `p-0` IS LOAD-BEARING. `chrome.css:453` gives every `input` a
           `padding:8px 10px`, and with `box-sizing:border-box` those 20 px of
           horizontal padding are wider than the 18 px asked for, so the box
           grew to 22×18 — a rectangle where the design-pass asks for a square,
           measured in the browser (audit du 23/09). `appearance-none` drops
           the native control, not the sheet's padding. */
        className="absolute top-[8px] left-[8px] z-[1] h-[18px] w-[18px] cursor-pointer
                   appearance-none rounded-[4px] border border-[#ffffff55] bg-scrim p-0
                   checked:border-acc checked:bg-acc
                   focus-visible:outline-2 focus-visible:outline-focus
                   focus-visible:outline-offset-2"
        onChange={() => {}}
        onClick={(event) => {
          event.stopPropagation()
          props.onSelectClick(item.name, props.index, { shiftKey: event.shiftKey })
        }}
      />
      {props.selected && (
        <Icon
          name="check"
          className="pointer-events-none absolute top-[9px] left-[9px] z-[2] h-[16px] w-[16px]
                     text-on-acc"
        />
      )}
      {/* An image the pack marks as « on voit que c'est généré » is dimmed —
          and SAID, never dimmed alone: opacity is not a status (frontend.md). */}
      {item.flag === 'ia' && (
        <span
          className="absolute top-[8px] right-[8px] z-[1] rounded-[4px] bg-scrim px-[6px] py-px
                     text-[10px] font-semibold tracking-[.4px] text-dim"
        >
          FAIT IA
        </span>
      )}
      {/* clickable thumbnail: a <button>, for keyboard access to the full frame.
          The ring lands on a PHOTO, of which we know nothing: the dark halo gives
          it a constant ground, without which it vanishes on a light image. */}
      <button
        type="button"
        className="block w-full cursor-zoom-in [border:0] bg-transparent p-0
                   focus-visible:[box-shadow:0_0_0_4px_var(--scrim)]
                   focus-visible:outline-offset-[-2px]"
        data-thumb
        data-k={props.index}
        title="Ouvrir en grand"
        onClick={props.onOpen}
        /* Shift+F10 and the Menu key are the keyboard's context menu, and
           they must reach it from the control that has the focus. */
        onKeyDown={(event) => {
          if (event.key === 'ContextMenu' || (event.key === 'F10' && event.shiftKey)) {
            event.preventDefault()
            props.onAim()
            props.onMenu(null)
          }
        }}
      >
        <img
          className="block aspect-[4/5] w-full cursor-zoom-in bg-[#0f1114] object-cover"
          loading="lazy"
          src={props.src}
          alt=""
        />
      </button>
      {/* ONE line under the image: who it is, how it scored. The band is a
          SHAPE as well as a hue — a dot inside the band, a diamond under it —
          so the verdict survives without colour (frontend.md). */}
      <div className="flex items-baseline gap-[7px] px-[9px] py-[7px] text-[12px]">
        <b className="min-w-0 flex-1 truncate text-[12px] font-semibold text-txt">
          {item.scene || item.name}
        </b>
        <span
          className={`h-[6px] w-[6px] flex-none ${underBand ? 'rotate-45' : 'rounded-full'} ${
            DOT_TINT[scoreClass(item.score, qc)]
          }`}
          aria-hidden="true"
        />
        <span className="flex-none tabular-nums text-dim2">
          {item.score ? Number.parseFloat(item.score).toFixed(2) : '—'}
        </span>
      </div>
    </div>
  )
}
