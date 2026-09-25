/* The adult-content state of the claimed character, read ONCE for the whole
   Application screen: the nav shows « activé / désarmé » next to the entry and
   the section shows the switch. Two fetches would be two truths.

   Loader moved as is from AdultContentSection (design-pass screen-12). */
import { useCallback, useEffect, useState } from 'react'

import { errorOf, type Schema } from '../../api/client'
import { useApi } from '../../api/useApi'
import { useCharacter } from '../../character/CharacterContext'

export type NsfwState = Schema<'NsfwStateResponse'>

export function useNsfwState() {
  const api = useApi()
  const { claimed } = useCharacter()
  const [state, setState] = useState<NsfwState | null>(null)
  const [failed, setFailed] = useState(false)

  const load = useCallback(async () => {
    let response: (NsfwState & { ok?: boolean; erreur?: string }) | null = null
    try {
      response = await api.get<NsfwState>('/api/nsfw/state')
    } catch {
      setFailed(true)
      return
    }
    if (errorOf(response)) {
      setFailed(true)
      return
    }
    setFailed(false)
    setState(response)
  }, [api])

  // reloaded on entering the screen, and on a character switch: the state is
  // ONE character's, and switching no longer reloads the page
  useEffect(() => {
    void load()
  }, [load, claimed])

  return { state, failed, reload: load }
}
