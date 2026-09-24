/* The scene composer: one scene, seven sections, wireframe-driven
   (31/08/2026), in a rail since the three-panel pass (screen-7b, 23/09/2026).

   WHAT IT REPLACES. The inspector used to be one flat form — a dozen fields
   stacked in a single scroll, id to pose. This walks the same fields through
   seven small panels instead: general, lumière, vêtements, pose, un
   récapitulatif du prompt, une amélioration IA (pour l'instant un gabarit —
   voir la note du panneau), et le JSON final.

   THE SEVEN ICONS BECAME A LABELLED RAIL (design pass screen-7b §S4.2), the
   header moved OUT to `SceneHeader` (rendered by `BankScreen`, so it survives
   the Monde tab replacing this whole column), the live prompt moved OUT to
   `ScenePreviewPanel`, and the Suivant/Précédent/Dupliquer/Supprimer bars at
   the bottom of every panel are gone — see those two files for why. What is
   left here is exactly the form: the same seven panels, the same fields, none
   added, none removed.

   A TABLIST, NOT A NAV — AND RADIX'S, NOT HAND-ROLLED (audit UX/UI
   follow-up). `BankScreen`'s Scènes|Poses switch is a nav because it
   NAVIGATES — two routes, the browser's back button walks between them. These
   seven panels are the opposite case: one widget, no URL change, nothing to
   bookmark. `@radix-ui/react-tabs` owns the roving tabindex, the arrow/Home/End
   keys and the aria-selected/aria-controls/aria-labelledby wiring — three
   separate hand-rolled bugs surfaced in this exact widget before it landed
   here (a focus race on `requestAnimationFrame`, `aria-controls` pointing at
   an unmounted panel, the id template drifting from what the DOM actually
   had). `Tabs.Content` still unmounts inactive panels by default just like
   the hand-rolled version did — `forceMount` + `hidden` below is still ours
   to keep, Radix does not solve that part for free.

   THE PROMPT IS SPLIT HERE, NOWHERE ELSE. `scenes.json` still carries one
   `prompt` string, read by `build_jobs` exactly as before (byte-exact test,
   CLAUDE.md §3). `promptBase` / `promptLight` / `promptPose` are draft-only
   fragments, joined by `composePrompt` on save — see the long comment on
   `SceneDraft` in ScenesStoreContext for why reloading a scene cannot tell the
   fragments apart again. `wardrobe` (what is worn, per level) is presented in
   the Vêtements tab as "Prompt de vêtement" but is a DIFFERENT mechanism
   entirely — injected by `wardrobe_for` at generation time, never merged into
   the joined prompt (the field's own label has always said "jamais la
   tenue") — so it keeps its own control, unlocked by a world link that the
   three prompt fragments respect (ADR-0015: `prompt` is the one key a linked
   scene never owns, `wardrobe`/`pose` are overlay keys it always does). */
import { useEffect, useRef, useState, type RefObject } from 'react'
import * as Tabs from '@radix-ui/react-tabs'
import { Link } from 'react-router-dom'

import { useApi } from '../../../api/useApi'
import { Dialog } from '../../../chrome/Dialog'
import { Icon } from '../../../chrome/Icon'
import { useToast } from '../../../chrome/ToastContext'
import type { Creative } from '../../../state/TaxonomyContext'
import {
  bandOf,
  composePrompt,
  draftsToScenes,
  textToWardrobe,
  type SceneDraft,
} from '../../../state/ScenesStoreContext'
import { PATHS } from '../../../app/routes'
import type { SceneField } from '../sceneChanges'
import { InfoHint } from './InfoHint'
import { PromptField } from './PromptField'
import { FRAGMENT_COLORS, sceneFragments } from './sceneFragments'
import { SECTIONS, type SectionKey } from './sections'
import { SectionRail } from './SectionRail'
import { joinWardrobeByLevel, splitWardrobeByLevel, WARDROBE_CATALOG, WARDROBE_LEVELS } from './wardrobeCatalog'
import { PoseEditorModal } from '../../pose-editor/PoseEditorModal'

const FORMATS = ['4:5', '2:3', '9:16', '1:1']

/* A field that differs from the saved scene wears a `--warn` border (design
   pass screen-7b §S4.3). The value is the whole signal: the rail's own dot
   says the same thing at the section level, so colour is never alone. */
const warnIf = (changed: Set<SceneField>, field: SceneField) =>
  changed.has(field) ? 'border-warn' : undefined

/* Vocabulary of the walk, for the intention selector. A scene carrying a key
   absent from creative.json KEEPS it: we add it to the list rather than let it
   vanish from the selector — hence from the scene. */
function intentionOptions(creative: Creative | null, current: string) {
  const entries = (creative?.intentions ?? []).map((i) => [i.key, i.label] as [string, string])
  if (current && !entries.some(([key]) => key === current)) entries.push([current, current])
  return entries
}

/** Filename + human label (design pass écran 7, §A1) — the same shape
    `usePoseBank`/`PoseCard` already resolve for the Poses screen, fetched
    separately here (`/api/pose/bank`) rather than widening `poses:
    string[]` on `/api/scenes`: that route stays "enough for a picker" for
    whichever other consumer reads it (its own doc comment,
    `api/routers/images.py`), this composer just asks the richer route for
    itself, same as `usePoseBank` already does. */
type PoseSummary = { name: string; label: string | null }

