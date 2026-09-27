/* The generation settings — the « Réglages » tab of the inspector since the
   design-pass screen-3b (§S4). It used to be a floating card anchored to the
   bottom-right corner, opened by a gear in the launch bar and by a second one
   in the tool rail; both are gone, and a panel that is simply THERE needs
   neither an open state nor an Escape to close it.

   The « mesuré » badge lights when the value is the one from config.json, and a
   counter in the panel head says how far one has moved from the validated
   values. That is the whole point: one sees at a glance how far one has gone.
   A setting that HAS moved now says so three times over — its value in the
   warning family, its field outlined, and the measured value printed next to
   it — because folding that into one grey badge made a deviation something one
   had to look for.

   Ported from `renderReglages` / `majAffichage` in `static/create.js`. */
import { useMemo, useState } from 'react'

import { useRovingChoice } from '../../chrome/useRovingChoice'

import { formatLabel, useConfig } from '../../state/ConfigContext'
import { BY_ID, PRESETS, SECTIONS, fmtVal, type Setting } from './settings'

/** Every control's value, by setting id. Booleans for switches, strings for the
    rest — a numeric field must be able to be EMPTY, which a number cannot say. */
export type SettingValues = Record<string, string | boolean>

export function referenceOf(
  item: Setting,
  presetRef: Record<string, unknown>,
  nsfwRef: Record<string, unknown>,
): unknown {
  if (item.dest === 'preset') return presetRef[item.cle!]
  if (item.dest === 'nsfw') return nsfwRef[item.cle!] ?? presetRef[item.cle!]
  return '' // batch fields have no measured reference
}

/** Initial values: those of config.json for preset/nsfw, empty for the batch
    fields, which mean « the scene's default ». */
export function initialValues(
  presetRef: Record<string, unknown>,
  nsfwRef: Record<string, unknown>,
): SettingValues {
  const out: SettingValues = {}
  SECTIONS.forEach((section) =>
    section.items.forEach((item) => {
      if (item.dest === 'job') {
        out[item.id] = item.type === 'bool' ? false : ''
        return
      }
      const reference = referenceOf(item, presetRef, nsfwRef)
      if (reference === undefined) {
        out[item.id] = item.type === 'bool' ? false : ''
        return
      }
      out[item.id] = item.type === 'bool' ? Boolean(reference) : String(reference)
    }),
  )
  return out
}

/** Applies a preset ON TOP of the measured values — it fills the panel, it does
    not bypass it. */
export function withPreset(
  values: SettingValues,
  preset: string,
  presetRef: Record<string, unknown>,
  nsfwRef: Record<string, unknown>,
): SettingValues {
  const base = initialValues(presetRef, nsfwRef)
  const out: SettingValues = { ...base }
  // the batch fields are the operator's, a preset does not touch them
  SECTIONS.forEach((section) =>
    section.items.forEach((item) => {
      if (item.dest === 'job') out[item.id] = values[item.id]
    }),
  )
  Object.entries(PRESETS[preset] ?? PRESETS.realisme).forEach(([key, value]) => {
    const item = Object.values(BY_ID).find((i) => i.cle === key && i.dest === 'preset')
    if (item) out[item.id] = item.type === 'bool' ? Boolean(value) : String(value)
  })
  return out
}

/** What the panel sends to the server, for one destination. */
export function valuesFor(
  values: SettingValues,
  dest: 'preset' | 'nsfw',
): Record<string, number | boolean> {
  const out: Record<string, number | boolean> = {}
  SECTIONS.forEach((section) =>
    section.items.forEach((item) => {
      if (item.dest !== dest) return
      const value = values[item.id]
      out[item.cle!] = item.type === 'bool' ? Boolean(value) : Number.parseFloat(String(value))
    }),
  )
  return out
}

/* The shapes the panel repeats. They were `.rgs`, `.rgh`, `.mes`… in
   `produce.css`; they are the same declarations, written where the markup is.

   THE BADGE IS SPLIT IN THREE on purpose. Two utilities setting the SAME
   property are decided by their order in the generated sheet, not by their order
   in the class string — so an « off » chain cannot override a colour the base
   already names. The base holds only what both states share; each state names
   its own ground, border and text. */
