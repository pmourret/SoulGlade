/* The proposal, read. Pure presentation: props in, nothing fetched here.

   WHAT IT REFUSES TO SIMPLIFY. Four numbers look like one and are not:

     - the QUEUE reasons on embeddings, which survive in the database after the
       PNG is gone. The EXPORTABLE count is what has a file on disk. At Lena's
       10/09 state: 27 and 24;
     - a NEVER-LABELLED image enters the queue, and is counted apart — its
       absence of defect is assumed, not known;
     - a DERIVED image was produced under a LoRA of this character. Training v2
       on it without knowing is the self-consuming loop;
     - a criterion with NO THRESHOLD is neither held nor missed: it is
       unjudgeable, and saying so is more useful than deciding.

   Merging any of them into « 27 images prêtes » would be a count that hides
   its own margin, which is a false count. */
import type { Proposal } from './useTrainingSet'

const AXIS_LABELS: Record<string, string> = {
  scene: 'scène',
  intention: 'intention',
  ton: 'ton',
  format: 'format',
}

/* The three verdicts a criterion can carry, spelled in words. Never colour
   alone (frontend.md, WCAG 2.2 AA): the word IS the status, the colour only
   repeats it. */
const VERDICTS: Record<string, { mark: string; token: string }> = {
  tenu: { mark: 'tenu', token: 'var(--ok)' },
  manque: { mark: 'manque', token: 'var(--bad)' },
  'sans seuil': { mark: 'sans seuil', token: 'var(--warn)' },
}

/* `data-count` is the reading contract, an explicit attribute rather than an
   assumption about markup — same convention as `data-s` on the navbar. It is
   what the smoke test reads to check the screen shows the SAME numbers the
   route returned. */
function Count({ k, term, value, hint }:
                { k: string; term: string; value: number; hint?: string }) {
  return (
    <div>
      <dt>{term}</dt>
      <dd className="mb-[9px] text-[19px] tabular-nums" data-count={k}>
        {value}
        {hint ? <span className="tiny"> {hint}</span> : null}
      </dd>
    </div>
  )
}

/* A standalone label with the look of a `.meta dt`, where there is no dt/dd
   pair to hang it on. A bare `<dt>` outside a `<dl>` is invalid markup, and a
   screen reader announces it as nothing in particular. */
function Label({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <h3 className={`m-0 text-[11.5px] font-normal uppercase tracking-[.5px] text-dim ${className}`}>
      {children}
    </h3>
  )
}