/* Skeletons of INPUTS/POSE/, served by /api/scenes. A scene pointing at a
   missing skeleton (file moved, renamed) KEEPS it in the list rather than lose
   it in silence — same rule as an out-of-taxonomy intention. */
function poseOptions(poses: PoseSummary[], current: string) {
  return current && !poses.some((p) => p.name === current)
    ? [...poses, { name: current, label: null }]
    : poses
}

export function SceneComposer({
  draft,
  creative,
  poses,
  produced,
  worldLinked,
  changed,
  narrow,
  onPatch,
  onSaveDocument,
}: {
  draft: SceneDraft
  creative: Creative | null
  poses: string[]
  produced: number | null
  /* A scene bound to a world place (ADR-0015): its frame — the prompt this
     composer builds — is re-derived server-side on every save, so the four
     fragments below are locked here regardless of what gets typed. Wardrobe
     levels and the pose skeleton are OVERLAY keys, never locked by this. */
  worldLinked: boolean
  /** Draft fields differing from the saved scene (`sceneChanges`) — borders
      here, dots on the rail. */
  changed: Set<SceneField>
  /** Under 1100 px the rail keeps its icons and clips its labels (§S6). */
  narrow: boolean
  onPatch: (patch: Partial<SceneDraft>) => void
  /** The document-level save — same action as the banner's "Enregistrer",
      offered again from the JSON panel for a "I've checked it, ship it" close. */
  onSaveDocument: () => void
}) {
  const [tab, setTab] = useState<SectionKey>('general')
  const idRef = useRef<HTMLInputElement | null>(null)
  const api = useApi()

  /* Labels for `poses` (design pass écran 7, §A1) — refetched whenever the
     filename list itself changes, same trigger `usePoseBank`'s own
     `reloadBankDetail` uses. A pose with no sidecar (legacy, or the fetch
     hasn't landed yet) falls back to its filename below, same as
     `PoseCard`'s own `label || name`. */
  const [poseLabels, setPoseLabels] = useState<Record<string, string | null>>({})
  useEffect(() => {
    let cancelled = false
    void api
      .get<{ poses?: { nom: string; label: string | null }[] }>('/api/pose/bank')
      .then((response) => {
        if (cancelled) return
        const map: Record<string, string | null> = {}
        for (const entry of response.poses ?? []) map[entry.nom] = entry.label
        setPoseLabels(map)
      })
    return () => {
      cancelled = true
    }
  }, [api, poses])
  const posesWithLabels: PoseSummary[] = poses.map((name) => ({ name, label: poseLabels[name] ?? null }))

  /* Opening a DIFFERENT scene always starts on Général and puts the cursor in
     its name — the same "opening focuses the identifier" contract the flat
     form had, just re-anchored to the tab that now holds it. Switching tabs on
     the SAME scene must not fight the user's own navigation, hence keying on
     `draft.uid` and nothing else. */
  useEffect(() => {
    setTab('general')
    idRef.current?.focus()
  }, [draft.uid])

  const lockedNote =
    "hérité du lieu — s'édite dans l'onglet Monde, ce qui serait tapé ici ne survit pas à l'enregistrement (ADR-0015)."

  return (
    /* VERTICAL: the rail is the tablist, so Radix binds ↑/↓ (and Home/End)
       instead of ←/→ — the `orientation` is the only thing that has to be
       said for the whole roving-focus group to follow. `flex min-h-0`, not a
       plain block: the rail and the scrolling form are two columns of the
       same row, and the form's own `overflow-y-auto` only resolves once every
       link of the chain up to `#sceneInspector` is definite. */
    <Tabs.Root
      value={tab}
      onValueChange={(v) => setTab(v as SectionKey)}
      orientation="vertical"
      className="flex min-h-0 flex-1"
    >
      <SectionRail active={tab} changed={changed} narrow={narrow} />

      {/* All SEVEN panels stay mounted (`forceMount`) — only the active one's
          CONTENT does not (audit UX/UI, M2). Radix itself only mounts the
          active `Tabs.Content` by default, which would have reproduced the
          exact bug this fixed: `aria-controls` pointing at an unmounted
          panel for the six inactive tabs. `hidden` keeps the same practical
          effect (invisible, out of the accessibility tree, out of tab order)
          without the trigger lying about what it controls — Radix computes
          `aria-controls`/`aria-labelledby` itself from `value`, correctly,
          whichever panels happen to be mounted. */}
      {/* Sous 1100 px le formulaire ne defile PAS pour son compte : toute la
          colonne defile d'un bloc (BankScreen, §S6), sinon deux barres de
          defilement imbriquees se disputent le meme geste. */}
      <div className="min-h-0 min-w-0 flex-1 overflow-y-auto max-[1100px]:overflow-visible">
        {SECTIONS.map((section) => (
          <Tabs.Content
            key={section.key}
            value={section.key}
            data-tabpanel={section.key}
            forceMount
            hidden={tab !== section.key}
          >
            {tab === section.key && (
              /* A form is read in a column, not across a studio-wide screen:
                 the content is capped at 880 px (design pass screen-7b §S4.3)
                 whatever room the centre column has. The cap is on an INNER
                 wrapper, never on the `hidden` element itself (audit UX/UI,
                 m2): a layout utility and the UA's `[hidden]{display:none}`
                 carry the same specificity, and the utility can win. */
              <div className="max-w-[880px] p-[20px]">
                <h2 className="m-0 text-[15px] font-[650] normal-case tracking-normal">
                  {section.label}
                </h2>
                {/* The form names the model field it writes: the JSON panel
                    and `scenes.json` stop being a separate vocabulary. */}
                <p className="tiny mt-[2px] mb-[16px]">{section.model}</p>

                {section.key === 'general' && (
                  <GeneralPanel
                    draft={draft}
                    creative={creative}
                    produced={produced}
                    worldLinked={worldLinked}
                    changed={changed}
                    idRef={idRef}
                    onPatch={onPatch}
                    onGotoClothing={() => setTab('clothing')}
                  />
                )}
                {section.key === 'light' && (
                  <LightPanel
                    draft={draft}
                    worldLinked={worldLinked}
                    lockedNote={lockedNote}
                    changed={changed}
                    onPatch={onPatch}
                  />
                )}
                {section.key === 'clothing' && (
                  <ClothingPanel draft={draft} changed={changed} onPatch={onPatch} />
                )}
                {section.key === 'pose' && (
                  <PosePanel
                    draft={draft}
                    poses={posesWithLabels}
                    worldLinked={worldLinked}
                    lockedNote={lockedNote}
                    changed={changed}
                    onPatch={onPatch}
                  />
                )}
                {section.key === 'recap' && (
                  <RecapPanel
                    draft={draft}
                    worldLinked={worldLinked}
                    lockedNote={lockedNote}
                    changed={changed}
                    onPatch={onPatch}
                  />
                )}
                {section.key === 'ai' && <AiPanel draft={draft} />}
                {section.key === 'json' && <JsonPanel draft={draft} onSaveDocument={onSaveDocument} />}
              </div>
            )}
          </Tabs.Content>
        ))}
      </div>
    </Tabs.Root>
  )
}

