/* The book of a world (design-pass 19 §S4): what makes it ready to produce,
   its mood in full, then its chapters in reading order: where (places), what
   for (intentions), what (scenes, each an intention in a place), how (tones,
   optional), and the adult branch delivered apart, folded.

   IT REPLACED FOUR TABS OF FLAT LISTS. A world is made of things that point at
   each other, and tabs showed one at a time: a scene read as a name and a
   line, its place and intention three tabs away. Here the scenes sit under
   their intention and say their place, and a new scene starts from the
   sentence that defines it.

   THE ADULT BRANCH IS ANNOUNCED, NEVER IMPOSED (arbitration of 21/09): folded,
   the chapter says only how many scenes it holds. Its cards, banner and file
   appear on « Afficher ».

   Presentation only — props and callbacks, no API call. */
import type { Ref } from 'react'

import { AddCard, BookCard, BookChapter, CardGrid, EmptyRow } from './BookChapter'
import { BookToc } from './BookToc'
import { blockOf, type Chapter } from './bookChapters'
import { SceneSentence } from './SceneSentence'
import type { WorldIntention, WorldPlace, WorldScene } from './useWorldCatalog'
import type { WorldSummary } from './useWorldRegistry'
import type { WorldTone } from './useWorldTones'

/** Which branch of scenes is shown: the adult chapter folded or unfolded. */
export type SceneBranch = 'ordinaires' | 'adultes'

/** What the inspector holds, as the book needs it to mark a card. */
export type BookSelection = {
  chapter: Chapter
  id: string | null
  creating: boolean
  /** « modifié » / « modifiée » while unsaved, else null. */
  dirty: string | null
}

