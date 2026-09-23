/* The left panel of Produire: intensity, intention, tone — the three choices
   that decide WHAT is produced, gathered in one column (design-pass
   screen-3b, §S2). It replaces `IntensityBar.tsx` (a full-width bar above
   everything) and `IntentRail.tsx` (a 170 px rail beside the grid), which
   said the same three things from two different places.

   PRESENTATION ONLY: it receives the lists and the callbacks, it calls no
   API and it decides nothing (.claude/rules/frontend.md). In particular
   `onPickLevel` is `setLevel` in the screen, which carries the confirmation
   dialog of a `requires:'confirm'` tier — clicks AND arrows go through that
   same callback, so neither path can skip it.

   NO TINT FILL ANY MORE. The old bar painted the selected tier in `--ok` /
   `--warn` / `--bad`, which made the intensity the loudest thing on a screen
   whose subject is the scene grid. The hue survives as an 8 px square next
   to the label — the state is still never carried by colour alone, since the
   selected row also has its own ground and weight. */
import { useRovingChoice } from '../../chrome/useRovingChoice'
import type { Creative } from '../../state/TaxonomyContext'
import { isEditTier, type IntensityTier } from './useProduceState'

/* `CreativeIntention` only declares `key` and `label` in the Pydantic model,
   with `extra="allow"`: creative.json belongs to the character, and that
   layer relays it rather than freezing its shape. */
export type Intention = {
  key: string
  label?: string | null
  icon?: string
  min_intensity?: number
  defaults?: { tone?: string }
}

const TITLE =
  'mb-[8px] text-[10.5px] font-semibold uppercase tracking-[.7px] text-dim'

/* `bg-transparent` AND `border-0`, and the second is not optional. A bare
   <button> with no `background` falls back to the browser's own light button
   face (found live on the header's shutdown buttons, chrome/Header.tsx), and
   one with no `border` falls back to its `2px outset` frame. `IntentRail.tsx`
   carried BOTH halves; this file was written with only the first, and the
   result was measured at 2560 px (user report 2026-09-23): every row of
   Intensité, Intention and « à peupler » rendered
   `2px outset rgb(0,0,0)`. Two costs, not one: the list read as a stack of
   separate buttons instead of one group, and the ONLY mark of the selected
   row — its `--panel3` ground — was competing with five identical frames. A
   row of a radiogroup is a line, not a box. */
const ROW =
  'flex h-[30px] w-full items-center gap-[8px] rounded-[6px] border-0 bg-transparent' +
  ' px-[9px] text-left text-[13px] [transition:background-color_.12s]' +
  ' focus-visible:outline-2 focus-visible:outline-[var(--focus)] focus-visible:outline-offset-[-2px]'
/* `!` on the ground: `ROW` already names `bg-transparent`, and two utilities
   setting the SAME property are decided by their order in the GENERATED
   sheet, not by their order in this string — the trap already documented on
   SceneCard.tsx and the late IntentRail.tsx. */
const ROW_ON = 'bg-panel3! font-semibold text-txt'
const ROW_IDLE = 'text-dim hover:bg-panel2 hover:text-txt'
/* THE COUNTER FOLLOWS THE ROW'S GROUND, and this is not a detail of taste.
   `tokens.css` names the exception in so many words: `--dim2` on `--panel3`
   falls to 4.27:1, so « --panel3 ne porte pas de texte secondaire ». An
   active row IS `--panel3`, so its counter steps up to `--dim` (5.90
   measured on the shipped hex) while an idle one, sitting on `--panel`,
   keeps `--dim2`. */
const COUNT_ON = 'text-dim'
const COUNT_IDLE = 'text-dim2'

/* The tier's hue, as an 8 px square. The tier that EDITS carries the hue of
   what it DOES, not of its rank: per pack it can sit at level 1 as well as
   at level 3. A tier the table does not name falls back on `--dim2`. */
const TIER_TINT: Record<string, string> = {
  lv0: 'bg-ok',
  lv2: 'bg-warn',
  lv3: 'bg-warn',
  lvedit: 'bg-bad',
}
const tierKey = (tier: IntensityTier) => (isEditTier(tier) ? 'lvedit' : `lv${tier.level}`)

