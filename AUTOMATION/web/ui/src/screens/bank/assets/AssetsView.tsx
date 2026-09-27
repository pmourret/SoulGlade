/* The asset library — the fourth sub-view of the Atelier (IT-10 chantier 5,
   design-pass screen-assets, option 17a).

   WHAT AN ASSET IS HERE: an image the user brings in, a class that says what
   it is for, and the prompt fragment the local vision model read on it. The
   fragment is what the composer uses today; the file is kept for the day a
   graph can graft it (`DOCS/cadrage/2026-09-26-it10-c5-importeur-assets.md`).

   THE SHAPE OF THE LIGHTS AND OUTFITS: the classes on the left, the grid in
   the centre, the 340 px inspector on the right with its 48 px head and 52 px
   foot. The classes are ALSO the drop targets: the class of an import is
   chosen before it, since it decides the vision model's instruction, and it
   never changes after (`assets.CHAMPS_AJUSTABLES`). Before this pass it was a
   select among four in the bar, and at 1024 px the import button itself was
   pushed out of the screen (measured 27/09).

   NO CLASS IS NAMED HERE (invariant 7): the column, the menu and the drop
   cell read `classes` from `/api/assets`; `classDestination.ts` only knows
   the scene fields. */
import { useEnhancer } from '../../../api/useEnhance'
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'

import { useCharacter } from '../../../character/CharacterContext'
import { useChrome } from '../../../chrome/ChromeContext'
import { useConfirm } from '../../../chrome/ConfirmContext'
import { useToast } from '../../../chrome/ToastContext'
import { useApi } from '../../../api/useApi'
import { useScenes } from '../../../state/ScenesStoreContext'
import { useSystemState } from '../../../state/SystemStateContext'
import { useOverlayPanel } from '../../produce/useOverlayPanel'
import { useFileDrop } from '../useFileDrop'
import { AssetGrid } from './AssetGrid'
import { AssetInspector } from './AssetInspector'
import { ClassChips, ClassList, type ClassNavProps, type Owner } from './ClassList'
import { ALL, UNFRAGMENTED, destinationOf, importClassOf, pluralOf, type OpenClass } from './classDestination'
import { ImportMenu } from './ImportMenu'
import { useAssetLibrary, type AssetEntry } from './useAssetLibrary'

/* Said where the file is chosen, and it is not decoration: unlike the pose
   extraction next door, the file IS kept here — INPUTS/ASSETS/, out of git.
   The person handing over an image is the one who needs to know which of the
   two workshops they are in. */
const KEPT_HINT =
  "L'image est gardée dans la bibliothèque (INPUTS/ASSETS/, hors dépôt) — c'est ce qui la rend réutilisable d'une scène à l'autre"

const BUSY_TEXT = 'Un import est déjà en cours'

/* The drop targets: the grid and its drop cell take the open class, a row of
   the class column takes its own (`class:` + its key, so no server class can
   collide with the two others). */
type Target = 'grid' | 'cell' | `class:${string}`

