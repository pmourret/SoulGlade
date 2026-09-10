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

   It composes and lays out; it does not decide. The state and the gestures
   live in `useTrainingSet`, the panels are pure. */
import { ExcludedList, type Excluded } from './ExcludedList'
import { ExportHistory } from './ExportHistory'
import { ProposalPanel } from './ProposalPanel'
import { useTrainingSet } from './useTrainingSet'

export function TrainingScreen() {
  const {
    proposal, past, error, loading, exporting,
    repetitions, setRepetitions, runExport,
  } = useTrainingSet()

  const exportable = (proposal?.compteurs as Record<string, number> | undefined)?.exportables ?? 0
  const captions = proposal?.legendes as { repli_vision: number } | undefined

  return (
    <div className="screen" id="training">
      <div className="wrap">
        <h2>Jeu d’entraînement</h2>
        <p className="tiny mt-0 mb-[18px]">
          Sur quoi un LoRA d’identité serait entraîné pour ce personnage, et ce
          qui manque pour y aller. La plateforme prépare le jeu&nbsp;;
          l’entraînement se fait ailleurs, sur une machine kohya.
        </p>

        {error ? (
          <div className="empty" role="alert">
            <b>Jeu d’entraînement indisponible</b>
            {error}
          </div>
        ) : loading ? (
          <div className="empty">chargement…</div>
        ) : proposal ? (
          <>
            <ProposalPanel proposal={proposal} />
            <ExcludedList rows={proposal.ecartes as unknown as Excluded[]} />

            <section className="meta mt-[22px]">
              <h3 className="m-0 mb-[4px] text-[15px] font-semibold text-txt">
                Exporter le jeu
              </h3>
              <p className="tiny mt-0 mb-[12px]">
                Copie les {exportable} image(s) exportable(s) et l’ancre dans un
                dossier daté, avec leurs légendes, le manifeste,{' '}
                <code>dataset.toml</code> et <code>entrainer.sh</code>.
                {captions?.repli_vision
                  ? ` ${captions.repli_vision} légende(s) demanderont le légendeur : compter plusieurs minutes.`
                  : ' Toutes les légendes viennent du prompt : compter quelques secondes.'}
              </p>
              <div className="flex flex-wrap items-center gap-[12px]">
                <label className="tiny" htmlFor="trainRepetitions">
                  Répétitions par image
                </label>
                <input
                  id="trainRepetitions"
                  type="number"
                  min={1}
                  className="w-[92px] rounded-[8px] border border-line2 bg-panel2
                             px-[10px] py-[7px] text-[13.5px] text-txt"
                  placeholder="défaut"
                  value={repetitions}
                  onChange={(event) => setRepetitions(event.target.value)}
                />
                <button
                  className="btn primary"
                  id="btnTrainExport"
                  disabled={exporting || exportable === 0}
                  onClick={() => void runExport()}
                >
                  {exporting ? 'export en cours…' : 'Exporter le jeu'}
                </button>
                <span className="tiny">
                  {exportable === 0
                    ? 'aucune image de la file n’a de fichier sur le disque'
                    : 'laisser vide garde le défaut proposé — c’est un réglage d’entraînement, il te revient'}
                </span>
              </div>
            </section>

            <ExportHistory rows={past} />
          </>
        ) : (
          <div className="empty">
            <b>Aucune donnée</b>
            ce personnage n’a pas encore de jeu de référence
          </div>
        )}
      </div>
    </div>
  )
}
