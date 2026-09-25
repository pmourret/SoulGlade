/* The render trial of a tone (IT-10, 25/09): one scene at one seed, without
   and with the tone — the only callers of `/api/tones/essai*`.

   It runs as a batch on the server's single run state, so the chrome's batch
   panel shows it like a production. This hook only starts it, polls ITS state
   while it runs, and hands back the image URLs, which name an image by its
   label: paths never leave the server. */
import { useCallback, useEffect, useRef, useState } from 'react'

import { errorOf, type Schema } from '../../api/client'
import { useApi } from '../../api/useApi'

export type ToneTrial = Schema<'ToneTrialState'>
type TrialResponse = Schema<'ToneTrialResponse'>

const POLL_MS = 2500

export function useToneTrial() {
  const api = useApi()
  const [trial, setTrial] = useState<ToneTrial | null>(null)
  const [error, setError] = useState<string | null>(null)
  const timer = useRef<number | null>(null)

  const refresh = useCallback(async () => {
    try {
      const response = await api.get<TrialResponse>('/api/tones/essai')
      setTrial(response?.essai ?? null)
      return response?.essai ?? null
    } catch {
      return null
    }
  }, [api])

  useEffect(() => {
    void refresh()
  }, [refresh])

  /* Poll only while the trial runs: two images take a couple of minutes, and
     an idle workshop should not keep asking. */
  useEffect(() => {
    if (!trial?.running) return
    timer.current = window.setInterval(() => void refresh(), POLL_MS)
    return () => {
      if (timer.current) window.clearInterval(timer.current)
    }
  }, [trial?.running, refresh])

  const start = useCallback(
    async (scene: string, tone: string, seed: number | null) => {
      setError(null)
      let response: { ok?: boolean; erreur?: string } | null = null
      try {
        response = await api.post('/api/tones/essai', { scene, tone, seed })
      } catch {
        response = null
      }
      const failure = response ? errorOf(response) : 'serveur injoignable'
      if (failure) {
        setError(failure)
        return
      }
      await refresh()
    },
    [api, refresh],
  )

  /* The trial's id busts the browser cache: two trials write the same label. */
  const imageUrl = (label: string) =>
    api.url(`/api/tones/essai/image/${encodeURIComponent(label)}?v=${encodeURIComponent(trial?.id ?? '')}`)

  return { trial, error, start, imageUrl }
}