const SECTION =
  'mt-[14px] border-t border-t-line pt-[14px] first:mt-0 first:[border-top:0] first:pt-0'
const SECTION_TITLE = 'lab'
/* `flex-none` + `nowrap`: « jamais mesuré » broke over two lines in 340 px
   (screen-20, constat 8). No opacity on the « off » state any more: at .55 it
   read 2.5:1. Regular weight, not 600: capitals AND a weight are the `.lab`
   signature, which a badge never carries (charter, test_charte [1]). */
const BADGE_BASE =
  'flex-none whitespace-nowrap rounded-[5px] border px-[6px] py-[2px] text-[10.5px] ' +
  'uppercase tracking-[.06em]'
const BADGE_ON = 'border-mes-line bg-mes-bg text-ok'
const BADGE_OFF = 'border-line bg-transparent text-dim2'
const BADGE_WARN = 'border-warn-line bg-warn-bg text-warn-txt'
const ROW = 'mb-[16px] last:mb-0'
const ROW_HEAD = 'mb-[6px] flex items-center gap-[8px]'
const HELP = 'mt-[6px] mb-0 text-[12.5px] leading-[1.6] text-dim'
/* A field of the panel repaints what `chrome.css` gives every input, except its
   border colour and its radius — that is the whole of the old `.rg select,
   .rg input[type=number]`. A field moved away from its measured value outlines
   itself in the warning family (§S4): the value alone changed colour, which a
   `<select>` cannot show at all. */
const FIELD = 'w-full rounded-[8px] border bg-panel2 px-[10px] py-[8px]'
const FIELD_REF = 'border-line2'
const FIELD_OFF = 'border-warn! text-warn-txt'
/* The slider is a TRANSPARENT range over a painted track: `input[type=range]`
   can draw neither a fill that stops at the value nor a mark at a second one,
   and the design-pass asks for both (§S4). The wrapper below carries the 3 px
   track, the fill, and the `--ok` tick at the measured value; the input keeps
   being the control, so the value, the arrows and the screen reader are
   untouched. `appearance-none` on the track AND on the thumb: without it the
   browser paints its own control over ours. */
const SLIDER =
  'relative z-[1] mx-0 my-0 block h-[16px] w-full appearance-none bg-transparent [outline:none] ' +
  '[&::-webkit-slider-runnable-track]:h-[16px] [&::-webkit-slider-runnable-track]:bg-transparent ' +
  '[&::-webkit-slider-thumb]:h-[14px] [&::-webkit-slider-thumb]:w-[14px] ' +
  '[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:cursor-pointer ' +
  '[&::-webkit-slider-thumb]:rounded-[50%] [&::-webkit-slider-thumb]:border-2 ' +
  '[&::-webkit-slider-thumb]:border-panel [&::-webkit-slider-thumb]:bg-txt ' +
  '[&::-webkit-slider-thumb]:shadow-[0_1px_4px_#0008] ' +
  '[&::-moz-range-track]:h-[16px] [&::-moz-range-track]:bg-transparent ' +
  '[&::-moz-range-thumb]:h-[14px] [&::-moz-range-thumb]:w-[14px] ' +
  '[&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:rounded-[50%] ' +
  '[&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-panel ' +
  '[&::-moz-range-thumb]:bg-txt'

const sameAsReference = (item: Setting, value: SettingValues[string], reference: unknown) =>
  item.type === 'bool'
    ? Boolean(reference) === Boolean(value)
    : Math.abs(Number(reference) - Number(value)) < 1e-9

/** How many settings sit away from their measured value, in total and per
    section. Pure, and exported because the inspector's own tab shows the total
    on a badge without mounting the panel (.claude/rules/frontend.md — a pure
    computation is a function, shared by two and owned by neither; it lives
    here with `referenceOf`, which it needs). */
export function deviationCount(
  values: SettingValues,
  presetRef: Record<string, unknown>,
  nsfwRef: Record<string, unknown>,
): { total: number; bySection: Record<string, number> } {
  let total = 0
  const bySection: Record<string, number> = {}
  SECTIONS.forEach((section) =>
    section.items.forEach((item) => {
      const reference = referenceOf(item, presetRef, nsfwRef)
      if (reference === '' || reference === undefined) return
      if (!sameAsReference(item, values[item.id], reference)) {
        total += 1
        bySection[section.titre] = (bySection[section.titre] ?? 0) + 1
      }
    }),
  )
  return { total, bySection }
}

