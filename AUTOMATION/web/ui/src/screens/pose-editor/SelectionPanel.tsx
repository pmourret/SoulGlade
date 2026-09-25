/* « Sélection » — what the selected joint(s) are and the numbers that move
   them (design-pass screen-13 §S5.2). Moved out of the former PoseInspector
   UNCHANGED in behaviour: the x/y fields commit per keystroke, the dx/dy
   fields commit on Enter or blur as ONE history step each, from origins
   re-captured on every focus (design-pass screen-6 §B3), and « Placer ce
   point » keeps its rule (promote an existing guess, else a computed spot). */
import { useEffect, useRef, useState } from 'react'

import { Icon } from '../../chrome/Icon'
import {
  angleAndLength, BODY_JOINT_GROUPS, HAND_JOINT_GROUPS, nameOf, parentIndexOf,
} from './poseTopology'
import { parsePointKey, withPoint, type Point, type PointGroup, type PoseFrame } from './poseFrame'
import type { Selected } from './PoseCanvas'

const PART: Record<PointGroup, string> = { body: 'Corps', handLeft: 'Main gauche', handRight: 'Main droite' }

/** The part, and the group within it when every key shares one — « Main
    droite · Index » — or null when the selection spans parts. */
function commonPart(keys: string[]): string | null {
  const refs = keys.map(parsePointKey)
  const group = refs[0]?.group
  if (!group || refs.some((r) => r.group !== group)) return null
  const groups = group === 'body' ? BODY_JOINT_GROUPS : HAND_JOINT_GROUPS
  const owner = groups.find((g) => refs.every((r) => g.indices.includes(r.index)))
  return owner ? `${PART[group]} · ${owner.label}` : PART[group]
}

/** Where an unplaced joint (`c<=0`, sitting at the flat-decode default of
    (0,0) — see poseFrame.ts's `flatToPoints`) lands the moment someone
    asks to place it. A fixed diagonal offset from the parent, not
    anything anatomical: the point is about to be dragged into its real
    spot anyway, this only needs to land it somewhere visible and not
    exactly on top of its parent (or of ANOTHER unplaced sibling — several
    at once all default to the same (0,0), which is exactly the "stuck in
    a corner, unreachable by click" problem this exists to fix). Root
    joints (no parent) fall back to the canvas center. */
function defaultPlacement(pose: PoseFrame, parentPoint: Point | null): { x: number; y: number } {
  if (parentPoint) return { x: parentPoint.x + 40, y: parentPoint.y - 40 }
  return { x: pose.canvasWidth / 2, y: pose.canvasHeight / 2 }
}

const PIN_BUTTON =
  'inline-flex h-[28px] cursor-pointer items-center gap-[6px] rounded-[6px] border border-line2 bg-panel2 ' +
  'px-[10px] text-[12.5px] text-txt hover:border-dim2 aria-pressed:border-warn-line aria-pressed:bg-warn-bg aria-pressed:text-warn-txt'

