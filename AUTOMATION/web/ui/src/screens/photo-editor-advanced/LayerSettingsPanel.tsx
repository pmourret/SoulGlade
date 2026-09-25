/* "Base" — the four adjustments every layer has, first section of the right
   panel and the only one open on arrival (design-pass screen-10 §S5.3).

   The old title « Colorimétrie — {calque} » is gone on purpose: the layer
   being worked on is already named, selected and outlined in the list right
   above, and saying it twice made the panel look like a second selection.

   Presentational only (frontend.md): `onChange` is the coalesced write of a
   drag, `onCommit` the single step of a reset. */
import { AdjustSlider } from '../../chrome/AdjustSlider'
import { AdjustSection } from './AdjustSection'
import { changedCount, neutralPatch, sectionSummary } from './layerSummary'
import { LAYER_SLIDERS, type Layer, type LayerSettings } from './photoEditorLayersPixels'

export function LayerSettingsPanel({
  layer, onChange, onCommit,
}: {
  layer: Layer
  onChange: (patch: Partial<LayerSettings>) => void
  onCommit: (patch: Partial<LayerSettings>, label?: string) => void
}) {
  const settings = layer.settings

  return (
    <AdjustSection
      changed={changedCount('base', settings)}
      defaultOpen
      onReset={() => onCommit(neutralPatch('base', settings), 'Base réinitialisée')}
      summary={sectionSummary('base', settings)}
      title="Base"
    >
      <div className="flex flex-col gap-[2px]">
        {LAYER_SLIDERS.map((slider) => (
          <AdjustSlider
            id={slider.id}
            key={slider.key}
            label={slider.label}
            max={slider.max}
            min={slider.min}
            onChange={(value) => onChange({ [slider.key]: value })}
            onCommit={(value) => onCommit({ [slider.key]: value })}
            step={slider.step}
            value={settings[slider.key]}
          />
        ))}
      </div>
    </AdjustSection>
  )
}
