/* The screen's half of the floating bar under the body view (design-pass
   screen-13 §S4): recentre on the selection, and the reference photo. Drawn
   INSIDE PoseCanvas's own bar (its `toolbarExtra`), after the zoom.

   The reference zone keeps ONE width whether a photo is loaded or not: the
   bar is centred, so a zone that grew on picking a photo would slide the zoom
   and Recentrer out from under the pointer.

   File input: a hidden input plus a <label> styled as a button — the label is
   the control and carries its accessible name (same pattern as before). */
const TOOL =
  'inline-flex h-[28px] cursor-pointer items-center gap-[6px] rounded-[5px] border-0 bg-transparent px-[8px] ' +
  'text-[12.5px] text-dim hover:bg-panel2 hover:text-txt disabled:cursor-default disabled:opacity-40'

export function CanvasToolbarExtra({
  canRecenter,
  onRecenter,
  referenceUrl,
  opacity,
  onOpacityChange,
  onPickFile,
  onClearReference,
}: {
  canRecenter: boolean
  onRecenter: () => void
  referenceUrl: string | null
  opacity: number
  onOpacityChange: (value: number) => void
  onPickFile: (file: File | null) => void
  onClearReference: () => void
}) {
  return (
    <>
      <span aria-hidden="true" className="mx-[2px] h-[16px] w-px bg-line2" />
      <button
        type="button"
        className={TOOL}
        disabled={!canRecenter}
        data-hint-text={canRecenter ? 'Recentrer sur la sélection (F)' : 'Sélectionne un point pour recentrer'}
        onClick={onRecenter}
      >
        Recentrer
        <kbd className="rounded-[3px] border border-line2 px-[4px] text-[10.5px] text-dim2">F</kbd>
      </button>
      <span aria-hidden="true" className="mx-[2px] h-[16px] w-px bg-line2" />
      <div className="flex w-[316px] items-center gap-[6px]">
        <input
          type="file"
          id="poseRefFile"
          accept="image/png,image/jpeg,image/webp"
          hidden
          onChange={(event) => onPickFile(event.target.files?.[0] ?? null)}
        />
        {referenceUrl ? (
          <>
            <label className="text-[12px] text-dim" htmlFor="poseRefOpacity">
              Référence
            </label>
            <input
              id="poseRefOpacity"
              type="range"
              className="w-[90px]"
              min={0}
              max={1}
              step={0.05}
              value={opacity}
              onChange={(event) => onOpacityChange(Number(event.target.value))}
            />
            <span className="w-[34px] text-right text-[12px] text-dim tabular-nums">{Math.round(opacity * 100)} %</span>
            <label className={TOOL} htmlFor="poseRefFile">
              Changer…
            </label>
            <button
              type="button"
              className={`${TOOL} px-[6px]`}
              aria-label="Retirer la photo de référence"
              onClick={onClearReference}
            >
              ×
            </button>
          </>
        ) : (
          <label className={TOOL} htmlFor="poseRefFile">
            Photo de référence…
          </label>
        )}
      </div>
    </>
  )
}
