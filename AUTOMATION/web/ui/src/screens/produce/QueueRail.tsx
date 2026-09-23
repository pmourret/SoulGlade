/* The batch-finished acknowledgment, and nothing else.

   IT RENDERS NOTHING. What is left is one effect: the instant a batch stops
   running, a toast says what came out of it and offers the way to sort it.
   The studio's own way of ACKNOWLEDGING something just happened, never its
   way of reporting it forever (chrome/ToastContext.tsx's own contract) — the
   header's status line already carries « production N/M · ~T » while a batch
   runs, and survives scrolling.

   THE TECHNICAL LOG LEFT THIS SCREEN (design-pass screen-3b, §S6). It was a
   folded `<details>` sitting permanently above the launch bar of a working
   screen, for a trail one consults after the fact — and the Journal module
   (Application → Journal) already exists to read it, with a search and the
   whole history rather than the last forty lines. One place, not two.

   A component that renders null and only runs an effect is deliberate: this
   is a SIDE EFFECT of being on Produire, not a piece of its layout, and
   folding it into ProduceScreen would put a batch-watching ref in the middle
   of a composition file. */
import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

import { useToast } from '../../chrome/ToastContext'
import type { SystemState } from '../../state/SystemStateContext'
import { PATHS, screenForImage } from '../../app/routes'

const VERDICT_LABEL: Record<string, string> = {
  OK: 'validées',
  A_REVOIR: 'à revoir',
  REJET: 'rejetées',
  SANS_VISAGE: 'sans visage',
  ERREUR: 'en erreur',
}

type Recent = { bucket: string; name: string; scene?: string; space?: string; score?: number }

export function QueueRail({ state }: { state: SystemState | null }) {
  const navigate = useNavigate()
  const toast = useToast()
  const wasRunning = useRef(false)
  const lastAcked = useRef<string | null>(null)

  /* CAPTURED at the exact instant `running` flips false: `state.stats`/
     `state.recent` describe whichever batch is CURRENT on the server, so
     waiting to read them later — once a new batch has started — would
     already be reading the wrong one. */
  useEffect(() => {
    if (!state) return
    const justFinished = wasRunning.current && !state.running
    wasRunning.current = Boolean(state.running)
    if (!justFinished || !state.batch_id || state.batch_id === lastAcked.current) return
    lastAcked.current = state.batch_id

    const recent = (state.recent ?? []) as Recent[]
    const last = recent[recent.length - 1] ?? null
    const counted = Object.entries(state.stats ?? {})
      .filter(([, v]) => v)
      .map(([k, v]) => `${v} ${VERDICT_LABEL[k] ?? k.toLowerCase()}`)
      .join(' · ')
    const editing = Boolean(state.edition)
    toast(
      `lot terminé — ${counted || (state.total ? `${state.total} image${state.total > 1 ? 's' : ''}` : 'lot vide')}`,
      {
        label: editing ? 'ouvrir en NSFW' : 'trier les résultats',
        run: () => navigate(last ? screenForImage(last.bucket, last.name) : PATHS.review),
      },
    )
  }, [state, toast, navigate])

  return null
}
