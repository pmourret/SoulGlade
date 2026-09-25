/* The entry gate: the character registry, at /characters.

   THE GATE. With no character open there is no workshop to navigate, so the
   chrome shows no categories here, and choosing a character is what MAKES you
   enter (`selectCharacter(id, { to })`, one call — selecting then navigating
   separately dropped `?character=`).

   A LIST WITH A PREVIEW (design-pass screen-14, 25/09/2026). The grid of
   cards became a table read down the page, with a 360 px preview of the row
   under the pointer or the focus. ↑ ↓ walk the rows, Entrée follows the link
   natively. The search filters client side (`characterFilter.ts`). */
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

import { errorOf, type Schema } from '../../api/client'
import { useApi } from '../../api/useApi'
import { useCharacter, type CharacterRow as Row } from '../../character/CharacterContext'
import { Icon } from '../../chrome/Icon'
import { useFaults } from '../../state/FaultsContext'
import { PATHS } from '../../app/routes'
import { CharacterPreview } from './CharacterPreview'
import { CharacterRow, ROW_GRID } from './CharacterRow'
import { filterCharacters } from './characterFilter'

type CharacterListResponse = Schema<'CharacterListResponse'>

/* Produire is the studio's working screen: where a pick lands. */
const AFTER_PICK = PATHS.produce

/* `data-char-card` + `data-new` are what the smoke tests look for: the button
   stays reachable on an EMPTY registry, or a fresh machine has no way in. */
function NewCharacterLink({ large = false }: { large?: boolean }) {
  return (
    <Link
      className={`btn primary ${large ? 'mt-[16px] px-[18px] py-[10px] text-[15px]' : ''}`}
      to={PATHS.wizard}
      data-char-card
      data-new
    >
      + Nouveau personnage
    </Link>
  )
}

function Skeleton() {
  return (
    <div aria-hidden="true">
      {[0, 1, 2, 3].map((index) => (
        <div key={index} className={`${ROW_GRID} h-[60px] border-b border-line px-[12px]`}>
          <span className="h-[44px] w-[36px] rounded-[6px] bg-panel2 motion-safe:animate-pulse" />
          <span className="h-[12px] w-[40%] rounded-[3px] bg-panel2 motion-safe:animate-pulse" />
          <span className="h-[10px] w-[60%] rounded-[3px] bg-panel2 motion-safe:animate-pulse" />
          <span className="h-[10px] w-[50%] rounded-[3px] bg-panel2 motion-safe:animate-pulse" />
          <span />
        </div>
      ))}
    </div>
  )
}