export function SelectionPanel({
  pose,
  selected,
  onChange,
  onRecenter,
  onClearSelection,
  pinned,
  onSetPinned,
  onOffset,
}: {
  pose: PoseFrame
  selected: Selected
  onChange: (pose: PoseFrame) => void
  onRecenter: () => void
  onClearSelection: () => void
  pinned: ReadonlySet<string>
  /** Pins or unpins every key in one call — the multi-selection button and
      the single-joint toggle alike. */
  onSetPinned: (keys: string[], value: boolean) => void
  /** Moves every point in `origins` by (dx, dy) as ONE history step
      (design-pass screen-6, §B3) — `origins` is captured on the offset
      field's focus, not re-read from `pose` here: by the time this fires,
      `pose` may already reflect an EARLIER offset from the same pair. */
  onOffset: (origins: ReadonlyMap<string, Point>, dx: number, dy: number) => void
}) {
  const selectedKeys = [...selected]
  const single = selectedKeys.length === 1 ? parsePointKey(selectedKeys[0]) : null
  const point = single ? pose[single.group][single.index] : null
  const parentIndex = single ? parentIndexOf(single.group, single.index) : null
  const parentPoint = single && parentIndex !== null ? pose[single.group][parentIndex] : null
  const allPinned = selectedKeys.length > 0 && selectedKeys.every((k) => pinned.has(k))
  // §B3's origin snapshot — a ref, not state: capturing it is a side effect
  // of focusing a field, not something that should itself trigger a render.
  // Re-captured on EVERY focus so a dx-then-dy pair composes.
  const offsetOrigins = useRef<Map<string, Point>>(new Map())
  const captureOffsetOrigins = () => {
    const snapshot = new Map<string, Point>()
    for (const key of selectedKeys) {
      const { group, index } = parsePointKey(key)
      const p = pose[group][index]
      if (p.c > 0) snapshot.set(key, p)
    }
    offsetOrigins.current = snapshot
  }

  const pinButton = (label: string) => (
    <button
      type="button"
      className={PIN_BUTTON}
      aria-pressed={allPinned}
      onClick={() => onSetPinned(selectedKeys, !allPinned)}
    >
      <Icon name="pin" className="h-[13px] w-[13px]" />
      {label}
    </button>
  )

  return (
    <section className="border-t border-line px-[16px] py-[14px]" aria-labelledby="poseSelectionTitle">
      <div className="mb-[10px] flex items-baseline justify-between">
        <h2 className="m-0 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-dim2" id="poseSelectionTitle">
          Sélection
        </h2>
        {selected.size > 0 && (
          <button type="button" className="link text-[12px]" onClick={onClearSelection}>
            Désélectionner
          </button>
        )}
      </div>

      {single && point ? (
        <>
          <div className="flex items-center gap-[10px]">
            <span
              aria-hidden="true"
              className={`h-[9px] w-[9px] flex-none rounded-full ${point.c > 0 ? 'bg-txt' : 'border border-dashed border-dim2'}`}
            />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[14px] font-semibold text-txt">{nameOf(single.group, single.index)}</div>
              <div className="text-[12px] text-dim2">{PART[single.group]}</div>
            </div>
            {point.c > 0 && pinButton(allPinned ? 'Libérer' : 'Épingler')}
          </div>

          {point.c > 0 ? (
            <>
              <div className="mt-[12px] flex gap-[8px]">
                <NumberField
                  label="x"
                  value={point.x}
                  onCommit={(x) => onChange(withPoint(pose, single.group, single.index, x, point.y))}
                />
                <NumberField
                  label="y"
                  value={point.y}
                  onCommit={(y) => onChange(withPoint(pose, single.group, single.index, point.x, y))}
                />
              </div>
              {parentPoint ? (
                <>
                  <p className="mt-[10px] mb-0 text-[12.5px] text-dim" id="poseBoneReading">
                    {angleAndLength(parentPoint, point)} · depuis {nameOf(single.group, parentIndex!)}
                  </p>
                  <p className="mt-[4px] mb-0 text-[12px] text-dim2">
                    Maj + glisser tourne le membre en gardant cette longueur.
                  </p>
                </>
              ) : (
                <p className="mt-[10px] mb-0 text-[12.5px] text-dim2" id="poseBoneReading">
                  Racine, aucun os parent à mesurer.
                </p>
              )}
            </>
          ) : (
            <>
              <p className="mt-[10px] mb-0 text-[12.5px] text-dim">
                Pas encore placé : le gabarit ou la photo source ne le couvrait pas.
              </p>
              <button
                type="button"
                className="btn primary mt-[10px] w-full"
                onClick={() => {
                  // A low-confidence extraction often still carries a real
                  // (x, y) guess — c<=0 just means "not sure", not "no idea".
                  // Promoting that guess (keep x/y, mark placed) beats
                  // overwriting it with a generic offset. Only a point that
                  // never had ANY data lands exactly at (0, 0) — that's the
                  // one case worth a computed position instead.
                  const target = point.x === 0 && point.y === 0
                    ? defaultPlacement(pose, parentPoint)
                    : { x: point.x, y: point.y }
                  onChange(withPoint(pose, single.group, single.index, target.x, target.y))
                  onRecenter()
                }}
              >
                Placer ce point
              </button>
            </>
          )}
        </>
      ) : selectedKeys.length > 1 ? (
        <>
          <div className="flex items-center gap-[10px]">
            <div className="min-w-0 flex-1">
              <div className="text-[14px] font-semibold text-txt">{selectedKeys.length} points</div>
              {commonPart(selectedKeys) && (
                <div className="text-[12px] text-dim2">{commonPart(selectedKeys)}</div>
              )}
            </div>
            {pinButton(allPinned ? 'Libérer tout' : 'Épingler tout')}
          </div>
          <p className="mt-[12px] mb-[6px] text-[12px] text-dim">
            Décaler le groupe, en une seule étape. Glisser l'un des points déplace tout le groupe.
          </p>
          <div className="flex gap-[8px]">
            <OffsetField
              label="dx"
              onFocus={captureOffsetOrigins}
              onCommit={(dx) => onOffset(offsetOrigins.current, dx, 0)}
            />
            <OffsetField
              label="dy"
              onFocus={captureOffsetOrigins}
              onCommit={(dy) => onOffset(offsetOrigins.current, 0, dy)}
            />
          </div>
        </>
      ) : (
        <p className="m-0 text-[12.5px] text-dim">
          Aucun point sélectionné. Clique un point ou choisis-le dans la liste.
        </p>
      )}
    </section>
  )
}

