/* Revue AND Galerie — sorting, sub-scores, judgement, decline.
   Ported from `static/review.js`.

   THREE PANELS (design-pass screen-5b, 23/09/2026). The screen used to be a
   centred article: one row mixing four segmented controls, then the grid or
   the full frame, which itself split into a stage and a 300 px column of five
   bordered cards. Now the filters have a panel, the image has the middle, and
   the readings have a panel — the same shape as Produire, on the same
   reflexes.

   TWO TRADES, TWO ROUTES (migration brief, point 2). The legacy screen carried
   both in `#trier[data-metier]`, an attribute written from the route. They are
   `/review` and `/gallery` now — but they remain ONE component with one loader
   and one grid: duplicating them would leave two grids to maintain and two
   loaders to fall out of sync. What the trade changes is what is OFFERED, and
   that is decided here rather than by three CSS rules.

   AN IMAGE CAN BE AIMED AT BY NAME (F1.3): `/review/:name` and `/gallery/:name`.
   A name absent from this folder — sorted elsewhere, deleted, or belonging to
   another character — is SAID on screen; it never shows another image instead.

   COUPLING TRAP §5.6-1 — the `v` token. Every image URL goes through
   `api.image()`, which appends `v` (the mtime) verbatim. Without it the browser
   keeps serving the image from before an overwrite by the editor. It is
   consumed, never interpreted.

   COUPLING TRAP §5.6-4 — /api/mesurer in batches. The client must keep calling
   while `restant > 0`. That contract is unchanged; see `measure()` below. */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { useApi } from '../../api/useApi'
import { useCharacter } from '../../character/CharacterContext'
import { useChrome } from '../../chrome/ChromeContext'
import { useLightbox } from '../../chrome/LightboxContext'
import { useToast } from '../../chrome/ToastContext'
import { useConfig } from '../../state/ConfigContext'
import { useScenes } from '../../state/ScenesStoreContext'
import { useSystemState } from '../../state/SystemStateContext'
import { PATHS } from '../../app/routes'
import { DeclineDialog } from './DeclineDialog'
import { PhotoEditor } from './PhotoEditor'
import { EmptyState } from './EmptyState'
import { FullFrame } from './FullFrame'
import { ReviewFilters, REVIEW_BUCKETS, SCORE_FILTERS } from './ReviewFilters'
import { ReviewInspector } from './ReviewInspector'
import { ReviewToolbar } from './ReviewToolbar'
import { SurveyMode } from './SurveyMode'
import { Tile } from './Tile'
import { TileMenu } from './TileMenu'
import { CartBar } from './gallery/CartBar'
import { FramingPanel } from './gallery/FramingPanel'
import { GalleryBoard } from './gallery/GalleryBoard'
import { GalleryFilters } from './gallery/GalleryFilters'
import { downloadAll, useCart } from './gallery/useCart'
import { groupBy as groupItems, type GroupBy } from './gallery/boardLayout'
import { useOverlayPanel } from '../produce/useOverlayPanel'
import { useReviewKeys } from './useReviewKeys'
import { useSelection } from './useSelection'
import { useSortActions } from './useSortActions'
import {
  scoreBand,
  useTriage,
  type GalleryItem,
  type ScoreFilter,
  type Space,
  type Trade,
} from './useTriage'

