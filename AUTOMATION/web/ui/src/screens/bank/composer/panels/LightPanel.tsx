/* Lumière — la lumière de la scène, ses variantes, et le catalogue où les
   prendre (design-pass screen-7c §2 ; catalogue : IT-10 chantier 7).

   CE QUE LE CHAMP EST DEVENU. Il était un morceau du prompt, fondu dans le
   texte de la scène à l'enregistrement : rouvrir la scène le rendait vide,
   son texte passé au bout du décor. C'est maintenant `scene.light`, un champ
   à part que le lancement ajoute après le décor — il garde ce qu'on y écrit.
   Il porte du texte libre, ou `@<clé>` : une lumière du catalogue, montrée
   par son libellé et son texte, jamais par sa clé.

   LES VARIANTES sont des lignes numérotées, une image de plus chacune, qu'on
   ajoute et qu'on retire. Une ligne peut aussi être une lumière du
   catalogue. Stockage : `draft.variants`, une variante par ligne.

   LE CATALOGUE remplace la ligne « Templates de lumière : bientôt ». Il ne
   crée rien ici : une lumière se crée dans l'atelier (Lumières), d'où la
   corriger corrige toutes les scènes qui la portent. */
import { Link } from 'react-router-dom'

import { PATHS } from '../../../../app/routes'
import type { SceneDraft } from '../../../../state/ScenesStoreContext'
import { lightLine, lightPromptText, type LightLine } from '../../lights/lightText'
import type { LightEntry } from '../../lights/useLights'
import type { SceneField } from '../../sceneChanges'
import { FragmentTrail } from '../FragmentTrail'
import { PromptField } from '../PromptField'
import type { SectionKey } from '../sections'
import { HEAD } from './shared'

