/* "Colorimétrie avancée" — design-pass §7b: courbes par canal + niveaux +
   HSL par bande, repliable (`<details className="adv">`, pattern déjà
   établi ailleurs dans l'appli — Revue/Produire — pas un nouveau
   composant), agit sur le calque sélectionné. Presentational only
   (frontend.md): `onChange` is the one write path, same shape
   `usePhotoEditorAdvanced.ts::updateSelectedSettings` already takes. */
import { useEffect, useId, useState } from 'react'

import { AdjustSlider } from '../../chrome/AdjustSlider'
import { AdjustSection } from './AdjustSection'
import { CurvesEditor } from './CurvesEditor'
import { HSL_BANDS, type HslBandName } from './hslMath'
import { changedCount, neutralPatch, sectionSummary } from './layerSummary'
import type { Layer, LayerSettings } from './photoEditorLayersPixels'

type Channel = 'rgb' | 'r' | 'g' | 'b'

const LEVEL_ROWS: { key: 'levelBlack' | 'levelMid' | 'levelWhite'; label: string }[] = [
  { key: 'levelBlack', label: 'point noir' },
  { key: 'levelMid', label: 'point moyen' },
  { key: 'levelWhite', label: 'point blanc' },
]

const HSL_LABELS: Record<HslBandName, string> = {
  rouges: 'Rouges', jaunes: 'Jaunes', verts: 'Verts', cyans: 'Cyans', bleus: 'Bleus', magentas: 'Magentas',
}

export function AdvancedColorPanel({
  layer, onChange, onCommit,
}: {
  layer: Layer
  onChange: (patch: Partial<LayerSettings>) => void
  onCommit: (patch: Partial<LayerSettings>, label?: string) => void
}) {
  const settings = layer.settings

  return (
    <AdjustSection
      changed={changedCount('color', settings)}
      onReset={() => onCommit(neutralPatch('color', settings), 'Colorimétrie avancée réinitialisée')}
      summary={sectionSummary('color', settings)}
      title="Colorimétrie avancée"
    >
      <div className="flex flex-col gap-[16px]">
        <CurvesEditor
          curves={settings.curves}
          channel={settings.curveChannel as Channel}
          onChannelChange={(channel) => onChange({ curveChannel: channel })}
          onChange={(channel, points) =>
            onChange({ curves: { ...settings.curves, [channel]: points } })
          }
        />

        <div>
          <div className="lab mb-[6px]">Niveaux</div>
          {LEVEL_ROWS.map((row) => (
            <AdjustSlider
              id={`pe-${row.key}`}
              key={row.key}
              label={row.label}
              max={50}
              min={-50}
              onChange={(value) => onChange({ [row.key]: value })}
              onCommit={(value) => onCommit({ [row.key]: value })}
              value={settings[row.key]}
            />
          ))}
        </div>

        <HslBandsTable
          hsl={settings.hsl}
          onChange={(band, patch) => {
            const current = settings.hsl[band] ?? { h: 0, s: 0, l: 0 }
            onChange({ hsl: { ...settings.hsl, [band]: { ...current, ...patch } } })
          }}
        />
      </div>
    </AdjustSection>
  )
}

/** One compact row per band — teinte/saturation/luminance on the SAME
    line (design-pass §7b), a sticky header instead of repeating those 3
    captions 6 times. Fixed-width columns throughout: the exact trap
    `conventions-ux-ui.md`'s own "Alignement du rail" precedent already
    hit (label drift, silent horizontal overflow, a checkbox stealing an
    ancestor's new definite width) in a WIDER aside than this one (380px
    here vs ~458px there) — narrow number fields, no full-width slider,
    by design rather than by oversight. */
function HslBandsTable({
  hsl, onChange,
}: {
  hsl: Partial<Record<HslBandName, { h: number; s: number; l: number }>>
  onChange: (band: HslBandName, patch: Partial<{ h: number; s: number; l: number }>) => void
}) {
  return (
    <div>
      <div className="lab mb-[6px]">HSL par bande</div>
      <div className="sticky top-0 z-[1] flex items-center gap-[4px] bg-panel pb-[4px] text-[10.5px] text-dim2">
        <div className="w-[64px] shrink-0" />
        <span className="w-[46px] shrink-0 text-center">teinte</span>
        <span className="w-[46px] shrink-0 text-center">sat.</span>
        <span className="w-[46px] shrink-0 text-center">lum.</span>
      </div>
      <div className="flex flex-col gap-[2px]">
        {HSL_BANDS.map((band) => {
          const entry = hsl[band] ?? { h: 0, s: 0, l: 0 }
          return (
            <div key={band} className="flex items-center gap-[4px]" data-hsl-band={band}>
              <span className="w-[64px] shrink-0 truncate text-[12px]">{HSL_LABELS[band]}</span>
              <HslField value={entry.h} min={-30} max={30} onCommit={(v) => onChange(band, { h: v })} label={`${HSL_LABELS[band]} teinte`} />
              <HslField value={entry.s} min={-100} max={100} onCommit={(v) => onChange(band, { s: v })} label={`${HSL_LABELS[band]} saturation`} />
              <HslField value={entry.l} min={-100} max={100} onCommit={(v) => onChange(band, { l: v })} label={`${HSL_LABELS[band]} luminance`} />
            </div>
          )
        })}
      </div>
    </div>
  )
}

function HslField({
  value, min, max, onCommit, label,
}: {
  value: number
  min: number
  max: number
  onCommit: (value: number) => void
  label: string
}) {
  const [text, setText] = useState(String(value))
  const id = useId()

  useEffect(() => {
    setText(String(value))
  }, [value])

  return (
    <label className="relative w-[46px] shrink-0" htmlFor={id}>
      <span className="absolute h-px w-px overflow-hidden whitespace-nowrap [clip-path:inset(50%)]">{label}</span>
      <input
        id={id}
        type="number"
        className="w-full !px-[4px] text-center"
        min={min}
        max={max}
        value={text}
        onChange={(event) => {
          setText(event.target.value)
          const parsed = Number(event.target.value)
          if (event.target.value.trim() !== '' && Number.isFinite(parsed)) {
            onCommit(Math.max(min, Math.min(max, parsed)))
          }
        }}
      />
    </label>
  )
}
