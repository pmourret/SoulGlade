/* What a scene owes to the next save — field by field.

   `useScenes` only knows `dirty`, a BOOLEAN for the whole document: enough to
   raise the banner, blind to which of twenty scenes was touched and which of
   its seven sections holds the edit. The design pass (screen-7b §S3, §S4.2,
   §S4.3, §S5) asks for that precision in four places at once: the dot on a
   list row, the dot on a section of the rail, the `--warn` border of a field,
   and the refusal of « Produire cette scène » while something is pending.

   A PURE COMPARISON, NOT A SECOND STATE. Nothing is recorded as "modified" at
   the keystroke: the draft as typed is compared to a draft rebuilt from the
   SAVED scene it rests on (`draftFields`, the very mapping `draftOf` uses to
   fill the form in the first place). No bookkeeping to keep in sync, and no
   way for the two to drift — it is the same function on both sides.

   INDEXED BY `base.id`, NOT BY THE TYPED ONE: the id is a field like any
   other, so renaming a scene must READ as a change rather than lose its own
   saved counterpart.

   A SCENE THE BANK HAS NEVER SEEN (just added, just duplicated) HAS NO
   COUNTERPART, and `changedFields` returns nothing for it — measured live
   during the audit: marking every field of a new scene painted eight `--warn`
   borders and five rail dots at once, which says "compare this to the saved
   version" about a scene that has none. What is true of it is said where it
   belongs and once: the banner, the dot on its list row and the pastille in
   its header (`hasChanges`, which counts a missing counterpart as pending). */
import { draftFields, type Scene, type SceneBank, type SceneDocument, type SceneDraft } from '../../state/ScenesStoreContext'

/** Draft keys the composer actually edits — `uid` and `base` are plumbing. */
const FIELDS = [
  'id',
  'intention',
  'place',
  'format',
  'count',
  'guidance',
  'bandLo',
  'tones',
  'tags',
  'promptBase',
  'promptLight',
  'promptPose',
  'wardrobe',
  'variants',
  'pose',
] as const

export type SceneField = (typeof FIELDS)[number]

/** The scenes as they are ON DISK, by id — the server's own copy, reloaded
    after every save, never the drafts. */
export function savedScenes(bank: SceneBank | null): Map<string, Scene> {
  const scenes = (bank?.data as SceneDocument | undefined)?.scenes ?? []
  return new Map(scenes.map((scene) => [scene.id, scene]))
}

/** Which FIELDS differ — empty for a scene with no saved counterpart. */
export function changedFields(draft: SceneDraft, saved: Map<string, Scene>): Set<SceneField> {
  const counterpart = saved.get(draft.base.id ?? '')
  if (!counterpart) return new Set()
  const was = draftFields(counterpart)
  return new Set(FIELDS.filter((field) => draft[field] !== was[field]))
}

/** Whether the SCENE owes anything to the next save — a modified one, or one
    the bank has never seen at all. */
export function hasChanges(draft: SceneDraft, saved: Map<string, Scene>): boolean {
  const counterpart = saved.get(draft.base.id ?? '')
  // `origin` is not a form field: copying a scene or taking it back to the
  // world changes nothing else, and still owes the next save (ADR-0027 §5).
  return !counterpart || counterpart.origin !== draft.base.origin || changedFields(draft, saved).size > 0
}