export function AssetsView({ nav }: { nav: ReactNode }) {
  const enhancer = useEnhancer()
  const api = useApi()
  const toast = useToast()
  const confirm = useConfirm()
  const { narrow } = useChrome()
  const { world } = useScenes()
  const { sheet, claimed } = useCharacter()
  const { state } = useSystemState()
  /* L'import marche sans ComfyUI — c'est la règle du cadrage. Ce qui ne
     marche pas, c'est la LECTURE de l'image : la promesse doit donc suivre
     la sonde, ici comme dans l'inspecteur. */
  const comfy = Boolean(state?.comfy)
  const { assets, classes, loaded, busyKeys, importFile, analyse, save, remove } =
    useAssetLibrary()

  const fileInput = useRef<HTMLInputElement | null>(null)
  /** The class the browser's file dialog imports as, set just before it opens. */
  const fileClass = useRef<string | null>(null)
  const [open, setOpen] = useState<OpenClass>(ALL)
  const [owner, setOwner] = useState<Owner>('personnage')
  const [busy, setBusy] = useState(false)
  const [pending, setPending] = useState<{ name: string; url: string } | null>(null)
  const [justImported, setJustImported] = useState<string | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  /** The class menu, with the dropped file it waits for — or none. */
  const [menu, setMenu] = useState<{ file: File | null } | null>(null)

  const rows = useMemo(
    () => (open === ALL ? assets
      : open === UNFRAGMENTED ? assets.filter((a) => !a.fragment)
        : assets.filter((a) => a.classe === open)),
    [assets, open],
  )
  const selectedAsset = assets.find((a) => a.key === selected) ?? null
  const importClass = importClassOf(open, classes)

  /* An asset can leave the filtered list under the selection — a class
     filter, its own removal. The inspector then shows what the grid no
     longer holds, so the selection is dropped rather than frozen. */
  useEffect(() => {
    if (selected && !rows.some((a) => a.key === selected)) setSelected(null)
  }, [rows, selected])

  const drawerRef = useRef<HTMLDivElement | null>(null)
  useOverlayPanel(narrow && Boolean(selectedAsset), () => setSelected(null), drawerRef)

  /** THE single upload path — the button, the menu and every drop target land here. */
  const bringIn = async (file: File, classKey: string) => {
    setBusy(true)
    const url = URL.createObjectURL(file)
    setPending({ name: file.name, url })
    try {
      const result = await importFile(file, classKey, owner === 'monde')
      if (!result.ok) {
        toast(result.erreur || 'échec')
        return
      }
      /* Le toast lit l'asset QUE LE SERVEUR VIENT D'ÉCRIRE, pas la liste : à
         cet instant `assets` est encore celle d'avant l'import, et l'audit du
         26/09 a mesuré un « asset importé » sec sur un asset que la carte
         disait « sans fragment » — l'outil cachant une part de ce qu'il fait,
         le défaut fondateur d'IT-10. */
      if (result.asset) {
        setSelected(result.asset.key)
        setJustImported(result.asset.key)
      }
      toast(result.asset && !result.asset.fragment
        ? 'asset importé — sans fragment, à analyser'
        : 'asset importé')
    } finally {
      setBusy(false)
      setPending(null)
      URL.revokeObjectURL(url)
      // Same file twice in a row must re-fire `change`.
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  /** A class key, or the menu when the target is not a class. */
  const importAs = (file: File, classKey: string | null) => {
    if (classKey && classes.some((c) => c.key === classKey)) void bringIn(file, classKey)
    else setMenu({ file })
  }

  const drop = useFileDrop<Target>({
    enabled: !busy,
    extract: (file, target) =>
      importAs(file, target?.startsWith('class:') ? target.slice(6) : importClass?.key ?? null),
    onRefused: toast,
  })

  const openFileDialog = (classKey: string) => {
    fileClass.current = classKey
    fileInput.current?.click()
  }

  const onImportButton = () => {
    if (importClass) openFileDialog(importClass.key)
    else setMenu((m) => (m ? null : { file: null }))
  }

  const closeMenu = useCallback(() => setMenu(null), [])

  const onMenuPick = (classKey: string) => {
    const file = menu?.file
    setMenu(null)
    if (file) void bringIn(file, classKey)
    else openFileDialog(classKey)
  }

  /** What a hovered target says: the action, in words (§S4). */
  const dropText = (target: Target, classKey: string | null) => {
    if (drop.overTarget !== target) return null
    if (busy) return BUSY_TEXT
    const cls = classes.find((c) => c.key === classKey)
    return cls ? `Relâcher : importer comme ${cls.label.toLowerCase()}` : 'Relâcher : choisir la classe'
  }

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

  const classNav: ClassNavProps = {
    entries: [
      { key: ALL, label: 'Toutes', count: assets.length },
      ...classes.map((c) => ({
        key: c.key,
        label: pluralOf(c.label),
        count: assets.filter((a) => a.classe === c.key).length,
        note: destinationOf(c.champ).short,
      })),
    ],
    unfragmented: assets.filter((a) => !a.fragment).length,
    open,
    onOpen: setOpen,
    dropOf: (key) => drop.targetHandlers(`class:${key}`),
    dropText: (key) => dropText(`class:${key}`, key),
    owner,
    onOwner: setOwner,
    characterName: sheet?.name || claimed || 'ce personnage',
    worldLabel: world ? world.label : null,
  }

  const title = importClass ? pluralOf(importClass.label) : open === UNFRAGMENTED ? 'Sans fragment' : 'Tous les assets'
  const subtitle = `${rows.length} · ${
    importClass ? destinationOf(importClass.champ).long
      : open === UNFRAGMENTED ? "à analyser, ou à écrire à la main dans l'inspecteur" : 'toutes classes'}`

  const src = (key: string) => api.url(`/img/asset?key=${encodeURIComponent(key)}`)

  return (
    <div className="flex h-full min-h-0 flex-col" id="bankAssets" {...drop.handlers}>
      {/* ONE 48 px row, like the other sub-views: the shared nav, what the
          library is, and ONE import button that follows the open class. */}
      <div className="flex h-[48px] flex-none items-center gap-[10px] border-b border-b-line px-[16px]
                      [&>*]:whitespace-nowrap">
        {nav}

        <span className="min-w-0 flex-1 truncate text-[12.5px] text-dim2 max-[1280px]:hidden">
          <span id="nAssets">{assets.length}</span> asset{assets.length > 1 ? 's' : ''} · image et fragment de prompt
        </span>
        <span className="flex-1 min-[1281px]:hidden" />

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
            if (file) importAs(file, fileClass.current ?? importClass?.key ?? null)
          }}
        />
        {/* The hint sits on the WRAPPER: a disabled button fires no mouse
            event, and the state where the reading matters is that one. The
            menu lives in the same wrapper, so the button toggles it. */}
        <span className="relative flex-none" data-hint-text={KEPT_HINT}>
          <button
            type="button"
            className="btn primary sm"
            id="btnAssetImport"
            disabled={busy}
            aria-haspopup={importClass ? undefined : 'menu'}
            aria-expanded={importClass ? undefined : Boolean(menu)}
            onClick={onImportButton}
          >
            {importClass ? `Importer : ${importClass.label}` : 'Importer une image'}
            {!importClass && <span aria-hidden="true"> ▾</span>}
          </button>
          {menu && (
            <ImportMenu classes={classes} fileName={menu.file?.name ?? null}
                        onPick={onMenuPick} onClose={closeMenu} />
          )}
        </span>
      </div>

      {narrow && <ClassChips {...classNav} />}

      <div
        className={`grid min-h-0 flex-1 ${
          narrow ? 'grid-cols-1'
            : selectedAsset ? 'grid-cols-[260px_minmax(0,1fr)_340px]' : 'grid-cols-[260px_minmax(0,1fr)]'}`}
      >
        {!narrow && <ClassList {...classNav} />}

        <AssetGrid
          title={title}
          subtitle={subtitle}
          rows={rows}
          selected={selected}
          busyKeys={busyKeys}
          srcOf={src}
          onSelect={setSelected}
          pending={pending}
          justImported={justImported}
          comfy={comfy}
          libraryEmpty={loaded && !assets.length}
          importLabel={importClass?.label ?? null}
          onPickFile={onImportButton}
          gridDrop={drop.targetHandlers('grid')}
          cellDrop={drop.targetHandlers('cell')}
          cellDropText={dropText('cell', importClass?.key ?? null)}
          gridOver={drop.overTarget === 'grid'}
          busy={busy}
          narrow={narrow}
        />

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
            <AssetInspector
              enhancer={enhancer}
              asset={selectedAsset}
              classes={classes}
              busy={busyKeys.has(selectedAsset.key)}
              comfy={comfy}
              src={src(selectedAsset.key)}
              onSave={(fields, toWorld) => void onSave(selectedAsset.key, fields, toWorld)}
              onAnalyse={() => void onAnalyse(selectedAsset.key)}
              onDelete={() => void onDelete(selectedAsset)}
              onClose={narrow ? () => setSelected(null) : undefined}
            />
          </div>
        )}
      </div>
    </div>
  )
}
