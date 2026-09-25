/* « Contenu adulte » — the section of the Application screen, and the arming
   ritual it opens (J7, design-pass screen-12 §S6).

   ONE SINGLE PLACE. Arming used to live on the locked step of the intensity
   slider and inside the Decline modal: two doors, both in the middle of a
   production gesture, where one does not want to take that kind of decision. It
   lives here, on the screen that configures the application — and disarming with
   it. Produire carries the decision out, it no longer takes it.

   NO GLOBAL SWITCH. The switch is ONE character's (CHARACTERS/<id>/character.json,
   key `nsfw`, ADR-0010), off at creation. This section therefore always speaks
   of the current character, and names it.

   TWO CONDITIONS. The edit step only appears on Produire if the character is
   armed AND its pack declares an edit graph (universe.json / edit_workflow). A
   pack without the graph says so here, in plain words, BEFORE the switch:
   arming stays allowed, it just makes nothing appear.

   The state is loaded by the screen (`useNsfwState`), which the nav reads too;
   the two gestures below stay here, unchanged. */
import { useId, useState } from 'react'

import { errorOf, type Schema } from '../../api/client'
import { useApi } from '../../api/useApi'
import { useCharacter } from '../../character/CharacterContext'
import { useConfirm } from '../../chrome/ConfirmContext'
import { Dialog } from '../../chrome/Dialog'
import { useToast } from '../../chrome/ToastContext'
import { ActionRow, ActionRows, SectionHeader, SubTitle } from './SectionShell'
import { StatusMark } from './StatusPill'
import type { NsfwState } from './useNsfwState'

type NsfwArmResponse = Schema<'NsfwArmResponse'>

/* The word to copy out. Checked here to keep the button honest, and checked
   again by the server, which is the rule. */
const WORD = 'ARMER'

