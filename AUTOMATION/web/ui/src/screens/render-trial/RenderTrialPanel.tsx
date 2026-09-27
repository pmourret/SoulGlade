/* The render trial bar and its images (IT-10, 25/09; shared by the tone and
   light workshops since 7 bis). Presentation only: the calls live in
   `useRenderTrial`, and what each image means is the caller's to say
   (`columns`, `hint`, `note`).

   `kind` names the DOM hooks — `#toneTrial`, `#toneTrialScene`,
   `#btnToneTrial` for a tone, `#lightTrial…` for a light — so each workshop's
   smoke test finds its own.

   TWO LAYOUTS (design-pass lumieres, S4). `bar` is the tone workshop's strip
   over its content, left as it was to the pixel. `column` is the light
   workshop's inspector: a 48 px head, the images stacked, and — when the sheet
   has moved since — a banner that says so in words (`stale`). */
import { useState, type ReactNode } from 'react'

import type { RenderTrial } from './useRenderTrial'

export type TrialColumn = { label: string; caption: string }

export function RenderTrialPanel({
  kind, title, button, scenes, trial, columns, hint, reason, error, note, onStart, imageUrl, openLightbox,
  layout = 'bar', stale = false,
}: {
  kind: 'tone' | 'light'
  /** The accessible name of the section. */
  title: string
  /** The launch button's text. */
  button: string
  /** Scene ids of this character, the most fitting first. */
  scenes: string[]
  /** The trial of THIS subject, or null: another tone's trial is not shown. */
  trial: RenderTrial | null
  columns: TrialColumn[]
  /** What a launch renders, said next to the button. */
  hint: string
  /** Why the trial cannot run now (ComfyUI offline, a batch running…), or null. */
  reason: string | null
  error: string | null
  /** Under the images: how to read them. */
  note?: ReactNode
  onStart: (scene: string, seed: number | null) => void
  imageUrl: (label: string) => string
  openLightbox: (src: string) => void
  layout?: 'bar' | 'column'
  /** The images no longer show what the caller would try now (column only). */
  stale?: boolean
}) {
  const [scene, setScene] = useState('')
  const [seed, setSeed] = useState('')
  const chosen = scenes.includes(scene) ? scene : (scenes[0] ?? '')
  const blocked = reason ?? (!chosen ? 'aucune scène à essayer' : null)
  const Kind = kind === 'tone' ? 'Tone' : 'Light'

  const launch = () => {
    const parsed = Number.parseInt(seed, 10)
    onStart(chosen, Number.isFinite(parsed) ? parsed : null)
  }

  /* One image per column. In a column they are stacked, 196 px high, the
     caption and the measures on one line; the bar keeps its classes. */
  const figures = (current: RenderTrial, stacked: boolean) =>
    columns.map(({ label, caption }) => {
      const result = current.results?.[label]
      const measures = result?.measures ?? {}
      return (
        <figure key={label} className="m-0" data-trial-result={label}>
          {result ? (
            <button
              type="button"
              className="block w-full cursor-zoom-in border-0 bg-transparent p-0"
              onClick={() => openLightbox(imageUrl(label))}
            >
              <img
                src={imageUrl(label)}
                alt={`rendu : ${caption}`}
                className={stacked
                  ? 'block h-[196px] w-full rounded-[6px] bg-panel2 object-contain'
                  : 'block h-[200px] w-full rounded-[6px] bg-panel2 object-contain'}
              />
            </button>
          ) : (
            <div className={`${stacked ? 'h-[196px]' : 'h-[200px]'} rounded-[6px] bg-panel2 motion-safe:animate-pulse`} />
          )}
          <figcaption className={stacked ? 'mt-[4px] flex items-baseline gap-[8px] text-[12px]' : 'mt-[4px] text-[12px]'}>
            <b className="font-semibold">{caption}</b>
            {result && (
              <span className={stacked ? 'ml-auto text-dim tabular-nums' : 'block text-dim tabular-nums'}>
                bruit de fond {fmt(measures.bruit_fond)} · netteté {fmt(measures.nettete, 0)}
              </span>
            )}
          </figcaption>
        </figure>
      )
    })

  const seedButton = (current: RenderTrial) => (
    <button type="button" className="link font-code" onClick={() => setSeed(String(current.seed))}>
      {current.seed}
    </button>
  )

  if (layout === 'column')
    return (
      <section id={`${kind}Trial`} aria-label={title} className="flex h-full min-h-0 flex-col">
        <div className="flex h-[48px] flex-none items-center gap-[8px] border-b border-b-line px-[14px]">
          <span className="text-[13px] font-semibold">Essai de rendu</span>
          <span className="tiny">hors production</span>
        </div>
        <div className="flex min-h-0 flex-1 flex-col gap-[10px] overflow-y-auto p-[14px]">
          <div className="grid grid-cols-[minmax(0,1fr)_96px] gap-[8px]">
            <label className="lab" htmlFor={`${kind}TrialScene`}>Scène</label>
            <label className="lab" htmlFor={`${kind}TrialSeed`}>Graine</label>
            <select id={`${kind}TrialScene`} className="min-w-0" value={chosen} onChange={(e) => setScene(e.target.value)}>
              {scenes.map((id) => (
                <option key={id} value={id}>
                  {id}
                </option>
              ))}
            </select>
            <input
              id={`${kind}TrialSeed`}
              className="w-full font-code"
              inputMode="numeric"
              placeholder="au hasard"
              value={seed}
              onChange={(e) => setSeed(e.target.value.replace(/\D/g, ''))}
            />
          </div>
          <div className="flex flex-col items-start gap-[4px]">
            <button
              type="button"
              className="btn sm"
              id={`btn${Kind}Trial`}
              disabled={Boolean(blocked)}
              onClick={launch}
            >
              {button}
            </button>
            <span className="tiny">{blocked ?? hint}</span>
          </div>

          {error && (
            <p className="m-0 text-[12px] text-danger-txt" role="alert">
              {error}
            </p>
          )}

          {trial && (
            <div className="flex flex-col gap-[10px]" aria-live="polite">
              <p className="m-0 text-[12px] text-dim">
                {trial.running ? 'essai en cours' : 'dernier essai'} · « {trial.scene} » · graine{' '}
                {seedButton(trial)}
              </p>
              {stale && (
                <p className="m-0 rounded-card border border-warn-line bg-warn-bg px-[10px] py-[7px] text-[12px] text-warn-txt"
                   data-trial-stale>
                  <b className="font-semibold">La fiche a changé depuis cet essai.</b> Les images montrent la
                  phrase essayée, pas la fiche telle qu'elle est.
                </p>
              )}
              <div className="flex flex-col gap-[12px]">{figures(trial, true)}</div>
              {note && <div className="m-0 text-[11.5px] text-dim2">{note}</div>}
            </div>
          )}
        </div>
      </section>
    )

  return (
    <section id={`${kind}Trial`} aria-label={title} className="flex-none border-b border-b-line px-[14px] py-[10px]">
      <div className="flex flex-wrap items-center gap-[8px]">
        <span className="lab flex-none">Essai de rendu</span>
        <label className="sr-only" htmlFor={`${kind}TrialScene`}>
          scène
        </label>
        <select
          id={`${kind}TrialScene`}
          className="max-w-[220px]"
          value={chosen}
          onChange={(e) => setScene(e.target.value)}
        >
          {scenes.map((id) => (
            <option key={id} value={id}>
              {id}
            </option>
          ))}
        </select>
        <label className="sr-only" htmlFor={`${kind}TrialSeed`}>
          graine
        </label>
        <input
          id={`${kind}TrialSeed`}
          className="w-[120px] font-code"
          inputMode="numeric"
          placeholder="au hasard"
          value={seed}
          onChange={(e) => setSeed(e.target.value.replace(/\D/g, ''))}
        />
        <button
          type="button"
          className="btn sm"
          id={`btn${Kind}Trial`}
          disabled={Boolean(blocked)}
          title={blocked ?? undefined}
          onClick={launch}
        >
          {button}
        </button>
        <span className="text-[11.5px] text-dim2">{blocked ?? hint}</span>
      </div>

      {error && (
        <p className="m-0 mt-[6px] text-[12px] text-danger-txt" role="alert">
          {error}
        </p>
      )}

      {trial && (
        <div className="mt-[8px]" aria-live="polite">
          <p className="m-0 mb-[6px] text-[12px] text-dim">
            {trial.running ? 'essai en cours' : 'dernier essai'} · « {trial.scene} » · graine{' '}
            {seedButton(trial)}
          </p>
          <div className={`grid gap-[10px] ${columns.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
            {figures(trial, false)}
          </div>
          {note && <div className="m-0 mt-[6px] text-[11.5px] text-dim2">{note}</div>}
        </div>
      )}
    </section>
  )
}

function fmt(value: number | undefined, digits = 1) {
  return typeof value === 'number' ? value.toFixed(digits) : '—'
}
