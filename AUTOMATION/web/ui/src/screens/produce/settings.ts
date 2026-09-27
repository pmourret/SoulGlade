/* Declarative settings panel: the label, the explanation, the bounds and the
   reference value of a setting live in the SAME place. Adding a setting is
   adding a line here. Ported verbatim from `REGLAGES` in `static/create.js`.

   RULE: everything exposed drives something real. Each `key` is consumed either
   by WorkflowRunner.api_for (guidance, steps, refiner, refiner_denoise, sharpen,
   and the facedetailer / upscale_2k / grain_export groups), or by
   appliquer_grain (grain_telephone), or by appliquer_expression (expression),
   or by nsfw_batch (dest 'nsfw'). A control that drives
   nothing would suggest a setting that does not exist — worse than no control.

   `ref` is NOT written here: it comes from config.json through /api/config. The
   measured values have ONE source of truth (CLAUDE.md §8.4). */

export type SettingKind = 'bool' | 'liste' | 'nombre' | 'curseur'
/** Where the value goes in the run payload. */
export type SettingDest = 'job' | 'preset' | 'nsfw'

export type Setting = {
  id: string
  dest: SettingDest
  type: SettingKind
  label: string
  /** What it does: one short sentence. No justification, no history — the
      measurements behind it live in a comment above the item (screen-20, S5). */
  quoi: string
  /** What it costs: a few words, a number when a measurement exists. */
  cout?: string
  /** Key in preset/nsfw. Absent for the `job` fields, which travel by id. */
  cle?: string
  min?: number
  max?: number
  pas?: number
  /** Placeholder of an empty numeric field: what the server does without it. */
  vide?: string
  options?: [string, string][]
  /** Options appended from config.json: the character's own list, never a copy. */
  optionsFrom?: 'formats'
  bas?: string
  haut?: string
  /** Formatter: 'mp' renders bytes of surface as megapixels. */
  fmt?: 'mp'
  /** Master switch: with it off, this setting has no effect and says so. */
  lieA?: string
}

export type SettingSection = {
  titre: string
  /** Folded by default. */
  replie?: boolean
  /** 'edit': only shown on the tier that edits. */
  niveau?: 'edit'
  items: Setting[]
}