/* The label sits INSIDE the field (design-pass screen-13 §S5.2): a 32 px box
   whose left end names the axis. Still a real <label> wrapping its input. */
const FIELD = 'flex h-[32px] flex-1 items-center gap-[6px] rounded-[6px] border border-line2 bg-bg px-[8px] focus-within:border-focus'
const FIELD_INPUT = 'h-full w-full min-w-0 border-0 bg-transparent p-0 text-right text-[13px] tabular-nums text-txt outline-none'

/** A plain controlled `<input type="number">` bound straight to `value`
    fights the user the moment they type a bare "-" or clear the field —
    `Number("-")` is NaN, so skipping onCommit for it is right, but then the
    prop hasn't changed and the input would otherwise snap back to the last
    committed digit on every keystroke. Local text state absorbs the
    in-progress typing; the prop only overwrites it when `value` itself
    actually changes (a drag on the canvas, an undo, a fresh selection). */
function NumberField({
  label, value, onCommit,
}: {
  label: string
  value: number
  onCommit: (next: number) => void
}) {
  const [text, setText] = useState(String(Math.round(value)))

  useEffect(() => {
    setText(String(Math.round(value)))
  }, [value])

  return (
    <label className={FIELD}>
      <span className="text-[12px] text-dim2">{label}</span>
      <input
        type="number"
        className={FIELD_INPUT}
        value={text}
        onChange={(event) => {
          setText(event.target.value)
          const parsed = Number(event.target.value)
          if (event.target.value.trim() !== '' && Number.isFinite(parsed)) onCommit(parsed)
        }}
      />
    </label>
  )
}

/** A discrete offset, not a live preview (design-pass screen-6, §B3): commits
    on Enter or blur, then resets itself to `0`. `onFocus` lets the caller
    snapshot the group's current position the moment the user starts typing,
    so a dx-then-dy pair composes onto the position dx already moved to. */
function OffsetField({
  label, onFocus, onCommit,
}: {
  label: string
  onFocus: () => void
  onCommit: (delta: number) => void
}) {
  const [text, setText] = useState('0')

  const commit = () => {
    const parsed = Number(text)
    if (text.trim() !== '' && Number.isFinite(parsed) && parsed !== 0) onCommit(parsed)
    setText('0')
  }

  return (
    <label className={FIELD}>
      <span className="text-[12px] text-dim2">{label}</span>
      <input
        type="number"
        className={FIELD_INPUT}
        value={text}
        onFocus={onFocus}
        onChange={(event) => setText(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key !== 'Enter') return
          event.preventDefault()
          commit()
        }}
      />
    </label>
  )
}