export function AdultContentSection({
  name,
  state,
  failed,
  onReload,
}: {
  name: string
  state: NsfwState | null
  failed: boolean
  onReload: () => Promise<void>
}) {
  const api = useApi()
  const confirm = useConfirm()
  const toast = useToast()
  const { refreshSheet } = useCharacter()
  const [arming, setArming] = useState(false)
  const [word, setWord] = useState('')
  const hintId = useId()

  const tool: Partial<NonNullable<NsfwState['outil']>> = state?.outil ?? {}
  const armed = Boolean(tool.armed)
  const total = Object.values(state?.counts ?? {}).reduce((a, b) => a + b, 0)
  const exact = word === WORD

  /* After a switch, everything that READS the flag has to catch up: the sheet
     (CharacterContext holds it) and this screen's own state. */
  const afterToggle = async () => {
    refreshSheet()
    await onReload()
  }

  const disarm = async () => {
    const ok = await confirm({
      title: 'Désactiver le contenu adulte ?',
      button: 'Désactiver',
      body: (
        <>
          <p>
            Le cran disparaît du curseur de Produire et plus aucune édition ne peut
            être lancée.
          </p>
          <p>
            Les images déjà produites <b>restent en place</b> dans{' '}
            <code>{state?.sortie || ''}</code> — rien n'est supprimé.
          </p>
        </>
      ),
    })
    if (!ok) return
    const response = await api.post<NsfwArmResponse>('/api/nsfw/arm', { arm: false })
    const failure = errorOf(response)
    if (failure) {
      toast(failure || 'désactivation impossible')
      return
    }
    toast('contenu adulte désactivé')
    await afterToggle()
  }

  /* The ritual: copy the word, not a click. It states the real consequences —
     the character's own folder, and the fact that nothing leaves it. */
  const arm = async () => {
    if (!exact) return
    const response = await api.post<NsfwArmResponse>('/api/nsfw/arm', {
      arm: true,
      confirm: word,
    })
    const failure = errorOf(response)
    if (failure) {
      toast(
        failure === 'confirmation manquante'
          ? 'recopie exactement le mot ARMER'
          : failure || 'échec',
      )
      return
    }
    setArming(false)
    setWord('')
    toast('contenu adulte activé')
    await afterToggle()
  }

  const closeArming = () => {
    setArming(false)
    setWord('')
  }

  return (
    <section id="nsfwBox">
      <SectionHeader
        title="Contenu adulte"
        state={state ? (armed ? { tone: 'warn', text: 'activé' } : { tone: 'none', text: 'désactivé' }) : undefined}
        scope={
          <>
            Pour <b className="text-txt" id="nsfwQui">{name}</b> seulement. Ajoute au curseur
            de Produire un cran qui <b className="text-txt">édite une image déjà validée</b>{' '}
            que tu choisis toi-même, il n'engendre jamais une scène à partir de rien. La
            retouche se fait ensuite dans l'éditeur photo, depuis la Revue.
          </>
        }
      />

      {failed ? (
        <div className="rounded-[8px] border border-line2 px-[16px] py-[14px]" role="alert">
          <p className="m-0 text-[13px] text-txt">État indisponible, le serveur n'a pas répondu.</p>
          <button className="btn sm mt-[10px]" type="button" onClick={() => void onReload()}>
            Réessayer
          </button>
        </div>
      ) : !state ? (
        <p className="text-[13px] text-dim2">chargement…</p>
      ) : (
        <>
          {/* The pack does not have the tool: say it BEFORE the switch, otherwise
              arming promises a step that will not appear. We do not forbid it
              for all that — arming is the character's decision. */}
          {!tool.has_graph && (
            <p
              className="mt-0 mb-[20px] flex gap-[10px] rounded-[8px] border border-line2 bg-panel px-[16px] py-[12px] text-[13px] text-dim"
              id="nsfwManque"
            >
              <span className="mt-[5px]">
                <StatusMark tone="warn" />
              </span>
              <span>
                {tool.reason || ''} L'activer ici est sans effet visible sur Produire
                tant que le pack n'aura pas son graphe d'édition.
              </span>
            </p>
          )}

          <dl className="m-0 grid grid-cols-[120px_1fr] gap-y-[8px] text-[13px]">
            <dt className="text-dim">État</dt>
            <dd className="m-0 text-txt">
              {armed ? 'activé' : 'désactivé'}
              {armed && total > 0 && (
                <span className="text-dim">
                  {' '}
                  · {total} image{total > 1 ? 's' : ''} dans <code>{state.sortie || ''}</code> · jamais
                  exportées
                </span>
              )}
            </dd>
          </dl>

          <SubTitle>Action</SubTitle>
          <ActionRows>
            {armed ? (
              <ActionRow
                title="Désactiver"
                consequence="Le cran disparaît de Produire. Les images déjà produites restent en place."
                button={() => (
                  <button
                    className="btn border-warn-line text-warn-txt"
                    id="btnNsfwOff"
                    type="button"
                    onClick={disarm}
                  >
                    Désactiver…
                  </button>
                )}
              />
            ) : (
              <ActionRow
                title="Activer"
                consequence="Demande de recopier un mot : la décision ne se prend pas d'un clic."
                button={() => (
                  <button className="btn primary" id="btnNsfwOn" type="button" onClick={() => setArming(true)}>
                    Activer…
                  </button>
                )}
              />
            )}
          </ActionRows>
        </>
      )}

      <Dialog
        id="armBoxNsfw"
        open={arming}
        onDismiss={closeArming}
        initialFocus="#armWord2"
        cardClassName="!w-[500px] !max-w-[calc(100vw-32px)]"
      >
        <h3>Activer le contenu adulte pour {state?.nom || name}</h3>
        <p>
          Un cran s'ajoute au curseur de Produire. Il part de l'image validée que tu
          choisis : la sélection est manuelle, il n'y a pas de reprise automatique.
        </p>
        <ul>
          <li>le verrou d'identité du pack remet le visage depuis la base gelée</li>
          <li>
            sorties isolées dans <code>{state?.sortie || ''}</code>,{' '}
            <b>jamais exportées</b>
          </li>
          <li>une image dont la passe d'identité sort de la bande n'est pas éditée</li>
          <li>réversible ici même, à tout moment</li>
        </ul>
        <label className="mt-[14px] block text-[13px] text-dim" htmlFor="armWord2" id={hintId}>
          Pour activer, recopie le mot <b className="text-txt">ARMER</b>
        </label>
        <input
          id="armWord2"
          autoComplete="off"
          spellCheck={false}
          className={`mt-[6px] w-[220px] font-code tracking-[1px] ${exact ? '!border-ok' : '!border-warn'}`}
          value={word}
          onChange={(event) => setWord(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && exact) void arm()
          }}
        />
        <div className="mt-[18px] flex items-center justify-end gap-[14px]">
          <button className="link" id="armClose" type="button" onClick={closeArming}>
            Annuler
          </button>
          <button
            className="btn primary"
            id="btnArm2"
            type="button"
            disabled={!exact}
            aria-describedby={hintId}
            onClick={arm}
          >
            Activer
          </button>
        </div>
      </Dialog>
    </section>
  )
}
