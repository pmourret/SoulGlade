/* The sheet of the selected outfit, centre of the workshop (IT-10 chantier 6,
   design-pass tenues) — presentational: it receives the draft and the
   callbacks that act (frontend.md, a sub-component never calls the API).

   WHAT IT MUST SAY: the text a scene that wears this outfit receives, IN FULL,
   fixed under the bar while the body scrolls — an atelier that hides the text
   it injects is the defect IT-10 was opened on. The fragments of the slot (or
   zone) being worked on are marked in it.

   PIECES ON A BODY, NOT A LIST. The body is read by zone (Tête … Porté), each
   a card with what it wears; the card opens that zone's slots in the
   inspector. The order of the prompt is the slots' order, never a pair of
   arrows. */
import { Segmented } from '../../../chrome/Segmented'
import { draftText } from './outfitText'
import { pieceFragment, pieceName, pieceProblem, type Garments } from './outfitPieces'
import {
  proposeSlot, slotOf, slotsOfZone, sortPieces, ZONES, type ZoneKey,
} from './outfitSlots'
import { anchorOf, FIGURE_W, Silhouette, type Figure, type ZoneState } from './Silhouette'
import { DRAG_TYPE, UnplacedTray } from './UnplacedTray'
import type { OutfitDraft } from './useOutfitDraft'
import type { LibraryPick } from '../assets/libraryPicks'
import type { OutfitEntry } from './useOutfits'

const LAYER: Record<string, { label: string; hint: string }> = {
  monde: {
    label: 'Du monde',
    hint: "Livrée par le monde : tous ses personnages l'ont. L'ajuster ici ne change rien pour eux.",
  },
  surcharge: {
    label: 'Ajustée ici',
    hint: "Du monde, ajustée pour ce personnage. Le monde fournit toujours ce qui n'a pas été ajusté.",
  },
  personnage: {
    label: 'Propre au personnage',
    hint: 'Créée pour ce personnage : lui seul la voit.',
  },
}

const FIGURES: { value: Figure; label: string }[] = [
  { value: 'feminine', label: 'Féminine' },
  { value: 'masculine', label: 'Masculine' },
  { value: 'neutral', label: 'Neutre' },
]

/* The stage: two columns of 228 px cards around the 240 px body. */
const CARD_W = 228
const CARD_H = 88
const GAP = 24
const STAGE_W = CARD_W * 2 + GAP * 2 + FIGURE_W
const BODY_X = CARD_W + GAP
const PLACES: Record<ZoneKey, { side: 'left' | 'right'; top: number }> = {
  head: { side: 'left', top: 0 },
  neck: { side: 'left', top: 104 },
  arms: { side: 'left', top: 214 },
  feet: { side: 'left', top: 432 },
  torso: { side: 'right', top: 96 },
  legs: { side: 'right', top: 250 },
  carried: { side: 'right', top: 404 },
}

type ZoneView = ZoneState & { key: ZoneKey; label: string; filled: number; total: number; names: string[] }

