/* Général — ce qui identifie la scène et ce qu'elle produit (design-pass
   screen-7c §1, option 1b).

   CE QUE ÇA REMPLACE. Huit contrôles de formulaire empilés, dont trois qui
   demandaient de lire une étiquette pour savoir ce qu'ils valaient : un
   `<select>` pour le format (un rapport ne se lit pas, il se voit), un input
   nombre pour les images, un input nombre pour le niveau minimum avec une
   jauge dessous qui, elle, disait le plafond. Ici le format est dessiné à sa
   proportion, les images se montent au pas, et les deux bouts de la bande
   vivent sur la même échelle : le minimum se clique, le plafond se déduit.

   AUCUN CHAMP DU MODÈLE N'A BOUGÉ. `data-f` reste sur chaque contrôle — sur
   le GROUPE quand le contrôle n'est plus un `<input>` unique, avec
   `data-value`, exactement comme `data-f="pose"` le fait depuis l'écran 7. */
import { Fragment, useState, type RefObject } from 'react'

import type { Creative } from '../../../../state/TaxonomyContext'
import { bandOf, textToWardrobe, type SceneDraft } from '../../../../state/ScenesStoreContext'
import type { SceneField } from '../../sceneChanges'
import { InfoHint } from '../InfoHint'
import { HEAD, listOf, listToText, warnIf } from './shared'

const FORMATS = ['4:5', '2:3', '9:16', '1:1']
const LEVELS = [3, 2, 1, 0]

/* Vocabulary of the walk, for the intention selector. A scene carrying a key
   absent from creative.json KEEPS it: we add it to the list rather than let it
   vanish from the selector — hence from the scene. */
function intentionOptions(creative: Creative | null, current: string) {
  const entries = (creative?.intentions ?? []).map((i) => [i.key, i.label] as [string, string])
  if (current && !entries.some(([key]) => key === current)) entries.push([current, current])
  return entries
}