export function LightPanel({
  draft,
  decor,
  lights,
  marker,
  worldLinked,
  lockedNote,
  changed,
  onPatch,
  onGoto,
}: {
  draft: SceneDraft
  /** The décor of the scene's place: the light comes right after it. */
  decor: string
  /** The light catalogue, resolved by the server (IT-10 chantier 7). */
  lights: LightEntry[]
  /** The marker of a line that refers to a light of the catalogue. */
  marker: string
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
  const reference = (key: string) => `${marker}${key}`
  const base = lightLine(draft.promptLight, lights, marker)

  return (
    <div className="flex flex-col gap-[16px]">
      <FragmentTrail
        draft={draft}
        here="light"
        decor={decor}
        light={lightPromptText(draft.promptLight, lights, marker)}
        onGoto={onGoto}
      />

      {/* Le fragment et ses alternatives sont deux choses qu'on compare : côte
          à côte dès que le panneau a la place, empilées en dessous. */}
      <div className="grid items-start gap-[18px] @[1100px]:grid-cols-2">
      <div className="min-w-0">
        <div className="mb-[4px] flex items-baseline justify-between gap-[10px]">
          <span className={HEAD}>Lumière de la scène</span>
          <span className="text-[11px] text-dim2">
            {base.reference ? 'du catalogue' : `${draft.promptLight.length} car.`}
            {changed.has('promptLight') && <b className="ml-[8px] text-warn-txt">modifié</b>}
          </span>
        </div>
        {base.reference ? (
          <div
            className={`flex flex-col gap-[8px] rounded-card border p-[10px] ${
              changed.has('promptLight') ? 'border-warn' : 'border-line'
            }`}
            data-f="prompt_light"
            data-value={draft.promptLight}
          >
            <LineView view={base} line={draft.promptLight.trim()} />
            {worldLinked ? (
              <p className="tiny m-0">{lockedNote}</p>
            ) : (
              <div className="flex flex-wrap gap-[6px]">
                <button
                  type="button"
                  className="btn sm"
                  disabled={!base.text}
                  onClick={() => onPatch({ promptLight: base.text })}
                >
                  Écrire à la main
                </button>
                <button type="button" className="btn sm" onClick={() => onPatch({ promptLight: '' })}>
                  Retirer
                </button>
              </div>
            )}
          </div>
        ) : (
          <PromptField
            dataField="prompt_light"
            label="Lumière de la scène"
            hideLabel
            hint="Ajoutée au prompt au lancement, après le décor du lieu."
            placeholder="ex : golden hour, soft window light"
            value={draft.promptLight}
            disabled={worldLinked}
            lockedNote={worldLinked ? lockedNote : undefined}
            changed={changed.has('promptLight')}
            onChange={(value) => onPatch({ promptLight: value })}
          />
        )}
      </div>

      <div className="min-w-0">
        <span className={HEAD}>Variantes</span>
        <p className="tiny mt-[2px] mb-[8px]">
          une image de plus chacune : son texte s'ajoute à la fin du prompt, après la lumière de
          base — jamais une tenue
        </p>
        <div
          className={`flex flex-col gap-[6px] ${changed.has('variants') ? 'rounded-card border border-warn p-[6px]' : ''}`}
          data-f="variants"
          data-value={draft.variants}
        >
          {variants.map((variant, index) => {
            const view = lightLine(variant, lights, marker)
            return (
              <div key={index} className="flex items-center gap-[8px]">
                <span className="w-[18px] shrink-0 text-right text-[11px] text-dim2 tabular-nums">
                  {index + 1}
                </span>
                {view.reference ? (
                  <div className="min-w-0 flex-1 rounded-[7px] border border-line2 px-[8px] py-[5px]">
                    <LineView view={view} line={variant.trim()} />
                  </div>
                ) : (
                  <>
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
                  </>
                )}
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
            )
          })}
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

      </div>

      {/* Le catalogue : poser une lumière dans le champ, ou en variante. */}
      <section className="flex flex-col gap-[8px]" aria-labelledby="lightCatalogHead" id="lightCatalog">
        <div className="flex items-baseline justify-between gap-[10px]">
          <span className={HEAD} id="lightCatalogHead">Lumières du catalogue</span>
          <Link className="text-[12px] text-dim2" to={PATHS.bankLights}>
            gérer les lumières
          </Link>
        </div>
        {/* « Poser » est grisé sur une scène du monde : le dire ici, où le
            bouton l'est, et pas seulement sous le champ (audit du 26/09). */}
        {worldLinked && lights.length > 0 && (
          <p className="tiny m-0">
            scène du monde : une lumière s'y ajoute en variante ; pour la poser comme lumière de
            base, « Modifier pour ce personnage » en tête de scène
          </p>
        )}
        {lights.length === 0 ? (
          <div className="flex flex-col gap-[8px] rounded-card border border-dashed border-line2 p-[12px] text-[12.5px] text-dim">
            <p className="m-0">
              Aucune lumière dans le catalogue. Une lumière créée dans l'atelier se pose ici, dans
              toutes les scènes qu'on veut ; la corriger là-bas les corrige toutes.
            </p>
            <Link className="btn sm self-start no-underline" to={PATHS.bankLights}>
              Créer une lumière
            </Link>
          </div>
        ) : (
          <ul className="m-0 grid list-none gap-[6px] p-0 @[900px]:grid-cols-2">
            {lights.map((light) => {
              const onField = draft.promptLight.trim() === reference(light.key)
              const unusable = Boolean(light.erreur)
              return (
                <li
                  key={light.key}
                  className="flex items-center gap-[8px] rounded-card border border-line2 px-[10px] py-[7px]"
                  data-catalog-light={light.key}
                >
                  <span className="min-w-0 flex-1 text-[12.5px]">
                    <b className="block truncate font-medium">{light.label || light.key}</b>
                    <span
                      className={`line-clamp-2 font-code text-[11.5px] ${unusable ? 'text-warn-txt' : 'text-dim'}`}
                    >
                      {light.erreur || light.texte}
                    </span>
                  </span>
                  <button
                    type="button"
                    className="btn sm flex-none"
                    data-light-use="field"
                    disabled={worldLinked || unusable || onField}
                    aria-label={`Poser « ${light.label || light.key} » comme lumière de la scène`}
                    onClick={() => onPatch({ promptLight: reference(light.key) })}
                  >
                    {onField ? 'Posée' : 'Poser'}
                  </button>
                  <button
                    type="button"
                    className="btn sm flex-none"
                    data-light-use="variant"
                    disabled={unusable}
                    aria-label={`Ajouter « ${light.label || light.key} » en variante`}
                    onClick={() => writeVariants([...variants, reference(light.key)])}
                  >
                    + variante
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}

/** A reference, said by its label and the text the scene receives. */
function LineView({ view, line }: { view: LightLine; line: string }) {
  return (
    <span className="block min-w-0 text-[12.5px]" data-light-line={line}>
      <span className="flex items-center gap-[6px]">
        <b className="truncate font-medium">{view.label}</b>
        <Link className="flex-none text-[11px] text-dim2" to={PATHS.bankLights}>
          lumière · modifier dans l'atelier
        </Link>
      </span>
      <span className={`block font-code text-[11.5px] ${view.problem ? 'text-warn-txt' : 'text-dim'}`}>
        {view.problem || view.text}
      </span>
    </span>
  )
}