export const SECTIONS: SettingSection[] = [
  {
    titre: "Ce qu'on produit",
    items: [
      {
        id: 'count', dest: 'job', type: 'nombre', min: 1, max: 12, vide: 'défaut de la scène',
        label: 'Images par scène',
        quoi: "Nombre de photos par scène cochée, chacune avec sa graine.",
      },
      {
        id: 'format', dest: 'job', type: 'liste',
        options: [['', '— celui de la scène —']],
        optionsFrom: 'formats',
        label: 'Format imposé',
        quoi: "Impose un cadrage à tout le lot. Vide : chaque scène garde le sien.",
      },
      {
        id: 'limit', dest: 'job', type: 'nombre', min: 1, max: 200, vide: 'aucune',
        label: 'Plafond du lot',
        quoi: "Arrête le lot après ce nombre d'images.",
      },
      {
        id: 'seed', dest: 'job', type: 'nombre', vide: 'aléatoire',
        label: 'Graine fixe',
        quoi: "Rejoue la même image. Vide : aléatoire.",
        cout: "Seul moyen de comparer deux réglages.",
      },
      {
        id: 'novar', dest: 'job', type: 'bool',
        label: 'Ignorer les variantes',
        quoi: "Ne garde que la version principale de chaque scène.",
      },
    ],
  },

  {
    titre: 'Fidélité et calcul', replie: true,
    items: [
      {
        id: 'guidance', cle: 'guidance', dest: 'preset', type: 'curseur', min: 1, max: 5, pas: 0.1,
        label: 'Liberté du modèle', bas: 'il improvise', haut: 'il obéit au texte',
        quoi: "Force avec laquelle le modèle suit le texte.",
        cout: "Au-delà de 3 : peau lissée, rendu artificiel.",
      },
      {
        id: 'steps', cle: 'steps', dest: 'preset', type: 'curseur', min: 8, max: 36, pas: 1,
        label: 'Temps de calcul', bas: 'rapide et grossier', haut: 'fin et lent',
        quoi: "Nombre de passes sur l'image.",
        cout: "Au-delà de 20 : plus lent, sans gain visible.",
      },
    ],
  },

  {
    titre: 'Peau et détail', replie: true,
    items: [
      /* The identity lock freezes the face but smooths it on the way. */
      {
        id: 'refiner', cle: 'refiner', dest: 'preset', type: 'bool',
        label: 'Repasse de texture',
        quoi: "Seconde passe qui redonne le grain de peau. Principal remède au rendu IA.",
      },
      {
        id: 'rdenoise', cle: 'refiner_denoise', dest: 'preset', type: 'curseur', min: 0.1, max: 0.8, pas: 0.05,
        label: 'Ampleur de la repasse', bas: 'retouche discrète', haut: "réécrit l'image",
        quoi: "Jusqu'où la repasse modifie l'image.",
        cout: "Trop haut : elle réinvente, le personnage change.",
        lieA: 'refiner',
      },
      /* On wide shots the face is only a few dozen pixels. */
      {
        id: 'facedetailer', cle: 'facedetailer', dest: 'preset', type: 'bool',
        label: 'Reprise du visage',
        quoi: "Refait le visage en grand puis le recolle. Sauve yeux et bouche en plan large.",
      },
      /* Measured 09/09 on 30 paired seeds: 96 % failed hands without, 36 % with, no
         seed degraded. ~35 s is half the production time; identity, sharpness and
         texture are unchanged. */
      {
        id: 'handdetailer', cle: 'handdetailer', dest: 'preset', type: 'bool',
        label: 'Reprise des mains',
        quoi: "Refait chaque main en grand. Mains ratées : 96 % sans, 36 % avec (mesuré le 09/09).",
        cout: "+35 s par image.",
      },
      /* Never measured: 0.5 is a starting point set by hand, not a found value. */
      {
        id: 'hdenoise', cle: 'handdetailer_denoise', dest: 'preset', type: 'curseur',
        min: 0.1, max: 0.8, pas: 0.05,
        label: 'Ampleur de la reprise des mains', bas: 'retouche discrète', haut: 'redessine la main',
        quoi: "Jusqu'où la main peut être redessinée.",
        cout: "Jamais mesuré : 0.5 est un point de départ.",
        lieA: 'handdetailer',
      },
      /* Measured: +31 % sharpness, +4 s, next to nothing lost on identity. */
      {
        id: 'upscale', cle: 'upscale_2k', dest: 'preset', type: 'bool',
        label: 'Passage en 2K',
        quoi: "Agrandit puis ramène en 2K.",
        cout: "+31 % de netteté, +4 s.",
      },
      {
        id: 'sharpen', cle: 'sharpen', dest: 'preset', type: 'curseur', min: 0, max: 1, pas: 0.05,
        label: 'Accentuation', bas: 'doux', haut: 'piqué',
        quoi: "Netteté finale.",
        cout: "Trop haut : cheveux hérissés, contours qui croustillent.",
      },
    ],
  },

  {
    titre: 'Vie et matière', replie: true,
    items: [
      {
        id: 'expression', cle: 'expression', dest: 'preset', type: 'bool',
        label: 'Expression du visage',
        quoi: "Fait varier la mine selon le ton. Sans elle, même visage sur toutes les photos.",
      },
      /* Luminance noise weighted toward the shadows, almost none in the highlights. */
      {
        id: 'graintel', cle: 'grain_telephone', dest: 'preset', type: 'bool',
        label: 'Grain de téléphone',
        quoi: "Bruit d'un vrai capteur, surtout dans les ombres : effet photo prise sur le vif.",
      },
      {
        id: 'grainexp', cle: 'grain_export', dest: 'preset', type: 'bool',
        label: 'Mise à la taille de publication',
        quoi: "Redimensionne à la taille du réseau visé. Coupé : taille de génération.",
      },
      /* Measured structurally wrong: as much chroma as luma noise, flat across the
         tonal range, which no sensor does. Raising it stacks two grains. */
      {
        id: 'grainstr', cle: 'grain_strength', dest: 'preset', type: 'curseur', min: 0, max: 0.05, pas: 0.002,
        label: 'Ancien grain du graphe', bas: 'coupé', haut: 'fort',
        quoi: "Laissé à 0 volontairement.",
        cout: "Bruit faux (couleur, uniforme). Remplacé par le grain de téléphone.",
      },
    ],
  },

  {
    titre: 'Contrôle',
    items: [
      {
        id: 'noqc', dest: 'job', type: 'bool',
        label: "Sans contrôle d'identité",
        quoi: "Ne mesure ni ne trie : tout va dans « à revoir ». Pour les essais de rendu.",
        cout: "Indisponible en NSFW : le verdict décide quoi éditer.",
      },
    ],
  },

  {
    titre: 'Édition NSFW', niveau: 'edit',
    items: [
      /* The branch never generates from scratch (project rule): by default this
         tier edits an already validated image. Checked, it runs a full Flux pass
         at the Soft tier first (~55 s). */
      {
        id: 'generavant', dest: 'job', type: 'bool',
        label: "Générer l'image avant de l'éditer",
        quoi: "Produit d'abord une image Soft, puis l'édite. Seulement si aucune image validée n'existe.",
        cout: "+55 s par image.",
      },
      {
        id: 'nsfwsteps', cle: 'steps', dest: 'nsfw', type: 'curseur', min: 4, max: 20, pas: 1,
        label: "Passes d'édition", bas: 'rapide', haut: 'lent',
        quoi: "Modèle rapide, prévu pour 4 à 8 passes.",
        cout: "Plus : plus lent, pas meilleur.",
      },
      /* The fast model is distilled: it expects no guidance. */
      {
        id: 'nsfwcfg', cle: 'cfg', dest: 'nsfw', type: 'curseur', min: 1, max: 4, pas: 0.1,
        label: "Adhérence à l'instruction", bas: 'souple', haut: 'littéral',
        quoi: "Imposée à 1.0 par le modèle rapide.",
        cout: "Plus haut : l'image se dégrade.",
      },
      /* At a fixed seed, 1.14 MP gives almost twice the sharpness of 2.06 MP, same
         identity and a quarter less time. */
      {
        id: 'nsfwpix', cle: 'max_pixels', dest: 'nsfw', type: 'curseur', min: 600000, max: 2100000, pas: 50000,
        label: 'Surface de travail', bas: 'petit et net', haut: 'grand et mou', fmt: 'mp',
        quoi: "Taille de travail de l'édition.",
        cout: "Au-delà de 1,15 MP : zone éditée molle (mesuré).",
      },
      /* Here the face the edit damaged is rebuilt, not just retouched. */
      {
        id: 'nsfwface', cle: 'face_denoise', dest: 'nsfw', type: 'curseur', min: 0.1, max: 0.7, pas: 0.05,
        label: 'Re-rendu du visage', bas: 'retouche', haut: 'reconstruction',
        quoi: "Force de reconstruction du visage après l'édition.",
        cout: "Plus haut qu'en SFW, volontairement.",
      },
    ],
  },
]