/** Where the value sits on its own [min,max] range, as a percentage — used to
    place the fill and the measured tick under a slider. */
const ratio = (item: Setting, value: number): number => {
  const min = Number(item.min ?? 0)
  const max = Number(item.max ?? 1)
  if (!Number.isFinite(value) || max === min) return 0
  return Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100))
}

export function SettingsPanel({
  values,
  presetRef,
  nsfwRef,
  editTier,
  nsfwLevel,
  onChange,
  onReset,
}: {
  values: SettingValues
  presetRef: Record<string, unknown>
  nsfwRef: Record<string, unknown>
  /** True on the tier that edits — the NSFW section only makes sense there. */
  editTier: boolean
  /* The NSFW pipeline leans on the identity QC verdict: without it every verdict
     becomes "OK". Same for the Rapide/Brut presets, which cut the refiner and
     the grain the branch inherits. Disable rather than let one click a control
     with no effect (double guard, see guard_intensity server-side). */
  nsfwLevel: boolean
  onChange: (id: string, value: string | boolean) => void
  onReset: () => void
}) {
  /* Deviation count, globally and per section. A folded section must say it
     hides a deviation, otherwise folding hides the very information the counter
     exists to give. */
  const { formats } = useConfig()
  const [explain, setExplain] = useState<Explain>(readExplain)
  const pickExplain = (next: Explain) => {
    setExplain(next)
    try {
      localStorage.setItem(EXPLAIN_KEY, next)
    } catch {
      /* private browsing, storage refused: the choice lasts the session */
    }
  }
  const { total, bySection } = useMemo(
    () => deviationCount(values, presetRef, nsfwRef),
    [values, presetRef, nsfwRef],
  )

  return (
    <div id="gearPanel">
      {/* The head states the deviation as a SENTENCE and offers the way back
          on the same line (§S4). It used to be a bare count next to a button
          labelled « Valeurs mesurées », which read as the name of a mode
          rather than of a gesture. */}
      <div className="mb-[14px] flex items-baseline gap-[10px] text-[12.5px]">
        <span className={total ? 'text-warn-txt' : 'text-dim2'} id="gearDiff">
          {total
            ? `${total} réglage${total > 1 ? 's' : ''} modifié${total > 1 ? 's' : ''} pour ce lancement`
            : ''}
        </span>
        <div className="flex-1" />
        {/* Always offered, never only when a deviation exists: it also puts
            the quality preset back to « Réalisme », which can be off while
            every individual setting happens to match. */}
        <button
          type="button"
          className="link flex-none text-[12.5px]"
          id="btnReset"
          onClick={onReset}
        >
          Revenir aux valeurs mesurées
        </button>
      </div>
      <p className="mt-0 mb-[10px] text-[12px] text-dim2">
        Badge <b>mesuré</b> : valeur validée par les tests. S'en écarter est un choix.
      </p>
      <ExplanationsChoice value={explain} onPick={pickExplain} />
      <div id="gearBody">
        {SECTIONS.map((section) => {
          if (section.niveau === 'edit' && !editTier) return null
          const body = section.items.map((item) => (
            <SettingRow
              key={item.id}
              item={
                item.optionsFrom === 'formats'
                  ? { ...item, options: [...(item.options ?? []), ...formats.map((f) => [f, formatLabel(f)] as [string, string])] }
                  : item
              }
              value={values[item.id]}
              reference={referenceOf(item, presetRef, nsfwRef)}
              masterLabel={item.lieA && !values[item.lieA] ? BY_ID[item.lieA].label : null}
              nsfwLevel={nsfwLevel}
              deviationsOnly={explain === 'ecarts'}
              onChange={onChange}
            />
          ))
          const deviations = bySection[section.titre] ?? 0
          if (!section.replie) {
            return (
              <section
                className={SECTION}
                data-rgs
                data-niveau={section.niveau ?? ''}
                key={section.titre}
              >
                <div className="mt-0 mb-[12px] flex items-baseline gap-[10px]">
                  <h4 className={`${SECTION_TITLE} m-0`}>{section.titre}</h4>
                  <SectionDeviations titre={section.titre} n={deviations} />
                </div>
                {body}
              </section>
            )
          }
          return (
            <section
              className={SECTION}
              data-rgs
              data-niveau={section.niveau ?? ''}
              key={section.titre}
            >
              {/* The fold marker: `[[open]>&]` reads « this summary, inside an
                  open details » — the state lives on the parent, so no `open:`
                  variant can see it from here. */}
              <details>
                <summary
                  className="flex cursor-pointer items-baseline gap-[10px] [list-style:none]
                             [&::-webkit-details-marker]:hidden
                             before:text-[11px] before:text-dim before:content-['▸']
                             [[open]>&]:before:content-['▾']"
                >
                  <h4 className={`${SECTION_TITLE} m-0 inline`}>{section.titre}</h4>
                  <SectionDeviations titre={section.titre} n={deviations} />
                </summary>
                {body}
              </details>
            </section>
          )
        })}
      </div>
    </div>
  )
}

