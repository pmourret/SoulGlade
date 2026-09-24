/* One line per criterion, with its verdict spelled in words. Pure presentation.

   THREE VERDICTS, NOT TWO. A criterion with no configured threshold is neither
   held nor missed: it is unjudgeable, and saying so is more useful than
   deciding. `entrainement.py` refuses to default it (invariant 4), and this
   list refuses to fold it into « manque ».

   The shape and the colour repeat the word, they never replace it. */
import type { Criterion } from './trainingSummary'

const VERDICTS: Record<string, { mark: string; word: string; color: string }> = {
  tenu: { mark: '●', word: 'tenu', color: 'var(--ok)' },
  manque: { mark: '◆', word: 'manque', color: 'var(--bad)' },
  'sans seuil': { mark: '■', word: 'sans seuil', color: 'var(--warn)' },
}

export function CriteriaList({ criteria }: { criteria: Criterion[] }) {
  return (
    <section>
      <h2 className="m-0 mb-[10px] text-[10.5px] font-normal uppercase tracking-[.5px] text-dim">
        Critères
      </h2>
      <ul className="m-0 list-none p-0">
        {criteria.map((criterion) => {
          const verdict = VERDICTS[criterion.verdict] ?? VERDICTS['sans seuil']
          return (
            <li key={criterion.nom}
                className="grid grid-cols-[96px_minmax(0,1fr)] items-baseline gap-[10px]
                           border-b border-line py-[7px] last:border-b-0">
              <b className="flex items-center gap-[6px] text-[12.5px] font-[600]"
                 style={{ color: verdict.color }}>
                <span aria-hidden="true">{verdict.mark}</span>
                {verdict.word}
              </b>
              <span className="text-[13px] text-txt">{criterion.message}</span>
            </li>
          )
        })}
      </ul>
      <p className="m-0 mt-[10px] text-[12px] text-dim2">
        Un seuil absent ne devient jamais une valeur par défaut : il se mesure
        par personnage.
      </p>
    </section>
  )
}