/** id -> descriptor, for quick lookups. */
export const BY_ID: Record<string, Setting> = {}
SECTIONS.forEach((section) => section.items.forEach((item) => (BY_ID[item.id] = item)))

/* Launch-bar presets. They no longer short-circuit the panel: they FILL it.
   Before, picking « Rapide » silently threw away the fine settings; now one sees
   exactly what the preset changes, and can retouch it right after. */
export const PRESETS: Record<string, Record<string, number | boolean>> = {
  realisme: {}, // the measured values
  /* `handdetailer` est coupé par les deux presets rapides : c'est le réglage le
     plus cher du panneau (+35 s, la moitié du temps de production), et un
     preset nommé « Rapide » qui le laisserait allumé mentirait sur son nom. */
  rapide: { refiner: false, handdetailer: false },
  /* guidance 3.0 and not 3.5: the panel's own explanation says « au-delà de 3,
     ça se voit », and a preset that contradicts the text displayed next to it
     cannot be explained. Raising the guidance speeds nothing up anyway — the
     number of passes is what costs — it only holds the scene here. */
  brut: {
    refiner: false, facedetailer: false, handdetailer: false, grain_export: false,
    guidance: 3.0,
  },
}

export const fmtVal = (item: Setting, value: number | string): string =>
  item.fmt === 'mp'
    ? `${(Number(value) / 1e6).toFixed(2).replace('.', ',')} MP`
    : item.pas && item.pas < 1
      ? Number(value).toFixed(String(item.pas).split('.')[1].length)
      : String(value)
