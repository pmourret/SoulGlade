/* The advanced (Lightroom-style) photo editor — `${PATHS.photoEditorAdvanced}
   /:name`, `bucket`/`space` as query params (see routes.ts's own note on why
   a photo resolves fully from those three, unlike the from-scratch pose
   flow's router `state`). Reached from the simplified modal's "Éditeur
   avancé" button (screens/review/PhotoEditor.tsx).

   THREE ZONES, EDGE TO EDGE (design-pass screen-10 §S1): the rounded cards
   and the centred `.wrap` are gone. The window is the workbench, each panel
   scrolls on its own, and the page itself never does.

   Composition only (frontend.md): state/gestures live in
   usePhotoEditorAdvanced.ts, the compositing math in
   photoEditorLayersPixels.ts. This file owns the one thing neither of those
   should — the canvas ref and the draw effect, same split PhotoEditor.tsx
   itself uses for its own single-layer canvas. */
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'

import { screenForImage } from '../../app/routes'
import { useConfirm } from '../../chrome/ConfirmContext'
import { useToast } from '../../chrome/ToastContext'
import { useZoomPan } from '../../chrome/useZoomPan'
import { AdvancedColorPanel } from './AdvancedColorPanel'
import { AiRetouchPanel } from './AiRetouchPanel'
import { EditorTopBar, type PreviewMode } from './EditorTopBar'
import { Histogram } from './Histogram'
import { HistoryPanel } from './HistoryPanel'
import { LayerList } from './LayerList'
import { LayerSettingsPanel } from './LayerSettingsPanel'
import { renderMaskAlpha } from './maskMath'
import { DEFAULT_MASK } from './MaskPicker'
import { PerspectivePanel } from './PerspectivePanel'
import {
  composeLayers, computeHistogram, NEUTRAL_SETTINGS, PRESETS, type Layer, type Mask,
} from './photoEditorLayersPixels'
import { PresetsPanel } from './PresetsPanel'
import { PreviewStage, type CanvasGeom } from './PreviewStage'
import { SharpenBlurPanel } from './SharpenBlurPanel'
import { usePhotoEditorAdvanced } from './usePhotoEditorAdvanced'

const SHELL = 'screen flex h-full min-h-0 flex-col overflow-hidden'
const LEFT = 'flex w-[220px] shrink-0 flex-col overflow-y-auto border-r border-line p-[12px] max-[1100px]:hidden'
const ASIDE =
  'flex w-[360px] shrink-0 flex-col overflow-y-auto border-l border-line p-[12px] max-[1100px]:w-[320px]'

export function PhotoEditorAdvancedScreen() {
  const { name } = useParams<{ name: string }>()
  const [searchParams] = useSearchParams()
  const bucket = searchParams.get('bucket') || 'OK'
  const space = searchParams.get('space') || 'sfw'
  if (!name) return null // unreachable: the route declares `:name` without `?`
  return <PhotoEditorAdvancedInner bucket={bucket} space={space} name={name} />
}

