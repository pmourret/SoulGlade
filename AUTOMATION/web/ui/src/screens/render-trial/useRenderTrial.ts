/* A render trial (IT-10, 25/09; generalised by the light studio, 7 bis): one
   scene at one seed, with and without what is tried. A trial has a KIND — a
   tone (`/api/tones/essai`) or a light (`/api/lights/essai`) — and its images;
   this hook is the only caller of either, and the kind is its route.

   It runs as a batch on the server's single run state, so the chrome's batch
   panel shows it like a production. This hook only starts it, polls ITS state
   while it runs, and hands back the image URLs, which name an image by its
   label: paths never leave the server. */
import { useCallback, useEffect, useRef, useState } from 'react'

import { errorOf, type Schema } from '../../api/client'
import { useApi } from '../../api/useApi'

export type RenderTrial = Schema<'TrialState'>
type TrialResponse = Schema<'TrialResponse'>

const POLL_MS = 2500

export function useRenderTrial(route: '/api/tones/essai' | '/api/lights/essai') {
  const api = useApi()
  const [trial, setTrial] = useState<RenderTrial | null>(null)
  const [error, setError] = useState<string | null>(null)
  const timer = useRef<number | null>(null)

  const refresh = useCallback(async () => {
    try {
      const response = await api.get<TrialResponse>(route)
      setTrial(response?.essai ?? null)
      return response?.essai ?? null
    } catch {
      return null
    }
  }, [api, route])

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

  /** `subject` is what is tried: `{tone}`, or `{key, setup, text}` of a light. */
  const start = useCallback(
    async (scene: string, seed: number | null, subject: object) => {
      setError(null)
      let response: { ok?: boolean; erreur?: string } | null = null
      try {
        response = await api.post(route, { scene, seed, ...subject })
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
    [api, refresh, route],
  )

  /* The trial's id busts the browser cache: two trials write the same label. */
  const imageUrl = (label: string) =>
    api.url(`${route}/image/${encodeURIComponent(label)}?v=${encodeURIComponent(trial?.id ?? '')}`)

  return { trial, error, start, imageUrl }
}
