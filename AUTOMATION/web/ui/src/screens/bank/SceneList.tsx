/* The scene list: a selector, not a showcase. Replaces the 2-row horizontal
   carousel (31/08/2026 layout pass) with a narrow, vertically-scrolling
   outliner — one row per scene, grouped by intention in native `<details>`
   sections (studio-IA direction, 2026-09-01).

   WHY THE CAROUSEL DID NOT SURVIVE. A horizontal carousel is what you reach
   for when you refuse vertical scroll and are short on height — it is not
   how a professional tool organises a list of things you pick ONE of at a
   time. Unreal's World Outliner, Photoshop's Layers panel: a narrow vertical
   list, one row per object, that scrolls the ordinary way. This screen's
   scene picker is exactly that kind of list, not the work surface — the
   composer is the work surface, and it can only become the dominant, wide
   area (BankScreen.tsx's grid-cols) once this stops competing for width.

   THE CARD SHOWS THE ESSENTIALS, the composer's own header (SceneComposer's
   `SceneHeader`) now carries the rest once a scene is open — pose/band
   badges and tags do not need to survive twice. Deliberately the same
   `data-scene-card` contract `produce/SceneCard.tsx` used, so the keyboard
   accelerator in `useSceneWorkbench` keeps working the same way. */
import { useState, type KeyboardEvent, type RefObject } from 'react'

import { Icon } from '../../chrome/Icon'
import type { Creative } from '../../state/TaxonomyContext'
import type { SceneDraft } from '../../state/ScenesStoreContext'

export type ScenePreview = { name: string; bucket: string }

export function SceneListRow({
  draft,
  preview,
  stats,
  selected,
  changed,
  imageUrl,
  onOpen,
}: {
  draft: SceneDraft
  preview?: ScenePreview
  stats?: { n: number; avg: number | null }
  selected: boolean
  /** Holds edits `scenes.json` does not have yet (`sceneChanges`). */
  changed: boolean
  imageUrl: (ref: Record<string, unknown>) => string
  onOpen: () => void
}) {
  return (
    <button
      type="button"
      /* The current row is told by its GROUND plus an accent EDGE, not by a
         full accent border (charte graphite, écran 0): the accent marks where
         one is, it does not paint controls.

         `border-0` IS NOT OPTIONAL, and this row is the second place to prove
         it. A <button> that declares no `border` falls back to the browser's
         own `2px outset` frame — the omission measured at 2560 px on
         `ProduceSidebar`'s rows (report of 2026-09-23, commit 75d6417). Here
         the row used to declare `border-2 border-transparent`, which covered
         the case by accident; replacing that border with a background-only
         selection took the guard away with it, and the UA frame came back on
         every scene of the picker. A row of a list is a row, not a box. */
      className={`relative flex w-full items-center gap-[9px] rounded-[6px] border-0
                 px-[8px] py-[6px] text-left [transition:background-color_.12s]
                 focus-visible:outline-2 focus-visible:outline-focus focus-visible:-outline-offset-2 ${
                   selected
                     ? 'bg-panel3 font-semibold [box-shadow:inset_2px_0_0_var(--acc)]'
                     : 'bg-transparent hover:bg-panel2'
                 }`}
      data-scene-card
      data-uid={draft.uid}
      data-on={selected ? '1' : undefined}
      aria-pressed={selected}
      onClick={onOpen}
    >
      <div
        className="h-[35px] w-[28px] shrink-0 overflow-hidden rounded-[5px] bg-panel2 bg-cover bg-center"
        style={preview ? { backgroundImage: `url('${imageUrl({ ...preview, thumb: true })}')` } : undefined}
      />
      <div className="min-w-0 flex-1">
        <b className="block truncate text-[12.5px]" data-card-id>
          {draft.id || '(sans identifiant)'}
        </b>
        {/* `--dim` and not `--dim2`: the SELECTED row's ground is `--panel3`,
            where `--dim2` falls to 4.27:1 — the one exception `tokens.css`
            names, and a line of 11 px is exactly what it warns against. */}
        <span className="block truncate text-[11px] text-dim" data-card-produced>
          {draft.format} ·{' '}
          {stats ? `${stats.n} produite${stats.n > 1 ? 's' : ''}` : 'jamais produite'}
        </span>
      </div>
      {changed && (
        /* Never colour alone (frontend.md): the dot finds it, the clipped
           word is what a screen reader hears. */
        <>
          <span aria-hidden="true" className="h-[6px] w-[6px] shrink-0 rounded-[50%] bg-warn" />
          <span className="sr-only">modifiée</span>
        </>
      )}
    </button>
  )
}

export type SceneGroup = {
  key: string
  label: string
  entries: { draft: SceneDraft; index: number }[]
}

/* Order follows `creative.intentions` — the same vocabulary the composer's
   own intention selector reads (never a taxonomy this screen invents on its
   own). A scene whose intention fell out of the taxonomy, or has none, KEEPS
   its own group rather than losing its scenes into an unrelated bucket —
   same "keep what's out of taxonomy visible" rule the composer already
   applies to an out-of-taxonomy intention value. */
