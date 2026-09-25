/* The layer stack — design-pass §7b: always visible, never an accordion.
   Restyled by screen-10 §S5.2: a 36 px row carrying eye, thumbnail, name
   over kind, opacity as a number, and a grip (or a padlock for the base).

   Rendered TOP TO BOTTOM in the same order the array already carries it —
   `layers[0]` is the frontmost layer, the locked `photo` base is always
   last (see photoEditorLayersPixels.ts's own ordering note), so the list
   reads exactly like the stack it represents.

   THE THREE GESTURES THAT LEFT THE ROW. The permanent ↑ ↓ ✕ are gone: on a
   stack of three they were nine buttons competing with the thing they act
   on. Reordering is now a drag on the grip AND `Alt` + ↑ ↓ on the focused
   row; deleting is `Suppr` on the focused row and an entry in the
   right-click menu. Every one of them routes through the SAME `onReorder`
   / `onRemove` the buttons used to call — no second path.

   WHY NOT `role="listbox"`. §A asks for one, and it cannot be given
   honestly: an `option` may not contain the eye toggle and the grip, which
   are real buttons, and the fumigation selects a layer through
   `button[aria-pressed]`. The list stays a list of toggle buttons — the
   same state, announced by a role that is not a lie. The keyboard
   equivalent of the drag is announced on each row through
   `aria-describedby`, which is what §A was after.

   Presentational only (frontend.md): every gesture is a callback, the
   actual history-grouped writes live in usePhotoEditorAdvanced.ts. */
import { useMemo, useRef, useState } from 'react'

import { AdjustSlider } from '../../chrome/AdjustSlider'
import { AddLayerMenu } from './AddLayerMenu'
import type { Layer, LayerKind } from './photoEditorLayersPixels'
import { dominantColour, thumbDataUrl } from './thumbnails'

/* 24×24 CSS px minimum (WCAG 2.2 SC 2.5.8, AA — frontend.md's own
   target). A first pass sized these to the glyph alone (`p-0`, measured
   11-18px) — found by measuring the real DOM in the end-of-chantier audit,
   not by reading the JSX, against `UndoRedoButtons.tsx`'s own icon
   buttons (35×34px) as the established comparison. */
const ICON_BTN =
  'flex h-[24px] w-[24px] shrink-0 cursor-pointer items-center justify-center rounded-[6px] ' +
  'border-0 bg-transparent text-[13px] leading-none text-dim hover:bg-panel2 hover:text-txt ' +
  'disabled:opacity-30 disabled:hover:bg-transparent'

const THUMB_W = 24
const THUMB_H = 28

const KIND_LABEL: Record<LayerKind, string> = {
  photo: 'Base verrouillée',
  reglage: 'Réglage',
  image: 'Image',
  retouche: 'Retouche · vide',
}

