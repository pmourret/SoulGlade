/* The dedicated pose editor — `${PATHS.poseEditor}/:name?` for an existing
   pose, or `${PATHS.poseEditor}` with router `state` for a from-scratch one.
   That state (`NewPoseIntent`) is handed off by `NewPoseModal.tsx` — chosen
   template, name, "create a template too" — the modal is the only way in
   for a new pose now (2026-09-02): a bare visit to this route with neither
   a name nor that state has nothing to edit, so it bounces to the bank
   rather than resurrect the old full-screen template picker.

   A WORKSTATION since design-pass screen-13: a bar, then three zones edge to
   edge — the joint tree, the body view with its floating bar, and a panel
   holding both hand close-ups, the selection and the tools. Every canvas
   shares the SAME pose and selection: dragging a fingertip in a close-up and
   watching it move on the body is one edit, not a sync between two. */
import { useState, type ReactNode } from 'react'
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom'

import { PATHS } from '../../app/routes'
import { useApi } from '../../api/useApi'
import { useToast } from '../../chrome/ToastContext'
import { CanvasToolbarExtra } from './CanvasToolbarExtra'
import { JointOutline } from './JointOutline'
import { handlePoseKeyDown, isTextEntry, PoseCanvas } from './PoseCanvas'
import { alignSelection, mirrorBody, mirrorHand, withPointsMoved, type Point } from './poseFrame'
import { PoseToolsPanel } from './PoseToolsPanel'
import { PoseTopBar } from './PoseTopBar'
import { SelectionPanel } from './SelectionPanel'
import { usePoseEditor, type PoseEditorSource } from './usePoseEditor'
import { useReferenceOverlay } from './useReferenceOverlay'
import { useSelection } from './useSelection'
import type { NewPoseIntent } from './NewPoseModal'

export function PoseEditorScreen() {
  const { name } = useParams<{ name?: string }>()
  const location = useLocation()
  const intent = (location.state as NewPoseIntent | null) ?? null

  if (!name && !intent) {
    return <Navigate to={PATHS.bankPoses} replace />
  }
  const source: PoseEditorSource = name
    ? { kind: 'pose', name }
    : { kind: 'preset', nom: intent!.presetName, initialLabel: intent!.label }
  return <PoseEditorInner source={source} createTemplateIntent={!name && (intent?.createTemplate ?? false)} />
}

/* The three zones' widths, shared by the loading skeleton and the editor. */
const GRID =
  'grid min-h-0 flex-1 grid-cols-[240px_minmax(0,1fr)_360px] max-[1099px]:grid-cols-[minmax(0,1fr)_360px]'

