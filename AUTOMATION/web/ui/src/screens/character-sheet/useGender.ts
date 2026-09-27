/* The character's declared gender, written from its sheet
   (`DOCS/cadrage/2026-09-27-genre-du-personnage.md`). One route, bound to the
   current character by `useApi`; the sheet is re-read afterwards rather than
   patched — what the character says is the server's to tell. */
import { useCallback, useState } from 'react'

import { errorOf, type Schema } from '../../api/client'
import { useApi } from '../../api/useApi'
import { useCharacter } from '../../character/CharacterContext'

export type Gender = NonNullable<Schema<'GenderRequest'>['gender']>

export function useGender() {
  const api = useApi()
  const { refreshSheet } = useCharacter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const save = useCallback(
    async (gender: Gender | null) => {
      setBusy(true)
      setError(null)
      try {
        const response = await api.post('/api/character/gender', { gender })
        const failure = errorOf(response)
        if (failure) setError(failure)
        else refreshSheet()
      } catch {
        setError('serveur injoignable')
      } finally {
        setBusy(false)
      }
    },
    [api, refreshSheet],
  )

  return { save, busy, error }
}
