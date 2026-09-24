/* JSON final — ce que la scène deviendra, et ce qui a bougé depuis le dernier
   enregistrement (design-pass screen-7c §7, option 7a).

   CE QUE ÇA REMPLACE. Un textarea en lecture seule de 260 px : la vérité,
   mais muette. Elle disait ce que la scène EST, jamais ce qu'on vient d'y
   changer, alors que c'est exactement la question qu'on se pose juste avant
   d'enregistrer. Le panneau compare désormais le brouillon à la version sur
   le disque, façon revue de code.

   LES DEUX CÔTÉS PASSENT PAR LA MÊME NORMALISATION.

       brouillon   draftsToScenes([draft])[0]
       enregistré  draftsToScenes([draftOf(saved)])[0]

   Sérialiser la scène enregistrée telle que le serveur l'a rendue produirait
   un diff permanent et faux : `draftsToScenes` retire `category` (clé morte)
   et normalise `count`/`intensity`, donc toute scène qui porte encore
   `category` s'afficherait comme modifiée alors que `sceneChanges` la dit
   intacte. Deux signaux qui se contredisent sur le même écran valent moins
   qu'un seul.

   LE DIFF EST CÔTÉ CLIENT, dans `lib/diff.ts` (LCS lignes puis mots), pur et
   testé à part (`AUTOMATION/tests/test_diff.js`). */
import { useMemo, useState } from 'react'

import { useToast } from '../../../../chrome/ToastContext'
import {
  draftOf,
  draftsToScenes,
  type Scene,
  type SceneDraft,
} from '../../../../state/ScenesStoreContext'
import { countChanges, diffLines, diffWords, type Row } from '../../../../lib/diff'
import type { SceneField } from '../../sceneChanges'
import type { SectionKey } from '../sections'
import { WordLine } from '../WordDiff'
import { HEAD } from './shared'

const LAYOUT_KEY = 'soulglade.diff.layout'
const CONTEXT = 3

/** The top-level key each line belongs to — `JSON.stringify(…, null, 2)` puts
    them at exactly two spaces of indent, so the nesting needs no parser. */
function ownerKeys(lines: string[]): string[] {
  let current = ''
  return lines.map((line) => {
    const match = line.match(/^ {2}"([^"]+)"\s*:/)
    if (match) current = match[1]
    return current
  })
}

/* Où va-t-on quand on clique une ligne modifiée. `prompt` est la seule clé
   dont la section dépend de CE QUI a changé : les trois fragments s'y
   joignent, et renvoyer toujours vers le décor enverrait au mauvais champ
   celui qui vient de toucher la lumière. */
function sectionFor(key: string, changed: Set<SceneField>): SectionKey {
  if (key === 'prompt') {
    if (changed.has('promptLight')) return 'light'
    if (changed.has('promptPose')) return 'pose'
    return 'recap'
  }
  if (key === 'variants') return 'light'
  if (key === 'wardrobe') return 'clothing'
  if (key === 'pose') return 'pose'
  return 'general'
}

/* Coloration syntaxique d'UNE ligne de JSON. Volontairement naïve : le texte
   vient de `JSON.stringify`, donc il est déjà régulier — pas de commentaire,
   pas de guillemet exotique, une paire clé/valeur par ligne. Elle ne sert que
   la vue « Tout » : dans la vue « Comparer », c'est le diff qui colore, et
   deux grilles de couleur sur le même texte se liraient l'une contre
   l'autre. */
const TOKENS = /("(?:[^"\\]|\\.)*")(\s*:)?|(-?\d+(?:\.\d+)?)|(true|false|null)/g

function colorize(line: string) {
  const out: React.ReactNode[] = []
  let last = 0
  let match: RegExpExecArray | null
  TOKENS.lastIndex = 0
  while ((match = TOKENS.exec(line)) !== null) {
    if (match.index > last) out.push(<span key={`p${last}`} className="text-dim2">{line.slice(last, match.index)}</span>)
    const [whole, str, colon, num, lit] = match
    if (str && colon) out.push(<span key={match.index} className="text-dim">{str}{colon}</span>)
    else if (str) out.push(<span key={match.index} className="text-txt">{str}</span>)
    else if (num) out.push(<span key={match.index} className="text-acc">{num}</span>)
    else out.push(<span key={match.index} className="text-acc">{lit}</span>)
    last = match.index + whole.length
  }
  if (last < line.length) out.push(<span key={`p${last}`} className="text-dim2">{line.slice(last)}</span>)
  return out
}

type Block =
  | { kind: 'rows'; rows: Row[] }
  | { kind: 'fold'; id: number; rows: Row[] }

/** Unchanged runs longer than a few lines are folded, with `CONTEXT` lines
    kept on each side of what actually moved. */
