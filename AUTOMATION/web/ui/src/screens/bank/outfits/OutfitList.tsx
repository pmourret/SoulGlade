/* The outfits of the character, left column of the workshop (design-pass
   tenues, S2) — presentational, the shape of the light list next door.

   An outfit is recognised by what it says: the text a scene receives, on two
   lines under its label. The open row is marked by its ground and an accent
   edge; unsaved changes are said in a word. */
import { Icon } from '../../../chrome/Icon'
import type { OutfitEntry } from './useOutfits'

export function OutfitList({
  outfits, loaded, selected, dirty, onChoose,
}: {
  outfits: OutfitEntry[]
  loaded: boolean
  selected: string | null
  dirty: boolean
  onChoose: (key: string) => void
}) {
  return (
    <div className="flex min-h-0 flex-col overflow-y-auto border-r border-r-line">
      <span className="lab px-[14px] pt-[14px] pb-[8px]">Tenues · {outfits.length}</span>
      {loaded && !outfits.length ? (
        <p className="m-0 px-[14px] text-[12.5px] text-dim" id="outfitsEmpty">
          Aucune tenue pour l'instant. Celle que tu composes à droite sera la première : des pièces
          écrites, ou prises dans les vêtements des Assets, posées sur le corps. Elle se pose ensuite
          dans une scène, onglet Vêtements ; la corriger ici corrige toutes les scènes qui la portent.
        </p>
      ) : (
        <ul className="m-0 flex list-none flex-col p-0 pb-[14px]">
          {outfits.map((outfit) => {
            const open = outfit.key === selected
            const count = outfit.pieces?.length ?? 0
            return (
              <li key={outfit.key}>
                <button
                  type="button"
                  className={`flex w-full flex-col gap-[3px] border-0 px-[14px] py-[9px] text-left ${
                    open ? 'bg-panel3 shadow-[inset_2px_0_0_var(--acc)]' : 'bg-transparent hover:bg-panel2'}`}
                  data-outfit={outfit.key}
                  aria-pressed={open}
                  onClick={() => onChoose(outfit.key)}
                >
                  <span className="flex min-w-0 items-center gap-[6px] text-[13px]">
                    <span className={`truncate ${open ? 'font-semibold' : 'font-medium'}`}>
                      {outfit.label || outfit.key}
                    </span>
                    <span className="flex-none text-[11px] text-dim2">{count} pièce{count > 1 ? 's' : ''}</span>
                    {outfit.couche !== 'personnage' && (
                      <span className="flex-none rounded-pill border border-line px-[5px] text-[11px] text-dim2">
                        {outfit.couche === 'monde' ? 'monde' : 'ajustée'}
                      </span>
                    )}
                    {open && dirty && <span className="flex-none text-[11px] text-warn-txt">modifiée</span>}
                  </span>
                  {outfit.erreur ? (
                    <span className="flex items-center gap-[4px] text-[12px] text-warn-txt">
                      <Icon name="warn" className="h-[11px] w-[11px] flex-none" />
                      {outfit.erreur}
                    </span>
                  ) : (
                    <span className="line-clamp-2 font-code text-[12px] text-dim">{outfit.texte}</span>
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
