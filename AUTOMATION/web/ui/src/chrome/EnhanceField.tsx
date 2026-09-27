/* The common case of « Améliorer » (design-pass screen-ameliorer §S3): a head
   row — the field's `.lab`, then « Améliorer » on the right — and the field
   under it, revised in place. Nothing is added under the field at rest.

   The caller keeps its own field (id, classes, aria-describedby, the hint
   under it): it passes it as `children`. */
import type { ReactNode } from 'react'

import type { EnhanceKind, Enhancer } from '../api/useEnhance'
import { EnhanceTrigger } from './EnhanceTrigger'
import { RevisionView } from './RevisionView'
import { useEnhance } from './useEnhance'

export function EnhanceField({
  label,
  htmlFor,
  kind,
  value,
  onApply,
  enhancer,
  disabled,
  children,
}: {
  label: string
  /** The field's id, for the `<label>`. */
  htmlFor: string
  kind: EnhanceKind
  value: string
  onApply: (text: string) => void
  enhancer: Enhancer
  disabled?: boolean
  children: ReactNode
}) {
  const enhance = useEnhance({ label, kind, value, onApply, enhancer, disabled })
  return (
    <div className="flex flex-col gap-[5px]" data-enhance ref={enhance.rootRef}>
      <div className="flex min-h-[24px] flex-wrap items-center gap-[6px]">
        <label className="lab" htmlFor={htmlFor}>
          {label}
        </label>
        <EnhanceTrigger enhance={enhance} />
      </div>
      <RevisionView enhance={enhance}>{children}</RevisionView>
    </div>
  )
}
