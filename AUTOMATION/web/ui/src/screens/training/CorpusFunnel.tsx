/* From the corpus to the set: four counters that never merge, and a bar that
   makes them readable without inventing a total. Pure presentation.

   THE BAR NEVER ANNOUNCES A SUM. Its three parts are disjoint by construction
   (see `trainingSummary.ts`), the legend carries every number, and the drawing
   itself is `aria-hidden` — nothing is said by the colour alone.

   THE NEVER-LABELLED ONES ARE NOT A FOURTH PART. They are a subset of the
   queue, and the response never says how they cross the images missing from
   disk. Drawing them over the left of the bar would claim they are exportable.
   They get a sub-band spanning the queue alone. */
import { SectionHead } from './SectionHead'
import { type Counters, type Distribution, percent } from './trainingSummary'

/* Hatching, not a flat: the same ground would read as a fourth disjoint part,
   which is exactly what it is not. */
const HATCH = 'repeating-linear-gradient(45deg,var(--warn) 0 2px,transparent 2px 5px)'

function Case({ term, k, value, hint }:
              { term: string; k: string; value: number; hint?: string }) {
  return (
    <div className="border-l border-line px-[16px] first:border-l-0">
      <dt className="text-[12px] text-dim">{term}</dt>
      {/* `data-count` is the reading contract — the smoke test compares what is
          on screen with what the route returned, and reads the FIRST child, so
          the number stays the first node. */}
      <dd className="m-0 text-[26px] font-[650] leading-[1.15] tabular-nums text-txt"
          data-count={k}>
        {value}
        {hint ? (
          <span className="mt-[2px] block text-[12px] font-normal leading-[1.35] text-dim2">
            {hint}
          </span>
        ) : null}
      </dd>
    </div>
  )
}

function Pill({ color, hatched }: { color?: string; hatched?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className="inline-block h-[9px] w-[9px] shrink-0 rounded-[2px]"
      style={hatched ? { backgroundImage: HATCH } : { background: color }}
    />
  )
}

export function CorpusFunnel({ counters, shape }:
                             { counters: Counters; shape: Distribution }) {
  return (
    <section className="mb-[22px]" id="corpusFunnel">
      <SectionHead
        rule="la file raisonne sur des empreintes, l’entraînement a besoin du fichier"
        title="Du corpus au jeu"
      />

      <dl className="m-0 grid grid-cols-4 rounded-[6px] border border-line p-[14px_2px]">
        <Case term="Dans la file" k="file" value={counters.file}
              hint="empreintes en base" />
        <Case term="Exportables" k="exportables" value={counters.exportables}
              hint={counters.sans_fichier
                ? `${counters.sans_fichier} sans fichier sur le disque`
                : undefined} />
        <Case term="Écartées" k="ecartes" value={counters.ecartes}
              hint="défaut objectif nommé" />
        <Case term="Jamais étiquetées" k="sans_etiquette" value={counters.sans_etiquette}
              hint="comptées dans la file" />
      </dl>

      <div aria-hidden="true" className="mt-[16px]">
        <div className="flex h-[8px] overflow-hidden rounded-[3px] bg-panel2">
          {shape.parts.map((part) => (
            <span key={part.key} style={{ width: percent(part.span), background: part.color }} />
          ))}
        </div>
        {/* Spans the queue alone, never the whole bar. */}
        <div className="relative mt-[3px] h-[4px]">
          <span className="absolute inset-y-0 left-0 rounded-[2px] bg-panel2"
                style={{ width: percent(shape.queueSpan) }} />
          <span className="absolute inset-y-0 left-0 rounded-[2px]"
                style={{ width: percent(shape.unlabelledSpan), backgroundImage: HATCH }} />
        </div>
      </div>

      <ul className="m-0 mt-[10px] flex list-none flex-wrap gap-x-[18px] gap-y-[5px] p-0
                     text-[12px] text-dim">
        {shape.parts.map((part) => (
          <li key={part.key} className="flex items-center gap-[6px]">
            <Pill color={part.color} />
            {part.label} <b className="font-[600] tabular-nums text-txt">{part.value}</b>
          </li>
        ))}
        <li className="flex items-center gap-[6px]">
          <Pill hatched />
          jamais étiquetées{' '}
          <b className="font-[600] tabular-nums text-txt">{counters.sans_etiquette}</b>
          <span className="text-dim2">(dans la file, absence de défaut supposée)</span>
        </li>
      </ul>
    </section>
  )
}
