/* The render trial of the open tone (IT-10, 25/09). Presentation only: the
   calls live in `useRenderTrial`, the bar and the images in
   `RenderTrialPanel`, shared with the light workshop (7 bis). This file says
   what a TONE trial renders.

   WHY A RENDER, AND NOT ONLY THE EXPRESSION PREVIEW BELOW. The preview poses
   an expression on a photo already produced; a tone's prompt fragment only
   shows at generation, and the expression pass only shows on a full render.

   WHY THREE IMAGES. A tone does two things, and a trial that changes both at
   once cannot say which one hurts. On 25/09 a two-image trial blamed
   `joueur`'s « slight motion blur »; the middle image — the fragment with the
   expression pass off — showed it was the expression (same seed: fragment only
   clean at 158 sharpness, whole tone crimped at 51). For a tone that poses no
   expression the middle image would repeat the last one, so it is left out. */
import { RenderTrialPanel } from '../render-trial/RenderTrialPanel'
import type { RenderTrial } from '../render-trial/useRenderTrial'
import type { ToneRow } from './useToneList'

const WITHOUT = 'sans_ton'
const FRAGMENT_ONLY = 'fragment_seul'

export function ToneTrialPanel({
  tone, scenes, trial, error, comfy, busy, onStart, imageUrl, openLightbox,
}: {
  tone: ToneRow
  /** Scene ids of this character, those citing the tone first. */
  scenes: string[]
  trial: RenderTrial | null
  error: string | null
  comfy: boolean
  /** A batch is running — this trial or anything else: one GPU. */
  busy: boolean
  onStart: (scene: string, seed: number | null) => void
  imageUrl: (label: string) => string
  openLightbox: (src: string) => void
}) {
  const hasExpression = tone.configuredParams.length > 0
  const columns = [
    { label: WITHOUT, caption: 'Sans ton' },
    ...(hasExpression ? [{ label: FRAGMENT_ONLY, caption: 'Fragment seul' }] : []),
    { label: tone.key, caption: `« ${tone.label} » complet` },
  ]
  return (
    <RenderTrialPanel
      kind="tone"
      title="Essai de rendu du ton"
      button={`Essayer « ${tone.label} »`}
      scenes={scenes}
      trial={trial && trial.tone === tone.key ? trial : null}
      columns={columns}
      hint={hasExpression
        ? 'trois images, même graine : sans ton, fragment seul, ton complet — hors production'
        : 'deux images, même graine : sans ton, puis avec — hors production'}
      reason={!comfy ? 'nécessite ComfyUI en ligne' : busy ? 'un lot tourne déjà' : null}
      error={error}
      note={columns.length === 3
        ? "Entre les deux premières, seul le fragment de prompt change ; entre les deux dernières, seule la passe d'expression."
        : undefined}
      onStart={onStart}
      imageUrl={imageUrl}
      openLightbox={openLightbox}
    />
  )
}
