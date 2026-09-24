/* Entraînement — the training set of the claimed character, and its export.

   WHAT THIS SCREEN IS FOR. `AUTOMATION/entrainement.py` has always been able
   to say what a LoRA would be trained on, what was set aside and why. It only
   ever said it in a terminal. This is that reading, next to the images it
   talks about, plus the one gesture that follows from it.

   WHAT IT DELIBERATELY DOES NOT DO — it does not train. The platform prepares
   the set; the user carries it to a kohya machine. An integrated trainer is
   stage 3 of the 09/09 framing, moved to the dashboard horizon on 10/09. Not
   an omission: a decision, and the copy on screen says so rather than leaving
   a button-shaped hole.

   TWO COLUMNS, AND THE EXPORT NEVER SCROLLS AWAY (design-pass screen-9, §S1).
   The report used to be a centred article with the export gesture 1100 px below
   the verdict that says whether to make it. Reading and acting are one session,
   so they share one screen.

   It composes and lays out; it does not decide. The state and the gestures
   live in `useTrainingSet`, the panels are pure. */
import { Link } from 'react-router-dom'

import { PATHS } from '../../app/routes'
import { useSystemState } from '../../state/SystemStateContext'
import { CorpusFunnel } from './CorpusFunnel'
import { CriteriaList } from './CriteriaList'
import { DiversityBars, type Axis } from './DiversityBars'
import { ExcludedList, type Excluded, type Outlier } from './ExcludedList'
import { ExportHistory } from './ExportHistory'
import { ExportPanel } from './ExportPanel'
import { VerdictBanner } from './VerdictBanner'
import {
  type ActiveSet, type Counters, type Criterion, distribution, verdictSummary,
} from './trainingSummary'
import { useTrainingSet } from './useTrainingSet'

/* The right track is 412 px, not 380: the panel itself is 380 and the gutter
   that keeps it off the window edge lives in the same cell. 332 under 1100 px,
   same arithmetic (§S1). Under 900 the grid becomes a block, the placement
   classes go inert, and the DOM order — verdict, export, rest of the report —
   is exactly the stacking the spec asks for. */
const GRID = `screen grid h-full grid-cols-[minmax(0,1fr)_412px]
              max-[1100px]:grid-cols-[minmax(0,1fr)_332px]
              max-[900px]:flex max-[900px]:flex-col max-[900px]:overflow-y-auto`
/* ONE scroll area for the verdict AND the report. They used to be two grid
   cells with their own overflow, which let the report slide under a pinned
   verdict and cut the four counters in half — the top of a block scrolling
   away while its hints stay. At narrow widths the column DISSOLVES
   (`display:contents`), so the export panel can take its place between the
   verdict and the rest of the report (§S1) without a second DOM order. */
const LEFT = 'min-w-0 overflow-y-auto px-[32px] py-[22px] max-[900px]:contents'
/* `--maxw` is the repo's bound on centred reading width. Without it a 2560 px
   monitor stretches one criterion line across 1650 px. */
const HEAD = `max-w-[var(--maxw)] max-[900px]:order-1 max-[900px]:px-[32px]
              max-[900px]:pt-[22px]`
const REPORT = `max-w-[var(--maxw)] max-[900px]:order-3 max-[900px]:px-[32px]
                max-[900px]:pb-[22px]`
const ASIDE = `overflow-y-auto py-[22px] pr-[32px] max-[900px]:order-2
               max-[900px]:overflow-visible max-[900px]:px-[32px] max-[900px]:pt-0`

/** Same frame as the loaded screen, so nothing jumps when the data lands. */
function Skeleton() {
  const block = (h: string) => (
    <div className={`${h} mb-[14px] rounded-[6px] bg-panel`} />
  )
  return (
    <div aria-hidden="true" className={GRID} id="training">
      <div className={LEFT}>
        <div className={HEAD}>{block('h-[74px]')}</div>
        <div className={REPORT}>
          {block('h-[130px]')}
          {block('h-[170px]')}
          {block('h-[60px]')}
        </div>
      </div>
      <div className={ASIDE}>{block('h-[420px]')}</div>
    </div>
  )
}

