/* The middle column (design-pass screen-11 §S4): what a world IS at the top,
   its four catalogs as tabs — Lieux, Intentions, Scènes, Tons (ADR-0027,
   IT-11 chantier 4) — their entries as rows, and the button that adds one.
   Presentation only — props and callbacks, no API call.

   FOUR TABS, NOT FIVE: five do not fit the column at 340 px. The adult branch
   lives INSIDE the Scènes tab, behind « Ordinaires | Adultes », because it IS
   a scenes catalog delivered apart (ADR-0027 §6). The 21/09 arbitration holds:
   its count is announced, its content appears only once it is picked.

   RADIX OWNS THE KEYBOARD, as it does for the inspector of Produire
   (`screens/produce/ProduceInspector.tsx`): tablist roles, arrows, Home/End. */
import * as Tabs from '@radix-ui/react-tabs'

import { moveFocusInList, tabIndexInList } from './listKeys'
import type { ToneCatalogue } from './useToneCatalogue'
import type { WorldTone } from './useWorldTones'
import type { WorldSummary } from './useWorldRegistry'

export type CatalogueTab = 'lieux' | 'intentions' | 'scenes' | 'tons'
/** Which branch of the Scènes tab is open: the world's scenes, or its adult
    branch (`WORLDS/<id>.adulte.json`, ADR-0027 §6). */
export type SceneBranch = 'ordinaires' | 'adultes'

const TRIGGER =
  'flex-none cursor-pointer border-0 bg-transparent px-[10px] py-[9px] text-[13px] ' +
  'focus-visible:outline-2 focus-visible:outline-focus focus-visible:outline-offset-[-2px]'
const TRIGGER_OFF = 'text-dim hover:text-txt'
const TRIGGER_ON = 'font-semibold text-txt [box-shadow:inset_0_-2px_0_var(--txt)]'

const ROW =
  'block w-full cursor-pointer border-y-0 border-r-0 border-l-2 bg-transparent ' +
  'px-[10px] py-[7px] text-left ' +
  'focus-visible:outline-2 focus-visible:outline-focus focus-visible:outline-offset-[-2px]'
const ROW_ON = 'border-l-acc bg-panel3'
const ROW_OFF = 'border-l-transparent hover:bg-panel'

/** What a row of a catalog shows: its name, a tag on the right, one line. */
export type RowView = { id: string; title: string; tag?: string; line: string }

/** The editor state a list needs to draw its selection and its pending dot. */
type ListState = { creatingNew: boolean; selectedId: string | null; dirty: boolean }

/** One catalog as the column receives it: rows, list state, load error, count. */
export type ColumnCatalog = {
  rows: RowView[] | null
  editor: ListState
  error: string | null
  count: number
}

function EntryRows({
  rows,
  editor,
  label,
  emptyState,
  onOpen,
}: {
  rows: RowView[] | null
  editor: ListState
  label: string
  emptyState: React.ReactNode
  /* NOT `editor.open` directly: opening another entry throws away what is
     typed in the inspector, so the screen asks first (§S1). */
  onOpen: (id: string) => void
}) {
  if (rows === null) return <p className="tiny px-[12px] py-[10px]">chargement…</p>
  if (rows.length === 0 && !editor.creatingNew) {
    return <div className="empty px-[16px] py-[24px] text-[13px]">{emptyState}</div>
  }
  const selection = !editor.creatingNew && editor.selectedId
  return (
    <div role="listbox" aria-label={label}>
      {rows.map((row, index) => {
        const on = selection === row.id
        return (
          <button
            key={row.id}
            type="button"
            role="option"
            aria-selected={on}
            data-entry-row={row.id}
            tabIndex={tabIndexInList(on, index === 0, Boolean(selection))}
            className={`${ROW} ${on ? ROW_ON : ROW_OFF}`}
            onClick={() => onOpen(row.id)}
            onKeyDown={moveFocusInList}
          >
            <span className="flex items-baseline gap-[8px]">
              <b className={`min-w-0 flex-1 truncate text-[13.5px] ${on ? '' : 'font-normal'}`}>
                {row.title}
                {/* An entry edited but not saved carries a dot, so the list and
                    the banner agree on what is pending (§S4.3). */}
                {on && editor.dirty && (
                  <span className="ml-[6px] text-[9px] text-warn" aria-hidden="true">
                    ●
                  </span>
                )}
              </b>
              {row.tag && <span className="flex-none text-[11.5px] text-dim">{row.tag}</span>}
            </span>
            <span className="mt-[2px] block truncate text-[12px] text-dim2">{row.line || '—'}</span>
          </button>
        )
      })}
    </div>
  )
}