export function OutfitSheet({
  outfit, draft, garments, byKey, busy, worldLabel, figure,
  onFigure, onZone, onSubmit, onDelete,
}: {
  /** `null` = a new outfit, not yet written anywhere. */
  outfit: OutfitEntry | null
  draft: OutfitDraft
  garments: LibraryPick[]
  byKey: Garments
  busy: boolean
  /** The character's world, `null` when it has none. */
  worldLabel: string | null
  figure: Figure
  onFigure: (figure: Figure) => void
  /** A zone chosen on the body or its card. */
  onZone: (zone: ZoneKey) => void
  onSubmit: () => void
  onDelete: () => void
}) {
  const { pieces } = draft
  const isNew = outfit === null
  const layer = LAYER[outfit?.couche ?? 'personnage'] ?? LAYER.personnage
  const title = draft.label.trim() || (isNew ? 'Nouvelle tenue' : outfit.label || outfit.key)

  /* The sentence, in the order it will be saved and sent. */
  const sorted = sortPieces(pieces)
  const preview = draftText(sorted, garments)
  const hot = (slot: string | null | undefined) =>
    draft.openSlot ? slot === draft.openSlot : slotOf(slot)?.zone === draft.zone
  const segments = sorted
    .map((piece) => ({ text: pieceFragment(piece, byKey), hot: hot(piece.slot) }))
    .filter((segment) => segment.text)

  const zones: ZoneView[] = ZONES.map(({ key, label }) => {
    const slots = slotsOfZone(key)
    const here = pieces.filter((p) => slotOf(p.slot)?.zone === key)
    return {
      key, label, total: slots.length,
      filled: slots.filter((slot) => pieces.some((p) => p.slot === slot.key)).length,
      names: here.map((p) => pieceName(p, byKey)),
      worn: here.length > 0,
      active: draft.zone === key,
      warn: here.some((p) => pieceProblem(p, byKey)),
    }
  })
  const states = Object.fromEntries(zones.map((z) => [z.key, z])) as unknown as Record<ZoneKey, ZoneState>

  const unplaced = pieces
    .map((piece, index) => ({ piece, index }))
    .filter(({ piece }) => !slotOf(piece.slot))
    .map(({ piece, index }) => ({
      index, name: pieceName(piece, byKey), proposal: proposeSlot(pieceFragment(piece, byKey))?.slot ?? null,
    }))

  /* A piece dropped on a zone takes its proposed slot when that slot is in
     the zone, else the zone's first slot. */
  const dropOn = (zone: ZoneKey, index: number) => {
    const proposal = unplaced.find((item) => item.index === index)?.proposal
    const slot = slotOf(proposal)?.zone === zone ? proposal! : slotsOfZone(zone)[0].key
    draft.place(index, slot)
  }

  const card = (zone: ZoneView) => (
    <ZoneCard key={zone.key} zone={zone}
              onPick={() => onZone(zone.key)}
              onMove={(delta) => {
                const next = ZONES[(ZONES.findIndex((z) => z.key === zone.key) + delta + ZONES.length) % ZONES.length].key
                onZone(next)
                document.querySelector<HTMLElement>(`[data-outfit-zone="${next}"]`)?.focus()
              }}
              onDrop={(index) => dropOn(zone.key, index)} />
  )

  return (
    <div className="flex h-full min-h-0 flex-col" id="outfitInspector">
      <div className="flex h-[48px] flex-none items-center gap-[10px] border-b border-b-line px-[16px]">
        <h2 className="m-0 min-w-0 truncate text-[15px] font-[650]" id="outfitSheetTitle">{title}</h2>
        {!isNew && (
          <span className="flex-none rounded-pill border border-line px-[7px] py-[1px] text-[11px] text-dim2"
                data-outfit-layer data-hint-text={layer.hint} tabIndex={0}>
            {layer.label}
          </span>
        )}
        {draft.dirty && <span className="flex-none text-[12px] text-warn-txt">modifiée, non enregistrée</span>}
        <span className="flex-1" />
        <Segmented id="outfitFigure" label="Silhouette" options={FIGURES} value={figure} onPick={onFigure} />
        {!isNew && (
          <button type="button" className="btn sm flex-none" id="btnOutfitDelete" disabled={busy} onClick={onDelete}>
            {outfit.couche === 'surcharge' ? 'Rendre au monde' : 'Retirer'}
          </button>
        )}
        <button
          type="button"
          className="btn primary sm flex-none"
          id="btnOutfitSave"
          disabled={busy || !draft.dirty || !draft.label.trim() || Boolean(preview.problem)}
          data-hint-text={preview.problem || undefined}
          onClick={onSubmit}
        >
          {isNew ? 'Créer la tenue' : 'Enregistrer'}
        </button>
      </div>

      <div className={`flex flex-none flex-col gap-[6px] border-b px-[16px] py-[12px] ${
        preview.problem ? 'border-b-warn-line bg-warn-bg' : 'border-b-line bg-panel2'}`}>
        <div className="flex items-baseline gap-[8px]">
          <span className="lab flex-none">Ce que la scène reçoit</span>
          <span className="tiny">dans l'ordre des emplacements</span>
        </div>
        {preview.problem ? (
          <p className="m-0 text-[13px] text-warn-txt" id="outfitText" role="status">{preview.problem}</p>
        ) : (
          <p className="m-0 font-code text-[13px]" id="outfitText" aria-live="polite">
            wearing {segments.map((segment, n) => (
              <span key={n}>
                {n > 0 && ', '}
                {segment.hot ? (
                  /* No padding: it would put a space before the comma. */
                  <mark className="rounded-[2px] bg-acc/20 text-inherit shadow-[0_0_0_2px_color-mix(in_oklab,var(--acc)_20%,transparent)]">
                    {segment.text}
                  </mark>
                ) : segment.text}
              </span>
            ))}
          </p>
        )}
      </div>

      <div className="@container min-h-0 flex-1 overflow-y-auto p-[16px]">
        <div className="mb-[14px] flex max-w-[320px] flex-col gap-[4px]">
          <label className="lab" htmlFor="outfitLabel">Libellé</label>
          <input id="outfitLabel" className="w-full text-[13px]" value={draft.label} placeholder="Tenue de ville"
                 disabled={busy} onChange={(event) => draft.setLabel(event.target.value)} />
        </div>

        {unplaced.length > 0 && (
          <div className="mb-[14px]">
            <UnplacedTray items={unplaced} busy={busy} onPlace={draft.place}
                          onArrange={() => draft.arrange((piece) => pieceFragment(piece, byKey))} />
          </div>
        )}

        {/* The stage: cards on each side of the body, tied by a 1 px rule. */}
        <div className="relative mx-auto @max-[744px]:hidden" style={{ width: STAGE_W, height: 520 }}>
          <svg className="pointer-events-none absolute inset-0" width={STAGE_W} height={520} aria-hidden="true">
            {zones.map((zone) => {
              const place = PLACES[zone.key]
              const anchor = anchorOf(zone.key, figure)
              return (
                <line key={zone.key}
                      x1={place.side === 'left' ? CARD_W : STAGE_W - CARD_W} y1={place.top + CARD_H / 2}
                      x2={BODY_X + anchor.x} y2={anchor.y}
                      className={zone.active ? 'stroke-acc' : 'stroke-line2'} strokeWidth={1} />
              )
            })}
          </svg>
          <div className="absolute top-0" style={{ left: BODY_X }}>
            <Silhouette figure={figure} states={states} onZone={onZone} />
          </div>
          {zones.map((zone) => (
            <div key={zone.key} className="absolute" style={{
              top: PLACES[zone.key].top, width: CARD_W,
              ...(PLACES[zone.key].side === 'left' ? { left: 0 } : { right: 0 }),
            }}>
              {card(zone)}
            </div>
          ))}
        </div>

        {/* Too narrow for the stage: a smaller body next to the cards as a list. */}
        <div className="hidden gap-[16px] @max-[744px]:flex">
          <Silhouette figure={figure} states={states} onZone={onZone} width={120} />
          <div className="flex min-w-0 flex-1 flex-col gap-[8px]">{zones.map(card)}</div>
        </div>

        {(isNew ? worldLabel !== null : outfit.couche !== 'personnage') && (
          <label className="mt-[16px] flex items-center gap-[6px] text-[12px]" htmlFor="outfitToWorld">
            <input id="outfitToWorld" type="checkbox" className="w-auto" checked={draft.toWorld} disabled={busy}
                   onChange={(event) => draft.setToWorld(event.target.checked)} />
            {isNew
              ? `Créer dans le monde ${worldLabel}, pour tous ses personnages`
              : 'Corriger dans le monde, pour tous ses personnages'}
          </label>
        )}
      </div>
    </div>
  )
}

