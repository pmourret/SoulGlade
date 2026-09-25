/* Amélioration IA — la mise en page, et rien derrière (design-pass screen-7c
   §6, option 6a).

   CE QU'IL MANQUE, ET POURQUOI C'EST DIT PLUTÔT QUE CACHÉ. La route qui
   réécrirait les trois fragments à partir d'une consigne n'existe pas encore
   (hors périmètre du chantier). Le panneau montre donc la forme du geste —
   une consigne, des raccourcis, un bouton — désactivée, avec la phrase qui
   dit ce qui manque. Même règle que `ToolRail` pour un outil inerte : la
   capacité est NOMMÉE, jamais inventée.

   CE QUI A DISPARU EN ATTENDANT : les deux textarea en lecture seule qui
   répétaient le prompt composé, et un « Sauvegarder le prompt IA » qui ne
   sauvegardait rien. Une zone de comparaison vide ne se rend pas non plus :
   elle arrivera avec la route, construite sur `WordDiff`. */
import { composePrompt, type SceneDraft } from '../../../../state/ScenesStoreContext'
import { HEAD } from './shared'

const SHORTCUTS = [
  'Plus naturel',
  'Plus court',
  'Plus précis sur la lumière',
  'Style photo amateur',
]

export function AiPanel({ draft }: { draft: SceneDraft }) {
  const composed = composePrompt(draft)

  return (
    /* Un champ et quatre puces : ce panneau garde sa mesure de lecture plutôt
       que de s'étaler sur toute la colonne, il n'a rien à y mettre. */
    <div className="flex max-w-[880px] flex-col gap-[14px]">
      <div className="rounded-card border border-line bg-panel px-[12px] py-[10px]">
        <span className={HEAD}>Prompt de départ</span>
        <p className="m-0 mt-[4px] text-[12.5px] text-dim">
          {composed || <span className="text-dim2">— vide —</span>}
        </p>
      </div>

      <div>
        <label className="tiny mb-[4px] block" htmlFor="aiInstruction">
          Consigne
        </label>
        <input
          id="aiInstruction"
          placeholder="ex : rends la lumière plus douce, garde le cadrage"
          disabled
          value=""
          readOnly
        />
        <div className="mt-[8px] flex flex-wrap gap-[6px]">
          {SHORTCUTS.map((shortcut) => (
            <button
              key={shortcut}
              type="button"
              disabled
              className="cursor-not-allowed rounded-[999px] border border-line2 bg-transparent
                         px-[11px] py-[5px] text-[12px] text-dim opacity-50"
            >
              {shortcut}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-[12px]">
        <button type="button" className="btn primary" disabled>
          Proposer
        </button>
        <span className="text-[12px] text-dim2">Arrivera avec le branchement du modèle.</span>
      </div>
    </div>
  )
}
