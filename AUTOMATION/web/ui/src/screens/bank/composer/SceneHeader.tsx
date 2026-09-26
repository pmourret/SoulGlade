/* WHAT is being edited, and what can be done to it — above the composer, on
   every section (design pass screen-7b §S4.1).

   IT USED TO BE INSIDE THE COMPOSER, and it carried the live composed prompt
   in a three-line clamp because nothing else on the screen showed it. Both
   moved: the living preview is the right-hand panel now
   (`ScenePreviewPanel`), and this header is rendered by `BankScreen` ABOVE
   the composer.

   IT SAYS WHERE THE SCENE COMES FROM (ADR-0027 §5). A scene taken from the
   world follows the world's corrections; « Modifier pour ce personnage »
   makes it the character's copy, which stops following. A copy can go back.
   The world itself is never edited from here: the link opens Mondes, where
   a correction reaches every character of the world (tranché le 26/09).

   THE THREE FULL-WIDTH BARS AT THE BOTTOM OF THE FORM ARE GONE with it
   (Suivant, Dupliquer, Supprimer). Suivant walked the sections, which the
   labelled rail now does in one click; the other two were a destructive act
   and a constructive one sharing the bottom of a scrolled form. They are
   header actions, where the scene's own identity is. */
import { Link } from 'react-router-dom'

import { worldPlacesPath } from '../../../app/routes'
import type { Creative } from '../../../state/TaxonomyContext'
import type { SceneDraft } from '../../../state/ScenesStoreContext'
import type { ScenePreview } from '../SceneList'

export function SceneHeader({
  draft,
  creative,
  produced,
  preview,
  imageUrl,
  changed,
  onCopy,
  onReturnToWorld,
  onPrevScene,
  onNextScene,
  onDuplicate,
  onRemove,
}: {
  draft: SceneDraft
  creative: Creative | null
  produced: number | null
  preview: ScenePreview | undefined
  imageUrl: (ref: Record<string, unknown>) => string
  /** The scene holds edits `scenes.json` does not have yet (`sceneChanges`). */
  changed: boolean
  /** Makes a scene taken from the world the character's own copy. */
  onCopy: () => void
  /** Confirms, then turns a copy back into the world's scene. */
  onReturnToWorld: () => void
  /** `undefined` at either end of the (filtered) list — same "only render what
      is possible" rule the chevrons always followed. */
  onPrevScene: (() => void) | undefined
  onNextScene: (() => void) | undefined
  onDuplicate: () => void
  /** Confirms before removing — `useSceneWorkbench.remove` owns the question. */
  onRemove: () => void
}) {
  const intention =
    (creative?.intentions ?? []).find((i) => i.key === draft.intention)?.label ||
    draft.intention ||
    'sans intention'
  const meta = [
    intention,
    draft.format,
    `${draft.count} image${Number(draft.count) > 1 ? 's' : ''}`,
    produced ? `${produced} produite${produced > 1 ? 's' : ''}` : 'jamais produite',
    `niveau minimum ${draft.bandLo}`,
  ].join(' · ')

  return (
    <div className="flex h-[72px] flex-none items-center gap-[12px] border-b border-b-line px-[16px]">
      <div
        id="scenePreviewThumb"
        data-void={preview ? undefined : '1'}
        className="h-[50px] w-[40px] shrink-0 overflow-hidden rounded-[6px] border border-line2
                   bg-panel2 bg-cover bg-center"
        style={preview ? { backgroundImage: `url('${imageUrl({ ...preview, thumb: true })}')` } : undefined}
      />

      <div className="flex min-w-0 flex-1 flex-col gap-[2px]">
        <div className="flex min-w-0 items-center gap-[8px]">
          <b className="min-w-0 truncate text-[17px] font-[650]">{draft.id || '(sans identifiant)'}</b>
          {changed && (
            /* Never colour alone: the dot finds it, the word says it. */
            <span className="flex flex-none items-center gap-[5px] text-[11.5px] text-warn-txt">
              <span aria-hidden="true" className="h-[6px] w-[6px] rounded-[50%] bg-warn" />
              modifiée
            </span>
          )}
        </div>
        <span className="truncate text-[12px] text-dim2">{meta}</span>
      </div>

      <Provenance
        origin={draft.base.origin}
        worldRef={draft.base.world_ref}
        world={draft.base.world}
        onCopy={onCopy}
        onReturnToWorld={onReturnToWorld}
      />

      <div className="flex flex-none items-center gap-[8px]">
        <button type="button" className="btn sm" onClick={onDuplicate}>
          Dupliquer
        </button>
        {/* « … » says a question comes next, so the word itself is not the act. */}
        <button
          type="button"
          className="cursor-pointer rounded-[6px] border-0 bg-transparent px-[8px] py-[6px]
                     text-[13px] text-danger-txt hover:bg-danger-bg focus-visible:outline-2
                     focus-visible:outline-focus focus-visible:outline-offset-2"
          onClick={onRemove}
        >
          Supprimer…
        </button>
        <div className="flex items-center gap-[2px]">
          <StepButton
            label="Scène précédente"
            hint="Scène précédente — même liste que les ateliers, flèche Haut ou Alt ↑"
            glyph="‹"
            onClick={onPrevScene}
          />
          <StepButton
            label="Scène suivante"
            hint="Scène suivante — même liste que les ateliers, flèche Bas ou Alt ↓"
            glyph="›"
            onClick={onNextScene}
          />
        </div>
      </div>
    </div>
  )
}

function StepButton({
  label,
  hint,
  glyph,
  onClick,
}: {
  label: string
  hint: string
  glyph: string
  onClick: (() => void) | undefined
}) {
  return (
    <button
      type="button"
      className="flex h-[28px] w-[24px] cursor-pointer items-center justify-center rounded-[6px]
                 border-0 bg-transparent text-[16px] leading-none text-dim2 hover:text-txt
                 disabled:cursor-not-allowed disabled:opacity-30 focus-visible:outline-2
                 focus-visible:outline-focus focus-visible:outline-offset-2"
      aria-label={label}
      data-hint-text={hint}
      disabled={!onClick}
      onClick={onClick}
    >
      {glyph}
    </button>
  )
}

function Provenance({
  origin,
  worldRef,
  world,
  onCopy,
  onReturnToWorld,
}: {
  origin: string | undefined
  worldRef: string | undefined
  world: string | undefined
  onCopy: () => void
  onReturnToWorld: () => void
}) {
  if (origin !== 'world' && origin !== 'copy') {
    return (
      <span className="flex-none text-[12px] text-dim2" id="sceneOwn">
        {origin === 'compose' && 'proposée par le composeur · '}propre à ce personnage
      </span>
    )
  }
  return (
    <div className="flex flex-none flex-col items-end gap-[2px] text-[12px]">
      {origin === 'world' ? (
        <>
          <span className="text-dim2">
            scène du monde
            {world && (
              <>
                {' · '}
                <Link className="text-dim2 underline hover:text-txt" to={`${worldPlacesPath(world)}?onglet=scenes`}>
                  ouvrir dans Mondes
                </Link>
              </>
            )}
          </span>
          <button type="button" id="sceneCopy" className="btn sm" onClick={onCopy}>
            Modifier pour ce personnage
          </button>
        </>
      ) : (
        <>
          <span className="text-dim2">
            copie de <code className="font-code text-[11.5px]">{worldRef}</code>
          </span>
          <button type="button" id="sceneReturnToWorld" className="btn sm" onClick={onReturnToWorld}>
            Revenir à la scène du monde…
          </button>
        </>
      )}
    </div>
  )
}
