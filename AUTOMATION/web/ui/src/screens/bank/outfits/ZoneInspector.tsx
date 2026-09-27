/* The slots of one body zone (design-pass tenues, S4) — presentational: it
   receives the draft's pieces and the gestures that change them.

   One line per slot, in the order of the prompt, its number shown: the order
   IS the prompt's, so it is said. One line open at a time; open, it shows
   what is worn, the garments whose words propose this slot, the others, and a
   field to write a piece. Posing on a « one piece » slot replaces; the
   replacement says so and can be undone. */
import { useState } from 'react'
import { Link } from 'react-router-dom'

import type { Enhancer } from '../../../api/useEnhance'
import { PATHS } from '../../../app/routes'
import { EnhanceTrigger } from '../../../chrome/EnhanceTrigger'
import { RevisionView } from '../../../chrome/RevisionView'
import { useEnhance } from '../../../chrome/useEnhance'
import type { LibraryPick } from '../assets/libraryPicks'
import { pieceFragment, pieceName, pieceProblem, type Garments } from './outfitPieces'
import { proposeSlot, slotNumber, slotsOfZone, zoneLabel, type Slot, type ZoneKey } from './outfitSlots'
import type { Replaced } from './useOutfitDraft'
import type { OutfitPiece } from './useOutfits'

/* What an underwear or a covered slot is worn under. */
const UNDER: Record<string, string[]> = {
  under_top: ['top', 'onepiece', 'outer'],
  under_bottom: ['bottom', 'onepiece'],
}

