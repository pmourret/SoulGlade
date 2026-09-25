/* The production journal of the claimed character, read ONCE for the whole
   Application screen: the nav shows its line count, the section its table.

   Loader moved as is from the former JournalScreen (design-pass screen-12). */
import { useCallback, useEffect, useState } from 'react'

import { errorOf, type Schema } from '../../api/client'
import { useApi } from '../../api/useApi'
import { useCharacter } from '../../character/CharacterContext'
import { useSystemState } from '../../state/SystemStateContext'

type JournalResponse = Schema<'JournalResponse'>

/* The backend models a row as a free dict ON PURPOSE — its docstring says so:
   rows are raw CSV records and the column set varies with journal migrations.
   This is therefore the narrow shape the SCREEN reads, declared where it is
   read, not a second copy of a contract the server refuses to freeze. Every
   field is optional because a row written before a migration may lack it. */
export type JournalRow = {
  date?: string
  scene?: string
  variante?: string
  format?: string
  seed?: string | number
  score_identite?: string | number
  verdict?: string
  duree_s?: number
}

export function useJournal() {
  const api = useApi()
  const { claimed } = useCharacter()
  const { finishedBatchId } = useSystemState()
  const [rows, setRows] = useState<JournalRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    let response: (JournalResponse & { ok?: boolean; erreur?: string }) | null = null
    try {
      response = await api.get<JournalResponse>('/api/journal')
    } catch {
      setError('serveur injoignable')
      setLoading(false)
      return
    }
    /* Malformed response: without this guard `rows.filter` throws below and the
       journal stays empty without a word. */
    const failure = errorOf(response) || (Array.isArray(response.rows) ? null : 'réponse illisible du serveur')
    setLoading(false)
    if (failure) {
      setError(failure)
      return
    }
    setError(null)
    setRows(response.rows as JournalRow[])
  }, [api])

  /* Reloads on entering the screen, on a character switch — the journal is a
     character's — and when a batch finishes, which is when new lines appear. */
  useEffect(() => {
    void load()
  }, [load, claimed, finishedBatchId])

  return { rows, error, loading, reload: load }
}
