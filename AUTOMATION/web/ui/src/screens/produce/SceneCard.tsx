/* One scene of the Créer grid: preview, selection tick, tone match, imposed
   pose, and what production already knows about it.

   Named after the screen's folder, not the bank's `SceneCard` — the two show
   a scene for two different trades: this one is PICKED for a run, the bank's
   is OPENED for editing. */
import { Icon } from '../../chrome/Icon'
import { useConfig } from '../../state/ConfigContext'
import type { Scene } from '../../state/ScenesStoreContext'

/* The scene card, and the state that is NOT selection.

   SELECTION IS AN OUTLINE, NOT A BORDER (design-pass screen-3b, §S3): drawn
   INSIDE the card with `outline-offset:-2px`, it costs no layout, so a grid
   of `minmax(200px,1fr)` cards does not reflow by 2 px when one is ticked.
   The idle card keeps a plain 1 px line. */
const CARD =
  'group relative block w-full cursor-pointer overflow-hidden rounded-card border border-line' +
  ' bg-panel [transition:outline-color_.12s]'
const CARD_ON = 'outline-2 outline-acc [outline-offset:-2px]'
const CARD_IDLE = 'hover:border-line2'

export function SceneCard({
  scene,
  meta,
  stats,
  preview,
  tone,
  selected,
  imageUrl,
  onClick,
  onPoint,
  onEdit,
}: {
  scene: Scene
  meta?: { tones?: string[]; tags?: string[]; pose?: string }
  stats?: { avg: number | null; n: number; ok?: number | null }
  preview?: { name: string; bucket: string; space?: string; v?: number }
  tone: string
  selected: boolean
  imageUrl: (ref: Record<string, unknown>) => string
  onClick: () => void
  /** screen-3-produire §S: hover or focus makes this scene the develop
      panel's subject — a separate gesture from ticking it for the run
      (`onClick`). Optional: only the Produire grid points, the same card
      renders fine without it. */
  onPoint?: () => void
  /** screen-3-produire §B3: opens this scene in the Banque's composer,
      pre-selected. Optional, same reason as `onPoint`. */
  onEdit?: (id: string) => void
}) {
  const { qc } = useConfig()
  const dot =
    stats?.avg == null
      ? 'var(--dim2)'
      : stats.avg >= qc.high
        ? 'var(--ok)'
        : stats.avg >= qc.ok
          ? 'var(--warn)'
          : 'var(--bad)'
  const suits = (meta?.tones ?? []).includes(tone)
  const tags = (meta?.tags ?? []).slice(0, 3).join(' · ')

  return (
    /* The card is a `<div>`, NOT a `<button>` (screen-3-produire §B3): once
       the ✎ shortcut needed its own click target, ticking the scene and
       editing it became two SIBLING buttons rather than one nested inside
       the other — a button inside a button is invalid HTML and breaks
       screen-reader semantics (same reasoning already applied to the
       Revue's tiles, `review/Tile.tsx`, whose selection checkbox sits next
       to its thumbnail button for the same reason). */
    <div
      className={`${CARD} ${selected ? CARD_ON : CARD_IDLE}`}
      data-scene-card
      data-on={selected ? '1' : undefined}
    >
      <button
        type="button"
        className="block w-full cursor-pointer bg-transparent p-0 text-left [border:0]"
        aria-pressed={selected}
        onClick={onClick}
        onMouseEnter={onPoint}
        onFocus={onPoint}
      >
      <div
        className={`relative aspect-[4/5] bg-panel2 bg-cover bg-center ${
          preview
            ? ''
            : "after:absolute after:inset-0 after:flex after:items-center" +
              " after:justify-center after:text-[12px] after:text-dim2" +
              " after:content-['aucune_image']"
        }`}
        data-void={preview ? undefined : '1'}
        style={preview ? { backgroundImage: `url('${imageUrl({ ...preview, thumb: true })}')` } : undefined}
      >
        {/* « ce ton » and « pose imposée » are text labels on the scrim,
            STACKED in the top-left corner (design-pass screen-3b, §S3): the
            top-right is the checkbox's, and the two used to fight for it on a
            scene that is both pose-locked and ticked. The « ⛓ » glyph is
            gone — a screen reader read it literally, and the word says it. */}
        <div className="absolute top-[8px] left-[8px] flex flex-col items-start gap-[4px]">
          {suits && (
            <span
              className="rounded-[4px] bg-scrim px-[6px] py-px text-[10.5px] font-semibold text-acc"
            >
              ce ton
            </span>
          )}
          {meta?.pose && (
            /* `tabIndex={0}` + `data-hint-text` (design pass écran 7, §A2) —
               same contract as the Banque's own pose badge
               (`SceneComposer.tsx`): a plain `title` only reaches a mouse,
               this reaches the keyboard and a screen reader too. */
            <span
              className="rounded-[4px] bg-scrim px-[6px] py-px text-[10.5px] font-semibold text-dim"
              tabIndex={0}
              data-hint-text={`pose imposée : ${meta.pose}`}
            >
              pose imposée
            </span>
          )}
        </div>
        {/* a scene added and not yet saved exists in the grid but NOT in
            scenes.json, which /api/plan reads */
        !meta && (
          <div
            className="absolute bottom-[8px] left-[8px] rounded-[5px] border border-warn-line
                       bg-warn-bg px-[6px] py-[2px] text-[10px] uppercase tracking-[.5px]
                       text-warn"
          >
            non enregistrée
          </div>
        )}
        {/* A SQUARE box, 20 px (design-pass screen-3b, §S3): a circle reads as
            a radio, and ticking scenes is a multiple choice.

            `#ffffff55` IS THE DOCUMENTED VALUE, and the digits matter.
            `styles/DESIGN.md` § « Laissé brut » lists « liseré clair des
            pastilles cochées (#ffffff55) » and says why: no token family
            describes a light highlight, and inventing one for two occurrences
            would cost more than it returns. The design-pass screen-3b asked
            for `#ffffff66` while calling it « la valeur brute déjà listée
            dans DESIGN.md » — the intent was to reuse what was documented,
            and only the digits drifted. Reusing means reusing the value that
            is there. */}
        <div
          className={`absolute top-[8px] right-[8px] flex h-[20px] w-[20px] items-center
                      justify-center rounded-[4px] border ${
                        selected
                          ? 'border-acc bg-acc text-on-acc'
                          : 'border-[#ffffff55] bg-scrim text-transparent'
                      }`}
        >
          {selected && <Icon name="check" className="h-[14px] w-[14px]" />}
        </div>
      </div>
      <div className="px-[11px] py-[9px] pr-[34px]">
        {/* `pr-[34px]`: room for the ✎ button, a sibling of this text block
           overlaying the card's bottom-right corner (see below) — without
           it a long tag line ran under the icon. Measured in the browser
           (audit-ux-ui, end of chantier): 30px still let the tags line
           touch the button by ~2px on a real card (`extérieur · jour ·
           assise`) — 34px clears it. */}
        {/* Name on the left, format on the right (design-pass screen-3b §S3):
            the format is a constant-width fact and belongs on an edge, the
            name is what one reads and gets the rest of the line. */}
        <div className="flex items-baseline gap-[8px]">
          <b className="min-w-0 flex-1 truncate text-[13px] font-semibold">{scene.id}</b>
          <span className="flex-none text-[11px] tabular-nums text-dim2">
            {scene.format || '4:5'}
          </span>
        </div>
        <span className="text-[11.5px] text-dim">
          {scene.count || 1} img
          {(scene.variants ?? []).length ? ` +${(scene.variants ?? []).length} var.` : ''}
        </span>
        <div className="mt-[5px] flex items-center gap-[6px] text-[11.5px]">
          <span className="h-[7px] w-[7px] flex-none rounded-[50%]" style={{ background: dot }} />
          {stats ? (
            `${stats.avg != null ? stats.avg.toFixed(2) : '—'} · ${stats.n} produite${stats.n > 1 ? 's' : ''}`
          ) : (
            <span className="text-[11.5px] text-dim2">jamais produite</span>
          )}
        </div>
        {/* screen-3-produire §S: a mini score bar, in place of the buckets
            histogram the maquette wanted — `bank.stats` only carries
            {avg, ok, n}, no per-tier breakdown, and this reads no more than
            that. Width is the SHARE VALIDATED (`ok`/`n`), a real ratio;
            colour reuses `dot`, the same avg-score tiers already shown above
            — no invented data, just the two real numbers made denser.
            Decorative: the text line above already carries both figures. */}
        {stats && stats.ok != null && stats.n > 0 && (
          <div
            className="mt-[4px] h-[3px] w-full overflow-hidden rounded-[2px] bg-line2"
            aria-hidden="true"
          >
            <div
              className="h-full rounded-[2px]"
              style={{ width: `${Math.round((100 * stats.ok) / stats.n)}%`, background: dot }}
            />
          </div>
        )}
        {tags && <div className="mt-[5px] truncate text-[10.5px] text-dim2">{tags}</div>}
      </div>
      </button>
      {onEdit && (
        <button
          type="button"
          /* `p-0`: a bare <button> without it falls back to the browser's own
             UA padding (found live on the header's shutdown buttons, same
             root cause — see chrome/Header.tsx) — harmless here on a single
             text glyph, but the same contract gap, fixed for the same
             reason. */
          /* Visible on hover or focus of the card, NEVER `display:none`
             (design-pass screen-3b §S3, frontend.md): it stays in the tab
             order and keeps its accessible name.

             VERIFIED AT THE KEYBOARD, not assumed: 22 tabs reach this button,
             `:focus-visible` and the card's `:focus-within` both match, and
             the opacity settles at 1 — a keyboard user sees what they focus.
             The `!` on the three variants is belt, not fix: two utilities
             writing the same property are decided by their order in the
             GENERATED sheet, a trap this folder has hit four times
             (IntensityBar, IntentRail, the header's buttons, the drawer's own
             display), and `opacity-0` sits in the same chain as its three
             overrides. Marking them removes the question.

             A NOTE FOR THE NEXT MEASUREMENT: reading `getComputedStyle`
             immediately after the focus returns the INTERPOLATED value of the
             120 ms transition, which is still ~0. It reads exactly like a
             focus ring painted on an invisible control, and it is not. Wait
             for the transition before believing the number. */
          className="absolute bottom-[8px] right-[8px] z-[1] flex h-[24px] w-[24px]
                     items-center justify-center rounded-[50%] border border-line2
                     bg-scrim p-0 text-[12px] text-txt opacity-0 [transition:opacity_.12s]
                     group-hover:opacity-100! group-focus-within:opacity-100!
                     focus-visible:opacity-100! hover:bg-panel2"
          aria-label={`éditer la scène ${scene.id} dans les Ateliers`}
          data-hint-text="Ouvrir cette scène dans les Ateliers, pré-sélectionnée"
          onClick={(event) => {
            event.stopPropagation()
            onEdit(scene.id)
          }}
        >
          ✎
        </button>
      )}
    </div>
  )
}


/* The last card of the grid: creating a scene. Same style family as the cards
   around it — it belongs to the grid rather than sitting above it. Creating
   stays possible, but it is no longer the entry point of the screen. */
export function NewSceneCard({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      className={`${CARD} ${CARD_IDLE} flex min-h-[150px] items-center justify-center
                  border-dashed border-line2 text-center`}
      data-scene-card
      data-new
      onClick={onClick}
    >
      <div className="px-[11px] py-[9px]">
        <b className="block truncate text-[20px] font-semibold text-dim">+</b>
        <span className="text-[11.5px] text-dim">Créer une scène</span>
      </div>
    </button>
  )
}
