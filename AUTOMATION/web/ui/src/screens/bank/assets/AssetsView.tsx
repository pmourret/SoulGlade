/* The asset library — the fourth sub-view of the Atelier (IT-10 chantier 5).

   WHAT AN ASSET IS HERE: an image the user brings in, a class that says what
   it is for, and the prompt fragment the local vision model read on it. The
   fragment is what the composer uses today; the file is kept for the day a
   graph can graft it (`DOCS/cadrage/2026-09-26-it10-c5-importeur-assets.md`).

   THE SHAPE IS THE POSE BANK'S, deliberately: the same workshop bar handed
   down by `BankScreen`, the same drop target over the list, the same 340 px
   inspector that becomes a drawer under 1100 px. Two workshops that import a
   file and then edit what came out of it should not be learnt twice.

   A GRID AND NOT A TABLE, which is the one departure: a garment or a décor is
   recognised by its image, where a skeleton is recognised by its label and
   its usage count. */
import { useEnhancer } from '../../../api/useEnhance'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'

import { useChrome } from '../../../chrome/ChromeContext'
import { useConfirm } from '../../../chrome/ConfirmContext'
import { Icon } from '../../../chrome/Icon'
import { useToast } from '../../../chrome/ToastContext'
import { useApi } from '../../../api/useApi'
import { useScenes } from '../../../state/ScenesStoreContext'
import { useSystemState } from '../../../state/SystemStateContext'
import { useOverlayPanel } from '../../produce/useOverlayPanel'
import { useFileDrop } from '../useFileDrop'
import { AssetInspector } from './AssetInspector'
import { classLabel, useAssetLibrary, type AssetEntry } from './useAssetLibrary'

/* Said where the file is chosen, and it is not decoration: unlike the pose
   extraction next door, the file IS kept here — INPUTS/ASSETS/, out of git.
   The person handing over an image is the one who needs to know which of the
   two workshops they are in. */
const KEPT_HINT =
  "L'image est gardée dans la bibliothèque (INPUTS/ASSETS/, hors dépôt) — c'est ce qui la rend réutilisable d'une scène à l'autre"

