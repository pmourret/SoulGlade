/* « Nouvelle scène : [intention ▾] au [lieu ▾] [Créer] » (design-pass 19 §S4.5).

   A scene IS an intention in a place: the sentence says it before the form
   does, and creating one no longer means opening a blank form, then picking
   the two things it is made of in two lists further down. Créer hands both to
   the screen, which opens the new scene with them set and the focus in « Ce
   qui s'y passe ».

   Presentation only. The two picks are local UI state: they are a proposal,
   nothing is written until the scene is saved from the chrome's banner. */
import { useState } from 'react'

import type { Chapter } from './bookChapters'

const PILL = '!w-auto h-[30px] max-w-[220px] rounded-[6px] border-line2 bg-panel3 py-0 text-[13px]'

export function SceneSentence({
  prefix,
  intentions,
  places,
  createId,
  onCreate,
  onGoTo,
}: {
  /** Keeps the two sentences (ordinary, adult) apart in the DOM. */
  prefix: string
  intentions: { key: string; label: string }[]
  places: { id: string; label: string }[]
  /** `btnAddEntry` when this chapter is the open one (smoke-test hook). */
  createId?: string
  onCreate: (intention: string, place: string) => void
  onGoTo: (chapter: Chapter) => void
}) {
  const [intention, setIntention] = useState('')
  const [place, setPlace] = useState('')
  // A pick the catalog no longer holds falls back to the first one.
  const pickedIntention = intentions.some((i) => i.key === intention) ? intention : (intentions[0]?.key ?? '')
  const pickedPlace = places.some((p) => p.id === place) ? place : (places[0]?.id ?? '')

  const missing: Chapter | null = !places.length ? 'lieux' : !intentions.length ? 'intentions' : null
  if (missing) {
    return (
      <p className="m-0 mb-[12px] text-[13px] text-dim" id={`${prefix}Missing`}>
        Il faut d'abord un lieu et une intention.{' '}
        <button type="button" className="link" onClick={() => onGoTo(missing)}>
          {missing === 'lieux' ? 'Aller aux lieux' : 'Aller aux intentions'}
        </button>
      </p>
    )
  }

  return (
    <div className="mb-[12px] flex flex-wrap items-center gap-[8px] text-[13px]">
      <span className="text-dim">Nouvelle scène :</span>
      <label className="sr-only" htmlFor={`${prefix}Intention`}>
        intention de la nouvelle scène
      </label>
      <select
        id={`${prefix}Intention`}
        className={PILL}
        value={pickedIntention}
        onChange={(e) => setIntention(e.target.value)}
      >
        {intentions.map((i) => (
          <option key={i.key} value={i.key}>
            {i.label}
          </option>
        ))}
      </select>
      <span className="text-dim">au</span>
      <label className="sr-only" htmlFor={`${prefix}Place`}>
        lieu de la nouvelle scène
      </label>
      <select id={`${prefix}Place`} className={PILL} value={pickedPlace} onChange={(e) => setPlace(e.target.value)}>
        {places.map((p) => (
          <option key={p.id} value={p.id}>
            {p.label}
          </option>
        ))}
      </select>
      <button
        type="button"
        id={createId}
        className="btn primary sm"
        onClick={() => onCreate(pickedIntention, pickedPlace)}
      >
        Créer
      </button>
    </div>
  )
}
