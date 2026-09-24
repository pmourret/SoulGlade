/* Presentation only — props + callbacks, all state/gestures live in
   useReferenceOverlay.ts. File-input pattern: a hidden input plus a <label
   styled as a button, which is what makes the label the control and gives
   it its accessible name. PosesView.tsx used to carry the same shape and no
   longer does (design-pass screen-7d: its picker is opened by a real button
   that clicks the input through a ref, because the same button also has to
   carry a disabled state and a tooltip, which a <label> cannot). The two
   are no longer the same pattern — this one is still the right one here. */
export function ReferenceControls({
  referenceUrl,
  opacity,
  onOpacityChange,
  onPickFile,
  onClearReference,
  previewUrl,
  rendering,
  onRefreshPreview,
  onClearPreview,
}: {
  referenceUrl: string | null
  opacity: number
  onOpacityChange: (value: number) => void
  onPickFile: (file: File | null) => void
  onClearReference: () => void
  previewUrl: string | null
  rendering: boolean
  onRefreshPreview: () => void
  onClearPreview: () => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-[8px]">
      <label className="btn sm" htmlFor="poseRefFile">
        {referenceUrl ? 'Changer la photo de référence' : 'Photo de référence…'}
      </label>
      <input
        type="file"
        id="poseRefFile"
        accept="image/png,image/jpeg,image/webp"
        hidden
        onChange={(event) => onPickFile(event.target.files?.[0] ?? null)}
      />
      {referenceUrl && (
        <>
          <label className="tiny" htmlFor="poseRefOpacity">
            Opacité
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
          <button type="button" className="btn sm" aria-label="Retirer la photo de référence" onClick={onClearReference}>
            ×
          </button>
        </>
      )}
      {previewUrl ? (
        <>
          <button type="button" className="btn sm" disabled={rendering} onClick={onRefreshPreview}>
            {rendering ? 'Rendu…' : 'Actualiser le rendu'}
          </button>
          <button type="button" className="btn sm" onClick={onClearPreview}>
            Revenir à l'édition
          </button>
        </>
      ) : (
        <button type="button" className="btn sm" disabled={rendering} onClick={onRefreshPreview}>
          {rendering ? 'Rendu…' : 'Aperçu du rendu final'}
        </button>
      )}
    </div>
  )
}
