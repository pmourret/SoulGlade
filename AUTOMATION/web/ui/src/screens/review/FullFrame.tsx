/* The loupe: the image, its action bar, and the filmstrip. Nothing else.

   THE META COLUMN LEFT (design-pass screen-5b, §S3.3). This component used to
   be a two-column grid — the stage on the left, five stacked `.meta` cards on
   the right — which made it a small screen inside the screen. The readings
   moved to the inspector, which is now a column of the SCREEN, so the loupe
   is one column: look, act, move on.

   ALL THE ZOOM MACHINERY IS UNCHANGED: fixed steps, a non-passive `wheel`
   listener, a 5 px pan threshold, a plain click at 100 % that opens the
   lightbox, a double click that resets. The fumigation walks every one of
   those (§5bis), and none of them is a layout concern.

   Same rule as the tile — it renders, the screen decides. */
import { useCallback, useEffect, useRef, useState } from 'react'

import { ActionBar } from './ActionBar'
import { Filmstrip } from './Filmstrip'
import type { GalleryItem, Trade } from './useTriage'

/* The two arrows of the stage. `[transform:...]` and not `-translate-y-1/2`:
   the utility writes the `translate` property, the sheet wrote `transform`, and
   the computed style is not the same thing. */
const NAV =
  'absolute top-1/2 [transform:translateY(-50%)] h-[56px] w-[34px] cursor-pointer' +
  ' [border:0] bg-scrim text-[20px] text-txt focus-visible:outline-offset-[-2px]'

/* In-place zoom (design-pass screen-5, §C) — fixed steps, not a continuous
   range: the document names 100/150/200% explicitly. A drag beyond
   `PAN_THRESHOLD_PX` turns a pointer gesture into a pan instead of a click;
   under it, it is still a plain click and must keep opening the lightbox
   exactly as before (test_review.js depends on a bare click on `#stageImg`
   doing that) — completely separate machinery from `PhotoEditor.tsx`'s
   canvas geometry (`chrome/LightboxContext.tsx` confirmed no shared state
   either). */
const ZOOM_STEPS = [100, 150, 200]
const PAN_THRESHOLD_PX = 5

