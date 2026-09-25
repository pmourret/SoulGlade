/* THE route table. One place, like `static/constants.js` was — never a path
   assembled by hand somewhere else.

   WHAT CHANGES FROM THE LEGACY FRONTEND (migration brief, point 2). Hash routing
   is gone: every screen has a real path. The two screens that used to switch
   behaviour through an attribute get distinct routes instead of that switch —
   `#registre[data-vue]` becomes /characters (the entry gate) and /character (the
   sheet); `#trier[data-metier]` becomes /review (judging the A_REVOIR queue) and
   /gallery (consulting the kept ones). Same behaviour for the user, two honest
   URLs. Sub-views that already had a composed hash keep their shape as a path:
   `#scenes/poses` -> /bank/poses.

   Paths are in English, like the rest of the new code. UI copy stays French. */

export const PATHS = {
  /** Entry gate: the choice grid, shown when no character is claimed. */
  characters: '/characters',
  /** Read-only sheet of the claimed character. */
  character: '/character',
  wizard: '/characters/new',
  produce: '/produce',
  review: '/review',
  gallery: '/gallery',
  bankScenes: '/bank/scenes',
  bankPoses: '/bank/poses',
  poseEditor: '/bank/poses/edit',
  bankTones: '/bank/tones',
  expressionEditor: '/bank/tones/edit',
  /** The Lightroom-style layered editor (design-pass screen-photo-editor,
      §7b) — reached from the simplified modal's "Éditeur avancé →" link.
      `bucket`/`space` travel as query params (`?bucket=&space=`), `:name`
      as the path segment: a photo resolves fully from those three, so the
      URL stays complete and reloadable, unlike the from-scratch pose
      flow's router `state`. */
  photoEditorAdvanced: '/photo-editor',
  /** The training set of the claimed character, and its export (2026-09-10).
      A destination of its own rather than a Banque sub-view: it is not a
      production input one composes, it is what the identity lock is made of. */
  training: '/training',
  worlds: '/worlds',
  application: '/app',
  journal: '/app/journal',
} as const

/** The sections of Application (design-pass screen-12 §S1), in nav order.
    `journal` keeps `/app/journal` — the address the fault banner, the sheet
    and Entraînement already link to. */
export const APP_SECTIONS = ['server', 'comfy', 'adult', 'appearance', 'journal', 'log'] as const
export type AppSection = (typeof APP_SECTIONS)[number]

/** `/app/<section>` — the default section (ComfyUI) is plain `/app`. */
export function appSectionPath(section: AppSection): string {
  return section === 'comfy' ? PATHS.application : `${PATHS.application}/${section}`
}

/** `/worlds/<id>/places` — the catalog editor of one world (ADR-0016). A
    function and not a PATHS entry: it needs an id, like `characterPath`
    needs a claim state. */
export function worldPlacesPath(worldId: string): string {
  return `${PATHS.worlds}/${encodeURIComponent(worldId)}/places`
}

export type ScreenKey =
  | 'character'
  | 'produce'
  | 'review'
  | 'gallery'
  | 'bank'
  | 'training'
  | 'worlds'
  | 'application'

/* CATEGORIES (design-pass screen-0-chrome §S1, 23/09/2026). The side navbar
   listed eight destinations flat, which made « produire une image » and
   « éditer un monde » look like the same kind of move. They are grouped in
   three now: what one PRODUCES, what one PREPARES, and what one REFERS to.

   The categories live in the header; the modules of the open category live in
   a 34 px sub-bar under it. */
export type CategoryKey = 'production' | 'atelier' | 'referentiel'

export type Category = {
  key: CategoryKey
  label: string
}

/* Order on screen. Production first: it is where a session starts. */
export const CATEGORIES: Category[] = [
  { key: 'production', label: 'Production' },
  { key: 'atelier', label: 'Atelier' },
  { key: 'referentiel', label: 'Référentiel' },
]

/* THE NAVIGATION CONTRACT, amended 23/09/2026.

   `data-s` used to carry the ScreenKey of each of the eight flat destinations.
   With a category bar over a sub-bar, the eight are no longer in the DOM at the
   same time — only the open category's modules are. So the contract splits in
   two, and each half keeps an explicit attribute rather than an assumption
   about markup:

     `data-s` on a CATEGORY  -> a CategoryKey (three values)
     `data-m` on a MODULE    -> a ScreenKey

   `.tabs` stays the container class, and now names the category bar. */
export type Destination = {
  key: ScreenKey
  category: CategoryKey
  label: string
  /* Label to use when a character is loaded, when the entry then opens
     something else. « Personnages » leads to the entry gate; once a character
     is open the same entry reads its SHEET, and says so. */
  labelWhenClaimed?: string
  path: string
  icon: string
  /** Shows the count of work WAITING (the A_REVOIR queue). Review only. */
  badge?: boolean
  /* Path prefix that lights this entry, when it is wider than the destination
     itself. Banque opens on /bank/scenes but owns /bank/poses too, exactly as
     the legacy tab stayed lit on `#scenes/poses`. */
  activePrefix?: string
}