const plural = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`
const scenesWord = (n: number) => (n ? plural(n, 'scène', 'scènes') : 'aucune scène')

export function WorldBook({
  world,
  bookRef,
  onScroll,
  counts,
  current,
  places,
  intentions,
  scenes,
  adult,
  tones,
  errors,
  selection,
  branch,
  onBranch,
  onOpen,
  onAdd,
  onCreateScene,
  onGo,
}: {
  world: WorldSummary
  bookRef: Ref<HTMLDivElement>
  onScroll: () => void
  counts: Record<Chapter, number>
  /** The chapter the table of contents marks. */
  current: Chapter
  places: WorldPlace[] | null
  intentions: WorldIntention[] | null
  scenes: WorldScene[] | null
  adult: WorldScene[] | null
  tones: WorldTone[] | null
  errors: Record<Chapter, string | null>
  selection: BookSelection
  branch: SceneBranch
  onBranch: (branch: SceneBranch) => void
  onOpen: (chapter: Chapter, id: string) => void
  onAdd: (chapter: Chapter) => void
  onCreateScene: (chapter: 'scenes' | 'adultes', intention: string, place: string) => void
  onGo: (chapter: Chapter) => void
}) {
  const allScenes = [...(scenes ?? []), ...(adult ?? [])]
  const using = (field: 'place' | 'intention', value: string) => allScenes.filter((s) => s[field] === value).length
  const placeLabel = (id?: string | null) => (id ? (places?.find((p) => p.id === id)?.label || id) : '')
  const toneLabel = (key?: string | null) => (key ? (tones?.find((t) => t.key === key)?.label || key) : '')

  const has = { place: counts.lieux > 0, intention: counts.intentions > 0, scene: counts.scenes > 0, tone: counts.tons > 0 }
  const lacking = [!has.place && 'un lieu', !has.intention && 'une intention', !has.scene && 'une scène'].filter(
    Boolean,
  ) as string[]
  // The first empty required chapter carries the primary button (§S4, D2).
  const primary: Chapter | null = !has.place ? 'lieux' : !has.intention ? 'intentions' : null

  const isOn = (chapter: Chapter, id: string) => selection.chapter === chapter && !selection.creating && selection.id === id
  const hasSelection = (chapter: Chapter) => selection.chapter === chapter && !selection.creating && !!selection.id
  const addId = (chapter: Chapter) => (selection.chapter === chapter ? 'btnAddEntry' : undefined)
  const sentenceLists = {
    intentions: (intentions ?? []).map((i) => ({ key: i.key, label: i.label || i.key })),
    places: (places ?? []).map((p) => ({ id: p.id, label: p.label || p.id })),
  }

  const sceneCards = (chapter: 'scenes' | 'adultes', list: WorldScene[]) => {
    /* Grouped by intention, in the order of the intentions chapter; a scene
       whose intention the world does not hold goes with « Sans intention ». */
    const known = new Set((intentions ?? []).map((i) => i.key))
    const groups = [
      ...(intentions ?? []).map((i) => ({ key: i.key, label: `${i.icon ? `${i.icon} ` : ''}${i.label || i.key}` })),
      { key: '', label: 'Sans intention' },
    ]
      .map((g) => ({ ...g, scenes: list.filter((s) => (known.has(s.intention ?? '') ? s.intention : '') === g.key) }))
      .filter((g) => g.scenes.length)
    let index = 0
    return (
      <div className="flex flex-col gap-[14px]" data-arrow-group>
        {groups.map((g) => (
          <div key={g.key || '-'}>
            <p className="lab m-0 mb-[6px]">
              {g.label} · {g.scenes.length}
            </p>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-[10px]">
              {g.scenes.map((s) => (
                <BookCard
                  key={s.id}
                  rowAttr="data-entry-row"
                  rowId={s.id}
                  on={isOn(chapter, s.id)}
                  dirty={selection.dirty}
                  first={index++ === 0}
                  hasSelection={hasSelection(chapter)}
                  onOpen={() => onOpen(chapter, s.id)}
                >
                  <b className="w-full truncate text-[13px] font-medium">{s.label || s.id}</b>
                  <span className="w-full truncate text-[12px] text-dim2">
                    {s.place ? `au ${placeLabel(s.place)}` : 'sans lieu'}
                  </span>
                  {s.intensity != null && (
                    <span className="text-[11.5px] text-dim2">à partir du niveau {s.intensity}</span>
                  )}
                </BookCard>
              ))}
            </div>
          </div>
        ))}
      </div>
    )
  }

  const loading = <p className="tiny m-0">chargement…</p>

  return (
    <div ref={bookRef} id="worldPlaces" onScroll={onScroll} className="relative min-h-0 min-w-0 flex-1 overflow-y-auto">
      <BookToc counts={counts} current={current} onGo={onGo} pills />

      <div className="mx-auto flex max-w-[960px] flex-col gap-[28px] px-[24px] py-[18px]">
        {/* §S4.1 — the boxes tick themselves; the sentence says the state, the
            box is only its echo (a state is never said by colour alone). */}
        <div className="rounded-card border border-line bg-panel px-[16px] py-[12px]" id="worldReady">
          <p className="lab m-0">Prêt à produire</p>
          <p className="m-0 mt-[4px] text-[13px]">
            {lacking.length
              ? `Pas encore : il manque ${lacking.join(', ')}. Les tons restent facultatifs.`
              : `Oui : ses personnages reçoivent ${plural(counts.scenes, 'scène', 'scènes')}.`}
          </p>
          <ul className="m-0 mt-[10px] flex list-none flex-wrap gap-x-[18px] gap-y-[6px] p-0 text-[12.5px] text-dim">
            {(
              [
                [has.place, 'un lieu'],
                [has.intention, 'une intention'],
                [has.scene, 'une scène'],
                [has.tone, 'des tons (facultatif)'],
              ] as const
            ).map(([done, label]) => (
              <li key={label} className="flex items-center gap-[7px]">
                <span
                  aria-hidden="true"
                  className={`flex h-[14px] w-[14px] items-center justify-center rounded-[3px] text-[11px] leading-none ${
                    done ? 'bg-acc text-on-acc' : 'border border-line2'
                  }`}
                >
                  {done ? '✓' : ''}
                </span>
                {label}
              </li>
            ))}
          </ul>
        </div>

        {world.tone && (
          <div>
            <p className="lab m-0 mb-[4px]">Ambiance</p>
            <p className="m-0 text-[13px] text-dim">{world.tone}</p>
          </div>
        )}

        <BookChapter
          block={blockOf('lieux')}
          question="Où ?"
          line={`Lieux · ${counts.lieux} · des décors, sans action ni lumière`}
          error={errors.lieux}
        >
          {places === null ? (
            loading
          ) : places.length === 0 ? (
            <EmptyRow action="+ Premier lieu" primary={primary === 'lieux'} actionId={addId('lieux')} onAction={() => onAdd('lieux')}>
              Un lieu est un décor : où l'on est, sans action ni lumière. Plusieurs scènes, de plusieurs intentions,
              puisent dans le même lieu.
            </EmptyRow>
          ) : (
            <CardGrid label="Lieux du monde">
              {places.map((p, i) => (
                <BookCard
                  key={p.id}
                  rowAttr="data-entry-row"
                  rowId={p.id}
                  on={isOn('lieux', p.id)}
                  dirty={selection.dirty}
                  first={i === 0}
                  hasSelection={hasSelection('lieux')}
                  onOpen={() => onOpen('lieux', p.id)}
                >
                  <b className="w-full truncate text-[13px] font-semibold">{p.label || p.id}</b>
                  <span className="font-code line-clamp-2 w-full text-[12px] leading-[1.4] text-dim">{p.prompt}</span>
                  <span className="text-[11.5px] text-dim2">{scenesWord(using('place', p.id))}</span>
                </BookCard>
              ))}
              <AddCard id={addId('lieux')} label="+ Lieu" onAdd={() => onAdd('lieux')} />
            </CardGrid>
          )}
        </BookChapter>

        <BookChapter
          block={blockOf('intentions')}
          question="Pour quoi ?"
          line={`Intentions · ${counts.intentions} · ce que les personnages veulent montrer`}
          error={errors.intentions}
        >
          {intentions === null ? (
            loading
          ) : intentions.length === 0 ? (
            <EmptyRow
              action="+ Première intention"
              primary={primary === 'intentions'}
              actionId={addId('intentions')}
              onAction={() => onAdd('intentions')}
            >
              Ce que les personnages de ce monde veulent montrer : lifestyle, sport, voyage… Une intention vaut à tous
              les niveaux.
            </EmptyRow>
          ) : (
            <CardGrid label="Intentions du monde">
              {intentions.map((it, i) => (
                <BookCard
                  key={it.key}
                  rowAttr="data-entry-row"
                  rowId={it.key}
                  on={isOn('intentions', it.key)}
                  dirty={selection.dirty}
                  first={i === 0}
                  hasSelection={hasSelection('intentions')}
                  onOpen={() => onOpen('intentions', it.key)}
                >
                  <b className="w-full truncate text-[13px] font-semibold">
                    {it.icon ? `${it.icon} ` : ''}
                    {it.label || it.key}
                  </b>
                  <span className="w-full truncate text-[12px] text-dim">{it.prompt_add || 'aucun fragment de prompt'}</span>
                  {it.defaults?.tone && (
                    <span className="w-full truncate text-[11.5px] text-dim2">ton proposé : {toneLabel(it.defaults.tone)}</span>
                  )}
                  <span className="text-[11.5px] text-dim2">{scenesWord(using('intention', it.key))}</span>
                </BookCard>
              ))}
              <AddCard id={addId('intentions')} label="+ Intention" onAdd={() => onAdd('intentions')} />
            </CardGrid>
          )}
        </BookChapter>

        <BookChapter
          block={blockOf('scenes')}
          question="Quoi ?"
          line={`Scènes · ${counts.scenes} · une intention dans un lieu, et ce qui s'y passe`}
          error={errors.scenes}
          dimmed={!has.place || !has.intention}
        >
          <SceneSentence
            prefix="sceneNew"
            {...sentenceLists}
            createId={addId('scenes')}
            onCreate={(intention, place) => onCreateScene('scenes', intention, place)}
            onGoTo={onGo}
          />
          {scenes === null ? (
            loading
          ) : scenes.length === 0 ? (
            <EmptyRow>Pas encore de scène. Les personnages de ce monde la produisent telle quelle.</EmptyRow>
          ) : (
            sceneCards('scenes', scenes)
          )}
        </BookChapter>

        <BookChapter
          block={blockOf('tons')}
          question="Comment ?"
          line={`Tons · ${counts.tons} · facultatifs : une attitude, une lumière, une expression`}
          error={errors.tons}
        >
          {tones === null ? (
            loading
          ) : tones.length === 0 ? (
            <EmptyRow id="tonesEmpty" action="+ Premier ton" actionId={addId('tons')} onAction={() => onAdd('tons')}>
              <b className="font-semibold text-txt">Ce monde n'a pas encore de ton.</b> Un ton donne une attitude et une
              lumière à une scène, et une expression au visage. Sans ton, les personnages de ce monde produisent quand
              même.
            </EmptyRow>
          ) : (
            <CardGrid label="Tons du monde">
              {tones.map((t, i) => (
                <BookCard
                  key={t.key}
                  rowAttr="data-tone-row"
                  rowId={t.key}
                  on={isOn('tons', t.key)}
                  dirty={selection.dirty}
                  first={i === 0}
                  hasSelection={hasSelection('tons')}
                  onOpen={() => onOpen('tons', t.key)}
                >
                  <b className="w-full truncate text-[13px] font-semibold">{t.label || t.key}</b>
                  <span className="line-clamp-2 w-full text-[12px] leading-[1.4] text-dim">
                    {t.prompt_add || 'aucun fragment de prompt'}
                  </span>
                </BookCard>
              ))}
              <AddCard id={addId('tons')} label="+ Ton" onAdd={() => onAdd('tons')} />
            </CardGrid>
          )}
        </BookChapter>

        <BookChapter
          block={blockOf('adultes')}
          question="Adultes"
          line={`Scènes adultes · ${counts.adultes} · livrées à part`}
          error={branch === 'adultes' ? errors.adultes : null}
        >
          {branch === 'ordinaires' ? (
            <EmptyRow action="Afficher" actionId="branchAdultes" onAction={() => onBranch('adultes')}>
              {counts.adultes
                ? `${plural(counts.adultes, 'scène adulte', 'scènes adultes')}, livrée${counts.adultes > 1 ? 's' : ''} à part. Leur contenu n'apparaît qu'à la demande.`
                : 'Pas de branche adulte : ce monde se livre sans elle.'}
            </EmptyRow>
          ) : (
            <>
              <div className="mb-[12px] flex items-start gap-[12px]">
                {/* §S4.5 of screen-11 — a square, not a ⚠: this states a
                    register, it does not warn of an incident. */}
                <p
                  id="adulteBanner"
                  className="m-0 flex min-w-0 flex-1 items-start gap-[8px] rounded-card border border-warn-line bg-warn-bg
                             px-[14px] py-[10px] text-[12px] leading-[1.45] text-warn-txt"
                >
                  <span aria-hidden="true" className="mt-[3px] text-[8px]">
                    ■
                  </span>
                  <span>
                    Les mêmes lieux et intentions, jamais une tenue. Ces scènes ne se voient qu'au cran natif d'un
                    personnage armé, et se livrent à part.
                    <code className="font-code ml-[4px] text-[11.5px] leading-[normal]">WORLDS/{world.id}.adulte.json</code>
                  </span>
                </p>
                <button type="button" id="branchOrdinaires" className="btn sm flex-none" onClick={() => onBranch('ordinaires')}>
                  Masquer
                </button>
              </div>
              <SceneSentence
                prefix="adultNew"
                {...sentenceLists}
                createId={addId('adultes')}
                onCreate={(intention, place) => onCreateScene('adultes', intention, place)}
                onGoTo={onGo}
              />
              {adult === null ? (
                loading
              ) : adult.length === 0 ? (
                <EmptyRow>
                  Pas de branche adulte. Ce monde se livre sans elle. Ajouter une scène la crée ; les retirer toutes la
                  supprime.
                </EmptyRow>
              ) : (
                sceneCards('adultes', adult)
              )}
            </>
          )}
        </BookChapter>
      </div>
    </div>
  )
}