function PhotoEditorAdvancedInner({ bucket, space, name }: { bucket: string; space: string; name: string }) {
  const confirm = useConfirm()
  const toast = useToast()
  const {
    loading, loadError, imageEl, imageError,
    layers, selectedLayer, selectedLayerId, selectLayer,
    dirty, saving,
    updateSelectedSettings, commitSelectedSettings,
    addLayer, removeLayer, toggleVisible, setOpacity, reorder, applyPreset,
    undo, redo, canUndo, canRedo,
    history, historyCursor, jumpTo,
    save,
  } = usePhotoEditorAdvanced({ bucket, space, name })

  const [tab, setTab] = useState<'presets' | 'history'>('presets')
  const [leftOpen, setLeftOpen] = useState(false)
  const [mode, setMode] = useState<PreviewMode>('reglages')
  const [curtain, setCurtain] = useState(50)
  /* The preset under the pointer (or under focus), shown but NOT applied
     (§S3). It is deliberately not state the history knows about: nothing
     has happened yet. */
  const [previewPreset, setPreviewPreset] = useState<string | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const stageRef = useRef<HTMLDivElement | null>(null)
  const [histogram, setHistogram] = useState<number[] | null>(null)
  const [geom, setGeom] = useState<CanvasGeom>({ left: 0, top: 0, width: 0, height: 0 })
  const zoom = useZoomPan({
    stageRef,
    naturalWidth: imageEl?.naturalWidth ?? 0,
    naturalHeight: imageEl?.naturalHeight ?? 0,
  })

  /* Which preset the CURRENT history entry applied — derived from the entry
     itself rather than remembered on click, so the outline in the tile grid
     follows undo and redo without a second piece of state to keep in sync. */
  const appliedPresetId =
    PRESETS.find((p) => history[historyCursor]?.label === `Préréglage appliqué — ${p.label}`)?.id ?? null

  /* Mask placement (design-pass §7b masquage — shared by selective blur
     AND AI retouch, same `Mask` field shape, different `LayerSettings`
     key) happens ON THE PREVIEW ITSELF: pinceau/dégradé/radial need to see
     the image, not just a slider. `null` = not editing either;
     'blur'/'ai' says which of `blurMask`/`aiMask` the live gesture below
     reads and writes. Exits automatically on a layer switch: painting on
     the wrong layer's mask because "Modifier sur l'aperçu" silently
     survived a selection change would be a real trap, not a hypothetical
     one. */
  const [maskEditTarget, setMaskEditTarget] = useState<'blur' | 'ai' | null>(null)
  const maskDrag = useRef<{ field: 'blurMask' | 'aiMask'; mask: Mask } | null>(null)
  useLayoutEffect(() => {
    setMaskEditTarget(null)
  }, [selectedLayerId])

  useLayoutEffect(() => {
    const canvas = canvasRef.current
    const stage = stageRef.current
    if (!canvas || !stage || !imageEl) return
    /* The pixel BUFFER never exceeds native resolution (real detail up to
       100%, capped there to keep compositing bounded) — zooming further
       just magnifies that same native-resolution buffer via CSS, same as
       any image viewer past 100%. Below "fit", buffer and CSS size match
       exactly like before this feature existed (bufferScale ==
       displayScale whenever displayScale <= 1). */
    const bufferScale = Math.min(zoom.displayScale, 1)
    canvas.width = Math.max(40, Math.round(imageEl.naturalWidth * bufferScale))
    canvas.height = Math.max(40, Math.round(imageEl.naturalHeight * bufferScale))
    canvas.style.width = `${Math.round(imageEl.naturalWidth * zoom.displayScale)}px`
    canvas.style.height = `${Math.round(imageEl.naturalHeight * zoom.displayScale)}px`
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    /* Avant/après (same contract as PhotoEditor.tsx's own): every layer's
       COLOUR settings swap to neutral, nothing else about the stack
       (visibility/opacity/order) changes — it previews colour work only. */
    const neutralLayers: Layer[] = layers.map((l) => ({ ...l, settings: NEUTRAL_SETTINGS }))
    const preset = previewPreset ? PRESETS.find((p) => p.id === previewPreset) : undefined
    const shownLayers: Layer[] = preset
      ? layers.map((l) =>
          l.id === selectedLayerId ? { ...l, settings: { ...l.settings, ...preset.settings } } : l,
        )
      : (layers as Layer[])

    if (mode === 'avant') {
      composeLayers(ctx, canvas.width, canvas.height, imageEl, neutralLayers)
    } else if (mode === 'rideau') {
      /* THE CURTAIN IS TWO COMPOSITIONS AND A CLIP, on this same canvas —
         no second rendering path, and not one line of
         photoEditorLayersPixels.ts touched. Measured before being chosen
         (2026-09-25): one composition never dropped a frame, at three
         layers or at native resolution, so two never cost more than two. */
      composeLayers(ctx, canvas.width, canvas.height, imageEl, neutralLayers)
      const split = Math.round((curtain / 100) * canvas.width)
      ctx.save()
      ctx.beginPath()
      ctx.rect(split, 0, canvas.width - split, canvas.height)
      ctx.clip()
      composeLayers(ctx, canvas.width, canvas.height, imageEl, shownLayers)
      ctx.restore()
    } else {
      composeLayers(ctx, canvas.width, canvas.height, imageEl, shownLayers)
    }

    setHistogram(computeHistogram(ctx, canvas.width, canvas.height))
    // A red tint over whatever the currently-edited mask (blur or AI)
    // currently covers — painted OVER the composited result, on this same
    // canvas, only while actively editing it. Never persisted: the very
    // next redraw (any layers/mode change) recomputes from
    // `composeLayers` fresh.
    if (maskEditTarget && selectedLayer) {
      const mask = (maskEditTarget === 'blur' ? selectedLayer.settings.blurMask : selectedLayer.settings.aiMask) ?? DEFAULT_MASK
      const maskAlpha = renderMaskAlpha(mask, canvas.width, canvas.height)
      if (maskAlpha) {
        const overlay = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const data = overlay.data
        for (let p = 0; p < maskAlpha.length; p++) {
          const a = maskAlpha[p] * 0.5
          if (a <= 0) continue
          const i = p * 4
          data[i] = Math.round(data[i] * (1 - a) + 255 * a)
          data[i + 1] = Math.round(data[i + 1] * (1 - a))
          data[i + 2] = Math.round(data[i + 2] * (1 - a))
        }
        ctx.putImageData(overlay, 0, 0)
      }
    }
    /* Where the canvas actually LANDED inside its scroller, for the curtain
       overlay. Measured HERE rather than in PreviewStage because a child's
       layout effects run before its parent's: measuring down there would
       read the size this effect is about to replace. */
    setGeom((current) =>
      current.left === canvas.offsetLeft && current.top === canvas.offsetTop
      && current.width === canvas.offsetWidth && current.height === canvas.offsetHeight
        ? current
        : { left: canvas.offsetLeft, top: canvas.offsetTop, width: canvas.offsetWidth, height: canvas.offsetHeight },
    )
    // Must run after the canvas has actually been resized above — see
    // useZoomPan.ts's own note on why this isn't an effect inside the hook.
    zoom.applyPendingScrollAdjust()
  }, [imageEl, layers, mode, curtain, previewPreset, maskEditTarget, selectedLayer, selectedLayerId,
      zoom.displayScale, zoom.applyPendingScrollAdjust])

  const toImageSpace = (event: { clientX: number; clientY: number }) => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return null
    return {
      x: Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height)),
    }
  }

  /* Same fix as CurvesEditor.tsx's own drag: the LIVE gesture reads/writes
     a ref, never the React-rendered `selectedLayer` prop — `commit()`
     (via `updateSelectedSettings`) only queues a state update, and a
     `pointermove` listener attached before that update lands would
     otherwise see a stale mask on its very first move. */
  const onMaskDragMove = (event: PointerEvent) => {
    const state = maskDrag.current
    if (!state) return
    const p = toImageSpace(event)
    if (!p) return
    let next: Mask
    if (state.mask.mode === 'pinceau') {
      const strokes = [...state.mask.strokes]
      const last = strokes[strokes.length - 1]
      strokes[strokes.length - 1] = { ...last, points: [...last.points, p] }
      next = { ...state.mask, strokes }
    } else if (state.mask.mode === 'degrade' && state.mask.gradient) {
      next = { ...state.mask, gradient: { ...state.mask.gradient, x2: p.x, y2: p.y } }
    } else if (state.mask.mode === 'radial' && state.mask.radial) {
      next = {
        ...state.mask,
        radial: {
          ...state.mask.radial,
          rx: Math.max(0.01, Math.abs(p.x - state.mask.radial.cx)),
          ry: Math.max(0.01, Math.abs(p.y - state.mask.radial.cy)),
        },
      }
    } else return
    state.mask = next
    updateSelectedSettings({ [state.field]: next })
  }

  const stopMaskDrag = () => {
    document.removeEventListener('pointermove', onMaskDragMove)
    maskDrag.current = null
  }

  const onMaskPointerDown = (event: React.PointerEvent) => {
    if (!maskEditTarget || !selectedLayer) return
    const p = toImageSpace(event)
    if (!p) return
    const field = maskEditTarget === 'blur' ? 'blurMask' : 'aiMask'
    const current = selectedLayer.settings[field] ?? DEFAULT_MASK
    let next: Mask
    if (current.mode === 'pinceau') {
      next = { ...current, strokes: [...current.strokes, { points: [p], radius: current.brushRadius }] }
    } else if (current.mode === 'degrade') {
      next = { ...current, gradient: { x1: p.x, y1: p.y, x2: p.x, y2: p.y } }
    } else if (current.mode === 'radial') {
      next = { ...current, radial: { cx: p.x, cy: p.y, rx: 0.01, ry: 0.01, rotation: 0, feather: 30 } }
    } else {
      return
    }
    maskDrag.current = { field, mask: next }
    updateSelectedSettings({ [field]: next })
    document.addEventListener('pointermove', onMaskDragMove)
    document.addEventListener('pointerup', stopMaskDrag, { once: true })
  }

  /* ON THE DOCUMENT, not on the shell (changed 2026-09-25).

     It used to be an elevated React handler wrapping the top bar and both
     panels, which covered every control — right up to the moment a control
     UNMOUNTS under its own click. « Réinitialiser » disappears the instant
     the section it resets is neutral, and the context menu's « Supprimer »
     disappears with the layer: focus falls back to `<body>`, which is not
     inside the shell, and the very next Ctrl+Z went nowhere. Found by the
     fumigation, not by reading the JSX — the handler looked right.

     Undo is expected to work wherever focus happens to be in an editor, so
     the listener belongs to the document for as long as this screen is
     mounted. `\` keeps its guard: the AI instruction field and the HSL
     number fields must be allowed to contain a backslash. */
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey) {
        const key = event.key.toLowerCase()
        if (key === 'z') {
          event.preventDefault()
          if (event.shiftKey) redo()
          else undo()
        } else if (key === 'y') {
          event.preventDefault()
          redo()
        }
        return
      }
      if (event.key === 'Escape' && maskEditTarget) {
        event.preventDefault()
        setMaskEditTarget(null)
        return
      }
      const target = event.target as HTMLElement | null
      if (event.key === '\\' && !['INPUT', 'TEXTAREA'].includes(target?.tagName ?? '')) {
        event.preventDefault()
        setMode((current) => (current === 'avant' ? 'reglages' : 'avant'))
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [undo, redo, maskEditTarget])

  const exportCanvas = () => {
    if (!imageEl) return null
    const canvas = document.createElement('canvas')
    canvas.width = imageEl.naturalWidth
    canvas.height = imageEl.naturalHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    composeLayers(ctx, canvas.width, canvas.height, imageEl, layers)
    return canvas.toDataURL('image/png').split(',')[1]
  }

  const onSaveCopy = async () => {
    const dataBase64 = exportCanvas()
    if (!dataBase64) return
    const result = await save(dataBase64)
    toast(result.ok ? `copie enregistrée : ${result.name}` : result.erreur)
  }

  const onOverwrite = async () => {
    const ok = await confirm({
      title: 'Écraser la source ?',
      button: 'Écraser la source',
      body: (
        <>
          <p>
            <b>{name}</b> sera remplacée sur le disque par la version composée de tous les calques
            visibles. La version d'origine ne sera plus récupérable.
          </p>
          <p className="tiny">
            Ses mesures de réalisme portaient sur les anciens pixels : elles sont effacées, l'image
            redevient « non mesurée ». Le jugement ◉ / ◌, lui, est conservé.
          </p>
          <p className="tiny">« Enregistrer une copie » garde l'original intact.</p>
        </>
      ),
    })
    if (!ok) return
    const dataBase64 = exportCanvas()
    if (!dataBase64) return
    const result = await save(dataBase64, { remplacer: true })
    toast(result.ok ? `${result.name} remplacée` : result.erreur)
  }

  const backTo = screenForImage(bucket, name)
  const backLabel = bucket === 'OK' ? 'Galerie' : 'Revue'

  if (loading) {
    return (
      <div className={SHELL} id="photoEditorAdvanced">
        <div className="flex h-[48px] shrink-0 items-center gap-[12px] border-b border-line bg-panel px-[14px]">
          <b className="truncate text-[13px]">{name}</b>
          <span className="text-[12px] text-dim">chargement…</span>
        </div>
        <div aria-hidden="true" className="flex min-h-0 flex-1">
          <div className="w-[220px] shrink-0 border-r border-line bg-panel max-[1100px]:hidden" />
          <div className="flex-1 bg-[#0a0a0a]" />
          <div className="w-[360px] shrink-0 border-l border-line bg-panel max-[1100px]:w-[320px]" />
        </div>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className={`${SHELL} items-center justify-center`} id="photoEditorAdvanced">
        <div className="w-[440px] max-w-[92vw] rounded-card border border-danger-line bg-panel p-[20px]">
          <div className="mb-[8px] flex items-baseline gap-[8px]">
            <span aria-hidden="true" style={{ color: 'var(--bad)' }}>
              ◆
            </span>
            <b className="text-[14px]">L’éditeur n’a pas pu ouvrir cette image</b>
          </div>
          <p className="m-0 mb-[16px] text-[13px] text-dim">{loadError}</p>
          <Link className="btn sm" to={backTo}>
            <span aria-hidden="true">‹</span> {backLabel}
          </Link>
        </div>
      </div>
    )
  }

  const leftColumn = (
    <>
      <div className="mb-[10px] flex gap-[14px] border-b border-line" role="tablist">
        {([['presets', 'Préréglages'], ['history', 'Historique']] as const).map(([key, label]) => (
          <button
            aria-selected={tab === key}
            className={`-mb-px cursor-pointer border-0 border-b-2 bg-transparent px-0 pb-[7px] text-[12.5px] ${
              tab === key ? 'border-b-txt font-[600] text-txt' : 'border-b-transparent text-dim'
            }`}
            key={key}
            onClick={() => setTab(key)}
            role="tab"
            type="button"
          >
            {label}
          </button>
        ))}
      </div>
      {tab === 'presets' ? (
        <PresetsPanel
          appliedPresetId={appliedPresetId}
          image={imageEl}
          layers={layers}
          onApply={applyPreset}
          onPreview={setPreviewPreset}
          selectedLayerId={selectedLayerId}
        />
      ) : (
        <HistoryPanel cursor={historyCursor} history={history} onJump={jumpTo} />
      )}
    </>
  )

  return (
    <div className={SHELL} id="photoEditorAdvanced">
      <EditorTopBar
        backLabel={backLabel}
        backTo={backTo}
        canRedo={canRedo}
        canUndo={canUndo}
        dirty={dirty}
        mode={mode}
        name={name}
        onMode={setMode}
        onOverwrite={() => void onOverwrite()}
        onRedo={redo}
        onSaveCopy={() => void onSaveCopy()}
        onTogglePresets={() => setLeftOpen((v) => !v)}
        onUndo={undo}
        presetsOpen={leftOpen}
        saving={saving}
      />

      <div className="relative flex min-h-0 flex-1">
        <aside className={LEFT}>{leftColumn}</aside>

        {/* Under 1100 px the left column becomes a floating panel (§S8) —
            220 px of tiles is what a narrow window can give up without
            touching the image or the panel that edits it. The button that
            opens it lives in the screen bar, not here: a control dropped on
            the stage covers the corner of the very image it previews. */}
        {leftOpen && (
          <div className="absolute left-[10px] top-[10px] z-10 hidden max-h-[80%] w-[240px] overflow-y-auto
                          rounded-card border border-line2 bg-panel p-[12px] shadow-[var(--elev)]
                          max-[1100px]:block">
            {leftColumn}
          </div>
        )}

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <PreviewStage
            canvasRef={canvasRef}
            curtain={mode === 'rideau' ? curtain : null}
            geom={geom}
            imageError={imageError}
            maskMode={selectedLayer
              ? ((maskEditTarget === 'blur' ? selectedLayer.settings.blurMask : selectedLayer.settings.aiMask) ?? DEFAULT_MASK).mode
              : DEFAULT_MASK.mode}
            maskTarget={maskEditTarget}
            naturalHeight={imageEl?.naturalHeight ?? 0}
            naturalWidth={imageEl?.naturalWidth ?? 0}
            onCurtain={setCurtain}
            onMaskDone={() => setMaskEditTarget(null)}
            onPointerDown={onMaskPointerDown}
            stageRef={stageRef}
            zoom={zoom}
          />
        </div>

        <aside
          aria-disabled={imageError || undefined}
          className={`${ASIDE}${imageError ? ' pointer-events-none opacity-50' : ''}`}
        >
          <Histogram bins={histogram} />
          <div className="mt-[12px]">
            <LayerList
              image={imageEl}
              layers={layers}
              onAdd={addLayer}
              onOpacity={setOpacity}
              onRemove={removeLayer}
              onReorder={reorder}
              onSelect={selectLayer}
              onToggleVisible={toggleVisible}
              selectedLayerId={selectedLayerId}
            />
          </div>
          {selectedLayer && (
            <div className="mt-[14px]">
              <LayerSettingsPanel
                layer={selectedLayer}
                onChange={updateSelectedSettings}
                onCommit={commitSelectedSettings}
              />
              <AdvancedColorPanel
                layer={selectedLayer}
                onChange={updateSelectedSettings}
                onCommit={commitSelectedSettings}
              />
              <SharpenBlurPanel
                editingMask={maskEditTarget === 'blur'}
                layer={selectedLayer}
                onChange={updateSelectedSettings}
                onCommit={commitSelectedSettings}
                onToggleMaskEdit={() => setMaskEditTarget((v) => (v === 'blur' ? null : 'blur'))}
              />
              <PerspectivePanel
                layer={selectedLayer}
                onChange={updateSelectedSettings}
                onCommit={commitSelectedSettings}
              />
              <AiRetouchPanel
                editingMask={maskEditTarget === 'ai'}
                layer={selectedLayer}
                onChange={updateSelectedSettings}
                onCommit={commitSelectedSettings}
                onToggleMaskEdit={() => setMaskEditTarget((v) => (v === 'ai' ? null : 'ai'))}
              />
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}
