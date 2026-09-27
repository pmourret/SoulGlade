/* The five settings of a studio sheet (IT-10 7 bis) — presentational.

   Each setting is a radio group of chips, the plain name on the chip and the
   trade's term on the same line, so both readers find their word. Direction
   is picked on a top view instead, the subject in the middle and the camera
   at the bottom: where the light stands is a place, not a word.

   The sheet lays them out (design-pass lumieres, S3): the diagram in its left
   column, the four other settings as rows in its right one. */
import { Icon } from '../../../chrome/Icon'
import { useRovingChoice } from '../../../chrome/useRovingChoice'
import type { Setup, SettingKey, Vocabulary } from './lightCompose'

type Setting = Vocabulary['settings'][number]

/** A picked chip says so by its shape and a tick, not by its tint alone. */
export function ChipTick({ on }: { on: boolean }) {
  return on ? <Icon name="check" className="mr-[4px] inline-block h-[11px] w-[11px] align-[-1px]" /> : null
}

function SettingRow({
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
    <div className="grid grid-cols-[96px_minmax(0,1fr)] items-baseline gap-[10px] border-t border-t-line py-[9px]
                    first:border-t-0 first:pt-0">
      <span className="lab" id={`lightSet-${setting.key}`}>{setting.label}</span>
      <div className="chips items-center" role="radiogroup" aria-labelledby={`lightSet-${setting.key}`}
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
            <ChipTick on={option.key === value} />
            {option.label}
          </button>
        ))}
        {picked?.term && <span className="tiny">{picked.term}</span>}
      </div>
    </div>
  )
}

/* The top view, drawn at 180 x 176 and scaled by 1.4 in the wide sheet
   (252 x 246): the subject in the middle, the lights on a circle, the camera
   under the front light. `angle` comes from the vocabulary (0 = in front,
   180 = behind); a direction without one stands over the subject. */
const GEOMETRY = {
  compact: { w: 180, h: 176, cx: 90, cy: 84, r: 62, subject: 13, cam: [22, 12, 16] },
  large: { w: 252, h: 246, cx: 126, cy: 118, r: 87, subject: 18, cam: [31, 17, 22] },
} as const

export function DirectionDiagram({
  setting, value, disabled, size, onPick,
}: {
  setting: Setting
  value: string | null | undefined
  disabled: boolean
  size: 'large' | 'compact'
  onPick: (value: string) => void
}) {
  const g = GEOMETRY[size]
  const large = size === 'large'
  const ids = setting.options.map((o) => o.key)
  const roving = useRovingChoice(ids, value ?? null)
  const picked = setting.options.find((o) => o.key === value)
  const at = (angle: number | null | undefined) => {
    if (angle == null) return { x: g.cx, y: g.cy }
    const rad = (angle * Math.PI) / 180
    return { x: g.cx - g.r * Math.sin(rad), y: g.cy + g.r * Math.cos(rad) }
  }
  const spot = picked ? at(picked.angle) : null
  const [camW, camH, camGap] = g.cam
  return (
    <div className="flex flex-col gap-[5px]">
      <span className="lab" id="lightSet-direction">{setting.label}</span>
      <div
        className="relative flex-none rounded-card border border-line bg-bg"
        style={{ width: g.w, height: g.h }}
        role="radiogroup"
        aria-labelledby="lightSet-direction"
        data-light-setting="direction"
      >
        <svg className="absolute inset-0" width={g.w} height={g.h} aria-hidden="true">
          <circle cx={g.cx} cy={g.cy} r={g.r} fill="none" className="stroke-line2" strokeDasharray="3 4" />
          {spot && <line x1={spot.x} y1={spot.y} x2={g.cx} y2={g.cy} className="stroke-acc" strokeWidth="2" />}
          <circle cx={g.cx} cy={g.cy} r={g.subject} className="fill-panel3 stroke-dim2" />
          <rect x={g.cx - camW / 2} y={g.cy + g.r + camGap} width={camW} height={camH} rx="2"
                className="fill-none stroke-dim2" />
        </svg>
        {setting.options.map((option) => {
          const { x, y } = at(option.angle)
          const on = option.key === value
          const overhead = option.angle == null
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
              /* the overhead spot rings the subject: it has no ground of its
                 own, or it would hide the subject it stands over. The picked
                 point is filled AND ringed, so it reads by shape too. */
              className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 ${
                overhead ? (large ? 'h-[46px] w-[46px]' : 'h-[34px] w-[34px]')
                  : large ? 'h-[28px] w-[28px]' : 'h-[22px] w-[22px]'} ${
                on ? 'border-acc shadow-[0_0_0_3px_var(--bg),0_0_0_4px_var(--acc)]' : 'border-dim2 hover:border-txt'} ${
                on && !overhead ? 'bg-acc' : overhead ? 'bg-transparent' : 'bg-panel'}`}
              style={{ left: x, top: y }}
              onKeyDown={(event) => roving.onKeyDown(event, option.key, onPick)}
              onClick={() => onPick(option.key)}
            />
          )
        })}
      </div>
      <div className="flex flex-col gap-[2px] text-[12px]" style={{ maxWidth: g.w }}>
        {picked ? (
          <>
            <b className="font-semibold">{picked.label}</b>
            <span className="text-dim2">{picked.term} · l'appareil est en bas</span>
          </>
        ) : (
          <span className="text-dim2">Choisir d'où vient la lumière, le sujet au centre ; l'appareil est en bas.</span>
        )}
      </div>
    </div>
  )
}

/** The four settings other than the direction, one row each. */
export function SettingRows({
  vocabulary, setup, disabled, onChange,
}: {
  vocabulary: Vocabulary
  setup: Setup
  disabled: boolean
  onChange: (setup: Setup) => void
}) {
  return (
    <div className="flex flex-col">
      {vocabulary.settings.filter((setting) => setting.key !== 'direction').map((setting) => (
        <SettingRow key={setting.key} setting={setting} value={setup[setting.key as SettingKey]}
                    disabled={disabled}
                    onPick={(value) => onChange({ ...setup, [setting.key as SettingKey]: value })} />
      ))}
    </div>
  )
}
