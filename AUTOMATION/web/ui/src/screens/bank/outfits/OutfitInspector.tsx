/* The 340 px column of the selected outfit (IT-10 chantier 6) — purely
   presentational: it receives what it shows and the callbacks that act
   (frontend.md, a sub-component never calls the API).

   WHAT IT MUST SAY: the text a scene that wears this outfit receives, IN FULL,
   and where the outfit comes from. An atelier that hides the text it injects
   is the defect IT-10 was opened on.

   PIECES, NOT A PARAGRAPH. A piece is written text or a garment of the asset
   library; the asset piece reads its fragment when the scene is launched, so
   correcting the asset corrects every outfit that wears it. The order of the
   pieces is the order of the prompt. */
import type { Enhancer } from '../../../api/useEnhance'
import { EnhanceControl } from '../../../chrome/EnhanceControl'
import { useEffect, useState } from 'react'

import type { LibraryPick } from '../assets/libraryPicks'
import { draftText } from './outfitText'
import type { OutfitEntry, OutfitPiece } from './useOutfits'

const LAYER: Record<string, { label: string; hint: string }> = {
  monde: {
    label: 'Du monde',
    hint: "Livrée par le monde : tous ses personnages l'ont. L'ajuster ici ne change rien pour eux.",
  },
  surcharge: {
    label: 'Ajustée ici',
    hint: "Du monde, ajustée pour ce personnage. Le monde fournit toujours ce qui n'a pas été ajusté.",
  },
  personnage: {
    label: 'Propre au personnage',
    hint: 'Créée pour ce personnage : lui seul la voit.',
  },
}

const samePieces = (a: OutfitPiece[], b: OutfitPiece[]) =>
  JSON.stringify(a.map((p) => [p.asset ?? '', (p.text ?? '').trim()])) ===
  JSON.stringify(b.map((p) => [p.asset ?? '', (p.text ?? '').trim()]))

