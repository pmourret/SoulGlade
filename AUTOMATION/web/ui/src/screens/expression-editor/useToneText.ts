/* A character's own text for one tone — label and prompt fragment — and the
   way back to its world's (IT-10, 25/09). The only caller of
   `/api/creative/tone*`; the card that shows the fragment receives these two
   callbacks (`frontend.md`: a sub-component never calls the API).

   The taxonomy is reloaded after each write: every screen that lists tones
   (Produire, the composer) reads the same `useTaxonomy`, so they follow
   without a page reload. */
import { useCallback } from 'react'

import { errorOf } from '../../api/client'
import { useApi } from '../../api/useApi'
import { useTaxonomy } from '../../state/TaxonomyContext'

export type ToneTextFields = { label?: string; prompt_add?: string }

export function useToneText() {
  const api = useApi()
  const { reload } = useTaxonomy()

  const post = useCallback(
    async (path: string, body: object): Promise<string | null> => {
      let response: { ok?: boolean; erreur?: string } | null = null
      try {
        response = await api.post(path, body)
      } catch {
        return 'serveur injoignable'
      }
      const failure = errorOf(response)
      if (!failure) await reload()
      return failure
    },
    [api, reload],
  )

  /** Returns the error to show, or null once written. */
  const adjust = useCallback(
    (key: string, fields: ToneTextFields) => post('/api/creative/tone', { key, ...fields }),
    [post],
  )
  const revert = useCallback((key: string) => post('/api/creative/tone/revert', { key }), [post])

  return { adjust, revert }
}
