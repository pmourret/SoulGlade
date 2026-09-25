/* The passport: portrait, name, state pills, two actions. Presentation only —
   it receives the portrait URL and the two callbacks, and calls no API
   (.claude/rules/frontend.md).

   THE PORTRAIT IS THE FROZEN BASE, since 23/09/2026 and `GET /img/base`. It
   falls back on the initial in three cases that all land on the same `onError`:
   no base declared, a base whose file is gone, an unreadable one. The header
   badge keeps the initial for good — at 26 px a face is a smudge and a letter
   is legible; here there are 300 px of column, and the face is the one thing
   the sheet can show that no list of properties can.

   Ratio 4:5 whatever the source: a frozen base is framed centred and neutral
   (`base_portrait.py`), so cropping to portrait never cuts the face out. */
import { Link } from 'react-router-dom'

import { initialOf, type CharacterSheet } from '../../character/CharacterContext'
import { PATHS } from '../../app/routes'
import { baseState } from './sheetRows'

export function SheetAside({
  sheet,
  portraitUrl,
  portraitFailed,
  onPortraitError,
  onChangeCharacter,
}: {
  sheet: CharacterSheet
  portraitUrl: string
  portraitFailed: boolean
  onPortraitError: () => void
  onChangeCharacter: (event: React.MouseEvent) => void
}) {
  const name = sheet.name || sheet.id
  const base = baseState(sheet)
  const missing = base === 'missing'
  /* Ask for the bytes ONLY when the sheet already says they exist. `base`
     comes from the same `config.json` the route reads, so on « absente » or
     « introuvable » the request is a round trip whose 404 we can predict —
     and predicting it is what lets the frame paint its real state on the
     first render instead of after a failed image. */
  const showPortrait = base === 'present' && !portraitFailed

  return (
    <aside className="sticky top-[24px] self-start">
      <div
        className={`relative mb-[16px] aspect-[4/5] w-full overflow-hidden rounded-card
                    ${missing
                      ? 'border border-dashed border-danger-line bg-danger-bg'
                      : 'border border-line bg-panel'}`}
      >
        {showPortrait ? (
          <img
            src={portraitUrl}
            alt={`Portrait de base gelée de ${name}`}
            className="h-full w-full object-cover"
            onError={onPortraitError}
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-[10px]">
            {/* The name is read out just below, so the letter is decoration */}
            <span className="text-[72px] font-bold leading-none text-acc" aria-hidden="true">
              {initialOf(sheet)}
            </span>
            {missing && (
              <span className="px-[16px] text-center text-[12px] text-danger-txt">
                Base gelée introuvable
              </span>
            )}
          </div>
        )}
      </div>

      <h1 className="m-0 text-[24px] font-semibold tracking-[-.2px] text-txt">{name}</h1>
      <code className="font-code text-[12px] text-dim2">{sheet.id}</code>

      <div className="mt-[14px] flex flex-wrap gap-[6px]">
        <BasePill state={base} />
        {sheet.nsfw && (
          <span
            className="rounded-[4px] border border-warn-line bg-warn-bg px-[7px] py-[3px]
                       text-[11px] font-semibold text-warn-txt"
          >
            ADULTE ARMÉ
          </span>
        )}
      </div>

      <div className="mt-[20px] flex flex-col gap-[8px]">
        <Link
          to={PATHS.produce}
          className="flex h-[36px] items-center justify-center rounded-[6px] bg-pri
                     text-[13.5px] font-semibold text-on-pri no-underline hover:bg-pri-h"
        >
          Produire avec {name}
        </Link>
        {/* Reopens the HEADER menu — there are not two places where one changes
            character. stopPropagation: the outside click that closes that menu
            would otherwise close the one this button opens. */}
        <button
          type="button"
          className="h-[34px] rounded-[6px] border border-line2 bg-transparent
                     text-[13px] text-dim hover:border-dim2 hover:text-txt"
          id="ficheAutres"
          onClick={onChangeCharacter}
        >
          Changer de personnage
        </button>
      </div>
    </aside>
  )
}

/* A dot or a diamond AND words, never a colour on its own. The three states
   are three different problems (see `baseState`), so they get three wordings
   rather than one « indisponible ». */
function BasePill({ state }: { state: 'present' | 'missing' | 'absent' }) {
  if (state === 'present') {
    return (
      <span
        className="flex items-center gap-[6px] rounded-[4px] border border-ok-line
                   bg-ok-bg px-[7px] py-[3px] text-[11px] font-semibold text-ok-txt"
      >
        <i className="h-[6px] w-[6px] rounded-full bg-ok" aria-hidden="true" />
        Base gelée présente
      </span>
    )
  }
  if (state === 'missing') {
    return (
      <span
        className="flex items-center gap-[6px] rounded-[4px] border border-danger-line
                   bg-danger-bg px-[7px] py-[3px] text-[11px] font-semibold text-danger-txt"
      >
        <i className="h-[6px] w-[6px] rotate-45 bg-bad" aria-hidden="true" />
        Base gelée introuvable
      </span>
    )
  }
  return (
    <span
      className="flex items-center gap-[6px] rounded-[4px] border border-line2
                 px-[7px] py-[3px] text-[11px] font-semibold text-dim"
    >
      <i className="h-[6px] w-[6px] rounded-full bg-dim2" aria-hidden="true" />
      Aucune base gelée
    </span>
  )
}
