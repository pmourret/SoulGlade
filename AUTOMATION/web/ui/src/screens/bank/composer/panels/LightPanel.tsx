/* Lumière — un fragment du prompt, et ses variantes (design-pass screen-7c
   §2, option 2a).

   CE QUI CHANGE. Le champ était seul, sans rien dire du prompt qu'il rejoint :
   le fil de contexte le replace entre le décor et la pose, et y mène d'un
   clic. Les variantes étaient un textarea où une variante se distinguait de
   la suivante par un retour à la ligne qu'il fallait deviner ; ce sont des
   lignes numérotées, qu'on ajoute et qu'on retire. Le stockage n'a pas bougé :
   `draft.variants`, une variante par ligne. */
import type { SceneDraft } from '../../../../state/ScenesStoreContext'
import type { SceneField } from '../../sceneChanges'
import { FragmentTrail } from '../FragmentTrail'
import { PromptField } from '../PromptField'
import type { SectionKey } from '../sections'
import { HEAD } from './shared'

export function LightPanel({
  draft,
  worldLinked,
  lockedNote,
  changed,
  onPatch,
  onGoto,
}: {
  draft: SceneDraft
  worldLinked: boolean
  lockedNote: string
  changed: Set<SceneField>
  onPatch: (patch: Partial<SceneDraft>) => void
  onGoto: (section: SectionKey) => void
}) {
  const variants = draft.variants.split('\n').filter((line, index, all) =>
    // une ligne vide en cours de saisie reste, une ligne vide finale ne compte pas
    line.trim() !== '' || index < all.length - 1,
  )
  const writeVariants = (next: string[]) =>
    onPatch({ variants: next.filter((line) => line.trim() !== '').join('\n') })

  return (
    <div className="flex flex-col gap-[16px]">
      <FragmentTrail draft={draft} here="light" onGoto={onGoto} />

      <div>
        <div className="mb-[4px] flex items-baseline justify-between gap-[10px]">
          <span className={HEAD}>Lumière de la scène</span>
          <span className="text-[11px] text-dim2">
            {draft.promptLight.length} car.
            {changed.has('promptLight') && <b className="ml-[8px] text-warn-txt">modifié</b>}
          </span>
        </div>
        <PromptField
          dataField="prompt_light"
          label="Lumière de la scène"
          hideLabel
          hint="Rejoint le prompt final à l'enregistrement, après le décor et avant le vêtement et la pose."
          placeholder="ex : golden hour, soft window light"
          value={draft.promptLight}
          disabled={worldLinked}
          lockedNote={worldLinked ? lockedNote : undefined}
          changed={changed.has('promptLight')}
          onChange={(value) => onPatch({ promptLight: value })}
        />
      </div>

      <div>
        <span className={HEAD}>Variantes</span>
        <p className="tiny mt-[2px] mb-[8px]">
          alternatives à la lumière de base, jamais une tenue
        </p>
        <div
          className={`flex flex-col gap-[6px] ${changed.has('variants') ? 'rounded-[8px] border border-warn p-[6px]' : ''}`}
          data-f="variants"
          data-value={draft.variants}
        >
          {variants.map((variant, index) => (
            <div key={index} className="flex items-center gap-[8px]">
              <span className="w-[18px] shrink-0 text-right text-[11px] text-dim2 tabular-nums">
                {index + 1}
              </span>
              <label className="sr-only" htmlFor={`variant-${index}`}>
                variante {index + 1}
              </label>
              <input
                id={`variant-${index}`}
                className="flex-1"
                value={variant}
                onChange={(e) => {
                  const next = [...variants]
                  next[index] = e.target.value
                  writeVariants(next)
                }}
              />
              <button
                type="button"
                className="cursor-pointer rounded-[6px] border-0 bg-transparent px-[6px] text-[15px]
                           leading-none text-dim2 hover:text-bad focus-visible:outline-2
                           focus-visible:outline-focus focus-visible:outline-offset-2"
                aria-label={`Retirer la variante ${index + 1}`}
                onClick={() => writeVariants(variants.filter((_, i) => i !== index))}
              >
                ×
              </button>
            </div>
          ))}
          <button
            type="button"
            className="cursor-pointer self-start rounded-[7px] border border-dashed border-line2
                       bg-transparent px-[11px] py-[6px] text-[12px] text-dim hover:text-txt
                       focus-visible:outline-2 focus-visible:outline-focus focus-visible:outline-offset-2"
            onClick={() => onPatch({ variants: [...variants, ''].join('\n') })}
          >
            <span aria-hidden="true">+ </span>Ajouter une variante
          </button>
        </div>
      </div>

      {/* Le catalogue de templates n'a toujours aucune donnée derrière lui. Une
          zone vide de la taille d'une vraie grille disait « il manque quelque
          chose » à chaque visite ; une ligne dit la même chose et rend la
          place au champ. */}
      <p className="m-0 text-[12px] text-dim2">Templates de lumière réutilisables : bientôt.</p>
    </div>
  )
}