export function ProposalPanel({ proposal }: { proposal: Proposal }) {
  const c = proposal.compteurs as Record<string, number>
  const diversity = proposal.diversite as Record<
    string, { distinctes: number; effectives: number; sans: number }>
  const criteria = proposal.criteres as {
    nom: string; verdict: string; message: string }[]
  const outliers = proposal.outliers as {
    fichier: string; score: number; z: number }[]
  const captions = proposal.legendes as { prompt: number; repli_vision: number }

  return (
    <>
      <div
        className="meta mb-[14px]"
        style={{
          borderColor: proposal.pret ? 'var(--ok)' : 'var(--warn-line)',
          background: proposal.pret ? 'var(--panel)' : 'var(--warn-bg)',
        }}
        role="status"
      >
        <b className="text-[15px]">
          {proposal.pret
            ? 'Proposition d’entraînement prête'
            : 'Pas de proposition d’entraînement'}
        </b>
        {proposal.blocage ? (
          <p className="tiny mt-[5px] mb-0" style={{ color: 'var(--warn-txt)' }}>
            {proposal.blocage}
          </p>
        ) : null}
      </div>

      <div className="mb-[14px] grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-[14px]">
        <div className="meta">
          <dl className="m-0 grid grid-cols-2 gap-x-[14px]">
            <Count k="file" term="Dans la file" value={c.file} />
            <Count k="exportables" term="Exportables" value={c.exportables}
                   hint={c.sans_fichier ? `${c.sans_fichier} sans fichier` : undefined} />
            <Count k="ecartes" term="Écartées" value={c.ecartes} hint="défaut objectif" />
            <Count k="sans_etiquette" term="Jamais étiquetées" value={c.sans_etiquette} />
          </dl>
          <p className="tiny mt-[2px] mb-0">
            La file raisonne sur des <b>empreintes</b>, qui survivent en base à la
            disparition du PNG ; l’entraînement a besoin du fichier. Les deux
            nombres ne sont pas le même.
          </p>
        </div>

        <div className="meta">
          <dl className="m-0">
            <dt>Cohésion de la file</dt>
            <dd className="mb-[9px]">
              {proposal.cohesion == null ? '—' : proposal.cohesion.toFixed(4)}
              {proposal.ecart_type != null && (
                <span className="tiny"> · écart-type {proposal.ecart_type.toFixed(4)}</span>
              )}
            </dd>
            <dt>Gabarit actif</dt>
            <dd className="mb-[9px]">
              {proposal.jeu
                ? <>
                    #{(proposal.jeu as Record<string, unknown>).id as number}
                    <span className="tiny">
                      {' '}· santé {Number((proposal.jeu as Record<string, unknown>).sante).toFixed(3)}
                      {' '}· {String((proposal.jeu as Record<string, unknown>).modele_embedding ?? '—')}
                    </span>
                  </>
                : 'aucun'}
            </dd>
            <dt>Produites sous un LoRA</dt>
            <dd className="mb-0">
              {c.derives}
              {c.derives ? <span className="tiny"> · réinjecter l’ancre évite la boucle</span> : null}
            </dd>
          </dl>
        </div>
      </div>

      <div className="mb-[14px] grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-[14px]">
        <div className="meta">
          <Label className="mb-[8px]">Diversité — catégories effectives</Label>
          <table>
            <thead>
              <tr>
                <th>axe</th>
                <th>distinctes</th>
                <th>effectives</th>
                <th>sans donnée</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(diversity).map(([axis, v]) => (
                <tr key={axis}>
                  <td>{AXIS_LABELS[axis] ?? axis}</td>
                  <td className="num">{v.distinctes}</td>
                  <td className="num">{v.effectives.toFixed(1)}</td>
                  <td className="num">{v.sans || ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="tiny mt-[8px] mb-0">
            Un compte de valeurs distinctes mentirait : dix quasi-doublons font
            une seule observation, pas dix.
          </p>
        </div>

        <div className="meta">
          <Label className="mb-[8px]">Critères</Label>
          <ul className="m-0 list-none p-0">
            {criteria.map((criterion) => {
              const v = VERDICTS[criterion.verdict] ?? VERDICTS['sans seuil']
              return (
                <li key={criterion.nom} className="mb-[7px] text-[13px]">
                  <b style={{ color: v.token }}>{v.mark}</b>
                  <span> — {criterion.message}</span>
                </li>
              )
            })}
          </ul>
          <p className="tiny mt-[8px] mb-0">
            Un seuil absent ne devient jamais une valeur par défaut : il se
            mesure par personnage, dans le bloc <code>entrainement</code> du{' '}
            <code>config.json</code>.
          </p>
          <Label className="mt-[14px] mb-[6px]">Légendes à venir</Label>
          <p className="tiny m-0">
            {captions.prompt} depuis le prompt (gratuit)
            {captions.repli_vision
              ? <> · <b>{captions.repli_vision} par le légendeur</b>, qui appelle
                  ComfyUI et peut prendre plusieurs minutes chacune</>
              : ' · aucune ne demande le légendeur'}
          </p>
        </div>
      </div>

      {outliers.length > 0 && (
        <details className="adv">
          <summary>{outliers.length} image(s) atypique(s) — signalées, jamais écartées seules</summary>
          <table>
            <thead>
              <tr>
                <th>fichier</th>
                <th>score</th>
                <th>z</th>
              </tr>
            </thead>
            <tbody>
              {outliers.map((o) => (
                <tr key={o.fichier}>
                  <td>{o.fichier}</td>
                  <td className="num">{o.score.toFixed(3)}</td>
                  <td className="num">{o.z.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      )}
    </>
  )
}
