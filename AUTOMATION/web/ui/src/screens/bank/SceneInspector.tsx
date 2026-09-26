/* The inspector: everything about ONE scene, and nothing about the others.

   THE COMPOSER LIVES NEXT DOOR (31/08/2026, wireframe-driven). The flat form
   this file used to render directly — a dozen fields in one scroll — is now
   `composer/SceneComposer.tsx`, seven sections instead: this file keeps the
   OUTER shell (the section, the Escape-closes gesture, the undo history, the
   aria-label) and the world-link decision that gates several of the
   composer's fields, and hands the rest to it. `DocumentPane` below is
   untouched — a different concern (the bank's shared settings, shown when
   nothing is selected).

   THE SCENE'S OWN HEADER LEFT (design pass screen-7b §S4.1): `SceneHeader` is
   rendered by `BankScreen` ABOVE this section, so the identity of what is
   being edited survives the Monde tab replacing this whole column with the
   place's inspector. What used to arrive here only to be forwarded —
   `preview`, `onDuplicate`, `onRemove`, the chevrons — goes there directly.

   THE INSPECTOR DOES NOT OWN THE SCENE. It edits a DRAFT, and the draft carries
   the original object (`base`): every key it does not display crosses the save
   untouched — `world` and `origin` among them. See ScenesStoreContext for the
   incident that rule comes from. */
import { useCallback, useEffect, useRef } from 'react'

import type { Creative } from '../../state/TaxonomyContext'
import type { Scene, SceneDraft } from '../../state/ScenesStoreContext'
import { SceneComposer } from './composer/SceneComposer'
import type { SceneField } from './sceneChanges'

/** Same guard as `pose-editor/PoseCanvas.tsx`'s own `isTextEntry`, duplicated
    rather than shared (that one lives in a different screen's module) — a
    `<select>` needs the same protection here that a `<textarea>`/`<input>`
    does, which the pose editor's own version does not need to worry about. */
