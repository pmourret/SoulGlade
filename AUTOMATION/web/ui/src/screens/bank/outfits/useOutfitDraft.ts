/* The outfit being adjusted, shared by the sheet (silhouette, zones, the
   sentence) and the zone inspector (slots, garments) — design-pass tenues.
   It holds the draft and its gestures; nothing here calls the API, the save
   goes through `useOutfits` from the view.

   PIECES ARE KEPT IN THE ORDER THEY WERE POSED; the sentence and the save sort
   them by slot (`sortPieces`). An outfit composed before the slots has no
   slot at all, so it comes out in its original order: its render does not
   change until it is placed.

   ONE STEP OF HISTORY. Posing on a « one piece » slot replaces what was
   there; Ctrl Z (or « Annuler ») gives it back. */
import { useEffect, useState } from 'react'

import { proposeSlot, slotOf, ZONES, type ZoneKey } from './outfitSlots'
import type { OutfitEntry, OutfitPiece } from './useOutfits'

export type Replaced = { slot: string; before: string; after: string }

const samePieces = (a: OutfitPiece[], b: OutfitPiece[]) =>
  JSON.stringify(a.map((p) => [p.asset ?? '', (p.text ?? '').trim(), p.slot ?? ''])) ===
  JSON.stringify(b.map((p) => [p.asset ?? '', (p.text ?? '').trim(), p.slot ?? '']))

/** The zone a sheet opens on: the first that wears a piece, otherwise the
    torso. */
export function firstZone(pieces: OutfitPiece[]): ZoneKey {
  const worn = new Set(pieces.map((p) => slotOf(p.slot)?.zone).filter(Boolean))
  return ZONES.find((zone) => worn.has(zone.key))?.key ?? 'torso'
}

export function useOutfitDraft(outfit: OutfitEntry | null, nameOf: (piece: OutfitPiece) => string) {
  const [label, setLabel] = useState(outfit?.label ?? '')
  const [pieces, setPiecesRaw] = useState<OutfitPiece[]>(outfit?.pieces ?? [])
  const [past, setPast] = useState<OutfitPiece[] | null>(null)
  const [replaced, setReplaced] = useState<Replaced | null>(null)
  /* On a world outfit: correct the world rather than adjust it here. On a new
     outfit: create it in the world. OFF by default both ways. */
  const [toWorld, setToWorld] = useState(false)
  const [zone, setZone] = useState<ZoneKey>(firstZone(outfit?.pieces ?? []))
  const [openSlot, setOpenSlot] = useState<string | null>(null)

  // A new selection must not carry the previous outfit's draft.
  const origin = JSON.stringify([outfit?.key, outfit?.label, outfit?.pieces])
  useEffect(() => {
    setLabel(outfit?.label ?? '')
    setPiecesRaw(outfit?.pieces ?? [])
    setPast(null)
    setReplaced(null)
    setToWorld(false)
    setZone(firstZone(outfit?.pieces ?? []))
    setOpenSlot(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [origin])

  const isNew = outfit === null
  const dirty = isNew
    ? Boolean(label.trim() || pieces.length)
    : label.trim() !== (outfit.label ?? '') || !samePieces(pieces, outfit.pieces ?? [])

  /** Every change of the pieces keeps the step before it. */
  const change = (next: OutfitPiece[], notice: Replaced | null = null) => {
    setPast(pieces)
    setReplaced(notice)
    setPiecesRaw(next)
  }

  /** Poses a piece on a slot: a « one piece » slot is replaced, a « several »
      slot takes one more. */
  const pose = (slot: string, piece: { asset?: string; text?: string }) => {
    const def = slotOf(slot)
    const placed: OutfitPiece = { ...piece, slot }
    if (def?.many) return change([...pieces, placed])
    const index = pieces.findIndex((p) => p.slot === slot)
    if (index < 0) return change([...pieces, placed])
    const next = pieces.filter((p, i) => p.slot !== slot || i === index)
    next[next.indexOf(pieces[index])] = placed
    change(next, { slot, before: nameOf(pieces[index]), after: nameOf(placed) })
  }

  const remove = (index: number) => change(pieces.filter((_, i) => i !== index))
  const editText = (index: number, text: string) =>
    setPiecesRaw(pieces.map((p, i) => (i === index ? { ...p, text } : p)))

  /** A piece without a slot put on one (a drop, Enter, the menu). */
  const place = (index: number, slot: string) =>
    change(pieces.map((p, i) => (i === index ? { ...p, slot } : p)))

  /** « Ranger d'après les fragments »: every piece whose words propose a slot
      takes it; a piece with no word it knows stays where it is. */
  const arrange = (fragmentOf: (piece: OutfitPiece) => string) =>
    change(pieces.map((p) => (p.slot ? p : { ...p, slot: proposeSlot(fragmentOf(p))?.slot ?? undefined })))

  const undo = () => {
    if (!past) return
    setPiecesRaw(past)
    setPast(null)
    setReplaced(null)
  }

  const chooseZone = (key: ZoneKey) => {
    setZone(key)
    setOpenSlot((current) => (current && slotOf(current)?.zone === key ? current : null))
  }

  return {
    label, setLabel, pieces, dirty, isNew, toWorld, setToWorld,
    zone, chooseZone, openSlot, setOpenSlot,
    pose, remove, editText, place, arrange, undo, canUndo: past !== null, replaced,
  }
}

export type OutfitDraft = ReturnType<typeof useOutfitDraft>
