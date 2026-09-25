/* Step 1, Identité (design-pass screen-14 §S7). Presentation only.

   The two fields that used to sit above the stepper. The id is validated as it
   is typed and the verdict is WRITTEN beside it, never only coloured. While
   the id is empty or invalid and a name exists, the slug of that name is
   offered — the field following the name until it is typed by hand is the
   screen's business, not this component's. */
export function IdentityStep({
  name,
  cid,
  cidValid,
  proposal,
  onName,
  onCid,
}: {
  name: string
  cid: string
  cidValid: boolean
  /** `slugify(name)`, or '' when the name holds nothing usable. */
  proposal: string
  onName: (value: string) => void
  onCid: (value: string) => void
}) {
  const showProposal = !cidValid && proposal !== '' && proposal !== cid
  return (
    <div className="flex max-w-[520px] flex-col gap-[18px]">
      <label className="f">
        <span>Nom affiché</span>
        <input
          id="wizName"
          autoComplete="off"
          placeholder="ex : Léna"
          value={name}
          onChange={(event) => onName(event.target.value)}
        />
      </label>
      <div>
        <label className="f" htmlFor="wizCid">
          <span>Identifiant · dossiers, URL, base de données</span>
        </label>
        <div className="flex items-center gap-[12px]">
          <input
            id="wizCid"
            className="min-w-0 flex-1 font-code"
            autoComplete="off"
            spellCheck={false}
            placeholder="ex : lena"
            aria-describedby="wizCidHint"
            value={cid}
            onChange={(event) => onCid(event.target.value)}
          />
          <span className="flex w-[200px] flex-none items-center gap-[6px] text-[12.5px]" id="wizCidHint">
            {cid === '' ? null : cidValid ? (
              <>
                <i className="h-[7px] w-[7px] rounded-full bg-ok" aria-hidden="true" />
                <span className="text-ok-txt">valide</span>
              </>
            ) : (
              <>
                <i className="h-[7px] w-[7px] rotate-45 bg-bad" aria-hidden="true" />
                <span className="text-danger-txt">minuscules, chiffres, - et _</span>
              </>
            )}
          </span>
        </div>
        {showProposal && (
          <p className="mt-[8px] mb-0 text-[12.5px] text-dim">
            Proposé : <code className="font-code text-txt">{proposal}</code> ·{' '}
            <button type="button" className="link" onClick={() => onCid(proposal)}>
              Utiliser
            </button>
          </p>
        )}
      </div>
    </div>
  )
}
