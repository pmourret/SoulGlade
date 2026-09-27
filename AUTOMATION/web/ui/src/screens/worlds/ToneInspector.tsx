/* Editing ONE tone of a world (IT-10, 25/09). Presentation only: the draft
   lives in `useToneCatalogue`, the save in the chrome's `DirtyBar`.

   WHAT A TONE DOES, SAID WHERE IT IS EDITED. A tone adds its fragment to the
   prompt of every image produced with it, and poses an expression after the
   identity check. Until 25/09 no screen showed the fragment at all.

   THE EXPRESSION RANGE IS READ HERE, NOT TUNED. Tuning it needs a preview on
   a character's photos, and a world has no character: the workshop sets it
   for ONE character (its own adjustment), and the hint says so rather than
   suggesting the world's range is edited there. */
import type { Enhancer } from '../../api/useEnhance'
import { EnhanceField } from '../../chrome/EnhanceField'
import { Link } from 'react-router-dom'

import { PATHS } from '../../app/routes'
import { Icon } from '../../chrome/Icon'
import type { EntryUsers } from './EntryInspector'
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
  users,
  onPatch,
  onRemove,
  onOpenScene,
  onClose,
  enhancer,
}: {
  /** What is on disk; the comparison that lights a modified field. */
  tone: WorldTone
  draft: TonePatch
  worldLabel: string
  status: string | null
  creating: boolean
  takenKeys: string[]
  /** The scenes that cite this tone. Retiring it breaks none of them, so the
      list informs; it never disables « Retirer ». */
  users: EntryUsers
  onPatch: (patch: Partial<TonePatch>) => void
  onRemove?: () => void
  onOpenScene: (id: string) => void
  onClose: () => void
  /** « Améliorer » under the prompt fragment (IT-10 chantier 8). */
  enhancer: Enhancer
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
  const userCount = users.shown.length + users.hidden

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
      <header className="flex h-[48px] flex-none items-center gap-[10px] border-b border-b-line px-[16px]">
        <b className="min-w-0 flex-1 truncate text-[14px] font-[650]">
          {draft.label || draft.key || 'Nouveau ton'}
        </b>
        <span className="flex-none text-[11.5px] text-dim2">ton</span>
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
        <div className="flex flex-col gap-[14px]">
          <div className={FIELD}>
            <label className={LABEL} htmlFor="toneLabel">
              Nom du ton
            </label>
            {/* Focus on creation (audit du 26/09) : after « Créer le premier ton »
                the focus stayed on <body>, so a keyboard user had to hunt for
                the field, and Escape did not close the inspector. */}
            <input
              id="toneLabel"
              autoFocus={creating}
              className={`h-[34px] ${changed('label')}`}
              value={draft.label}
              onChange={(e) => onLabel(e.target.value)}
            />
          </div>

          <div className={FIELD}>
            <EnhanceField
              label="Fragment de prompt"
              htmlFor="tonePrompt"
              kind="tone"
              value={draft.prompt_add}
              onApply={(text) => onPatch({ prompt_add: text })}
              enhancer={enhancer}
            >
              <textarea
                id="tonePrompt"
                className={`min-h-[90px] resize-y ${changed('prompt_add')}`}
                value={draft.prompt_add}
                aria-describedby="tonePromptHint"
                onChange={(e) => onPatch({ prompt_add: e.target.value })}
              />
            </EnhanceField>
            <span className={HINT} id="tonePromptHint">
              Ajouté au prompt de chaque image produite avec ce ton : une attitude, une
              lumière, un cadrage. L'essai de rendu d'Ateliers › Tons montre ce qu'il change.
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
                Plage de base du monde. Chaque personnage l'ajuste pour lui-même dans{' '}
                <Link className="link" to={`${PATHS.bankTones}/edit/${encodeURIComponent(tone.key)}`}>
                  Ateliers › Tons
                </Link>
                , avec un aperçu sur ses photos.
              </span>
            )}
          </div>

          {!creating && (
            <div className={FIELD} id="toneUsers">
              <span className={LABEL}>
                Sert à {userCount ? `${userCount} scène${userCount > 1 ? 's' : ''}` : 'aucune scène'}
              </span>
              {users.shown.length > 0 && (
                <ul className="m-0 flex list-none flex-col gap-[2px] p-0">
                  {users.shown.map((u) => (
                    <li key={u.id}>
                      <button type="button" className="link text-left" onClick={() => onOpenScene(u.id)}>
                        {u.label}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {users.hidden > 0 && (
                <span className={HINT}>
                  et {users.hidden} scène{users.hidden > 1 ? 's' : ''} adulte{users.hidden > 1 ? 's' : ''}, dans la
                  branche à part
                </span>
              )}
            </div>
          )}

          {status && (
            <p className="m-0 text-[12px] text-dim" role="status">
              {status}
            </p>
          )}
        </div>
      </div>

      {/* The foot, like a place's (design-pass 19 §S5): the key, then Retirer. */}
      <footer className="flex min-h-[52px] flex-none items-center gap-[10px] border-t border-t-line px-[16px] py-[8px]">
        {creating ? (
          <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
            <div className="flex items-center gap-[8px]">
              <label className={LABEL} htmlFor="toneKey">
                Clé
              </label>
              <input
                id="toneKey"
                className="font-code h-[28px] min-w-0 flex-1 py-0 text-[12px]"
                spellCheck={false}
                aria-describedby="toneKeyNote"
                value={draft.key}
                onChange={(e) => onPatch({ key: e.target.value })}
              />
            </div>
            <span
              id="toneKeyNote"
              className={`flex items-center gap-[5px] text-[11.5px] ${keyProblem ? 'text-warn-txt' : 'text-dim2'}`}
            >
              {key && (
                <span aria-hidden="true" className="text-[9px]">
                  {keyProblem ? '◆' : '●'}
                </span>
              )}
              {key ? (keyProblem ?? 'valide') : 'proposée depuis le nom'} · figée une fois créée
            </span>
          </div>
        ) : (
          <span className="min-w-0 truncate text-[12px] text-dim2" data-hint-text="figée, citée par les scènes et le journal">
            <span className="sr-only">Clé </span>
            <code className="font-code text-[12px] leading-[normal] text-dim2">{tone.key}</code>
            <span className="sr-only"> : figée, citée par les scènes et le journal</span>
          </span>
        )}
        {onRemove && (
          <button type="button" className="link ml-auto flex-none text-danger-txt" id="btnToneRemove" onClick={onRemove}>
            Retirer…
          </button>
        )}
      </footer>
    </section>
  )
}
