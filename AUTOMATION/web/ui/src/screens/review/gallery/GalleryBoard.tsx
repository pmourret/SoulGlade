/* The publication board (design-pass screen-5c, §S3).

   A GRID OF EQUAL CELLS LIED ABOUT THE IMAGES. The Revue's grid crops every
   thumbnail to 4:5 because it is a sorting surface, where what matters is
   comparing scores at a glance. Here one is choosing what to publish, and the
   FRAME is the subject: a 9:16 story and a 4:5 feed image are not the same
   object, and showing them as identical squares hides exactly the thing one
   is deciding on. Each image keeps its real ratio, and the rows justify.

   THE ARITHMETIC IS NOT HERE. `justifyRows`, `groupBy` and `ratioOf` live in
   `boardLayout.ts`, pure and unit-tested (AUTOMATION/tests/test_board_layout.js):
   a justification algorithm is exactly the kind of thing one wants to try on
   a zero width and on a 16:9 image too wide for its container without mounting
   React to do it.

   `role="grid"`: one `rowgroup` per group, one `row` per justified line, one
   `gridcell` per thumbnail, roving tabindex in reading order. The group's
   HEADING stays outside the rowgroup and names it through `aria-labelledby` —
   slid inside, it would be a row that holds no cell. */
import { useEffect, useLayoutEffect, useRef, useState } from 'react'

import { Icon } from '../../../chrome/Icon'
import { justifyRows, type Group } from './boardLayout'
import type { GalleryItem } from '../useTriage'

const GAP = 10