function PoseEditorInner({
  source, createTemplateIntent = false,
}: {
  source: PoseEditorSource
  createTemplateIntent?: boolean
}) {
  const {
    pose, name, loading, loadError, saving, dirty, update, applyAction, save, saveAsPreset,
    undo, redo, canUndo, canRedo,
  } = usePoseEditor(source)
  const [createTemplate, setCreateTemplate] = useState(createTemplateIntent)
  const { selected, onSelect, onToggleSelect, onSelectMany, clearSelection } = useSelection()
  const [recenterTrigger, setRecenterTrigger] = useState(0)
  const [pinned, setPinned] = useState<ReadonlySet<string>>(new Set())
  const [helpOpen, setHelpOpen] = useState(false)
  const [pointsOpen, setPointsOpen] = useState(false)
  const navigate = useNavigate()
  const toast = useToast()
  const api = useApi()
  const reference = useReferenceOverlay(pose, api)
  const referenceImage = reference.referenceUrl
    ? { url: reference.referenceUrl, opacity: reference.opacity }
    : null

  const setPinnedMany = (keys: string[], value: boolean) => {
    setPinned((prev) => {
      const next = new Set(prev)
      for (const key of keys) {
        if (value) next.add(key)
        else next.delete(key)
      }
      return next
    })
  }

  const onSave = async () => {
    const wasNew = !name
    const result = await save()
    if (!result.ok) {
      toast(result.erreur)
      return
    }
    let message = `squelette enregistré : ${result.name}`
    // "Créer aussi un gabarit" only ever fires on the pose's OWN first save
    // — a template is a one-time snapshot of a shape, not something a later
    // re-save should keep re-creating.
    if (wasNew && createTemplate && pose) {
      const presetResult = await saveAsPreset(pose.label || result.name)
      message = presetResult.ok
        ? `squelette et gabarit enregistrés : ${result.name} / ${presetResult.name}`
        : `squelette enregistré, mais le gabarit a échoué : ${presetResult.erreur}`
      setCreateTemplate(false)
    }
    toast(message)
    if (wasNew) navigate(`${PATHS.poseEditor}/${result.name}`, { replace: true })
  }

  const onSaveAsNew = async () => {
    const result = await save({ asNew: true })
    if (!result.ok) {
      toast(result.erreur)
      return
    }
    toast(`nouvelle pose enregistrée : ${result.name}`)
    navigate(`${PATHS.poseEditor}/${result.name}`)
  }

  const title = pose?.label || name || (source.kind === 'preset' ? source.initialLabel : '') || 'Nouvelle pose'

  if (loading) {
    return (
      <div className="screen flex h-full flex-col" id="poseEditor" aria-busy="true">
        <PlainBar title={title} />
        <div className={GRID}>
          <div className="border-r border-line bg-panel p-[14px] max-[1099px]:hidden">
            {Array.from({ length: 12 }, (_, i) => (
              <i key={i} className="mb-[10px] block h-[10px] rounded-[3px] bg-panel2 motion-safe:animate-pulse" />
            ))}
          </div>
          <div className="bg-[var(--pose-stage)]" />
          <div className="border-l border-line bg-panel p-[14px]">
            <i className="block aspect-[2/1] rounded-[4px] bg-panel2 motion-safe:animate-pulse" />
          </div>
        </div>
      </div>
    )
  }
  if (loadError || !pose) {
    return (
      <div className="screen flex h-full flex-col" id="poseEditor">
        <PlainBar title={title} />
        <div className="flex flex-1 items-start justify-center bg-[var(--pose-stage)] px-[16px] pt-[80px]">
          <div className="w-[440px] max-w-full rounded-card border border-danger-line bg-panel p-[20px]" role="alert">
            <div className="empty flex items-start gap-[10px] p-0 text-left text-[13px] text-txt">
              <i aria-hidden="true" className="mt-[5px] h-[8px] w-[8px] flex-none rotate-45 bg-bad" />
              <span>{loadError || 'squelette introuvable'}</span>
            </div>
            <Link className="btn sm mt-[16px]" to={PATHS.bankPoses}>
              Retour aux Poses
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const onMirrorBody = (direction: 'rightToLeft' | 'leftToRight') => applyAction(mirrorBody(pose, direction))
  const onMirrorHand = (from: 'handLeft' | 'handRight') => applyAction(mirrorHand(pose, from))
  const onAlign = (axis: 'x' | 'y') => applyAction(alignSelection(pose, selected, axis))
  const onOffset = (origins: ReadonlyMap<string, Point>, dx: number, dy: number) =>
    applyAction(withPointsMoved(pose, origins, dx, dy))
  const recenter = () => setRecenterTrigger((t) => t + 1)

  const canvasProps = {
    pose, onChange: update, selected, onSelect, onToggleSelect, onSelectMany, referenceImage, pinned,
  }
  const outline = (
    <JointOutline pose={pose} selected={selected} onSelect={onSelect} onToggleSelect={onToggleSelect} pinned={pinned} />
  )

  return (
    <div
      className="screen flex h-full flex-col"
      id="poseEditor"
      /* Elevated Undo/Redo/nudge listener (design-pass screen-6, §A2): this
         container wraps every canvas AND the panels, so a keydown bubbles
         here wherever focus is. The text-entry guard lives inside
         `handlePoseKeyDown` itself; F and ? (screen-13 §S4, §S6) use the same
         guard before it. */
      onKeyDown={(event) => {
        const plain = !event.ctrlKey && !event.metaKey && !event.altKey && !isTextEntry(event.target)
        if (plain && (event.key === 'f' || event.key === 'F') && selected.size > 0) {
          event.preventDefault()
          recenter()
          return
        }
        if (plain && event.key === '?') {
          event.preventDefault()
          setHelpOpen((open) => !open)
          return
        }
        handlePoseKeyDown(event, { pose, selected, pinned, onChange: update, onUndo: undo, onRedo: redo })
      }}
    >
      <PoseTopBar
        title={title}
        fileName={name}
        dirty={dirty}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={undo}
        onRedo={redo}
        rendering={reference.rendering}
        previewing={Boolean(reference.previewUrl)}
        onEdit={reference.clearPreview}
        onRender={() => void reference.refreshPreview()}
        helpOpen={helpOpen}
        onToggleHelp={() => setHelpOpen((open) => !open)}
        saving={saving}
        onSave={() => void onSave()}
        onSaveAsNew={name ? () => void onSaveAsNew() : undefined}
        pointsToggle={
          <div className="relative min-[1100px]:hidden">
            <button
              type="button"
              className="btn sm"
              aria-expanded={pointsOpen}
              onClick={() => setPointsOpen((open) => !open)}
            >
              Points
            </button>
            {pointsOpen && (
              <div className="absolute left-0 top-[calc(100%+6px)] z-[30] flex max-h-[70vh] w-[260px] flex-col
                              rounded-card border border-line2 bg-panel shadow-elev">
                {outline}
              </div>
            )}
          </div>
        }
      />

      <div className={GRID}>
        <aside className="flex min-h-0 flex-col border-r border-line bg-panel max-[1099px]:hidden" aria-label="Liste des points">
          {outline}
        </aside>

        {/* The body view: the canvas keeps the pose's own proportions, centred
            on a darker stage; its floating bar sits under it. */}
        <div className="relative flex min-h-0 min-w-0 items-center justify-center bg-[var(--pose-stage)] px-[24px] pt-[24px] pb-[72px]">
          <span className="absolute left-[12px] top-[10px] z-[1] rounded-[4px] bg-scrim px-[8px] py-[3px] text-[12px] text-dim">
            Corps complet
          </span>
          <div
            className="relative h-full max-w-full"
            style={{ aspectRatio: `${pose.canvasWidth} / ${pose.canvasHeight}` }}
          >
            <PoseCanvas
              {...canvasProps}
              recenterTrigger={recenterTrigger}
              renderPreviewUrl={reference.previewUrl}
              toolbarExtra={
                <CanvasToolbarExtra
                  canRecenter={selected.size > 0}
                  onRecenter={recenter}
                  referenceUrl={reference.referenceUrl}
                  opacity={reference.opacity}
                  onOpacityChange={reference.setOpacity}
                  onPickFile={reference.setReferenceFile}
                  onClearReference={reference.clearReference}
                />
              }
            />
          </div>
        </div>

        <aside className="min-h-0 overflow-y-auto border-l border-line bg-panel" aria-label="Mains, sélection et outils">
          <div className="grid grid-cols-2 gap-[12px] p-[14px] max-[1099px]:grid-cols-1">
            <HandView label="Main gauche" copyLabel="Copier la droite" onCopy={() => onMirrorHand('handRight')}>
              <PoseCanvas {...canvasProps} focus="handLeft" />
            </HandView>
            <HandView label="Main droite" copyLabel="Copier la gauche" onCopy={() => onMirrorHand('handLeft')}>
              <PoseCanvas {...canvasProps} focus="handRight" />
            </HandView>
          </div>
          <SelectionPanel
            pose={pose}
            selected={selected}
            onChange={update}
            pinned={pinned}
            onSetPinned={setPinnedMany}
            onOffset={onOffset}
            onRecenter={recenter}
            onClearSelection={clearSelection}
          />
          <PoseToolsPanel selectionSize={selected.size} onMirrorBody={onMirrorBody} onAlign={onAlign} />
        </aside>
      </div>
    </div>
  )
}

/* The bar of the loading and error states: where one is, and the way back. */
function PlainBar({ title }: { title: string }) {
  return (
    <div className="flex h-[48px] flex-none items-center gap-[12px] border-b border-line bg-panel px-[14px]">
      <Link className="btn sm" to={PATHS.bankPoses} id="posesBack">
        Poses
      </Link>
      <span className="truncate text-[14px] font-semibold text-txt" id="poseTitle">{title}</span>
    </div>
  )
}

function HandView({
  label, copyLabel, onCopy, children,
}: {
  label: string
  copyLabel: string
  /** `mirrorHand`: copy the OTHER hand's shape onto this one. */
  onCopy: () => void
  children: ReactNode
}) {
  return (
    <div className="min-w-0">
      <div className="mb-[6px] flex flex-wrap items-baseline justify-between gap-x-[8px]">
        <span className="whitespace-nowrap text-[12px] font-semibold text-txt">{label}</span>
        <button type="button" className="link whitespace-nowrap text-[12px]" onClick={onCopy}>
          {copyLabel}
        </button>
      </div>
      {/* Its zoom bar hangs under the square: room is kept for it. */}
      <div className="mb-[40px] aspect-square">{children}</div>
    </div>
  )
}
