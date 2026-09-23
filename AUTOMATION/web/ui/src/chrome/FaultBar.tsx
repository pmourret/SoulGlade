/* The banner that says the server did not return what was needed.

   Without it, a failure on /api/scenes or /api/creative left the Produire screen
   entirely empty — no intent, no scene, no slider — and not a word. An empty
   screen that does not explain itself costs more than a displayed error
   (.claude/rules/frontend.md).

   TEXT LEFT, ACTIONS RIGHT (design-pass screen-0-chrome §S5, 23/09/2026), and
   the actions are now the two that actually resolve a fault: reading what the
   server logged, and restarting ComfyUI. « Réessayer » reloaded the page, which
   re-ran the same failing call against the same server and told the user
   nothing new — it is kept, but last and secondary, because a transient network
   blip is still a real case.

   `restartComfy` comes from `useProcessControls`: the SAME confirmation and the
   same consequence as the Application screen's own button, never a second copy.

   The « relance run_web.bat » advice only holds for an /api/* probe returning
   malformed data (a server running behind the code on disk) — not for a
   production error or an unreadable list, where it would mislead. */
import { Link } from 'react-router-dom'

import { PATHS } from '../app/routes'
import { useFaults } from '../state/FaultsContext'
import { useProcessControls } from './useProcessControls'

export function FaultBar() {
  const { faults } = useFaults()
  const { restartComfy } = useProcessControls()
  const entries = Object.entries(faults)
  if (!entries.length) return null

  const stale = entries.some(([source]) => source === 'sonde')
  const text =
    entries.map(([source, detail]) => `${source} : ${detail}`).join(' · ') +
    (stale
      ? " — si le serveur tourne depuis avant une modification du projet, relance run_web.bat"
      : '')

  return (
    <div id="panneBar" role="status">
      <b>Le tableau de bord ne peut pas charger</b>
      <span id="panneTxt">{text}</span>
      <div className="acts">
        <Link className="btn sm" id="btnVoirJournal" to={PATHS.journal}>
          Voir le journal
        </Link>
        <button className="btn sm primary" id="btnRelancerComfy" onClick={() => void restartComfy()}>
          Relancer ComfyUI
        </button>
        <button className="btn sm" id="btnRecharger" onClick={() => location.reload()}>
          Réessayer
        </button>
      </div>
    </div>
  )
}
