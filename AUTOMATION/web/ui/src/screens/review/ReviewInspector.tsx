/* The right panel of the Revue: what is known about the image on screen
   (design-pass screen-5b, §S4).

   IT REPLACES FIVE STACKED `.meta` BOXES. The loupe used to put identity,
   realism, two corpus axes, the actions and the prompt in a 300 px column of
   bordered cards, each with its own frame: six frames for one image, and the
   action buttons in the middle of them. The frames are gone, the sections are
   told apart by a rule, and the actions left for the bar under the picture,
   where the gesture is.

   IN GRID IT SHOWS THE AIMED TILE, and only its first section. A thumbnail
   cannot be judged for proportions or hands — that is why the corpus labels
   have always been full-frame only — so offering the instruments there would
   invite a corpus labelled blind.

   NO THRESHOLD IS WRITTEN HERE. Every bound comes from `qc` / `qc.mains` and
   every band from the server's calibration (`bands`). */
import { BandRule, ScoreRule } from './BandRule'
import { CorpusLabels, type LabelAxis } from './CorpusLabels'
import { FlagButtons } from './FlagButtons'
import { calibration } from './ScoreBars'
import { scoreClass, type Band, type GalleryItem } from './useTriage'

const SECTION = 'border-t border-t-line px-[14px] py-[13px] first:[border-top:0]'
const TITLE = 'mb-[10px] text-[10.5px] font-semibold uppercase tracking-[.7px] text-dim'

/* The word that goes with the score, and the shape that goes with the word.
   Three states, never merged: inside the band, under it but still measured,
   and far enough down to be a fault. Colour is the third signal, never the
   first (frontend.md). */
const VERDICT: Record<string, { text: string; tone: string; diamond: boolean }> = {
  high: { text: 'Conforme', tone: 'text-ok-txt', diamond: false },
  ok: { text: 'Conforme', tone: 'text-ok-txt', diamond: false },
  warn: { text: 'À surveiller', tone: 'text-warn-txt', diamond: true },
  bad: { text: 'Hors bande', tone: 'text-danger-txt', diamond: true },
  none: { text: 'Non mesurée', tone: 'text-dim2', diamond: true },
}

const DOT_TINT: Record<string, string> = {
  high: 'bg-high',
  ok: 'bg-ok',
  warn: 'bg-warn',
  bad: 'bg-bad',
  none: 'bg-dim2',
}

function Verdict({ klass }: { klass: string }) {
  const v = VERDICT[klass] ?? VERDICT.none
  return (
    <span className={`flex items-center gap-[6px] text-[12.5px] font-semibold ${v.tone}`}>
      <i
        className={`h-[7px] w-[7px] flex-none ${v.diamond ? 'rotate-45' : 'rounded-full'} ${
          DOT_TINT[klass] ?? DOT_TINT.none
        }`}
        aria-hidden="true"
      />
      {v.text}
    </span>
  )
}

/* The three realism sub-scores, as rules rather than bars. The band comes from
   the server's calibration when it exists, otherwise the folder's own observed
   range — and `calibration()` says WHICH, because a scale one cannot name is a
   scale one cannot read. */
const MEASURES: { label: string; band: string; field: keyof GalleryItem; decimals: number }[] = [
  { label: 'net', band: 'nettete', field: 'nettete', decimals: 0 },
  { label: 'peau', band: 'texture_visage', field: 'texture', decimals: 2 },
  { label: 'fond', band: 'bruit_fond', field: 'fond', decimals: 2 },
]

function RealismRules({
  item,
  bands,
  items,
}: {
  item: GalleryItem
  bands: Record<string, Band | null>
  items: GalleryItem[]
}) {
  return (
    <div className="flex flex-col gap-[10px]">
      {MEASURES.map((measure) => {
        const value = item[measure.field] as number | null | undefined
        if (value == null) return null
        const band = bands[measure.band] ?? null
        const observed = items
          .map((i) => i[measure.field] as number | null | undefined)
          .filter((v): v is number => v != null)
        const lo = band ? Math.min(band.min, value) : Math.min(...observed, value)
        const hi = band ? Math.max(band.max, value) : Math.max(...observed, value)
        const inBand = band ? value >= band.min && value <= band.max : true
        return (
          <div key={measure.band}>
            <div className="mb-[3px] flex items-baseline gap-[8px] text-[12px]">
              <span className="flex-1 text-dim">{measure.label}</span>
              <b className="flex-none font-medium tabular-nums text-txt">
                {value.toFixed(measure.decimals)}
              </b>
            </div>
            <BandRule
              lo={lo}
              hi={hi}
              value={value}
              bandFrom={band ? band.min : lo}
              bandTo={band ? band.max : hi}
              inBand={inBand}
            />
          </div>
        )
      })}
    </div>
  )
}

