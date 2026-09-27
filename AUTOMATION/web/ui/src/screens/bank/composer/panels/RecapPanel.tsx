/* Scène et prompt — le texte qu'on écrit ici, les deux fragments qu'on écrit
   ailleurs, le lieu qu'on choisit, et ce que la jointure donne (design-pass
   screen-7c §5, option 5a ; lieu : IT-11 chantier 5).

   CE QUE ÇA RETIRE. Le panneau portait quatre `PromptField` dont TROIS
   étaient des miroirs : la lumière, la pose et la tenue s'y éditaient aussi,
   avec un libellé qui disait « même champ que l'onglet Lumière ». Deux
   endroits pour taper la même chose, c'est deux endroits à vérifier quand on
   cherche pourquoi un prompt a bougé. Ne restent éditables que le texte de la
   scène et son lieu, qui n'ont pas d'autre maison ; la lumière et la pose se
   lisent, et « Modifier » mène à leur panneau.

   LA CHAÎNE 1-2-3-4 est l'ordre exact de la jointure : `composePrompt` pour
   le texte et la pose, puis le décor du lieu, que `worlds.materialize`
   ajoute au lancement, puis la lumière de la scène, qui les suit depuis
   IT-10 c7 (`lights.resolve_bank`). Les couleurs et le découpage
   viennent de `sceneFragments`, comme pour l'aperçu de droite (invariant 3). */
import type { Enhancer } from '../../../../api/useEnhance'
import { useToast } from '../../../../chrome/ToastContext'
import type { SceneDraft } from '../../../../state/ScenesStoreContext'
import type { WorldPlace } from '../../../worlds/useWorldCatalog'
import type { LibraryPick } from '../../assets/libraryPicks'
import { lightPromptText } from '../../lights/lightText'
import type { LightEntry } from '../../lights/useLights'
import type { SceneField } from '../../sceneChanges'
import { PromptField } from '../PromptField'
import { FRAGMENT_COLORS, decorOf, sceneFragments } from '../sceneFragments'
import type { SectionKey } from '../sections'
import { HEAD } from './shared'