/* ---------------------------------------------------------------- Général */
function GeneralPanel({
  draft,
  creative,
  produced,
  worldLinked,
  changed,
  idRef,
  onPatch,
  onGotoClothing,
}: {
  draft: SceneDraft
  creative: Creative | null
  produced: number | null
  worldLinked: boolean
  changed: Set<SceneField>
  idRef: RefObject<HTMLInputElement | null>
  onPatch: (patch: Partial<SceneDraft>) => void
  /** Jumps to the Vêtements tab — the gauge below answers "why this ceiling",
      this answers "where do I change it". */
  onGotoClothing: () => void
}) {
  const band = bandOf({
    intensity: Number.parseInt(draft.bandLo, 10) || 0,
    wardrobe: textToWardrobe(draft.wardrobe),
  })

  return (
    <div>
      <label className="f">
        <span>identifiant — sert de nom de fichier</span>
        <input
          ref={idRef}
          className={`font-semibold ${warnIf(changed, 'id') ?? ''}`}
          data-f="id"
          value={draft.id}
          onChange={(e) => onPatch({ id: e.target.value })}
        />
      </label>
      <p className="tiny mt-[6px] mb-[14px]">
        {produced
          ? `${produced} image(s) déjà produite(s) — renommer l'identifiant les détache de cette scène.`
          : 'jamais produite'}
      </p>

      <label className="f mt-[10px]">
        <span>
          intention — sert aussi de dossier d'export
          {worldLinked && <> · <b>héritée du lieu</b>, s'édite dans l'onglet Monde</>}
        </span>
        <select
          className={warnIf(changed, 'intention')}
          data-f="intention"
          value={draft.intention}
          disabled={worldLinked}
          onChange={(e) => onPatch({ intention: e.target.value })}
        >
          <option value="">— aucune —</option>
          {intentionOptions(creative, draft.intention).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </label>

      <div className="mt-[12px] grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-[14px]">
        <label className="f">
          <span>format</span>
          <select
            className={warnIf(changed, 'format')}
            data-f="format"
            value={draft.format}
            onChange={(e) => onPatch({ format: e.target.value })}
          >
            {FORMATS.map((f) => (
              <option key={f}>{f}</option>
            ))}
          </select>
        </label>
        <label className="f">
          <span>images</span>
          <input
            className={warnIf(changed, 'count')}
            data-f="count"
            type="number"
            min={1}
            value={draft.count}
            onChange={(e) => onPatch({ count: e.target.value })}
          />
        </label>
        <label className="f">
          <span>guidance (option)</span>
          <input
            className={warnIf(changed, 'guidance')}
            data-f="guidance"
            type="number"
            step="0.1"
            placeholder="défaut"
            value={draft.guidance}
            onChange={(e) => onPatch({ guidance: e.target.value })}
          />
        </label>
        <div>
          <label className="f">
            <span>
              niveau minimum
              <InfoHint text="Le maximum n'est pas saisi : il est déduit de la tenue la plus haute déclarée dans l'onglet Vêtements, pour ne pas avoir deux champs qui peuvent se contredire." />
            </span>
            <input
              className={warnIf(changed, 'bandLo')}
              data-f="band_lo"
              type="number"
              min={0}
              max={3}
              value={draft.bandLo}
              onChange={(e) => onPatch({ bandLo: e.target.value })}
            />
          </label>
          <BandGauge band={band} onJump={onGotoClothing} />
        </div>
      </div>

      <div className="mt-[12px] grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-[14px]">
        <label className="f">
          <span>tons affins — virgules</span>
          <input
            className={warnIf(changed, 'tones')}
            data-f="tones"
            placeholder={(creative?.tones ?? []).map((t) => t.key).join(', ')}
            value={draft.tones}
            onChange={(e) => onPatch({ tones: e.target.value })}
          />
        </label>
        <label className="f">
          <span>tags — virgules</span>
          <input
            className={warnIf(changed, 'tags')}
            data-f="tags"
            value={draft.tags}
            onChange={(e) => onPatch({ tags: e.target.value })}
          />
        </label>
      </div>
    </div>
  )
}

/* Compact 0→3 gauge — segments `band[0]`..`band[1]` filled in accent, the rest
   dim. Clickable: jumps to Vêtements, since the ceiling shown here is DEDUCED
   from what is declared there (design pass écran 7, §V1) — the gauge answers
   "why this ceiling" on sight, the click answers "where do I change it". */
function BandGauge({ band, onJump }: { band: [number, number]; onJump: () => void }) {
  return (
    <button
      type="button"
      className="mt-[6px] flex cursor-pointer items-center gap-[3px] rounded-[6px]
                 border-0 bg-transparent p-0 focus-visible:outline-2
                 focus-visible:outline-focus focus-visible:outline-offset-2"
      aria-label={`Niveaux ${band[0]} à ${band[1]} — ouvrir l'onglet Vêtements pour changer le plafond`}
      data-hint-text="Le plafond est déduit de la tenue la plus haute déclarée dans l'onglet Vêtements — cliquer pour y aller."
      onClick={onJump}
    >
      {[0, 1, 2, 3].map((level) => (
        <span
          key={level}
          aria-hidden="true"
          className={`h-[6px] w-[20px] rounded-[2px] ${
            level >= band[0] && level <= band[1] ? 'bg-acc' : 'bg-line2'
          }`}
        />
      ))}
    </button>
  )
}

/* ----------------------------------------------------------------- Lumière */
function LightPanel({
  draft,
  worldLinked,
  lockedNote,
  changed,
  onPatch,
}: {
  draft: SceneDraft
  worldLinked: boolean
  lockedNote: string
  changed: Set<SceneField>
  onPatch: (patch: Partial<SceneDraft>) => void
}) {
  return (
    <div>
      <PromptField
        dataField="prompt_light"
        label="Prompt de lumière de la scène"
        hint="Rejoint le prompt final à l'enregistrement, après le décor et avant le vêtement et la pose."
        placeholder="ex : golden hour, soft window light"
        value={draft.promptLight}
        disabled={worldLinked}
        lockedNote={worldLinked ? lockedNote : undefined}
        changed={changed.has('promptLight')}
        onChange={(value) => onPatch({ promptLight: value })}
      />

      <label className="f mt-[14px]">
        <span>variantes de lumière ou de saison (une par ligne) — jamais une tenue</span>
        <textarea
          className={`min-h-[68px] resize-y ${warnIf(changed, 'variants') ?? ''}`}
          data-f="variants"
          value={draft.variants}
          onChange={(e) => onPatch({ variants: e.target.value })}
        />
      </label>

      <EmptyCatalog
        label="Travailler depuis un template de lumière"
        hint="Catalogue de templates de lumière réutilisables — pas encore alimenté dans cette version. En attendant, décris la lumière directement ci-dessus."
        empty="catalogue pas encore peuplé"
      />
    </div>
  )
}

/* --------------------------------------------------------------- Vêtements
   Never gated by `worldLinked`: `wardrobe` is an OVERLAY key (ADR-0015 §2),
   the one thing a world-linked scene always keeps as its own — unlike the
   three prompt fragments, it is never re-derived nor discarded at save.

   FOUR FIELDS, ONE PER LEVEL (design pass écran 7, §V2) — replaces the single
   free-text zone prefixed by hand (« 0: a linen shirt… »), where a mistyped
   prefix silently dropped the line into no level at all. `draft.wardrobe`
   stays the SAME flat "N: description" text underneath (`composePrompt`/
   `bandOf` never see this split); `splitWardrobeByLevel`/`joinWardrobeByLevel`
   (wardrobeCatalog.ts) are the round trip, done fresh on every render rather
   than held as separate state — the same "derived, never stored" rule
   `useSceneWorkbench.tsx` already follows, so this panel can never drift from
   `draft.wardrobe` itself. A line that does not parse (typed elsewhere, via
   the Recap tab's raw mirror) rides along as `extra`, untouched. */
function ClothingPanel({
  draft,
  changed,
  onPatch,
}: {
  draft: SceneDraft
  /* `wardrobe` is ONE model field split into four inputs for comfort, so the
     `--warn` border marks all four when it differs from the saved scene: the
     border says "this field has an unsaved edit", and the field is the whole
     outfit — not one line of it. */
  changed: Set<SceneField>
  onPatch: (patch: Partial<SceneDraft>) => void
}) {
  /* Filter narrows which garments the grid shows; SELECTING one only
     highlights it. Nothing touches `wardrobe` until "+" is pressed — a
     deliberate two-step (browse, then commit) rather than the earlier
     "every click writes a line" version, which made a mis-click hard to
     notice among a dozen entries. */
  const [filter, setFilter] = useState('')
  const [selected, setSelected] = useState('')
  /* Audit UX/UI (M4) : the selector used to always write "0: ...", so it
     stopped being useful the moment a scene needed a garment above the
     floor level — the exact mechanic (`bandOf`) this whole tab exists to
     feed. Defaults to the scene's OWN minimum rather than a flat 0: a scene
     already living at niveau 1 most likely wants its next garment there
     too, not silently back at 0. Also which of the 4 fields below "+" writes
     into — the active level the panel's own hint refers to. */
  const [level, setLevel] = useState(() => Math.min(3, Math.max(0, Number.parseInt(draft.bandLo, 10) || 0)))
  const items = filter
    ? (WARDROBE_CATALOG.find((c) => c.category === filter)?.items ?? [])
    : WARDROBE_CATALOG.flatMap((c) => c.items)

  const { byLevel, extra } = splitWardrobeByLevel(draft.wardrobe)
  const setLevelText = (targetLevel: number, text: string) =>
    onPatch({ wardrobe: joinWardrobeByLevel({ ...byLevel, [targetLevel]: text }, extra) })

  return (
    <div>
      <span className="text-[12px] text-dim">
        Prompt de vêtement, par niveau
        <InfoHint text="Une tenue par ligne — le champ EST le niveau, plus besoin de le taper devant. Le niveau le plus haut renseigné ici fixe jusqu'où la scène peut monter. Jamais fondu dans le prompt final envoyé au modèle : la tenue est injectée séparément selon le niveau de génération — c'est ce que le studio veut dire par « jamais la tenue »." />
      </span>
      <div className="mt-[8px] grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-[10px]">
        {WARDROBE_LEVELS.map((lvl) => (
          <label className="f" key={lvl}>
            <span>
              niveau {lvl}
              {lvl === 0 && ' — repli des niveaux au-dessus tant qu ils sont vides'}
            </span>
            <textarea
              className={`min-h-[56px] resize-y ${warnIf(changed, 'wardrobe') ?? ''}`}
              data-f={`wardrobe_${lvl}`}
              placeholder={lvl === 0 ? 'a beige knit sweater and jeans' : undefined}
              value={byLevel[lvl]}
              onChange={(e) => setLevelText(lvl, e.target.value)}
            />
          </label>
        ))}
      </div>
      {extra.length > 0 && (
        <p className="tiny mt-[8px] mb-0">
          {extra.length} ligne{extra.length > 1 ? 's' : ''} sans niveau reconnu, laissée
          {extra.length > 1 ? 's' : ''} intacte{extra.length > 1 ? 's' : ''} — visible
          {extra.length > 1 ? 's' : ''} et modifiable{extra.length > 1 ? 's' : ''} dans l'onglet Prompt global.
        </p>
      )}

      <div className="mt-[16px] flex flex-wrap items-center justify-between gap-[10px]">
        <span className="text-[12px] text-dim">
          Sélecteur de vêtement
          <InfoHint text="Vocabulaire de départ en texte — des images de collection remplaceront ces cases à terme. Filtre par catégorie, sélectionne une pièce, choisis le niveau, puis « + » l'ajoute au champ de ce niveau, sans toucher aux autres." />
        </span>
        <div className="flex items-center gap-[8px]">
          <label className="sr-only" htmlFor="wardrobeFilter">
            filtrer le sélecteur de vêtement par catégorie
          </label>
          <select
            id="wardrobeFilter"
            className="!w-auto"
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value)
              setSelected('')
            }}
          >
            <option value="">toutes les catégories</option>
            {WARDROBE_CATALOG.map(({ category }) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
          <label className="sr-only" htmlFor="wardrobeLevel">
            niveau du champ où ajouter la pièce
          </label>
          <select
            id="wardrobeLevel"
            className="!w-auto"
            value={level}
            onChange={(e) => setLevel(Number(e.target.value))}
          >
            {WARDROBE_LEVELS.map((n) => (
              <option key={n} value={n}>
                niveau {n}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="btn sm"
            aria-label="Ajouter la pièce sélectionnée comme nouvelle ligne"
            disabled={!selected}
            onClick={() => setLevelText(level, byLevel[level] ? `${byLevel[level]}\n${selected}` : selected)}
          >
            +
          </button>
        </div>
      </div>

      <div
        className="mt-[8px] grid max-h-[230px] grid-cols-[repeat(auto-fill,minmax(92px,1fr))]
                   gap-[8px] overflow-y-auto rounded-[8px] border border-line2 p-[8px]"
      >
        {items.map((item) => (
          <button
            key={item}
            type="button"
            aria-pressed={selected === item}
            title={item}
            /* A square placeholder for the illustrated thumbnail this control
               will show once a real catalog exists — the text sits where the
               image will. */
            className={`flex aspect-square items-center justify-center overflow-hidden rounded-[8px]
                       border p-[6px] text-center text-[10.5px] leading-tight text-dim ${
                         selected === item ? 'border-acc bg-panel2' : 'border-line2 bg-panel'
                       }`}
            onClick={() => setSelected(item)}
          >
            {item}
          </button>
        ))}
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------- Pose */
function PosePanel({
  draft,
  poses,
  worldLinked,
  lockedNote,
  changed,
  onPatch,
}: {
  draft: SceneDraft
  poses: PoseSummary[]
  worldLinked: boolean
  lockedNote: string
  changed: Set<SceneField>
  onPatch: (patch: Partial<SceneDraft>) => void
}) {
  const options = poseOptions(poses, draft.pose)
  // Same `label || name` fallback as `PoseCard`'s own accessible name.
  const currentLabel = options.find((p) => p.name === draft.pose)?.label || draft.pose
  const [editing, setEditing] = useState(false)
  /* "+ Nouvelle pose" (design pass écran 7, §V3): two steps, both without
     leaving the scene. `naming` collects name + starting template (the same
     decision `NewPoseModal` collects for the Poses screen, minus "créer
     aussi un gabarit réutilisable" — a one-off pose for this scene has no
     reason to also seed the shared preset library; that path stays on the
     Poses screen's own "+ Nouvelle pose"). Once named, `creating` opens the
     SAME `PoseEditorModal` the pencil above already uses to correct an
     ASSIGNED pose in place — here with a `preset` source instead of a
     `pose` one — and its `onSaved` assigns the result to `draft.pose`
     directly, instead of returning to the pose list. */
  const [naming, setNaming] = useState(false)
  const [creating, setCreating] = useState<{ presetName: string; label: string } | null>(null)
  return (
    <div>
      <PromptField
        dataField="prompt_pose"
        label="Prompt de pose"
        hint="Description en prose de la pose (« leaning against the doorway »). Rejoint le prompt final. Le squelette ControlNet ci-dessous est un mécanisme séparé — les deux peuvent coexister ou non."
        placeholder="ex : leaning against the doorway, arms crossed"
        value={draft.promptPose}
        disabled={worldLinked}
        lockedNote={worldLinked ? lockedNote : undefined}
        changed={changed.has('promptPose')}
        onChange={(value) => onPatch({ promptPose: value })}
      />

      <div className="mt-[14px] flex items-center justify-between">
        <span className="text-[12px] text-dim">
          Sélecteur de pose — squelette ControlNet imposé (option, cran SFW uniquement)
          <InfoHint text="Mesuré (A/B interne) : 0 image sous la bande d'identité sur 15. Un squelette de dos ou de profil peut ne pas être suivi par le modèle — vérifier le résultat à l'œil après génération." />
        </span>
        <div className="flex items-center gap-[6px]">
          {draft.pose && (
            <button
              type="button"
              className="btn sm"
              aria-label={`Modifier « ${currentLabel} » point par point`}
              data-hint-text="Retoucher ce squelette, sans quitter la scène"
              onClick={() => setEditing(true)}
            >
              <Icon name="pencil" className="h-[14px] w-[14px]" />
            </button>
          )}
          <Link className="btn sm" to={PATHS.bankPoses}>
            Éditeur de pose
          </Link>
        </div>
      </div>
      <div
        className="mt-[8px] grid grid-cols-[repeat(auto-fill,minmax(76px,1fr))] gap-[8px]"
        data-f="pose"
        data-value={draft.pose}
      >
        <button
          type="button"
          aria-pressed={!draft.pose}
          className={`flex aspect-square items-center justify-center rounded-[8px] border
                     text-[11px] text-dim ${!draft.pose ? 'border-acc bg-panel2' : 'border-line2 bg-panel'}`}
          onClick={() => onPatch({ pose: '' })}
        >
          aucune
        </button>
        <button
          type="button"
          className="flex aspect-square items-center justify-center rounded-[8px]
                     border border-dashed border-line2 text-[11px] text-dim hover:text-txt"
          data-hint-text="Créer une pose depuis un gabarit, sans quitter la scène"
          onClick={() => setNaming(true)}
        >
          <span aria-hidden="true">+ </span>nouvelle
        </button>
        {options.length === 0 ? (
          <div className="empty col-span-full p-[16px] text-[12px]">
            aucun squelette dans les ateliers — l'éditeur de pose en extrait depuis une photo
          </div>
        ) : (
          options.map(({ name, label }) => (
            <button
              key={name}
              type="button"
              aria-pressed={draft.pose === name}
              title={label || name}
              className={`relative aspect-square overflow-hidden rounded-[8px] border bg-black ${
                draft.pose === name ? 'border-acc' : 'border-line2'
              }`}
              onClick={() => onPatch({ pose: name })}
            >
              {/* `alt` carries the button's accessible name — same
                  `label || name` fallback as `PoseCard`'s own thumbnail
                  (design pass écran 7, §A1): a screen reader used to hear
                  the raw filename (`leaning-doorway-standing-01`) with no
                  route to the human label PoseCard already shows. */}
              <img
                className="h-full w-full object-contain"
                loading="lazy"
                src={`/img/pose?name=${encodeURIComponent(name)}`}
                alt={label || name}
              />
            </button>
          ))
        )}
      </div>

      {editing && draft.pose && (
        <PoseEditorModal
          source={{ kind: 'pose', name: draft.pose }}
          onClose={() => setEditing(false)}
          onSaved={(name) => {
            onPatch({ pose: name })
            setEditing(false)
          }}
        />
      )}

      {naming && (
        <NewPoseDialog
          onCancel={() => setNaming(false)}
          onStart={(intent) => {
            setCreating(intent)
            setNaming(false)
          }}
        />
      )}
      {creating && (
        <PoseEditorModal
          source={{ kind: 'preset', nom: creating.presetName, initialLabel: creating.label }}
          onClose={() => setCreating(null)}
          onSaved={(name) => {
            onPatch({ pose: name })
            setCreating(null)
          }}
        />
      )}
    </div>
  )
}

/* Name + starting-template step for a from-scratch pose, opened by the "+
   Nouvelle pose" tile above. Deliberately a SMALLER form than the Poses
   screen's own `NewPoseModal` (no "créer aussi un gabarit réutilisable" — a
   one-off pose for this scene has no reason to also seed the shared preset
   library) and it hands its result to a CALLBACK instead of navigating: the
   scene composer stays open, `PosePanel` above opens `PoseEditorModal` next
   rather than routing to `PATHS.poseEditor`. */
function NewPoseDialog({
  onCancel,
  onStart,
}: {
  onCancel: () => void
  onStart: (intent: { presetName: string; label: string }) => void
}) {
  const api = useApi()
  const [presets, setPresets] = useState<{ nom: string; label: string }[] | null>(null)
  const [chosenPreset, setChosenPreset] = useState<string | null>(null)
  const [label, setLabel] = useState('')

  useEffect(() => {
    let cancelled = false
    void api
      .get<{ presets?: { nom: string; label: string }[] }>('/api/pose/presets')
      .then((response) => {
        if (cancelled) return
        const list = response.presets ?? []
        setPresets(list)
        setChosenPreset((current) => current ?? list[0]?.nom ?? null)
      })
    return () => {
      cancelled = true
    }
  }, [api])

  const canStart = Boolean(chosenPreset) && label.trim() !== ''

  return (
    <Dialog
      id="newPoseInlineBox"
      open
      onDismiss={onCancel}
      initialFocus="#newPoseInlineName"
      className="w-[min(460px,calc(100vw-32px))] max-w-[min(460px,calc(100vw-32px))]"
      cardClassName="w-[min(460px,100%)]! p-[20px]!"
    >
      <h3 className="mb-[4px]! text-[16px]!">Nouvelle pose</h3>
      <p className="tiny mb-[14px]">
        Coordonnées entièrement inventées, jamais issues d'une photo — le point
        de départ se corrige ensuite point par point, sans quitter la scène.
      </p>

      <label className="tiny mb-[4px] block" htmlFor="newPoseInlineName">
        Nom
      </label>
      <input
        id="newPoseInlineName"
        className="mb-[14px] w-full"
        value={label}
        placeholder="ex. assise sur un tabouret"
        onChange={(event) => setLabel(event.target.value)}
      />

      <div className="tiny mb-[6px]">Gabarit de départ</div>
      {presets === null ? (
        <p className="tiny mb-[14px]">chargement…</p>
      ) : presets.length === 0 ? (
        <div className="empty mb-[14px] rounded-card border border-line bg-panel px-[12px] py-[16px] text-[13px]">
          aucun gabarit disponible.
        </div>
      ) : (
        <div className="mb-[14px] grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-[8px]">
          {presets.map((p) => (
            <button
              key={p.nom}
              type="button"
              aria-pressed={chosenPreset === p.nom}
              className={`rounded-[8px] border px-[12px] py-[8px] text-[13px] ${
                chosenPreset === p.nom ? 'border-acc bg-panel2' : 'border-line2 bg-panel'
              }`}
              onClick={() => setChosenPreset(p.nom)}
            >
              {p.label}
            </button>
          ))}
        </div>
      )}

      <div className="flex items-center gap-[12px]">
        <button
          type="button"
          className="btn primary"
          disabled={!canStart}
          onClick={() => chosenPreset && onStart({ presetName: chosenPreset, label: label.trim() })}
        >
          Continuer
        </button>
        <button type="button" className="link" onClick={onCancel}>
          annuler
        </button>
      </div>
    </Dialog>
  )
}

/* ------------------------------------------------------- Prompt global */
function RecapPanel({
  draft,
  worldLinked,
  lockedNote,
  changed,
  onPatch,
}: {
  draft: SceneDraft
  worldLinked: boolean
  lockedNote: string
  changed: Set<SceneField>
  onPatch: (patch: Partial<SceneDraft>) => void
}) {
  return (
    <div>
      <p className="tiny mt-0 mb-[14px]">
        Les fragments de cette scène. Ne décris jamais le visage ici : le verrou d'identité le
        porte.
      </p>
      <PromptField
        dataField="prompt_base"
        changed={changed.has('promptBase')}
        label="Prompt de base — décor, cadrage"
        placeholder="ex : a sunlit kitchen, morning light through the window"
        value={draft.promptBase}
        disabled={worldLinked}
        lockedNote={worldLinked ? lockedNote : undefined}
        accentColor={FRAGMENT_COLORS.base}
        onChange={(value) => onPatch({ promptBase: value })}
      />
      <PromptField
        dataField="prompt_light_recap"
        changed={changed.has('promptLight')}
        label="Prompt de lumière — même champ que l'onglet Lumière"
        value={draft.promptLight}
        disabled={worldLinked}
        lockedNote={worldLinked ? lockedNote : undefined}
        accentColor={FRAGMENT_COLORS.light}
        onChange={(value) => onPatch({ promptLight: value })}
      />
      <PromptField
        dataField="prompt_pose_recap"
        changed={changed.has('promptPose')}
        label="Prompt de pose — même champ que l'onglet Pose"
        value={draft.promptPose}
        disabled={worldLinked}
        lockedNote={worldLinked ? lockedNote : undefined}
        accentColor={FRAGMENT_COLORS.pose}
        onChange={(value) => onPatch({ promptPose: value })}
      />

      <PromptField
        dataField="wardrobe_recap"
        changed={changed.has('wardrobe')}
        label="Prompt de vêtement — réglé à part"
        hint="Jamais fondu dans le prompt composé ci-dessous : la tenue est injectée séparément selon le niveau de génération (onglet Vêtements), pas ici."
        value={draft.wardrobe}
        onChange={(value) => onPatch({ wardrobe: value })}
      />

      <label className="f mt-[14px]">
        <span>
          prompt composé
          <InfoHint text="Assemble les trois fragments ci-dessus — décor, lumière, pose — séparés par une virgule, dans le même ordre que le studio utilise à la génération. Un fragment vide est ignoré ; la tenue n'y participe jamais." />
        </span>
        {/* Purely visual annotation of the textarea below, colored by
            fragment (design pass écran 7, §V4) — the relation between the 3
            tinted fields above and their place in the join becomes visible
            on sight, not just stated in a label ("même champ que l'onglet
            Lumière"). `aria-hidden` : the textarea right below already
            announces this same text once, correctly — this would only
            double it. */}
        <ComposedPromptPreview draft={draft} />
        <textarea className="min-h-[70px] resize-y" readOnly value={composePrompt(draft)} />
      </label>
    </div>
  )
}

/* See the `aria-hidden` note above: decorative twin of the composed prompt,
   fragment-colored, sitting just above the real (accessible, copyable)
   readonly textarea rather than replacing it. */
function ComposedPromptPreview({ draft }: { draft: SceneDraft }) {
  /* The same cut the right-hand living preview draws (`sceneFragments`) —
     one breakdown, two readers, and still no second assembler: the join
     below stays `composePrompt`'s. */
  const fragments = sceneFragments(draft)

  return (
    <p
      aria-hidden="true"
      className="m-0 mb-[6px] rounded-[8px] border border-line2 bg-panel2 px-[10px] py-[8px]
                 text-[12.5px] leading-relaxed"
    >
      {fragments.length === 0 ? (
        <span className="text-dim">— vide —</span>
      ) : (
        fragments.map((fragment, index) => (
          <span key={fragment.key}>
            <span
              className="rounded-[3px] px-[2px] py-px"
              style={{ color: fragment.color, backgroundColor: `color-mix(in srgb, ${fragment.color} 18%, transparent)` }}
            >
              {fragment.text}
            </span>
            {index < fragments.length - 1 && <span className="text-dim">, </span>}
          </span>
        ))
      )}
    </p>
  )
}

/* ------------------------------------------------------ Amélioration IA */
function AiPanel({ draft }: { draft: SceneDraft }) {
  const composed = composePrompt(draft)
  return (
    <div>
      <label className="f">
        <span>
          prompt global
          <InfoHint text="Aperçu en lecture seule du prompt composé — pour le modifier, retourner à l'onglet Prompt global." />
        </span>
        <textarea className="min-h-[70px] resize-y" readOnly value={composed} />
      </label>

      <button
        type="button"
        className="btn mt-[14px]"
        disabled
        data-hint-text="Pas encore branché à un modèle — arrivera une fois l'interface validée."
      >
        Générer par IA
      </button>

      <label className="f mt-[14px]">
        <span>prompt IA</span>
        <textarea
          className="min-h-[110px] resize-y"
          readOnly
          disabled
          placeholder="s'affichera ici une fois l'amélioration par IA branchée"
          value=""
        />
      </label>

      <button type="button" className="btn mt-[10px]" disabled>
        Sauvegarder le prompt IA
      </button>
    </div>
  )
}

/* --------------------------------------------------------------- JSON final */
function JsonPanel({ draft, onSaveDocument }: { draft: SceneDraft; onSaveDocument: () => void }) {
  const json = JSON.stringify(draftsToScenes([draft])[0], null, 2)
  const toast = useToast()

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(json)
      toast('JSON copié')
    } catch {
      toast('copie impossible — le presse-papier a refusé')
    }
  }

  return (
    <div>
      <label className="f">
        {/* `div`, not `span`, for this row: `label.f span{display:block}`
            (chrome.css) is a descendant selector that would outrank the
            `.flex` utility on a nested `span` (same trap as the tabpanel/
            `hidden` note above in this file) and collapse the row. */}
        <div className="flex items-center justify-between">
          <span>
            JSON final
            <InfoHint text="Ce que cette scène deviendra dans scenes.json à l'enregistrement — lecture seule ici, le détail s'édite dans les autres onglets." />
          </span>
          <button
            type="button"
            className="cursor-pointer rounded-[6px] border border-line2 bg-panel2 p-[6px]
                       text-dim hover:text-txt focus-visible:outline-2 focus-visible:outline-focus
                       focus-visible:outline-offset-2"
            aria-label="Copier le JSON final"
            data-hint-text="Copie ce JSON dans le presse-papier — utile en support/debug sans quitter l'écran."
            onClick={() => void onCopy()}
          >
            <Icon name="copy" className="h-[14px] w-[14px]" />
          </button>
        </div>
        <textarea className="min-h-[260px] resize-y font-mono text-[12px]" readOnly value={json} />
      </label>
      <button className="btn primary mt-[14px]" onClick={onSaveDocument}>
        Sauvegarder
      </button>
    </div>
  )
}

/* --------------------------------------------------------- catalogue vide
   Shared shell for the two catalogs the wireframe asks for (light templates,
   clothing thumbnails) that have no real data behind them yet — see the
   architecture Q&A this composer was built from. An empty state SAYS there is
   nothing yet rather than hiding the section, same rule `ToolRail` follows for
   an inert tool: the capability is named, not invented. */
function EmptyCatalog({ label, hint, empty }: { label: string; hint: string; empty: string }) {
  return (
    <div className="mt-[14px]">
      <span className="text-[12px] text-dim">
        {label}
        <InfoHint text={hint} />
      </span>
      {/* Dashed, not a filled card (design pass screen-7b §S4.3): a box drawn
          like the rest would read as a control that does nothing. */}
      <div className="mt-[6px] rounded-[8px] border border-dashed border-line2 p-[16px]
                      text-center text-[12px] text-dim2">
        {empty}
      </div>
    </div>
  )
}
