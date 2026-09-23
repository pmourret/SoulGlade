/* Three consequential process actions — stop THIS dashboard, stop ComfyUI,
   restart ComfyUI — shared by the Application screen (`ApplicationScreen.tsx`),
   the header's power menu and the fault banner (`Header.tsx`, `FaultBar.tsx`).
   Same verb, same confirmation, same consequence, wherever the click comes
   from.

   `restartComfy` JOINED THEM on 23/09/2026: the fault banner gained a
   « Relancer ComfyUI » button (design-pass screen-0-chrome §S5), and the only
   copy of that gesture lived inside the Application screen as a local handler.
   A second copy in the banner would be a second confirmation to keep in step
   with the first — which is the exact reason this module exists.

   CONSEQUENTIAL ACTIONS, SO: confirmation every time, and the confirmation
   says what actually happens. For ComfyUI a stop is NEVER clean under
   Windows (no graceful shutdown signal, TerminateProcess cuts mid-job) —
   said before acting, not after. Ported verbatim from the Application
   screen's own `onAppStop`/`onComfyStop`, which now call this instead of
   carrying the logic themselves. */
import { useCallback, useState, type ReactNode } from 'react'

import { errorOf, type Schema } from '../api/client'
import { useApi } from '../api/useApi'
import { useComfyStats } from '../state/ComfyStatsContext'
import { useServerLog } from '../state/ServerLogContext'
import { useSystemState } from '../state/SystemStateContext'
import { useConfirm } from './ConfirmContext'
import { useToast } from './ToastContext'

type ActionResponse = Schema<'ActionResponse'>

export function useProcessControls() {
  const api = useApi()
  const confirm = useConfirm()
  const toast = useToast()
  const { append } = useServerLog()
  const { refresh: refreshProbes } = useComfyStats()
  const { state } = useSystemState()
  const running = Boolean(state?.running)
  /** Set only by `stopApp` — a stopped dashboard replaces the whole screen
      with this message, wherever the button that triggered it lives
      (`Takeover` portals to `document.body`, so it covers everything
      regardless of the caller). */
  const [takeover, setTakeover] = useState<ReactNode>(null)

  const post = useCallback(
    async (url: string): Promise<boolean> => {
      const response = await api.post<ActionResponse>(url)
      const failure = errorOf(response)
      if (failure) {
        toast(failure)
        return false
      }
      return true
    },
    [api, toast],
  )

  const stopApp = useCallback(async () => {
    const ok = await confirm({
      title: 'Arrêter le tableau de bord ?',
      button: 'Arrêter',
      body: (
        <p>
          Coupe le serveur web local. Cette page ne répondra plus tant qu'il
          n'est pas relancé à la main (<code>AUTOMATION/run_web.bat</code>).
          Une génération en cours serait interrompue.
        </p>
      ),
    })
    if (!ok) return
    // fire-and-forget: the server answers before exiting (web/api/routers/
    // app.py), but there is nothing useful to do with a failed response here
    // — the takeover is the same message either way.
    await api.post('/api/app/stop')
    setTakeover(
      <>
        Tableau de bord arrêté.
        <br />
        <span className="text-[13px]">
          Relance <code>run_web.bat</code> pour y revenir.
        </span>
      </>,
    )
  }, [api, confirm])

  const stopComfy = useCallback(async () => {
    const ok = await confirm({
      title: 'Arrêter ComfyUI ?',
      button: 'Arrêter ComfyUI',
      body: (
        <p>
          {running && (
            <b>
              Une génération est en cours sur ce tableau de bord — elle sera
              perdue.{' '}
            </b>
          )}
          Windows ne permet pas un arrêt propre : le processus est coupé net,
          sans le temps de finir un job.
        </p>
      ),
    })
    if (!ok) return
    if (!(await post('/api/app/comfy/stop'))) return
    append('ComfyUI arrêté')
    toast('ComfyUI arrêté')
    refreshProbes()
  }, [confirm, post, append, toast, refreshProbes, running])

  /* Not destructive the way a stop is — it comes back — but it costs 30 s to
     2 min and kills a running batch, so it confirms like its siblings. */
  const restartComfy = useCallback(async () => {
    const ok = await confirm({
      title: 'Redémarrer ComfyUI ?',
      button: 'Redémarrer ComfyUI',
      body: (
        <p>
          {running && (
            <b>
              Une génération est en cours sur ce tableau de bord — elle sera
              perdue.{' '}
            </b>
          )}
          Arrêt net puis relance dans une nouvelle fenêtre console. Compte 30 s à
          2 min : le premier chargement des custom nodes est le plus long.
        </p>
      ),
    })
    if (!ok) return
    if (!(await post('/api/app/comfy/restart'))) return
    append("redémarrage de ComfyUI demandé — une nouvelle fenêtre va s'ouvrir")
    toast('redémarrage de ComfyUI lancé (~30 s à 2 min)')
  }, [confirm, post, append, toast, running])

  return { stopApp, stopComfy, restartComfy, takeover }
}