export function AssetsView({ nav }: { nav: ReactNode }) {
  const enhancer = useEnhancer()
  const api = useApi()
  const toast = useToast()
  const confirm = useConfirm()
  const { narrow } = useChrome()
  const { world } = useScenes()
  const { state } = useSystemState()
  /* L'import marche sans ComfyUI — c'est la règle du cadrage. Ce qui ne
     marche pas, c'est la LECTURE de l'image : la promesse doit donc suivre
     la sonde, ici comme dans l'inspecteur. */
  const comfy = Boolean(state?.comfy)
  const { assets, classes, loaded, busyKeys, importFile, analyse, save, remove } =
    useAssetLibrary()

  const fileInput = useRef<HTMLInputElement | null>(null)
  const [classe, setClasse] = useState('vetement')
  const [owner, setOwner] = useState<'personnage' | 'monde'>('personnage')
  const [filter, setFilter] = useState('all')
  const [busy, setBusy] = useState(false)
  const [pendingFile, setPendingFile] = useState('')
  const [selected, setSelected] = useState<string | null>(null)

  const rows = useMemo(
    () => (filter === 'all' ? assets : assets.filter((a) => a.classe === filter)),
    [assets, filter],
  )
  const selectedAsset = assets.find((a) => a.key === selected) ?? null

  /* An asset can leave the filtered list under the selection — a class
     filter, its own removal. The inspector then shows what the grid no
     longer holds, so the selection is dropped rather than frozen. */
  useEffect(() => {
    if (selected && !rows.some((a) => a.key === selected)) setSelected(null)
  }, [rows, selected])

  const drawerRef = useRef<HTMLDivElement | null>(null)
  useOverlayPanel(narrow && Boolean(selectedAsset), () => setSelected(null), drawerRef)

  /** THE single upload path — the button and the drop target both land here. */
  const bringIn = async (file: File) => {
    setBusy(true)
    setPendingFile(file.name)
    try {
      const result = await importFile(file, classe, owner === 'monde')
      if (!result.ok) {
        toast(result.erreur || 'échec')
        return
      }
      /* Le toast lit l'asset QUE LE SERVEUR VIENT D'ÉCRIRE, pas la liste : à
         cet instant `assets` est encore celle d'avant l'import, et l'audit du
         26/09 a mesuré un « asset importé » sec sur un asset que la carte
         disait « sans fragment » — l'outil cachant une part de ce qu'il fait,
         le défaut fondateur d'IT-10. */
      if (result.asset) setSelected(result.asset.key)
      toast(result.asset && !result.asset.fragment
        ? 'asset importé — sans fragment, à analyser'
        : 'asset importé')
    } finally {
      setBusy(false)
      setPendingFile('')
      // Same file twice in a row must re-fire `change`.
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  const drop = useFileDrop({ enabled: !busy, extract: bringIn, onRefused: toast })

  const onDelete = async (asset: AssetEntry) => {
    const adjusted = asset.couche === 'surcharge'
    const ok = await confirm({
      title: adjusted ? 'Rendre cet asset au monde ?' : 'Retirer cet asset ?',
      button: adjusted ? 'Rendre au monde' : 'Retirer',
      danger: !adjusted,
      body: adjusted ? (
        <p>
          Le libellé et le fragment ajustés ici sont effacés ; <b>{asset.label || asset.key}</b>{' '}
          revient à ce que le monde en dit. L'image ne bouge pas.
        </p>
      ) : (
        <p>
          <b>{asset.label || asset.key}</b> et son image quittent{' '}
          {asset.couche === 'monde' ? 'le monde — tous ses personnages le perdent' : 'la bibliothèque'}.
          Une scène qui a déjà repris son fragment le garde : le texte est copié, pas lié.
        </p>
      ),
    })
    if (!ok) return
    const result = await remove(asset.key)
    toast(result.ok ? (adjusted ? 'rendu au monde' : 'asset retiré') : result.erreur)
  }

  const onAnalyse = async (key: string) => {
    const result = await analyse(key)
    toast(result.ok ? 'fragment réécrit depuis l’image' : result.erreur)
  }

  const onSave = async (key: string, fields: { label?: string; fragment?: string }, toWorld: boolean) => {
    const result = await save(key, fields, toWorld)
    toast(result.ok ? 'asset enregistré' : result.erreur)
  }

  return (
    <div className="flex h-full min-h-0 flex-col" id="bankAssets">
      {/* ONE 48 px row, like the three other sub-views: the shared nav, what
          the library is, then the controls of an import. Every control is
          `flex-none` and the sentence is the only thing that gives. */}
      <div className="flex h-[48px] flex-none items-center gap-[10px] border-b border-b-line px-[16px]
                      [&>*]:whitespace-nowrap">
        {nav}

        <span className="min-w-0 flex-1 truncate text-[12.5px] text-dim2 max-[1280px]:hidden">
          <span id="nAssets">{assets.length}</span> asset{assets.length > 1 ? 's' : ''} ·
          image et fragment de prompt, du monde et de ce personnage
        </span>

        <div className="flex-none">
          <label className="sr-only" htmlFor="assetFilter">classe affichée</label>
          <select
            id="assetFilter"
            className="w-[168px]"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
          >
            <option value="all">Toutes les classes</option>
            {classes.map((c) => (
              <option key={c.key} value={c.key}>{c.label}</option>
            ))}
          </select>
        </div>

        <div className="flex-none">
          <label className="sr-only" htmlFor="assetClass">classe de l'import</label>
          <select
            id="assetClass"
            className="w-[168px]"
            value={classe}
            onChange={(event) => setClasse(event.target.value)}
          >
            {classes.map((c) => (
              <option key={c.key} value={c.key}>Importer : {c.label}</option>
            ))}
          </select>
        </div>

        {/* The owner is chosen BEFORE the import and not after: it decides
            which catalog the record is written to, and a world asset is
            inherited by every character of that world. */}
        <div className="flex-none">
          <label className="sr-only" htmlFor="assetOwner">propriétaire de l'import</label>
          <select
            id="assetOwner"
            className="w-[186px]"
            value={owner}
            disabled={!world}
            onChange={(event) => setOwner(event.target.value as 'personnage' | 'monde')}
          >
            <option value="personnage">Pour ce personnage</option>
            <option value="monde">Pour le monde{world ? ` ${world.label}` : ''}</option>
          </select>
        </div>

        {/* Hidden input, no `<label htmlFor>`: it is the browser's dialog
            behind the button, not a control one can reach (same note as the
            pose bank's own file input). */}
        <input
          type="file"
          id="assetFile"
          accept="image/png,image/jpeg,image/webp"
          hidden
          ref={fileInput}
          onChange={() => {
            const file = fileInput.current?.files?.[0]
            if (file) void bringIn(file)
          }}
        />
        {/* The hint sits on the WRAPPER: a disabled button fires no mouse
            event, and the state where the reading matters is that one. */}
        <span className="flex-none" data-hint-text={KEPT_HINT}>
          <button
            type="button"
            className="btn primary sm"
            id="btnAssetImport"
            disabled={busy}
            onClick={() => fileInput.current?.click()}
          >
            Importer une image
          </button>
        </span>
      </div>

      <div
        className={`grid min-h-0 flex-1 ${
          selectedAsset && !narrow ? 'grid-cols-[minmax(0,1fr)_340px]' : 'grid-cols-1'
        }`}
      >
        <div className="relative min-h-0 overflow-y-auto" {...drop.handlers}>
          {busy && (
            <div
              className="sticky top-0 z-[2] border-b border-b-line bg-panel2 px-[16px] py-[7px] text-[12px]"
              role="status"
              id="assetImportBand"
            >
              <span className="truncate">{pendingFile}</span> — Lecture de l'image par le modèle
              local… quelques secondes
              <progress className="mt-[5px] block h-[3px] w-full" aria-hidden="true" />
            </div>
          )}

          {loaded && !rows.length ? (
            /* L'ÉTAT VIDE EST LA CIBLE DE DÉPÔT, il ne la décrit pas. Mesuré
               le 26/09 : une ligne de texte en haut d'un écran vide de 900 px
               pour le seul geste que cet écran demande, et une zone de dépôt
               qui n'apparaissait qu'une fois le fichier déjà traîné. */
            <div className="flex h-full items-center justify-center p-[24px]">
              <p
                className="m-0 max-w-[520px] rounded-card border-2 border-dashed border-line2
                           px-[28px] py-[36px] text-center text-[13px] text-dim"
                id="assetsEmpty"
              >
                {assets.length
                  ? 'Aucun asset de cette classe.'
                  : "Déposez une image ici, ou utilisez « Importer une image ». Le fragment de prompt est lu sur l'image, et le composeur va le chercher dans Vêtements ou Scène et lieu."}
              </p>
            </div>
          ) : (
            <ul className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(148px,1fr))] gap-[10px] p-[14px]">
              {rows.map((asset) => (
                <li key={asset.key}>
                  <button
                    type="button"
                    className={`flex w-full flex-col gap-[6px] rounded-card border bg-panel p-[8px] text-left ${
                      asset.key === selected ? 'border-txt' : 'border-line'
                    }`}
                    data-asset={asset.key}
                    aria-pressed={asset.key === selected}
                    disabled={busyKeys.has(asset.key)}
                    onClick={() => setSelected(asset.key)}
                  >
                    <img
                      className="aspect-square w-full rounded-card bg-black object-cover"
                      src={api.url(`/img/asset?key=${encodeURIComponent(asset.key)}`)}
                      alt=""
                      loading="lazy"
                    />
                    <span className="truncate text-[12.5px]">{asset.label || asset.key}</span>
                    <span className="flex items-center gap-[5px] text-[11.5px] text-dim2">
                      {classLabel(classes, asset.classe)}
                      {asset.couche !== 'personnage' && (
                        <span className="rounded-pill border border-line px-[5px]">
                          {asset.couche === 'monde' ? 'monde' : 'ajusté'}
                        </span>
                      )}
                      {!asset.fragment && (
                        <span className="flex items-center gap-[3px] text-warn">
                          <Icon name="warn" className="h-[11px] w-[11px]" aria-hidden="true" />
                          sans fragment
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {drop.over && (
            <div
              className="absolute inset-0 z-[3] flex flex-col items-center justify-center gap-[8px]
                         border-2 border-dashed border-txt bg-bg/90 text-center"
              aria-live="polite"
            >
              {busy ? (
                <b className="text-[17px]">Un import est déjà en cours</b>
              ) : (
                <>
                  <b className="text-[17px]">
                    Déposer pour importer — {classLabel(classes, classe).toLowerCase()}
                  </b>
                  <span className="text-[12.5px] text-dim">
                    {comfy
                      ? "L'image est gardée, et le modèle local en écrit le fragment de prompt"
                      : "L'image est gardée. ComfyUI est hors ligne : l'asset entrera sans fragment, à analyser plus tard"}
                  </span>
                </>
              )}
            </div>
          )}
        </div>

        {selectedAsset && (
          <div
            ref={drawerRef}
            id="assetPanel"
            aria-label="Fiche de l'asset"
            role={narrow ? 'dialog' : undefined}
            className={`min-h-0 border-l border-l-line bg-panel ${
              narrow ? 'fixed top-0 right-0 bottom-0 z-[9] w-[min(340px,100vw)] shadow-elev' : ''
            }`}
          >
            {narrow && (
              <button
                type="button"
                className="ml-auto block border-0 bg-transparent px-[12px] py-[8px] text-[16px] text-dim hover:text-txt"
                aria-label="Fermer la fiche"
                onClick={() => setSelected(null)}
              >
                ×
              </button>
            )}
            <AssetInspector
              enhancer={enhancer}
              asset={selectedAsset}
              classes={classes}
              busy={busyKeys.has(selectedAsset.key)}
              comfy={comfy}
              src={api.url(`/img/asset?key=${encodeURIComponent(selectedAsset.key)}`)}
              onSave={(fields, toWorld) => void onSave(selectedAsset.key, fields, toWorld)}
              onAnalyse={() => void onAnalyse(selectedAsset.key)}
              onDelete={() => void onDelete(selectedAsset)}
            />
          </div>
        )}
      </div>
    </div>
  )
}
