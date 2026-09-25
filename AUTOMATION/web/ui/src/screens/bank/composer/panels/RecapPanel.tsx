/* Décor et prompt — le fragment qu'on écrit ici, les deux qu'on écrit
   ailleurs, et ce que la jointure donne (design-pass screen-7c §5, option
   5a).

   CE QUE ÇA RETIRE. Le panneau portait quatre `PromptField` dont TROIS
   étaient des miroirs : la lumière, la pose et la tenue s'y éditaient aussi,
   avec un libellé qui disait « même champ que l'onglet Lumière ». Deux
   endroits pour taper la même chose, c'est deux endroits à vérifier quand on
   cherche pourquoi un prompt a bougé. Ne reste éditable que le décor, qui n'a
   pas d'autre maison ; la lumière et la pose se lisent, et « Modifier » mène
   à leur panneau.

   LA CHAÎNE 1-2-3 est l'ordre exact de `composePrompt` : ce que l'aperçu de
   droite montre déjà, dit ici comme une suite d'étapes. Les couleurs viennent
   de `sceneFragments`, et la carte du bas copie `composePrompt(draft)` — rien
   n'est assemblé une seconde fois (invariant 3). */
import { useToast } from '../../../../chrome/ToastContext'
import { composePrompt, type SceneDraft } from '../../../../state/ScenesStoreContext'
import type { SceneField } from '../../sceneChanges'
import { PromptField } from '../PromptField'
import { FRAGMENT_COLORS, sceneFragments } from '../sceneFragments'
import type { SectionKey } from '../sections'
import { HEAD } from './shared'

export function RecapPanel({
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
  const toast = useToast()
  const composed = composePrompt(draft)
  const fragments = sceneFragments(draft)

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
      {/* La chaîne des trois fragments et ce qu'elle donne : côte à côte dès
          que le panneau a la place, l'un sous l'autre sinon. */}
      <div className="grid items-start gap-[18px] @[1200px]:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <div className="flex min-w-0 flex-col gap-[12px]">
        {/* 1 — le seul champ éditable du panneau */}
        <div className="flex gap-[10px]">
          <Step n={1} color={FRAGMENT_COLORS.base} />
          <div className="min-w-0 flex-1">
            <span className={HEAD}>Décor, cadrage</span>
            <div className="mt-[6px]">
              <PromptField
                dataField="prompt_base"
                label="Prompt de base — décor, cadrage"
                hideLabel
                minHeight="min-h-[120px]"
                placeholder="ex : a sunlit kitchen, morning light through the window"
                value={draft.promptBase}
                disabled={worldLinked}
                lockedNote={worldLinked ? lockedNote : undefined}
                accentColor={FRAGMENT_COLORS.base}
                changed={changed.has('promptBase')}
                onChange={(value) => onPatch({ promptBase: value })}
              />
            </div>
            <p className="tiny mt-[6px] mb-0">
              ne décris jamais le visage : le verrou d'identité le porte
            </p>
          </div>
        </div>

        {/* 2 et 3 — en lecture, avec le chemin vers leur panneau */}
        <ReadRow
          n={2}
          color={FRAGMENT_COLORS.light}
          title="Lumière"
          text={draft.promptLight}
          changed={changed.has('promptLight')}
          onGoto={() => onGoto('light')}
        />
        <ReadRow
          n={3}
          color={FRAGMENT_COLORS.pose}
          title="Pose"
          text={draft.promptPose}
          changed={changed.has('promptPose')}
          onGoto={() => onGoto('pose')}
        />
      </div>

      {/* Le prompt tel qu'il sera écrit */}
      <div className="min-w-0 rounded-[10px] border border-line bg-panel">
        <div className="flex items-center justify-between gap-[10px] border-b border-b-line px-[12px] py-[8px]">
          <span className={HEAD}>Prompt enregistré</span>
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
