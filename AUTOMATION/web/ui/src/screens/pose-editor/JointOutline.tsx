/* The list of all 60 joints, as a tree (design-pass screen-13 §S3) — a joint
   at 4px radius on a hand is a small target even zoomed in, a named row in a
   list never is.

   Moved out of the former PoseInspector UNCHANGED in what it does: plain
   click selects, Ctrl/Cmd+click adds, a group owning a selected joint opens
   by itself (`useExpandedGroups`). What is new is the reading: a tree role,
   counts per part and per group, a dot per row, the pin icon.

   ARROWS MOVE FOCUS HERE, AND STOP HERE. The screen's container listens for
   arrows to nudge the selected joints (`handlePoseKeyDown`); inside the tree
   the same keys walk the rows, so they stop propagating — otherwise walking
   down the list would also push the selection a pixel per row. */
import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent as ReactMouseEvent } from 'react'

import { Icon } from '../../chrome/Icon'
import {
  BODY_JOINT_GROUPS, BODY_JOINT_NAMES, HAND_JOINT_GROUPS, HAND_JOINT_NAMES, type JointGroup,
} from './poseTopology'
import { parsePointKey, pointKey, type Point, type PointGroup, type PoseFrame } from './poseFrame'
import type { Selected } from './PoseCanvas'

const PARTS: { title: string; group: PointGroup; names: readonly string[]; groups: readonly JointGroup[] }[] = [
  { title: 'Corps', group: 'body', names: BODY_JOINT_NAMES, groups: BODY_JOINT_GROUPS },
  { title: 'Main gauche', group: 'handLeft', names: HAND_JOINT_NAMES, groups: HAND_JOINT_GROUPS },
  { title: 'Main droite', group: 'handRight', names: HAND_JOINT_NAMES, groups: HAND_JOINT_GROUPS },
]

const placedIn = (points: Point[], indices: readonly number[]) =>
  indices.filter((i) => (points[i]?.c ?? 0) > 0).length

export function JointOutline({
  pose, selected, onSelect, onToggleSelect, pinned,
}: {
  pose: PoseFrame
  selected: Selected
  onSelect: (group: PointGroup, index: number) => void
  onToggleSelect: (group: PointGroup, index: number) => void
  pinned: ReadonlySet<string>
}) {
  const treeRef = useRef<HTMLDivElement | null>(null)
  const total = pose.body.length + pose.handLeft.length + pose.handRight.length
  const placed = [...pose.body, ...pose.handLeft, ...pose.handRight].filter((p) => p.c > 0).length

  /* Up/Down walk the visible rows (joint rows and group headers alike);
     Right/Left open and close a group header — the tree pattern. */
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
    event.stopPropagation()
    const items = [...(treeRef.current?.querySelectorAll<HTMLElement>('[role="treeitem"]') ?? [])]
    const current = items.indexOf(document.activeElement as HTMLElement)
    const target = event.target as HTMLElement
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      const expanded = target.getAttribute('aria-expanded')
      if (expanded !== null && (expanded === 'true') === (event.key === 'ArrowLeft')) {
        event.preventDefault()
        target.click()
      }
      return
    }
    event.preventDefault()
    const next =
      event.key === 'Home' ? 0
        : event.key === 'End' ? items.length - 1
          : Math.max(0, Math.min(items.length - 1, current + (event.key === 'ArrowDown' ? 1 : -1)))
    items[next]?.focus()
  }

  return (
    <div className="flex min-h-0 flex-col">
      <div className="flex items-baseline justify-between px-[14px] pt-[14px] pb-[8px]">
        <h2 className="m-0 text-[13px] font-semibold text-txt">Points</h2>
        <span className="text-[12px] text-dim2 tabular-nums">
          {placed} / {total} placés
        </span>
      </div>
      <div
        ref={treeRef}
        role="tree"
        aria-label="Points du squelette"
        aria-multiselectable="true"
        className="min-h-0 flex-1 overflow-y-auto pb-[12px]"
        onKeyDown={onKeyDown}
      >
        {PARTS.map((part) => (
          <JointList
            key={part.group}
            title={part.title}
            group={part.group}
            names={part.names}
            groups={part.groups}
            points={pose[part.group]}
            selected={selected}
            onSelect={onSelect}
            onToggleSelect={onToggleSelect}
            pinned={pinned}
          />
        ))}
      </div>
    </div>
  )
}

/** Groups owning at least one currently selected joint start expanded —
    landing a click on the canvas, or Ctrl+Z stepping back into a hand, must
    not leave the outliner hiding the very joint(s) it's now showing
    selected elsewhere. Collapsing one back by hand afterward is still a
    full override: this only ever ADDS to `expanded`, a re-render from an
    unrelated prop change never closes what the user opened. */