export function LayerList({
  image, layers, selectedLayerId, onSelect, onAdd, onRemove, onToggleVisible, onOpacity, onReorder,
}: {
  image: HTMLImageElement | null
  layers: readonly Layer[]
  selectedLayerId: string
  onSelect: (id: string) => void
  onAdd: (kind: LayerKind, label: string) => void
  onRemove: (id: string) => void
  onToggleVisible: (id: string) => void
  onOpacity: (id: string, value: number) => void
  onReorder: (id: string, direction: 'up' | 'down') => void
}) {
  const [menuFor, setMenuFor] = useState<string | null>(null)
  const [dragging, setDragging] = useState<string | null>(null)
  const layersRef = useRef(layers)
  layersRef.current = layers

  const selected = layers.find((l) => l.id === selectedLayerId)

  /* Recomputed when the STACK changes, not on every slider tick — same
     reasoning (and the same measured cost) as the preset tiles. */
  const ids = layers.map((l) => l.id).join('|')
  const thumbs = useMemo(() => {
    const out: Record<string, string> = {}
    if (!image) return out
    for (const layer of layersRef.current) {
      if (layer.kind === 'reglage') continue // a swatch instead — see thumbnails.ts
      out[layer.id] = thumbDataUrl(image, [layer], THUMB_W, THUMB_H)
    }
    return out
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [image, ids, selectedLayerId])

  const swatches = useMemo(() => {
    const out: Record<string, string> = {}
    if (!image) return out
    for (const layer of layersRef.current) {
      if (layer.kind === 'reglage') out[layer.id] = dominantColour(image, layer)
    }
    return out
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [image, ids, selectedLayerId])

  /** ONE swap per row boundary crossed, each in its own event turn, so
      every call reads a `layers` that already carries the previous swap.
      Two calls inside the same tick would both read the same snapshot and
      the second would undo the first. The row height is measured rather
      than assumed: it is the thing that decides when a boundary is
      crossed. */
  const startDrag = (id: string, event: React.PointerEvent) => {
    event.preventDefault()
    const row = (event.currentTarget as HTMLElement).closest('li')
    const step = row ? row.offsetHeight : 36
    let anchor = event.clientY
    setDragging(id)
    const move = (moveEvent: PointerEvent) => {
      const delta = moveEvent.clientY - anchor
      if (Math.abs(delta) < step) return
      onReorder(id, delta < 0 ? 'up' : 'down')
      anchor += delta < 0 ? -step : step
    }
    const stop = () => {
      document.removeEventListener('pointermove', move)
      setDragging(null)
    }
    document.addEventListener('pointermove', move)
    document.addEventListener('pointerup', stop, { once: true })
  }

  const onRowKeyDown = (layer: Layer, event: React.KeyboardEvent) => {
    if (event.altKey && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) {
      event.preventDefault()
      onReorder(layer.id, event.key === 'ArrowUp' ? 'up' : 'down')
    } else if (event.key === 'Delete' && !layer.locked) {
      event.preventDefault()
      onRemove(layer.id)
    }
  }

  return (
    <div>
      <div className="mb-[8px] flex items-center justify-between gap-[8px]">
        <div className="lab">Calques</div>
        <AddLayerMenu onAdd={onAdd} />
      </div>

      <p className="sr-only" id="layerReorderHint">
        Alt et flèche haut ou bas pour déplacer le calque, Suppr pour le supprimer.
      </p>

      <ul className="m-0 flex list-none flex-col p-0" data-layer-list>
        {layers.map((layer) => {
          const isSelected = layer.id === selectedLayerId
          return (
            <li
              className="relative flex h-[36px] items-center gap-[6px] px-[8px]"
              data-layer={layer.id}
              data-layer-kind={layer.kind}
              key={layer.id}
              onContextMenu={(event) => {
                if (layer.locked) return
                event.preventDefault()
                setMenuFor(layer.id)
              }}
              style={{
                background: isSelected ? 'var(--panel3)' : 'transparent',
                boxShadow: isSelected ? 'inset 2px 0 0 var(--acc)' : undefined,
                opacity: dragging === layer.id ? 0.55 : 1,
              }}
            >
              <button
                aria-label={layer.visible ? 'Masquer le calque' : 'Afficher le calque'}
                className={ICON_BTN}
                data-hint-text={layer.visible ? 'Masquer' : 'Afficher'}
                disabled={layer.locked}
                onClick={() => onToggleVisible(layer.id)}
                type="button"
              >
                {layer.visible ? '◉' : '◌'}
              </button>

              <span
                aria-hidden="true"
                className="block shrink-0 overflow-hidden rounded-[2px] border border-line2"
                style={{
                  background: swatches[layer.id] ?? 'var(--panel2)',
                  height: THUMB_H,
                  width: THUMB_W,
                }}
              >
                {thumbs[layer.id] ? (
                  <img alt="" className="block h-full w-full object-cover" src={thumbs[layer.id]} />
                ) : null}
              </span>

              <button
                aria-describedby={layer.locked ? undefined : 'layerReorderHint'}
                aria-pressed={isSelected}
                className="min-w-0 flex-1 cursor-pointer border-0 bg-transparent p-0 text-left"
                onClick={() => onSelect(layer.id)}
                onKeyDown={(event) => onRowKeyDown(layer, event)}
                type="button"
              >
                <span className={`block truncate text-[12.5px] ${isSelected ? 'font-[600] text-txt' : 'text-txt'}`}>
                  {layer.name || layer.kind}
                </span>
                {/* Silent when it would only repeat the name: a « Réglage »
                    layer is called Réglage, and « Réglage / Réglage » on two
                    lines says half as much as one line does.

                    `--dim`, NOT `--dim2`: a selected row's ground is
                    `--panel3`, where tokens.css's own table already records
                    that `--dim2` falls to 4.27:1 — under AA. Measured on the
                    real DOM, not guessed. */}
                {KIND_LABEL[layer.kind] !== layer.name && (
                  <span className="block truncate text-[11px] leading-[1.2] text-dim">
                    {KIND_LABEL[layer.kind]}
                  </span>
                )}
              </button>

              <span className="shrink-0 text-[11px] tabular-nums text-dim">
                {layer.kind === 'photo' ? '' : `${layer.opacity}%`}
              </span>

              {layer.locked ? (
                /* A padlock here would say a THIRD time what the row
                   already says twice: the kind line reads « Base
                   verrouillée », and no gesture is offered. An empty slot
                   of the same width keeps the column aligned without
                   adding a glyph to decode. */
                <span aria-hidden="true" className="h-[24px] w-[24px] shrink-0" />
              ) : (
                <button
                  aria-label="Déplacer le calque"
                  className={`${ICON_BTN} cursor-grab touch-none`}
                  data-hint-text="Glisser pour déplacer, ou Alt et flèches"
                  onPointerDown={(event) => startDrag(layer.id, event)}
                  type="button"
                >
                  ⠿
                </button>
              )}

              {menuFor === layer.id && (
                <div
                  className="absolute right-[8px] top-[30px] z-20 rounded-[6px] border border-line2
                             bg-panel py-[4px] shadow-[var(--elev)]"
                  onKeyDown={(event) => {
                    if (event.key === 'Escape') setMenuFor(null)
                  }}
                  role="menu"
                >
                  <button
                    autoFocus
                    className="block w-full cursor-pointer whitespace-nowrap border-0 bg-transparent
                               px-[12px] py-[6px] text-left text-[12.5px] text-txt hover:bg-panel2"
                    onBlur={() => setMenuFor(null)}
                    onClick={() => {
                      setMenuFor(null)
                      onRemove(layer.id)
                    }}
                    role="menuitem"
                    type="button"
                  >
                    Supprimer le calque
                  </button>
                </div>
              )}
            </li>
          )
        })}
      </ul>

      {/* ONE opacity slider, for the selected layer (§S5.2) — the base has
          nothing under it to blend with, so it has none. */}
      {selected && !selected.locked && (
        <div className="mt-[8px] border-t border-line pt-[8px]">
          <AdjustSlider
            id="pe-opacity"
            label="opacité"
            max={100}
            min={0}
            onChange={(value) => onOpacity(selected.id, value)}
            suffix="%"
            value={selected.opacity}
          />
        </div>
      )}
    </div>
  )
}
