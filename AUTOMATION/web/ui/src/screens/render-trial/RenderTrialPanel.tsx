/* The render trial bar and its images (IT-10, 25/09; shared by the tone and
   light workshops since 7 bis). Presentation only: the calls live in
   `useRenderTrial`, and what each image means is the caller's to say
   (`columns`, `hint`, `note`).

   `kind` names the DOM hooks — `#toneTrial`, `#toneTrialScene`,
   `#btnToneTrial` for a tone, `#lightTrial…` for a light — so each workshop's
   smoke test finds its own. */
import { useState, type ReactNode } from 'react'

import type { RenderTrial } from './useRenderTrial'

export type TrialColumn = { label: string; caption: string }

export function RenderTrialPanel({
  kind, title, button, scenes, trial, columns, hint, reason, error, note, onStart, imageUrl, openLightbox,
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
            <button type="button" className="link font-code" onClick={() => setSeed(String(trial.seed))}>
              {trial.seed}
            </button>
          </p>
          <div className={`grid gap-[10px] ${columns.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
            {columns.map(({ label, caption }) => {
              const result = trial.results?.[label]
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
                        className="block h-[200px] w-full rounded-[6px] bg-panel2 object-contain"
                      />
                    </button>
                  ) : (
                    <div className="h-[200px] rounded-[6px] bg-panel2 motion-safe:animate-pulse" />
                  )}
                  <figcaption className="mt-[4px] text-[12px]">
                    <b className="font-semibold">{caption}</b>
                    {result && (
                      <span className="block text-dim tabular-nums">
                        bruit de fond {fmt(measures.bruit_fond)} · netteté {fmt(measures.nettete, 0)}
                      </span>
                    )}
                  </figcaption>
                </figure>
              )
            })}
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
