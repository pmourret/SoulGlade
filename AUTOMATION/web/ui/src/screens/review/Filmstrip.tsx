/* Persistent filmstrip under the full-frame stage (design-pass screen-5,
   §A) — Lightroom/Resolve keep a strip of thumbnails visible no matter the
   display mode; this screen used to navigate blind, with only two arrows
   and a text counter to say where one stood in the folder.

   `role="listbox"` / `role="option"` / `aria-selected`, built on the same
   `useRovingChoice` as the radiogroups elsewhere in this screen — the hook
   is ARIA-role-agnostic (only the JSX marks the role), and "arrow moves the
   selection AND picks it immediately" is exactly the gesture wanted here:
   the same jump as the existing ‹ › arrows, a second SURFACE for it, not a
   second system.

   Thumbnails are pre-resolved `thumbSrc` strings, computed by
   `ReviewScreen.tsx` — this component never calls the API (frontend.md).

   Auto-scroll is manual `scrollLeft` math, never `scrollIntoView` (proscrit
   ici) — moves the strip by exactly the overflow, on either edge, nothing
   more. */
import { useEffect, useRef } from 'react'

import { useRovingChoice } from '../../chrome/useRovingChoice'

export function Filmstrip({
  items,
  currentIndex,
  onSelectIndex,
}: {
  items: { name: string; thumbSrc: string }[]
  currentIndex: number
  onSelectIndex: (index: number) => void
}) {
  const ids = items.map((_, index) => String(index))
  const safeIndex = items.length ? Math.min(currentIndex, items.length - 1) : -1
  const activeId = safeIndex >= 0 ? String(safeIndex) : null
  const roving = useRovingChoice(ids, activeId)

  const trackRef = useRef<HTMLDivElement | null>(null)
  const optionRefs = useRef(new Map<number, HTMLButtonElement>())

  useEffect(() => {
    const track = trackRef.current
    const node = optionRefs.current.get(safeIndex)
    if (!track || !node) return
    const trackRect = track.getBoundingClientRect()
    const nodeRect = node.getBoundingClientRect()
    if (nodeRect.left < trackRect.left) track.scrollLeft -= trackRect.left - nodeRect.left
    else if (nodeRect.right > trackRect.right) track.scrollLeft += nodeRect.right - trackRect.right
  }, [safeIndex])

  if (!items.length) return null

  return (
    <div
      ref={trackRef}
      role="listbox"
      aria-label="Images du dossier"
      /* 84 px of bar for 64 px of thumbnail (design-pass screen-5b, §S3.3),
         flush against the action bar above it: it is a row of the loupe now,
         not a card floating under a stage. */
      className="flex h-[84px] flex-none items-center gap-[6px] overflow-x-auto
                 border-t border-t-line bg-panel px-[10px]"
      id="filmstrip"
    >
      {items.map((entry, index) => {
        const id = String(index)
        return (
          <button
            key={entry.name}
            ref={(el) => {
              roving.registerRef(id)(el)
              if (el) optionRefs.current.set(index, el)
              else optionRefs.current.delete(index)
            }}
            role="option"
            aria-selected={index === safeIndex}
            aria-label={entry.name}
            tabIndex={roving.tabIndexFor(id)}
            type="button"
            /* The current one is outlined INSIDE, so the strip never shifts
               by 2 px when the cursor moves along it; the others sit at .7 —
               and the outline, not the opacity, is what says which is which
               (opacity is not a status, frontend.md). */
            className={`h-[64px] w-[64px] flex-none cursor-pointer overflow-hidden rounded-[4px]
                        border-0 p-0
                        focus-visible:outline-2 focus-visible:outline-focus focus-visible:outline-offset-2
                        ${
                          index === safeIndex
                            ? 'outline-2 outline-acc [outline-offset:-2px]'
                            : 'opacity-70 hover:opacity-100'
                        }`}
            onClick={() => onSelectIndex(index)}
            onKeyDown={(event) => roving.onKeyDown(event, id, (nextId) => onSelectIndex(Number(nextId)))}
          >
            <img
              className="block h-full w-full object-cover"
              src={entry.thumbSrc}
              alt=""
              loading="lazy"
            />
          </button>
        )
      })}
    </div>
  )
}
