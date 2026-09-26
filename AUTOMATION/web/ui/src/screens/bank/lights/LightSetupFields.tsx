/* The five settings of a studio sheet (IT-10 7 bis) — presentational.

   Each setting is a radio group of chips, the plain name on the chip and the
   trade's term under it, so both readers find their word. Direction is
   picked on a small top view instead, the subject in the middle and the
   camera at the bottom: where the light stands is a place, not a word. */
import { useRovingChoice } from '../../../chrome/useRovingChoice'
import type { Setup, SettingKey, Vocabulary } from './lightCompose'

type Setting = Vocabulary['settings'][number]

function SettingChips({
  setting, value, disabled, onPick,
}: {
  setting: Setting
  value: string | null | undefined
  disabled: boolean
  onPick: (value: string) => void
}) {
  const ids = setting.options.map((o) => o.key)
  const roving = useRovingChoice(ids, value ?? null)
  const picked = setting.options.find((o) => o.key === value)
  return (
    <div className="flex flex-col gap-[5px]">
      <span className="lab" id={`lightSet-${setting.key}`}>{setting.label}</span>
      <div className="chips" role="radiogroup" aria-labelledby={`lightSet-${setting.key}`}
           data-light-setting={setting.key}>
        {setting.options.map((option) => (
          <button
            key={option.key}
            ref={roving.registerRef(option.key)}
            type="button"
            role="radio"
            aria-checked={option.key === value}
            tabIndex={roving.tabIndexFor(option.key)}
            className={`chip-t ${option.key === value ? 'on' : ''}`}
            data-option={option.key}
            disabled={disabled}
            onKeyDown={(event) => roving.onKeyDown(event, option.key, onPick)}
            onClick={() => onPick(option.key)}
          >
            {option.label}
          </button>
        ))}
      </div>
      {picked?.term && <span className="tiny">{picked.term}</span>}
    </div>
  )
}

/* 180 x 176: the subject at (90, 84), the lights on a 62 px circle, the
   camera under the front light. `angle` comes from the vocabulary (0 = in
   front, 180 = behind); a direction without one stands over the subject. */
const CX = 90
const CY = 84
const R = 62

function DirectionDiagram({
  setting, value, disabled, onPick,
}: {
  setting: Setting
  value: string | null | undefined
  disabled: boolean
  onPick: (value: string) => void
}) {
  const ids = setting.options.map((o) => o.key)
  const roving = useRovingChoice(ids, value ?? null)
  const picked = setting.options.find((o) => o.key === value)
  const at = (angle: number | null | undefined) => {
    if (angle == null) return { x: CX, y: CY }
    const rad = (angle * Math.PI) / 180
    return { x: CX - R * Math.sin(rad), y: CY + R * Math.cos(rad) }
  }
  const spot = picked ? at(picked.angle) : null
  return (
    <div className="flex flex-col gap-[5px]">
      <span className="lab" id="lightSet-direction">{setting.label}</span>
      <div className="flex items-center gap-[12px]">
        <div
          className="relative h-[176px] w-[180px] flex-none rounded-card border border-line bg-bg"
          role="radiogroup"
          aria-labelledby="lightSet-direction"
          data-light-setting="direction"
        >
          <svg className="absolute inset-0" width="180" height="176" aria-hidden="true">
            <circle cx={CX} cy={CY} r={R} fill="none" className="stroke-line2" strokeDasharray="3 4" />
            {spot && <line x1={spot.x} y1={spot.y} x2={CX} y2={CY} className="stroke-acc" strokeWidth="2" />}
            <circle cx={CX} cy={CY} r="13" className="fill-panel3 stroke-dim2" />
            <rect x={CX - 11} y={CY + R + 16} width="22" height="12" rx="2" className="fill-none stroke-dim2" />
          </svg>
          {setting.options.map((option) => {
            const { x, y } = at(option.angle)
            const on = option.key === value
            return (
              <button
                key={option.key}
                ref={roving.registerRef(option.key)}
                type="button"
                role="radio"
                aria-checked={on}
                aria-label={`${option.label} (${option.term})`}
                title={`${option.label} · ${option.term}`}
                tabIndex={roving.tabIndexFor(option.key)}
                data-option={option.key}
                disabled={disabled}
                /* the overhead spot rings the subject: it has no ground of
                   its own, or it would hide the subject it stands over */
                className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 ${
                  option.angle == null ? 'h-[34px] w-[34px]' : 'h-[22px] w-[22px]'} ${
                  on ? 'border-acc' : 'border-dim2 hover:border-txt'} ${
                  on && option.angle != null ? 'bg-acc' : option.angle == null ? 'bg-transparent' : 'bg-panel'}`}
                style={{ left: x, top: y }}
                onKeyDown={(event) => roving.onKeyDown(event, option.key, onPick)}
                onClick={() => onPick(option.key)}
              />
            )
          })}
        </div>
        <div className="flex min-w-0 flex-col gap-[3px] text-[12px]">
          {picked ? (
            <>
              <b className="font-medium">{picked.label}</b>
              <span className="text-dim2">{picked.term}</span>
            </>
          ) : (
            <span className="text-dim2">Choisir d'où vient la lumière, le sujet au centre.</span>
          )}
          <span className="tiny mt-[6px]">L'appareil est en bas.</span>
        </div>
      </div>
    </div>
  )
}

export function LightSetupFields({
  vocabulary, setup, disabled, onChange,
}: {
  vocabulary: Vocabulary
  setup: Setup
  disabled: boolean
  onChange: (setup: Setup) => void
}) {
  const pick = (key: SettingKey) => (value: string) => onChange({ ...setup, [key]: value })
  return (
    <div className="flex flex-col gap-[12px]" id="lightSetup">
      {vocabulary.settings.map((setting) =>
        setting.key === 'direction' ? (
          <DirectionDiagram key={setting.key} setting={setting} value={setup.direction}
                            disabled={disabled} onPick={pick('direction')} />
        ) : (
          <SettingChips key={setting.key} setting={setting} value={setup[setting.key as SettingKey]}
                        disabled={disabled} onPick={pick(setting.key as SettingKey)} />
        ),
      )}
    </div>
  )
}