function isEditableControl(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  if (target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') return true
  if (target.tagName !== 'INPUT') return false
  const NOT_TEXT = ['checkbox', 'radio', 'button', 'submit', 'reset', 'file', 'color']
  return !NOT_TEXT.includes((target as HTMLInputElement).type)
}

/* Same coalescing window/depth as the pose editor's own history
   (`usePoseEditor.ts`) — a keystroke is this screen's equivalent of a
   pointermove: one undo step per PAUSE in typing, not one per character. */
const HISTORY_COALESCE_MS = 400
const HISTORY_LIMIT = 100

export function SceneInspector({
  draft,
  saved,
  creative,
  poses,
  produced,
  changed,
  narrow,
  onPatch,
  onPrevScene,
  onNextScene,
  onClose,
  onSaveDocument,
  onRevert,
}: {
  draft: SceneDraft
  /** The same scene as the last save left it — the JSON panel compares the
      draft against it (design-pass screen-7c §7). */
  saved: Scene | undefined
  creative: Creative | null
  poses: string[]
  produced: number | null
  /** Draft fields differing from the saved scene (`sceneChanges`). */
  changed: Set<SceneField>
  narrow: boolean
  onPatch: (patch: Partial<SceneDraft>) => void
  /** Steps to the previous/next scene in `useSceneWorkbench`'s `shown` list
      (design pass écran 7, §B2) — `undefined` at either end. The header owns
      the BUTTONS; this owns the KEYS, which have to work with the focus
      anywhere in the composer. */
  onPrevScene: (() => void) | undefined
  onNextScene: (() => void) | undefined
  onClose: () => void
  /** The document-level save, offered again from the composer's JSON panel. */
  onSaveDocument: () => void
  /** Drop every pending change — the banner's own gesture, offered again from
      the JSON panel. */
  onRevert: () => void
}) {
  /* A scene taken from the world (ADR-0027 §5) never owns its frame: `prompt`
     and `intention` are re-read from the world server-side on every save, so
     letting them be typed here would edit a value the next save discards.
     « Modifier pour ce personnage » (SceneHeader) turns it into a copy, which
     owns them. Wardrobe levels and the pose skeleton are OVERLAY keys
     (ADR-0014): never locked by this. */
  const worldLinked = draft.base.origin === 'world'

  /* Undo stack for `onPatch` (design pass écran 7, §B3) — bounded, in
     memory, one stack for whichever scene is currently open. `patchDraft`
     (ScenesStoreContext) writes straight into the draft with no history at
     all: a field cleared by a stray Ctrl+A/Delete had no way back before
     "Enregistrer". Same shape as the pose editor's own history
     (`usePoseEditor.ts`): `past`/`future` refs of whole SNAPSHOTS (a full
     `SceneDraft`, not a diff — passing one back through `onPatch` overwrites
     every key, `SceneDraft` has none optional, so this is a safe full
     restore, not a partial merge), reset whenever the OPEN scene changes —
     switching to another scene must not let Ctrl+Z reach into a different
     one's edits.

     COALESCING IS FIELD-AWARE, unlike the pose editor's own (which only
     ever coalesces ONE continuous drag on ONE joint, nothing else competes
     for the window). This composer has many distinct fields — measured
     live (design-pass audit, écran 7): typing into "Prompt de base" then
     immediately into "Prompt de pose" within the 400ms window merged both
     into ONE undo step, so a single Ctrl+Z reverted the SECOND field's edit
     *and* silently ate the first one's too. `lastKeys` tracks which key(s)
     the last patch touched; a patch to a DIFFERENT key always starts a new
     step regardless of timing, only same-field bursts still coalesce. */
  const past = useRef<SceneDraft[]>([])
  const future = useRef<SceneDraft[]>([])
  const lastPushAt = useRef(0)
  const lastKeys = useRef('')
  useEffect(() => {
    past.current = []
    future.current = []
    lastPushAt.current = 0
    lastKeys.current = ''
  }, [draft.uid])

  const patch = useCallback(
    (p: Partial<SceneDraft>) => {
      const now = Date.now()
      const keys = Object.keys(p).sort().join(',')
      const coalesces = keys === lastKeys.current && now - lastPushAt.current <= HISTORY_COALESCE_MS
      if (!coalesces) {
        past.current.push(draft)
        if (past.current.length > HISTORY_LIMIT) past.current.shift()
      }
      lastPushAt.current = now
      lastKeys.current = keys
      future.current = []
      onPatch(p)
    },
    [draft, onPatch],
  )
  const undo = useCallback(() => {
    const prev = past.current.pop()
    if (!prev) return
    future.current.push(draft)
    lastPushAt.current = 0
    lastKeys.current = ''
    onPatch(prev)
  }, [draft, onPatch])
  const redo = useCallback(() => {
    const next = future.current.pop()
    if (!next) return
    past.current.push(draft)
    lastPushAt.current = 0
    lastKeys.current = ''
    onPatch(next)
  }, [draft, onPatch])

  return (
    <section
      id="sceneInspector"
      aria-label={`Scène ${draft.id}`}
      /* Escape closes the panel and hands the focus back to its card — the same
         gesture as every overlay of the studio, even though this one is a
         column and not a dialog.

         Up/Down step to the previous/next SCENE (design pass écran 7, §B2) —
         same keys `onListKeyDown` uses on the list itself, ELEVATED here so
         they work with focus anywhere in the composer, not just on a list
         row (same "elevate the listener" reasoning as the pose editor's own
         `handlePoseKeyDown`, design-pass screen-6 §A2). Guarded by
         `isEditableControl`: a textarea/input/select needs its OWN Up/Down
         (cursor movement, a number spinner, changing an option) more than
         this screen needs a global accelerator on top of it. ALT+Up/Down
         (screen-7b §S4.1) is the same step WITHOUT that guard: no field
         claims it, so it is the one that still works from inside a prompt
         being typed — which is where one actually is when moving on to the
         next scene.

         Ctrl/Cmd+Z (+Shift for redo) undoes/redoes a patch (§B3) — same
         `isEditableControl` guard for what it APPLIES: inside a text field
         this never touches the scene-level history. It still calls
         `preventDefault()` there too, though, rather than leaving the key
         to the field's own native undo the way `PoseCanvas`'s
         `handlePoseKeyDown` does for a plain input — measured live: a
         REACT-CONTROLLED field's native Ctrl+Z is not reliably scoped to
         the FOCUSED field. Editing field A, tabbing to an untouched field B
         and pressing Ctrl+Z there still ate a character back out of A —
         Chromium's own undo falling through to "the last edit anywhere on
         the page" once the focused element has no local history of its
         own. Suppressing it entirely is the safer, predictable choice; nothing
         here ever intercepts ordinary typing, only this one combo. */
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.stopPropagation()
          onClose()
          return
        }
        const step = e.key === 'ArrowUp' ? onPrevScene : e.key === 'ArrowDown' ? onNextScene : null
        if (step && e.altKey && !e.ctrlKey && !e.metaKey) {
          e.preventDefault()
          step()
          return
        }
        const inField = isEditableControl(e.target)
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
          e.preventDefault()
          if (inField) return
          if (e.shiftKey) redo()
          else undo()
          return
        }
        if (inField) return
        if (step && !e.ctrlKey && !e.metaKey) {
          e.preventDefault()
          step()
        }
      }}
      /* A COLUMN OF THE SCREEN, not a card floating in an aside (design pass
         screen-7b §S1): the rail and the form are its two children, it fills
         the centre track, and the form scrolls for its own account. The
         `max-h`/`h-full` dance the card needed — and the bar it could push
         past the fold — went with the card. */
      className="flex min-h-0 min-w-0 flex-1"
    >
      <SceneComposer
        draft={draft}
        saved={saved}
        creative={creative}
        poses={poses}
        produced={produced}
        worldLinked={worldLinked}
        changed={changed}
        narrow={narrow}
        onPatch={patch}
        onSaveDocument={onSaveDocument}
        onRevert={onRevert}
      />
    </section>
  )
}