/* The seven modules of the studio, grouped by category and in their order
   inside it. `DESTINATIONS` keeps its name and its role — the ONE table the
   chrome reads — only the grouping is new.

   Application is NOT here: it left the categories (§S1) and became an icon
   button in the header's status zone. It is chrome settings, not a place one
   works; listing it beside « Produire » gave it the same weight. Its routes
   still exist, hence `APPLICATION` just below. */
export const DESTINATIONS: Destination[] = [
  {
    key: 'produce',
    category: 'production',
    label: 'Produire',
    path: PATHS.produce,
    icon: 'produce',
  },
  {
    key: 'review',
    category: 'production',
    label: 'Revue',
    path: PATHS.review,
    icon: 'review',
    badge: true,
  },
  {
    key: 'gallery',
    category: 'production',
    label: 'Galerie',
    path: PATHS.gallery,
    icon: 'gallery',
  },
  {
    key: 'bank',
    category: 'atelier',
    label: 'Ateliers',
    path: PATHS.bankScenes,
    icon: 'bank',
    activePrefix: '/bank',
  },
  /* With Ateliers: it reads the character's own images, so it sits with what
     one PREPARES before producing, not with what one consults. */
  {
    key: 'training',
    category: 'atelier',
    label: 'Entraînement',
    path: PATHS.training,
    icon: 'training',
  },
  {
    key: 'character',
    category: 'referentiel',
    label: 'Personnages',
    labelWhenClaimed: 'Fiche',
    path: PATHS.character,
    icon: 'character',
  },
  {
    key: 'worlds',
    category: 'referentiel',
    label: 'Mondes',
    path: PATHS.worlds,
    icon: 'worlds',
    activePrefix: '/worlds',
  },
]

/* Application, out of the categories but still a destination: the header's
   icon button needs its path, its icon and its label, and `/app/journal` must
   still light it.

   `Omit<…, 'category'>` rather than a Destination with a category picked at
   random: it belongs to none, and writing one anyway would be a value nothing
   reads and everything could start trusting. `isDestinationActive` only ever
   touches `path` and `activePrefix`, so it reads this shape unchanged. */
export const APPLICATION: Omit<Destination, 'category'> = {
  key: 'application',
  label: 'Application',
  path: PATHS.application,
  icon: 'application',
}

/* THE shareable form of ONE image, built in ONE place: the bucket decides the
   destination — a validated one is read in the Galerie, everything else is
   judged in the Revue. The callers (inspector, end of batch) do not have to
   guess it. Ported from `hashPourImage` in `static/constants.js`; the shape
   changed from a hash to a path, the rule did not. */
export function screenForImage(bucket: string | null | undefined, name: string): string {
  const base = bucket === 'OK' ? PATHS.gallery : PATHS.review
  return `${base}/${encodeURIComponent(name)}`
}

/* Is this destination the one currently open?

   A plain `startsWith` would light « Personnages » (/character) on the entry
   gate (/characters) as well — one path is a prefix of the other as a STRING,
   not as a route. Matching on the segment boundary is what separates them, and
   it is also what lights Application on /app/journal, its sub-screen. */
export function isDestinationActive(
  destination: Pick<Destination, 'path' | 'activePrefix'>,
  pathname: string,
): boolean {
  const base = destination.activePrefix ?? destination.path
  return pathname === base || pathname.startsWith(base + '/')
}

/* Which category the open path belongs to, or null.

   DERIVED, never stored. A category held in its own state would be a second
   source of truth for « where am I », and the two drift the first time a screen
   navigates without going through the bar (the inspector jumping to an image,
   a deep link, the back button). One rule, the same `isDestinationActive` the
   modules use.

   Null on /app and /app/journal — Application is out of the categories, so
   none is lit while it is open and its header button carries `aria-current`
   instead. Null on the entry gate too, where there is no category bar at all. */
export function activeCategory(pathname: string): CategoryKey | null {
  const open = DESTINATIONS.find((destination) => isDestinationActive(destination, pathname))
  return open?.category ?? null
}

/* The modules of one category, in their table order. */
export function modulesOf(category: CategoryKey): Destination[] {
  return DESTINATIONS.filter((destination) => destination.category === category)
}

/* The navbar entry « Personnages » leads to the sheet of the claimed character,
   or to the entry gate when none is claimed. That switch used to be an attribute
   written inside one screen; it is now a route choice, made here. */
export function characterPath(isClaimed: boolean): string {
  return isClaimed ? PATHS.character : PATHS.characters
}
