/* The render trial of the open tone (IT-10, 25/09). Presentation only: the
   calls live in `useToneTrial`.

   WHY A RENDER, AND NOT ONLY THE EXPRESSION PREVIEW BELOW. The preview poses
   an expression on a photo already produced; a tone's prompt fragment only
   shows at generation, and the expression pass only shows on a full render.

   WHY THREE IMAGES. A tone does two things, and a trial that changes both at
   once cannot say which one hurts. On 25/09 a two-image trial blamed
   `joueur`'s « slight motion blur »; the middle image — the fragment with the
   expression pass off — showed it was the expression (same seed: fragment only
   clean at 158 sharpness, whole tone crimped at 51). For a tone that poses no
   expression the middle image would repeat the last one, so it is left out. */
import { useState } from 'react'

import type { ToneTrial } from './useToneTrial'
import type { ToneRow } from './useToneList'

const WITHOUT = 'sans_ton'
const FRAGMENT_ONLY = 'fragment_seul'

export function ToneTrialPanel({
  tone, scenes, trial, error, comfy, busy, onStart, imageUrl, openLightbox,
}: {
  tone: ToneRow
  /** Scene ids of this character, those citing the tone first. */
  scenes: string[]
  trial: ToneTrial | null
  error: string | null
  comfy: boolean
  /** A batch is running — this trial or anything else: one GPU. */
  busy: boolean
  onStart: (scene: string, seed: number | null) => void
  imageUrl: (label: string) => string
  openLightbox: (src: string) => void
}) {
  const [scene, setScene] = useState('')
  const [seed, setSeed] = useState('')
  const chosen = scenes.includes(scene) ? scene : (scenes[0] ?? '')
  const mine = trial && trial.tone === tone.key ? trial : null
  const hasExpression = tone.configuredParams.length > 0
  const columns = [WITHOUT, ...(hasExpression ? [FRAGMENT_ONLY] : []), tone.key]
  const caption = (label: string) =>
    label === WITHOUT ? 'Sans ton' : label === FRAGMENT_ONLY ? 'Fragment seul' : `« ${tone.label} » complet`
  const reason = !comfy
    ? 'nécessite ComfyUI en ligne'
    : busy
      ? 'un lot tourne déjà'
      : !chosen
        ? 'aucune scène à essayer'
        : null

  const launch = () => {
    const parsed = Number.parseInt(seed, 10)
    onStart(chosen, Number.isFinite(parsed) ? parsed : null)
  }

  return (
    <section id="toneTrial" aria-label="Essai de rendu du ton" className="flex-none border-b border-b-line px-[14px] py-[10px]">
      <div className="flex flex-wrap items-center gap-[8px]">
        <span className="lab flex-none">Essai de rendu</span>
        <label className="sr-only" htmlFor="toneTrialScene">
          scène
        </label>
        <select
          id="toneTrialScene"
          className="h-[30px] max-w-[220px]"
          value={chosen}
          onChange={(e) => setScene(e.target.value)}
        >
          {scenes.map((id) => (
            <option key={id} value={id}>
              {id}
            </option>
          ))}
        </select>
        <label className="sr-only" htmlFor="toneTrialSeed">
          graine
        </label>
        <input
          id="toneTrialSeed"
          className="h-[30px] w-[110px] font-code"
          inputMode="numeric"
          placeholder="graine au hasard"
          value={seed}
          onChange={(e) => setSeed(e.target.value.replace(/\D/g, ''))}
        />
        <button
          type="button"
          className="btn sm"
          id="btnToneTrial"
          disabled={Boolean(reason)}
          title={reason ?? undefined}
          onClick={launch}
        >
          Essayer « {tone.label} »
        </button>
        <span className="text-[11.5px] text-dim2">
          {reason ??
            (hasExpression
              ? 'trois images, même graine : sans ton, fragment seul, ton complet — hors production'
              : 'deux images, même graine : sans ton, puis avec — hors production')}
        </span>
      </div>

      {error && (
        <p className="m-0 mt-[6px] text-[12px] text-danger-txt" role="alert">
          {error}
        </p>
      )}

      {mine && (
        <div className="mt-[8px]" aria-live="polite">
          <p className="m-0 mb-[6px] text-[12px] text-dim">
            {mine.running ? 'essai en cours' : 'dernier essai'} · « {mine.scene} » · graine{' '}
            <button type="button" className="link font-code" onClick={() => setSeed(String(mine.seed))}>
              {mine.seed}
            </button>
          </p>
          <div className={`grid gap-[10px] ${columns.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
            {columns.map((label) => {
              const result = mine.results?.[label]
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
                        alt={`rendu : ${caption(label)}`}
                        className="block h-[200px] w-full rounded-[6px] bg-panel2 object-contain"
                      />
                    </button>
                  ) : (
                    <div className="h-[200px] rounded-[6px] bg-panel2 motion-safe:animate-pulse" />
                  )}
                  <figcaption className="mt-[4px] text-[12px]">
                    <b className="font-semibold">{caption(label)}</b>
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
          {columns.length === 3 && (
            <p className="m-0 mt-[6px] text-[11.5px] text-dim2">
              Entre les deux premières, seul le fragment de prompt change ; entre les deux
              dernières, seule la passe d'expression.
            </p>
          )}
        </div>
      )}
    </section>
  )
}

function fmt(value: number | undefined, digits = 1) {
  return typeof value === 'number' ? value.toFixed(digits) : '—'
}
