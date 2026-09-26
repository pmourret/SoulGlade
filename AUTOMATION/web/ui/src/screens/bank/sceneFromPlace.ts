/* A world place becomes a scene of the character's bank. A PURE function
   (`.claude/rules/frontend.md`): it reads without React and tests without
   mounting anything.

   TWO SHAPES, ONE RULE. The frame — label, intention, prompt — always comes
   from the place, and the server re-derives it on every load and save anyway
   (`worlds.refresh_scene_bank`, ADR-0027): what is written here is a starting
   point, never a fork. What differs between an ordinary place and an adult
   one is the CHARACTER's overlay, which is where it belongs (ADR-0014):

   - ordinary: exactly what a bank seeded at creation holds
     (`runner/prompt.py`, the `merge_scene` of the seed) — level 0, an EMPTY
     wardrobe at that level, so the frame speaks for itself;
   - adult: the level of the native tier, and the only wardrobe the place is
     meant to be worn in at that level. The level is GIVEN, never computed
     here: `/api/creative` says which tier declares `lora_adulte`, and an
     interface that deduced it would drift the day a pack declares its tiers
     differently. */
import type { WorldScene as Place } from '../worlds/useWorldCatalog'
import type { Scene } from '../../state/ScenesStoreContext'

/* The native tier is a produce tier: nothing is worn. Written as a wardrobe
   because the prompt assembler renders `wearing <wardrobe>` — « wearing
   nothing at all » reads correctly, an empty string would say nothing. */
export const NATIVE_WARDROBE = 'nothing at all'

export function sceneFromPlace(
  place: Place,
  world: string,
  adult: { nativeLevel: number } | null,
): Scene {
  const level = adult ? adult.nativeLevel : 0
  return {
    id: place.id,
    world,
    origin: 'world',
    world_ref: place.id,
    label: place.label ?? '',
    intention: place.intention ?? '',
    prompt: place.prompt ?? '',
    intensity: level,
    wardrobe: { [String(level)]: adult ? NATIVE_WARDROBE : '' },
    format: '4:5',
    count: 1,
    tones: [],
    tags: [],
    variants: [],
  }
}

/* Places of `catalogue` that the bank does not hold yet. A scene tied to a
   place is recognised by its `world_ref`, which is what survives a rename of
   the scene's own id. */
export function missingPlaces(catalogue: Place[] | null, scenes: Scene[]): Place[] {
  if (!catalogue) return []
  const held = new Set(scenes.map((s) => s.world_ref ?? s.id))
  return catalogue.filter((p) => !held.has(p.id))
}
