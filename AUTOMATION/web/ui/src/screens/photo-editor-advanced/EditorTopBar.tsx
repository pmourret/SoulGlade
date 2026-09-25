/* The screen bar of the advanced editor (design-pass screen-10 §S2): where
   one came from, what is open, what is pending, and the four gestures that
   act on the whole image.

   Presentational only (frontend.md).

   THE PREVIEW SEGMENTED IS NOT ACCENT-FILLED. Its active option is told by
   its ground (`--panel3`), its text and its weight — the same rule
   `screens.css`'s `.seg` block already argues at length: the accent stays
   for the selected layer and the active tool, and a three-way preview
   choice must not be the loudest object on a screen whose subject is the
   photograph.

   « Écraser la source… » is no longer a filled red button either (§S2): it
   is a secondary with `--danger-txt` on its own text. It is the only
   destructive gesture here and it must be findable, not tempting. */
import { Link } from 'react-router-dom'

import { UndoRedoButtons } from '../pose-editor/UndoRedoButtons'

export type PreviewMode = 'reglages' | 'rideau' | 'avant'

const MODES: { key: PreviewMode; label: string }[] = [
  { key: 'reglages', label: 'Réglages' },
  { key: 'rideau', label: 'Rideau' },
  { key: 'avant', label: 'Avant' },
]

export function EditorTopBar({
  backTo, backLabel, name, dirty, canUndo, canRedo, onUndo, onRedo,
  mode, onMode, saving, onSaveCopy, onOverwrite, presetsOpen, onTogglePresets,
}: {
  backTo: string
  backLabel: string
  name: string
  dirty: boolean
  /** Under 1100 px the left column folds into this button (§S8). It lives
      in the bar rather than floating over the stage: a control dropped on
      the image hides the very thing it is there to preview. */
  presetsOpen: boolean
  onTogglePresets: () => void
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void
  onRedo: () => void
  mode: PreviewMode
  onMode: (mode: PreviewMode) => void
  saving: boolean
  onSaveCopy: () => void
  onOverwrite: () => void
}) {
  return (
    <div className="flex h-[48px] shrink-0 items-center gap-[12px] border-b border-line bg-panel px-[14px]">
      <Link className="link shrink-0 text-[13px]" to={backTo}>
        <span aria-hidden="true">‹</span> {backLabel}
      </Link>
      <span aria-hidden="true" className="h-[20px] w-px shrink-0 bg-line" />
      <button
        aria-expanded={presetsOpen}
        className="btn sm hidden shrink-0 max-[1100px]:inline-flex"
        onClick={onTogglePresets}
        type="button"
      >
        Préréglages
      </button>
      <b className="min-w-0 truncate text-[13px] font-[600]" title={name}>
        {name}
      </b>
      {dirty && (
        <span className="flex shrink-0 items-center gap-[5px] text-[12px] text-warn-txt">
          <span aria-hidden="true" style={{ color: 'var(--warn)' }}>
            ●
          </span>
          modifications non enregistrées
        </span>
      )}

      <div className="flex-1" />

      <UndoRedoButtons canRedo={canRedo} canUndo={canUndo} onRedo={onRedo} onUndo={onUndo} />

      <div className="flex shrink-0 items-center gap-[7px]">
        <div aria-label="Mode d’aperçu" className="seg" role="radiogroup">
          {MODES.map((entry) => (
            <button
              aria-checked={mode === entry.key}
              className={mode === entry.key ? 'on' : undefined}
              key={entry.key}
              onClick={() => onMode(entry.key)}
              role="radio"
              type="button"
            >
              {entry.label}
            </button>
          ))}
        </div>
        <span className="text-[11.5px] text-dim2">
          <span className="kbd">\</span>
        </span>
      </div>

      <span aria-hidden="true" className="h-[20px] w-px shrink-0 bg-line" />

      <button
        className="btn primary sm shrink-0"
        disabled={saving}
        onClick={onSaveCopy}
        type="button"
      >
        {saving ? 'Enregistrement…' : 'Enregistrer une copie'}
      </button>
      <button
        className="btn sm shrink-0 border-line2! text-danger-txt"
        disabled={saving}
        onClick={onOverwrite}
        type="button"
      >
        Écraser la source…
      </button>
    </div>
  )
}
