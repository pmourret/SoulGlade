/* What a place, an intention and a scene of a world ARE, for the editor
   (ADR-0027) — their fields, how a stored entry becomes a form and back, and
   what the form must hold before it is written.

   ONE EDITOR, THREE SPECS (IT-11 chantier 4). The three catalogs share every
   gesture — open, create, save through the chrome's DirtyBar, remove, the
   leave guard — and differ only by their fields. The tones keep their own
   editor (`useToneCatalogue`, `ToneInspector`): a tone carries an expression
   range that is not a text field, and it was delivered and audited on 25/09.

   PURE DATA AND FUNCTIONS (`.claude/rules/frontend.md`): no React, no API. */
import { ID_RE, TONE_KEY_RE, slugify, toneKey } from './slugify'
import type { WorldIntention, WorldPlace, WorldScene } from './useWorldCatalog'
import type { WorldTone } from './useWorldTones'

/** A form: every field as text, the way inputs hold them. */
export type Draft = Record<string, string>

/** What the select fields list — the world's own catalogs. */
export type CatalogContext = {
  places: WorldPlace[] | null
  intentions: WorldIntention[] | null
  tones: WorldTone[] | null
}

export type FieldSpec = {
  name: string
  label: string
  kind: 'text' | 'textarea' | 'select' | 'level'
  hint?: string
  /** For a select: the choices, value then label, « aucun » first. */
  options?: (ctx: CatalogContext) => [string, string][]
}

export type CatalogSpec<T> = {
  /** Field holding the identity: `id` for places and scenes, `key` for intentions. */
  idKey: 'id' | 'key'
  idLabel: string
  /** The identity a name proposes while creating (`slugify.ts`). */
  propose: (label: string) => string
  idRule: RegExp
  idRuleText: string
  /** What the identity is written into, said once it is frozen. */
  idFrozenHint: string
  noun: string
  /** « un lieu », « une intention », « une scène » — for sentences. */
  article: string
  titleNew: string
  fields: FieldSpec[]
  toDraft: (entry: T | null) => Draft
  /** The entry written back, MERGED onto the stored one: a key this form does
      not display crosses the save untouched (`_` notes among them). */
  toEntry: (draft: Draft, previous: T | null) => T
  /** What the form still misses before it can be written, or null. */
  missing: (draft: Draft) => string | null
}

const str = (value: unknown) => (typeof value === 'string' ? value : '')

/** Keeps a key the catalog no longer declares visible and selected, rather
    than silently showing « aucun » over a value the file still holds. */
function withOrphan(options: [string, string][], current: string): [string, string][] {
  return current && !options.some(([value]) => value === current)
    ? [...options, [current, `${current} (absent du monde)`]]
    : options
}

const DECOR_HINT = 'Où l’on est : le décor seul. Ni action, ni lumière, ni tenue : ce sont les scènes qui les portent.'

export const PLACE_SPEC: CatalogSpec<WorldPlace> = {
  idKey: 'id',
  idLabel: 'Identifiant',
  propose: slugify,
  idRule: ID_RE,
  idRuleText: 'minuscules, chiffres, - et _',
  idFrozenHint: 'figé, cité par les scènes',
  noun: 'lieu',
  article: 'un lieu',
  titleNew: 'Nouveau lieu',
  fields: [
    { name: 'label', label: 'Nom du lieu', kind: 'text' },
    { name: 'prompt', label: 'Décor', kind: 'textarea', hint: DECOR_HINT },
  ],
  toDraft: (place) => ({ id: str(place?.id), label: str(place?.label), prompt: str(place?.prompt) }),
  toEntry: (draft, previous) => ({
    ...(previous ?? {}),
    id: draft.id.trim(),
    label: draft.label.trim(),
    prompt: draft.prompt.trim(),
  }),
  missing: (draft) => (draft.prompt.trim() ? null : 'un lieu a besoin de son décor'),
}

