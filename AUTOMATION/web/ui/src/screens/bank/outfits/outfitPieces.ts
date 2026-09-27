/* How a piece reads on screen — its name, its fragment, what is wrong with it
   (design-pass tenues). Shared by the sheet, the zone inspector and the
   placing tray, owned by none of them (frontend.md). Pure. */
import type { LibraryPick } from '../assets/libraryPicks'
import type { OutfitPiece } from './useOutfits'

export type Garments = Map<string, LibraryPick>

export const garmentsByKey = (garments: LibraryPick[]): Garments => new Map(garments.map((g) => [g.key, g]))

/** The label a person reads: the garment's, or the written words. */
export function pieceName(piece: OutfitPiece, byKey: Garments): string {
  if (piece.asset) return byKey.get(piece.asset)?.label ?? piece.asset
  return (piece.text ?? '').trim()
}

/** The words the prompt receives for this piece ('' when it has none). */
export function pieceFragment(piece: OutfitPiece, byKey: Garments): string {
  if (piece.asset) return (byKey.get(piece.asset)?.fragment ?? '').trim()
  return (piece.text ?? '').trim()
}

/** Why this piece cannot go to a render, or null. Same wording as
    `draftText`, which says it for the whole outfit. */
export function pieceProblem(piece: OutfitPiece, byKey: Garments): string | null {
  if (!piece.asset) return null
  const garment = byKey.get(piece.asset)
  if (!garment) return 'asset introuvable'
  return garment.fragment.trim() ? null : 'sans fragment : l\'analyser dans Assets'
}
