/* The 340 px column of the selected asset (IT-10 chantier 5) — purely
   presentational: it receives what it shows and the callbacks that act
   (frontend.md, a sub-component never calls the API).

   WHAT IT MUST SAY, and the reason the workshop exists at all: the fragment
   the asset puts in a prompt, in full, and where the asset comes from. An
   atelier that hides the text it injects is the exact defect IT-10 was opened
   on (`PROJET.md`, règle 2 amendée le 25/09).

   THE FRAGMENT IS A PROPOSAL. The vision model wrote it and it is sometimes
   wrong; it is an ordinary editable field, and « Analyser l'image » rewrites
   it on demand — never in the background, never over an edit in progress.

   THE SHAPE OF ITS SIBLINGS (design-pass screen-assets §S6): a 48 px head, a
   body that scrolls, a 52 px foot with the verbs — the Lights and Outfits
   inspectors. « Analyser l'image » sits beside « Améliorer », on the fragment
   it rewrites, and not among the foot's verbs where it read as a third way
   to save. */
import type { EnhanceKind, Enhancer } from '../../../api/useEnhance'
import { EnhanceControl } from '../../../chrome/EnhanceControl'
import { useEffect, useState } from 'react'

import { proposeSlot, slotOf } from '../outfits/outfitSlots'
import type { AssetClass, AssetEntry } from './useAssetLibrary'
import { classLabel } from './useAssetLibrary'

const LAYER: Record<string, { label: string; hint: string }> = {
  monde: {
    label: 'Du monde',
    hint: "Livré par le monde : tous ses personnages l'ont. L'ajuster ici ne change rien pour eux.",
  },
  surcharge: {
    label: 'Ajusté ici',
    hint: "Du monde, ajusté pour ce personnage. Le monde fournit toujours ce qui n'a pas été ajusté.",
  },
  personnage: {
    label: 'Propre au personnage',
    hint: 'Importé pour ce personnage : lui seul le voit.',
  },
}

/* The kind of a fragment follows the scene field its class lands in, never
   the class's own name (invariant 7): a class with no destination — a
   reference — has nothing to improve for. */
const ENHANCE_BY_FIELD: Record<string, EnhanceKind | undefined> = { wardrobe: 'outfit', prompt: 'place' }

