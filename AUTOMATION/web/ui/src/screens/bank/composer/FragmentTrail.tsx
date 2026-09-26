/* Le fil de contexte : où se trouve le fragment qu'on édite dans le prompt
   composé, et ce qu'il y a autour (design-pass screen-7c §2.1).

   POURQUOI. Un panneau qui montre UN champ ne dit pas ce que le prompt final
   dira : on écrit une lumière sans voir le décor qu'elle éclaire. Les trois
   cases disent l'ordre de la jointure et ce que portent les deux voisins, et
   un clic y mène. C'est le même découpage que l'aperçu de droite, jamais une
   concaténation locale : `sceneFragments`, et rien d'autre (invariant 3). */
import type { SceneDraft } from '../../../state/ScenesStoreContext'
import { FRAGMENT_COLORS, sceneFragments } from './sceneFragments'
import type { SectionKey } from './sections'

/** Where each fragment is edited — the trail's own click target. The décor of
    the place is not a fragment of this form: the Prompt panel shows it. */
type FormFragment = Exclude<keyof typeof FRAGMENT_COLORS, 'place'>
const HOME: Record<FormFragment, { section: SectionKey; label: string }> = {
  base: { section: 'recap', label: 'scène' },
  light: { section: 'light', label: 'lumière' },
  pose: { section: 'pose', label: 'pose' },
}

export function FragmentTrail({
  draft,
  here,
  onGoto,
}: {
  draft: SceneDraft
  /** The fragment this panel edits: its box is marked « ici » and is not a
      link to somewhere one already is. */
  here: FormFragment
  onGoto: (section: SectionKey) => void
}) {
  const found = sceneFragments(draft)

  return (
    <div className="flex items-stretch gap-[6px]" aria-label="Place de ce fragment dans le prompt">
      {(Object.keys(HOME) as FormFragment[]).map((key, index) => {
        const fragment = found.find((f) => f.key === key)
        const home = HOME[key]
        const onHere = key === here
        const body = (
          <>
            <span className="flex items-center gap-[5px] text-[10.5px] tracking-[.5px] uppercase">
              <span
                aria-hidden="true"
                className="h-[7px] w-[7px] flex-none rounded-[2px]"
                style={{ backgroundColor: FRAGMENT_COLORS[key] }}
              />
              {home.label}
              {onHere && <b className="text-txt normal-case">· ici</b>}
            </span>
            <span className="mt-[3px] block truncate text-[11.5px]">
              {fragment ? fragment.text : <span className="text-dim2">vide</span>}
            </span>
          </>
        )
        return (
          <div key={key} className="flex min-w-0 flex-1 items-stretch gap-[6px]">
            {index > 0 && (
              <span aria-hidden="true" className="self-center text-[12px] text-dim2">
                ,
              </span>
            )}
            {onHere ? (
              <div className="min-w-0 flex-1 rounded-[7px] border border-line2 bg-panel2 px-[9px] py-[6px] text-dim">
                {body}
              </div>
            ) : (
              <button
                type="button"
                className="min-w-0 flex-1 cursor-pointer rounded-[7px] border border-line
                           bg-transparent px-[9px] py-[6px] text-left text-dim2 hover:text-dim
                           focus-visible:outline-2 focus-visible:outline-focus
                           focus-visible:-outline-offset-2"
                aria-label={`Modifier le fragment ${home.label}`}
                onClick={() => onGoto(home.section)}
              >
                {body}
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}