export function groupByIntention(
  shown: { draft: SceneDraft; index: number }[],
  creative: Creative | null,
): SceneGroup[] {
  const labels = new Map((creative?.intentions ?? []).map((i) => [i.key, i.label]))
  const order = (creative?.intentions ?? []).map((i) => i.key)
  const buckets = new Map<string, { draft: SceneDraft; index: number }[]>()
  for (const entry of shown) {
    const key = entry.draft.intention || ''
    if (!buckets.has(key)) buckets.set(key, [])
    buckets.get(key)!.push(entry)
  }
  const orderedKeys = [
    ...order.filter((k) => buckets.has(k)),
    ...[...buckets.keys()].filter((k) => k && !order.includes(k)),
    ...(buckets.has('') ? [''] : []),
  ]
  return orderedKeys.map((key) => ({
    key,
    label: key ? (labels.get(key) ?? key) : '— sans intention —',
    // Alphabetical within a group — a picker one scans, not a log one reads
    // in creation order (explicit direction, 2026-09-01).
    entries: [...buckets.get(key)!].sort((a, b) => a.draft.id.localeCompare(b.draft.id, 'fr')),
  }))
}

/* The grouped list itself, extracted from BankScreen so the auto-expand-while-
   searching behaviour has one owner instead of living inline in the screen.
   Collapse state is LOCAL and per-group: a group starts open, a click folds
   it, and that choice sticks across re-renders (typing in another field,
   selecting a different scene) because it lives here, not in the JSX.

   WHILE A SEARCH IS ACTIVE, every rendered group already holds only matches —
   `groupByIntention` builds its buckets from `shown`, the already-filtered
   list, so a group with zero hits never appears at all. Forcing every VISIBLE
   group open while filtering is therefore always correct, with no per-group
   "does this one have a hit" check needed. A manual collapse attempted while
   filtering is not persisted: it would be undone by the very next render
   anyway (the group still has a match), so recording it would only leave a
   stale collapse waiting to surprise the next filter-cleared render. */
export function SceneListPanel({
  shown,
  creative,
  filterActive,
  previews,
  stats,
  selectedUid,
  changedUids,
  imageUrl,
  onOpen,
  listRef,
  onKeyDown,
}: {
  shown: { draft: SceneDraft; index: number }[]
  creative: Creative | null
  filterActive: boolean
  previews: Record<string, ScenePreview>
  stats: Record<string, { n: number; avg: number | null }>
  selectedUid: string | undefined
  /** Uids of the drafts holding an unsaved edit (design pass screen-7b §S3). */
  changedUids: Set<string>
  imageUrl: (ref: Record<string, unknown>) => string
  onOpen: (uid: string) => void
  listRef: RefObject<HTMLDivElement | null>
  onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void
}) {
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set())
  const groups = groupByIntention(shown, creative)

  return (
    <div
      ref={listRef}
      id="sceneCards"
      /* Arrows move the focus from row to row, Home and End to the two ends,
         Left/Right fold the enclosing group — see useSceneWorkbench for why
         this is linear now instead of the carousel's column-major math. */
      onKeyDown={onKeyDown}
      className="flex flex-col gap-[12px]"
    >
      {groups.map((group) => {
        const open = filterActive || !collapsed.has(group.key)
        return (
          <details
            key={group.key}
            open={open}
            className="group"
            onToggle={(event) => {
              if (filterActive) return
              const isOpen = event.currentTarget.open
              setCollapsed((prev) => {
                const next = new Set(prev)
                if (isOpen) next.delete(group.key)
                else next.add(group.key)
                return next
              })
            }}
          >
            {/* Native disclosure, not a hand-rolled one: free keyboard
                (Enter/Space) and expanded/collapsed state exposed to
                assistive tech, no ARIA to get wrong. Own chevron (rotated via
                Tailwind's `group-open:`) replaces the native marker glyph,
                which the two engines draw differently. */}
            <summary
              className="flex cursor-pointer list-none items-center gap-[6px] rounded-[6px]
                         lab px-[4px] py-[4px] hover:text-dim
                         focus-visible:outline-2 focus-visible:outline-focus
                         focus-visible:outline-offset-2
                         [&::-webkit-details-marker]:hidden"
            >
              <Icon name="chevron" className="h-[11px] w-[11px] shrink-0 transition-transform group-open:rotate-90" />
              <span className="truncate">{group.label}</span>
              <span className="ml-auto shrink-0 font-normal normal-case tracking-normal text-dim2">
                {group.entries.length}
              </span>
            </summary>
            <div className="mt-[6px] flex flex-col gap-[6px] pl-[2px]">
              {group.entries.map(({ draft }) => (
                <SceneListRow
                  key={draft.uid}
                  draft={draft}
                  preview={previews[draft.base.id]}
                  stats={stats[draft.base.id]}
                  selected={selectedUid === draft.uid}
                  changed={changedUids.has(draft.uid)}
                  imageUrl={imageUrl}
                  onOpen={() => onOpen(draft.uid)}
                />
              ))}
            </div>
          </details>
        )
      })}
    </div>
  )
}
