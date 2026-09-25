/* « Fiche en construction » — a read-only mirror of the wizard's choices so
   far, always visible (design-pass screen-14 §S8). The base leads, in large:
   it is the one choice that is a face.

   Pure presentation: props only (frontend.md). Never a Tab stop: this is a
   reading surface, not a control. */
const LABEL = 'text-[12px] text-dim'
const VALUE = 'min-w-0 truncate text-right text-[13px] text-txt'
const PLACEHOLDER = 'text-right text-[13px] text-dim2'

function Field({ label, value, field, mono = false }: { label: string; value: string | null; field: string; mono?: boolean }) {
  return (
    <>
      <dt className={LABEL}>{label}</dt>
      <dd className={`m-0 ${value ? VALUE : PLACEHOLDER} ${mono && value ? 'font-code text-[12px]' : ''}`} data-field={field} title={value ?? undefined}>
        {value ?? '—'}
      </dd>
    </>
  )
}

export function BuildSheetPanel({
  name,
  cid,
  typeLabel,
  styleLabel,
  worldLabel,
  frozenBase,
  basePreview,
}: {
  name: string
  cid: string
  typeLabel: string | null
  styleLabel: string | null
  worldLabel: string | null
  frozenBase: string | null
  basePreview: string
}) {
  return (
    <aside
      className="flex w-[340px] flex-none flex-col gap-[16px] overflow-y-auto border-l border-line bg-panel p-[20px]
                 max-[1100px]:w-auto max-[1100px]:border-t max-[1100px]:border-l-0"
      aria-label="Fiche en construction"
    >
      <h3 className="m-0 text-[11.5px] uppercase tracking-[.5px] text-dim">Fiche en construction</h3>
      {frozenBase ? (
        <img
          className="aspect-[4/5] w-full rounded-card border-2 border-acc object-cover max-[1100px]:w-[200px]"
          alt="base d'identité"
          src={basePreview}
        />
      ) : (
        <span className="block aspect-[4/5] w-full rounded-card border-2 border-dashed border-line2 max-[1100px]:w-[200px]" />
      )}
      <dl className="m-0 grid grid-cols-[auto_minmax(0,1fr)] gap-x-[16px] gap-y-[8px]">
        <Field label="Nom" value={name.trim() || null} field="name" />
        <Field label="Identifiant" value={cid || null} field="cid" mono />
        <Field label="Type" value={typeLabel} field="type" />
        <Field label="Style" value={styleLabel} field="style" />
        <Field label="Monde" value={worldLabel} field="world" />
        <Field label="Base" value={frozenBase} field="base" mono />
      </dl>
      <p className="m-0 mt-auto text-[12px] text-dim2">
        Type, style et monde : figés. Un autre choix, c'est un autre personnage.
      </p>
    </aside>
  )
}