export const INTENTION_SPEC: CatalogSpec<WorldIntention> = {
  idKey: 'key',
  idLabel: 'Clé',
  propose: toneKey,
  idRule: TONE_KEY_RE,
  idRuleText: 'minuscules, chiffres et _',
  idFrozenHint: 'figée, citée par les scènes, le journal et le dossier d’export',
  noun: 'intention',
  article: 'une intention',
  titleNew: 'Nouvelle intention',
  fields: [
    { name: 'label', label: 'Nom de l’intention', kind: 'text' },
    { name: 'icon', label: 'Icône', kind: 'text', hint: 'Un caractère, affiché dans Produire.' },
    {
      name: 'prompt_add',
      label: 'Fragment de prompt',
      kind: 'textarea',
      hint: 'Ajouté au prompt de chaque scène de cette intention, à tous les niveaux. Peut rester vide.',
    },
    {
      name: 'tone',
      label: 'Ton proposé',
      kind: 'select',
      hint: 'Produire le propose quand on choisit cette intention ; on peut toujours en changer.',
      options: (ctx) => [['', 'aucun'], ...(ctx.tones ?? []).map((t): [string, string] => [t.key, t.label || t.key])],
    },
  ],
  toDraft: (intention) => ({
    key: str(intention?.key),
    label: str(intention?.label),
    icon: str(intention?.icon),
    prompt_add: str(intention?.prompt_add),
    tone: str(intention?.defaults?.tone),
  }),
  toEntry: (draft, previous) => {
    const { defaults: _dropped, ...rest } = previous ?? ({} as WorldIntention)
    const entry: WorldIntention = {
      ...rest,
      key: draft.key.trim(),
      label: draft.label.trim(),
      icon: draft.icon.trim(),
      prompt_add: draft.prompt_add.trim(),
    }
    return draft.tone ? { ...entry, defaults: { tone: draft.tone } } : entry
  },
  missing: (draft) => (draft.label.trim() ? null : 'une intention a besoin d’un nom'),
}

export const SCENE_SPEC: CatalogSpec<WorldScene> = {
  idKey: 'id',
  idLabel: 'Identifiant',
  propose: slugify,
  idRule: ID_RE,
  idRuleText: 'minuscules, chiffres, - et _',
  idFrozenHint: 'figé, cité par les banques des personnages et les fichiers produits',
  noun: 'scène',
  article: 'une scène',
  titleNew: 'Nouvelle scène',
  fields: [
    { name: 'label', label: 'Nom de la scène', kind: 'text' },
    {
      name: 'intention',
      label: 'Intention',
      kind: 'select',
      hint: 'Ce que la scène veut montrer ; c’est aussi son dossier d’export.',
      options: (ctx) => [
        ['', 'aucune'],
        ...(ctx.intentions ?? []).map((i): [string, string] => [i.key, i.label || i.key]),
      ],
    },
    {
      name: 'place',
      label: 'Lieu',
      kind: 'select',
      hint: 'Le décor s’ajoute au texte de la scène.',
      options: (ctx) => [['', 'aucun'], ...(ctx.places ?? []).map((p): [string, string] => [p.id, p.label || p.id])],
    },
    {
      name: 'prompt',
      label: 'Ce qui s’y passe',
      kind: 'textarea',
      hint: 'Action, cadrage, lumière. Jamais le visage, jamais la tenue : chaque personnage porte la sienne.',
    },
    {
      name: 'intensity',
      label: 'Niveau minimum',
      kind: 'level',
      hint: 'Facultatif. La scène ne se propose qu’à partir de ce niveau ; chaque personnage peut l’ajuster.',
    },
  ],
  toDraft: (scene) => ({
    id: str(scene?.id),
    label: str(scene?.label),
    intention: str(scene?.intention),
    place: str(scene?.place),
    prompt: str(scene?.prompt),
    intensity: scene?.intensity == null ? '' : String(scene.intensity),
  }),
  toEntry: (draft, previous) => {
    const { intensity: _i, place: _p, intention: _n, ...rest } = previous ?? ({} as WorldScene)
    const level = Number.parseInt(draft.intensity, 10)
    return {
      ...rest,
      id: draft.id.trim(),
      label: draft.label.trim(),
      prompt: draft.prompt.trim(),
      ...(draft.intention ? { intention: draft.intention } : {}),
      ...(draft.place ? { place: draft.place } : {}),
      ...(Number.isInteger(level) && level >= 0 ? { intensity: level } : {}),
    } as WorldScene
  },
  missing: (draft) => (draft.prompt.trim() ? null : 'une scène a besoin de dire ce qui s’y passe'),
}

/** The prompt a scene composes with its place: « <scene>, <decor> » — the
    mirror of `worlds.materialize`, shown so the author reads what the model
    will receive. */
export function composedPrompt(draft: Draft, places: WorldPlace[] | null): string {
  const decor = places?.find((p) => p.id === draft.place)?.prompt ?? ''
  return [draft.prompt.trim(), decor.trim()].filter(Boolean).join(', ')
}

export function selectOptions(field: FieldSpec, ctx: CatalogContext, current: string): [string, string][] {
  return withOrphan(field.options ? field.options(ctx) : [], current)
}
