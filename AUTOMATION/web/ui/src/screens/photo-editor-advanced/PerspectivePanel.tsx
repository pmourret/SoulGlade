/* "Déformation de perspective" — design-pass §7b: perspective horizontale
   et verticale SEULEMENT, le ratio et le redressement fin restant dans le
   modal simplifié (7a), volontairement pas dupliqués ici. Repliable via
   `AdjustSection` (screen-10 §S5.3).

   RENOMMÉE le 25/09/2026 sur le retour de Pierre. Elle s'appelait
   « Recadrage avancé », ce qui annonçait un cadre à poser alors qu'elle
   déforme : elle bascule les plans de l'image et laisse les coins vides.
   Un nom qui promet un recadrage à côté d'un panneau de recadrage qui,
   lui, en est un, envoie chercher ici ce qui se règle là-bas.

   Presentational only (frontend.md): `onChange` is the one write path. */
import { AdjustSlider } from '../../chrome/AdjustSlider'
import { AdjustSection } from './AdjustSection'
import { changedCount, neutralPatch, sectionSummary } from './layerSummary'
import type { Layer, LayerSettings } from './photoEditorLayersPixels'

const ROWS: { key: 'perspH' | 'perspV'; label: string }[] = [
  { key: 'perspH', label: 'horizontale' },
  { key: 'perspV', label: 'verticale' },
]

export function PerspectivePanel({
  layer, onChange, onCommit,
}: {
  layer: Layer
  onChange: (patch: Partial<LayerSettings>) => void
  onCommit: (patch: Partial<LayerSettings>, label?: string) => void
}) {
  const settings = layer.settings

  return (
    <AdjustSection
      changed={changedCount('perspective', settings)}
      onReset={() => onCommit(neutralPatch('perspective', settings), 'Perspective réinitialisée')}
      summary={sectionSummary('perspective', settings)}
      title="Déformation de perspective"
    >
      <div className="flex flex-col gap-[2px]">
        {ROWS.map((row) => (
          <AdjustSlider
            id={`pe-${row.key}`}
            key={row.key}
            label={row.label}
            max={30}
            min={-30}
            onChange={(value) => onChange({ [row.key]: value })}
            onCommit={(value) => onCommit({ [row.key]: value })}
            suffix="°"
            value={settings[row.key]}
          />
        ))}
        {(settings.perspH !== 0 || settings.perspV !== 0) && (
          <p className="tiny mt-[6px] opacity-70">
            les coins hors du cadre corrigé restent transparents — pas de recadrage automatique.
          </p>
        )}
      </div>
    </AdjustSection>
  )
}
