/* The sheet of the loaded character, at /character. READ-ONLY.

   WHY IT EXISTS (F1.2). The navbar used to open the same screen as the entry
   gate — a SECOND door to CHOOSE a character, while the identity menu already
   changes, lists and creates. There were therefore two doors to choose, and
   none to READ the character that is open. This is that reading, and nothing
   else.

   WHAT IT DOES NOT DO, spelled out:
     - it does not replay the choice grid: « Changer de personnage » reopens the
       header menu, the one place a character is changed;
     - it never arms anything. Adult content has ONE gesture, on the Application
       screen (J7, ADR-0010) — here we read its state and say where it is taken.

   PASSPORT + PROPERTIES (design-pass screen-2, 23/09/2026). It used to be a
   46 px initial followed by two `.meta` cards side by side: the right data,
   and no hierarchy over it — the frozen base, the pack and the adult state all
   read as equally important, and a grey sentence under each card explained in
   words what the layout should have shown. Now a sticky passport on the left
   answers « who », and five titled sections on the right answer « what », each
   carrying the RULE that governs it.

   ONE CALL, AND IT IS ALREADY MADE. /api/character is loaded by
   CharacterContext for the chrome; the sheet reads the same object. The legacy
   frontend fetched that route TWICE — once for the header, once for the sheet
   — and cached each separately. `/api/state` is likewise already polled for the
   chrome, which is where the Production counts come from. */
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { useCharacter } from '../../character/CharacterContext'
import { useChrome } from '../../chrome/ChromeContext'
import { useSystemState } from '../../state/SystemStateContext'
import { PATHS, worldPlacesPath } from '../../app/routes'
import { PropertyRow, PropertySection, StatusDot } from './PropertySection'
import { SheetAside } from './SheetAside'
import {
  adultState, baseName, baseState, contentTypes, productionRows, styleLabel,
} from './sheetRows'

/** A right-aligned action link of a property row. Always says what it opens —
    never « ici » (.claude/rules/frontend.md). */
function RowLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      className="flex-none text-[12.5px] text-acc underline [text-underline-offset:3px]"
    >
      {children}
    </Link>
  )
}