export function GeneralPanel({
  draft,
  creative,
  produced,
  worldLinked,
  changed,
  idRef,
  onPatch,
  onGotoClothing,
}: {
  draft: SceneDraft
  creative: Creative | null
  produced: number | null
  worldLinked: boolean
  changed: Set<SceneField>
  idRef: RefObject<HTMLInputElement | null>
  onPatch: (patch: Partial<SceneDraft>) => void
  /** The ceiling is deduced from the outfits: this is where one changes it. */
  onGotoClothing: () => void
}) {
  const band = bandOf({
    intensity: Number.parseInt(draft.bandLo, 10) || 0,
    wardrobe: textToWardrobe(draft.wardrobe),
  })
  const count = Number.parseInt(draft.count, 10) || 1
  const tones = listOf(draft.tones)
  /* Same rule as the intention: a tone the scene carries but `creative.json`
     no longer declares stays offered, or selecting another one would drop it. */
  const toneKeys = [
    ...(creative?.tones ?? []).map((t) => t.key),
    ...tones.filter((key) => !(creative?.tones ?? []).some((t) => t.key === key)),
  ]

  return (
    /* Deux colonnes dès que le panneau dépasse 1200 px : l'identité et les
       trois tuiles à gauche, ce qui qualifie la scène à droite. En dessous,
       la même pile qu'avant. */
    <div className="grid items-start gap-[18px] @[1200px]:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
      {/* La colonne est son PROPRE conteneur : les trois tuiles se replient
          sur leur largeur à elles, pas sur celle du panneau entier. */}
      <div className="@container flex min-w-0 flex-col gap-[18px]">
      {/* 1. Carte d'identité */}
      <div className="rounded-[10px] border border-line bg-panel p-[14px]">
        <div className="flex items-start gap-[12px]">
          <div className="min-w-0 flex-1">
            <label className="sr-only" htmlFor="sceneId">
              identifiant de la scène
            </label>
            <input
              id="sceneId"
              ref={idRef}
              data-f="id"
              className={`w-full font-code text-[17px] font-semibold ${warnIf(changed, 'id') ?? ''}`}
              value={draft.id}
              onChange={(e) => onPatch({ id: e.target.value })}
            />
          </div>
          <div className="flex-none">
            <label className="sr-only" htmlFor="sceneIntention">
              intention de la scène
            </label>
            <select
              id="sceneIntention"
              data-f="intention"
              className={`!w-auto rounded-[999px] px-[14px] ${warnIf(changed, 'intention') ?? ''}`}
              value={draft.intention}
              disabled={worldLinked}
              onChange={(e) => onPatch({ intention: e.target.value })}
            >
              <option value="">— aucune intention —</option>
              {intentionOptions(creative, draft.intention).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <p className="tiny mt-[8px] mb-0">
          nom de fichier et dossier d'export
          {worldLinked && <> · intention <b>reprise du monde</b></>}
        </p>
        {/* Renommer une scène déjà produite détache ses images : c'est la
            seule conséquence de cet écran qui touche des fichiers sur le
            disque, elle se dit au moment où elle devient vraie. */}
        {changed.has('id') && (produced ?? 0) > 0 && (
          <p className="mt-[6px] mb-0 text-[12px] text-warn-txt">
            {produced} image{produced! > 1 ? 's' : ''} produite{produced! > 1 ? 's' : ''} ser
            {produced! > 1 ? 'ont' : 'a'} détachée{produced! > 1 ? 's' : ''} de cette scène si tu
            enregistres ce nom.
          </p>
        )}
      </div>

      {/* 2. Trois tuiles */}
      <div className="grid grid-cols-[1fr] gap-[12px] @[620px]:grid-cols-[1.5fr_.8fr_1fr]">
        <Tile title="Format">
          <div
            className="grid grid-cols-4 gap-[8px]"
            data-f="format"
            data-value={draft.format}
            role="group"
            aria-label="Format de l'image"
          >
            {FORMATS.map((format) => {
              const [w, h] = format.split(':').map(Number)
              const on = draft.format === format
              return (
                <button
                  key={format}
                  type="button"
                  aria-pressed={on}
                  className={`flex cursor-pointer flex-col items-center gap-[6px] rounded-card
                             border bg-transparent px-[4px] py-[8px] text-[11px]
                             focus-visible:outline-2 focus-visible:outline-focus
                             focus-visible:-outline-offset-2 ${
                               on
                                 ? 'border-acc text-txt [background:color-mix(in_srgb,var(--acc)_10%,transparent)]'
                                 : 'border-line2 text-dim hover:text-txt'
                             }`}
                  onClick={() => onPatch({ format })}
                >
                  {/* Le rapport est DESSINÉ : c'est ce qu'un « 9:16 » dans une
                      liste déroulante demandait d'imaginer. */}
                  <span
                    aria-hidden="true"
                    className={`block rounded-[3px] border ${on ? 'border-acc' : 'border-dim2'}`}
                    style={{ width: `${(w / h) * 34}px`, height: '34px' }}
                  />
                  {format}
                </button>
              )
            })}
          </div>
        </Tile>

        <Tile title="Images par passage">
          <div
            className="flex items-center gap-[10px]"
            data-f="count"
            data-value={draft.count}
            role="group"
            aria-label="Nombre d'images par passage"
          >
            <Step label="Une image de moins" glyph="−" disabled={count <= 1}
                  onClick={() => onPatch({ count: String(Math.max(1, count - 1)) })} />
            <span className="min-w-[40px] text-center text-[32px] leading-none font-[650] tabular-nums">
              {count}
            </span>
            <Step label="Une image de plus" glyph="+" onClick={() => onPatch({ count: String(count + 1) })} />
          </div>
        </Tile>

        <Tile title="Niveaux">
          {/* Chaque étiquette est SUR LA LIGNE du cran qu'elle nomme (mesuré à
              l'audit : posées aux deux extrémités de l'échelle, « plafond »
              se lisait comme le nom du cran du haut, qui n'est pas le
              plafond dès que la scène s'arrête plus bas). */}
          <div
            className="grid grid-cols-[52px_minmax(0,1fr)] items-center gap-x-[10px] gap-y-[3px]"
            data-f="band_lo"
            data-value={draft.bandLo}
            role="group"
            aria-label="Niveau minimum de la scène"
          >
            {LEVELS.map((level) => {
              const inBand = level >= band[0] && level <= band[1]
              const isFloor = level === band[0]
              /* Une tenue déclarée au-delà du niveau 3 pousse le plafond hors
                 de l'échelle (mesuré à l'audit sur une scène portant un
                 niveau 4) : l'étiquette se pose alors sur le cran du haut et
                 dit le vrai chiffre, plutôt que de disparaître avec le lien
                 qui mène à ce qui la décide. */
              const isCeiling = level === Math.min(3, band[1])
              return (
                <Fragment key={level}>
                  <button
                    type="button"
                    aria-pressed={String(level) === draft.bandLo}
                    aria-label={`Niveau ${level}${isFloor ? ', minimum' : ''}`}
                    className={`h-[16px] w-[52px] cursor-pointer rounded-[3px] border-0
                               focus-visible:outline-2 focus-visible:outline-focus
                               focus-visible:outline-offset-2 ${inBand ? 'bg-acc' : 'bg-line2'}`}
                    onClick={() => onPatch({ bandLo: String(level) })}
                  />
                  <span className="text-[11px] text-dim2">
                    {isCeiling && (
                      <button
                        type="button"
                        /* Le libellé du plafond est aussi le chemin vers ce
                           qui le décide : il est déduit de la tenue la plus
                           haute déclarée dans Vêtements, et ce n'est pas
                           devinable. L'aria-label porte la bande entière,
                           comme l'ancienne jauge. */
                        className="cursor-pointer border-0 bg-transparent p-0 text-left text-[11px]
                                   text-dim2 underline decoration-dotted underline-offset-2
                                   hover:text-txt focus-visible:outline-2 focus-visible:outline-focus
                                   focus-visible:outline-offset-2"
                        aria-label={`Niveaux ${band[0]} à ${band[1]} — ouvrir l'onglet Vêtements pour changer le plafond`}
                        data-hint-text="Le plafond est déduit de la tenue la plus haute déclarée dans l'onglet Vêtements — cliquer pour y aller."
                        onClick={onGotoClothing}
                      >
                        plafond {band[1]}
                        <InfoHint text="Le maximum n'est pas saisi : il est déduit de la tenue la plus haute déclarée dans l'onglet Vêtements, pour ne pas avoir deux champs qui peuvent se contredire." />
                      </button>
                    )}
                    {isCeiling && isFloor && ' · '}
                    {isFloor && `minimum ${band[0]}`}
                  </span>
                </Fragment>
              )
            })}
          </div>
        </Tile>
      </div>

      </div>

      <div className="flex min-w-0 flex-col gap-[18px]">
      {/* 3. Tons affins */}
      <div>
        <span className={HEAD}>Tons affins</span>
        <div
          className="mt-[8px] flex flex-wrap gap-[6px]"
          data-f="tones"
          data-value={draft.tones}
          role="group"
          aria-label="Tons affins de la scène"
        >
          {toneKeys.map((key) => {
            const on = tones.includes(key)
            return (
              <Chip
                key={key}
                on={on}
                label={key}
                onClick={() =>
                  onPatch({
                    tones: listToText(on ? tones.filter((t) => t !== key) : [...tones, key]),
                  })
                }
              />
            )
          })}
          {toneKeys.length === 0 && <span className="text-[12px] text-dim2">aucun ton déclaré</span>}
        </div>
      </div>

      {/* 4. Tags */}
      <div>
        <span className={HEAD}>Tags</span>
        <TagInput
          value={draft.tags}
          changed={changed.has('tags')}
          onChange={(tags) => onPatch({ tags })}
        />
      </div>

      {/* 5. Réglages avancés */}
      <details className="rounded-card border border-line bg-panel">
        <summary
          className="cursor-pointer list-none px-[12px] py-[9px] text-[12.5px] text-dim
                     hover:text-txt focus-visible:outline-2 focus-visible:outline-focus
                     focus-visible:-outline-offset-2 [&::-webkit-details-marker]:hidden"
        >
          Réglages avancés · guidance : {draft.guidance || 'réglage du studio'}
        </summary>
        <div className="border-t border-t-line px-[12px] py-[10px]">
          <label className="f">
            <span>guidance</span>
            <input
              className={`!w-[140px] ${warnIf(changed, 'guidance') ?? ''}`}
              data-f="guidance"
              type="number"
              step="0.1"
              placeholder="studio"
              value={draft.guidance}
              onChange={(e) => onPatch({ guidance: e.target.value })}
            />
          </label>
          <p className="tiny mt-[6px] mb-0">vide = réglage du studio</p>
        </div>
      </details>
      </div>
    </div>
  )
}

function Tile({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-[10px] rounded-[10px] border border-line bg-panel p-[12px]">
      <span className={HEAD}>{title}</span>
      {children}
    </div>
  )
}

function Step({
  label,
  glyph,
  disabled,
  onClick,
}: {
  label: string
  glyph: string
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      className="h-[32px] w-[32px] cursor-pointer rounded-[8px] border border-line2 bg-panel2
                 text-[16px] leading-none text-dim hover:text-txt disabled:cursor-not-allowed
                 disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-focus
                 focus-visible:outline-offset-2"
      onClick={onClick}
    >
      {glyph}
    </button>
  )
}

function Chip({ on, label, onClick }: { on: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      className={`cursor-pointer rounded-[999px] border px-[11px] py-[5px] text-[12px]
                 focus-visible:outline-2 focus-visible:outline-focus focus-visible:outline-offset-2 ${
                   on
                     ? 'border-acc text-txt [background:color-mix(in_srgb,var(--acc)_12%,transparent)]'
                     : 'border-line2 bg-transparent text-dim hover:text-txt'
                 }`}
      onClick={onClick}
    >
      {label}
    </button>
  )
}

/* Saisie de puces : Entrée ou virgule valide, × retire. La VALEUR écrite ne
   change pas — c'est toujours la chaîne à virgules que `draftsToScenes`
   découpe. Ce qui change est qu'un tag existant se retire d'un clic au lieu
   de se retrouver au milieu d'une ligne de texte à éditer au curseur. */
function TagInput({
  value,
  changed,
  onChange,
}: {
  value: string
  changed: boolean
  onChange: (value: string) => void
}) {
  const tags = listOf(value)
  const [entry, setEntry] = useState('')
  const add = (raw: string) => {
    const tag = raw.trim().replace(/,$/, '').trim()
    if (!tag || tags.includes(tag)) return setEntry('')
    onChange(listToText([...tags, tag]))
    setEntry('')
  }

  return (
    <div
      className={`mt-[8px] flex flex-wrap items-center gap-[6px] rounded-card border p-[7px] ${
        changed ? 'border-warn' : 'border-line2'
      }`}
      data-f="tags"
      data-value={value}
    >
      {tags.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-[6px] rounded-[999px] bg-panel2 px-[10px]
                     py-[4px] text-[12px]"
        >
          {tag}
          <button
            type="button"
            className="cursor-pointer border-0 bg-transparent p-0 text-[13px] leading-none text-dim2
                       hover:text-bad focus-visible:outline-2 focus-visible:outline-focus
                       focus-visible:outline-offset-2"
            aria-label={`Retirer le tag « ${tag} »`}
            onClick={() => onChange(listToText(tags.filter((t) => t !== tag)))}
          >
            ×
          </button>
        </span>
      ))}
      <label className="sr-only" htmlFor="sceneTagEntry">
        ajouter un tag
      </label>
      <input
        id="sceneTagEntry"
        className="!w-auto min-w-[120px] flex-1 !border-0 !bg-transparent !px-[4px]"
        placeholder={tags.length ? 'ajouter…' : 'intérieur, jour, miroir'}
        value={entry}
        onChange={(e) => (e.target.value.includes(',') ? add(e.target.value) : setEntry(e.target.value))}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            add(entry)
          }
          // Retour arrière sur un champ vide : retire le dernier tag, comme
          // toute saisie de puces (un geste, pas un clic à viser).
          if (e.key === 'Backspace' && !entry && tags.length) {
            onChange(listToText(tags.slice(0, -1)))
          }
        }}
        onBlur={() => add(entry)}
      />
    </div>
  )
}
