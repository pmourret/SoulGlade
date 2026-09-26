/* Vêtements — un catalogue à gauche, le niveau qu'on habille à droite
   (design-pass screen-7c §3, option 3b).

   JAMAIS VERROUILLÉ PAR `worldLinked` : `wardrobe` est une clé d'overlay
   (ADR-0015 §2), la seule qu'une scène liée à un lieu garde entièrement pour
   elle — contrairement aux trois fragments de prompt, elle n'est ni
   re-dérivée ni écartée à l'enregistrement.

   CE QUI CHANGE. Les quatre niveaux étaient quatre textarea côte à côte, donc
   quatre choses à lire pour savoir ce que la scène porte, et un sélecteur en
   DEUX TEMPS en dessous (choisir une pièce, choisir un niveau, presser +).
   Ici un seul niveau est ouvert à la fois, ses pièces sont des lignes, et un
   clic dans le catalogue ajoute au niveau ouvert.

   LE MOTIF DU PARCOURS EN DEUX TEMPS RESTE VRAI : « un mauvais clic passe
   inaperçu au milieu d'une douzaine d'entrées ». Il est traité autrement
   qu'en demandant deux gestes à chaque ajout — la ligne ajoutée est surlignée
   trois secondes et le toast porte son propre « Annuler », qui remet le
   niveau exactement dans l'état d'avant le clic.

   UNE LIGNE EST UNE TENUE, JAMAIS UNE PIÈCE (IT-10 chantier 6). Deux lignes
   au même niveau font deux images (`wardrobe_for`) : le catalogue ajoutait
   chaque pièce cliquée comme une ligne, donc une image en pull sans bas et une
   autre en jean sans haut. Une pièce COMPLÈTE maintenant la tenue écrite du
   niveau (`addPiece`) ; une tenue du catalogue s'ajoute comme une ligne
   `@<clé>`, que le lancement résout et que ce panneau montre par son libellé
   et son texte, jamais par sa clé.

   `draft.wardrobe` reste le même texte plat « N: description » :
   `splitWardrobeByLevel` / `joinWardrobeByLevel` (wardrobeCatalog.ts) sont
   l'aller-retour, refait à chaque rendu plutôt que tenu en état — ce panneau
   ne peut donc pas dériver de la valeur qu'il édite. */
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

import { useToast } from '../../../../chrome/ToastContext'
import { PATHS } from '../../../../app/routes'
import type { LibraryPick } from '../../assets/libraryPicks'
import { addPiece, lineView } from '../../outfits/outfitText'
import type { OutfitEntry } from '../../outfits/useOutfits'
import { bandOf, textToWardrobe, type SceneDraft } from '../../../../state/ScenesStoreContext'
import type { SceneField } from '../../sceneChanges'
import { InfoHint } from '../InfoHint'
import { joinWardrobeByLevel, splitWardrobeByLevel, WARDROBE_LEVELS } from '../wardrobeCatalog'
import { HEAD, warnIf } from './shared'

const linesOf = (text: string) => text.split('\n').filter((line) => line.trim() !== '')

/* Les deux catégories du catalogue, toutes deux venues du serveur : les
   TENUES du personnage (une ligne de plus), et les PIÈCES de sa bibliothèque
   d'assets (elles complètent la tenue écrite). Plus rien d'écrit en dur. */
const OUTFITS = 'Tenues'
const PIECES = 'Pièces'

type CatalogItem = {
  /** Clé de rendu, jamais affichée. */
  id: string
  kind: 'outfit' | 'piece'
  /** Ce que le clic écrit : `@<clé>` pour une tenue, le fragment pour une
      pièce. Vide = rien à écrire (asset sans fragment, tenue qui ne se
      résout pas) : montré, et non proposé. */
  value: string
  label: string
  /** Le texte que la scène recevra, ou la raison pour laquelle il manque. */
  text: string
  problem: string
  category: string
  src?: string
}

