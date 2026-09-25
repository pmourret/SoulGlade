/* The 12 parameters of one tone's expression range (design-pass screen-8 §S5)
   — purely presentational (frontend.md: a sub-component never calls the API).
   Replaces `ExpressionSliders.tsx`.

   WHAT CHANGED FROM THAT FILE. A row carried a native `<input type="range">`
   for the trial plus three number fields and two « mn » / « mx » buttons: seven
   tab stops per row, 84 for the panel, to say something a drawn band says at a
   glance (see `RangeRule.tsx`). The row is now the checkbox, the name, the
   rule, and two bounds one clicks to type into — and `[` / `]` do what the two
   buttons did, from anywhere in the row.

   ONE DEPARTURE FROM §S5.2: the column header reads « Paramètre · Plage · min
   · max » and not « … · essai · min / max ». The trial is not a column any
   more, it is the marker inside the rule, and a header cell pointing at no
   column is a header that lies. The foot legend says what the marker is. */
import { useEffect, useRef, useState } from 'react'

import { InfoHint } from '../bank/composer/InfoHint'
import { UndoRedoButtons } from '../pose-editor/UndoRedoButtons'
import { CopyFromToneMenu } from './CopyFromToneMenu'
import { PARAM_BOUNDS, PARAM_GROUPS, PARAM_LABELS, type ExpressionParamName } from './expressionBounds'
import { RangeRule } from './RangeRule'
import type { CopySource, ParamState } from './useExpressionEditor'
import { PARAM_NAMES } from './useToneList'

export function ParamPanel({
  toneLabel, params, copySources, canUndo, canRedo,
  onTrial, onMin, onMax, onToggle, onSetAsMin, onSetAsMax, onCopy, onUndo, onRedo,
}: {
  toneLabel: string
  params: Record<ExpressionParamName, ParamState>
  copySources: CopySource[]
  canUndo: boolean
  canRedo: boolean
  onTrial: (name: ExpressionParamName, value: number) => void
  onMin: (name: ExpressionParamName, value: number) => void
  onMax: (name: ExpressionParamName, value: number) => void
  onToggle: (name: ExpressionParamName) => void
  onSetAsMin: (name: ExpressionParamName) => void
  onSetAsMax: (name: ExpressionParamName) => void
  onCopy: (sourceKey: string) => void
  onUndo: () => void
  onRedo: () => void
}) {
  const includedCount = PARAM_NAMES.filter((name) => params[name].included).length

  return (
    <aside id="paramPanel" className="flex min-h-0 flex-col border-l border-l-line bg-panel">
      <div className="flex flex-none items-center gap-[8px] border-b border-b-line px-[12px] py-[9px]">
        <div className="min-w-0 flex-1">
          <div className="truncate text-[14px] font-[650]" data-tone-name>
            {toneLabel}
          </div>
          <div className="text-[11px] text-dim2">
            {includedCount} / {PARAM_NAMES.length} paramètres
          </div>
        </div>
        <CopyFromToneMenu sources={copySources} onCopy={onCopy} />
        <UndoRedoButtons canUndo={canUndo} canRedo={canRedo} onUndo={onUndo} onRedo={onRedo} />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-[12px] pb-[10px]">
        {/* Sticky so it stays in view while the panel scrolls past a group
            boundary. Its widths are the row's own widths, written once here
            and once below — kept together on purpose, a few lines apart. */}
        <div className="sticky top-0 z-[1] flex items-center gap-[8px] bg-panel py-[6px]
                        lab">
          <span className="w-[150px] shrink-0">Paramètre</span>
          <span className="min-w-[60px] flex-1">Plage</span>
          <span className="w-[52px] shrink-0 text-right">min</span>
          <span className="w-[52px] shrink-0 text-right">max</span>
        </div>

        {PARAM_GROUPS.map((group) => {
          const included = group.params.filter((name) => params[name].included).length
          return (
            <div key={group.label} className="mt-[8px]">
              <div className="tiny mb-[2px] opacity-70">
                {group.label} — {included}/{group.params.length} inclus
              </div>
              {group.params.map((name) => (
                <ParamRow
                  key={name}
                  name={name}
                  state={params[name]}
                  onTrial={(value) => onTrial(name, value)}
                  onMin={(value) => onMin(name, value)}
                  onMax={(value) => onMax(name, value)}
                  onToggle={() => onToggle(name)}
                  onSetAsMin={() => onSetAsMin(name)}
                  onSetAsMax={() => onSetAsMax(name)}
                />
              ))}
            </div>
          )
        })}
      </div>

      <p className="flex-none border-t border-t-line px-[12px] py-[8px] text-[11px] leading-[1.5] text-dim2">
        Barre blanche : valeur d'essai. Bande colorée : plage tirée au hasard à
        chaque génération. Trait gris : zéro. <b className="font-code">[</b> et{' '}
        <b className="font-code">]</b> posent l'essai comme minimum ou maximum.
      </p>
    </aside>
  )
}