export function RecapPanel({
  draft,
  places,
  lights,
  lightMarker,
  library,
  worldLinked,
  lockedNote,
  changed,
  onPatch,
  onGoto,
  enhancer,
}: {
  draft: SceneDraft
  /** The places of the character's world (IT-11 chantier 5). */
  places: WorldPlace[]
  /** The light catalogue: the scene's light may be a key (IT-10 c7). */
  lights: LightEntry[]
  lightMarker: string
  /** Imported assets whose fragment lands in `prompt` (IT-10 chantier 5). */
  library: LibraryPick[]
  worldLinked: boolean
  lockedNote: string
  changed: Set<SceneField>
  onPatch: (patch: Partial<SceneDraft>) => void
  onGoto: (section: SectionKey) => void
  /** « Améliorer » on the prompt fragment (IT-10 chantier 8). */
  enhancer?: Enhancer
}) {
  const toast = useToast()
  const decor = decorOf(places, draft.place)
  const lightText = lightPromptText(draft.promptLight, lights, lightMarker)
  const fragments = sceneFragments(draft, decor, lightText)
  const composed = fragments.map((fragment) => fragment.text).join(', ')
  /* A key the world no longer carries stays listed, rather than vanish from
     the selector — hence from the scene; the save then names it. */
  const placeOptions = places.map((p) => [p.id, p.label || p.id] as [string, string])
  if (draft.place && !places.some((p) => p.id === draft.place)) {
    placeOptions.push([draft.place, `${draft.place} (absent du monde)`])
  }

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(composed)
      toast('Prompt copié')
    } catch {
      toast('copie impossible — le presse-papier a refusé')
    }
  }

  return (
    <div className="flex flex-col gap-[16px]">
      {/* La chaîne des fragments et ce qu'elle donne : côte à côte dès
          que le panneau a la place, l'un sous l'autre sinon. */}
      <div className="grid items-start gap-[18px] @[1200px]:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <div className="flex min-w-0 flex-col gap-[12px]">
        {/* 1 — ce qui se passe dans ce lieu */}
        <div className="flex gap-[10px]">
          <Step n={1} color={FRAGMENT_COLORS.base} />
          <div className="min-w-0 flex-1">
            <span className={HEAD}>Ce qui s'y passe</span>
            <div className="mt-[6px]">
              <PromptField
                dataField="prompt_base"
              enhancer={enhancer}
              enhanceKind="scene"
                label="Ce qui s'y passe — action, cadrage"
                hideLabel
                minHeight="min-h-[120px]"
                placeholder="ex : cooking breakfast, seen from the doorway"
                value={draft.promptBase}
                disabled={worldLinked}
                lockedNote={worldLinked ? lockedNote : undefined}
                accentColor={FRAGMENT_COLORS.base}
                changed={changed.has('promptBase')}
                onChange={(value) => onPatch({ promptBase: value })}
              />
            </div>
            {/* Les décors importés (IT-10 chantier 5). Le fragment REMPLIT un
                champ vide et s'AJOUTE en fin de texte sinon : il n'écrase
                jamais ce qui est écrit — le précédent du texte de pose, qui ne
                remplit « En mots » que s'il est vide. */}
            {!worldLinked && library.length > 0 && (
              <div className="mt-[8px] flex items-center gap-[8px]">
                <label className="lab flex-none" htmlFor="decorFromLibrary">
                  Depuis la bibliothèque
                </label>
                <select
                  id="decorFromLibrary"
                  className="!w-auto"
                  value=""
                  onChange={(event) => {
                    const pick = library.find((p) => p.key === event.target.value)
                    if (!pick?.fragment) return
                    const current = draft.promptBase.trim()
                    onPatch({ promptBase: current ? `${current}, ${pick.fragment}` : pick.fragment })
                    toast(current ? `« ${pick.label} » ajouté à la fin` : `« ${pick.label} » repris`)
                  }}
                >
                  <option value="">choisir un décor…</option>
                  {library.map((pick) => (
                    <option key={pick.key} value={pick.key} disabled={!pick.fragment}>
                      {pick.label}
                      {pick.fragment ? '' : ' — sans fragment'}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <p className="tiny mt-[6px] mb-0">
              ne décris jamais le visage : le verrou d'identité le porte
            </p>
          </div>
        </div>

        {/* 2 — la pose, en lecture, avec le chemin vers son panneau */}
        <ReadRow
          n={2}
          color={FRAGMENT_COLORS.pose}
          title="Pose"
          text={draft.promptPose}
          changed={changed.has('promptPose')}
          onGoto={() => onGoto('pose')}
        />

        {/* 3 — le lieu : un décor du monde, choisi par sa clé. Son texte
            rejoint la chaîne au lancement (ADR-0027 §4) : une correction du
            lieu atteint donc aussi cette scène. */}
        <div className="flex gap-[10px]">
          <Step n={3} color={FRAGMENT_COLORS.place} />
          <div className="flex min-w-0 flex-1 flex-col gap-[6px]">
            <label className={HEAD} htmlFor="scenePlace">
              Lieu
            </label>
            <select
              id="scenePlace"
              data-f="place"
              className={`!w-auto max-w-[360px] ${changed.has('place') ? 'border-warn!' : ''}`}
              value={draft.place}
              disabled={worldLinked}
              aria-describedby="scenePlaceNote"
              onChange={(e) => onPatch({ place: e.target.value })}
            >
              <option value="">— aucun lieu —</option>
              {placeOptions.map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
            <p className="tiny m-0" id="scenePlaceNote">
              {worldLinked
                ? 'lieu repris du monde'
                : places.length
                  ? 'le décor du monde, ajouté au prompt au lancement, avant la lumière'
                  : 'ce monde ne porte encore aucun lieu (Référentiel › Mondes)'}
            </p>
          </div>
        </div>

        {/* 4 — la lumière, en lecture, avec le chemin vers son panneau : elle
            rejoint la chaîne après le décor (IT-10 c7). */}
        <ReadRow
          n={4}
          color={FRAGMENT_COLORS.light}
          title="Lumière"
          text={lightText}
          changed={changed.has('promptLight')}
          onGoto={() => onGoto('light')}
        />
      </div>

      {/* Le prompt tel que le lancement le compose, décor du lieu compris */}
      <div className="min-w-0 rounded-[10px] border border-line bg-panel">
        <div className="flex items-center justify-between gap-[10px] border-b border-b-line px-[12px] py-[8px]">
          <span className={HEAD}>Prompt au lancement</span>
          <div className="flex items-center gap-[10px]">
            <span className="text-[11px] text-dim2">{composed.length} car.</span>
            <button type="button" className="btn sm" onClick={() => void onCopy()}>
              Copier
            </button>
          </div>
        </div>
        <p className="m-0 px-[12px] py-[10px] text-[12.5px] leading-relaxed" id="scenePromptJoined">
          {fragments.length === 0 ? (
            <span className="text-dim">— vide —</span>
          ) : (
            fragments.map((fragment, index) => (
              <span key={fragment.key}>
                <span
                  className="rounded-[3px] px-[2px] py-px"
                  style={{
                    color: fragment.color,
                    backgroundColor: `color-mix(in srgb, ${fragment.color} 18%, transparent)`,
                  }}
                >
                  {fragment.text}
                </span>
                {index < fragments.length - 1 && <span className="text-dim">, </span>}
              </span>
            ))
          )}
        </p>
      </div>
      </div>

      <p className="m-0 text-[12px] text-dim2">
        Ajouté à la génération, hors de ce prompt : la tenue du niveau demandé (
        <button
          type="button"
          className="cursor-pointer border-0 bg-transparent p-0 text-[12px] text-dim underline
                     decoration-dotted underline-offset-2 hover:text-txt focus-visible:outline-2
                     focus-visible:outline-focus focus-visible:outline-offset-2"
          onClick={() => onGoto('clothing')}
        >
          Vêtements
        </button>
        ) · le verrou d'identité.
      </p>
    </div>
  )
}

function Step({ n, color }: { n: number; color: string }) {
  return (
    <span
      aria-hidden="true"
      className="flex h-[22px] w-[22px] flex-none items-center justify-center rounded-[50%]
                 text-[11px] font-semibold"
      style={{ color, backgroundColor: `color-mix(in srgb, ${color} 18%, transparent)` }}
    >
      {n}
    </span>
  )
}

function ReadRow({
  n,
  color,
  title,
  text,
  changed,
  onGoto,
}: {
  n: number
  color: string
  title: string
  text: string
  changed: boolean
  onGoto: () => void
}) {
  return (
    <div className="flex items-center gap-[10px]">
      <Step n={n} color={color} />
      <div className="flex min-w-0 flex-1 items-center gap-[10px] rounded-card border border-line
                      bg-panel px-[10px] py-[8px]">
        <span className={`${HEAD} flex-none`}>{title}</span>
        <span className="min-w-0 flex-1 truncate text-[12.5px] text-dim">
          {text.trim() || <span className="text-dim2">vide</span>}
        </span>
        {changed && (
          <span className="flex-none text-[11px] text-warn-txt">
            <span aria-hidden="true" className="mr-[4px] inline-block h-[6px] w-[6px] rounded-[50%] bg-warn align-middle" />
            modifié
          </span>
        )}
        <button type="button" className="btn sm flex-none" onClick={onGoto}>
          Modifier
        </button>
      </div>
    </div>
  )
}