export function OutfitInspector({
  outfit, garments, busy, worldLabel, onSave, onCreate, onDelete,
  enhancer,
}: {
  /** `null` = a new outfit, not yet written anywhere. */
  outfit: OutfitEntry | null
  /** The garments of the asset library, the only class a piece may be. */
  garments: LibraryPick[]
  busy: boolean
  /** The character's world, `null` when it has none: a new outfit can then
      only be the character's. */
  worldLabel: string | null
  onSave: (fields: { label: string; pieces: OutfitPiece[] }, toWorld: boolean) => void
  onCreate: (label: string, pieces: OutfitPiece[], toWorld: boolean) => void
  onDelete: () => void
  /** « Améliorer » on the piece being written (IT-10 chantier 8). */
  enhancer: Enhancer
}) {
  const [label, setLabel] = useState(outfit?.label ?? '')
  const [pieces, setPieces] = useState<OutfitPiece[]>(outfit?.pieces ?? [])
  const [written, setWritten] = useState('')
  /* On a world outfit: correct the world rather than adjust it here. On a new
     outfit: create it in the world. OFF by default both ways — the world is
     inherited by every character in it. */
  const [toWorld, setToWorld] = useState(false)

  // A new selection must not carry the previous outfit's draft.
  useEffect(() => {
    setLabel(outfit?.label ?? '')
    setPieces(outfit?.pieces ?? [])
    setWritten('')
    setToWorld(false)
  }, [outfit?.key, outfit?.label, outfit?.pieces])

  const isNew = outfit === null
  const layer = LAYER[outfit?.couche ?? 'personnage'] ?? LAYER.personnage
  const dirty = isNew
    ? Boolean(label.trim() || pieces.length)
    : label.trim() !== (outfit.label ?? '') || !samePieces(pieces, outfit.pieces ?? [])
  const preview = draftText(pieces, garments)
  const byKey = new Map(garments.map((g) => [g.key, g]))

  const move = (index: number, delta: number) => {
    const next = [...pieces]
    const [piece] = next.splice(index, 1)
    next.splice(index + delta, 0, piece)
    setPieces(next)
  }
  const addWritten = () => {
    if (!written.trim()) return
    setPieces([...pieces, { text: written.trim() }])
    setWritten('')
  }
  const submit = () => {
    const clean = pieces.filter((p) => p.asset || (p.text ?? '').trim())
    if (isNew) onCreate(label.trim(), clean, toWorld)
    else onSave({ label: label.trim(), pieces: clean }, toWorld)
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-[12px] overflow-y-auto p-[14px]" id="outfitInspector">
      {isNew ? (
        <p className="m-0 text-[12px] text-dim2">
          Nouvelle tenue. Elle se pose ensuite dans une scène, onglet Vêtements, à un niveau.
        </p>
      ) : (
        <>
          <div className="flex items-center gap-[6px] text-[12px] text-dim2">
            <span className="rounded-pill border border-line px-[7px] py-[2px]" data-outfit-layer>
              {layer.label}
            </span>
          </div>
          <p className="m-0 text-[12px] text-dim2">{layer.hint}</p>
        </>
      )}

      <div className="flex flex-col gap-[4px]">
        <label className="lab" htmlFor="outfitLabel">Libellé</label>
        <input
          id="outfitLabel"
          className="w-full text-[13px]"
          value={label}
          placeholder="Tenue de ville"
          disabled={busy}
          onChange={(event) => setLabel(event.target.value)}
        />
      </div>

      <div className="flex flex-col gap-[6px]">
        <span className="lab">Pièces, dans l'ordre du prompt</span>
        {pieces.length === 0 && (
          <span className="text-[12px] text-dim2">aucune pièce — en écrire une, ou en choisir une ci-dessous</span>
        )}
        <ol className="m-0 flex list-none flex-col gap-[5px] p-0" id="outfitPieces">
          {pieces.map((piece, index) => {
            const garment = piece.asset ? byKey.get(piece.asset) : undefined
            return (
              <li
                key={`${piece.asset ?? 't'}-${index}`}
                className="flex items-center gap-[6px] rounded-[6px] border border-line2 p-[5px]"
                data-piece-kind={piece.asset ? 'asset' : 'text'}
              >
                {piece.asset ? (
                  <>
                    {garment ? (
                      <img
                        className="h-[34px] w-[34px] flex-none rounded-[5px] object-cover"
                        src={garment.src}
                        alt=""
                      />
                    ) : null}
                    <span className="min-w-0 flex-1 text-[12px]">
                      <b className="block truncate font-medium">{garment?.label ?? piece.asset}</b>
                      <span className={garment?.fragment ? 'text-dim' : 'text-warn-txt'}>
                        {garment
                          ? garment.fragment || 'sans fragment — à analyser dans Assets'
                          : 'asset introuvable'}
                      </span>
                    </span>
                  </>
                ) : (
                  <>
                    <label className="sr-only" htmlFor={`outfitPiece-${index}`}>
                      pièce {index + 1}
                    </label>
                    <input
                      id={`outfitPiece-${index}`}
                      className="min-w-0 flex-1 text-[12.5px]"
                      value={piece.text ?? ''}
                      disabled={busy}
                      onChange={(event) =>
                        setPieces(pieces.map((p, i) => (i === index ? { text: event.target.value } : p)))
                      }
                    />
                  </>
                )}
                <PieceButton
                  label={`Monter la pièce ${index + 1}`}
                  disabled={busy || index === 0}
                  onClick={() => move(index, -1)}
                >
                  ↑
                </PieceButton>
                <PieceButton
                  label={`Descendre la pièce ${index + 1}`}
                  disabled={busy || index === pieces.length - 1}
                  onClick={() => move(index, 1)}
                >
                  ↓
                </PieceButton>
                <PieceButton
                  label={`Retirer la pièce ${index + 1}`}
                  disabled={busy}
                  onClick={() => setPieces(pieces.filter((_, i) => i !== index))}
                >
                  ×
                </PieceButton>
              </li>
            )
          })}
        </ol>

        <div className="flex gap-[6px]">
          <label className="sr-only" htmlFor="outfitWritten">pièce écrite</label>
          <input
            id="outfitWritten"
            className="min-w-0 flex-1 text-[12.5px]"
            placeholder="light blue denim jeans"
            value={written}
            disabled={busy}
            onChange={(event) => setWritten(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                addWritten()
              }
            }}
          />
          <button type="button" className="btn sm" disabled={busy || !written.trim()} onClick={addWritten}>
            Ajouter
          </button>
        </div>
        <EnhanceControl
          label="pièce écrite"
          kind="outfit"
          value={written}
          onApply={setWritten}
          enhancer={enhancer}
          disabled={busy}
        />

        {garments.length > 0 && (
          <div className="flex flex-col gap-[4px]">
            <span className="text-[11.5px] text-dim2">Depuis les assets — vêtements</span>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(60px,1fr))] gap-[5px]" id="outfitGarments">
              {garments.map((garment) => (
                <button
                  key={garment.key}
                  type="button"
                  className="flex cursor-pointer flex-col gap-[3px] rounded-card border border-line2
                             bg-transparent p-[4px] text-left hover:border-dim2 focus-visible:outline-2
                             focus-visible:outline-focus focus-visible:outline-offset-2
                             disabled:cursor-not-allowed disabled:opacity-60"
                  data-garment={garment.key}
                  disabled={busy || !garment.fragment}
                  aria-label={
                    garment.fragment
                      ? `Ajouter « ${garment.label} » à la tenue`
                      : `« ${garment.label} » n'a pas encore de fragment : l'analyser dans Assets`
                  }
                  onClick={() => setPieces([...pieces, { asset: garment.key }])}
                >
                  <img className="aspect-square w-full rounded-[5px] object-cover" src={garment.src} alt="" />
                  <span className="line-clamp-2 text-[10.5px] leading-tight text-dim">{garment.label}</span>
                  {!garment.fragment && (
                    <span className="text-[9.5px] leading-tight text-warn-txt">sans fragment</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Ce que la scène reçoit, EN ENTIER — le texte de ce brouillon, calculé
          par la même règle que le serveur, puis celui que le serveur a résolu
          une fois enregistré. */}
      <div className="flex flex-col gap-[4px]">
        <span className="lab">Ce que la scène reçoit</span>
        <p
          className={`m-0 rounded-card border p-[8px] font-code text-[12px] ${
            preview.problem ? 'border-warn-line bg-warn-bg text-warn-txt' : 'border-line text-txt'
          }`}
          id="outfitText"
        >
          {preview.problem ? preview.problem : `wearing ${preview.text}`}
        </p>
        <span className="text-[11.5px] text-dim2">
          Ajouté au prompt au niveau où la scène pose la tenue. Une pièce venue des assets suit
          les corrections de son fragment.
        </span>
      </div>

      {(isNew ? worldLabel !== null : outfit.couche !== 'personnage') && (
        <label className="flex items-center gap-[6px] text-[12px]" htmlFor="outfitToWorld">
          <input
            id="outfitToWorld"
            type="checkbox"
            className="w-auto"
            checked={toWorld}
            disabled={busy}
            onChange={(event) => setToWorld(event.target.checked)}
          />
          {isNew
            ? `Créer dans le monde ${worldLabel}, pour tous ses personnages`
            : 'Corriger dans le monde, pour tous ses personnages'}
        </label>
      )}

      <div className="flex flex-wrap gap-[6px]">
        <button
          type="button"
          className="btn primary sm"
          id="btnOutfitSave"
          disabled={busy || !dirty || !label.trim() || Boolean(preview.problem)}
          onClick={submit}
        >
          {isNew ? 'Créer la tenue' : 'Enregistrer'}
        </button>
        {!isNew && (
          <button type="button" className="btn sm" id="btnOutfitDelete" disabled={busy} onClick={onDelete}>
            {outfit.couche === 'surcharge' ? 'Rendre au monde' : 'Retirer'}
          </button>
        )}
      </div>
    </div>
  )
}

function PieceButton({
  label, disabled, onClick, children,
}: {
  label: string
  disabled: boolean
  onClick: () => void
  children: string
}) {
  return (
    <button
      type="button"
      className="flex-none cursor-pointer rounded-[6px] border-0 bg-transparent px-[5px] text-[14px]
                 leading-none text-dim2 hover:text-txt focus-visible:outline-2 focus-visible:outline-focus
                 focus-visible:outline-offset-2 disabled:cursor-default disabled:opacity-40"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  )
}