function ParamRow({
  name, state, onTrial, onMin, onMax, onToggle, onSetAsMin, onSetAsMax,
}: {
  name: ExpressionParamName
  state: ParamState
  onTrial: (value: number) => void
  onMin: (value: number) => void
  onMax: (value: number) => void
  onToggle: () => void
  onSetAsMin: () => void
  onSetAsMax: () => void
}) {
  const [lo, hi] = PARAM_BOUNDS[name]
  const step = hi - lo > 40 ? 1 : 0.01
  const label = PARAM_LABELS[name]

  /* `[` and `]` from ANYWHERE in the row, not only from the rule: the gesture
     follows the row one is reading, and after typing an exact minimum the
     focus is in a bound field, which is exactly where one then wants `]`.
     Skipped while a bound field is open — a bracket typed into a number field
     is the user typing, not a shortcut. */
  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key !== '[' && event.key !== ']') return
    if ((event.target as HTMLElement).tagName === 'INPUT' && (event.target as HTMLInputElement).type === 'number') return
    event.preventDefault()
    if (event.key === '[') onSetAsMin()
    else onSetAsMax()
  }

  return (
    // Dimmed when NOT included — measured before this was added: an included
    // and an excluded row rendered at the exact same opacity, the only
    // difference being a checkbox easy to miss while scanning 12 rows.
    <div
      className={`flex h-[36px] items-center gap-[8px] transition-opacity ${state.included ? '' : 'opacity-55'}`}
      data-param={name}
      onKeyDown={onKeyDown}
    >
      <label className="flex w-[150px] shrink-0 items-center gap-[4px] text-[12.5px]">
        {/* `w-auto`, not just `shrink-0`: `chrome.css`'s global
            `input{width:100%}` resolves against the label's DEFINITE 150px the
            moment it has one, and the checkbox eats the whole cell (measured
            in the previous version of this row: the text's own rendered width
            was 0px). */}
        <input type="checkbox" data-param-included checked={state.included} onChange={onToggle} className="w-auto shrink-0" />
        <span className="min-w-0 flex-1 truncate">{label}</span>
        <InfoHint
          text={`Bornes du node ComfyUI : [${lo}, ${hi}]. « Inclure » ajoute ce paramètre à la plage enregistrée pour ce ton — la valeur d'essai reste explorable même non inclus.`}
        />
      </label>

      <RangeRule
        label={label}
        lo={lo}
        hi={hi}
        step={step}
        trial={state.trial}
        min={state.min}
        max={state.max}
        included={state.included}
        onTrial={onTrial}
      />

      <BoundField param={name} field="min" boundLabel="minimum" paramLabel={label} value={state.min} onCommit={onMin} />
      <BoundField param={name} field="max" boundLabel="maximum" paramLabel={label} value={state.max} onCommit={onMax} />
    </div>
  )
}

/** A bound, read as a number and typed into on demand (§S5.4). Two always-open
    number fields per row is 24 tab stops for a panel one mostly reads; a
    button that becomes a field on click is one stop, and the exact value stays
    one click away when the rule's pixel is not precise enough. */
function BoundField({
  param, field, boundLabel, paramLabel, value, onCommit,
}: {
  /** Only to build a unique id for the `<label htmlFor>` below. */
  param: ExpressionParamName
  field: 'min' | 'max'
  boundLabel: string
  paramLabel: string
  value: number
  onCommit: (next: number) => void
}) {
  const fieldId = `bound-${param}-${field}`
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(String(value))
  const inputRef = useRef<HTMLInputElement | null>(null)

  // Local text absorbs in-progress typing (a bare "-", an empty field) so the
  // input does not snap back to the last committed digit on every keystroke.
  useEffect(() => {
    setText(String(value))
  }, [value])

  useEffect(() => {
    if (editing) inputRef.current?.select()
  }, [editing])

  if (!editing) {
    return (
      <button
        type="button"
        data-param-bound={field}
        className="w-[52px] shrink-0 cursor-text border-0 bg-transparent px-0 text-right font-code
                   text-[11.5px] text-dim hover:text-txt focus-visible:outline-2
                   focus-visible:outline-focus focus-visible:outline-offset-2"
        aria-label={`${paramLabel} — ${boundLabel} ${value}, modifier`}
        onClick={() => setEditing(true)}
      >
        {value}
      </button>
    )
  }

  return (
    <span className="w-[52px] shrink-0">
      {/* A REAL `<label htmlFor>`, clipped rather than replaced by an
          `aria-label` (frontend.md). The field is short-lived — it appears on
          click and closes on blur — which changes nothing: while it is open it
          is an ordinary text field, and the rest of the studio names its
          fields this way. */}
      <label className="sr-only" htmlFor={fieldId}>
        {paramLabel} — {boundLabel}
      </label>
      <input
        ref={inputRef}
        id={fieldId}
        type="number"
        data-param-field={field}
        className="w-full !px-[4px] text-right font-code text-[11.5px]"
        autoFocus
        value={text}
        onChange={(event) => {
          setText(event.target.value)
          const parsed = Number(event.target.value)
          if (event.target.value.trim() !== '' && Number.isFinite(parsed)) onCommit(parsed)
        }}
        onBlur={() => setEditing(false)}
        onKeyDown={(event) => {
          if (event.key !== 'Enter' && event.key !== 'Escape') return
          event.preventDefault()
          setEditing(false)
        }}
      />
    </span>
  )
}