export function CharactersScreen() {
  const api = useApi()
  const { claimed, selectCharacter } = useCharacter()
  const { report } = useFaults()
  const [rows, setRows] = useState<Row[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [query, setQuery] = useState('')
  const [activeId, setActiveId] = useState<string | null>(null)
  const rowNodes = useRef(new Map<string, HTMLAnchorElement>())

  const load = useCallback(async () => {
    setFailed(false)
    let response: (CharacterListResponse & { ok?: boolean; erreur?: string }) | null = null
    try {
      response = await api.get<CharacterListResponse>('/api/characters')
    } catch {
      report('registre', 'liste des personnages illisible')
      setFailed(true)
      return
    }
    const failure = errorOf(response) || (Array.isArray(response.characters) ? null : 'liste illisible')
    if (failure) {
      report('registre', `liste des personnages : ${failure}`)
      setFailed(true)
      return
    }
    report('registre', null)
    setRows(response.characters)
  }, [api, report])

  useEffect(() => {
    void load()
  }, [load])

  const pick = (id: string) => selectCharacter(id, { to: AFTER_PICK })

  if (failed) {
    return (
      <div className="screen flex items-center justify-center" id="registre" data-vue="sas">
        <div className="max-w-[420px] rounded-card border border-line bg-panel px-[24px] py-[22px] text-center">
          <b className="flex items-center justify-center gap-[8px] text-[16px] text-txt">
            <i className="h-[8px] w-[8px] rotate-45 bg-bad" aria-hidden="true" />
            Registre indisponible
          </b>
          <p className="mt-[6px] mb-[14px] text-[13px] text-dim">
            La liste des personnages n'a pas pu être lue. Le détail est dans le bandeau
            en haut de l'écran.
          </p>
          <button type="button" className="btn" onClick={() => void load()}>
            Réessayer
          </button>
        </div>
      </div>
    )
  }

  const shown = rows ? filterCharacters(rows, query) : []
  /* The preview: the row under the pointer or the focus, else the open
     character, else the first line. */
  const previewRow =
    shown.find((row) => row.id === activeId) ??
    shown.find((row) => row.id === claimed) ??
    shown[0] ??
    null
  const tabStopId = previewRow?.id ?? null

  const onListKey = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
    const index = shown.findIndex((row) => rowNodes.current.get(row.id) === document.activeElement)
    const next = shown[index < 0 ? 0 : index + (event.key === 'ArrowDown' ? 1 : -1)]
    if (!next) return
    event.preventDefault()
    rowNodes.current.get(next.id)?.focus()
  }

  const empty = rows !== null && rows.length === 0

  return (
    <div className="screen flex min-h-0" id="registre" data-vue="sas">
      <div className="min-w-0 flex-1 overflow-y-auto px-[40px] py-[32px] max-[1100px]:px-[20px]">
        <div className="mb-[20px] flex flex-wrap items-end gap-[16px]">
          <div className="min-w-0 flex-1">
            <h1 className="m-0 text-[24px] font-[650] text-txt">Personnages</h1>
            <p className="mt-[4px] mb-0 text-[13px] text-dim">
              Ouvrir un personnage charge le studio sur sa production.
            </p>
          </div>
          {!empty && (
            <label className="relative block w-[240px]">
              <span className="sr-only">Rechercher un personnage</span>
              <Icon name="search" className="pointer-events-none absolute top-1/2 left-[9px] h-[14px] w-[14px] -translate-y-1/2 text-dim2" />
              <input
                type="search"
                id="charSearch"
                className="w-full pl-[30px]"
                placeholder="Nom, type, monde…"
                autoComplete="off"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
          )}
          {!empty && <NewCharacterLink />}
        </div>

        {!empty && (
          <div
            className={`${ROW_GRID} lab border-b border-line px-[12px] pb-[6px]`}
            aria-hidden="true"
          >
            <span />
            <span>Nom</span>
            <span>Type</span>
            <span>Monde</span>
            <span />
          </div>
        )}

        <div id="charGrid" role="list" aria-label="Personnages" onKeyDown={onListKey}>
          {rows === null && <Skeleton />}
          {empty && (
            <div className="empty">
              <b>Aucun personnage.</b>
              Le dossier CHARACTERS/ est vide sur cette machine.
              <div>
                <NewCharacterLink large />
              </div>
            </div>
          )}
          {rows !== null && !empty && shown.length === 0 && (
            <p className="py-[28px] text-center text-[13px] text-dim">
              Aucun personnage ne correspond à « {query.trim()} ».{' '}
              <button type="button" className="link" onClick={() => setQuery('')}>
                Effacer
              </button>
            </p>
          )}
          {shown.map((row) => (
            <div role="listitem" key={row.id}>
              <CharacterRow
                row={row}
                current={row.id === claimed}
                active={row.id === previewRow?.id && activeId !== null}
                tabIndex={row.id === tabStopId ? 0 : -1}
                rowRef={(el) => {
                  if (el) rowNodes.current.set(row.id, el)
                  else rowNodes.current.delete(row.id)
                }}
                onOpen={() => pick(row.id)}
                onActivate={() => setActiveId(row.id)}
              />
            </div>
          ))}
        </div>

        {shown.length > 0 && (
          <p className="mt-[14px] text-[12px] text-dim2">
            ↑ ↓ pour parcourir, Entrée pour ouvrir. Ctrl + clic ouvre dans un nouvel onglet.
          </p>
        )}
      </div>

      {rows === null && (
        <div className="w-[360px] flex-none border-l border-line bg-panel p-[24px] max-[1100px]:hidden" aria-hidden="true">
          <div className="aspect-[4/5] w-full rounded-card bg-panel2 motion-safe:animate-pulse" />
        </div>
      )}
      {previewRow && <CharacterPreview row={previewRow} onOpen={() => pick(previewRow.id)} />}
    </div>
  )
}
