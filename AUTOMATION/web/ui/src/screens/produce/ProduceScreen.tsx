/* Produire — intensity, intention, tone, scenes, launch.
   Ported from `static/create.js`, the largest module of the legacy frontend.

   THREE PANELS AND AN ANCHORED BAR (design-pass screen-3b, 2026-09-23). The
   screen used to be a vertical stack: a full-width intensity bar, then three
   columns, then a `position:fixed` launch bar floating over them — plus two
   superimpositions that covered the work (the settings card at the
   bottom-right, the prompt preview above the bar). Now the screen fills the
   height of `<main>`, each column scrolls for its own account, the settings
   and the prompt are TABS of the right-hand inspector, and the launch bar is
   simply the last row of the grid. Nothing overlays anything above 1100 px.

   ON THE TIER THAT EDITS, the centre becomes the source-image grid and the
   inspector offers Instruction · Réglages: the left panel has nothing to
   choose there (no intention, no tone), and says so rather than showing two
   dead radiogroups.

   COUPLING TRAP §5.6-2 — /api/plan is replayed on every keystroke, debounced. It
   carries the count, the prompt preview AND the instruction alerts at once. See
   usePlan; nothing here replaces it with a local computation.

   COUPLING TRAP §5.6-3 — `#btnRun.disabled`. Two timers used to write it (the
   1.5 s tick and refreshPlan), and `planOk()` was the common source that kept
   them from fighting — documented backend-side as AUDIT.md §5.6. Here it is ONE
   derived expression, `runDisabled`, computed in one place from (planOk,
   running, comfy) and handed as a prop to the launch bar AND to the keyboard
   shortcut. The two writers cannot exist any more, so neither can the bug the
   guard covered; the guard survives as that single expression. */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { errorOf, type ActionLike } from '../../api/client'
import { useApi } from '../../api/useApi'
import { Icon } from '../../chrome/Icon'
import { useChrome } from '../../chrome/ChromeContext'
import { useConfirm } from '../../chrome/ConfirmContext'
import { useToast } from '../../chrome/ToastContext'
import { useConfig } from '../../state/ConfigContext'
import { useScenes, type Scene } from '../../state/ScenesStoreContext'
import { useSystemState } from '../../state/SystemStateContext'
import { useTaxonomy } from '../../state/TaxonomyContext'
import { PATHS } from '../../app/routes'
import { EMPTY_AMENDMENTS, type SceneAmendments } from './PromptPreview'
import { LaunchBar } from './LaunchBar'
import { ProduceInspector } from './ProduceInspector'
import { ProduceSidebar, type Intention } from './ProduceSidebar'
import { QueueRail } from './QueueRail'
import { NewSceneCard, SceneCard } from './SceneCard'
import { SceneCompareView } from './SceneCompareView'
import { useLaunchShortcut } from './useLaunchShortcut'
import { useNsfwSources } from './useNsfwSources'
import { useSceneChoice, type SceneSort } from './useSceneChoice'
import { runSummary } from './runSummary'
import {
  deviationCount,
  initialValues,
  valuesFor,
  withPreset,
  type SettingValues,
} from './SettingsPanel'
import { isEditTier, usePlan, type IntensityTier, type Preview } from './useProduceState'

