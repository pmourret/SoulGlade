/* « Proposer… » — the scene composer's state and its one call (IT-11,
   chantier 6). What one wants to show is written in French (the BRIEF); the
   intention and the place are picked from the world's lists, never guessed
   from the brief. The local model only writes what happens: the décor joins
   the scene at launch.

   A proposal is REVIEWED, never written on its own: « Ajouter » hands it to
   the bench like « Depuis le monde » does, and the banner saves it. */
import { useState } from 'react'

import { errorOf, type Schema } from '../../api/client'
import { useApi } from '../../api/useApi'
import type { Scene } from '../../state/ScenesStoreContext'

type ComposeResponse = Schema<'ComposeResponse'>

/** A proposal: a scene plus the words the cleaner wants a second look at. */
export type Proposal = Scene & { alertes?: string[] }

export type ProposalRequest = { brief: string; intention: string; place: string; count: string }

export function useSceneProposals() {
  const api = useApi()
  const [request, setRequest] = useState<ProposalRequest>({ brief: '', intention: '', place: '', count: '3' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [proposals, setProposals] = useState<Proposal[] | null>(null)

  const propose = async () => {
    if (!request.brief.trim()) {
      setError("décris d'abord ce que tu veux montrer")
      return
    }
    setBusy(true)
    setError(null)
    const response = await api.post<ComposeResponse>('/api/compose', {
      brief: request.brief.trim(),
      intention: request.intention,
      place: request.place,
      count: Number.parseInt(request.count, 10) || 3,
    })
    setBusy(false)
    const failure = errorOf(response)
    if (failure) {
      setError(failure)
      return
    }
    setProposals((response.scenes ?? []) as Proposal[])
  }

  /** Takes one out of the list — added to the bench, or ignored. */
  const drop = (index: number) => setProposals((current) => (current ?? []).filter((_, i) => i !== index))

  return {
    request,
    patch: (p: Partial<ProposalRequest>) => setRequest((r) => ({ ...r, ...p })),
    busy,
    error,
    proposals,
    propose,
    drop,
  }
}