export function AssetInspector({
  asset, classes, busy, comfy, src, onSave, onAnalyse, onDelete, onClose,
  enhancer,
}: {
  asset: AssetEntry
  classes: AssetClass[]
  busy: boolean
  /** Sonde ComfyUI : l'analyse en dépend, et un bouton qui invite à un échec
      évitable est ce que la banque de poses désactive déjà en disant pourquoi. */
  comfy: boolean
  src: string
  onSave: (fields: { label?: string; fragment?: string }, auMonde: boolean) => void
  onAnalyse: () => void
  onDelete: () => void
  /** The drawer's close button, under 1100 px; absent in the column. */
  onClose?: () => void
  /** « Améliorer » on the fragment, for a class that lands in a scene field. */
  enhancer: Enhancer
}) {
  const [label, setLabel] = useState(asset.label ?? '')
  const [fragment, setFragment] = useState(asset.fragment ?? '')
  const field = classes.find((c) => c.key === asset.classe)?.champ ?? ''
  const enhanceKind = ENHANCE_BY_FIELD[field]
  /* Only offered on an asset the world owns — and OFF by default: the common
     gesture is adjusting it here, correcting the world is the deliberate one. */
  const [toWorld, setToWorld] = useState(false)
  const fromWorld = asset.couche !== 'personnage'

  // A new selection must not carry the previous asset's draft.
  useEffect(() => {
    setLabel(asset.label ?? '')
    setFragment(asset.fragment ?? '')
    setToWorld(false)
  }, [asset.key, asset.label, asset.fragment])

  const dirty = label.trim() !== (asset.label ?? '') || fragment.trim() !== (asset.fragment ?? '')
  const layer = LAYER[asset.couche] ?? LAYER.personnage
  /* Where the fragment would go in an outfit — by the FIELD the class feeds,
     never by the class's name (invariant 7). Read on the draft, so it follows
     the text being corrected. */
  const proposed = field === 'wardrobe' ? proposeSlot(fragment) : null

  return (
    <div className="flex h-full min-h-0 flex-col" id="assetInspector">
      <div className="flex h-[48px] flex-none items-center gap-[8px] border-b border-b-line px-[14px]">
        <h2 className="m-0 min-w-0 flex-1 truncate text-[14px] font-[650]">{asset.label || asset.key}</h2>
        <span className="flex-none rounded-pill border border-line px-[7px] py-[2px] text-[11.5px] text-dim2"
              data-asset-layer data-hint-text={layer.hint}>
          {layer.label}
        </span>
        {onClose && (
          <button
            type="button"
            className="flex-none border-0 bg-transparent px-[4px] text-[16px] text-dim hover:text-txt"
            aria-label="Fermer la fiche"
            onClick={onClose}
          >
            ×
          </button>
        )}
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-[12px] overflow-y-auto p-[14px]">
        <img className="h-[220px] w-full flex-none rounded-card bg-black object-contain" src={src}
             alt={asset.label || asset.key} />

        <div className="flex flex-col gap-[4px]">
          <label className="lab" htmlFor="assetLabel">Libellé</label>
          <input
            id="assetLabel"
            className="w-full text-[13px]"
            value={label}
            disabled={busy}
            onChange={(event) => setLabel(event.target.value)}
          />
        </div>

        <div className="flex flex-col gap-[4px]">
          <label className="lab" htmlFor="assetFragment">Fragment de prompt</label>
          <textarea
            id="assetFragment"
            className="min-h-[92px] w-full font-code text-[12px]"
            value={fragment}
            disabled={busy}
            placeholder="aucun fragment — « Analyser l'image » en propose un"
            onChange={(event) => setFragment(event.target.value)}
          />
          <div className="flex flex-wrap items-start gap-[6px]">
            {enhanceKind && (
              <EnhanceControl
                label="Fragment de prompt"
                kind={enhanceKind}
                value={fragment}
                onApply={setFragment}
                enhancer={enhancer}
                disabled={busy}
              />
            )}
            {/* Le repère porte sur l'ENVELOPPE : un bouton désactivé n'émet
                aucun événement de souris, donc l'état où la lecture compte est
                précisément celui où elle ne s'afficherait pas (même note que la
                banque de poses). */}
            <span className="mt-[6px]" data-hint-text={comfy ? undefined : 'nécessite ComfyUI en ligne'}>
              <button
                type="button"
                className="btn sm"
                id="btnAssetAnalyse"
                disabled={busy || !comfy}
                onClick={onAnalyse}
              >
                Analyser l'image
              </button>
            </span>
          </div>
          <span className="tiny">
            Ce que l'asset ajoute au prompt. Proposé par le modèle local, corrigeable ici.
          </span>
        </div>

        <dl className="m-0 grid grid-cols-[96px_minmax(0,1fr)] gap-x-[10px] gap-y-[6px] text-[12.5px]">
          <dt className="text-dim2">Classe</dt>
          <dd className="m-0">{classLabel(classes, asset.classe)} · fixée à l'import</dd>
          {field === 'wardrobe' && (
            <>
              <dt className="text-dim2">Dans une tenue</dt>
              <dd className="m-0">
                {proposed ? (
                  <>
                    {slotOf(proposed.slot)?.label ?? proposed.slot}{' '}
                    <span className="text-dim2">· « {proposed.word} »</span>
                  </>
                ) : (
                  <span className="text-dim2">aucun emplacement proposé</span>
                )}
              </dd>
            </>
          )}
          <dt className="text-dim2">Fichier</dt>
          <dd className="m-0 truncate font-code text-[12px]" title={asset.fichier ?? ''}>{asset.fichier}</dd>
        </dl>

        {fromWorld && (
          <label className="flex items-center gap-[6px] text-[12px]" htmlFor="assetToWorld">
            <input
              id="assetToWorld"
              type="checkbox"
              className="w-auto"
              checked={toWorld}
              disabled={busy}
              onChange={(event) => setToWorld(event.target.checked)}
            />
            Corriger dans le monde, pour tous ses personnages
          </label>
        )}
      </div>

      <div className="flex h-[52px] flex-none items-center gap-[6px] border-t border-t-line px-[14px]">
        <button
          type="button"
          className="btn primary sm"
          id="btnAssetSave"
          disabled={busy || !dirty}
          onClick={() => onSave({ label: label.trim(), fragment: fragment.trim() }, toWorld)}
        >
          Enregistrer
        </button>
        <button type="button" className="btn sm" id="btnAssetDelete" disabled={busy} onClick={onDelete}>
          {asset.couche === 'surcharge' ? 'Rendre au monde' : 'Retirer'}
        </button>
        <span className={`ml-auto text-[12px] ${dirty ? 'text-warn-txt' : 'text-dim2'}`}>
          {dirty ? 'modifié' : 'à jour'}
        </span>
      </div>
    </div>
  )
}