function useExpandedGroups(selected: Selected, group: PointGroup, groups: readonly JointGroup[]) {
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set())
  useEffect(() => {
    const ownersToOpen = [...selected]
      .map(parsePointKey)
      .filter((ref) => ref.group === group)
      .map((ref) => groups.find((g) => g.indices.includes(ref.index))?.label)
      .filter((label): label is string => Boolean(label) && !expanded.has(label!))
    if (ownersToOpen.length === 0) return
    setExpanded((prev) => new Set([...prev, ...ownersToOpen]))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, group, groups])
  const toggle = (label: string) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(label)) next.delete(label)
      else next.add(label)
      return next
    })
  return { expanded, toggle }
}

function JointList({
  title, group, names, groups, points, selected, onSelect, onToggleSelect, pinned,
}: {
  title: string
  group: PointGroup
  names: readonly string[]
  groups: readonly JointGroup[]
  points: Point[]
  selected: Selected
  onSelect: (group: PointGroup, index: number) => void
  onToggleSelect: (group: PointGroup, index: number) => void
  pinned: ReadonlySet<string>
}) {
  const { expanded, toggle } = useExpandedGroups(selected, group, groups)
  const all = groups.flatMap((g) => g.indices)

  const clickRow = (index: number) => (event: ReactMouseEvent) => {
    if (event.ctrlKey || event.metaKey) onToggleSelect(group, index)
    else onSelect(group, index)
  }

  const row = (index: number, nested: boolean) => (
    <JointRow
      key={index}
      label={names[index]}
      isSelected={selected.has(pointKey(group, index))}
      placed={(points[index]?.c ?? 0) > 0}
      isPinned={pinned.has(pointKey(group, index))}
      nested={nested}
      onClick={clickRow(index)}
    />
  )

  return (
    <div role="group" aria-label={title} className="mt-[6px]">
      <div className="flex items-baseline justify-between px-[14px] py-[6px] text-[12px] font-semibold text-dim">
        <span>{title}</span>
        <span className="font-normal text-dim2 tabular-nums">
          {placedIn(points, all)} / {all.length}
        </span>
      </div>
      {groups.map((g) => {
        // A single-joint "group" (body's neck, a hand's wrist) is just that
        // joint — a header collapsing exactly one row underneath would be an
        // extra click for nothing.
        if (g.indices.length === 1) return row(g.indices[0], false)
        const isOpen = expanded.has(g.label)
        return (
          <div key={g.label} role="none">
            <button
              type="button"
              role="treeitem"
              aria-expanded={isOpen}
              aria-selected={false}
              className="flex h-[26px] w-full cursor-pointer items-center gap-[6px] border-0 bg-transparent
                         px-[14px] text-left text-[12.5px] text-dim hover:bg-panel2 hover:text-txt"
              onClick={() => toggle(g.label)}
            >
              <span aria-hidden="true" className={`inline-block w-[10px] text-[10px] transition-transform motion-reduce:transition-none ${isOpen ? 'rotate-90' : ''}`}>
                ▸
              </span>
              <span className="min-w-0 flex-1 truncate">{g.label}</span>
              <span className="text-[11.5px] text-dim2 tabular-nums">
                {placedIn(points, g.indices)} / {g.indices.length}
              </span>
            </button>
            {isOpen && <div role="group">{g.indices.map((index) => row(index, true))}</div>}
          </div>
        )
      })}
    </div>
  )
}

function JointRow({
  label, isSelected, placed, isPinned, nested, onClick,
}: {
  label: string
  isSelected: boolean
  placed: boolean
  isPinned: boolean
  nested: boolean
  onClick: (event: ReactMouseEvent) => void
}) {
  return (
    <button
      type="button"
      role="treeitem"
      aria-selected={isSelected}
      aria-label={`${label}${isPinned ? ', épinglé' : ''}${isSelected ? ', sélectionné' : ''}`}
      className={`flex h-[26px] w-full cursor-pointer items-center gap-[8px] border-0 text-left text-[12.5px]
                  ${nested ? 'pl-[30px]' : 'pl-[14px]'} pr-[14px]
                  ${isSelected
                    ? 'bg-panel3 font-semibold text-txt shadow-[inset_2px_0_0_var(--acc)]'
                    : `bg-transparent hover:bg-panel2 ${placed ? 'text-txt' : 'text-dim2'}`}`}
      onClick={onClick}
    >
      <span
        aria-hidden="true"
        className={`h-[7px] w-[7px] flex-none rounded-full ${
          isSelected ? 'bg-txt' : placed ? 'bg-line2' : 'border border-dashed border-dim2'
        }`}
      />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {isPinned && <Icon name="pin" className="h-[12px] w-[12px] flex-none text-warn" />}
    </button>
  )
}
