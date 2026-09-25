/* The two MACHINE sections of Application (design-pass screen-12 §S5): the
   local web server and ComfyUI. Presentation only — every gesture is a
   callback held by the screen (restart, unload) or by `useProcessControls`
   (stops, ComfyUI restart), whose confirmations are the only ones. */
import type { ComfyStats } from '../../state/ComfyStatsContext'
import { ComfyGauges } from './ComfyGauges'
import { ActionRow, ActionRows, SectionHeader, StopBlock, SubTitle } from './SectionShell'

const MACHINE_SCOPE = 'Vaut pour toute la machine et tous les personnages.'

export function ServerSection({ onRestart, onStop }: { onRestart: () => void; onStop: () => void }) {
  return (
    <section>
      <SectionHeader
        title="Serveur web local"
        state={{ tone: 'ok', text: 'actif' }}
        scope={`Celui que tu utilises en ce moment. ${MACHINE_SCOPE}`}
      />
      <SubTitle>Actions</SubTitle>
      <ActionRows>
        <ActionRow
          title="Redémarrer"
          consequence="Reprend le code et la configuration à jour. La page se recharge d'elle-même, quelques secondes."
          button={() => (
            <button className="btn" id="btnAppRestart" type="button" onClick={onRestart}>
              Redémarrer…
            </button>
          )}
        />
      </ActionRows>
      <StopBlock
        consequence={
          <>
            Coupe le serveur web local. Cette page ne répondra plus tant qu'il n'est pas
            relancé à la main (<code>AUTOMATION/run_web.bat</code>).
          </>
        }
        button={
          <button className="btn danger" id="btnAppStop" type="button" onClick={onStop}>
            Arrêter…
          </button>
        }
      />
    </section>
  )
}

export function ComfySection({
  online,
  known,
  stats,
  unloadReason,
  onUnload,
  onRestart,
  onStop,
}: {
  online: boolean
  /** False until the first system tick: the state is unknown, not offline. */
  known: boolean
  stats: ComfyStats | null
  /** Why unloading is refused right now, or '' when it is allowed. */
  unloadReason: string
  onUnload: () => void
  onRestart: () => void
  onStop: () => void
}) {
  return (
    <section>
      <SectionHeader
        title="ComfyUI"
        stateId="comfyEtat"
        state={
          known
            ? online
              ? { tone: 'ok', text: 'en ligne' }
              : { tone: 'bad', text: 'hors ligne' }
            : undefined
        }
        scope={`Le moteur de génération (GPU). ${MACHINE_SCOPE}`}
      />
      <ComfyGauges stats={stats} />
      <SubTitle>Actions</SubTitle>
      <ActionRows>
        {/* Unloading does not stop ComfyUI: it gives back the VRAM the models
            hold. Said on the row, otherwise « décharger » reads as « arrêter ». */}
        <ActionRow
          title="Décharger la mémoire"
          consequence={
            <>
              Libère la VRAM que les modèles retiennent. ComfyUI <b className="text-txt">reste en ligne</b>,
              les modèles se rechargent à la prochaine génération.
            </>
          }
          unavailable={unloadReason || undefined}
          button={(describedBy) => (
            <button
              className="btn"
              id="btnComfyUnload"
              type="button"
              disabled={Boolean(unloadReason)}
              title={unloadReason}
              aria-describedby={describedBy}
              onClick={onUnload}
            >
              Décharger…
            </button>
          )}
        />
        <ActionRow
          title="Redémarrer"
          consequence="Reprend en compte un custom node mis à jour. Coupe net un job en cours."
          button={() => (
            <button className="btn" id="btnComfyRestart" type="button" onClick={onRestart}>
              Redémarrer…
            </button>
          )}
        />
      </ActionRows>
      <StopBlock
        consequence={
          <>
            <b className="text-txt">Windows ne permet pas un arrêt propre</b> : le processus est
            coupé net, sans le temps de finir un job en cours.
          </>
        }
        button={
          <button className="btn danger" id="btnComfyStop" type="button" onClick={onStop}>
            Arrêter ComfyUI…
          </button>
        }
      />
    </section>
  )
}
