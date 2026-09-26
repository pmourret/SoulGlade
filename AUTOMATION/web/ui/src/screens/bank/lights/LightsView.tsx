/* The light catalogue — the sixth sub-view of the Atelier (IT-10 chantier 7).

   WHAT A LIGHT IS HERE: a label and one sentence of prompt. A scene wears it
   by its key, in its Lumière field or as a variant, and the launch resolves
   it into text after the décor (`DOCS/cadrage/2026-09-26-it10-c7-lumieres.md`).
   Correcting a light here corrects every scene that wears it.

   THE SHAPE IS THE OUTFITS' next door: the same workshop bar handed down by
   `BankScreen`, the same list and 340 px inspector that becomes a drawer
   under 1100 px. The row says the text in full on two lines: a light is
   recognised by what it says. */
import { useEffect, useRef, useState, type ReactNode } from 'react'

import { useChrome } from '../../../chrome/ChromeContext'
import { useConfirm } from '../../../chrome/ConfirmContext'
import { Icon } from '../../../chrome/Icon'
import { useToast } from '../../../chrome/ToastContext'
import { useScenes } from '../../../state/ScenesStoreContext'
import { useOverlayPanel } from '../../produce/useOverlayPanel'
import { LightInspector } from './LightInspector'
import { useLights, type LightEntry } from './useLights'

const NEW = '\u0000new'