export function GalleryBoard({
  groups,
  /** Reading order across every group — the cursor and Shift-range use it. */
  order,
  cursorName,
  cart,
  targetHeight,
  imageUrl,
  onAim,
  onOpen,
  onCartToggle,
  onAddGroup,
  onMenu,
}: {
  groups: Group<GalleryItem>[]
  order: string[]
  cursorName: string | null
  cart: Set<string>
  targetHeight: number
  imageUrl: (ref: Record<string, unknown>) => string
  onAim: (name: string) => void
  onOpen: (name: string) => void
  onCartToggle: (name: string, index: number, event: { shiftKey: boolean }) => void
  onAddGroup: (names: string[]) => void
  onMenu: (name: string, at: { x: number; y: number } | null) => void
}) {
  const boardRef = useRef<HTMLDivElement | null>(null)
  const [width, setWidth] = useState(0)

  /* The width is MEASURED, never assumed: the board sits between a flexible
     centre and a panel that becomes a drawer, so no arithmetic on the
     viewport would be right at both widths. `useLayoutEffect` for the first
     read, so the first paint is already justified rather than reflowing. */
  useLayoutEffect(() => {
    const el = boardRef.current
    if (!el) return
    const observer = new ResizeObserver((entries) => {
      setWidth(entries[0].contentRect.width)
    })
    observer.observe(el)
    setWidth(el.getBoundingClientRect().width)
    return () => observer.disconnect()
  }, [])

  /* The aimed image is brought into view when the cursor moves from the
     keyboard. Manual `scrollTop` math, never `scrollIntoView` (proscrit ici):
     it moves by exactly the overflow, on either edge, nothing more. */
  useEffect(() => {
    const el = boardRef.current
    if (!el || !cursorName) return
    const node = el.querySelector<HTMLElement>(`[data-tile][data-n="${CSS.escape(cursorName)}"]`)
    if (!node) return
    const box = el.getBoundingClientRect()
    const rect = node.getBoundingClientRect()
    if (rect.top < box.top) el.scrollTop -= box.top - rect.top
    else if (rect.bottom > box.bottom) el.scrollTop += rect.bottom - box.bottom
  }, [cursorName])

  return (
    <div
      ref={boardRef}
      className="min-h-0 flex-1 overflow-y-auto px-[16px] py-[14px]"
      role="grid"
      aria-label="Planche de publication"
      id="galleryBoard"
    >
      {groups.map((group) => {
        const rows = justifyRows(group.items, width, targetHeight, GAP)
        const formats = [...new Set(group.items.map((i) => i.format || 'sans format'))]
        const titleId = `grp-${group.key.replace(/\W+/g, '-')}`
        return (
          <section key={group.key} className="mb-[26px] last:mb-0">
            {/* Outside the rowgroup, and naming it: a heading that held no
                cell would be a row that lies about the grid's shape. */}
            <header className="mb-[10px] flex items-baseline gap-[10px] border-b border-b-line pb-[7px]">
              <h2
                className="m-0 flex-none text-[14px] font-[650] normal-case tracking-normal text-txt"
                id={titleId}
              >
                {group.label}
              </h2>
              <span className="min-w-0 flex-1 truncate text-[12px] text-dim2">
                {group.items.length} image{group.items.length > 1 ? 's' : ''} ·{' '}
                {formats.join(', ')}
              </span>
              <button
                type="button"
                className="link flex-none text-[12.5px]"
                data-add-group={group.key}
                onClick={() => onAddGroup(group.items.map((i) => i.name))}
              >
                Tout ajouter au panier
              </button>
            </header>

            <div role="rowgroup" aria-labelledby={titleId}>
              {rows.map((row, r) => (
                <div
                  key={r}
                  role="row"
                  className="flex"
                  style={{ gap: GAP, marginBottom: r < rows.length - 1 ? GAP : 0 }}
                >
                  {row.items.map(({ item, width: w, height: h }) => {
                    const index = order.indexOf(item.name)
                    const inCart = cart.has(item.name)
                    const aimed = cursorName === item.name
                    return (
                      <BoardTile
                        key={item.name}
                        item={item}
                        index={index}
                        width={w}
                        height={h}
                        aimed={aimed}
                        inCart={inCart}
                        src={imageUrl({ ...item, thumb: true })}
                        onAim={() => onAim(item.name)}
                        onOpen={() => onOpen(item.name)}
                        onCartToggle={(event) => onCartToggle(item.name, index, event)}
                        onMenu={(at) => onMenu(item.name, at)}
                      />
                    )
                  })}
                </div>
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}

function BoardTile({
  item,
  index,
  width,
  height,
  aimed,
  inCart,
  src,
  onAim,
  onOpen,
  onCartToggle,
  onMenu,
}: {
  item: GalleryItem
  index: number
  width: number
  height: number
  aimed: boolean
  inCart: boolean
  src: string
  onAim: () => void
  onOpen: () => void
  onCartToggle: (event: { shiftKey: boolean }) => void
  onMenu: (at: { x: number; y: number } | null) => void
}) {
  /* Aimed and in-cart are told apart by SHAPE as well as hue: the aimed one
     is outlined in `--txt`, the one in the cart in `--acc` AND carries a
     ticked box. The outlines are drawn inside, so the row never reflows. */
  const ring = aimed
    ? 'outline-2 outline-txt [outline-offset:-2px]'
    : inCart
      ? 'outline-2 outline-acc [outline-offset:-2px]'
      : ''
  return (
    <div
      role="gridcell"
      className={`group relative flex-none overflow-hidden rounded-[4px] bg-panel ${ring}`}
      style={{ width, height }}
      data-tile
      data-n={item.name}
      data-k={index}
      data-cur={aimed ? '1' : undefined}
      aria-current={aimed ? 'true' : undefined}
      onContextMenu={(event) => {
        event.preventDefault()
        onAim()
        onMenu({ x: event.clientX, y: event.clientY })
      }}
    >
      {/* Adds to the cart or takes out of it. A real `<input type=checkbox>`,
          restyled: it is already a toggle and it reports `.checked`. `p-0`
          because `chrome.css` gives every input 8px/10px of padding, which is
          wider than the 18 px asked for (measured on the Revue's own box). */}
      <input
        type="checkbox"
        data-select
        checked={inCart}
        aria-label={`Ajouter ${item.scene || item.name} au panier`}
        className="absolute top-[8px] left-[8px] z-[2] h-[18px] w-[18px] cursor-pointer
                   appearance-none rounded-[4px] border border-[#ffffff55] bg-scrim p-0
                   checked:border-acc checked:bg-acc
                   focus-visible:outline-2 focus-visible:outline-focus
                   focus-visible:outline-offset-2"
        onChange={() => {}}
        onClick={(event) => {
          event.stopPropagation()
          onCartToggle({ shiftKey: event.shiftKey })
        }}
      />
      {inCart && (
        <Icon
          name="check"
          className="pointer-events-none absolute top-[9px] left-[9px] z-[3] h-[16px] w-[16px]
                     text-on-acc"
        />
      )}

      <button
        type="button"
        className="block h-full w-full cursor-pointer [border:0] bg-transparent p-0
                   focus-visible:[box-shadow:0_0_0_4px_var(--scrim)]
                   focus-visible:outline-offset-[-2px]"
        data-thumb
        data-k={index}
        onClick={onAim}
        onDoubleClick={onOpen}
        onFocus={onAim}
        onKeyDown={(event) => {
          /* ENTREE OUVRE, explicitement. Sur la grille de la Revue le clic
             d'une vignette OUVRE, donc Entree ouvrait par simple activation
             du bouton focalise. Ici le clic VISE et le double-clic ouvre
             (§S3) : l'activation ne faisait donc que re-viser, et Entree ne
             menait nulle part. Mesure a l'audit — `entreeOuvreLoupe: false`.
             `useReviewKeys` ne peut pas rattraper ca : sa propre garde ignore
             Entree quand le focus est sur un bouton, precisement pour ne pas
             trier ET agrandir d'un coup. */
          if (event.key === 'Enter') {
            event.preventDefault()
            onOpen()
            return
          }
          if (event.key === 'ContextMenu' || (event.key === 'F10' && event.shiftKey)) {
            event.preventDefault()
            onAim()
            onMenu(null)
          }
        }}
      >
        <img className="block h-full w-full object-cover" loading="lazy" src={src} alt="" />
      </button>

      {/* The format as a WORD, bottom-left: the ratio is visible in the
          thumbnail's own shape, but « 9:16 » is what one says out loud, and a
          shape is not a label (frontend.md — jamais la couleur ni la forme
          seule). */}
      <span
        className="pointer-events-none absolute bottom-[6px] left-[6px] rounded-[4px] bg-scrim
                   px-[6px] py-px text-[10px] font-semibold text-dim"
      >
        {item.format || 'sans format'}
      </span>
    </div>
  )
}
