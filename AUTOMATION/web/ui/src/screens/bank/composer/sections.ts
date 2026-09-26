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
    model: 'champ wardrobe · jamais dans le prompt : ajouté à la génération selon le niveau',
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
    /* « Prompt global » promettait le prompt entier ; le panneau ne porte
       plus que le décor en édition, les deux autres fragments en lecture
       (design-pass screen-7c §5.1). La CLÉ ne bouge pas : elle est le contrat
       du rail, des fumigations et de `data-tabpanel`. Depuis IT-11 (chantier
       5), le décor est un LIEU du monde, choisi ici avec le texte de la scène. */
    label: 'Scène et lieu',
    icon: 'pencil',
    /* Le texte de la scène et son lieu seuls : la lumière, la pose et la
       tenue ne s'y éditent plus (§5.2, §5.3), et un point ici pour une
       modification faite ailleurs enverrait chercher dans le mauvais panneau. */
    fields: ['promptBase', 'place'],
    model: 'champs prompt et place · le décor du lieu rejoint le prompt au lancement',
  },
  { key: 'ai', label: 'Amélioration IA', icon: 'robot', fields: [], model: 'aucun champ écrit — pas encore branché' },
  { key: 'json', label: 'JSON final', icon: 'terminal', fields: [], model: 'la scène telle qu’elle sera écrite, comparée à ce qui est sur le disque' },
]
