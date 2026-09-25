/* "Retouche IA — maquettée, volontairement inerte" (design-pass
   screen-photo-editor.md §7b) : panneau complet (sélecteur de masque —
   MÊME composant que le flou sélectif, taille de pinceau, champ prompt),
   mais "Générer la retouche" reste PERMANENTMENT désactivé. Aucun appel
   réseau, aucun faux résultat.

   LE MOTIF EST ÉCRIT, pas seulement suggéré (screen-10 §S5.3 et la règle
   d'a11y qui va avec) : il vit en toutes lettres sous le bouton, EN PLUS
   du `data-hint-text` que la fumigation lit — un motif qui n'existe que
   dans une infobulle n'existe pas pour qui n'a pas de pointeur.
   Presentational only (frontend.md). */
import { AdjustSlider } from '../../chrome/AdjustSlider'
import { AdjustSection } from './AdjustSection'
import { changedCount, neutralPatch, sectionSummary } from './layerSummary'
import { DEFAULT_MASK, MaskPicker } from './MaskPicker'
import type { Layer, LayerSettings, Mask } from './photoEditorLayersPixels'

const RAISON_INERTE =
  "Backend d'édition IA pas encore branché (F5.2) — l'interface est prête à recevoir le résultat"

export function AiRetouchPanel({
  layer, onChange, onCommit, editingMask, onToggleMaskEdit,
}: {
  layer: Layer
  onChange: (patch: Partial<LayerSettings>) => void
  onCommit: (patch: Partial<LayerSettings>, label?: string) => void
  editingMask: boolean
  onToggleMaskEdit: () => void
}) {
  const settings = layer.settings
  const mask = settings.aiMask ?? DEFAULT_MASK

  return (
    <AdjustSection
      changed={changedCount('ai', settings)}
      onReset={() => onCommit(neutralPatch('ai', settings), 'Retouche IA réinitialisée')}
      summary={sectionSummary('ai', settings)}
      title={
        <>
          Retouche IA{' '}
          <span className="ml-[4px] rounded-[4px] border border-dashed border-line2 px-[6px]
                           py-[1px] align-middle text-[10.5px] font-normal text-dim">
            bientôt
          </span>
        </>
      }
    >
      <div className="flex flex-col gap-[14px]">
        <MaskPicker
          editing={editingMask}
          mask={mask}
          onChange={(next: Mask) => onChange({ aiMask: next })}
          onToggleEditing={onToggleMaskEdit}
          radiusId="pe-ai-brush-radius"
        />

        <AdjustSlider
          id="pe-ai-brush"
          label="pinceau IA"
          max={30}
          min={1}
          onChange={(value) => onChange({ aiBrushSize: value / 100 })}
          onCommit={(value) => onCommit({ aiBrushSize: value / 100 })}
          value={Math.round(settings.aiBrushSize * 100)}
        />

        <div>
          <label className="mb-[4px] block text-[12.5px] text-dim" htmlFor="pe-ai-prompt">
            instruction
          </label>
          <textarea
            className="w-full resize-none"
            id="pe-ai-prompt"
            onChange={(e) => onChange({ aiPrompt: e.target.value })}
            placeholder="ex : retirer la tache sur le mur"
            rows={3}
            value={settings.aiPrompt}
          />
        </div>

        <div>
          <button
            className="btn primary sm w-full"
            data-hint-text={RAISON_INERTE}
            disabled
            type="button"
          >
            Générer la retouche
          </button>
          <p className="tiny mt-[6px] text-dim2">{RAISON_INERTE}</p>
        </div>
      </div>
    </AdjustSection>
  )
}
