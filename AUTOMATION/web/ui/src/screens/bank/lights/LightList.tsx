/* The lights of the character, left column of the workshop (design-pass
   lumieres, S2) — presentational.

   A light is recognised by what it says: its English sentence on two lines
   under its label. The list never moves when a sheet opens — the trial lives
   in its own column now. The open row is marked by its ground and an accent
   edge; unsaved changes are said in a word, not a dot. */
import { Icon } from '../../../chrome/Icon'
import type { LightEntry } from './useLights'

export function LightList({
  lights, loaded, selected, dirty, onChoose,
}: {
  lights: LightEntry[]
  loaded: boolean
  /** The key of the open light, if it is one of these. */
  selected: string | null
  /** The open sheet has unsaved changes. */
  dirty: boolean
  onChoose: (key: string) => void
}) {
  return (
    <div className="flex min-h-0 flex-col overflow-y-auto border-r border-r-line">
      <span className="lab px-[14px] pt-[14px] pb-[8px]">Lumières · {lights.length}</span>
      {loaded && !lights.length ? (
        <p className="m-0 px-[14px] text-[12.5px] text-dim" id="lightsEmpty">
          Aucune lumière pour l'instant. Celle que tu règles à droite sera la première : une lumière se
          règle comme en studio, puis se pose dans une scène, onglet Lumière, ou en variante. La corriger
          ici corrige toutes les scènes qui la portent.
        </p>
      ) : (
        <ul className="m-0 flex list-none flex-col p-0 pb-[14px]">
          {lights.map((light) => {
            const open = light.key === selected
            return (
              <li key={light.key}>
                <button
                  type="button"
                  className={`flex w-full flex-col gap-[3px] border-0 px-[14px] py-[9px] text-left ${
                    open ? 'bg-panel3 shadow-[inset_2px_0_0_var(--acc)]' : 'bg-transparent hover:bg-panel2'}`}
                  data-light={light.key}
                  aria-pressed={open}
                  onClick={() => onChoose(light.key)}
                >
                  <span className="flex min-w-0 items-center gap-[6px] text-[13px]">
                    <span className={`truncate ${open ? 'font-semibold' : 'font-medium'}`}>
                      {light.label || light.key}
                    </span>
                    {light.couche !== 'personnage' && (
                      <span className="flex-none rounded-pill border border-line px-[5px] text-[11px] text-dim2">
                        {light.couche === 'monde' ? 'monde' : 'ajustée'}
                      </span>
                    )}
                    {open && dirty && <span className="flex-none text-[11px] text-warn-txt">modifiée</span>}
                  </span>
                  {light.erreur ? (
                    <span className="flex items-center gap-[4px] text-[12px] text-warn-txt">
                      <Icon name="warn" className="h-[11px] w-[11px] flex-none" />
                      {light.erreur}
                    </span>
                  ) : (
                    <span className="line-clamp-2 font-code text-[12px] text-dim">{light.texte}</span>
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
