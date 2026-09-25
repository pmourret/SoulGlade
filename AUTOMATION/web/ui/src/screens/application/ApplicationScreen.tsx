/* Application — settings of the APP itself, not of a generation, sorted by
   what they apply to (design-pass screen-12): the machine, the open
   character, the logs. `/app/:section`, one section at a time.

   Distinct from the settings panel of Produire, which tunes a run; this screen
   drives the two PROCESSES that make a run possible, and holds the one gesture
   that arms adult content.

   CONSEQUENTIAL ACTIONS, SO: confirmation every time, and the confirmation says
   what actually happens. For ComfyUI a stop is NEVER clean under Windows (no
   graceful shutdown signal, TerminateProcess cuts mid-job) — said before acting,
   not after. */
import { useCallback, useEffect, useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'

import { errorOf, type Schema } from '../../api/client'
import { useApi } from '../../api/useApi'
import { APP_SECTIONS, PATHS, type AppSection } from '../../app/routes'
import { useCharacter } from '../../character/CharacterContext'
import { useConfirm } from '../../chrome/ConfirmContext'
import { Takeover } from '../../chrome/Takeover'
import { useToast } from '../../chrome/ToastContext'
import { useProcessControls } from '../../chrome/useProcessControls'
import { useComfyStats } from '../../state/ComfyStatsContext'
import { useServerLog } from '../../state/ServerLogContext'
import { useSystemState } from '../../state/SystemStateContext'
import { usePolling } from '../../state/usePolling'
import { AdultContentSection } from './AdultContentSection'
import { AppearanceSection } from './AppearanceSection'
import { AppNav } from './AppNav'
import { ComfySection, ServerSection } from './MachineSections'
import { ProductionJournal } from './ProductionJournal'
import { ServerLog } from './ServerLog'
import { useJournal } from './useJournal'
import { useNsfwState } from './useNsfwState'

type ActionResponse = Schema<'ActionResponse'>

/* On THIS screen the probes are read at their own, faster pace, on top of the
   module's 5 s: it is the screen where one watches the numbers move, and it is
   the only place that justifies it. The route caches for 1.5 s server-side, so
   this does not double the nvidia-smi spawns. */
const SCREEN_PROBE_MS = 2000

const RESTARTING = 'Redémarrage du tableau de bord…'

const isSection = (value: string | undefined): value is AppSection =>
  (APP_SECTIONS as readonly string[]).includes(value ?? '')

export function ApplicationScreen() {
  const { section: param } = useParams()
  const api = useApi()
  const confirm = useConfirm()
  const toast = useToast()
  const { state } = useSystemState()
  const { stats, refresh: refreshProbes } = useComfyStats()
  const { lines, append } = useServerLog()
  const { sheet } = useCharacter()
  const nsfw = useNsfwState()
  const journal = useJournal()
  const [takeover, setTakeover] = useState<React.ReactNode>(null)
  /* Stop THIS dashboard / stop ComfyUI / restart ComfyUI: shared with the
     header's power menu and the fault banner, same confirmation, same
     consequence — see chrome/useProcessControls.tsx. Restart of the dashboard
     and unload stay local: only this screen offers them. */
  const { stopApp, stopComfy, restartComfy, takeover: stopTakeover } = useProcessControls()

  usePolling(refreshProbes, { intervalMs: SCREEN_PROBE_MS, pauseWhenHidden: true })

  const online = Boolean(state?.comfy)
  const running = Boolean(state?.running)

  /* Unloading only makes sense if ComfyUI answers, and never under a production.
     The state comes from the shared probe and the shared tick — one source for
     what is displayed AND for what the button allows. */
  const unloadReason = running
    ? 'une production est en cours'
    : stats?.en_ligne
      ? ''
      : 'ComfyUI ne répond pas'

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

  const onUnload = async () => {
    const ok = await confirm({
      title: 'Décharger la mémoire ?',
      button: 'Décharger',
      body: (
        <>
          <p>
            Libère la VRAM que les modèles chargés retiennent. ComfyUI{' '}
            <b>reste en ligne</b> : les modèles se rechargent d'eux-mêmes à la
            prochaine génération, qui sera donc un peu plus longue.
          </p>
          <p className="tiny">Rien n'est perdu — ni file d'attente, ni image.</p>
        </>
      ),
    })
    if (!ok) return
    if (!(await post('/api/app/comfy/unload'))) return
    append('mémoire ComfyUI déchargée')
    toast('mémoire déchargée')
    refreshProbes()
  }

  const onAppRestart = async () => {
    const ok = await confirm({
      title: 'Redémarrer le tableau de bord ?',
      button: 'Redémarrer',
      body: (
        <p>
          Relance le serveur web local avec le code et la configuration à jour.
          Cette page se recharge d'elle-même une fois qu'il répond de nouveau —
          quelques secondes.
        </p>
      ),
    })
    if (!ok) return
    if (!(await post('/api/app/restart'))) return
    setTakeover(RESTARTING)
  }

  /* Waiting for the restarted server: poll until it answers, then reload — the
     new process serves new code, so a re-render would not be enough. */
  const waitingForRestart = takeover === RESTARTING
  useEffect(() => {
    if (!waitingForRestart) return
    const timer = window.setInterval(() => {
      fetch('/api/state')
        .then(() => {
          window.clearInterval(timer)
          location.reload()
        })
        .catch(() => {})
    }, 700)
    return () => window.clearInterval(timer)
  }, [waitingForRestart])

  if (param !== undefined && !isSection(param)) return <Navigate to={PATHS.application} replace />
  const section: AppSection = param ?? 'comfy'
  const name = sheet?.name || null

  if (takeover || stopTakeover) {
    return (
      <Takeover>
        <div className="flex flex-col items-center gap-[14px]">
          {waitingForRestart && (
            <i
              aria-hidden="true"
              className="h-[18px] w-[18px] rounded-full border-2 border-line2 border-t-txt motion-safe:animate-spin"
            />
          )}
          <div>{takeover || stopTakeover}</div>
        </div>
      </Takeover>
    )
  }

  /* A character section with no character open: nothing to set, say so. */
  const needsCharacter = (section === 'adult' || section === 'appearance') && !name

  return (
    <div
      className="screen grid min-h-full grid-cols-[260px_minmax(0,1fr)] max-[1099px]:grid-cols-[200px_minmax(0,1fr)]
                 max-[899px]:grid-cols-1 max-[899px]:content-start"
      id="appli"
    >
      <AppNav
        current={section}
        name={name}
        online={state === null ? null : online}
        armed={nsfw.state ? Boolean(nsfw.state.outil?.armed) : null}
        journalCount={journal.loading || journal.error ? null : journal.rows.length}
        logCount={lines.length}
      />
      <div
        className={`min-w-0 px-[40px] py-[28px] max-[1099px]:px-[24px] ${
          section === 'journal' || section === 'log' ? '' : 'max-w-[880px]'
        }`}
      >
        {needsCharacter ? (
          <p className="text-[13px] text-dim">
            Aucun personnage ouvert : ce réglage appartient à un personnage.
          </p>
        ) : section === 'server' ? (
          <ServerSection onRestart={onAppRestart} onStop={stopApp} />
        ) : section === 'comfy' ? (
          <ComfySection
            online={online}
            known={state !== null}
            stats={stats}
            unloadReason={unloadReason}
            onUnload={onUnload}
            onRestart={restartComfy}
            onStop={stopComfy}
          />
        ) : section === 'adult' ? (
          <AdultContentSection
            name={name ?? ''}
            state={nsfw.state}
            failed={nsfw.failed}
            onReload={nsfw.reload}
          />
        ) : section === 'appearance' ? (
          <AppearanceSection />
        ) : section === 'journal' ? (
          <ProductionJournal
            name={name ?? ''}
            rows={journal.rows}
            error={journal.error}
            loading={journal.loading}
            onRetry={() => void journal.reload()}
          />
        ) : (
          <ServerLog lines={lines} />
        )}
      </div>
    </div>
  )
}