export function ProduceScreen() {
  const api = useApi()
  const toast = useToast()
  const confirm = useConfirm()
  const navigate = useNavigate()
  const { creative, reload: reloadCreative } = useTaxonomy()
  const { bank, drafts } = useScenes()
  const { config } = useConfig()
  const { state, refresh: refreshCounts } = useSystemState()
  const { narrow } = useChrome()

  const presetRef = (config?.preset ?? {}) as Record<string, unknown>
  const nsfwRef = (config?.nsfw ?? {}) as Record<string, unknown>

  const [level, setLevelState] = useState(0)
  const [intent, setIntent] = useState<string | null>(null)
  const [tone, setTone] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  /** Tiers confirmed for this session — never persisted. */
  const confirmed = useRef<Set<number>>(new Set())
  const [values, setValues] = useState<SettingValues>({})
  const [quality, setQuality] = useState('realisme')
  const [override, setOverride] = useState('')
  const [amendments, setAmendments] = useState<SceneAmendments>(EMPTY_AMENDMENTS)
  const [instruction, setInstruction] = useState('')
  const [launching, setLaunching] = useState(false)
  /** Under 1100 px the inspector is a drawer; above, this is ignored. */
  const [inspectorOpen, setInspectorOpen] = useState(false)

  // the panel is filled from config.json as soon as it lands
  useEffect(() => {
    if (config) setValues(initialValues(presetRef, nsfwRef))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config])

  const tiers = creative?.intensity ?? []
  const tier = (tiers.find((t) => t.level === level) ?? null) as IntensityTier | null
  const editTier = isEditTier(tier)
  const onToolGone = useCallback(() => setLevelState(0), [])
  const { sources, picked, setPicked, nsfwOut } = useNsfwSources({
    editTier,
    reloadCreative,
    onToolGone,
  })
  /* True when the current tier EDITS an existing image instead of generating
     one. That is the default behaviour of the NSFW tier, and the project's rule:
     the branch edits an already validated image, it never generates from zero.
     `generer_avant` restores the generate-then-edit chain for the ONE case where
     it serves — no validated image exists yet for the wanted scene. The server
     applies the same rule in mode_edition(). */
  const editing = editTier && !values.generavant

  const [sceneSearch, setSceneSearch] = useState('')
  const [sceneSort, setSceneSort] = useState<SceneSort>('affinity')
  /** The scene under the pointer/focus in the grid — the inspector's subject,
      distinct from `selected` (screen-3-produire §S: pointing at a scene and
      picking it for the run are two different gestures). */
  const [pointedId, setPointedId] = useState<string | null>(null)
  const [compareOpen, setCompareOpen] = useState(false)
  const { meta, stats, sceneList, scenesOf, visibleScenes } = useSceneChoice({
    bank,
    drafts,
    tier,
    level,
    intent,
    tone,
    search: sceneSearch,
    sortBy: sceneSort,
  })

  // ---------------------------------------------------------------- payload
  const field = (id: string, fallback: string | boolean = '') => values[id] ?? fallback
  const payload = useCallback(
    () => ({
      scenes: [...selected],
      categories: [],
      count: field('count'),
      format: field('format'),
      limit: field('limit'),
      seed: field('seed'),
      no_variants: field('novar', false),
      no_qc: field('noqc', false),
      preset: valuesFor(values, 'preset'),
      nsfw: valuesFor(values, 'nsfw'),
      intensity: level,
      confirm_intensity: confirmed.current.has(level),
      tone,
      intention: intent === '*' ? null : intent,
      edit_instruction: instruction,
      // the images to edit, and the mode. The server strips what is no longer
      // editable (sources_valides) — the list may have aged.
      sources: [...picked],
      generer_avant: field('generavant', false),
      // scene amendment for THIS launch: the server only keeps it when a single
      // scene is ticked, and passes it through the same face check
      scene_override: override,
      // screen-3-produire §B4: four more amendments, same rule, one field
      // per fragment rather than folded into scene_override — the server
      // keeps each only when a single scene is ticked (see run_amendments,
      // routers/production.py).
      light_override: amendments.light,
      expression_override: amendments.expression,
      pose_override: amendments.pose,
      outfit_override: amendments.outfit,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selected, values, level, tone, intent, instruction, picked, override, amendments],
  )

  /* The plan runs in editing mode even with nothing ticked: it is what renders
     the instruction alerts. In generation it needs an intention and a scene. */
  const unsaved = [...selected].filter((id) => !meta[id])
  const planEnabled = editing || (Boolean(intent) && selected.size > 0 && !unsaved.length)
  const { plan, refresh: refreshPlan } = usePlan({ payload, enabled: planEnabled })

  useEffect(() => {
    refreshPlan()
  }, [refreshPlan, payload])

  // ------------------------------------------------------------------ level
  const setLevel = async (next: number) => {
    const target = tiers.find((t) => t.level === next)
    if (!target) return
    if (target.requires === 'confirm' && !confirmed.current.has(next)) {
      const ok = await confirm({
        title: `Passer en « ${target.label} » ?`,
        button: `Passer en ${target.label}`,
        body: (
          <>
            <p>
              Les images produites à ce niveau <b>ne partent pas dans l'export</b> :
              elles restent consultables, mais hors du dossier de publication.
            </p>
            <ul>
              <li>
                destination : <code>{target.destination || '—'}</code>
              </li>
              <li>export désactivé pour ce palier</li>
            </ul>
          </>
        ),
      })
      if (!ok) return
      confirmed.current.add(next)
    }
    setLevelState(next)
    setOverride('')
    setAmendments(EMPTY_AMENDMENTS)
  }

  /* Out-of-band scenes disappear when the level changes: the selection is
     pruned rather than left pointing at scenes the plan will not see. */
  useEffect(() => {
    const available = new Set(
      (intent ? scenesOf(intent) : []).map((s) => s.id),
    )
    setSelected((current) => {
      const next = new Set([...current].filter((id) => available.has(id)))
      return next.size === current.size ? current : next
    })
    // an intention can become empty when the level changes
    if (intent && intent !== '*' && !scenesOf(intent).length) setIntent(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level])

  // ------------------------------------------------------------------ launch
  const nbSelected = editing ? picked.size : selected.size
  const comfy = Boolean(state?.comfy)
  /* Optimistic: without it the running flag stays false until the next tick
     (1.5 s), and a plan refresh triggered meanwhile by a field change could
     re-enable the button before the server confirmed the launch. */
  const running = Boolean(state?.running) || launching
  useEffect(() => {
    if (state?.running) setLaunching(false)
  }, [state?.running])

  const instructionText = instruction.trim()
  /* THE common source. See the header of this file — AUDIT.md §5.6, trap 3. */
  const planOk = editing
    ? Boolean(plan && (plan.total ?? 0) > 0 && instructionText)
    : Boolean(plan && (plan.total ?? 0) > 0 && !plan.erreur)
  /* The four conditions the legacy tick and refreshPlan each wrote separately.
     `nbSelected` is redundant with a positive plan today — but it is what the
     legacy guard actually tested (`nbSelection()`), and in editing mode SEL is
     empty while sources are ticked, which is exactly the case that made the two
     writers disagree. It stays explicit. */
  const runDisabled = !planOk || !nbSelected || running || !comfy

  const launch = useCallback(async () => {
    setLaunching(true)
    const response = await api.post<ActionLike>('/api/run', payload())
    const failure = errorOf(response)
    if (failure) {
      setLaunching(false)
      toast(failure || 'échec du lancement')
      return
    }
    refreshCounts()
  }, [api, payload, toast, refreshCounts])

  /* Ctrl+Entrée. It READS `runDisabled` — the single expression above — and
     never derives a second answer (AUDIT §5.6, trap 3). */
  useLaunchShortcut(runDisabled, launch)

  // --------------------------------------------------------------- summary
  const { sumN, sumT, tone: summaryTone } = runSummary({
    editing,
    plan,
    picked,
    instructionText,
    intent,
    selected,
    unsaved,
    quality,
    tone,
    tier,
    bank,
    creative,
    comfy,
    running,
  })

  // --------------------------------------------------------------- render
  const intentions = ((creative?.intentions ?? []) as Intention[]).filter(
    (i) => (i.min_intensity ?? 0) <= level,
  )
  const withAll: Intention[] = [...intentions, { key: '*', label: 'Toutes', icon: '✳', defaults: {} }]
  const full: [Intention, number][] = []
  const empty: [Intention, number][] = []
  withAll.forEach((entry) => {
    const n = scenesOf(entry.key).length
    ;(n ? full : empty).push([entry, n])
  })

  const goCompose = () => navigate(PATHS.bankScenes)
  /* screen-3-produire §B3: retouching a scene used to mean leaving for the
     Banque and finding it again in its list by hand. `?scene=<id>` asks
     `BankScreen`/`useSceneWorkbench` to open it pre-selected — see there
     for the other half of this wire. */
  const goEditScene = (id: string) => navigate(`${PATHS.bankScenes}?scene=${encodeURIComponent(id)}`)

  const pickIntent = (key: string) => {
    if (intent === key) return
    setIntent(key)
    setSelected(new Set()) // changing intention starts from a blank page
    const entry = ((creative?.intentions ?? []) as Intention[]).find((i) => i.key === key)
    /* The intention PROPOSES its tone when it declares one that exists; it no
       longer imposes one. No default = no tone, never « the first tone of the
       list » — that fallback is how every selfie went out as `joueur`
       (IT-10, 25/09). The user's pick stays one click away in the rail. */
    const proposed = entry?.defaults?.tone
    setTone(proposed && (creative?.tones ?? []).some((t) => t.key === proposed) ? proposed : '')
  }

  /* screen-3-produire, §S: the panel is always on screen, so the screen no
     longer waits for a click to show a scene grid — the first non-empty
     intention is picked as soon as the taxonomy makes one available. Guarded
     on `intent === null` alone: the level-change effect above already clears
     `intent` when it empties out, which makes this the single place a
     default gets chosen, whatever caused the previous one to go away. */
  useEffect(() => {
    if (intent === null && full.length > 0) pickIntent(full[0][0].key)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intent, full.length])

  /* Comparing fewer than 2 candidates is not a comparison — the selection
     dropping under that (untick from the grid, or "Retenir" itself) closes
     the view rather than leaving a one-card side-by-side on screen. */
  useEffect(() => {
    if (compareOpen && selected.size < 2) setCompareOpen(false)
  }, [compareOpen, selected])

  const toggleScene = (id: string) => {
    setSelected((current) => {
      const next = new Set(current)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
    /* An amendment is written FOR a scene: changing the selection makes it
       void, and applying it in silence to another scene would be worse. */
    setOverride('')
    setAmendments(EMPTY_AMENDMENTS)
  }

  /* "Retenir" in the comparison view: the run narrows to this one candidate.
     Same override-clearing rule as `toggleScene` — a selection change voids
     an amendment written for the scene(s) it used to point at. */
  const keepOnly = (id: string) => {
    setSelected(new Set([id]))
    setOverride('')
    setAmendments(EMPTY_AMENDMENTS)
  }

  const preview = (plan?.apercu ?? null) as Preview | null

  const previewsMap = (bank?.previews ?? {}) as Record<
    string,
    { name: string; bucket: string; space?: string; v?: number }
  >

  /* Falls back to the last-toggled scene when nothing has been pointed at
     yet this session — a freshly opened screen shows something useful
     without demanding a hover first. `sceneList`, not `visibleScenes`: the
     pointed id can outlive a search/sort/tone change that would drop it. */
  const pointed = pointedId ?? [...selected].slice(-1)[0] ?? null
  const pointedScene = pointed ? (sceneList.find((s) => s.id === pointed) ?? null) : null
  const pointedPreview = pointedScene ? previewsMap[pointedScene.id] : undefined

  const pickQuality = (key: string) => {
    setQuality(key)
    // the preset FILLS the panel: one sees what it changes, and can retouch
    // it right after
    setValues((current) => withPreset(current, key, presetRef, nsfwRef))
  }

  /* Counted ONCE, here: the inspector's tab badge and the settings panel's
     own head read the same number (see `deviationCount`). */
  const deviations = useMemo(
    () => deviationCount(values, presetRef, nsfwRef).total,
    [values, presetRef, nsfwRef],
  )

  const allSourcesPicked = sources.length > 0 && picked.size > 0

  return (
    <div className="screen grid h-full grid-rows-[minmax(0,1fr)_auto]" id="creer">
      {/* Three columns, each scrolling for its own account. Under 1100 px the
          inspector leaves the flow and becomes a drawer (§S7), so the grid
          drops to two tracks — the component is the same either way. */}
      <div
        className="grid min-h-0 grid-cols-[248px_minmax(0,1fr)_340px]
                   max-[1100px]:grid-cols-[200px_minmax(0,1fr)]"
      >
        <ProduceSidebar
          tiers={tiers}
          level={level}
          editing={editing}
          onPickLevel={setLevel}
          full={full}
          empty={empty}
          intent={intent}
          onPickIntent={pickIntent}
          goCompose={goCompose}
          tones={creative?.tones ?? []}
          tone={tone}
          onPickTone={setTone}
        />

        <div className="flex min-h-0 min-w-0 flex-col bg-bg">
          {/* The centre toolbar: what this column holds, and the three
              controls that narrow it. 48 px, one rule under it. */}
          <div
            className="flex h-[48px] flex-none items-center gap-[10px] border-b border-b-line
                       px-[16px]"
            id="sceneToolbar"
          >
            {editing ? (
              <>
                <h2 className="m-0 flex-none text-[13px] font-semibold">Images source</h2>
                <span className="tiny truncate" id="srcHint">
                  {sources.length
                    ? `${picked.size} cochée${picked.size > 1 ? 's' : ''} sur ${sources.length} éditable${sources.length > 1 ? 's' : ''}`
                    : ''}
                </span>
                <div className="flex-1" />
                {sources.length > 0 && (
                  <button
                    type="button"
                    className="btn sm"
                    id="btnAllSources"
                    onClick={() =>
                      setPicked((current) =>
                        current.size > 0 ? new Set() : new Set(sources.map((s) => s.name)),
                      )
                    }
                  >
                    {allSourcesPicked ? 'Tout décocher' : 'Tout cocher'}
                  </button>
                )}
              </>
            ) : (
              <>
                <h2 className="m-0 flex-none text-[13px] font-semibold">Scènes</h2>
                <span className="tiny truncate" id="sceneHint">
                  {sceneSearch.trim()
                    ? `${visibleScenes.length} sur ${scenesOf(intent ?? '*').length}`
                    : `${visibleScenes.length} à ce niveau · ${selected.size} cochée${selected.size > 1 ? 's' : ''}`}
                </span>
                <div className="flex-1" />
                <div className="relative w-[240px] flex-none max-[1400px]:w-[170px]">
                  <Icon
                    name="search"
                    className="pointer-events-none absolute top-1/2 left-[9px] h-[15px] w-[15px]
                               -translate-y-1/2 text-dim2"
                  />
                  <input
                    type="search"
                    className="w-full rounded-[6px] border border-line2 bg-panel2 py-[5px]
                               pr-[9px] pl-[28px] text-[13px]"
                    id="sceneSearch"
                    placeholder="rechercher une scène"
                    value={sceneSearch}
                    onChange={(event) => setSceneSearch(event.target.value)}
                    aria-label="Rechercher une scène par identifiant"
                    disabled={compareOpen}
                  />
                </div>
                {/* `w-[150px]` IS LOAD-BEARING, not cosmetic. `chrome.css:453`
                    gives every `input,select,textarea` `width:100%`, and
                    `flex-none` only sets `flex`, never `width` — so as a
                    direct child of this bar the select resolved 100 % of the
                    TOOLBAR and measured 820 px, pushing `#btnCompare` to
                    x=1425 for a bar ending at 1100 (measured live: comparison
                    unreachable by mouse) and squeezing `#sceneHint` to zero.
                    It survived until now because the select used to sit inside
                    an auto-sized `<label>`. A utility class outweighs a bare
                    element selector, so this is the whole fix. */}
                <select
                  className="w-[150px] flex-none rounded-[6px] border border-line2 bg-panel2
                             px-[8px] py-[5px] text-[13px]"
                  id="sceneSortBy"
                  value={sceneSort}
                  onChange={(event) => setSceneSort(event.target.value as SceneSort)}
                  aria-label="Trier les scènes"
                  disabled={compareOpen}
                >
                  <option value="affinity">affinité de ton</option>
                  <option value="never">jamais produites</option>
                  <option value="score">meilleur score</option>
                  <option value="name">nom</option>
                </select>
                <button
                  type="button"
                  id="btnCompare"
                  className={`btn sm flex-none${compareOpen ? ' on' : ''}`}
                  disabled={!compareOpen && selected.size < 2}
                  /* §audit-ux-ui : la bulle suit le libelle du bouton —
                     elle decrivait encore « Comparer » une fois bascule
                     sur « Fermer la comparaison », mesure dans le
                     navigateur. */
                  data-hint-text={
                    compareOpen
                      ? 'Revenir à la grille normale.'
                      : "Compare côte à côte les scènes cochées — utile pour n'en retenir qu'une."
                  }
                  onClick={() => setCompareOpen((v) => !v)}
                >
                  {compareOpen ? 'Fermer la comparaison' : `Comparer (${selected.size})`}
                </button>
              </>
            )}
            {/* §S7: below 1100 px the inspector folds into a drawer, and this
                is the only way back to it. */}
            {narrow && (
              <button
                type="button"
                className="btn sm flex-none"
                id="btnInspector"
                aria-expanded={inspectorOpen}
                onClick={() => setInspectorOpen(true)}
              >
                Inspecteur
              </button>
            )}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-[16px]">
            {editing ? (
              <div id="stepSource">
                <div
                  className="grid gap-[12px] grid-cols-[repeat(auto-fill,minmax(150px,1fr))]"
                  id="srcGrid"
                >
                  {sources.length ? (
                    sources.map((source) => {
                      const on = picked.has(source.name)
                      return (
                        <button
                          type="button"
                          key={source.name}
                          /* The selection outline is drawn INSIDE, same rule
                             as the scene card: a border would reflow the grid
                             by 2 px on every tick. */
                          className={`relative block w-full cursor-pointer overflow-hidden
                                      rounded-card border border-line bg-transparent p-0
                                      ${on ? 'outline-2 outline-acc [outline-offset:-2px]' : ''}`}
                          data-src
                          data-n={source.name}
                          aria-pressed={on}
                          onClick={() =>
                            setPicked((current) => {
                              const next = new Set(current)
                              next.has(source.name) ? next.delete(source.name) : next.add(source.name)
                              return next
                            })
                          }
                        >
                          <img
                            className="block aspect-[4/5] w-full object-cover"
                            loading="lazy"
                            src={api.image({ ...source, thumb: true })}
                            alt=""
                          />
                          {source.bucket !== 'OK' && (
                            <div
                              className="absolute top-[6px] left-[6px] rounded-[4px] border
                                         border-warn-line bg-warn-bg px-[5px] py-px text-[9.5px]
                                         uppercase tracking-[.4px] text-warn-txt"
                            >
                              à revoir
                            </div>
                          )}
                          <div
                            className={`absolute top-[6px] right-[6px] flex h-[20px] w-[20px]
                                        items-center justify-center rounded-[4px] border ${
                                          on
                                            ? 'border-acc bg-acc text-on-acc'
                                            : 'border-[#ffffff55] bg-scrim text-transparent'
                                        }`}
                          >
                            {on && <Icon name="check" className="h-[14px] w-[14px]" />}
                          </div>
                        </button>
                      )
                    })
                  ) : (
                    <div className="empty col-span-full px-[16px] py-[34px] text-[13px]">
                      aucune image à éditer — produis d'abord au cran Soft, puis reviens ici
                    </div>
                  )}
                </div>
              </div>
            ) : (
              intent && (
                <div id="stepScenes">
                  {compareOpen ? (
                    <SceneCompareView
                      candidates={[...selected]
                        .map((id) => sceneList.find((s) => s.id === id))
                        .filter((s): s is Scene => Boolean(s))}
                      meta={meta}
                      stats={stats}
                      previews={previewsMap}
                      tone={tone}
                      imageUrl={api.image}
                      onRemove={toggleScene}
                      onKeep={keepOnly}
                    />
                  ) : (
                    <>
                      {/* `grid-auto-rows:max-content` (§S3): without it the
                          rows of a short grid stretch to fill the column and
                          a single card becomes as tall as the screen. */}
                      <div
                        className="grid gap-[14px] grid-cols-[repeat(auto-fill,minmax(200px,1fr))]
                                   [grid-auto-rows:max-content]"
                        id="sceneGrid"
                      >
                        {visibleScenes.map((scene) => (
                          <SceneCard
                            key={scene.id}
                            scene={scene}
                            meta={meta[scene.id]}
                            stats={stats[scene.id]}
                            preview={previewsMap[scene.id]}
                            tone={tone}
                            selected={selected.has(scene.id)}
                            imageUrl={api.image}
                            onClick={() => toggleScene(scene.id)}
                            onPoint={() => setPointedId(scene.id)}
                            onEdit={goEditScene}
                          />
                        ))}
                        <NewSceneCard onClick={goCompose} />
                      </div>
                      {visibleScenes.length === 0 && sceneSearch.trim() && (
                        <div className="empty px-[16px] py-[24px] text-[13px]">
                          aucune scène ne correspond à « {sceneSearch.trim()} »
                        </div>
                      )}
                    </>
                  )}
                </div>
              )
            )}
          </div>
        </div>

        <ProduceInspector
          editing={editing}
          editTier={editTier}
          narrow={narrow}
          open={inspectorOpen}
          onClose={() => setInspectorOpen(false)}
          scene={pointedScene}
          meta={pointedScene ? meta[pointedScene.id] : undefined}
          stats={pointedScene ? stats[pointedScene.id] : undefined}
          preview={pointedPreview}
          tone={tone}
          isSelected={pointedScene ? selected.has(pointedScene.id) : false}
          onToggleSelect={toggleScene}
          onEditScene={goEditScene}
          imageUrl={api.image}
          values={values}
          presetRef={presetRef}
          nsfwRef={nsfwRef}
          deviations={deviations}
          onChangeSetting={(id, value) => setValues((current) => ({ ...current, [id]: value }))}
          onResetSettings={() => {
            setValues(initialValues(presetRef, nsfwRef))
            setQuality('realisme')
          }}
          promptPreview={editing ? null : preview}
          singleScene={selected.size === 1 && !editing}
          override={override}
          onOverride={setOverride}
          amendments={amendments}
          onAmendmentChange={(field, value) =>
            setAmendments((current) => ({ ...current, [field]: value }))
          }
          instruction={instruction}
          onInstruction={setInstruction}
          alerts={(plan?.alertes ?? []) as string[]}
          nsfwOut={nsfwOut}
        />
      </div>

      <LaunchBar
        sumN={sumN}
        sumT={sumT}
        tone={summaryTone}
        quality={quality}
        onPickQuality={pickQuality}
        editTier={editTier}
        runLabel={
          editing
            ? planOk
              ? `Éditer ${plan?.total} image${(plan?.total ?? 0) > 1 ? 's' : ''}`
              : 'Éditer'
            : 'Générer'
        }
        runDisabled={runDisabled}
        onRun={launch}
      />

      {/* Renders nothing: it only watches a batch finish and toasts it. */}
      <QueueRail state={state} />
    </div>
  )
}