export function ReviewScreen({ trade }: { trade: Trade }) {
  const api = useApi()
  const toast = useToast()
  const navigate = useNavigate()
  const { name: focusName } = useParams()
  const { qc, qcMains } = useConfig()
  const { state, refresh: refreshCounts } = useSystemState()
  const { src: lightboxSrc, open: openLightbox } = useLightbox()
  const { narrow } = useChrome()
  const { claimed } = useCharacter()
  const { bank } = useScenes()

  /* Galerie always reads the kept ones; Revue opens on the queue to judge and
     lets one walk the other folders. `A_REVOIR` here is only the value held
     until the counts arrive — see the landing effect below. */
  const [bucket, setBucket] = useState(trade === 'galerie' ? 'OK' : 'A_REVOIR')
  /* Always SFW on entry. Only a gesture that NAMES the NSFW space enters it, and
     a chrome tab is not one (J7). The end-of-batch link from Produire is that
     gesture; when Produire is migrated it must carry the space explicitly. */
  const [space, setSpace] = useState<Space>('sfw')
  const [filter, setFilter] = useState<ScoreFilter>('tout')
  const [declineFor, setDeclineFor] = useState<GalleryItem | null>(null)
  const [editFor, setEditFor] = useState<GalleryItem | null>(null)
  /** Under 1100 px the inspector is a drawer; above, this is ignored. */
  const [inspectorOpen, setInspectorOpen] = useState(false)
  /** The tile context menu: which tile, and where the pointer opened it. */
  const [menu, setMenu] = useState<{ index: number; at: { x: number; y: number } | null } | null>(
    null,
  )
  /* Galerie only (design-pass screen-5c): how the board groups, which frame
     ratio it keeps, and what one is searching for. None of it is asked of the
     server — the board is an ANGLE on the folder, not another query. */
  const [groupMode, setGroupMode] = useState<GroupBy>('intention')
  const [format, setFormat] = useState('tout')
  const [search, setSearch] = useState('')
  const [framingOpen, setFramingOpen] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const cart = useCart(claimed)

  useEffect(() => {
    setBucket(trade === 'galerie' ? 'OK' : 'A_REVOIR')
    setSpace('sfw')
    setFilter('tout')
    setFormat('tout')
    setSearch('')
  }, [trade])

  const triage = useTriage({ bucket, space, trade, focusName: focusName ?? null })
  const { items, setItems, bands, references, unmeasured, notFound, setNotFound } = triage
  const { cursor, setCursor, view, setView, reload } = triage

  /* VITEMS = what is actually shown. `items` stays the folder's list. */
  const scoreFiltered = useMemo(
    () => (filter === 'tout' ? items : items.filter((i) => scoreBand(i.score, qc) === filter)),
    [items, filter, qc],
  )

  /* THE GALERIE'S OWN NARROWING, on top of the score band: a format and a
     substring, both client-side (design-pass screen-5c, §S2). */
  const boardFiltered = useMemo(() => {
    if (trade !== 'galerie') return scoreFiltered
    const needle = search.trim().toLowerCase()
    return scoreFiltered.filter((item) => {
      if (format !== 'tout' && (item.format || '') !== (format === 'sans' ? '' : format))
        return false
      if (!needle) return true
      return `${item.scene ?? ''} ${item.date ?? ''}`.toLowerCase().includes(needle)
    })
  }, [trade, scoreFiltered, format, search])

  /* The format list is built from what is REALLY there (§S2). On Léna's tree
     that includes `upscale` and the empty string: `format` is a nominal
     label, not a size, and four images carry those two values. Hiding them
     would hide the images; `ratioOf` gives them 4:5 for the layout only. */
  const formats = useMemo(() => {
    if (trade !== 'galerie') return []
    const seen = new Map<string, number>()
    scoreFiltered.forEach((item) => {
      const key = item.format || 'sans'
      seen.set(key, (seen.get(key) ?? 0) + 1)
    })
    return [
      { key: 'tout', label: 'Tous', n: scoreFiltered.length },
      ...[...seen.entries()].map(([key, n]) => ({
        key,
        label: key === 'sans' ? 'sans format' : key,
        n,
      })),
    ]
  }, [trade, scoreFiltered])

  /* The intention of a scene comes from the bank the Ateliers already load
     (`bank.meta[scene].intention`) — the same lookup Produire does in
     `useSceneChoice.ts`. Nothing is asked of the server for the grouping. */
  const intentions = useMemo(() => {
    const meta = (bank?.meta ?? {}) as Record<string, { intention?: string }>
    const out: Record<string, string | undefined> = {}
    Object.entries(meta).forEach(([scene, entry]) => {
      out[scene] = entry?.intention
    })
    return out
  }, [bank])

  const groups = useMemo(
    () => (trade === 'galerie' ? groupItems(boardFiltered, groupMode, intentions) : []),
    [trade, boardFiltered, groupMode, intentions],
  )

  /* THE BOARD'S READING ORDER IS THE LIST. Grouping reorders the images, and
     the cursor, the filmstrip, the loupe and `data-k` must all walk the SAME
     order — otherwise an arrow moves to something other than the next tile on
     screen. One list, one order, for every surface. */
  const shown = useMemo(
    () => (trade === 'galerie' ? groups.flatMap((g) => g.items) : scoreFiltered),
    [trade, groups, scoreFiltered],
  )
  const counts = useMemo(() => {
    const out: Record<string, number> = { tout: items.length, haut: 0, moyen: 0, bas: 0 }
    items.forEach((i) => {
      out[scoreBand(i.score, qc)] += 1
    })
    return out
  }, [items, qc])

  /* VISER PAR NOM, DANS L'ORDRE AFFICHE. `useTriage` resout `/gallery/<nom>`
     contre la liste que le serveur a rendue — qui EST l'ordre de la Revue,
     mais plus celui de la Galerie depuis que la planche regroupe par
     intention, par scene ou par jour. Le meme nom y occupe un autre rang, et
     le curseur tombait a cote.

     Un seul tir, depense des que la liste est chargee : sans ca, un
     changement de filtre plus tard ramenerait le curseur sur l'image de
     l'URL, sous la main de quelqu'un qui regarde ailleurs. */
  const pendingAim = useRef<string | null>(focusName ?? null)
  useEffect(() => {
    pendingAim.current = focusName ?? null
  }, [focusName])
  useEffect(() => {
    const target = pendingAim.current
    if (!target || !items.length) return
    pendingAim.current = null
    const index = shown.findIndex((entry) => entry.name === target)
    if (index >= 0) setCursor(index)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, shown])

  // the cursor is re-bounded whenever the visible list shrinks under it
  const safeCursor = Math.min(cursor, Math.max(0, shown.length - 1))
  const current = shown[safeCursor]

  /* Filmstrip thumbnails (design-pass screen-5, §A) — the same `thumb:true`
     URL already resolved for the grid, no extra request. Sub-components
     never call the API themselves (frontend.md): plain strings down. */
  const filmstripItems = useMemo(
    () => shown.map((item) => ({ name: item.name, thumbSrc: api.image({ ...item, thumb: true }) })),
    [shown, api],
  )

  const step = useCallback(
    (delta: number) => {
      if (!shown.length) return
      setCursor((c) => (Math.min(c, shown.length - 1) + delta + shown.length) % shown.length)
    },
    [shown.length, setCursor],
  )

  const { setFlag, act, actMany, undo, deleteForever, measure, measuring, measureLeft } = useSortActions({
    shown,
    items,
    safeCursor,
    bucket,
    space,
    setItems,
    setCursor,
    setDeclineFor,
    step,
    reload,
  })

  /* Multi-select (design-pass screen-5, §D/§B) — one Set feeds the bulk
     action bar AND Comparer mode's source set. `gridRef` is where focus
     returns on Échap (a checkbox or the bulk bar's own button could
     otherwise be left stranded once the bar it was on unmounts). */
  const selection = useSelection(shown)
  const gridRef = useRef<HTMLDivElement | null>(null)

  /* ONE SET, TWO NAMES (décidé avec Pierre, 23/09/2026). In the Revue the
     ticked images are a SELECTION one acts on in bulk; in the Galerie they
     are a CART one takes out. They are never both on screen, so everything
     downstream — Comparer, Échap, the keyboard count — reads whichever the
     trade defines, and neither surface has to know about the other.

     This is also what finally applies « aucun geste de tri dans la Galerie »:
     the bulk bar's three buttons are sorts, and they are gone from there. */
  const chosen = trade === 'galerie' ? cart.cart : selection.selected
  const clearChosen = useCallback(() => {
    if (trade === 'galerie') cart.clear()
    else selection.clearSelection()
  }, [trade, cart, selection])
  const clearSelectionAndRefocus = useCallback(() => {
    clearChosen()
    gridRef.current?.focus()
  }, [clearChosen])

  /* The menu gives focus back to the tile it came from — the same contract
     as IdentityMenu, and the reason the opener is remembered rather than
     assumed to still be the active element. */
  const closeMenu = useCallback(() => {
    const index = menu?.index
    setMenu(null)
    /* Scoped to the SCREEN, not to `gridRef`: the Galerie's board is its own
       scroll container and never registers that ref, so a query rooted there
       found nothing and the focus was left on <body> — the menu closed and
       the keyboard was back at square one. Found by the fumigation. */
    if (index != null)
      document
        .querySelector('#trier')
        ?.querySelector<HTMLElement>(`[data-thumb][data-k="${index}"]`)
        ?.focus()
  }, [menu])

  /* `editing` was a prop of useReviewKeys that the handler never read: the
     real guards are `body.editing` (posted by PhotoEditor) and `dialog[open]`
     (posted by DeclineDialog's own confirmation). It only ever sat in the
     dependency array, and the array is gone. */
  useReviewKeys({
    trade,
    view,
    setView,
    step,
    act,
    setFlag,
    undo,
    current,
    lightboxSrc,
    selectedCount: chosen.size,
    onClearSelection: clearSelectionAndRefocus,
    menuOpen: menu !== null,
    /* `B` fills the cart, and ONLY on the board. In the loupe that letter
       already labels « mains bonnes » (CorpusLabels), so the two are told
       apart by the view rather than by a second keyboard — which is what
       `view === 'grille'` does here. */
    onToggleCart:
      trade === 'galerie'
        ? () => current && cart.toggle(current.name, safeCursor, { shiftKey: false }, [])
        : undefined,
  })

  /* A finished batch means new images in the folder being looked at. */
  const lastBatch = useRef<string | null>(null)
  useEffect(() => {
    if (!state?.batch_id || state.running) return
    if (lastBatch.current === state.batch_id) return
    lastBatch.current = state.batch_id
    void reload()
  }, [state?.batch_id, state?.running, reload])

  const buckets = state ? (space === 'nsfw' ? state.nsfw_counts : state.counts) : null
  /* Both trees for the CURRENT folder — `/api/state` already counts them, one
     map per space, and the landing logic below reads them too. No route, no
     second source. */
  const spaceCounts = {
    sfw: state?.counts?.[bucket],
    nsfw: state?.nsfw_counts?.[bucket],
  }

  /* LANDING FOLDER OF THE REVUE. It used to be `A_REVOIR`, full stop. On a tree
     where nothing was ever sorted into it — the normal case once a batch has
     been judged — the menu opened on « Tout est trié » with 21 rejected images
     one unlabelled click away, and the screen looked empty of everything.

     So we land on the first folder that HAS something, in the order of the
     selector. Two guards make it a landing and not a moving floor:
       - ONLY on arrival (and on changing space, which is arriving in another
         tree). `landing` is spent on the first counts that come back;
       - NEVER afterwards. The counts change at every sort, and a folder that
         re-picked itself under the hand sorting it would move the image the
         next keypress was aimed at.
     Before the counts arrive `buckets` is null and the state above stands. */
  const landing = useRef(trade !== 'galerie')
  useEffect(() => {
    landing.current = trade !== 'galerie'
  }, [trade, space])
  useEffect(() => {
    if (!landing.current || !buckets) return
    landing.current = false
    const first = REVIEW_BUCKETS.find((entry) => ((buckets as Record<string, number>)[entry.key] ?? 0) > 0)
    if (first) setBucket(first.key)
  }, [buckets])

  const onBulk = useCallback(
    async (action: string) => {
      await actMany(action, [...selection.selected])
      selection.clearSelection()
    },
    [actMany, selection],
  )

  /* Comparer mode (design-pass screen-5, §B) — resolved from `items`, NOT
     `shown`: a score-filter change made AFTER selecting must not drop
     images out of the comparison. Capped at 4, same order as `items`. */
  const comparedAll = useMemo(
    () => items.filter((item) => chosen.has(item.name)),
    [items, chosen],
  )
  const compared = useMemo(
    () => comparedAll.slice(0, 4).map((item) => ({ item, src: api.image(item) })),
    [comparedAll, api],
  )
  const overflowCount = Math.max(0, comparedAll.length - 4)

  const onKeepInSurvey = useCallback(
    async (kept: GalleryItem, comparedItems: GalleryItem[]) => {
      const others = comparedItems.filter((i) => i.name !== kept.name).map((i) => i.name)
      await actMany('valider', [kept.name])
      if (others.length) await actMany('rejeter', others)
      clearChosen()
      setView('grille')
    },
    [actMany, clearChosen, setView],
  )

  /* The inspector is a drawer under 1100 px, and `useOverlayPanel` gives it
     the Escape and the focus contract it does not need at full width. */
  const inspectorRef = useRef<HTMLDivElement | null>(null)
  const closeInspector = useCallback(() => setInspectorOpen(false), [])
  useOverlayPanel(narrow && inspectorOpen, closeInspector, inspectorRef)

  const filterLabel = SCORE_FILTERS.find((entry) => entry.key === filter)?.label ?? ''
  const position = shown.length
    ? `${safeCursor + 1} / ${shown.length}${filter !== 'tout' ? ` · filtre : ${filterLabel}` : ''}`
    : ''
  /* The Revue freezes its filter panel during a bulk selection; the Galerie
     has no such panel, and its cart is not a transient mode. */
  const selecting = trade === 'revue' && view === 'grille' && selection.selected.size > 0
  const menuItem = menu != null ? shown[menu.index] : undefined

  /* The cart resolved to real images, in the folder's order rather than in
     the order they were ticked: the bar is a check of WHAT is leaving, and a
     list that reordered itself under the hand would defeat that. */
  const cartItems = useMemo(
    () => items.filter((item) => cart.cart.has(item.name)),
    [items, cart.cart],
  )

  const onDownloadCart = useCallback(async () => {
    setDownloading(true)
    const failed = await downloadAll(
      cartItems.map((item) => ({ name: item.name, href: api.image(item) })),
    )
    setDownloading(false)
    /* NAMES the files that did not go, never a count: « 2 sur 3 » says
       something failed and nothing about what to do next. */
    if (failed.length) toast(`non téléchargé${failed.length > 1 ? 's' : ''} : ${failed.join(', ')}`)
  }, [cartItems, api, toast])

  const closeFraming = useCallback(() => setFramingOpen(false), [])
  const framingRef = useRef<HTMLDivElement | null>(null)
  useOverlayPanel(narrow && framingOpen, closeFraming, framingRef)

  /* ONE display utility in the chain, never two — the drawer's own
     `hidden`/`flex` trap, already paid for on Produire. */
  const inspectorShell = narrow
    ? `fixed top-0 right-0 bottom-0 z-[9] w-[min(320px,100vw)] shadow-elev ${
        inspectorOpen ? 'flex' : 'hidden'
      }`
    : 'flex'

  /* THE CENTRE IS THE SAME OBJECT IN BOTH TRADES — the banner, Comparer, the
     empty states, the loupe. Only the GRID view differs: a board in the
     Galerie, a contact grid in the Revue. Writing it once is what keeps the
     two screens from drifting into two screens. */
  const centre = (
    <>
      {notFound && (
        /* A banner, not an empty screen: the folder may well have content,
           and it is the REQUEST that failed, not the load. */
        <div
          className="m-[16px] flex flex-none items-start gap-[12px] rounded-card border
                     border-warn-line bg-warn-bg px-[14px] py-[12px] text-[12.5px]
                     leading-[1.5] text-warn-txt empty"
          data-avis
        >
          <div className="min-w-0 flex-1 text-left">
            <b className="block">« {notFound} » n'est pas dans ce dossier.</b>
            Le fichier a pu être trié ailleurs, supprimé, ou appartenir à un autre
            personnage — la Revue et la Galerie ne montrent que l'arbre du
            personnage ouvert.
          </div>
          <button className="btn sm flex-none" id="btnAvisFermer" onClick={() => setNotFound(null)}>
            Fermer
          </button>
        </div>
      )}

      {view === 'comparer' ? (
        /* Comparer does not depend on `shown` (the filtered view) — it has
           its OWN empty state (0-1 chosen), never EmptyState.tsx
           (bucket-keyed, semantically foreign to this case). */
        <div className="min-h-0 flex-1 overflow-y-auto p-[16px]">
          <SurveyMode
            compared={compared}
            overflowCount={overflowCount}
            onFlag={(item, flag) => void setFlag(item, flag)}
            onKeep={(kept, comparedItems) => void onKeepInSurvey(kept, comparedItems)}
          />
        </div>
      ) : !shown.length ? (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <EmptyState
            empty={!items.length}
            bucket={bucket}
            total={items.length}
            onShowAll={() => {
              setFilter('tout')
              setFormat('tout')
              setSearch('')
            }}
            space={space}
            otherCount={space === 'sfw' ? spaceCounts.nsfw : spaceCounts.sfw}
            onSwitchSpace={() => setSpace(space === 'sfw' ? 'nsfw' : 'sfw')}
            /* §S3 : une Galerie vide dit ou sont les images — en attente de
               jugement, ou pas encore produites. Le compte vient de
               `state.counts`, deja charge pour le chrome. */
            gallery={
              trade === 'galerie'
                ? {
                    toReview: state?.counts?.A_REVOIR ?? 0,
                    onReview: () => navigate(PATHS.review),
                    onProduce: () => navigate(PATHS.produce),
                  }
                : undefined
            }
          />
        </div>
      ) : view === 'grille' ? (
        trade === 'galerie' ? (
          <GalleryBoard
            groups={groups}
            order={shown.map((i) => i.name)}
            cursorName={current?.name ?? null}
            cart={cart.cart}
            /* 150 px sous 1100 px (§S7) : la planche garde le meme nombre
               d'images par ligne sur un ecran plus etroit. */
            targetHeight={narrow ? 150 : 190}
            imageUrl={api.image}
            onAim={(name) => setCursor(shown.findIndex((i) => i.name === name))}
            onOpen={(name) => {
              setCursor(shown.findIndex((i) => i.name === name))
              setView('revue')
            }}
            onCartToggle={(name, index, event) =>
              cart.toggle(name, index, event, shown.map((i) => i.name))
            }
            onAddGroup={cart.addAll}
            onMenu={(name, at) => setMenu({ index: shown.findIndex((i) => i.name === name), at })}
          />
        ) : (
          <div
            ref={gridRef}
            tabIndex={-1}
            className="grid min-h-0 flex-1 content-start grid-cols-[repeat(auto-fill,minmax(180px,1fr))]
                       gap-[12px] overflow-y-auto p-[16px] outline-none
                       [grid-auto-rows:max-content]"
          >
            {shown.map((item, index) => (
              <Tile
                key={item.name}
                item={item}
                index={index}
                current={index === safeCursor}
                qc={qc}
                src={api.image({ ...item, thumb: true })}
                selected={selection.selected.has(item.name)}
                onSelectClick={selection.onSelectClick}
                onAim={() => setCursor(index)}
                onOpen={() => {
                  setCursor(index)
                  setView('revue')
                }}
                onMenu={(at) => setMenu({ index, at })}
              />
            ))}
          </div>
        )
      ) : (
        current && (
          <FullFrame
            item={current}
            index={safeCursor}
            trade={trade}
            src={api.image(current)}
            filmstripItems={filmstripItems}
            onStep={step}
            onSelectIndex={setCursor}
            onMagnify={() => openLightbox(api.image(current))}
            onAct={(action) => act(action)}
            onEdit={() => setEditFor(current)}
            onDelete={() => deleteForever()}
          />
        )
      )}
    </>
  )

  const inspector = (
    <aside
      ref={inspectorRef}
      className={`w-[320px] flex-none flex-col overflow-y-auto border-l border-l-line
                  bg-panel ${inspectorShell}`}
      id="reviewInspector"
      aria-label="Inspecteur"
      /* A drawer is a dialog; a column beside the grid is a complementary
         landmark. No `aria-modal`: there is no scrim and the grid behind
         stays reachable, deliberately — claiming modality the panel does
         not enforce would be a promise it does not keep. */
      role={narrow ? 'dialog' : undefined}
    >
      {narrow && (
        <button
          type="button"
          className="flex-none self-end border-0 bg-transparent px-[12px] py-[8px]
                     text-[16px] text-dim hover:text-txt"
          aria-label="Fermer l'inspecteur"
          onClick={closeInspector}
        >
          ×
        </button>
      )}
      <ReviewInspector
        item={current}
        compact={view !== 'revue'}
        qc={qc}
        qcMains={qcMains}
        bands={bands}
        items={items}
        references={references}
        previewSrc={current ? api.image({ ...current, thumb: true }) : null}
        onFlag={(flag) => current && setFlag(current, flag)}
        onLabel={(axis, value) => current && setFlag(current, value, axis.axe)}
      />
    </aside>
  )

  return (
    <div className="screen flex h-full flex-col" id="trier" data-metier={trade}>
      {trade === 'galerie' ? (
        <>
          <GalleryFilters
            space={space}
            spaceCounts={spaceCounts}
            onSpace={setSpace}
            formats={formats}
            format={format}
            onFormat={(key) => {
              setFormat(key)
              setCursor(0)
            }}
            groupBy={groupMode}
            onGroupBy={setGroupMode}
            filter={filter}
            filterCounts={counts}
            onFilter={(key) => {
              setFilter(key)
              setCursor(0)
            }}
            qc={qc}
            search={search}
            onSearch={(value) => {
              setSearch(value)
              setCursor(0)
            }}
            view={view}
            onView={setView}
            narrow={narrow}
            onOpenFraming={() => setFramingOpen(true)}
          />
          {/* §S6 : l'espace NSFW n'est jamais exporte, et l'ecran le DIT —
              sur un ecran dont le geste principal est de sortir des fichiers,
              c'est la seule place ou cette phrase compte. */}
          {space === 'nsfw' && (
            <div
              className="flex-none border-b border-b-warn-line bg-warn-bg px-[16px] py-[7px]
                         text-[12px] text-warn-txt"
              id="nsfwBanner"
            >
              Espace NSFW · isolé, jamais exporté · fichiers dans{' '}
              <code className="font-code">PROD/EXPORT_NSFW/</code>
            </div>
          )}
          <div
            className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_320px]
                       max-[1100px]:grid-cols-[minmax(0,1fr)]"
          >
            <div className="flex min-h-0 min-w-0 flex-col bg-bg">{centre}</div>
            {/* LE CADRAGE APPARTIENT A LA PLANCHE, pas a la loupe. Sur la
                planche on choisit ce qui sort, et la question est « qu'est-ce
                que le feed garde de cette image » ; en loupe on regarde UNE
                image, et la question redevient celle de la Revue — son score,
                son realisme, son corpus. Le cadrage est aussi celui qui n'a
                rien a dire quand on compare. Trouve par la fumigation, qui
                cherchait les jugements de realisme en loupe et ne les
                trouvait plus. */}
            {view === 'grille' ? (
              <aside
                ref={framingRef}
                className={`w-[320px] flex-none flex-col overflow-hidden border-l border-l-line
                            bg-panel ${
                              narrow
                                ? `fixed top-0 right-0 bottom-0 z-[9] w-[min(320px,100vw)] shadow-elev ${
                                    framingOpen ? 'flex' : 'hidden'
                                  }`
                                : 'flex'
                            }`}
                id="framingPanel"
                aria-label="Cadrage"
                role={narrow ? 'dialog' : undefined}
              >
                {narrow && (
                  <button
                    type="button"
                    className="flex-none self-end border-0 bg-transparent px-[12px] py-[8px]
                               text-[16px] text-dim hover:text-txt"
                    aria-label="Fermer le cadrage"
                    onClick={closeFraming}
                  >
                    ×
                  </button>
                )}
                <FramingPanel
                  item={current}
                  src={current ? api.image({ ...current, thumb: true }) : null}
                  inCart={Boolean(current && cart.cart.has(current.name))}
                  onCartToggle={() =>
                    current && cart.toggle(current.name, safeCursor, { shiftKey: false }, [])
                  }
                  onEdit={() => current && setEditFor(current)}
                />
              </aside>
            ) : (
              inspector
            )}
          </div>
          <CartBar
            items={cartItems}
            imageUrl={api.image}
            onRemove={cart.remove}
            onClear={cart.clear}
            onDownload={() => void onDownloadCart()}
            downloading={downloading}
          />
        </>
      ) : (
        /* ECART ASSUME sur §S6 de l'ecran 5b. Le cadrage replie le panneau de
           filtres en 56 px d'icones sous 1100 px. Le studio n'a pas de
           vocabulaire d'icones pour « A revoir », « Rejetees », « Sans
           visage », « Archivees » ni pour les trois bandes de score, et en
           inventer six pour une largeur serait six signes de plus a
           apprendre. A 1024 les 232 px du panneau et les 792 px qui restent
           au centre tiennent tous les deux, donc le panneau garde sa largeur
           et ses MOTS. Mesure : la piste declaree a 56 px pendant que le
           panneau en faisait 232 le posait SUR la grille, 176 px par-dessus
           (audit du 23/09). */
        <div
          className="grid min-h-0 flex-1 grid-cols-[232px_minmax(0,1fr)_320px]
                     max-[1100px]:grid-cols-[232px_minmax(0,1fr)]"
        >
          <ReviewFilters
            trade={trade}
            space={space}
            spaceCounts={spaceCounts}
            onSpace={setSpace}
            bucket={bucket}
            buckets={buckets as Record<string, number> | null}
            onBucket={(key) => {
              setBucket(key)
              setCursor(0)
            }}
            filter={filter}
            filterCounts={counts}
            onFilter={(key) => {
              setFilter(key)
              setCursor(0)
            }}
            qc={qc}
            unmeasured={unmeasured}
            measuring={measuring}
            measureLeft={measureLeft ?? 0}
            onMeasure={measure}
            canUndo={Boolean(state?.undo)}
            onUndo={undo}
            frozen={selecting}
          />

          <div className="flex min-h-0 min-w-0 flex-col bg-bg">
            <ReviewToolbar
              title={view === 'revue' && current ? current.scene || current.name : 'Images'}
              position={position}
              view={view}
              onView={setView}
              selectedCount={selection.selected.size}
              onBulk={(action) => void onBulk(action)}
              onClearSelection={clearSelectionAndRefocus}
              narrow={narrow}
              onOpenInspector={() => setInspectorOpen(true)}
            />
            {centre}
          </div>

          {inspector}
        </div>
      )}

      {menu && menuItem && (
        <TileMenu
          trade={trade}
          bucket={menuItem.bucket}
          at={menu.at}
          downloadHref={api.image(menuItem)}
          onAct={(action) => act(action, menu.index)}
          onEdit={() => setEditFor(menuItem)}
          onDelete={() => deleteForever(menu.index)}
          onClose={closeMenu}
        />
      )}

      {editFor && (
        <PhotoEditor
          item={editFor}
          src={api.image(editFor)}
          onClose={() => setEditFor(null)}
          onSaved={() => {
            setEditFor(null)
            void reload()
            refreshCounts()
          }}
        />
      )}

      {declineFor && (
        <DeclineDialog
          item={declineFor}
          onClose={() => setDeclineFor(null)}
          onLaunched={(label, total) => {
            setDeclineFor(null)
            toast(`${label} — ${total} image(s) en production`)
            navigate(PATHS.produce)
          }}
        />
      )}
    </div>
  )
}

/* Route wrappers — the ROUTER names the trade. */
export function ReviewRoute() {
  return <ReviewScreen trade="revue" />
}
export function GalleryRoute() {
  return <ReviewScreen trade="galerie" />
}