export function TrainingScreen() {
  const {
    proposal, past, error, loading, exporting, justExported,
    repetitions, setRepetitions, runExport, reload,
  } = useTrainingSet()
  /* The route refuses an export while a batch runs (409, one GPU and one
     batch), and it is right to. The screen knows it BEFORE the click: leaving
     the button armed buys a refusal the user had no way to foresee. Found on a
     real 409 during a real production, not by reading the route. */
  const { state } = useSystemState()
  const blocked = state?.running
    ? 'une production tourne : l’export attend la fin du lot'
    : null

  if (loading) {
    return <Skeleton />
  }

  if (error) {
    return (
      <div className="screen flex h-full items-start justify-center overflow-y-auto p-[48px_32px]"
           id="training">
        <div className="w-[440px] rounded-[var(--r)] border border-danger-line bg-danger-bg
                        p-[18px]"
             role="alert">
          <b className="flex items-center gap-[8px] text-[15px] font-[650] text-txt">
            <span aria-hidden="true" style={{ color: 'var(--bad)' }}>◆</span>
            Jeu d’entraînement indisponible
          </b>
          {/* The server's own sentence, never rewritten. */}
          <p className="m-0 mt-[6px] text-[12.5px] text-danger-txt">{error}</p>
          <div className="mt-[14px] flex gap-[8px]">
            <button className="btn" onClick={() => void reload()}>Réessayer</button>
            <Link className="btn" to={PATHS.journal}>Voir le journal</Link>
          </div>
        </div>
      </div>
    )
  }

  /* No active reference set is a STATE, not an error: the route answers 200 and
     says so in `blocage`. The gabarit is built in the Revue, so that is where
     the way out points. */
  if (!proposal || !proposal.jeu) {
    return (
      <div className="screen h-full overflow-y-auto" id="training">
        <div className="empty">
          <b>Aucun jeu de référence</b>
          Ce personnage n’a pas encore de jeu de référence : il n’y a rien sur
          quoi entraîner tant que le gabarit n’existe pas.{' '}
          <Link className="link" to={PATHS.review}>La Revue</Link> le construit.
        </div>
      </div>
    )
  }

  const counters = proposal.compteurs as unknown as Counters
  const criteria = proposal.criteres as unknown as Criterion[]
  const captions = proposal.legendes as unknown as { prompt: number; repli_vision: number }

  return (
    <div className={GRID} id="training">
      <h1 className="sr-only">Jeu d’entraînement</h1>

      <div className={LEFT}>
        <div className={HEAD}>
          <VerdictBanner
            blocking={proposal.blocage}
            ready={proposal.pret}
            summary={verdictSummary(criteria, proposal.jeu as ActiveSet, counters)}
          />
        </div>

        <main className={REPORT}>
          <CorpusFunnel counters={counters} shape={distribution(counters)} />

          <div className="grid grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] gap-[28px]
                          max-[1100px]:grid-cols-1 max-[1100px]:gap-[18px]">
            <CriteriaList criteria={criteria} />
            <DiversityBars axes={proposal.diversite as unknown as Record<string, Axis>} />
          </div>

          <ExcludedList
            outliers={proposal.outliers as unknown as Outlier[]}
            rows={proposal.ecartes as unknown as Excluded[]}
          />
        </main>
      </div>

      <aside className={ASIDE}>
        <ExportPanel
          blocked={blocked}
          captions={captions}
          character={proposal.personnage}
          exportable={counters.exportables}
          exporting={exporting}
          onExport={() => void runExport()}
          repetitions={repetitions}
          setRepetitions={setRepetitions}
          trigger={proposal.declencheur}
        />
        {!proposal.pret && counters.exportables > 0 ? (
          <p className="m-0 mt-[10px] text-[12px] text-dim2">
            L’export reste possible même sans proposition : c’est à toi de juger.
          </p>
        ) : null}
        <ExportHistory fresh={justExported} rows={past} />
      </aside>
    </div>
  )
}