export function FullFrame(props: {
  item: GalleryItem
  index: number
  trade: Trade
  src: string
  filmstripItems: { name: string; thumbSrc: string }[]
  onStep: (delta: number) => void
  onSelectIndex: (index: number) => void
  onMagnify: () => void
  onAct: (action: string) => void
  onEdit: () => void
  onDelete: () => void
}) {
  const [zoom, setZoom] = useState(100)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const dragRef = useRef<{ startX: number; startY: number; startPanX: number; startPanY: number; moved: boolean } | null>(null)
  const justDraggedRef = useRef(false)
  const imgRef = useRef<HTMLImageElement | null>(null)

  const resetZoom = useCallback(() => {
    setZoom(100)
    setPan({ x: 0, y: 0 })
  }, [])
  const zoomIn = useCallback(() => {
    setZoom((z) => ZOOM_STEPS[Math.min(ZOOM_STEPS.indexOf(z) + 1, ZOOM_STEPS.length - 1)])
  }, [])
  const zoomOut = useCallback(() => {
    setZoom((z) => {
      const next = ZOOM_STEPS[Math.max(ZOOM_STEPS.indexOf(z) - 1, 0)]
      if (next === 100) setPan({ x: 0, y: 0 })
      return next
    })
  }, [])

  /* A NATIVE listener, not React's `onWheel` — found live (design-pass
     screen-5, §C): React attaches wheel/touch listeners as passive for
     scroll performance, so a synthetic event's `preventDefault()` silently
     no-ops (logged: "Unable to preventDefault inside passive event listener
     invocation") and the ambient page would still be free to scroll under
     the zoom gesture. `{ passive: false }` here is what actually lets the
     gesture claim the wheel. */
  useEffect(() => {
    const el = imgRef.current
    if (!el) return
    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      if (event.deltaY < 0) zoomIn()
      else zoomOut()
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [zoomIn, zoomOut])

  /* Pan only makes sense zoomed in — at 100% nothing new listens, which is
     what keeps a plain click at 100% behaving exactly as before (no pointer
     machinery attached at all). */
  const onImgPointerDown = (event: React.PointerEvent) => {
    if (zoom <= 100) return
    dragRef.current = { startX: event.clientX, startY: event.clientY, startPanX: pan.x, startPanY: pan.y, moved: false }
    event.currentTarget.setPointerCapture(event.pointerId)
  }
  const onImgPointerMove = (event: React.PointerEvent) => {
    const drag = dragRef.current
    if (!drag) return
    const dx = event.clientX - drag.startX
    const dy = event.clientY - drag.startY
    if (!drag.moved && Math.hypot(dx, dy) > PAN_THRESHOLD_PX) drag.moved = true
    if (drag.moved) setPan({ x: drag.startPanX + dx, y: drag.startPanY + dy })
  }
  const onImgPointerUp = (event: React.PointerEvent) => {
    const drag = dragRef.current
    justDraggedRef.current = drag?.moved ?? false
    dragRef.current = null
    event.currentTarget.releasePointerCapture(event.pointerId)
  }
  /* A real drag must never also open the lightbox — a native `click` still
     fires after pointerup regardless of movement, so the decision is made
     here, not by trying to suppress `click` itself. Zoomed in, a plain
     (non-dragged) tap does nothing rather than racing the lightbox against
     double-click-to-reset (100%): the "−" button or a double-click gets you
     back to 100% first, unambiguously. */
  const onImgClick = () => {
    if (justDraggedRef.current) {
      justDraggedRef.current = false
      return
    }
    if (zoom === 100) props.onMagnify()
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col" data-triage>
      <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-bg">
        <button
          className={`${NAV} left-0 rounded-r-[8px]`}
          aria-label="Image précédente"
          onClick={() => props.onStep(-1)}
        >
          <span aria-hidden="true">‹</span>
        </button>
        <img
          className={`block max-h-full max-w-full rounded-[3px] touch-none select-none ${
            zoom > 100 ? 'cursor-grab active:cursor-grabbing' : 'cursor-zoom-in'
          }`}
          style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom / 100})` }}
          src={props.src}
          id="stageImg"
          alt=""
          ref={imgRef}
          onClick={onImgClick}
          onDoubleClick={resetZoom}
          onPointerDown={onImgPointerDown}
          onPointerMove={onImgPointerMove}
          onPointerUp={onImgPointerUp}
        />
        {/* Zoom controls (§C) — text label, never the cursor alone, and
            `aria-live="polite"` so a change is announced without stealing
            focus (distinct from `#edMsg`'s `role="status"` convention:
            different screen, the document asks for `aria-live` here
            specifically). */}
        <div
          className="absolute right-[10px] bottom-[10px] flex items-center gap-[8px]
                     rounded-[8px] bg-scrim px-[10px] py-[6px]"
        >
          <button
            className="cursor-pointer border-0 bg-transparent text-[16px] leading-none text-txt
                       focus-visible:outline-2 focus-visible:outline-focus focus-visible:outline-offset-2"
            aria-label="Dézoomer"
            disabled={zoom === ZOOM_STEPS[0]}
            onClick={zoomOut}
          >
            −
          </button>
          <span className="min-w-[38px] text-center text-[12.5px] tabular-nums text-txt" aria-live="polite">
            {zoom} %
          </span>
          <button
            className="cursor-pointer border-0 bg-transparent text-[16px] leading-none text-txt
                       focus-visible:outline-2 focus-visible:outline-focus focus-visible:outline-offset-2"
            aria-label="Zoomer"
            disabled={zoom === ZOOM_STEPS[ZOOM_STEPS.length - 1]}
            onClick={zoomIn}
          >
            +
          </button>
        </div>
        <button
          className={`${NAV} right-0 rounded-l-[8px]`}
          aria-label="Image suivante"
          onClick={() => props.onStep(1)}
        >
          <span aria-hidden="true">›</span>
        </button>
      </div>

      <ActionBar
        trade={props.trade}
        bucket={props.item.bucket}
        src={props.src}
        onAct={props.onAct}
        onEdit={props.onEdit}
        onDelete={props.onDelete}
      />

      <Filmstrip
        items={props.filmstripItems}
        currentIndex={props.index}
        onSelectIndex={props.onSelectIndex}
      />
    </div>
  )
}
