/* The export, always in view. Pure presentation: it receives the counts and the
   gestures, it fetches nothing.

   WHAT IT DELIBERATELY DOES NOT SHOW. The proposal exposes neither the
   reinjected anchor nor the model family — `_pour_le_fil` returns neither, and
   both only exist once an export has run. A line filled from the last export
   would be a number this screen invented, so the line is simply absent. The
   trigger IS exposed, and takes the row.

   THE FOLDER PREVIEW NAMES THE FILES THE EXPORTER REALLY WRITES, read in
   `entrainement._ecrire_recette`: the images live under
   `dataset/<répétitions>_<déclencheur>/`, never `img/`, and `kohya_config.json`
   only exists for a family with an upstream preset (flux has one, sdxl does not
   and that is a written decision). */
type Props = {
  character: string
  exportable: number
  trigger: string
  captions: { prompt: number; repli_vision: number }
  repetitions: string
  setRepetitions: (value: string) => void
  exporting: boolean
  /** Why the gesture cannot run right now, or null. Shown under the button, in
      the same place as the empty-disk reason: a disabled control that does not
      say why is a dead end. */
  blocked: string | null
  onExport: () => void
}

function Row({ term, children }: { term: string; children: React.ReactNode }) {
  return (
    <>
      <dt className="text-[12.5px] text-dim">{term}</dt>
      <dd className="m-0 text-[12.5px] text-txt">{children}</dd>
    </>
  )
}

export function ExportPanel({ character, exportable, trigger, captions,
                             repetitions, setRepetitions, exporting, blocked,
                             onExport }: Props) {
  const byLabeller = captions.repli_vision > 0
  const folder = `${repetitions.trim() || 'N'}_${trigger || 'déclencheur'}`

  return (
    <section className="rounded-[var(--r)] border border-line bg-panel p-[15px]">
      <h2 className="m-0 mb-[12px] text-[15px] font-[650] text-txt">Exporter le jeu</h2>

      <dl className="m-0 mb-[14px] grid grid-cols-[76px_minmax(0,1fr)] gap-x-[10px] gap-y-[7px]">
        <Row term="Images">{exportable}</Row>
        {/* THE DENOMINATOR IS NAMED, and it is not the row above. The route
            counts captions over the whole QUEUE, the export copies what has a
            file on disk: « 2 par le légendeur » under « Images 24 » read as if
            two captions were being written. This line says how long the export
            will take, so it says what it counts. */}
        <Row term="Légendes">
          {byLabeller ? (
            <span className="text-warn-txt">
              {captions.repli_vision} sur {captions.prompt + captions.repli_vision} par
              le légendeur, plusieurs minutes
            </span>
          ) : (
            <span style={{ color: 'var(--ok)' }}>
              toutes depuis le prompt · quelques secondes
            </span>
          )}
        </Row>
        {trigger ? (
          <Row term="Déclencheur"><code className="font-code text-[11.5px]">{trigger}</code></Row>
        ) : null}
      </dl>

      <div className="mb-[14px]">
        <label className="mb-[5px] block text-[12.5px] text-dim" htmlFor="trainRepetitions">
          Répétitions par image
        </label>
        <input
          className="w-[92px] rounded-[8px] border border-line2 bg-panel2 px-[10px] py-[7px]
                     text-[13.5px] text-txt"
          id="trainRepetitions"
          min={1}
          onChange={(event) => setRepetitions(event.target.value)}
          placeholder="défaut"
          type="number"
          value={repetitions}
        />
        <p className="m-0 mt-[5px] text-[12px] text-dim2">
          Vide = défaut proposé. C’est un réglage d’entraînement : il te revient.
        </p>
      </div>

      <div className="mb-[14px] rounded-[6px] border border-line2 bg-panel p-[10px]
                      font-code text-[11.5px] leading-[1.6] text-dim">
        <div className="text-dim2">PROD/_ENTRAINEMENT/{character}/</div>
        <div className="pl-[10px] text-dim2">&lt;date&gt;-&lt;heure&gt;/</div>
        <div className="pl-[20px]">dataset/{folder}/</div>
        <div className="pl-[30px] text-dim2">{exportable} image(s) + leurs légendes</div>
        <div className="pl-[20px]">manifeste.json</div>
        <div className="pl-[20px]">dataset.toml · entrainer.sh</div>
        <div className="pl-[20px]">
          kohya_config.json <span className="text-dim2">si la famille a un preset</span>
        </div>
      </div>

      <button
        className="btn primary h-[38px] w-full"
        disabled={exporting || exportable === 0 || blocked !== null}
        id="btnTrainExport"
        onClick={onExport}
      >
        {exporting ? 'Export en cours…' : `Exporter ${exportable} image(s)`}
      </button>
      {exportable === 0 ? (
        <p className="m-0 mt-[6px] text-[12px] text-warn-txt">
          aucune image de la file n’a de fichier sur le disque
        </p>
      ) : blocked ? (
        <p className="m-0 mt-[6px] text-[12px] text-warn-txt">{blocked}</p>
      ) : null}

      <p className="m-0 mt-[12px] text-[12px] text-dim2">
        Ne lance pas d’entraînement. Le dossier part tel quel sur une machine
        kohya : <code className="font-code">bash entrainer.sh</code> après avoir
        vérifié les chemins en tête du script.
      </p>
    </section>
  )
}