function ZoneCard({
  zone, onPick, onMove, onDrop,
}: {
  zone: ZoneView
  onPick: () => void
  onMove: (delta: number) => void
  onDrop: (index: number) => void
}) {
  return (
    <button
      type="button"
      data-outfit-zone={zone.key}
      aria-pressed={zone.active}
      aria-label={`${zone.label}, ${zone.filled} emplacement${zone.filled > 1 ? 's' : ''} sur ${zone.total} rempli${zone.filled > 1 ? 's' : ''}${zone.warn ? ', une pièce en défaut' : ''}`}
      className={`flex w-full flex-col gap-[3px] rounded-card px-[10px] py-[8px] text-left ${
        zone.active ? 'border-2 border-acc' : zone.worn ? 'border border-line2' : 'border border-dashed border-line2'} ${
        zone.warn ? 'bg-warn-bg' : 'bg-panel'}`}
      style={{ minHeight: CARD_H }}
      onClick={onPick}
      onKeyDown={(event) => {
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
          event.preventDefault()
          onMove(event.key === 'ArrowDown' ? 1 : -1)
        }
      }}
      onDragOver={(event) => {
        if (event.dataTransfer.types.includes(DRAG_TYPE)) event.preventDefault()
      }}
      onDrop={(event) => {
        const index = Number(event.dataTransfer.getData(DRAG_TYPE))
        if (Number.isInteger(index)) onDrop(index)
      }}
    >
      <span className="flex items-baseline gap-[6px]">
        <span className="lab flex-1">{zone.label}</span>
        {zone.active && <span className="text-[11px] text-acc">actif</span>}
        <span className="font-code text-[11px] text-dim2">{zone.filled} / {zone.total}</span>
      </span>
      <span className={`line-clamp-2 text-[12px] ${zone.warn ? 'text-warn-txt' : zone.worn ? 'text-txt' : 'text-dim2'}`}>
        {zone.worn ? zone.names.join(', ') : 'vide'}
      </span>
    </button>
  )
}

