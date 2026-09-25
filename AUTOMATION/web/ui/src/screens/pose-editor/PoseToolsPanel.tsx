/* « Outils » — gestures that act on the pose as a whole or on a selection of
   several joints (design-pass screen-13 §S5.3). Alignment stays VISIBLE when
   it cannot run, with the reason written: a tool that appears only once two
   points are selected is a tool nobody finds. */
import { useId } from 'react'

export function PoseToolsPanel({
  selectionSize,
  onMirrorBody,
  onAlign,
}: {
  selectionSize: number
  onMirrorBody: (direction: 'rightToLeft' | 'leftToRight') => void
  onAlign: (axis: 'x' | 'y') => void
}) {
  const reasonId = useId()
  const canAlign = selectionSize >= 2
  return (
    <section className="border-t border-line px-[16px] py-[14px]" aria-labelledby="poseToolsTitle">
      <h2 className="lab m-0 mb-[12px]" id="poseToolsTitle">
        Outils
      </h2>
      <div className="mb-[6px] text-[12px] text-dim">Symétrie corps</div>
      <div className="flex gap-[8px]">
        <button type="button" className="btn sm flex-1" onClick={() => onMirrorBody('rightToLeft')}>
          Droite → gauche
        </button>
        <button type="button" className="btn sm flex-1" onClick={() => onMirrorBody('leftToRight')}>
          Gauche → droite
        </button>
      </div>
      <div className="mt-[14px] mb-[6px] text-[12px] text-dim">Alignement</div>
      <div className="flex gap-[8px]">
        {(['x', 'y'] as const).map((axis) => (
          <button
            key={axis}
            type="button"
            className="btn sm flex-1"
            disabled={!canAlign}
            aria-describedby={canAlign ? undefined : reasonId}
            onClick={() => onAlign(axis)}
          >
            Aligner {axis.toUpperCase()}
          </button>
        ))}
      </div>
      {!canAlign && (
        <p className="mt-[6px] mb-0 text-[12px] text-dim2" id={reasonId}>
          L'alignement demande au moins deux points sélectionnés.
        </p>
      )}
    </section>
  )
}
