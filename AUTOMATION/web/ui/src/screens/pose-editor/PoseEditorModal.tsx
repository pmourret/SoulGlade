/* Same editor as PoseEditorScreen, in a Dialog — opened from the scene
   composer's Pose tab for a quick in-context tweak, no navigation away from
   the scene being edited. Sized as the same near-fullscreen work surface as
   PhotoEditor: `dialog{max-width:...}` in chrome.css is a plain element
   selector, so a `className` that sets `width` without ALSO overriding
   `max-width` gets clamped to chrome.css's own 560px default.

   Restyled by design-pass screen-13 §S7: a 48 px head (title, pose name, a
   way to the full screen, close), the body canvas alone, a 52 px foot. The
   modal still does NOT offer pinning — the full screen does.

   KNOWN ROUGH EDGE: overwriting a pose IN PLACE changes its PNG's bytes
   under the same file name, and `/img/pose` carries no cache-busting token
   (unlike `/img`'s own `v`). A thumbnail already painted elsewhere on the
   page (the composer's own pose grid, `PosesView`) may keep showing the
   pre-edit render until the page reloads or that `<img>` remounts. Not fixed
   here: no caller needs it yet — revisit if it turns out to matter. */
import { useLocation, useNavigate } from 'react-router-dom'

import { PATHS } from '../../app/routes'
import { useConfirm } from '../../chrome/ConfirmContext'
import { Dialog } from '../../chrome/Dialog'
import { useToast } from '../../chrome/ToastContext'
import type { NewPoseIntent } from './NewPoseModal'
import { handlePoseKeyDown, PoseCanvas } from './PoseCanvas'
import { UndoRedoButtons } from './UndoRedoButtons'
import { usePoseEditor, type PoseEditorSource } from './usePoseEditor'
import { useSelection } from './useSelection'

export function PoseEditorModal({
  source,
  onClose,
  onSaved,
}: {
  source: PoseEditorSource
  onClose: () => void
  /** Called with the name actually written — same as `source`'s name on a
      plain overwrite, a fresh one otherwise. */
  onSaved: (name: string) => void
}) {
  const {
    pose, name, loading, loadError, saving, dirty, update, save, undo, redo, canUndo, canRedo,
  } = usePoseEditor(source)
  const { selected, onSelect, onToggleSelect, onSelectMany } = useSelection()
  const toast = useToast()
  const confirm = useConfirm()
  const navigate = useNavigate()
  const location = useLocation()

  /** Saves, hands the name to the caller; null when the save failed (the
      toast has said why). */
  const saveNow = async (): Promise<string | null> => {
    const result = await save()
    if (!result.ok) {
      toast(result.erreur)
      return null
    }
    onSaved(result.name)
    return result.name
  }

  /* The full screen edits the same file. Unsaved work is asked about first:
     save it and go, go without it, or stay. A template not yet saved as a pose
     reopens there from the same template, as the « Nouvelle pose » modal does. */
  const openFullScreen = async () => {
    let target = name
    if (dirty) {
      const answer = await confirm({
        title: "Ouvrir l'écran complet ?",
        button: 'Enregistrer et ouvrir',
        alt: 'Ouvrir sans enregistrer',
        body: <p>Cette pose a des modifications non enregistrées. L'écran complet repart du fichier enregistré.</p>,
      })
      if (answer === false) return
      if (answer === true) {
        target = await saveNow()
        if (!target) return
      }
    }
    if (target) {
      navigate({ pathname: `${PATHS.poseEditor}/${target}`, search: location.search })
    } else if (source.kind === 'preset') {
      const intent: NewPoseIntent = { presetName: source.nom, label: source.initialLabel ?? '', createTemplate: false }
      navigate({ pathname: PATHS.poseEditor, search: location.search }, { state: intent })
    }
  }

  return (
    <Dialog
      id="poseEditorModal"
      open
      onDismiss={onClose}
      initialFocus="#poseModalClose"
      className="h-[min(880px,92vh)] max-h-[92vh] w-[min(1320px,95vw)] max-w-[95vw]"
      cardClassName="flex h-full! w-full! flex-col overflow-hidden p-0!"
      // Elevated Undo/Redo/nudge listener (design-pass screen-6, §A2) — same
      // reasoning as PoseEditorScreen.tsx's own container. No `pinned` here:
      // the modal never offers pinning.
      onKeyDown={(event) => pose && handlePoseKeyDown(event, { pose, selected, onChange: update, onUndo: undo, onRedo: redo })}
    >
      <div className="flex h-[48px] flex-none items-center gap-[12px] border-b border-line px-[16px]">
        <h3 className="m-0! text-[15px]! font-[650]">Éditeur de pose</h3>
        {pose && <span className="min-w-0 truncate text-[13px] text-dim2">{pose.label || name || ''}</span>}
        <div className="flex-1" />
        <button type="button" className="btn sm" disabled={!pose} onClick={() => void openFullScreen()}>
          Ouvrir l'écran complet
        </button>
        <button
          id="poseModalClose"
          type="button"
          className="inline-flex h-[30px] w-[30px] cursor-pointer items-center justify-center rounded-[6px]
                     border-0 bg-transparent text-[18px] text-dim hover:bg-panel2 hover:text-txt"
          aria-label="Fermer"
          onClick={onClose}
        >
          ×
        </button>
      </div>

      <div className="relative min-h-0 flex-1 bg-[var(--pose-stage)] px-[16px] pt-[16px] pb-[64px]">
        {loading && <p className="m-0 text-[13px] text-dim2">chargement…</p>}
        {loadError && (
          <div className="empty mx-auto mt-[40px] max-w-[440px] rounded-card border border-danger-line bg-panel px-[16px] py-[20px] text-[13px]">
            {loadError}
          </div>
        )}
        {pose && (
          <div className="flex h-full items-center justify-center">
            <div className="relative h-full max-w-full" style={{ aspectRatio: `${pose.canvasWidth} / ${pose.canvasHeight}` }}>
              <PoseCanvas
                pose={pose}
                onChange={update}
                selected={selected}
                onSelect={onSelect}
                onToggleSelect={onToggleSelect}
                onSelectMany={onSelectMany}
              />
            </div>
          </div>
        )}
      </div>

      {pose && (
        <div className="flex h-[52px] flex-none items-center gap-[12px] border-t border-line px-[16px]">
          <UndoRedoButtons canUndo={canUndo} canRedo={canRedo} onUndo={undo} onRedo={redo} />
          {dirty && (
            <span className="flex items-center gap-[6px] text-[12px] text-warn-txt" role="status">
              <i aria-hidden="true" className="h-[7px] w-[7px] rounded-full bg-warn" />
              modifications non enregistrées
            </span>
          )}
          <div className="flex-1" />
          <button type="button" className="link" onClick={onClose}>
            Annuler
          </button>
          <button className="btn primary" disabled={saving} onClick={() => void saveNow()}>
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      )}
    </Dialog>
  )
}