function fold(rows: Row[]): Block[] {
  const blocks: Block[] = []
  let index = 0
  let foldId = 0
  while (index < rows.length) {
    if (rows[index].kind !== 'same') {
      const run: Row[] = []
      while (index < rows.length && rows[index].kind !== 'same') run.push(rows[index++])
      blocks.push({ kind: 'rows', rows: run })
      continue
    }
    const run: Row[] = []
    while (index < rows.length && rows[index].kind === 'same') run.push(rows[index++])
    const atStart = blocks.length === 0
    const atEnd = index >= rows.length
    const head = atStart ? 0 : CONTEXT
    const tail = atEnd ? 0 : CONTEXT
    if (run.length <= head + tail + 1) {
      blocks.push({ kind: 'rows', rows: run })
      continue
    }
    if (head) blocks.push({ kind: 'rows', rows: run.slice(0, head) })
    blocks.push({ kind: 'fold', id: foldId++, rows: run.slice(head, run.length - tail) })
    if (tail) blocks.push({ kind: 'rows', rows: run.slice(run.length - tail) })
  }
  return blocks
}

export function JsonPanel({
  draft,
  saved,
  changed,
  onGoto,
  onSaveDocument,
  onRevert,
}: {
  draft: SceneDraft
  /** The scene as the last save left it, or `undefined` for one the bank has
      never seen: everything is then an addition. */
  saved: Scene | undefined
  changed: Set<SceneField>
  onGoto: (section: SectionKey) => void
  onSaveDocument: () => void
  onRevert: () => void
}) {
  const toast = useToast()
  const [view, setView] = useState<'all' | 'compare'>('all')
  const [layout, setLayout] = useState<'side' | 'unified'>(() => {
    try {
      return localStorage.getItem(LAYOUT_KEY) === 'unified' ? 'unified' : 'side'
    } catch {
      return 'side'
    }
  })
  const [opened, setOpened] = useState<Set<number>>(() => new Set())

  const { after, rows, keys } = useMemo(() => {
    const afterText = JSON.stringify(draftsToScenes([draft])[0], null, 2)
    const beforeText = saved ? JSON.stringify(draftsToScenes([draftOf(saved)])[0], null, 2) : ''
    const afterLines = afterText.split('\n')
    const beforeLines = beforeText ? beforeText.split('\n') : []
    return {
      after: afterLines,
      rows: diffLines(beforeLines, afterLines),
      keys: ownerKeys(afterLines),
    }
  }, [draft, saved])

  const counts = countChanges(rows)
  const touched = counts.added + counts.removed > 0
  /* Les numéros de ligne du brouillon qui ne sont pas identiques à
     l'enregistré : ce que la vue « Tout » marque d'un liseré. */
  const movedLines = useMemo(
    () => new Set(rows.filter((r) => r.kind === 'add' || r.kind === 'mod').map((r) => r.b!)),
    [rows],
  )

  const chooseLayout = (next: 'side' | 'unified') => {
    setLayout(next)
    try {
      localStorage.setItem(LAYOUT_KEY, next)
    } catch {
      /* navigation privée, stockage refusé : la préférence ne survit pas à la
         session, et c'est tout ce qu'elle promettait. */
    }
  }

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(after.join('\n'))
      toast('JSON copié')
    } catch {
      toast('copie impossible — le presse-papier a refusé')
    }
  }

  const goto = (line: number) => onGoto(sectionFor(keys[line - 1] ?? '', changed))

  return (
    <div className="flex flex-col gap-[12px]">
      <div className="flex flex-wrap items-center justify-between gap-[10px]">
        <div className="seg" role="radiogroup" aria-label="Vue du JSON">
          <button
            type="button"
            role="radio"
            aria-checked={view === 'all'}
            className={view === 'all' ? 'on' : undefined}
            onClick={() => setView('all')}
          >
            Tout
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={view === 'compare'}
            className={view === 'compare' ? 'on' : undefined}
            onClick={() => setView('compare')}
          >
            Comparer
            {/* Les LIGNES qui different, pas la somme des deux compteurs : le
                bandeau dit deja « +2 -2 », et une pastille a 4 en face
                donnait deux chiffres qui se contredisent pour un meme fait. */}
            <span className="n">{rows.filter((row) => row.kind !== 'same').length}</span>
          </button>
        </div>
        <button
          type="button"
          className="btn sm"
          aria-label="Copier le JSON final"
          data-hint-text="Copie ce JSON dans le presse-papier — utile en support/debug sans quitter l'écran."
          onClick={() => void onCopy()}
        >
          Copier
        </button>
      </div>

      {view === 'all' ? (
        <div className="overflow-x-auto rounded-[8px] border border-line bg-panel py-[8px] font-code text-[12px]">
          {after.map((line, index) => {
            const moved = movedLines.has(index + 1)
            return (
              <div
                key={index}
                className={`flex gap-[10px] px-[10px] ${moved ? 'bg-warn-bg [box-shadow:inset_3px_0_0_var(--warn)]' : ''}`}
              >
                <span className="w-[26px] flex-none text-right text-dim2 tabular-nums select-none">
                  {index + 1}
                </span>
                <span className="whitespace-pre">{colorize(line)}</span>
              </div>
            )
          })}
        </div>
      ) : !touched ? (
        <p className="m-0 rounded-[8px] border border-line bg-panel px-[12px] py-[16px] text-[12.5px] text-dim">
          Identique à la version enregistrée.
        </p>
      ) : (
        <div className="rounded-[8px] border border-line bg-panel">
          {/* Bandeau de fichier */}
          <div className="flex flex-wrap items-center gap-[10px] border-b border-b-line px-[12px] py-[8px]">
            <code className="font-code text-[12px]">{draft.id || '(sans identifiant)'}</code>
            <span className="text-[12px] text-diff-add-txt">+{counts.added}</span>
            <span className="text-[12px] text-diff-del-txt">−{counts.removed}</span>
            <Proportion added={counts.added} removed={counts.removed} />
            <div className="ml-auto seg" role="radiogroup" aria-label="Disposition de la comparaison">
              <button
                type="button"
                role="radio"
                aria-checked={layout === 'side'}
                className={layout === 'side' ? 'on' : undefined}
                onClick={() => chooseLayout('side')}
              >
                Côte à côte
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={layout === 'unified'}
                className={layout === 'unified' ? 'on' : undefined}
                onClick={() => chooseLayout('unified')}
              >
                Unifié
              </button>
            </div>
          </div>

          {!saved && (
            <p className="m-0 border-b border-b-line px-[12px] py-[7px] text-[12px] text-dim2">
              Cette scène n'a jamais été enregistrée : tout est un ajout.
            </p>
          )}

          <div className="overflow-x-auto font-code text-[12px]">
            {layout === 'side' ? (
              <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                <Head text="Enregistré · scenes.json" />
                <Head text="Brouillon" />
                {fold(rows).map((block, index) =>
                  block.kind === 'fold' && !opened.has(block.id) ? (
                    <FoldBand
                      key={`f${index}`}
                      span={2}
                      rows={block.rows}
                      keys={keys}
                      onOpen={() => setOpened((prev) => new Set(prev).add(block.id))}
                    />
                  ) : (
                    block.rows.map((row, i) => <SideRow key={`${index}-${i}`} row={row} onGoto={goto} />)
                  ),
                )}
              </div>
            ) : (
              <div>
                {fold(rows).map((block, index) =>
                  block.kind === 'fold' && !opened.has(block.id) ? (
                    <FoldBand
                      key={`f${index}`}
                      rows={block.rows}
                      keys={keys}
                      onOpen={() => setOpened((prev) => new Set(prev).add(block.id))}
                    />
                  ) : (
                    block.rows.map((row, i) => <UnifiedRow key={`${index}-${i}`} row={row} onGoto={goto} />)
                  ),
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex items-center gap-[12px]">
        <button type="button" className="btn primary" onClick={onSaveDocument}>
          Enregistrer
        </button>
        <button type="button" className="link" onClick={onRevert}>
          Annuler les modifications
        </button>
      </div>
    </div>
  )
}

function Head({ text }: { text: string }) {
  return (
    <div className={`${HEAD} border-b border-b-line px-[10px] py-[6px] font-sans`}>{text}</div>
  )
}

/* Cinq carrés : la part de ce qui arrive et de ce qui part, d'un coup d'œil,
   comme une revue de code. Décoratif au sens strict — les deux compteurs à
   gauche portent déjà le chiffre. */
function Proportion({ added, removed }: { added: number; removed: number }) {
  const total = added + removed
  const greens = total ? Math.max(added > 0 ? 1 : 0, Math.round((added / total) * 5)) : 0
  const reds = total ? Math.min(5 - greens, Math.max(removed > 0 ? 1 : 0, 5 - greens)) : 0
  return (
    <span aria-hidden="true" className="flex gap-[2px]">
      {[0, 1, 2, 3, 4].map((i) => (
        <span
          key={i}
          className="h-[8px] w-[8px] rounded-[2px]"
          style={{
            backgroundColor:
              i < greens
                ? 'var(--diff-add-word)'
                : i < greens + reds
                  ? 'var(--diff-del-word)'
                  : 'var(--line2)',
          }}
        />
      ))}
    </span>
  )
}

function FoldBand({
  rows,
  keys,
  span,
  onOpen,
}: {
  rows: Row[]
  keys: string[]
  span?: number
  onOpen: () => void
}) {
  const names = [
    ...new Set(
      rows
        .map((row) => (row.kind === 'del' ? null : keys[row.b - 1]))
        .filter((name): name is string => Boolean(name)),
    ),
  ]
  const shown = names.slice(0, 4).join(', ') + (names.length > 4 ? '…' : '')
  return (
    <button
      type="button"
      style={span ? { gridColumn: `span ${span}` } : undefined}
      className="w-full cursor-pointer border-0 bg-panel2 px-[10px] py-[5px] text-left text-[11.5px]
                 text-dim hover:text-txt focus-visible:outline-2 focus-visible:outline-focus
                 focus-visible:-outline-offset-2"
      onClick={onOpen}
    >
      <span aria-hidden="true">⋯ </span>
      {rows.length} ligne{rows.length > 1 ? 's' : ''} inchangée{rows.length > 1 ? 's' : ''}
      {shown && ` (${shown})`}
    </button>
  )
}

/* Une cellule de ligne : numéro, signe, texte. Le signe et le texte masqué
   portent le sens ; la couleur ne fait que le trouver. */
function Cell({
  num,
  sign,
  children,
  tone,
  onGoto,
}: {
  num: number | null
  sign: '' | '+' | '−'
  children: React.ReactNode
  tone: 'same' | 'add' | 'del' | 'none'
  onGoto?: () => void
}) {
  const ground =
    tone === 'add'
      ? 'bg-diff-add-bg'
      : tone === 'del'
        ? 'bg-diff-del-bg'
        : tone === 'none'
          ? 'bg-bg'
          : ''
  const inside = (
    <>
      <span className="w-[26px] flex-none text-right text-dim2 tabular-nums select-none">
        {num ?? ''}
      </span>
      <span className="w-[10px] flex-none text-dim2 select-none" aria-hidden="true">
        {sign}
      </span>
      {/* `whitespace-pre-wrap`, pas `pre` : mesure a l'audit, la ligne
          « prompt » — celle qu'on vient comparer — se faisait couper au bord
          d'une colonne de 300 px, et il fallait defiler pour lire ce qui avait
          change. Une ligne qui s'enroule garde ses deux cotes alignes : la
          rangee de la grille prend la hauteur du plus haut des deux. */}
      <span className="min-w-0 break-words whitespace-pre-wrap">{children}</span>
      {tone === 'add' && <span className="sr-only">ajouté</span>}
      {tone === 'del' && <span className="sr-only">supprimé</span>}
    </>
  )
  return onGoto ? (
    <button
      type="button"
      className={`flex w-full cursor-pointer gap-[8px] border-0 px-[10px] py-px text-left
                  font-code text-[12px] hover:brightness-125 focus-visible:outline-2
                  focus-visible:outline-focus focus-visible:-outline-offset-2 ${ground}`}
      onClick={onGoto}
    >
      {inside}
    </button>
  ) : (
    <div className={`flex gap-[8px] px-[10px] py-px ${ground}`}>{inside}</div>
  )
}

function SideRow({ row, onGoto }: { row: Row; onGoto: (line: number) => void }) {
  if (row.kind === 'same')
    return (
      <>
        <Cell num={row.a} sign="" tone="same">{row.text}</Cell>
        <Cell num={row.b} sign="" tone="same">{row.text}</Cell>
      </>
    )
  if (row.kind === 'del')
    return (
      <>
        <Cell num={row.a} sign="−" tone="del">{row.text}</Cell>
        <Cell num={null} sign="" tone="none">{''}</Cell>
      </>
    )
  if (row.kind === 'add')
    return (
      <>
        <Cell num={null} sign="" tone="none">{''}</Cell>
        <Cell num={row.b} sign="+" tone="add" onGoto={() => onGoto(row.b)}>{row.text}</Cell>
      </>
    )
  const words = diffWords(row.before, row.after)
  return (
    <>
      <Cell num={row.a} sign="−" tone="del">
        <WordLine spans={words.before} side="del" />
      </Cell>
      <Cell num={row.b} sign="+" tone="add" onGoto={() => onGoto(row.b)}>
        <WordLine spans={words.after} side="add" />
      </Cell>
    </>
  )
}

function UnifiedRow({ row, onGoto }: { row: Row; onGoto: (line: number) => void }) {
  if (row.kind === 'same') return <Cell num={row.b} sign="" tone="same">{row.text}</Cell>
  if (row.kind === 'del') return <Cell num={row.a} sign="−" tone="del">{row.text}</Cell>
  if (row.kind === 'add')
    return (
      <Cell num={row.b} sign="+" tone="add" onGoto={() => onGoto(row.b)}>
        {row.text}
      </Cell>
    )
  const words = diffWords(row.before, row.after)
  return (
    <>
      <Cell num={row.a} sign="−" tone="del">
        <WordLine spans={words.before} side="del" />
      </Cell>
      <Cell num={row.b} sign="+" tone="add" onGoto={() => onGoto(row.b)}>
        <WordLine spans={words.after} side="add" />
      </Cell>
    </>
  )
}
