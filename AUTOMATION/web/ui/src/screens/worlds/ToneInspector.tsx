/* Editing ONE tone of a world (IT-10, 25/09). Presentation only: the draft
   lives in `useToneCatalogue`, the save in the chrome's `DirtyBar`.

   WHAT A TONE DOES, SAID WHERE IT IS EDITED. A tone adds its fragment to the
   prompt of every image produced with it, and poses an expression after the
   identity check. The fragment is the part that weighs on the render — the
   one that, invisible anywhere in the studio, degraded every selfie on 25/09
   (« slight motion blur » on `joueur`). The hint under the field says why.

   THE EXPRESSION RANGE IS READ HERE, TUNED IN THE WORKSHOP. Tuning it needs a
   preview on a character's photos, and a world has no character. The link
   goes to Ateliers › Tons, where that preview exists. */
import { Link } from 'react-router-dom'

import { PATHS } from '../../app/routes'
import { Icon } from '../../chrome/Icon'
import { TONE_KEY_RE, toneKey } from './slugify'
import type { TonePatch } from './useToneCatalogue'
import type { WorldTone } from './useWorldTones'

const FIELD = 'flex flex-col gap-[5px]'
const LABEL = 'lab'
const HINT = 'text-[11.5px] text-dim2'
const CHANGED = 'border-warn!'

export function ToneInspector({
  tone,
  draft,
  worldLabel,
  status,
  creating,
  takenKeys,
  onPatch,
  onRemove,
  onClose,
}: {
  /** What is on disk; the comparison that lights a modified field. */
  tone: WorldTone
  draft: TonePatch
  worldLabel: string
  status: string | null
  creating: boolean
  takenKeys: string[]
  onPatch: (patch: Partial<TonePatch>) => void
  onRemove?: () => void
  onClose: () => void
}) {
  const key = draft.key.trim()
  const keyProblem = !key
    ? null
    : takenKeys.includes(key)
      ? 'déjà utilisée'
      : TONE_KEY_RE.test(key)
        ? null
        : 'minuscules, chiffres et _'
  const changed = (field: 'label' | 'prompt_add') =>
    draft[field] !== (tone[field] ?? '') ? CHANGED : ''
  const expression = Object.keys(tone.expression ?? {})

  /* While creating, the key follows the name until it is typed by hand — the
     same proposal the world and place ids get (`slugify.ts`). */
  const onLabel = (label: string) => {
    const follows = creating && (!draft.key || draft.key === toneKey(draft.label))
    onPatch(follows ? { label, key: toneKey(label) } : { label })
  }

  return (
    <section
      aria-label={`Ton ${draft.label || draft.key || 'nouveau'}`}
      id="toneInspector"
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.stopPropagation()
          onClose()
        }
      }}
      className="flex h-full min-h-0 flex-col"
    >
      <header className="flex h-[52px] flex-none items-center gap-[10px] border-b border-b-line px-[16px]">
        <b className="min-w-0 flex-1 truncate text-[15px] font-[650]">
          {draft.label || draft.key || 'Nouveau ton'}
        </b>
        {onRemove && (
          <button type="button" className="link flex-none text-danger-txt" id="btnToneRemove" onClick={onRemove}>
            Retirer…
          </button>
        )}
      </header>

      <p className="m-0 flex flex-none items-start gap-[7px] border-b border-b-line px-[16px]
                    py-[9px] text-[12.5px] leading-[1.45] text-dim">
        <Icon name="worlds" className="mt-[2px] h-[13px] w-[13px] flex-none" aria-hidden="true" />
        <span>
          Hérité par <b className="font-semibold text-txt">tous les personnages</b> de «&nbsp;
          {worldLabel}&nbsp;», champ par champ : un personnage qui l'a ajusté garde son réglage,
          et reçoit le reste d'ici.
        </span>
      </p>

      <div className="min-h-0 flex-1 overflow-y-auto p-[16px]">
        <div className="flex max-w-[720px] flex-col gap-[14px]">
          <div className={FIELD}>
            <label className={LABEL} htmlFor="toneLabel">
              Nom du ton
            </label>
            <input
              id="toneLabel"
              className={`h-[34px] ${changed('label')}`}
              value={draft.label}
              onChange={(e) => onLabel(e.target.value)}
            />
          </div>

          {creating ? (
            <div className={FIELD}>
              <label className={LABEL} htmlFor="toneKey">
                Clé
              </label>
              <div className="flex items-center gap-[10px]">
                <input
                  id="toneKey"
                  className="font-code max-w-[280px]"
                  spellCheck={false}
                  aria-describedby="toneKeyNote"
                  value={draft.key}
                  onChange={(e) => onPatch({ key: e.target.value })}
                />
                <span
                  id="toneKeyNote"
                  className={`flex items-center gap-[5px] text-[11.5px] ${keyProblem ? 'text-warn-txt' : 'text-dim2'}`}
                >
                  {key && (
                    <span aria-hidden="true" className="text-[9px]">
                      {keyProblem ? '◆' : '●'}
                    </span>
                  )}
                  {key ? (keyProblem ?? 'valide') : 'proposée depuis le nom'}
                </span>
              </div>
              <span className={HINT}>
                figée une fois créée : les scènes, le journal et les exports la citent
              </span>
            </div>
          ) : (
            <div className="grid grid-cols-[96px_minmax(0,1fr)] items-baseline gap-[10px]">
              <span className={LABEL}>Clé</span>
              <span className="min-w-0">
                <code className="font-code text-[12px] leading-[normal]">{tone.key}</code>
                <span className={`ml-[8px] ${HINT}`}>figée, citée par les scènes et le journal</span>
              </span>
            </div>
          )}

          <div className={FIELD}>
            <label className={LABEL} htmlFor="tonePrompt">
              Fragment de prompt
            </label>
            <textarea
              id="tonePrompt"
              className={`min-h-[90px] resize-y ${changed('prompt_add')}`}
              value={draft.prompt_add}
              aria-describedby="tonePromptHint"
              onChange={(e) => onPatch({ prompt_add: e.target.value })}
            />
            <span className={HINT} id="tonePromptHint">
              Ajouté au prompt de chaque image produite avec ce ton. Décris une attitude, une
              lumière, un cadrage — jamais un défaut de prise de vue : « flou », « bougé » ou
              « grain » s'appliquent à toute la photo, pas au sujet, et la dégradent.
            </span>
          </div>

          <div className={FIELD}>
            <span className={LABEL}>Plage d'expression</span>
            <p className="m-0 text-[13px] text-dim">
              {expression.length
                ? `${expression.length} paramètre${expression.length > 1 ? 's' : ''} réglé${expression.length > 1 ? 's' : ''} : ${expression.join(', ')}`
                : 'Aucune : ce ton ne touche pas au visage.'}
            </p>
            {!creating && (
              <span className={HINT}>
                Se règle dans{' '}
                <Link className="link" to={`${PATHS.bankTones}/edit/${encodeURIComponent(tone.key)}`}>
                  Ateliers › Tons
                </Link>
                , avec un aperçu sur les photos d'un personnage de ce monde.
              </span>
            )}
          </div>

          {status && (
            <p className="m-0 text-[12px] text-dim" role="status">
              {status}
            </p>
          )}
        </div>
      </div>
    </section>
  )
}
