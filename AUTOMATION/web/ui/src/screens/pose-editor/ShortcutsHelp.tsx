/* The keyboard and mouse gestures of the pose editor, in one place
   (design-pass screen-13 §S6). It replaces the two InfoHints that carried
   them on the pose name and on the multi-selection; the wording is theirs,
   one gesture per line, plus F.

   A popover anchored under the « ? » button: role=dialog, closed by Escape,
   by the button again, or by a click outside. */
import { useEffect, useRef } from 'react'

const SHORTCUTS: [string, string][] = [
  ['Glisser un point', 'le déplace ; le choisir dans la liste fonctionne aussi'],
  ['Flèches', 'ajustent au pixel près (Maj = pas de 10)'],
  ['Maj + glisser un point', 'tourne un membre en préservant sa longueur d\'os'],
  ['Ctrl/Cmd + clic', 'ajoute un point à la sélection'],
  ['Maj + glisser le fond', 'sélectionne un rectangle'],
  ['Glisser un point du groupe', 'déplace tout le groupe, forme relative conservée'],
  ['Ctrl + Z', 'annule'],
  ['Ctrl + Maj + Z', 'rétablit'],
  ['F', 'recentre sur la sélection'],
  ['?', 'ouvre cette aide'],
]

export function ShortcutsHelp({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    ref.current?.focus()
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onClose()
      }
    }
    const onDown = (event: PointerEvent) => {
      const target = event.target as Node
      if (ref.current?.contains(target)) return
      if ((target as HTMLElement).closest?.('#btnPoseHelp')) return
      onClose()
    }
    document.addEventListener('keydown', onKey, true)
    document.addEventListener('pointerdown', onDown)
    return () => {
      document.removeEventListener('keydown', onKey, true)
      document.removeEventListener('pointerdown', onDown)
    }
  }, [onClose])

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label="Raccourcis de l'éditeur de pose"
      id="poseShortcuts"
      tabIndex={-1}
      className="absolute right-0 top-[calc(100%+6px)] z-[30] w-[320px] rounded-[8px] border border-line2
                 bg-panel p-[14px] shadow-elev outline-none"
    >
      <h2 className="m-0 mb-[10px] text-[13px] font-semibold text-txt">Raccourcis</h2>
      <dl className="m-0 grid grid-cols-[124px_1fr] gap-x-[12px] gap-y-[7px] text-[12.5px]">
        {SHORTCUTS.map(([key, effect]) => (
          <div key={key} className="contents">
            <dt className="font-semibold text-txt">{key}</dt>
            <dd className="m-0 text-dim">{effect}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