/* « Explications : Toutes · Écarts seulement » (screen-20 S3). The panel ran to
   922 px for one section against 719 of visible inspector; once the texts are
   known, only the rows that moved need theirs. Kept per browser, default
   « Toutes » so a first visit reads everything. */
type Explain = 'toutes' | 'ecarts'
const EXPLAIN_KEY = 'studio.reglages-explications'
const EXPLAIN_OPTIONS: [Explain, string][] = [['toutes', 'Toutes'], ['ecarts', 'Écarts seulement']]
const EXPLAIN_IDS = EXPLAIN_OPTIONS.map(([key]) => key)

function readExplain(): Explain {
  try {
    return localStorage.getItem(EXPLAIN_KEY) === 'ecarts' ? 'ecarts' : 'toutes'
  } catch {
    return 'toutes'
  }
}

function ExplanationsChoice({ value, onPick }: { value: Explain; onPick: (next: Explain) => void }) {
  const roving = useRovingChoice(EXPLAIN_IDS, value)
  return (
    <div className="mb-[18px] flex items-center gap-[8px] text-[12px] text-dim2">
      <span id="explainLab">Explications :</span>
      <div className="seg" role="radiogroup" aria-labelledby="explainLab" id="explainSeg">
        {EXPLAIN_OPTIONS.map(([key, label]) => (
          <button
            key={key}
            type="button"
            ref={roving.registerRef(key)}
            role="radio"
            aria-checked={value === key}
            tabIndex={roving.tabIndexFor(key)}
            /* `.seg button` is 13.5 px, off the scale: a global debt, not
               this screen's to settle; brought to 12 here. */
            className={`px-[10px]! py-[4px]! text-[12px]! ${value === key ? 'on' : ''}`}
            data-explain={key}
            onClick={() => onPick(key)}
            onKeyDown={(event) => roving.onKeyDown(event, key, (id) => onPick(id as Explain))}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}

/* « N modifié(s) » next to a section title — and nothing at all when the
   section is untouched. A folded section MUST say it hides a deviation,
   otherwise folding hides the very information the counter exists to give;
   the same marker is written on an open section so the two read alike. */
function SectionDeviations({ titre, n }: { titre: string; n: number }) {
  return (
    <span className={`text-[11px] ${n ? 'text-warn-txt' : 'text-dim2'}`} data-sec={titre}>
      {n ? `${n} modifié${n > 1 ? 's' : ''}` : ''}
    </span>
  )
}

/* What a setting does, then what it costs, for EVERY kind (screen-20 S2): a
   switch used to drop its `cout`, so « Reprise des mains » never said +35 s.
   The cost stays INSIDE the `data-rgq` paragraph, where the fumigation reads
   it. `quiet` (« Écarts seulement », S3) hides it visually only: it stays in
   the DOM, the field keeps pointing at it through `aria-describedby`, and the
   row that holds the focus shows it again. */
function Help({ item, quiet }: { item: Setting; quiet: boolean }) {
  return (
    <p
      className={`${HELP}${quiet ? ' sr-only group-focus-within:not-sr-only' : ''}`}
      id={`q_${item.id}`}
      data-rgq
    >
      {item.quoi}
      {item.cout && <span className="mt-[2px] block text-dim2" data-cout>{item.cout}</span>}
    </p>
  )
}

function SettingRow({
  item,
  value,
  reference,
  masterLabel,
  nsfwLevel,
  deviationsOnly,
  onChange,
}: {
  item: Setting
  value: string | boolean
  reference: unknown
  /** The label of the switch this setting depends on, when that switch is off. */
  masterLabel: string | null
  nsfwLevel: boolean
  deviationsOnly: boolean
  onChange: (id: string, value: string | boolean) => void
}) {
  const hasReference = reference !== '' && reference !== undefined
  const measured = hasReference && sameAsReference(item, value, reference)
  /* A setting moved away from its measured value says so in the WARNING
     family, not in the accent (§S4). The accent is the studio's « this is
     selected » colour — on a panel where a dozen rows can be off at once it
     read as decoration. A deviation is a choice one is answerable for, which
     is exactly what `--warn-txt` says everywhere else. */
  const off = hasReference && !measured
  /* A setting depending on a switch that is off no longer has an effect. It
     used to fade to .42, which took its text under 4.5:1 (3.53 and 2.32,
     measured 27/09): the field is disabled instead, and a line says why. */
  const inert = masterLabel !== null
  const disabled = inert || (item.id === 'noqc' && nsfwLevel)
  const quiet = deviationsOnly && !off
  const describedBy = `q_${item.id}${inert ? ` x_${item.id}` : ''}`
  /* A real <label for>, not a bold word next to the field: a screen reader
     read « Format imposé » as an unnamed list (audit of 27/09). Same size and
     weight for the four kinds (screen-20 S2): the switch's `<b>` made it 700. */
  const title = `text-[13px] font-semibold ${off ? 'text-warn-txt' : ''}`
  const field = `${FIELD} ${off ? FIELD_OFF : FIELD_REF}`
  const inertLine = inert && (
    <p className="mt-[6px] mb-0 text-[12px] text-warn-txt" id={`x_${item.id}`}>
      Sans effet : {masterLabel} est coupée.
    </p>
  )

  if (item.type === 'bool') {
    return (
      <div className={`${ROW} group`} data-rg data-id={item.id}>
        <div className={ROW_HEAD}>
          <label className={`flex min-w-0 flex-1 cursor-pointer items-center gap-[8px] ${title}`}>
            <input
              className="w-auto"
              type="checkbox"
              id={item.id}
              checked={Boolean(value)}
              disabled={disabled}
              aria-describedby={describedBy}
              onChange={(e) => onChange(item.id, e.target.checked)}
            />
            {item.label}
          </label>
          {/* A switch had no badge at all, so a cut refiner only said so in
              the tab counter. Written only when it deviates: at rest the
              switch's own state is the whole story. */}
          {off && (
            <span
              className={`${BADGE_BASE} ${BADGE_WARN}`}
              id={`m_${item.id}`}
              data-mes
              data-off="1"
              tabIndex={0}
              data-hint-text={`valeur mesurée du projet : ${reference ? 'actif' : 'coupé'}`}
            >
              mesuré : {reference ? 'actif' : 'coupé'}
            </span>
          )}
        </div>
        <div className="ml-[26px]">
          <Help item={item} quiet={quiet} />
          {inertLine}
        </div>
      </div>
    )
  }

  if (item.type === 'liste') {
    return (
      <div className={`${ROW} group`} data-rg data-id={item.id}>
        <div className={ROW_HEAD}>
          <label className={title} htmlFor={item.id}>{item.label}</label>
        </div>
        <select
          className={field}
          id={item.id}
          value={String(value)}
          disabled={disabled}
          aria-describedby={describedBy}
          onChange={(e) => onChange(item.id, e.target.value)}
        >
          {(item.options ?? []).map(([v, l]) => (
            <option value={v} key={v}>
              {l}
            </option>
          ))}
        </select>
        <Help item={item} quiet={quiet} />
        {inertLine}
      </div>
    )
  }

  if (item.type === 'nombre') {
    return (
      <div className={`${ROW} group`} data-rg data-id={item.id}>
        <div className={ROW_HEAD}>
          <label className={title} htmlFor={item.id}>{item.label}</label>
        </div>
        <input
          className={field}
          type="number"
          id={item.id}
          min={item.min}
          max={item.max}
          placeholder={item.vide ?? ''}
          value={String(value)}
          disabled={disabled}
          aria-describedby={describedBy}
          onChange={(e) => onChange(item.id, e.target.value)}
        />
        <Help item={item} quiet={quiet} />
        {inertLine}
      </div>
    )
  }

  return (
    <div className={`${ROW} group`} data-rg data-id={item.id}>
      <div className={ROW_HEAD}>
        {/* The title is what wraps (`min-w-0 flex-1`), never the badge. */}
        <label className={`min-w-0 flex-1 ${title}`} htmlFor={item.id}>{item.label}</label>
        <span
          className={`text-[13px] font-semibold tabular-nums ${off ? 'text-warn-txt' : 'text-txt'}`}
          id={`v_${item.id}`}
        >
          {fmtVal(item, value as string)}
        </span>
        {/* `tabIndex={0}` + `data-hint-text` (design pass écran 3, §A3) —
            same contract as the pose badge (§A2): a plain `title` only
            reaches a mouse, this reaches the keyboard and a screen reader
            too. The base fact ("mesuré" / not) stays in visible text. */}
        {/* TROIS ETATS, PAS DEUX (10/09). Un reglage qui n'a AUCUNE valeur de
            reference — `handdetailer_denoise`, dont la fiche dit elle-meme
            « jamais mesuré : 0.5 est une valeur de départ posée à la main » —
            affichait « mesuré » en gris, ce qui se lit « hors valeur mesurée ».
            C'est un badge qui ment : il n'y a rien dont s'ecarter, et le reste
            du panneau le sait deja (le titre ne s'accentue que si
            `hasReference`, le compteur d'ecarts ne le compte pas). Le mot suit
            maintenant la meme verite. */}
        <span
          className={`${BADGE_BASE} ${measured ? BADGE_ON : off ? BADGE_WARN : BADGE_OFF}`}
          id={`m_${item.id}`}
          data-mes
          data-off={measured ? undefined : '1'}
          data-noref={hasReference ? undefined : '1'}
          tabIndex={0}
          data-hint-text={hasReference
            ? `valeur mesurée du projet : ${fmtVal(item, reference as number)}`
            : "ce réglage n'a jamais été mesuré : sa valeur est un point de départ"}
        >
          {/* §S4: a deviated setting prints the value it left, right here.
              At rest the word stands alone, which is what the fumigation reads. */}
          {hasReference ? (off ? `mesuré ${fmtVal(item, reference as number)}` : 'mesuré') : 'jamais mesuré'}
        </span>
      </div>
      {/* The painted track sits UNDER a transparent range (see SLIDER): the
          fill stops at the value, and the `--ok` tick marks the measured one —
          neither of which a native range can draw. `aria-hidden`: the input
          above already announces its value, min and max. */}
      <div className="relative my-[2px] h-[16px]">
        <div
          className="pointer-events-none absolute inset-x-0 top-[6.5px] h-[3px] rounded-[2px] bg-line2"
          aria-hidden="true"
        >
          <div
            className={`h-full rounded-[2px] ${off ? 'bg-warn' : 'bg-dim2'}`}
            style={{ width: `${ratio(item, Number(value))}%` }}
          />
        </div>
        {hasReference && (
          <span
            className="pointer-events-none absolute top-[3px] h-[10px] w-[2px] -translate-x-1/2
                       rounded-[1px] bg-ok"
            style={{ left: `${ratio(item, Number(reference))}%` }}
            aria-hidden="true"
          />
        )}
        <input
          className={SLIDER}
          type="range"
          id={item.id}
          min={item.min}
          max={item.max}
          step={item.pas}
          value={String(value)}
          disabled={disabled}
          aria-describedby={describedBy}
          onChange={(e) => onChange(item.id, e.target.value)}
        />
      </div>
      <div className="mt-[3px] flex justify-between text-[11px] text-dim2">
        <span>{item.bas}</span>
        <span>{item.haut}</span>
      </div>
      <Help item={item} quiet={quiet} />
      {inertLine}
    </div>
  )
}
