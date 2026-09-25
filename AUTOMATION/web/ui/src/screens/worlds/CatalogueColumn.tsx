/* The middle column (design-pass screen-11 §S4): what a world IS at the top,
   its two catalogs as tabs, its places as rows, and the button that adds one.
   Presentation only — props and callbacks, no API call.

   IT REPLACES `CatalogueSection`, which was rendered TWICE, once per catalog,
   the adult one inside a folded `<details>`. Two lists and two inspectors could
   be open at once, and the adult block carried a full second copy of the
   column. One column and two tabs say the same thing with one list on screen.

   THE ADULT TAB IS ANNOUNCED, NEVER IMPOSED — the 21/09 arbitration, kept
   whole: its count shows on the tab itself, and its content appears only once
   the tab is picked. What changed is the idiom, not the restraint.

   RADIX OWNS THE KEYBOARD, as it does for the inspector of Produire
   (`screens/produce/ProduceInspector.tsx`): tablist roles, arrows, Home/End. */
import * as Tabs from '@radix-ui/react-tabs'

import { moveFocusInList, tabIndexInList } from './listKeys'
import type { CatalogueEditor } from './useCatalogueEditor'
import type { ToneCatalogue } from './useToneCatalogue'
import type { Place } from './useWorldPlaces'
import type { WorldTone } from './useWorldTones'
import type { WorldSummary } from './useWorldRegistry'

export type CatalogueTab = 'ordinaire' | 'adulte' | 'tons'

const TRIGGER =
  'flex-none cursor-pointer border-0 bg-transparent px-[12px] py-[9px] text-[13px] ' +
  'focus-visible:outline-2 focus-visible:outline-focus focus-visible:outline-offset-[-2px]'
const TRIGGER_OFF = 'text-dim hover:text-txt'
/* The adult tab underlines in `--warn` rather than `--txt` (§S4.2): the change
   of register must be visible from the tab bar alone. Never colour ONLY — the
   tab is also the selected one, in `--txt` and 600, and the banner under it
   says in words which catalog is open. */
const TRIGGER_ON = 'font-semibold text-txt [box-shadow:inset_0_-2px_0_var(--txt)]'
const TRIGGER_ON_WARN = 'font-semibold text-txt [box-shadow:inset_0_-2px_0_var(--warn)]'

const ROW =
  'block w-full cursor-pointer border-y-0 border-r-0 border-l-2 bg-transparent ' +
  'px-[10px] py-[7px] text-left ' +
  'focus-visible:outline-2 focus-visible:outline-focus focus-visible:outline-offset-[-2px]'
const ROW_ON = 'border-l-acc bg-panel3'
const ROW_OFF = 'border-l-transparent hover:bg-panel'

function PlaceRows({
  places,
  editor,
  emptyState,
  onOpen,
}: {
  places: Place[] | null
  editor: CatalogueEditor
  emptyState: React.ReactNode
  /* NOT `editor.open` directly: opening another place throws away what is
     typed in the inspector, so the screen asks first (§S1). A column that
     called the editor itself would make that question impossible to place. */
  onOpen: (id: string) => void
}) {
  if (places === null) return <p className="tiny px-[12px] py-[10px]">chargement du catalogue…</p>
  if (places.length === 0 && !editor.creatingNew) {
    return <div className="empty px-[16px] py-[24px] text-[13px]">{emptyState}</div>
  }
  const selection = !editor.creatingNew && editor.selectedId
  return (
    <div role="listbox" aria-label="Lieux du catalogue">
      {places.map((place, index) => {
        const on = selection === place.id
        return (
          <button
            key={place.id}
            type="button"
            role="option"
            aria-selected={on}
            data-place-row
            tabIndex={tabIndexInList(on, index === 0, Boolean(selection))}
            className={`${ROW} ${on ? ROW_ON : ROW_OFF}`}
            onClick={() => onOpen(place.id)}
            onKeyDown={moveFocusInList}
          >
            <span className="flex items-baseline gap-[8px]">
              <b className={`min-w-0 flex-1 truncate text-[13.5px] ${on ? '' : 'font-normal'}`}>
                {place.label || place.id}
                {/* A place edited but not saved carries a dot, so the list and
                    the banner agree on what is pending (§S4.3). */}
                {on && editor.dirty && (
                  <span className="ml-[6px] text-[9px] text-warn" aria-hidden="true">
                    ●
                  </span>
                )}
              </b>
              {place.intention && (
                <span className="flex-none text-[11.5px] text-dim">{place.intention}</span>
              )}
            </span>
            <span className="mt-[2px] block truncate text-[12px] text-dim2">
              {place.prompt || '—'}
            </span>
          </button>
        )
      })}
    </div>
  )
}

