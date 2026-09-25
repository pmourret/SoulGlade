/* Shared by the modal and the dedicated screen — both sit on the same
   usePoseEditor history, so the buttons themselves carry no logic beyond
   the two callbacks. Ctrl/Cmd+Z and +Shift+Z (or +Y) do the same thing from
   PoseCanvas itself; these exist for discoverability and for reaching undo
   without the canvas holding focus.

   `data-hint-text`, not `title`: the studio's own tooltip (chrome/HintLayer,
   mounted once in Shell.tsx) already shows on hover AND keyboard focus,
   closes on Escape, and wires `aria-describedby` itself — a native `title`
   gets none of that (audit finding, 2026-09-02).

   Icons since design-pass screen-13 §S2, named by their aria-label. */
import { Icon } from '../../chrome/Icon'

const ICON_BUTTON =
  'inline-flex h-[30px] w-[30px] cursor-pointer items-center justify-center rounded-[6px] border border-line2 ' +
  'bg-panel2 text-dim hover:text-txt disabled:cursor-default disabled:opacity-40 disabled:hover:text-dim'

export function UndoRedoButtons({
  canUndo,
  canRedo,
  onUndo,
  onRedo,
}: {
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void
  onRedo: () => void
}) {
  return (
    <div className="flex items-center gap-[4px]">
      <button
        type="button"
        className={ICON_BUTTON}
        aria-label="Annuler"
        data-hint-text="Annuler (Ctrl+Z)"
        disabled={!canUndo}
        onClick={onUndo}
      >
        <Icon name="undo" className="h-[16px] w-[16px]" />
      </button>
      <button
        type="button"
        className={ICON_BUTTON}
        aria-label="Rétablir"
        data-hint-text="Rétablir (Ctrl+Maj+Z)"
        disabled={!canRedo}
        onClick={onRedo}
      >
        <Icon name="redo" className="h-[16px] w-[16px]" />
      </button>
    </div>
  )
}
