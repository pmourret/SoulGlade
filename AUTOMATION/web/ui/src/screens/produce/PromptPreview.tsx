/* PREVIEW OF THE PROMPT ACTUALLY SENT. Ported from `renderApercu` in
   `static/create.js`.

   Measured 26/08/2026: on `cuisine_matin` the final prompt is 578 characters of
   which 179 are written by the user — 31 %. The rest (anchor, texture, outfit,
   tone, intention, tier) was assembled without ever being shown. A failed result
   could therefore not be diagnosed: impossible to know whether it was the scene,
   the tone, or two fragments contradicting each other.

   The panel shows each fragment with its source and its share, flags the words
   that come back from one fragment to another, and lets one amend the scene FOR
   THIS LAUNCH (without touching scenes.json).

   THE AMENDMENT FIELD IS NEVER RE-CREATED. Typing in it changes the prompt,
   hence the preview, hence the payload — repainting it would make the caret jump
   on every keystroke. It is a controlled input of its own here, and only the
   COMPUTED parts (fragments, echoes, header) follow the plan.

   IT IS THE « Prompt » TAB OF THE INSPECTOR since the design-pass screen-3b
   (§S4). It used to open above the launch bar, covering the bottom of the
   scene grid — which is why the old fumigation had to CLOSE it in order to
   tick a second scene. There is nothing left to close, and nothing left to
   cover: it simply sits in the third column, updating while scenes are
   ticked next to it. */
import type { Preview } from './useProduceState'

/** The four short, per-fragment amendments — screen-3-produire §B4. Same
    single-scene rule as `override` (the free-text scene rewrite): the
    server keeps a field only when exactly one scene is ticked. */
export type SceneAmendments = { light: string; expression: string; pose: string; outfit: string }

export const EMPTY_AMENDMENTS: SceneAmendments = { light: '', expression: '', pose: '', outfit: '' }

const AMENDMENT_FIELDS: [keyof SceneAmendments, string, string][] = [
  ['light', 'Lumière', 'ex : soft window light'],
  ['expression', 'Expression', 'ex : gentle smile'],
  ['pose', 'Pose', 'ex : leaning on the doorframe'],
  ['outfit', 'Vêtements', 'ex : oversized cardigan'],
]