export function CharacterSheetScreen() {
  const { claimed, sheet, sheetError, refreshSheet } = useCharacter()
  const { openIdentityMenu } = useChrome()
  const { state } = useSystemState()

  /* The portrait URL is built HERE, where the claimed id lives, and handed to
     the presentation as a prop — a subcomponent never calls the API. The
     failure path is an `<img onError>` rather than a fetch: the browser is
     already making the request, and a 404 needs no second round trip to be
     noticed. Reset on every character change, or the next one would inherit
     the previous one's failure. */
  const [portraitFailed, setPortraitFailed] = useState(false)
  useEffect(() => setPortraitFailed(false), [claimed])

  /* Reached with no character claimed — a pasted /character link, or a switch
     back to the gate. The registry is the honest destination, and it is one
     click away rather than an empty screen. */
  if (!claimed) {
    return (
      <div className="screen">
        <div className="wrap">
          <div className="empty">
            <b>Aucun personnage ouvert</b>
            <p className="muted">Cette fiche lit le personnage chargé ; il n'y en a pas.</p>
            <p className="mt-[18px]">
              <Link
                className="inline-flex h-[36px] items-center rounded-[6px] bg-pri px-[16px]
                           text-[13.5px] font-semibold text-on-pri no-underline hover:bg-pri-h"
                to={PATHS.characters}
              >
                Ouvrir le registre
              </Link>
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (sheetError) {
    /* The fallback invents nothing: the id comes from the URL, it is true even
       when the rest is missing. Saying what we do not know beats an empty
       sheet — and « Voir le journal » is where the server said why. */
    return (
      <div className="screen" id="registre" data-vue="fiche">
        <div className="mx-auto w-[min(440px,100%)] px-[20px] py-[64px]">
          <div className="rounded-[10px] border border-danger-line bg-panel p-[22px]">
            <h1 className="m-0 flex items-center gap-[9px] text-[17px] text-danger-txt">
              <span className="h-[8px] w-[8px] flex-none rotate-45 bg-bad" aria-hidden="true" />
              Fiche indisponible
            </h1>
            <p className="mt-[10px] text-[13.5px] text-dim">
              Le serveur n'a pas rendu la fiche de <code>{claimed}</code> : {sheetError}.
            </p>
            <div className="mt-[18px] flex gap-[8px]">
              <button
                className="h-[34px] rounded-[6px] bg-pri px-[14px] text-[13px] font-semibold
                           text-on-pri hover:bg-pri-h"
                id="ficheRetry"
                onClick={refreshSheet}
              >
                Réessayer
              </button>
              <Link
                className="flex h-[34px] items-center rounded-[6px] border border-line2
                           px-[14px] text-[13px] text-dim no-underline hover:text-txt"
                to={PATHS.journal}
              >
                Voir le journal
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!sheet) {
    /* The SHAPE of a loaded sheet, not a sentence — same idea as the wizard's
       loading skeleton. No pack is resolved yet at this point (the name that
       would tell us which is exactly what has not loaded), so this stays on
       whichever token sheet is already active. */
    return (
      <div className="screen" id="registre" data-vue="fiche">
        <div className="mx-auto grid max-w-[1120px] grid-cols-[300px_minmax(0,1fr)] gap-[40px]
                        p-[32px_32px_48px] max-[1100px]:grid-cols-[220px_minmax(0,1fr)]
                        max-[1100px]:gap-[28px] max-[1100px]:p-[24px]"
             aria-hidden="true">
          <div>
            <div className="mb-[16px] aspect-[4/5] w-full rounded-[8px] bg-panel" />
            <div className="h-[24px] w-[70%] rounded-[4px] bg-line" />
            <div className="mt-[8px] h-[12px] w-[45%] rounded-[4px] bg-line" />
          </div>
          <div>
            {[0, 1].map((section) => (
              <div key={section} className="mb-[26px]">
                <div className="mb-[14px] h-[10px] w-[90px] rounded-[3px] bg-line" />
                {[0, 1, 2].map((row) => (
                  <div key={row} className="grid grid-cols-[190px_minmax(0,1fr)] gap-[16px]
                                            border-b border-line py-[13px]">
                    <div className="h-[12px] w-[120px] rounded-[3px] bg-line" />
                    <div className="h-[12px] w-[55%] rounded-[3px] bg-line" />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const pack = sheet.universe ?? {}
  const base = baseState(sheet)
  const name = baseName(sheet)
  const contents = contentTypes(sheet)
  const adult = adultState(sheet)
  const production = productionRows(state?.counts, {
    review: PATHS.review,
    gallery: PATHS.gallery,
  })

  return (
    <div className="screen" id="registre" data-vue="fiche">
      <div
        className="mx-auto grid max-w-[1120px] grid-cols-[300px_minmax(0,1fr)] gap-[40px]
                   p-[32px_32px_48px] max-[1100px]:grid-cols-[220px_minmax(0,1fr)]
                   max-[1100px]:gap-[28px] max-[1100px]:p-[24px]
                   max-[760px]:grid-cols-1"
        id="fiche"
      >
        <SheetAside
          sheet={sheet}
          portraitUrl={`/img/base?character=${encodeURIComponent(claimed)}`}
          portraitFailed={portraitFailed}
          onPortraitError={() => setPortraitFailed(true)}
          onChangeCharacter={(event) => {
            event.stopPropagation()
            openIdentityMenu()
          }}
        />

        <div>
          <PropertySection
            title="Création"
            rule="figée à la création — en changer, c'est créer un autre personnage"
          >
            <PropertyRow term="Type de personnage">{sheet.type || '—'}</PropertyRow>
            <PropertyRow term="Style de sortie">
              {styleLabel(sheet.output_style) || '—'}
            </PropertyRow>
            <PropertyRow
              term="Monde"
              action={
                sheet.world?.id ? (
                  <RowLink to={worldPlacesPath(sheet.world.id)}>Ouvrir le monde</RowLink>
                ) : undefined
              }
            >
              {sheet.world?.label || '—'}
            </PropertyRow>
          </PropertySection>

          <PropertySection
            title="Pack"
            rule="déduit du type et du style · porte le verrou d'identité"
          >
            <PropertyRow term="Pack">{pack.label || pack.id || '—'}</PropertyRow>
            <PropertyRow term="Famille de modèle">{pack.model_family || '—'}</PropertyRow>
            <PropertyRow term="Base gelée">
              {base === 'present' && (
                <>
                  <StatusDot tone="ok" />
                  Présente
                  {name && (
                    <code className="ml-[7px] inline-block max-w-[280px] overflow-hidden
                                     text-ellipsis whitespace-nowrap align-bottom
                                     font-code text-dim2">
                      {name}
                    </code>
                  )}
                </>
              )}
              {base === 'missing' && (
                <>
                  <StatusDot tone="bad" />
                  Introuvable
                  <span className="ml-[7px] text-[13px] text-dim">
                    <code className="font-code">{name}</code> attendue dans les entrées de ComfyUI
                  </span>
                </>
              )}
              {base === 'absent' && (
                <>
                  <StatusDot tone="none" />
                  Absente
                </>
              )}
            </PropertyRow>
          </PropertySection>

          <PropertySection title="Contenus" rule="registre de création">
            <PropertyRow term="Image">
              <StatusDot tone={contents.active.includes('Image') ? 'ok' : 'none'} />
              {contents.active.includes('Image') ? 'Actif' : 'Inactif'}
            </PropertyRow>
            {contents.dormant.length > 0 && (
              <PropertyRow term="Déclarés, pas encore branchés">
                <span className="text-dim">{contents.dormant.join(', ')}</span>
              </PropertyRow>
            )}
          </PropertySection>

          <PropertySection
            title="Contenu adulte"
            rule="se règle dans Application → Contenu adulte"
          >
            <PropertyRow
              term="État"
              action={<RowLink to={PATHS.application}>Régler</RowLink>}
            >
              {/* `id` as a test hook, like `#ficheAutres` and `#ficheRetry`:
                  « Désactivé » CONTAINS « activé », so a substring assertion on
                  the screen text is wrong in both directions. The fumigation
                  reads this node and compares the whole value. */}
              <span id="ficheAdulte" className={adult.armed ? 'text-warn-txt' : undefined}>
                {adult.label}
              </span>
              {/* The reason comes from the server (edit_tool_state): the same
                  sentence as the Application screen, not a second wording. */}
              {adult.reason && (
                <span className="mt-[4px] block text-[13px] text-dim">{adult.reason}</span>
              )}
            </PropertyRow>
            <PropertyRow term="Effet">
              <span className="text-dim">{adult.effect}</span>
            </PropertyRow>
          </PropertySection>

          {production.length > 0 && (
            <PropertySection title="Production" rule="lu dans l'état du studio">
              {production.map((row) => (
                <PropertyRow
                  key={row.key}
                  term={row.term}
                  action={<RowLink to={row.to}>{row.link}</RowLink>}
                >
                  <b className="font-semibold tabular-nums">{row.value}</b>
                </PropertyRow>
              ))}
            </PropertySection>
          )}
        </div>
      </div>
    </div>
  )
}