export function ProduceSidebar({
  tiers,
  level,
  editing,
  onPickLevel,
  full,
  empty,
  intent,
  onPickIntent,
  goCompose,
  tones,
  tone,
  onPickTone,
}: {
  tiers: IntensityTier[]
  level: number
  /** True on the tier that edits an existing image — intention and tone have
      nothing to say there. */
  editing: boolean
  onPickLevel: (level: number) => void
  full: [Intention, number][]
  empty: [Intention, number][]
  intent: string | null
  onPickIntent: (key: string) => void
  goCompose: () => void
  tones: Creative['tones']
  tone: string
  onPickTone: (key: string) => void
}) {
  const tier = tiers.find((t) => t.level === level) ?? null
  /* `unite` comes from the server: the tier that edits counts SOURCE IMAGES,
     not scenes — it picks none. Announcing « 16 scènes » there was false. */
  const unit = tier?.unite || 'scène'
  const plural = tier && tier.scenes > 1 ? 's' : ''

  const levelIds = tiers.map((entry) => String(entry.level))
  const levelRoving = useRovingChoice(levelIds, level != null ? String(level) : null)
  const intentIds = full.map(([entry]) => entry.key)
  const intentRoving = useRovingChoice(intentIds, intent)
  const toneIds = (tones ?? []).map((entry) => entry.key)
  const toneRoving = useRovingChoice(toneIds, tone)

  return (
    <nav
      className="flex w-[248px] flex-none flex-col gap-[22px] overflow-y-auto border-r
                 border-r-line bg-panel px-[14px] py-[16px]
                 max-[1100px]:w-[200px] max-[1100px]:px-[10px]"
      aria-label="Intensité, intention et ton"
    >
      <div>
        <h2 className={TITLE}>Intensité</h2>
        <div
          className="flex flex-col gap-[1px]"
          id="intSel"
          role="radiogroup"
          aria-label="Niveau d'intensité"
        >
          {tiers.map((entry) => {
            const id = String(entry.level)
            const on = entry.level === level
            return (
              <button
                type="button"
                key={entry.level}
                ref={levelRoving.registerRef(id)}
                data-lv={entry.level}
                data-edit={isEditTier(entry) ? '1' : undefined}
                role="radio"
                aria-checked={on}
                tabIndex={levelRoving.tabIndexFor(id)}
                className={`${ROW} ${on ? ROW_ON : ROW_IDLE}`}
                data-hint-text={
                  isEditTier(entry)
                    ? "N'engendre rien : reprend une image déjà validée."
                    : 'Génère des images nouvelles à ce niveau.'
                }
                onClick={() => onPickLevel(entry.level)}
                onKeyDown={(event) =>
                  levelRoving.onKeyDown(event, id, (nextId) => onPickLevel(Number(nextId)))
                }
              >
                <i
                  className={`h-[8px] w-[8px] flex-none rounded-[2px] ${
                    TIER_TINT[tierKey(entry)] ?? 'bg-dim2'
                  }`}
                  aria-hidden="true"
                />
                <span className="min-w-0 flex-1 truncate">{entry.label}</span>
                <span
                  className={`flex-none text-[11px] tabular-nums ${on ? COUNT_ON : COUNT_IDLE}`}
                >
                  {entry.scenes}
                </span>
              </button>
            )
          })}
        </div>
        <p className="mt-[8px] mb-0 text-[11.5px] leading-[1.45] text-dim2" id="intHint">
          {tier
            ? `${tier.export ? 'exportable' : 'hors export'} · ${tier.scenes} ${unit}${plural} ${unit === 'image' ? 'éditable' : 'disponible'}${plural}` +
              (tier.prompt_add ? ` · ajoute : ${tier.prompt_add}` : '')
            : ''}
        </p>
      </div>

      {editing ? (
        /* The tier that EDITS has nothing for these two sections to choose.
           Saying so beats leaving two dead radiogroups on screen — and the
           badge is the one the fumigation reads for « n'engendre rien ». */
        <div className="flex flex-col gap-[10px]">
          <div
            className="rounded-[8px] border border-warn-line bg-warn-bg px-[11px] py-[9px]
                       text-[12px] leading-[1.45] text-warn-txt"
            id="intMode"
          >
            <b className="font-semibold">Édition, n'engendre rien</b>
            <span className="mt-[3px] block text-dim">
              sortie : <code className="font-code">{tier?.destination || '—'}</code>
            </span>
          </div>
          <p className="m-0 text-[11.5px] leading-[1.45] text-dim2">
            Intention et ton ne s'appliquent pas à ce palier.
          </p>
        </div>
      ) : (
        <>
          <div>
            <h2 className={TITLE}>Intention</h2>
            <div
              className="flex flex-col gap-[1px]"
              id="railIntent"
              role="radiogroup"
              aria-label="Intention"
            >
              {full.map(([entry, n]) => {
                const on = entry.key === intent
                return (
                  <button
                    type="button"
                    key={entry.key}
                    ref={intentRoving.registerRef(entry.key)}
                    role="radio"
                    aria-checked={on}
                    tabIndex={intentRoving.tabIndexFor(entry.key)}
                    /* The accent is a 2 px inset rule on the leading edge, not
                       a border: a border would move the row's content by 2 px
                       on selection, in a list of 30 px rows where that shows. */
                    className={`${ROW} ${on ? `${ROW_ON} [box-shadow:inset_2px_0_0_var(--acc)]` : ROW_IDLE}`}
                    data-k={entry.key}
                    onClick={() => onPickIntent(entry.key)}
                    onKeyDown={(event) => intentRoving.onKeyDown(event, entry.key, onPickIntent)}
                  >
                    <span
                      className="w-[16px] flex-none text-center text-[14px] leading-none
                                 [filter:grayscale(1)] opacity-75"
                      aria-hidden="true"
                    >
                      {entry.icon}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{entry.label}</span>
                    <span
                      className={`flex-none text-[11px] tabular-nums ${on ? COUNT_ON : COUNT_IDLE}`}
                    >
                      {n}
                    </span>
                  </button>
                )
              })}
            </div>
            {empty.length > 0 && (
              <div id="railIntentVides">
                <div
                  className="mt-[12px] mb-[6px] flex items-center gap-[8px] text-[10px]
                             uppercase tracking-[.5px] text-dim2
                             after:h-px after:flex-1 after:bg-line after:content-['']"
                  data-sep
                >
                  à peupler
                </div>
                <div className="flex flex-col gap-[1px]">
                  {empty.map(([entry]) => (
                    <button
                      type="button"
                      key={entry.key}
                      className={`${ROW} h-[26px]! text-[12.5px]! ${ROW_IDLE}`}
                      data-k={entry.key}
                      /* "en composer une" is a hint bubble, not inline text:
                         inline it left barely 120 px for icon + label and
                         truncated a name as short as "Self-care" (audit
                         2026-09-04, measured). The button is focusable, so the
                         hint reaches the keyboard too. */
                      data-hint-text="en composer une"
                      onClick={goCompose}
                    >
                      <span className="flex-none text-[12px] text-dim2" aria-hidden="true">
                        ＋
                      </span>
                      <span className="min-w-0 flex-1 truncate text-dim2">{entry.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {intent && (tones ?? []).length > 0 && (
            <div>
              <h2 className={TITLE}>Ton</h2>
              <div className="chips" id="railTone" role="radiogroup" aria-label="Ton">
                {(tones ?? []).map((entry) => (
                  <button
                    type="button"
                    key={entry.key}
                    ref={toneRoving.registerRef(entry.key)}
                    role="radio"
                    aria-checked={entry.key === tone}
                    tabIndex={toneRoving.tabIndexFor(entry.key)}
                    className={`chip-t${entry.key === tone ? ' on' : ''}`}
                    data-k={entry.key}
                    onClick={() => onPickTone(entry.key)}
                    onKeyDown={(event) => toneRoving.onKeyDown(event, entry.key, onPickTone)}
                  >
                    {entry.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </nav>
  )
}