/* The tones of the world (IT-10, 25/09). Same row shape as a place: the name,
   then the fragment one reads to know what the tone does to an image — the
   very thing no screen showed before. */
function ToneRows({
  tones,
  catalogue,
  onOpen,
  onAdd,
}: {
  tones: WorldTone[] | null
  catalogue: ToneCatalogue
  onOpen: (key: string) => void
  onAdd: () => void
}) {
  if (tones === null) return <p className="tiny px-[12px] py-[10px]">chargement des tons…</p>
  if (tones.length === 0 && !catalogue.creatingNew) {
    return (
      <div className="empty px-[16px] py-[24px] text-[13px]" id="tonesEmpty">
        <b>Ce monde n'a pas encore de ton</b>
        Un ton donne une attitude et une lumière à une scène, et une expression au visage.
        Sans ton, les personnages de ce monde produisent quand même.
        <div className="mt-[14px]">
          <button type="button" className="btn primary sm" onClick={onAdd}>
            Créer le premier ton
          </button>
        </div>
      </div>
    )
  }
  const selection = !catalogue.creatingNew && catalogue.selectedKey
  return (
    <div role="listbox" aria-label="Tons du monde">
      {tones.map((tone, index) => {
        const on = selection === tone.key
        return (
          <button
            key={tone.key}
            type="button"
            role="option"
            aria-selected={on}
            data-tone-row
            tabIndex={tabIndexInList(on, index === 0, Boolean(selection))}
            className={`${ROW} ${on ? ROW_ON : ROW_OFF}`}
            onClick={() => onOpen(tone.key)}
            onKeyDown={moveFocusInList}
          >
            <span className="flex items-baseline gap-[8px]">
              <b className={`min-w-0 flex-1 truncate text-[13.5px] ${on ? '' : 'font-normal'}`}>
                {tone.label || tone.key}
                {on && catalogue.dirty && (
                  <span className="ml-[6px] text-[9px] text-warn" aria-hidden="true">
                    ●
                  </span>
                )}
              </b>
              <code className="font-code flex-none text-[11.5px] leading-[normal] text-dim">{tone.key}</code>
            </span>
            <span className="mt-[2px] block truncate text-[12px] text-dim2">
              {tone.prompt_add || 'aucun fragment de prompt'}
            </span>
          </button>
        )
      })}
    </div>
  )
}

