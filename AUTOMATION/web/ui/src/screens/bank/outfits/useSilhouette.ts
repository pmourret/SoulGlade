/* Which body the outfit workshop draws (design-pass tenues, S5): what the
   character's sheet declares (`gender`, cadrage 2026-09-27), Neutre when it
   says nothing, then the user's own pick, kept PER CHARACTER in this browser.
   Purely visual: no backend, and it changes neither the slots, nor what is
   proposed, nor the prompt. Storage can be missing or throw (private window,
   blocked site data): the workshop then just falls back on the sheet. */
import { useState } from 'react'

import { useCharacter } from '../../../character/CharacterContext'
import type { Figure } from './Silhouette'

const FIGURES: Figure[] = ['feminine', 'masculine', 'neutral']
const keyOf = (id: string) => `studio.outfit-silhouette.${id}`

function stored(id: string): Figure | null {
  try {
    const value = window.localStorage.getItem(keyOf(id))
    return FIGURES.includes(value as Figure) ? (value as Figure) : null
  } catch {
    return null
  }
}

export function useSilhouette(): [Figure, (figure: Figure) => void] {
  const { claimed, sheet } = useCharacter()
  const id = claimed ?? ''
  const [picked, setPicked] = useState<{ id: string; figure: Figure } | null>(null)
  const declared: Figure = sheet?.gender === 'feminine' || sheet?.gender === 'masculine' ? sheet.gender : 'neutral'
  const figure = (picked?.id === id ? picked.figure : null) ?? (id ? stored(id) : null) ?? declared
  const choose = (next: Figure) => {
    setPicked({ id, figure: next })
    try {
      if (id) window.localStorage.setItem(keyOf(id), next)
    } catch {
      /* not kept across reloads, still applied now */
    }
  }
  return [figure, choose]
}
