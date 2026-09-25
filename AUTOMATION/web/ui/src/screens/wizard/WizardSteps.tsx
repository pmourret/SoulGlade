/* The five steps, down the left column (design-pass screen-14 §S6).
   Presentation only.

   A DONE step is a button: one goes back to it. A step to come is not — the
   gating lives in the bottom bar, and a stepper that let one jump ahead would
   be a second, weaker copy of it. Under 1100 px the list lies flat across the
   top. */
import { Icon } from '../../chrome/Icon'
import { STEPS, type Step } from './shared'

const LABELS: Record<Step, string> = {
  identity: 'Identité',
  type: 'Type',
  style: 'Style',
  world: 'Monde',
  base: "Base d'identité",
}

const BULLET = 'flex h-[22px] w-[22px] flex-none items-center justify-center rounded-[50%] text-[11.5px] font-semibold not-italic'
const BULLET_STATE = {
  todo: 'border border-line2 text-dim2',
  on: 'bg-txt text-bg',
  done: 'bg-ok-bg border border-ok-line text-ok-txt',
}
const ROW =
  'flex w-full items-start gap-[10px] rounded-[8px] border-0 px-[10px] py-[9px] text-left ' +
  'max-[1100px]:py-[6px]'

export function WizardSteps({
  step,
  answers,
  onGoTo,
}: {
  step: number
  /** The answer of each step, shown under its label once done. */
  answers: Record<Step, string | null>
  onGoTo: (index: number) => void
}) {
  return (
    <ol
      className="m-0 flex list-none flex-col gap-[2px] p-0 max-[1100px]:flex-row max-[1100px]:flex-wrap"
      id="wizSteps"
      aria-label="Étapes de création"
    >
      {STEPS.map((key, index) => {
        const state = index < step ? 'done' : index === step ? 'on' : 'todo'
        const body = (
          <>
            <i className={`${BULLET} ${BULLET_STATE[state]}`} aria-hidden="true">
              {state === 'done' ? <Icon name="check" className="h-[12px] w-[12px]" /> : index + 1}
            </i>
            <span className="min-w-0">
              <span
                className={`block text-[13.5px] ${
                  state === 'on' ? 'font-semibold text-txt' : state === 'done' ? 'text-txt' : 'text-dim2'
                }`}
              >
                {LABELS[key]}
              </span>
              {state === 'done' && answers[key] && (
                <span className="block truncate text-[12px] text-dim max-[1100px]:hidden">{answers[key]}</span>
              )}
            </span>
          </>
        )
        return (
          <li key={key} data-step={state} aria-current={state === 'on' ? 'step' : undefined}>
            {state === 'done' ? (
              <button
                type="button"
                className={`${ROW} cursor-pointer bg-transparent hover:bg-panel2`}
                onClick={() => onGoTo(index)}
              >
                {body}
              </button>
            ) : (
              <div
                className={`${ROW} ${state === 'on' ? 'bg-panel3 shadow-[inset_2px_0_0_var(--acc)]' : ''}`}
              >
                {body}
              </div>
            )}
          </li>
        )
      })}
    </ol>
  )
}