export function ClothingPanel({
  draft,
  library,
  outfits,
  marker,
  changed,
  onPatch,
}: {
  draft: SceneDraft
  /** Les assets importés dont le fragment atterrit dans `wardrobe`. */
  library: LibraryPick[]
  /** Les tenues de ce personnage, résolues par le serveur. */
  outfits: OutfitEntry[]
  /** Ce qui marque une ligne de tenue (`@`), dit par le serveur. */
  marker: string
  /* `wardrobe` est UN champ du modèle, présenté en plusieurs contrôles : la
     bordure `--warn` marque la liste du niveau, pas une ligne. */
  changed: Set<SceneField>
  onPatch: (patch: Partial<SceneDraft>) => void
}) {
  const toast = useToast()
  const { byLevel, extra } = splitWardrobeByLevel(draft.wardrobe)
  const band = bandOf({
    intensity: Number.parseInt(draft.bandLo, 10) || 0,
    wardrobe: textToWardrobe(draft.wardrobe),
  })
  const [active, setActive] = useState(() =>
    Math.min(3, Math.max(0, Number.parseInt(draft.bandLo, 10) || 0)),
  )
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  /* La ligne qui vient d'être ajoutée, le temps qu'on la voie arriver. */
  const [fresh, setFresh] = useState<{ level: number; text: string } | null>(null)
  const timer = useRef<number | null>(null)
  useEffect(() => () => { if (timer.current) window.clearTimeout(timer.current) }, [])

  const writeLevel = (level: number, lines: string[]) =>
    onPatch({ wardrobe: joinWardrobeByLevel({ ...byLevel, [level]: lines.join('\n') }, extra) })

  const add = (entry: CatalogItem) => {
    const before = byLevel[active]
    const lines = linesOf(before)
    const next = entry.kind === 'outfit' ? [...lines, entry.value] : addPiece(lines, entry.value, marker)
    const touched = next.find((line, index) => line !== lines[index]) ?? entry.value
    writeLevel(active, next)
    setFresh({ level: active, text: touched })
    if (timer.current) window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setFresh(null), 3000)
    toast(
      entry.kind === 'outfit'
        ? `Tenue ajoutée au niveau ${active}`
        : `Pièce ajoutée à la tenue du niveau ${active}`,
      {
        label: 'Annuler',
        /* Remet le niveau dans l'état exact d'avant le clic : c'est plus sûr
           que « retirer la dernière ligne », qui se tromperait si une autre
           pièce était ajoutée entre-temps. */
        run: () => {
          onPatch({ wardrobe: joinWardrobeByLevel({ ...byLevel, [active]: before }, extra) })
          setFresh(null)
        },
      },
    )
  }

  const srcOf = new Map(library.map((pick) => [pick.key, pick.src]))
  const items: CatalogItem[] = [
    ...(category && category !== OUTFITS
      ? []
      : outfits.map((outfit) => ({
          id: `outfit-${outfit.key}`,
          kind: 'outfit' as const,
          value: outfit.erreur ? '' : `${marker}${outfit.key}`,
          label: outfit.label || outfit.key,
          text: outfit.texte ?? '',
          problem: outfit.erreur ?? '',
          category: OUTFITS,
          // la vignette d'une tenue : celle de sa première pièce illustrée
          src: (outfit.pieces ?? []).map((p) => (p.asset ? srcOf.get(p.asset) : undefined)).find(Boolean),
        }))),
    ...(category && category !== PIECES
      ? []
      : library.map((pick) => ({
          id: `asset-${pick.key}`,
          kind: 'piece' as const,
          value: pick.fragment,
          label: pick.label,
          text: pick.fragment,
          problem: pick.fragment ? '' : 'sans fragment',
          category: PIECES,
          src: pick.src,
        }))),
  ]
  /* La recherche porte sur le LIBELLÉ et sur le fragment : un asset s'appelle
     « Robe rouge » et son fragment est en anglais. */
  const needle = search.trim().toLowerCase()
  const shown = needle
    ? items.filter((entry) => `${entry.label} ${entry.text}`.toLowerCase().includes(needle))
    : items
  const empty = outfits.length === 0 && library.length === 0

  return (
    <div className="flex flex-col gap-[14px]">
      {/* §3.6 — ce que les quatre niveaux ne montrent pas. Deux origines,
          toutes deux venues du disque depuis que le miroir brut a disparu :
          un niveau au-delà de 3, que le serveur accepte, et une clé non
          numérique, qu'il refuse désormais à l'écriture (bank.py) et qui ne
          peut donc plus arriver que d'un fichier édité à la main — le cas
          exact pour lequel `invalidOutfits` monte la garde. Les deux
          s'affichent ICI, avec de quoi les ranger, plutôt que de disparaître
          d'un écran qui prétend montrer la tenue. */}
      {extra.length > 0 && (
        <div className="rounded-card border border-warn-line bg-warn-bg p-[12px]" data-f="wardrobe_extra">
          <b className="block text-[12.5px] text-warn-txt">
            {extra.length} ligne{extra.length > 1 ? 's' : ''} hors des quatre niveaux
          </b>
          {/* Deux cas sous le même bloc, et la phrase doit être vraie des
              deux : un niveau au-delà de 3 s'enregistre sans broncher mais
              n'apparaît dans aucun des quatre champs, une ligne SANS niveau
              du tout fait refuser l'enregistrement (`invalidOutfits`). */}
          <p className="tiny mt-[2px] mb-[10px]">
            elles ne sont pas perdues, mais aucun des quatre niveaux ne les montre. Range-les ou
            retire-les : une ligne sans niveau du tout fait refuser l'enregistrement.
          </p>
          <div className="flex flex-col gap-[6px]">
            {extra.map((line, index) => (
              <div key={index} className="flex items-center gap-[8px]">
                <code className="flex-1 truncate font-code text-[12px]">{line}</code>
                <label className="sr-only" htmlFor={`extra-${index}`}>
                  ranger « {line} » dans un niveau
                </label>
                <select
                  id={`extra-${index}`}
                  className="!w-auto"
                  value=""
                  onChange={(e) => {
                    const rest = extra.filter((_, i) => i !== index)
                    if (e.target.value === 'drop') {
                      onPatch({ wardrobe: joinWardrobeByLevel(byLevel, rest) })
                      return
                    }
                    const level = Number(e.target.value)
                    /* Le préfixe de l'ancien niveau tombe. Une ligne `extra`
                       est brute — « 4: a linen dress », « haut: … » — et
                       `joinWardrobeByLevel` reposera le sien : sans ce
                       découpage, ranger donnerait « 2: 4: a linen dress ».
                       `wardrobeToText` n'écrit jamais qu'un « clé: valeur »,
                       donc le premier deux-points est toujours le séparateur,
                       jamais un deux-points de la tenue elle-même. */
                    const outfit = line.replace(/^[^:]*:\s*/, '').trim() || line
                    onPatch({
                      wardrobe: joinWardrobeByLevel(
                        { ...byLevel, [level]: [...linesOf(byLevel[level]), outfit].join('\n') },
                        rest,
                      ),
                    })
                  }}
                >
                  <option value="">ranger…</option>
                  {WARDROBE_LEVELS.map((level) => (
                    <option key={level} value={level}>
                      niveau {level}
                    </option>
                  ))}
                  <option value="drop">supprimer</option>
                </select>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Le catalogue s'élargit avec le panneau : à 300 px il tient trois
          vignettes, et tout l'espace gagné allait au vide sous la liste du
          niveau ouvert. */}
      <div className="grid gap-[14px] grid-cols-[1fr] @[620px]:grid-cols-[300px_minmax(0,1fr)]
                      @[1300px]:grid-cols-[400px_minmax(0,1fr)]">
        {/* Catalogue */}
        <div className="flex min-w-0 flex-col gap-[8px] rounded-[10px] border border-line bg-panel p-[10px]">
          <span className={HEAD}>Catalogue</span>
          {empty ? (
            /* Rien sur le serveur : l'état vide MÈNE à l'atelier plutôt que
               de laisser un panneau nu. Le champ libre à droite reste là pour
               écrire une tenue sans rien créer. */
            <div className="flex flex-col gap-[8px] py-[10px] text-[12px] text-dim" id="wardrobeCatalogEmpty">
              <p className="m-0">
                Aucune tenue ni pièce pour ce personnage. Une tenue créée dans l'atelier se pose
                ici en un clic, et la corriger là-bas corrige toutes les scènes qui la portent.
              </p>
              <Link className="btn sm self-start no-underline" to={PATHS.bankOutfits}>
                Créer une tenue
              </Link>
            </div>
          ) : (
            <>
          <label className="sr-only" htmlFor="wardrobeSearch">
            rechercher une tenue ou une pièce
          </label>
          <input
            id="wardrobeSearch"
            type="search"
            placeholder="Rechercher"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="flex flex-wrap gap-[5px]" role="group" aria-label="Catégories du catalogue">
            <CategoryChip on={!category} label="tout" onClick={() => setCategory('')} />
            {outfits.length > 0 && (
              <CategoryChip
                on={category === OUTFITS}
                label="tenues"
                onClick={() => setCategory(category === OUTFITS ? '' : OUTFITS)}
              />
            )}
            {library.length > 0 && (
              <CategoryChip
                on={category === PIECES}
                label="pièces"
                onClick={() => setCategory(category === PIECES ? '' : PIECES)}
              />
            )}
          </div>
          {/* `auto-fill` plutôt qu'un nombre de colonnes fixe : la vignette
              garde sa taille quand le catalogue s'élargit, au lieu de gonfler
              jusqu'à remplir sa colonne (mesuré à 1440, où la grille tombait
              en une colonne et donnait des carrés de 200 px). */}
          <div className="grid max-h-[420px] grid-cols-[repeat(auto-fill,minmax(78px,1fr))]
                          gap-[6px] overflow-y-auto">
            {shown.map((entry) => (
              <button
                key={entry.id}
                type="button"
                title={entry.problem || entry.text || entry.label}
                disabled={!entry.value}
                aria-label={
                  !entry.value
                    ? entry.kind === 'outfit'
                      ? `« ${entry.label} » ne se résout pas : ${entry.problem}`
                      : `« ${entry.label} » n'a pas encore de fragment : l'analyser dans Assets`
                    : entry.kind === 'outfit'
                      ? `Ajouter la tenue « ${entry.label} » au niveau ${active}`
                      : `Ajouter « ${entry.label} » à la tenue du niveau ${active}`
                }
                data-catalog-kind={entry.kind}
                data-piece={entry.value}
                className="flex cursor-pointer flex-col gap-[4px] rounded-card border border-line2
                           bg-transparent p-[5px] text-left hover:border-dim2 focus-visible:outline-2
                           focus-visible:outline-focus focus-visible:outline-offset-2
                           disabled:cursor-not-allowed disabled:opacity-60"
                onClick={() => add(entry)}
              >
                {entry.src ? (
                  <img
                    className="block aspect-square w-full rounded-[5px] border border-line2 object-cover"
                    src={entry.src}
                    alt=""
                    loading="lazy"
                  />
                ) : (
                  /* Une tenue sans pièce illustrée : sa vignette est son
                     texte, en petit — c'est ce qui la distingue d'une autre. */
                  <span
                    aria-hidden="true"
                    className="block aspect-square w-full overflow-hidden rounded-[5px] border border-line2
                               bg-panel2 p-[4px] font-code text-[9px] leading-tight text-dim2"
                  >
                    {entry.text}
                  </span>
                )}
                <span className="line-clamp-2 text-[10.5px] leading-tight text-dim">
                  {entry.kind === 'outfit' && <b className="font-semibold text-txt">tenue · </b>}
                  {entry.label}
                </span>
                {/* POURQUOI elle ne se clique pas, visible sans survol : à
                    0,6 d'opacité (mesuré) une vignette dit « indisponible »,
                    jamais « son fragment n'a pas encore été lu ». */}
                {entry.problem && (
                  <span className="text-[9.5px] leading-tight text-warn-txt">
                    {entry.kind === 'outfit' ? 'ne se résout pas' : entry.problem}
                  </span>
                )}
              </button>
            ))}
            {shown.length === 0 && (
              <p className="col-span-full m-0 py-[14px] text-center text-[12px] text-dim2">
                rien ne porte « {search} »
              </p>
            )}
          </div>
          <p className="m-0 text-[11px] text-dim2">
            Une tenue ajoute une ligne ; une pièce complète la tenue écrite du niveau.
          </p>
            </>
          )}
        </div>

        {/* Niveau actif */}
        <div className="flex min-w-0 flex-col gap-[10px]">
          <div className="flex flex-wrap items-center justify-between gap-[8px]">
            <div role="radiogroup" aria-label="Niveau habillé" className="seg">
              {WARDROBE_LEVELS.map((level) => (
                <button
                  key={level}
                  type="button"
                  role="radio"
                  aria-checked={level === active}
                  className={level === active ? 'on' : undefined}
                  onClick={() => setActive(level)}
                >
                  {level}
                  {/* La pastille dit « ce niveau porte quelque chose » sans
                      demander d'ouvrir les quatre. */}
                  {linesOf(byLevel[level]).length > 0 && (
                    <span
                      aria-hidden="true"
                      className="ml-[5px] inline-block h-[5px] w-[5px] rounded-[50%] bg-acc align-middle"
                    />
                  )}
                </button>
              ))}
            </div>
            <span className="text-[11.5px] text-dim2">
              plafond : niveau {band[1]}
              <InfoHint text="Le plafond de la scène est le niveau le plus haut qui porte une tenue. Vider un niveau le fait redescendre." />
            </span>
          </div>

          <div
            className={`flex flex-col gap-[6px] rounded-card p-[8px] ${
              warnIf(changed, 'wardrobe') ? 'border border-warn' : 'border border-line'
            }`}
            data-f={`wardrobe_${active}`}
            data-value={byLevel[active]}
          >
            {linesOf(byLevel[active]).map((line, index) => {
              const isFresh = fresh?.level === active && fresh.text === line
              const view = lineView(line, outfits, marker)
              return (
                <div
                  key={index}
                  className={`flex items-center gap-[8px] rounded-[6px] px-[6px] py-[4px] ${
                    isFresh ? 'border border-warn bg-warn-bg' : ''
                  }`}
                >
                  {view.reference ? (
                    /* Une tenue du catalogue : son libellé et le texte que la
                       scène recevra, jamais `@clé`. Elle ne s'édite pas ici —
                       la corriger se fait dans l'atelier, pour toutes les
                       scènes qui la portent. */
                    <span className="min-w-0 flex-1 text-[12.5px]" data-outfit-line={line}>
                      <span className="flex items-center gap-[6px]">
                        <b className="font-medium">{view.label}</b>
                        <Link className="text-[11px] text-dim2" to={PATHS.bankOutfits}>
                          tenue · modifier dans l'atelier
                        </Link>
                      </span>
                      <span
                        className={`block font-code text-[11.5px] ${view.problem ? 'text-warn-txt' : 'text-dim'}`}
                      >
                        {view.problem || `wearing ${view.text}`}
                      </span>
                    </span>
                  ) : (
                    <>
                      <label className="sr-only" htmlFor={`piece-${active}-${index}`}>
                        tenue {index + 1} du niveau {active}
                      </label>
                      <input
                        id={`piece-${active}-${index}`}
                        className="flex-1"
                        value={line}
                        onChange={(e) => {
                          const next = linesOf(byLevel[active])
                          next[index] = e.target.value
                          writeLevel(active, next)
                        }}
                      />
                    </>
                  )}
                  {isFresh && <span className="flex-none text-[11px] text-warn-txt">ajoutée</span>}
                  <button
                    type="button"
                    className="cursor-pointer rounded-[6px] border-0 bg-transparent px-[6px] text-[15px]
                               leading-none text-dim2 hover:text-bad focus-visible:outline-2
                               focus-visible:outline-focus focus-visible:outline-offset-2"
                    aria-label={`Retirer « ${view.label} » du niveau ${active}`}
                    onClick={() => writeLevel(active, linesOf(byLevel[active]).filter((_, i) => i !== index))}
                  >
                    ×
                  </button>
                </div>
              )
            })}
            <FreeEntry level={active} onAdd={(piece) => writeLevel(active, [...linesOf(byLevel[active]), piece])} />
          </div>

          <div className="grid grid-cols-3 gap-[8px]">
            {WARDROBE_LEVELS.filter((level) => level !== active).map((level) => {
              const lines = linesOf(byLevel[level])
              return (
                <button
                  key={level}
                  type="button"
                  className="cursor-pointer rounded-card border border-line bg-transparent p-[8px]
                             text-left hover:border-line2 focus-visible:outline-2
                             focus-visible:outline-focus focus-visible:outline-offset-2"
                  onClick={() => setActive(level)}
                >
                  <span className={HEAD}>niveau {level}</span>
                  <span className="mt-[3px] block text-[12px] text-dim">
                    {lines.length ? (
                      lines.map((line) => lineView(line, outfits, marker).label).join(' · ')
                    ) : (
                      <span className="text-dim2">vide : reprend le niveau 0</span>
                    )}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

function CategoryChip({ on, label, onClick }: { on: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      /* `bg-transparent` dans les DEUX branches : un <button> sans `background`
         retombe sur la face grise du navigateur (frontend.md, deux fois vécu).
         La branche active ne peignait que sa bordure. */
      className={`cursor-pointer rounded-[999px] border bg-transparent px-[9px] py-[3px]
                 text-[11px] focus-visible:outline-2 focus-visible:outline-focus
                 focus-visible:outline-offset-2 ${
                   on ? 'border-acc text-txt' : 'border-line2 text-dim hover:text-txt'
                 }`}
      onClick={onClick}
    >
      {label}
    </button>
  )
}

/* La ligne « à la main » : tout le vocabulaire n'est pas dans un catalogue de
   trente entrées, et une pièce écrite doit rester aussi facile qu'une pièce
   cliquée. Validée par Entrée, jamais par un bouton de plus. */
function FreeEntry({ level, onAdd }: { level: number; onAdd: (piece: string) => void }) {
  const [text, setText] = useState('')
  const commit = () => {
    if (!text.trim()) return
    onAdd(text.trim())
    setText('')
  }
  return (
    <div className="flex items-center gap-[8px] px-[6px]">
      <label className="sr-only" htmlFor={`free-${level}`}>
        écrire une tenue pour le niveau {level}
      </label>
      <input
        id={`free-${level}`}
        className="flex-1 !border-dashed"
        placeholder="Écrire une tenue"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key !== 'Enter') return
          e.preventDefault()
          commit()
        }}
        onBlur={commit}
      />
    </div>
  )
}
