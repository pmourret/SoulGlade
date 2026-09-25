/* "Netteté / flou sélectif" — design-pass §7b, restyled by screen-10 §S5.3
   (foldable header carrying its own summary and reset). Presentational only
   (frontend.md): `onChange` writes settings, `editing`/`onToggleMaskEdit`
   are lifted to the Screen because on-canvas mask placement needs the
   preview canvas, which this panel does not own. */
import { AdjustSlider } from '../../chrome/AdjustSlider'
import { AdjustSection } from './AdjustSection'
import { changedCount, neutralPatch, sectionSummary } from './layerSummary'
import { DEFAULT_MASK, MaskPicker } from './MaskPicker'
import type { Layer, LayerSettings, Mask } from './photoEditorLayersPixels'

export function SharpenBlurPanel({
  layer, onChange, onCommit, editingMask, onToggleMaskEdit,
}: {
  layer: Layer
  onChange: (patch: Partial<LayerSettings>) => void
  onCommit: (patch: Partial<LayerSettings>, label?: string) => void
  editingMask: boolean
  onToggleMaskEdit: () => void
}) {
  const settings = layer.settings
  const mask = settings.blurMask ?? DEFAULT_MASK

  return (
    <AdjustSection
      changed={changedCount('sharpen', settings)}
      onReset={() => onCommit(neutralPatch('sharpen', settings), 'Netteté et flou réinitialisés')}
      summary={sectionSummary('sharpen', settings)}
      title="Netteté / flou sélectif"
    >
      <div className="flex flex-col gap-[10px]">
        <AdjustSlider
          id="pe-sharpen"
          label="netteté"
          max={100}
          min={0}
          onChange={(value) => onChange({ sharpen: value })}
          onCommit={(value) => onCommit({ sharpen: value })}
          value={settings.sharpen}
        />

        <div>
          <label className="flex items-center gap-[6px] text-[12.5px]">
            <input
              checked={settings.blurOn}
              className="w-auto shrink-0"
              onChange={(e) => onChange({ blurOn: e.target.checked, blurMask: settings.blurMask ?? DEFAULT_MASK })}
              type="checkbox"
            />
            flou sélectif
          </label>
          {settings.blurOn && (
            <div className="mt-[6px] flex flex-col gap-[10px]">
              {/* No neutral mark on either (§S6, last line): a radius and a
                  strength have nothing to come back to, so they fill from
                  the left like the progress they are. */}
              <AdjustSlider
                id="pe-blur-radius"
                label="rayon"
                max={20}
                min={1}
                onChange={(value) => onChange({ blurRadius: value / 100 })}
                onCommit={(value) => onCommit({ blurRadius: value / 100 })}
                value={Math.round(settings.blurRadius * 100)}
              />
              <AdjustSlider
                id="pe-blur-strength"
                label="force"
                max={100}
                min={0}
                onChange={(value) => onChange({ blurStrength: value })}
                onCommit={(value) => onCommit({ blurStrength: value })}
                value={settings.blurStrength}
              />
              <MaskPicker
                editing={editingMask}
                mask={mask}
                onChange={(next: Mask) => onChange({ blurMask: next })}
                onToggleEditing={onToggleMaskEdit}
                radiusId="pe-blur-brush"
              />
            </div>
          )}
        </div>
      </div>
    </AdjustSection>
  )
}