export function ZoneInspector({
  zone, pieces, garments, byKey, openSlot, busy, enhancer, replaced,
  onOpenSlot, onPose, onRemove, onEditText, onUndo,
}: {
  zone: ZoneKey
  pieces: OutfitPiece[]
  garments: LibraryPick[]
  byKey: Garments
  openSlot: string | null
  busy: boolean
  enhancer: Enhancer
  replaced: Replaced | null
  onOpenSlot: (slot: string | null) => void
  onPose: (slot: string, piece: { asset?: string; text?: string }) => void
  onRemove: (index: number) => void
  onEditText: (index: number, text: string) => void
  onUndo: () => void
}) {
  const slots = slotsOfZone(zone)
  const worn = (key: string) => pieces.map((p, i) => ({ p, i })).filter(({ p }) => p.slot === key)
  const filled = slots.filter((slot) => worn(slot.key).length).length
  const onepiece = worn('onepiece')[0]

  return (
    <section className="flex h-full min-h-0 flex-col" aria-label={`Zone ${zoneLabel(zone)}`} id="outfitZone">
      <div className="flex h-[48px] flex-none items-center gap-[10px] border-b border-b-line px-[16px]">
        <h2 className="m-0 text-[14px] font-[650]">{zoneLabel(zone)}</h2>
        <span className="tiny">{filled} / {slots.length} emplacement{slots.length > 1 ? 's' : ''}</span>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-[8px] overflow-y-auto p-[12px]">
        {slots.map((slot) => {
          const here = worn(slot.key)
          const open = openSlot === slot.key
          const covered = (slot.key === 'top' || slot.key === 'bottom') && onepiece && !here.length
            ? pieceName(onepiece.p, byKey) : null
          const warn = here.some(({ p }) => pieceProblem(p, byKey))
          const bodyId = `outfitSlotBody-${slot.key}`
          return (
            <div
              key={slot.key}
              data-outfit-slot={slot.key}
              className={`rounded-card border ${open ? 'border-2 border-acc' : warn ? 'border-warn-line' : 'border-line'} ${
                warn ? 'bg-warn-bg' : 'bg-panel'}`}
            >
              <button
                type="button"
                data-slot-toggle
                aria-expanded={open}
                aria-controls={bodyId}
                className="flex w-full items-center gap-[8px] border-0 bg-transparent px-[10px] py-[8px] text-left"
                onClick={() => onOpenSlot(open ? null : slot.key)}
              >
                <span className="w-[18px] flex-none font-code text-[11px] text-dim2">{slotNumber(slot.key)}</span>
                <span className="lab w-[88px] flex-none">{slot.label}</span>
                <span className={`min-w-0 flex-1 truncate text-[12px] ${here.length ? 'text-txt' : 'text-dim2'}`}>
                  {here.length ? here.map(({ p }) => pieceName(p, byKey)).join(', ')
                    : covered ? `couvert par « ${covered} »` : 'vide'}
                </span>
                <span aria-hidden="true" className="flex-none text-[11px] text-dim2">{open ? '▴' : '▾'}</span>
              </button>
              {open && (
                <SlotBody
                  id={bodyId}
                  slot={slot}
                  here={here}
                  pieces={pieces}
                  garments={garments}
                  byKey={byKey}
                  busy={busy}
                  enhancer={enhancer}
                  replaced={replaced?.slot === slot.key ? replaced : null}
                  onPose={(piece) => onPose(slot.key, piece)}
                  onRemove={onRemove}
                  onEditText={onEditText}
                  onUndo={onUndo}
                />
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}

function SlotBody({
  id, slot, here, pieces, garments, byKey, busy, enhancer, replaced, onPose, onRemove, onEditText, onUndo,
}: {
  id: string
  slot: Slot
  here: { p: OutfitPiece; i: number }[]
  pieces: OutfitPiece[]
  garments: LibraryPick[]
  byKey: Garments
  busy: boolean
  enhancer: Enhancer
  replaced: Replaced | null
  onPose: (piece: { asset?: string; text?: string }) => void
  onRemove: (index: number) => void
  onEditText: (index: number, text: string) => void
  onUndo: () => void
}) {
  const [written, setWritten] = useState('')
  /* « Améliorer » in the head row of « Écrire une pièce », the proposal read
     in the field (design-pass screen-ameliorer): « Poser » waits for it. */
  const enhance = useEnhance({ label: 'pièce écrite', kind: 'outfit', value: written, onApply: setWritten, enhancer, disabled: busy })
  const revising = Boolean(enhance.revision)
  const proposed = garments
    .filter((g) => g.fragment.trim())
    .map((g) => ({ g, hit: proposeSlot(g.fragment) }))
    .filter(({ hit }) => hit?.slot === slot.key)
  const others = garments.filter((g) => !proposed.some(({ g: p }) => p.key === g.key))
  const over = (UNDER[slot.key] ?? [])
    .map((key) => pieces.find((p) => p.slot === key))
    .find(Boolean)
  const write = () => {
    if (!written.trim()) return
    onPose({ text: written.trim() })
    setWritten('')
  }

  return (
    <div id={id} className="flex flex-col gap-[10px] border-t border-t-line px-[10px] pt-[8px] pb-[10px]">
      <div className="flex flex-col gap-[5px]">
        <span className="lab">Porté</span>
        {here.length === 0 && <span className="text-[12px] text-dim2">rien pour l'instant</span>}
        <ol className="m-0 flex list-none flex-col gap-[5px] p-0" id="outfitPieces">
          {here.map(({ p, i }) => {
            const garment = p.asset ? byKey.get(p.asset) : undefined
            const problem = pieceProblem(p, byKey)
            return (
              <li key={`${p.asset ?? 't'}-${i}`} data-piece-kind={p.asset ? 'asset' : 'text'}
                  className="flex items-center gap-[8px] rounded-[6px] border border-line2 p-[4px]">
                {p.asset ? (
                  <>
                    {garment
                      ? <img className="h-[36px] w-[36px] flex-none rounded-[4px] object-cover" src={garment.src} alt="" />
                      : <span className="h-[36px] w-[36px] flex-none rounded-[4px] border border-dashed border-warn-line" />}
                    <span className="min-w-0 flex-1 text-[12px]">
                      <b className="block truncate font-medium">{pieceName(p, byKey)}</b>
                      <span className={`block truncate ${problem ? 'text-warn-txt' : 'font-code text-dim'}`}>
                        {problem ?? pieceFragment(p, byKey)}
                      </span>
                    </span>
                  </>
                ) : (
                  <>
                    <span className="flex-none px-[4px] text-[11px] text-dim2">écrite</span>
                    <label className="sr-only" htmlFor={`outfitPiece-${i}`}>pièce écrite, {slot.label}</label>
                    <input id={`outfitPiece-${i}`} className="min-w-0 flex-1 font-code text-[12px]" value={p.text ?? ''}
                           disabled={busy} onChange={(event) => onEditText(i, event.target.value)} />
                  </>
                )}
                <button type="button" className="flex-none border-0 bg-transparent px-[6px] text-[14px] text-dim hover:text-txt"
                        aria-label={`Retirer « ${pieceName(p, byKey)} »`} disabled={busy} onClick={() => onRemove(i)}>
                  ×
                </button>
              </li>
            )
          })}
        </ol>
        {slot.many && here.length > 0 && (
          <button type="button" className="btn sm self-start" disabled={busy}
                  onClick={() => document.getElementById('outfitWritten')?.focus()}>
            + Ajouter
          </button>
        )}
        {replaced && (
          <p className="m-0 text-[12px] text-dim" role="status">
            « {replaced.before} » remplacé par « {replaced.after} » ·{' '}
            <button type="button" className="link border-0 bg-transparent p-0 text-[12px]" onClick={onUndo}>
              Annuler
            </button>
            <span className="tiny"> (Ctrl Z)</span>
          </p>
        )}
        {over && here.length > 0 && (
          <p className="m-0 text-[12px] text-dim">
            Porté sous « {pieceName(over, byKey)} » : il vient après lui dans le prompt.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-[8px]" id="outfitGarments">
        {garments.length === 0 ? (
          <p className="m-0 text-[12px] text-dim">
            Aucun vêtement dans les Assets.{' '}
            <Link className="link" to={PATHS.bankAssets}>En importer un</Link> ; ou écrire la pièce ci-dessous.
          </p>
        ) : (
          <>
            <div className="flex flex-col gap-[5px]">
              <span className="lab">Proposés pour {slot.label}</span>
              {proposed.length ? (
                <div className="grid grid-cols-3 gap-[6px]">
                  {proposed.map(({ g, hit }) => (
                    <GarmentTile key={g.key} garment={g} word={hit?.word} slotLabel={slot.label} busy={busy}
                                 onPose={() => onPose({ asset: g.key })} />
                  ))}
                </div>
              ) : (
                <span className="text-[12px] text-dim2">aucun vêtement dont les mots proposent cet emplacement</span>
              )}
            </div>
            {others.length > 0 && (
              <details className="flex flex-col gap-[5px]">
                <summary className="cursor-pointer text-[12px] text-dim">Autres vêtements · {others.length}</summary>
                <div className="mt-[6px] grid grid-cols-4 gap-[5px]">
                  {others.map((g) => (
                    <GarmentTile key={g.key} garment={g} slotLabel={slot.label} busy={busy}
                                 onPose={() => onPose({ asset: g.key })} />
                  ))}
                </div>
              </details>
            )}
          </>
        )}
      </div>

      <div className="flex flex-col gap-[5px]" data-enhance ref={enhance.rootRef}>
        <div className="flex min-h-[24px] flex-wrap items-center gap-[6px]">
          <label className="lab" htmlFor="outfitWritten">Écrire une pièce</label>
          <EnhanceTrigger enhance={enhance} />
        </div>
        <div className="flex items-start gap-[6px]">
          <RevisionView enhance={enhance} className="min-w-0 flex-1">
            <input
              id="outfitWritten"
              className="font-code text-[12px]"
              placeholder="light blue denim jeans"
              value={written}
              disabled={busy}
              onChange={(event) => setWritten(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  write()
                }
              }}
            />
          </RevisionView>
          <button type="button" className="btn sm" disabled={busy || revising || !written.trim()} onClick={write}>
            Poser
          </button>
        </div>
      </div>
    </div>
  )
}

function GarmentTile({
  garment, word, slotLabel, busy, onPose,
}: {
  garment: LibraryPick
  word?: string
  slotLabel: string
  busy: boolean
  onPose: () => void
}) {
  if (!garment.fragment.trim())
    return (
      <div className="flex flex-col gap-[3px] rounded-[6px] border border-dashed border-line2 p-[4px] opacity-70"
           data-garment={garment.key}>
        <img className="aspect-square w-full rounded-[4px] object-cover" src={garment.src} alt="" />
        <span className="line-clamp-2 text-[11px] leading-tight text-dim">{garment.label}</span>
        <span className="text-[11px] leading-tight text-warn-txt">
          sans fragment : <Link className="link" to={PATHS.bankAssets}>l'analyser dans Assets</Link>
        </span>
      </div>
    )
  return (
    <button
      type="button"
      className="flex cursor-pointer flex-col gap-[3px] rounded-[6px] border border-line2 bg-transparent p-[4px]
                 text-left hover:border-dim2 disabled:cursor-not-allowed disabled:opacity-60"
      data-garment={garment.key}
      disabled={busy}
      aria-label={`Poser « ${garment.label} » sur ${slotLabel}`}
      onClick={onPose}
    >
      <img className="aspect-square w-full rounded-[4px] object-cover" src={garment.src} alt="" />
      <span className="line-clamp-2 text-[11px] leading-tight text-dim">{garment.label}</span>
      {word && <span className="font-code text-[11px] leading-tight text-dim2">{word}</span>}
    </button>
  )
}
