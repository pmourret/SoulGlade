/* The seven sections of a scene: their order, their icon, and which fields of
   the draft each one holds.

   Shared by the rail (which marks a section holding an unsaved edit) and by
   the composer (which titles the open one and names the model field it edits)
   — owned by neither, so it lives on its own (frontend.md, « ce qui est
   partagé par deux fichiers du dossier et possédé par aucun »). */
import type { SceneField } from '../sceneChanges'

export type SectionKey = 'general' | 'light' | 'clothing' | 'pose' | 'recap' | 'ai' | 'json'

export type Section = {
  key: SectionKey
  label: string
  icon: string
  /** Draft fields edited here — a section is « modifiée » when one of them is.
      Empty for the two read-only sections. */
  fields: SceneField[]
  /** The model field(s) this section writes, said under its title so the form
      names what `scenes.json` will carry (design pass screen-7b §S4.3). */
  model: string
}

export const SECTIONS: Section[] = [
  {
    key: 'general',
    label: 'Général',
    icon: 'gear',
    fields: ['id', 'intention', 'format', 'count', 'guidance', 'bandLo', 'tones', 'tags'],
    model: "champs id, intention, format, count, guidance, intensity, tones et tags",
  },
  {
    key: 'light',
    label: 'Lumière',
    icon: 'bulb',
    fields: ['promptLight', 'variants'],
    model: 'champ prompt_light · repère vert dans l’aperçu',
  },
  {
    key: 'clothing',
    label: 'Vêtements',
    icon: 'shirt',
    fields: ['wardrobe'],
    model: 'champ wardrobe · injecté par niveau, jamais dans le prompt',
  },
  {
    key: 'pose',
    label: 'Pose',
    icon: 'pose',
    fields: ['promptPose', 'pose'],
    model: 'champs prompt_pose (repère violet dans l’aperçu) et pose',
  },
  {
    key: 'recap',
    label: 'Prompt global',
    icon: 'pencil',
    fields: ['promptBase', 'promptLight', 'promptPose', 'wardrobe'],
    model: 'champ prompt · les trois fragments joints à l’enregistrement',
  },
  { key: 'ai', label: 'Amélioration IA', icon: 'robot', fields: [], model: 'aucun champ écrit — pas encore branché' },
  { key: 'json', label: 'JSON final', icon: 'terminal', fields: [], model: 'lecture seule — la scène telle qu’elle sera écrite' },
]
