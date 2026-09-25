/* The work surface (design-pass screen-10 §S4): the composited canvas, the
   curtain and its handle, the floating mask bar, the native dimensions and
   the zoom controls.

   THE CANVAS STAYS THE DIRECT CHILD of the element that scrolls. Panning is
   native scrolling (useZoomPan.ts), the crop/mask maths measure against
   that box, and the fumigation reaches it by `#peCanvas`'s parent — three
   reasons not to slip a wrapper in between.

   `position:relative` sits on the OUTER box for ZoomControls and on the
   SCROLLING box for the curtain, and the difference is the whole point: an
   absolutely positioned child of a scroller is part of its content and
   scrolls WITH it. The zoom buttons must not (they would drift off screen,
   found by testing), the curtain must (it has to stay on the image).

   Presentational only (frontend.md): every gesture is a callback, `geom` is
   measured by the Screen inside the same layout effect that sizes the
   canvas — measuring it here would read the size of the PREVIOUS render,
   since a child's effects run before its parent's. */
import { ZoomControls } from '../../chrome/ZoomControls'
import { MASK_LABELS } from './MaskPicker'
import type { MaskMode } from './photoEditorLayersPixels'

export type CanvasGeom = { left: number; top: number; width: number; height: number }

export function PreviewStage({
  canvasRef, stageRef, geom, imageError, naturalWidth, naturalHeight,
  curtain, onCurtain, maskTarget, maskMode, onMaskDone, onPointerDown, zoom,
}: {
  canvasRef: React.RefObject<HTMLCanvasElement | null>
  stageRef: React.RefObject<HTMLDivElement | null>
  geom: CanvasGeom
  imageError: boolean
  naturalWidth: number
  naturalHeight: number
  /** Curtain position, 0 to 100. `null` when the curtain is not the mode. */
  curtain: number | null
  onCurtain: (value: number) => void
  maskTarget: 'blur' | 'ai' | null
  maskMode: MaskMode
  onMaskDone: () => void
  onPointerDown: (event: React.PointerEvent) => void
  zoom: {
    zoomPct: number
    fitPct: number
    zoomOut: () => void
    zoomToFit: () => void
    zoomIn: () => void
  }
}) {
  const fromClientX = (clientX: number) => {
    const canvas = canvasRef.current
    if (!canvas || geom.width === 0) return 50
    const rect = canvas.getBoundingClientRect()
    return Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100))
  }

  const startCurtainDrag = (event: React.PointerEvent) => {
    event.preventDefault()
    onCurtain(fromClientX(event.clientX))
    const move = (moveEvent: PointerEvent) => onCurtain(fromClientX(moveEvent.clientX))
    const stop = () => document.removeEventListener('pointermove', move)
    document.addEventListener('pointermove', move)
    document.addEventListener('pointerup', stop, { once: true })
  }

  const onCurtainKeyDown = (event: React.KeyboardEvent) => {
    const at = curtain ?? 50
    if (event.key === 'ArrowLeft') onCurtain(Math.max(0, at - 2))
    else if (event.key === 'ArrowRight') onCurtain(Math.min(100, at + 2))
    else if (event.key === 'Home') onCurtain(0)
    else if (event.key === 'End') onCurtain(100)
    else return
    event.preventDefault()
  }

  return (
    <div className="relative flex min-h-0 min-w-0 bg-[#0a0a0a]">
      <div className="relative flex h-full w-full overflow-auto p-[16px]" ref={stageRef}>
        {imageError ? (
          <div className="m-auto text-center text-[13px] text-danger-txt">
            <div aria-hidden="true" className="mb-[6px] text-[20px]">
              ◆
            </div>
            Échec du chargement de l’image
          </div>
        ) : (
          <canvas
            className={`m-auto block rounded-[2px]${maskTarget ? ' cursor-crosshair' : ''}`}
            id="peCanvas"
            onPointerDown={maskTarget ? onPointerDown : undefined}
            ref={canvasRef}
          />
        )}

        {curtain !== null && geom.width > 0 && (
          /* Inside the scroller, so it travels with the image. The two
             composed halves are painted on the canvas itself; what lives
             here is only what must be grabbed, read or focused. */
          <div
            className="pointer-events-none absolute"
            style={{ height: geom.height, left: geom.left, top: geom.top, width: geom.width }}
          >
            <span className="absolute left-[8px] top-[8px] rounded-[4px] bg-scrim px-[6px] py-[2px] text-[10.5px] tracking-[.6px] text-txt">
              AVANT
            </span>
            <span className="absolute right-[8px] top-[8px] rounded-[4px] bg-scrim px-[6px] py-[2px] text-[10.5px] tracking-[.6px] text-txt">
              APRÈS
            </span>
            <div
              className="pointer-events-auto absolute top-0 h-full w-[2px] cursor-ew-resize bg-txt"
              onPointerDown={startCurtainDrag}
              style={{ left: `calc(${curtain}% - 1px)` }}
            >
              <button
                aria-label="Position du rideau avant après"
                aria-valuemax={100}
                aria-valuemin={0}
                aria-valuenow={Math.round(curtain)}
                aria-valuetext={`${Math.round(curtain)} %`}
                className="absolute left-1/2 top-1/2 flex h-[28px] w-[28px] -translate-x-1/2 -translate-y-1/2
                           cursor-ew-resize items-center justify-center rounded-full border border-line2
                           bg-txt text-[13px] leading-none text-bg"
                onKeyDown={onCurtainKeyDown}
                onPointerDown={startCurtainDrag}
                role="slider"
                tabIndex={0}
                type="button"
              >
                <span aria-hidden="true">⇆</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {maskTarget && (
        <div
          className="absolute left-1/2 top-[10px] flex -translate-x-1/2 items-center gap-[10px]
                     rounded-[8px] border border-line2 bg-panel px-[10px] py-[6px] text-[12px] shadow-[var(--elev)]"
          role="status"
        >
          <span aria-hidden="true" className="h-[8px] w-[8px] shrink-0 rounded-full" style={{ background: 'var(--bad)' }} />
          <span className="text-txt">
            Masque {maskTarget === 'blur' ? 'du flou' : 'de la retouche IA'} · {MASK_LABELS[maskMode]}
          </span>
          <span className="text-dim2">glisser sur l’image</span>
          <button className="btn primary sm !px-[10px] !py-[2px]" onClick={onMaskDone} type="button">
            Terminer
          </button>
          <span className="kbd">Échap</span>
        </div>
      )}

      {naturalWidth > 0 && (
        <span className="absolute bottom-[8px] left-[8px] rounded-[4px] bg-scrim px-[6px] py-[3px] text-[11px] tabular-nums text-dim">
          {naturalWidth} × {naturalHeight}
        </span>
      )}

      {naturalWidth > 0 && (
        <ZoomControls
          className="right-[8px]"
          fitPct={zoom.fitPct}
          onZoomIn={zoom.zoomIn}
          onZoomOut={zoom.zoomOut}
          onZoomToFit={zoom.zoomToFit}
          zoomPct={zoom.zoomPct}
        />
      )}
    </div>
  )
}
