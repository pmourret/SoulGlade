/* The pose editor's own bar (design-pass screen-13 §S2): back to Poses, what
   is being edited, its unsaved state, then the tools of the whole pose —
   undo, the Édition · Rendu switch, the shortcuts, and the split Save.
   Presentation only: every gesture is a callback. */
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

import { PATHS } from '../../app/routes'
import { Icon } from '../../chrome/Icon'
import { ShortcutsHelp } from './ShortcutsHelp'
import { UndoRedoButtons } from './UndoRedoButtons'

const RULE = <span aria-hidden="true" className="h-[22px] w-px flex-none bg-line2" />

export function PoseTopBar({
  title,
  fileName,
  dirty,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  rendering,
  previewing,
  onEdit,
  onRender,
  helpOpen,
  onToggleHelp,
  saving,
  onSave,
  onSaveAsNew,
  pointsToggle,
}: {
  title: string
  /** The file on disk, null for a pose never saved. */
  fileName: string | null
  dirty: boolean
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void
  onRedo: () => void
  rendering: boolean
  /** True while the render preview replaces the editable skeleton. */
  previewing: boolean
  onEdit: () => void
  onRender: () => void
  helpOpen: boolean
  onToggleHelp: () => void
  saving: boolean
  onSave: () => void
  /** Absent for a pose that has no name yet: there is nothing to branch from. */
  onSaveAsNew?: () => void
  /** The « Points » button of a narrow window (§S9), rendered by the screen. */
  pointsToggle?: React.ReactNode
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!menuOpen) return
    const close = (event: Event) => {
      if (event instanceof KeyboardEvent && event.key !== 'Escape') return
      if (event instanceof PointerEvent && menuRef.current?.contains(event.target as Node)) return
      setMenuOpen(false)
    }
    document.addEventListener('pointerdown', close)
    document.addEventListener('keydown', close)
    return () => {
      document.removeEventListener('pointerdown', close)
      document.removeEventListener('keydown', close)
    }
  }, [menuOpen])

  const mode = previewing ? 'render' : 'edit'
  const segment = (value: 'edit' | 'render', label: string) => (
    <button
      type="button"
      aria-pressed={mode === value}
      disabled={rendering}
      className={`h-[28px] cursor-pointer border-0 px-[12px] text-[12.5px] disabled:cursor-default ${
        mode === value ? 'bg-panel3 font-semibold text-txt' : 'bg-transparent text-dim hover:text-txt'
      }`}
      onClick={value === 'edit' ? onEdit : onRender}
    >
      {value === 'render' && rendering ? 'Rendu…' : label}
    </button>
  )

  return (
    <div className="flex h-[48px] flex-none items-center gap-[12px] border-b border-line bg-panel px-[14px]">
      <Link className="btn sm inline-flex items-center gap-[4px]" to={PATHS.bankPoses} id="posesBack">
        <Icon name="chevron" className="h-[14px] w-[14px]" />
        Poses
      </Link>
      {RULE}
      {pointsToggle}
      <div className="flex min-w-0 items-baseline gap-[10px]">
        <span className="truncate text-[14px] font-semibold text-txt" id="poseTitle">{title}</span>
        {fileName && <code className="truncate font-code text-[11.5px] text-dim2">{fileName}</code>}
      </div>
      {dirty && (
        <span className="flex flex-none items-center gap-[6px] text-[12px] text-warn-txt" role="status">
          <i aria-hidden="true" className="h-[7px] w-[7px] rounded-full bg-warn" />
          modifications non enregistrées
        </span>
      )}
      <div className="flex-1" />

      <UndoRedoButtons canUndo={canUndo} canRedo={canRedo} onUndo={onUndo} onRedo={onRedo} />

      <div className="flex items-center gap-[6px]">
        <div
          className="inline-flex overflow-hidden rounded-[6px] border border-line2"
          role="group"
          aria-label="Mode de la vue"
        >
          {segment('edit', 'Édition')}
          {segment('render', 'Rendu')}
        </div>
        {previewing && (
          <button type="button" className="btn sm" disabled={rendering} onClick={onRender}>
            Actualiser
          </button>
        )}
      </div>

      <div className="relative">
        <button
          type="button"
          id="btnPoseHelp"
          className="inline-flex h-[30px] w-[30px] cursor-pointer items-center justify-center rounded-[6px]
                     border border-line2 bg-panel2 text-dim hover:text-txt aria-expanded:text-txt"
          aria-label="Raccourcis"
          aria-expanded={helpOpen}
          onClick={onToggleHelp}
        >
          <Icon name="help" className="h-[16px] w-[16px]" />
        </button>
        {helpOpen && <ShortcutsHelp onClose={onToggleHelp} />}
      </div>

      {RULE}

      <div className="relative inline-flex" ref={menuRef}>
        <button
          type="button"
          id="btnPoseSave"
          className="btn primary rounded-r-none"
          disabled={saving}
          onClick={onSave}
        >
          {saving ? 'Enregistrement…' : 'Enregistrer'}
        </button>
        <button
          type="button"
          className="btn primary rounded-l-none border-l border-l-line2 px-[8px]"
          aria-label="Autres façons d'enregistrer"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          disabled={saving}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <Icon name="chevron" className="h-[14px] w-[14px] -rotate-90" />
        </button>
        {menuOpen && (
          <div
            role="menu"
            className="absolute right-0 top-[calc(100%+6px)] z-[30] w-[260px] rounded-[8px] border border-line2
                       bg-panel p-[4px] shadow-elev"
          >
            {onSaveAsNew ? (
              <button
                type="button"
                role="menuitem"
                className="block w-full cursor-pointer rounded-[5px] border-0 bg-transparent px-[10px] py-[8px]
                           text-left text-[13px] text-txt hover:bg-panel2"
                onClick={() => {
                  setMenuOpen(false)
                  onSaveAsNew()
                }}
              >
                Enregistrer sous une nouvelle pose
              </button>
            ) : (
              <p className="m-0 px-[10px] py-[8px] text-[12.5px] text-dim2">
                Enregistre d'abord la pose : une copie part d'une pose qui a un nom.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