export function CatalogueColumn({
  world,
  tab,
  onTab,
  ordinaryCount,
  adultCount,
  ordinary,
  adult,
  ordinaryEditor,
  adultEditor,
  ordinaryError,
  adultError,
  tones,
  toneCatalogue,
  tonesError,
  tonesCount,
  narrow,
  worlds,
  onSelectWorld,
  onOpenPlace,
  onAddPlace,
}: {
  world: WorldSummary
  tab: CatalogueTab
  onTab: (tab: CatalogueTab) => void
  ordinaryCount: number
  adultCount: number
  ordinary: Place[] | null
  adult: Place[] | null
  ordinaryEditor: CatalogueEditor
  adultEditor: CatalogueEditor
  ordinaryError: string | null
  adultError: string | null
  tones: WorldTone[] | null
  toneCatalogue: ToneCatalogue
  tonesError: string | null
  tonesCount: number
  /* Under 1100 px the registry column is gone (§S8) and its choice comes back
     here as a select — never as a hidden list, which would make the other
     worlds unreachable on a laptop. */
  narrow: boolean
  worlds: WorldSummary[]
  onSelectWorld: (id: string) => void
  onOpenPlace: (id: string) => void
  onAddPlace: () => void
}) {
  const error = tab === 'adulte' ? adultError : tab === 'tons' ? tonesError : ordinaryError

  return (
    <Tabs.Root
      value={tab}
      onValueChange={(value) => onTab(value as CatalogueTab)}
      className="flex h-full min-h-0 flex-col"
    >
      <div className="flex-none border-b border-b-line px-[14px] pt-[12px] pb-[10px]">
        {narrow ? (
          <>
            <label className="sr-only" htmlFor="worldPick">
              monde
            </label>
            <select
              id="worldPick"
              className="mb-[8px]"
              value={world.id}
              onChange={(event) => onSelectWorld(event.target.value)}
            >
              {worlds.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.label}
                </option>
              ))}
            </select>
          </>
        ) : (
          <div className="flex items-baseline gap-[10px]">
            <b className="min-w-0 truncate text-[18px] font-[650]">{world.label}</b>
            <code className="font-code text-[12px] leading-[normal] text-dim2">{world.id}</code>
          </div>
        )}

        <div className="mt-[8px] flex flex-wrap gap-[6px]">
          {(world.compatible_families ?? []).map((family) => (
            <span
              key={family}
              className="rounded-[5px] border border-line2 px-[7px] py-[1px] text-[11.5px] text-dim"
            >
              {family}
            </span>
          ))}
          {/* No tone, no chip: an empty « ton : » would be a field, not a fact. */}
          {/* TRONQUEE. Un ton est une phrase (« calm and unhurried: natural
              light, lived-in interiors… ») : entiere, l'etiquette devenait un
              bloc de deux lignes large comme la colonne, et l'en-tete ne se
              lisait plus d'un coup. Le texte entier reste au survol. */}
          {world.tone && (
            <span
              className="max-w-full truncate rounded-[5px] border border-line2 px-[7px] py-[1px]
                         text-[11.5px] text-dim"
              title={world.tone}
            >
              ambiance : {world.tone}
            </span>
          )}
        </div>
      </div>

      <Tabs.List className="flex flex-none border-b border-b-line px-[8px]" aria-label="Catalogues du monde">
        <Tabs.Trigger
          value="ordinaire"
          className={`${TRIGGER} ${tab === 'ordinaire' ? TRIGGER_ON : TRIGGER_OFF}`}
        >
          Ordinaire <span className="text-[11.5px] tabular-nums opacity-70">{ordinaryCount}</span>
        </Tabs.Trigger>
        <Tabs.Trigger
          value="adulte"
          className={`${TRIGGER} ${tab === 'adulte' ? TRIGGER_ON_WARN : TRIGGER_OFF}`}
        >
          Adulte <span className="text-[11.5px] tabular-nums opacity-70">{adultCount}</span>
        </Tabs.Trigger>
        <Tabs.Trigger
          value="tons"
          className={`${TRIGGER} ${tab === 'tons' ? TRIGGER_ON : TRIGGER_OFF}`}
        >
          Tons <span className="text-[11.5px] tabular-nums opacity-70">{tonesCount}</span>
        </Tabs.Trigger>
      </Tabs.List>

      {/* `flex` N'EST PAS SUR LE PANNEAU LUI-MEME, et ce n'est pas un detail
          de style : Radix pose `hidden` sur le panneau inactif, et la regle du
          navigateur `[hidden]{display:none}` perd contre une utilitaire
          `.flex` de meme specificite ecrite par la feuille. Mesure a l'audit :
          le panneau Ordinaire, vide mais affiche, prenait sa part de `flex-1`
          et poussait le bandeau adulte et sa liste tout en bas de la colonne.
          La colonne interieure porte la mise en page, le panneau ne porte que
          sa hauteur. */}
      <Tabs.Content value="ordinaire" id="ordinaireBlock" className="min-h-0 flex-1">
        <div className="flex h-full min-h-0 flex-col">
          {ordinaryError && (
            <p className="m-0 px-[14px] py-[9px] text-[12px] text-danger-txt" role="alert">
              {ordinaryError}
            </p>
          )}
          <div className="min-h-0 flex-1 overflow-y-auto py-[4px]">
            <PlaceRows
              places={ordinary}
              editor={ordinaryEditor}
              onOpen={onOpenPlace}
              emptyState={
                <>
                  <b>Catalogue vide</b>
                  Ajoute un premier lieu pour que les personnages de ce monde puissent y composer
                  des scènes.
                </>
              }
            />
          </div>
        </div>
      </Tabs.Content>

      <Tabs.Content value="adulte" id="adulteBlock" className="min-h-0 flex-1">
        <div className="flex h-full min-h-0 flex-col">
          {/* §S4.5 — a square, not a ⚠: this states a register, it does not warn
              of an incident. Same sentence as before, and the file it writes. */}
          <p className="m-0 flex flex-none items-start gap-[8px] border-b border-b-warn-line
                        bg-warn-bg px-[14px] py-[10px] text-[12px] leading-[1.45] text-warn-txt">
            <span aria-hidden="true" className="mt-[3px] text-[8px]">
              ■
            </span>
            <span>
              Des cadres, jamais une tenue. Ces lieux n'apparaissent dans aucune banque ordinaire.
              Une scène qui en dérive ne se voit qu'au cran natif d'un personnage armé.
              <code className="font-code ml-[4px] text-[11.5px] leading-[normal]">
                WORLDS/{world.id}.adulte.json
              </code>
            </span>
          </p>
          {adultError && (
            <p className="m-0 px-[14px] py-[9px] text-[12px] text-danger-txt" role="alert">
              {adultError}
            </p>
          )}
          <div className="min-h-0 flex-1 overflow-y-auto py-[4px]">
            <PlaceRows
              places={adult}
              editor={adultEditor}
              onOpen={onOpenPlace}
              emptyState={
                <>
                  <b>Aucun lieu adulte</b>
                  Ce monde se livre sans branche adulte. En ajouter un crée son catalogue ; le
                  retirer entièrement le supprime.
                </>
              }
            />
          </div>
        </div>
      </Tabs.Content>

      <Tabs.Content value="tons" id="tonsBlock" className="min-h-0 flex-1">
        <div className="flex h-full min-h-0 flex-col">
          {tonesError && (
            <p className="m-0 px-[14px] py-[9px] text-[12px] text-danger-txt" role="alert">
              {tonesError}
            </p>
          )}
          <div className="min-h-0 flex-1 overflow-y-auto py-[4px]">
            <ToneRows tones={tones} catalogue={toneCatalogue} onOpen={onOpenPlace} onAdd={onAddPlace} />
          </div>
        </div>
      </Tabs.Content>

      <div className="flex-none border-t border-t-line p-[10px]">
        <button
          type="button"
          className="w-full cursor-pointer rounded-card border border-dashed border-line2
                     bg-transparent px-[13px] py-[8px] text-[13px] text-dim hover:border-dim2 hover:text-txt"
          onClick={onAddPlace}
          disabled={Boolean(error)}
        >
          {tab === 'adulte' ? '+ Ajouter un lieu adulte' : tab === 'tons' ? '+ Ajouter un ton' : '+ Ajouter un lieu'}
        </button>
      </div>
    </Tabs.Root>
  )
}