/* The tones of the world (IT-10, 25/09). Same row shape: the name, then the
   fragment one reads to know what the tone does to an image. */
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

function Panel({ error, children }: { error: string | null; children: React.ReactNode }) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      {error && (
        <p className="m-0 px-[14px] py-[9px] text-[12px] text-danger-txt" role="alert">
          {error}
        </p>
      )}
      <div className="min-h-0 flex-1 overflow-y-auto py-[4px]">{children}</div>
    </div>
  )
}

function EmptyWithAction({
  title,
  children,
  action,
  onAction,
}: {
  title: string
  children: React.ReactNode
  action: string
  onAction: () => void
}) {
  return (
    <>
      <b>{title}</b>
      {children}
      <div className="mt-[14px]">
        <button type="button" className="btn primary sm" onClick={onAction}>
          {action}
        </button>
      </div>
    </>
  )
}

export function CatalogueColumn({
  world,
  tab,
  onTab,
  branch,
  onBranch,
  places,
  intentions,
  scenes,
  adult,
  tones,
  toneCatalogue,
  tonesError,
  tonesCount,
  narrow,
  worlds,
  onSelectWorld,
  onOpen,
  onAdd,
}: {
  world: WorldSummary
  tab: CatalogueTab
  onTab: (tab: CatalogueTab) => void
  branch: SceneBranch
  onBranch: (branch: SceneBranch) => void
  places: ColumnCatalog
  intentions: ColumnCatalog
  scenes: ColumnCatalog
  adult: ColumnCatalog
  tones: WorldTone[] | null
  toneCatalogue: ToneCatalogue
  tonesError: string | null
  tonesCount: number
  /* Under 1100 px the registry column is gone (§S8) and its choice comes back
     here as a select — never as a hidden list. */
  narrow: boolean
  worlds: WorldSummary[]
  onSelectWorld: (id: string) => void
  onOpen: (id: string) => void
  onAdd: () => void
}) {
  const sceneCatalog = branch === 'adultes' ? adult : scenes
  const error =
    tab === 'tons'
      ? tonesError
      : tab === 'lieux'
        ? places.error
        : tab === 'intentions'
          ? intentions.error
          : sceneCatalog.error
  const addLabel = {
    lieux: '+ Ajouter un lieu',
    intentions: '+ Ajouter une intention',
    scenes: branch === 'adultes' ? '+ Ajouter une scène adulte' : '+ Ajouter une scène',
    tons: '+ Ajouter un ton',
  }[tab]

  /* A scene draws on a place and an intention: a world without them says so
     rather than offering a scene with two empty lists. */
  const lacks = places.count === 0 ? 'lieux' : intentions.count === 0 ? 'intentions' : null
  const scenesEmpty = lacks ? (
    <>
      <b>Pas encore de scène</b>
      Une scène est une intention dans un lieu, avec ce qui s'y passe. Ce monde n'a pas encore{' '}
      {lacks === 'lieux' ? 'de lieu' : 'd’intention'} : commence par là.
      <div className="mt-[14px] flex flex-wrap gap-[8px]">
        <button type="button" className="btn primary sm" onClick={() => onTab(lacks)}>
          Aller à {lacks === 'lieux' ? 'Lieux' : 'Intentions'}
        </button>
        <button type="button" className="btn sm" onClick={onAdd}>
          Créer une scène quand même
        </button>
      </div>
    </>
  ) : (
    <EmptyWithAction title="Pas encore de scène" action="Créer la première scène" onAction={onAdd}>
      Une scène est une intention dans un lieu, avec ce qui s'y passe. Les personnages de ce monde la
      produisent telle quelle.
    </EmptyWithAction>
  )

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
          {/* TRONQUEE : une ambiance est une phrase ; entiere, l'etiquette
              devenait un bloc de deux lignes. Le texte entier reste au survol. */}
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

      <Tabs.List className="flex flex-none border-b border-b-line px-[6px]" aria-label="Catalogues du monde">
        {(
          [
            ['lieux', 'Lieux', places.count],
            ['intentions', 'Intentions', intentions.count],
            ['scenes', 'Scènes', scenes.count],
            ['tons', 'Tons', tonesCount],
          ] as const
        ).map(([value, label, count]) => (
          <Tabs.Trigger key={value} value={value} className={`${TRIGGER} ${tab === value ? TRIGGER_ON : TRIGGER_OFF}`}>
            {label} <span className="text-[11.5px] tabular-nums opacity-70">{count}</span>
          </Tabs.Trigger>
        ))}
      </Tabs.List>

      {/* `flex` N'EST PAS SUR LE PANNEAU LUI-MEME : Radix pose `hidden` sur le
          panneau inactif, et `[hidden]{display:none}` perd contre une
          utilitaire `.flex` de meme specificite. La colonne interieure porte
          la mise en page, le panneau ne porte que sa hauteur. */}
      <Tabs.Content value="lieux" id="lieuxBlock" className="min-h-0 flex-1">
        <Panel error={places.error}>
          <EntryRows
            rows={places.rows}
            editor={places.editor}
            label="Lieux du monde"
            onOpen={onOpen}
            emptyState={
              <EmptyWithAction title="Pas encore de lieu" action="Créer le premier lieu" onAction={onAdd}>
                Un lieu est un décor : où l'on est, sans action ni lumière. Plusieurs scènes, de
                plusieurs intentions, puisent dans le même lieu.
              </EmptyWithAction>
            }
          />
        </Panel>
      </Tabs.Content>

      <Tabs.Content value="intentions" id="intentionsBlock" className="min-h-0 flex-1">
        <Panel error={intentions.error}>
          <EntryRows
            rows={intentions.rows}
            editor={intentions.editor}
            label="Intentions du monde"
            onOpen={onOpen}
            emptyState={
              <EmptyWithAction
                title="Pas encore d'intention"
                action="Créer la première intention"
                onAction={onAdd}
              >
                Ce que les personnages de ce monde veulent montrer : lifestyle, sport, voyage… Une
                intention vaut à tous les niveaux.
              </EmptyWithAction>
            }
          />
        </Panel>
      </Tabs.Content>

      <Tabs.Content value="scenes" id="scenesBlock" className="min-h-0 flex-1">
        <div className="flex h-full min-h-0 flex-col">
          <div className="flex flex-none items-center border-b border-b-line px-[12px] py-[8px]">
            <div role="group" aria-label="Branche des scènes" className="seg">
              <button
                type="button"
                id="branchOrdinaires"
                className={branch === 'ordinaires' ? 'on' : undefined}
                aria-pressed={branch === 'ordinaires'}
                onClick={() => onBranch('ordinaires')}
              >
                Ordinaires <span className="tabular-nums opacity-70">{scenes.count}</span>
              </button>
              <button
                type="button"
                id="branchAdultes"
                className={branch === 'adultes' ? 'on' : undefined}
                aria-pressed={branch === 'adultes'}
                onClick={() => onBranch('adultes')}
              >
                Adultes <span className="tabular-nums opacity-70">{adult.count}</span>
              </button>
            </div>
          </div>
          {branch === 'adultes' && (
            /* §S4.5 — a square, not a ⚠: this states a register, it does not
               warn of an incident. */
            <p
              id="adulteBanner"
              className="m-0 flex flex-none items-start gap-[8px] border-b border-b-warn-line
                         bg-warn-bg px-[14px] py-[10px] text-[12px] leading-[1.45] text-warn-txt"
            >
              <span aria-hidden="true" className="mt-[3px] text-[8px]">
                ■
              </span>
              <span>
                Les mêmes lieux et intentions, jamais une tenue. Ces scènes ne se voient qu'au cran
                natif d'un personnage armé, et se livrent à part.
                <code className="font-code ml-[4px] text-[11.5px] leading-[normal]">
                  WORLDS/{world.id}.adulte.json
                </code>
              </span>
            </p>
          )}
          <Panel error={sceneCatalog.error}>
            {branch === 'adultes' ? (
              <EntryRows
                rows={adult.rows}
                editor={adult.editor}
                label="Scènes adultes du monde"
                onOpen={onOpen}
                emptyState={
                  <>
                    <b>Pas de branche adulte</b>
                    Ce monde se livre sans elle. Ajouter une scène la crée ; les retirer toutes la
                    supprime.
                  </>
                }
              />
            ) : (
              <EntryRows
                rows={scenes.rows}
                editor={scenes.editor}
                label="Scènes du monde"
                onOpen={onOpen}
                emptyState={scenesEmpty}
              />
            )}
          </Panel>
        </div>
      </Tabs.Content>

      <Tabs.Content value="tons" id="tonsBlock" className="min-h-0 flex-1">
        <Panel error={tonesError}>
          <ToneRows tones={tones} catalogue={toneCatalogue} onOpen={onOpen} onAdd={onAdd} />
        </Panel>
      </Tabs.Content>

      <div className="flex-none border-t border-t-line p-[10px]">
        <button
          type="button"
          id="btnAddEntry"
          className="w-full cursor-pointer rounded-card border border-dashed border-line2
                     bg-transparent px-[13px] py-[8px] text-[13px] text-dim hover:border-dim2 hover:text-txt"
          onClick={onAdd}
          disabled={Boolean(error)}
        >
          {addLabel}
        </button>
      </div>
    </Tabs.Root>
  )
}