export function LightsView({ nav }: { nav: ReactNode }) {
  const toast = useToast()
  const confirm = useConfirm()
  const { narrow } = useChrome()
  const { world } = useScenes()
  const { lights, marker, loaded, busy, create, save, remove } = useLights()

  const [selected, setSelected] = useState<string | null>(null)
  const selectedLight = lights.find((l) => l.key === selected) ?? null
  const inspecting = selected === NEW || selectedLight !== null

  // A light removed under the selection leaves nothing to inspect.
  useEffect(() => {
    if (selected && selected !== NEW && loaded && !lights.some((l) => l.key === selected))
      setSelected(null)
  }, [lights, selected, loaded])

  const drawerRef = useRef<HTMLDivElement | null>(null)
  useOverlayPanel(narrow && inspecting, () => setSelected(null), drawerRef)

  const onCreate = async (label: string, text: string, toWorld: boolean) => {
    const result = await create(label, text, toWorld)
    if (!result.ok) {
      toast(result.erreur)
      return
    }
    if (result.light) setSelected(result.light.key)
    toast(toWorld ? 'lumière créée dans le monde' : 'lumière créée')
  }

  const onSave = async (key: string, fields: { label: string; text: string }, toWorld: boolean) => {
    const result = await save(key, fields, toWorld)
    toast(result.ok ? 'lumière enregistrée — les scènes qui la portent suivent' : result.erreur)
  }

  const onDelete = async (light: LightEntry) => {
    const adjusted = light.couche === 'surcharge'
    const ok = await confirm({
      title: adjusted ? 'Rendre cette lumière au monde ?' : 'Retirer cette lumière ?',
      button: adjusted ? 'Rendre au monde' : 'Retirer',
      danger: !adjusted,
      body: adjusted ? (
        <p>
          Ce qui a été ajusté ici est effacé ; <b>{light.label || light.key}</b> revient à ce que
          le monde en dit, et les scènes qui la portent avec elle.
        </p>
      ) : (
        <p>
          <b>{light.label || light.key}</b> quitte{' '}
          {light.couche === 'monde' ? 'le monde — tous ses personnages la perdent' : 'ce personnage'}.
          Une lumière qu'une scène porte encore ne part pas : le studio dit laquelle.
        </p>
      ),
    })
    if (!ok) return
    const result = await remove(light.key)
    toast(result.ok ? (adjusted ? 'rendue au monde' : 'lumière retirée') : result.erreur)
  }

  return (
    <div className="flex h-full min-h-0 flex-col" id="bankLights">
      <div className="flex h-[48px] flex-none items-center gap-[10px] border-b border-b-line px-[16px]
                      [&>*]:whitespace-nowrap">
        {nav}

        <span className="min-w-0 flex-1 truncate text-[12.5px] text-dim2 max-[1280px]:hidden">
          <span id="nLights">{lights.length}</span> lumière{lights.length > 1 ? 's' : ''} ·
          réutilisées d'une scène à l'autre, du monde et de ce personnage
        </span>
        <span className="flex-1 min-[1281px]:hidden" />

        <button
          type="button"
          className="btn primary sm flex-none"
          id="btnLightNew"
          disabled={busy}
          onClick={() => setSelected(NEW)}
        >
          Nouvelle lumière
        </button>
      </div>

      <div
        className={`grid min-h-0 flex-1 ${
          inspecting && !narrow ? 'grid-cols-[minmax(0,1fr)_340px]' : 'grid-cols-1'
        }`}
      >
        <div className="min-h-0 overflow-y-auto">
          {loaded && !lights.length ? (
            <div className="flex h-full items-center justify-center p-[24px]">
              <div
                className="flex max-w-[520px] flex-col items-center gap-[12px] rounded-card border-2
                           border-dashed border-line2 px-[28px] py-[36px] text-center text-[13px] text-dim"
                id="lightsEmpty"
              >
                <p className="m-0">
                  Aucune lumière. Une lumière est une phrase du prompt — « soft window light from the
                  left » — qui se pose ensuite dans une scène, onglet Lumière, ou en variante. La
                  corriger ici corrige toutes les scènes qui la portent.
                </p>
                {/* Secondaire : « Nouvelle lumière », dans la barre, reste le
                    seul appel primaire de la vue (même règle que les tenues). */}
                <button type="button" className="btn sm" onClick={() => setSelected(NEW)}>
                  Créer une lumière
                </button>
              </div>
            </div>
          ) : (
            <ul className="m-0 flex list-none flex-col gap-[8px] p-[14px]">
              {lights.map((light) => (
                <li key={light.key}>
                  <button
                    type="button"
                    className={`flex w-full flex-col gap-[4px] rounded-card border bg-panel px-[12px]
                                py-[9px] text-left ${light.key === selected ? 'border-txt' : 'border-line'}`}
                    data-light={light.key}
                    aria-pressed={light.key === selected}
                    onClick={() => setSelected(light.key)}
                  >
                    <span className="flex items-center gap-[6px] text-[13px]">
                      <b className="truncate font-medium">{light.label || light.key}</b>
                      {light.couche !== 'personnage' && (
                        <span className="rounded-pill border border-line px-[5px] text-[11px] text-dim2">
                          {light.couche === 'monde' ? 'monde' : 'ajustée'}
                        </span>
                      )}
                    </span>
                    {light.erreur ? (
                      <span className="flex items-center gap-[4px] text-[12px] text-warn-txt">
                        <Icon name="warn" className="h-[11px] w-[11px] flex-none" aria-hidden="true" />
                        {light.erreur}
                      </span>
                    ) : (
                      <span className="line-clamp-2 font-code text-[12px] text-dim">{light.texte}</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {inspecting && (
          <div
            ref={drawerRef}
            id="lightPanel"
            aria-label="Fiche de la lumière"
            role={narrow ? 'dialog' : undefined}
            className={`min-h-0 border-l border-l-line bg-panel ${
              narrow ? 'fixed top-0 right-0 bottom-0 z-[9] w-[min(340px,100vw)] shadow-elev' : ''
            }`}
          >
            {narrow && (
              <button
                type="button"
                className="ml-auto block border-0 bg-transparent px-[12px] py-[8px] text-[16px] text-dim hover:text-txt"
                aria-label="Fermer la fiche"
                onClick={() => setSelected(null)}
              >
                ×
              </button>
            )}
            <LightInspector
              light={selected === NEW ? null : selectedLight}
              busy={busy}
              marker={marker}
              worldLabel={world ? world.label : null}
              onCreate={(label, text, toWorld) => void onCreate(label, text, toWorld)}
              onSave={(fields, toWorld) => selectedLight && void onSave(selectedLight.key, fields, toWorld)}
              onDelete={() => selectedLight && void onDelete(selectedLight)}
            />
          </div>
        )}
      </div>
    </div>
  )
}