export function PromptPreview({
  preview,
  /** The amendment only means something on ONE scene: with several, « the »
      scene designates nothing. The server applies the same rule
      (scene_override, and the four fields below). */
  singleScene,
  override,
  onOverride,
  amendments,
  onAmendmentChange,
}: {
  preview: Preview | null
  singleScene: boolean
  override: string
  onOverride: (value: string) => void
  amendments: SceneAmendments
  onAmendmentChange: (field: keyof SceneAmendments, value: string) => void
}) {
  /* No plan yet — nothing has been ticked, or it is still in flight. The tab
     says so rather than showing an empty frame that looks broken. */
  if (!preview)
    return (
      <p className="tiny m-0 text-dim" id="apercuVide">
        coche une scène pour voir le prompt qui partira
      </p>
    )
  return (
    <div className="overflow-x-hidden" id="apercuPanel">
      <div>
        <div className="mb-[10px]">
          <b className="block text-[14px]">Prompt envoyé</b>
          <span className="tiny" id="apMeta">
            {preview.total_car} caractères · {preview.scene}
            {preview.n_jobs > 1 ? ` · ${preview.n_jobs} images, aperçu de la première` : ''}
          </span>
        </div>

        <div id="apFrags">
          {preview.fragments.map((fragment, index) => {
            // the scene is the only fragment the user writes: we tell it apart
            const own = fragment.source === 'scène'
            return (
              <div
                /* `--panel2` and no longer `#1e2630`: a blue-tinted leftover
                   of the pre-graphite palette, and a hard value outside
                   `tokens.css` (frontend.md). */
                className={`flex items-baseline gap-[12px] border-t border-t-line py-[5px] ${
                  own ? 'mx-[-12px] bg-panel2 px-[12px]' : ''
                }`}
                key={index}
                data-fragment
                data-own={own ? '1' : undefined}
              >
                <span
                  className="min-w-[34px] flex-none text-right text-[11px] tabular-nums text-dim2"
                  data-part
                >
                  {fragment.part}%
                </span>
                <span
                  className={`min-w-[118px] flex-none text-[11.5px] uppercase tracking-[.4px] ${
                    own ? 'text-acc' : 'text-dim'
                  }`}
                  data-source
                >
                  {fragment.source}
                </span>
                {/* `min-w-0`: without it the flex item keeps its `min-width:auto`,
                    refuses to go under the width of its content and pushes the
                    line out of the frame. Both left labels being `flex-none`, it
                    was the TEXT — the only thing one comes to read — that went
                    out. */}
                <span
                  className={`min-w-0 flex-1 text-[12.5px] leading-[1.5] [overflow-wrap:anywhere]
                              ${own ? 'text-txt' : ''}`}
                >
                  {fragment.texte}
                </span>
              </div>
            )
          })}
        </div>

        <div id="apEchos">
          {preview.echos.length > 0 && (
            <div className="mt-[12px] border-t border-t-line pt-[10px]">
              <b className="mb-[8px] block text-[11.5px] uppercase tracking-[.4px] text-dim">
                mots partagés par plusieurs fragments
              </b>
              {preview.echos.map((echo) => (
                <span
                  className="mr-[6px] mb-[6px] inline-block rounded-[6px] border border-warn-line
                             bg-warn-bg px-[8px] py-[3px] text-[12px] text-warn-txt"
                  key={echo.mot}
                >
                  {echo.mot} <i className="text-[10.5px] not-italic text-dim">{echo.sources.join(' · ')}</i>
                </span>
              ))}
              <p className="tiny">
                Une répétition n'est pas forcément une faute — mais deux fragments
                qui parlent du même sujet se disputent. C'est ce qui a fait
                cohabiter « close intimate framing » et « full figure in frame ».
              </p>
            </div>
          )}
        </div>

        <div
          className={`mt-[12px] border-t border-t-line pt-[10px] ${
            singleScene ? '' : 'opacity-45'
          }`}
        >
          <label className="f">
            <span id="apAmdLbl">
              {singleScene ? (
                <>
                  amender la scène pour ce lancement — n'enregistre rien dans{' '}
                  <code>scenes.json</code>
                </>
              ) : (
                'amendement indisponible — il demande une seule scène sélectionnée'
              )}
            </span>
            <textarea
              className="min-h-[56px]"
              id="sceneOverride"
              spellCheck={false}
              placeholder="laisser vide pour garder le texte de la scène"
              disabled={!singleScene}
              value={override}
              onChange={(event) => onOverride(event.target.value)}
            />
          </label>
        </div>

        {/* screen-3-produire §B4: four short amendments, one per fragment,
            rather than folding them into the free-text override above — a
            reader of the panel above can tell "the light changed" from
            "the pose changed" instead of parsing one paragraph for both.
            Same rule, same field, same server-side guard (single scene,
            never saved, put through the same face check as scene_override). */}
        <div
          className={`mt-[12px] border-t border-t-line pt-[10px] ${
            singleScene ? '' : 'opacity-45'
          }`}
          id="fragmentAmendments"
        >
          <span className="tiny mb-[8px] block">
            amender un fragment précis pour ce lancement
          </span>
          {/* One column, not two: the panel is 340 px wide now instead of the
              full width of the launch bar, and two 145 px fields showed about
              four characters of « leaning on the doorframe ». */}
          <div className="grid grid-cols-1 gap-[8px]">
            {AMENDMENT_FIELDS.map(([field, label, placeholder]) => (
              <label className="f" key={field}>
                <span>{label}</span>
                <input
                  type="text"
                  id={`amend_${field}`}
                  spellCheck={false}
                  placeholder={placeholder}
                  disabled={!singleScene}
                  value={amendments[field]}
                  onChange={(event) => onAmendmentChange(field, event.target.value)}
                />
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
