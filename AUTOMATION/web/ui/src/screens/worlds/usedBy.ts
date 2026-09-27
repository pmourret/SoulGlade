/* Who uses what inside a world (design-pass 19 §S5) — pure functions, no React.

   A place or an intention a scene uses cannot leave the world: the server
   refuses it (`services/worlds.py`). The inspector says so BEFORE the gesture,
   by disabling « Retirer » and naming the scenes, rather than answering a
   click with a refusal. */
import type { WorldScene } from './useWorldCatalog'

/** The scenes (ordinary and adult) that point at this place, intention or tone. */
export function scenesUsing(
  scenes: WorldScene[],
  field: 'place' | 'intention' | 'tone',
  value: string,
): WorldScene[] {
  if (!value) return []
  return scenes.filter((scene) => {
    if (field !== 'tone') return scene[field] === value
    /* `tones` is not in the typed model (`extra="allow"`): `true` lists every
       tone of the world, an array lists some. */
    const tones = (scene as Record<string, unknown>).tones
    return tones === true || (Array.isArray(tones) && tones.includes(value))
  })
}