export function ReviewInspector({
  item,
  /** True in grid: only the identity section, plus the way into the loupe. */
  compact,
  qc,
  qcMains,
  bands,
  items,
  references,
  previewSrc,
  onFlag,
  onLabel,
}: {
  item: GalleryItem | undefined
  compact: boolean
  qc: { ok: number; watch: number; high: number }
  qcMains: { ok: number; watch: number; high: number }
  bands: Record<string, Band | null>
  items: GalleryItem[]
  references: { mesurees: number; total: number }
  previewSrc: string | null
  onFlag: (flag: string) => void
  onLabel: (axis: LabelAxis, value: string) => void
}) {
  if (!item)
    return (
      <p className="m-0 px-[14px] py-[16px] text-[12.5px] text-dim">
        Aucune image sous le curseur.
      </p>
    )

  const value = item.score ? Number.parseFloat(item.score) : null
  const klass = scoreClass(item.score, qc)
  const mainsKlass = scoreClass(item.mains == null ? null : String(item.mains), qcMains)

  return (
    <>
      <section className={SECTION}>
        <h2 className={TITLE}>Identité</h2>
        {compact && previewSrc && (
          <div
            className="mb-[12px] aspect-[4/5] w-full rounded-[6px] border border-line bg-panel2
                       bg-cover bg-center"
            style={{ backgroundImage: `url('${previewSrc}')` }}
            aria-hidden="true"
          />
        )}
        <div className="mb-[6px] flex items-baseline gap-[10px]">
          <b className="text-[30px] leading-none font-[650] tabular-nums text-txt">
            {value != null ? value.toFixed(3) : '—'}
          </b>
          <Verdict klass={klass} />
        </div>
        <p className="mt-0 mb-[8px] text-[11.5px] leading-[1.45] text-dim2">
          similarité à la base gelée · bande conforme ≥ {qc.ok.toFixed(2)}
        </p>
        <ScoreRule value={value} qc={qc} />

        {item.mains != null && (
          <div className="mt-[12px]">
            <div className="mb-[3px] flex items-baseline gap-[8px] text-[12px]">
              <span className="flex-1 text-dim">mains</span>
              <b className="flex-none font-medium tabular-nums text-txt">
                {item.mains.toFixed(2)}
              </b>
              <Verdict klass={mainsKlass} />
            </div>
            <ScoreRule value={item.mains} qc={qcMains} />
          </div>
        )}

        {compact && (
          <p className="mt-[12px] mb-0 text-[11.5px] text-dim">
            <span className="kbd">Entrée</span> pour l'ouvrir en loupe
          </p>
        )}
      </section>

      {!compact && (
        <>
          <section className={SECTION}>
            <h2 className={TITLE}>Réalisme</h2>
            <p className="mt-0 mb-[10px] text-[11.5px] leading-[1.45] text-dim2">
              {calibration(bands, references)}
            </p>
            {item.nettete == null ? (
              <p className="m-0 text-[12.5px] text-dim2">non mesuré</p>
            ) : (
              <RealismRules item={item} bands={bands} items={items} />
            )}
            <div className="mt-[12px]">
              <FlagButtons item={item} onFlag={onFlag} />
            </div>
          </section>

          {/* Corpus labels, full frame only — see CorpusLabels.tsx. The Galerie
              gets them too: labelling is a measuring pass, not a sorting one. */}
          <section className={SECTION}>
            <h2 className={TITLE}>Corpus</h2>
            <p className="mt-0 mb-[10px] text-[11.5px] text-dim2">défauts objectifs</p>
            <div className="flex flex-col gap-[12px]">
              <CorpusLabels item={item} onLabel={onLabel} />
            </div>
          </section>

          <section className={SECTION}>
            <h2 className={TITLE}>Métadonnées</h2>
            {/* 90 px, pas 72 : « Format · date » se cassait en deux lignes
                (« Format · » puis « date »), et une etiquette coupee sur son
                separateur se lit comme deux etiquettes. Vu en capture. */}
            <dl className="m-0 grid grid-cols-[90px_minmax(0,1fr)] gap-x-[10px] gap-y-[7px]
                           text-[12.5px]">
              <dt className="text-dim">Scène</dt>
              <dd className="m-0 truncate">{item.scene || '—'}</dd>
              <dt className="text-dim">Format · date</dt>
              <dd className="m-0">
                {item.format || '—'} · {item.date}
              </dd>
              <dt className="text-dim">Graine</dt>
              <dd className="m-0 truncate font-code tabular-nums">{item.seed || '—'}</dd>
            </dl>
          </section>

          <section className={SECTION}>
            {/* `!` on both: `details.adv` in `screens.css` is an element + class
                selector, which outweighs a plain utility. */}
            <details className="adv mt-0! [border:0]! p-0!">
              <summary>Prompt utilisé</summary>
              <p className="tiny mt-[8px] [overflow-wrap:anywhere]">{item.prompt || ''}</p>
            </details>
          </section>
        </>
      )}
    </>
  )
}
