/* Pure helpers of the outfit catalogue (IT-10 chantier 6) — no React, no API,
   read and tested on their own (frontend.md).

   THE SERVER RESOLVES, THIS ONLY PREVIEWS. A saved outfit's text is the
   server's `texte`; what is computed here is the text of a DRAFT in the
   inspector, before it is saved, with the same rule as `tenues.texte`:
   pieces joined by a comma, in order, an asset by its fragment. */
import type { LibraryPick } from '../assets/libraryPicks'
import type { OutfitEntry, OutfitPiece } from './useOutfits'

/** The text of a draft's pieces, or the reason it has none. */
export function draftText(
  pieces: OutfitPiece[],
  library: LibraryPick[],
): { text: string; problem: string } {
  const byKey = new Map(library.map((pick) => [pick.key, pick]))
  const parts: string[] = []
  for (const piece of pieces) {
    if (piece.asset) {
      const pick = byKey.get(piece.asset)
      if (!pick) return { text: '', problem: `asset inconnu : « ${piece.asset} »` }
      if (!pick.fragment.trim())
        return { text: '', problem: `« ${pick.label} » n'a pas de fragment — l'analyser dans Assets` }
      parts.push(pick.fragment.trim())
    } else if ((piece.text ?? '').trim()) {
      parts.push((piece.text ?? '').trim())
    }
  }
  return parts.length ? { text: parts.join(', '), problem: '' } : { text: '', problem: 'aucune pièce' }
}

/** A wardrobe line that wears an outfit: `@<key>`. */
export function isReference(line: string, marker: string): boolean {
  return line.trim().startsWith(marker)
}

export function referenceKey(line: string, marker: string): string {
  return line.trim().slice(marker.length).trim()
}

/** What a wardrobe line reads as on screen: the outfit's label and its
    resolved text for a reference, the line itself otherwise. A reference to
    an outfit that is gone says so — the save will refuse it anyway. */
export function lineView(
  line: string,
  outfits: OutfitEntry[],
  marker: string,
): { reference: boolean; label: string; text: string; problem: string } {
  if (!isReference(line, marker)) return { reference: false, label: line, text: line, problem: '' }
  const key = referenceKey(line, marker)
  const outfit = outfits.find((o) => o.key === key)
  if (!outfit) return { reference: true, label: key, text: '', problem: 'tenue introuvable' }
  return {
    reference: true,
    label: outfit.label || key,
    text: outfit.texte ?? '',
    problem: outfit.erreur ?? '',
  }
}

/** A garment piece clicked in the composer COMPLETES the outfit being
    written — it is never an outfit of its own. Two lines at one level are two
    outfits, one image each (`wardrobe_for`), and a piece per line gave an
    image in a sweater with no trousers and another in jeans with no top
    (measured 26/09, cadrage chantier 6). So the piece joins the LAST free
    line of the level, and starts one only when the level has none. */
export function addPiece(lines: string[], piece: string, marker: string): string[] {
  const next = [...lines]
  for (let i = next.length - 1; i >= 0; i -= 1) {
    if (!isReference(next[i], marker)) {
      next[i] = `${next[i].trim()}, ${piece}`
      return next
    }
  }
  return [...next, piece]
}