/* Nothing selected. The panel is not empty — it holds what belongs to the
   DOCUMENT rather than to a scene: the two fragments every prompt of the bank
   carries. They used to sit above the cards, where they were re-read on every
   visit and edited about once a month. */
export function DocumentPane({
  anchor,
  direction,
  count,
  onAnchor,
  onDirection,
}: {
  anchor: string
  direction: string
  count: number
  onAnchor: (value: string) => void
  onDirection: (value: string) => void
}) {
  return (
    <section
      id="bankDocument"
      aria-label="Réglages de l'atelier"
      /* Same shape as the composer it stands in for: the centre column, its
         own scroll, and the same 880 px reading width. */
      className="min-h-0 min-w-0 flex-1 overflow-y-auto p-[20px] [&>*]:max-w-[880px]"
    >
      <h2 className="lab mt-0 mb-[4px]">Réglages de l'atelier</h2>
      <p className="tiny mt-0 mb-[16px]">
        Ce que les {count} scènes partagent. Ouvre une scène dans la grille pour
        l'éditer.
      </p>

      <label className="f">
        <span>ancre d'identité — ajoutée à toutes les scènes</span>
        <textarea
          id="anchor"
          className="min-h-[64px] resize-y"
          value={anchor}
          onChange={(e) => onAnchor(e.target.value)}
        />
      </label>
      <p className="tiny mt-[6px] mb-[18px]">
        Ne décris jamais le visage dans une scène : le verrou d'identité le
        porte. Ici on ne met que ce qu'il ne transporte pas (cheveux, yeux,
        taches de rousseur).
      </p>

      <label className="f">
        <span>note de direction — ajoutée à la fin de tous les prompts</span>
        <input
          id="direction"
          placeholder="ex : autumn palette, softer light — laisser vide si aucune"
          value={direction}
          onChange={(e) => onDirection(e.target.value)}
        />
      </label>
      <p className="tiny mt-[6px] mb-0">
        Sert à donner une intention de série sans réécrire chaque scène. Se vide
        aussi vite qu'elle se met.
      </p>
    </section>
  )
}
