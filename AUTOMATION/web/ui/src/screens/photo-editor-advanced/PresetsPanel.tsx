/* "Préréglages" tab — design-pass screen-10 §S3: a 2-column grid of 4:5
   tiles, each RENDERED with its preset applied to the selected layer, so
   the choice is made on the image rather than on a word. Hovering (or
   focusing) one shows it in the central preview WITHOUT applying it; the
   click applies it, in one history step.

   Presentational only (frontend.md): `onApply` and `onPreview` are the two
   callbacks, the grouped write lives in usePhotoEditorAdvanced.ts.

   The tiles are recomputed when the SELECTED LAYER changes, not on every
   slider tick (§ Dépendances) — `layers` is therefore read through a ref:
   a preset tile is a preview of a preset, not a mirror of the last drag,
   and redrawing five of them per pointer move would spend the measured
   0,80 ms sixty times a second for nothing. */
import { useMemo, useRef } from 'react'

import { PRESETS, type Layer } from './photoEditorLayersPixels'
import { thumbDataUrl } from './thumbnails'

const TILE_W = 96
const TILE_H = 120

export function PresetsPanel({
  image, layers, selectedLayerId, appliedPresetId, onApply, onPreview,
}: {
  image: HTMLImageElement | null
  layers: readonly Layer[]
  selectedLayerId: string
  /** The preset the current history entry applied, or null. Derived, so it
      follows undo and redo on its own. */
  appliedPresetId: string | null
  onApply: (presetId: string) => void
  onPreview: (presetId: string | null) => void
}) {
  const layersRef = useRef(layers)
  layersRef.current = layers

  const tiles = useMemo(() => {
    if (!image) return {} as Record<string, string>
    const out: Record<string, string> = {}
    for (const preset of PRESETS) {
      const stack = layersRef.current.map((l) =>
        l.id === selectedLayerId ? { ...l, settings: { ...l.settings, ...preset.settings } } : l,
      )
      out[preset.id] = thumbDataUrl(image, stack, TILE_W, TILE_H)
    }
    return out
    // `layers` on purpose absent — see this file's own header note.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [image, selectedLayerId])

  return (
    <div className="grid grid-cols-2 gap-[8px]" data-presets>
      {PRESETS.map((preset) => {
        const applied = preset.id === appliedPresetId
        return (
          <button
            className="cursor-pointer rounded-[6px] border-0 bg-transparent p-0 text-left"
            key={preset.id}
            onBlur={() => onPreview(null)}
            onClick={() => onApply(preset.id)}
            onFocus={() => onPreview(preset.id)}
            onMouseEnter={() => onPreview(preset.id)}
            onMouseLeave={() => onPreview(null)}
            type="button"
          >
            <span
              className="block w-full overflow-hidden rounded-[4px] bg-panel2"
              style={{
                aspectRatio: `${TILE_W} / ${TILE_H}`,
                boxShadow: applied ? 'inset 0 0 0 2px var(--txt)' : 'inset 0 0 0 1px var(--line2)',
              }}
            >
              {tiles[preset.id] ? (
                <img alt="" className="block h-full w-full object-cover" src={tiles[preset.id]} />
              ) : null}
            </span>
            <span className={`mt-[4px] block text-[12px] ${applied ? 'text-txt' : 'text-dim'}`}>
              {preset.label}
            </span>
          </button>
        )
      })}
      <p className="col-span-2 m-0 mt-[4px] text-[11.5px] text-dim2">
        S’applique au calque sélectionné, en une seule étape d’historique.
      </p>
    </div>
  )
}
