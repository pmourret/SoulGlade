/* The left navigation of Application (design-pass screen-12 §S3): the
   settings sorted by WHAT they apply to — the machine, the open character, the
   logs. Each entry carries its state on the right, in word + shape.

   Real links, `replace`d: the back button leaves the screen instead of
   replaying every section clicked. Under 900 px the list becomes a select at
   the top (§S8). Presentation only. */
import { Link, useNavigate } from 'react-router-dom'

import { PATHS, appSectionPath, type AppSection } from '../../app/routes'
import { StatusPill, type Tone } from './StatusPill'

type Entry = { section: AppSection; label: string; state: { tone: Tone; text: string; mark?: boolean } | null }

export function AppNav({
  current,
  name,
  online,
  armed,
  journalCount,
  logCount,
}: {
  current: AppSection
  /** The open character's name, or null when none is open. */
  name: string | null
  online: boolean | null
  armed: boolean | null
  journalCount: number | null
  logCount: number
}) {
  const navigate = useNavigate()
  const groups: { title: string; disabled?: boolean; entries: Entry[] }[] = [
    {
      title: 'Machine',
      entries: [
        { section: 'server', label: 'Serveur web local', state: { tone: 'ok', text: 'actif' } },
        {
          section: 'comfy',
          label: 'ComfyUI',
          state: online == null ? null : online ? { tone: 'ok', text: 'en ligne' } : { tone: 'bad', text: 'hors ligne' },
        },
      ],
    },
    {
      title: name ? `Personnage · ${name}` : 'Personnage',
      disabled: !name,
      entries: [
        {
          section: 'adult',
          label: 'Contenu adulte',
          state:
            armed == null
              ? null
              : armed
                ? { tone: 'warn', text: 'activé', mark: false }
                : { tone: 'none', text: 'désactivé', mark: false },
        },
        { section: 'appearance', label: 'Apparence', state: null },
      ],
    },
    {
      title: 'Journaux',
      entries: [
        {
          section: 'journal',
          label: 'Productions',
          state: journalCount == null ? null : { tone: 'none', text: String(journalCount), mark: false },
        },
        { section: 'log', label: 'Serveur', state: { tone: 'none', text: String(logCount), mark: false } },
      ],
    },
  ]

  return (
    <nav
      aria-label="Sections de l'application"
      className="flex flex-col border-line bg-panel max-[899px]:border-b min-[900px]:border-r"
    >
      <div className="px-[20px] pt-[22px] pb-[8px] text-[17px] font-[650] text-txt max-[899px]:pb-[14px]">
        Application
      </div>

      {/* Narrow viewport: one select, same destinations. */}
      <label className="sr-only" htmlFor="appSectionSelect">
        Section
      </label>
      <select
        className="mx-[20px] mb-[14px] w-[calc(100%-40px)] min-[900px]:hidden"
        id="appSectionSelect"
        value={current}
        onChange={(event) => navigate(appSectionPath(event.target.value as AppSection), { replace: true })}
      >
        {groups.map((group) => (
          <optgroup key={group.title} label={group.title}>
            {group.entries.map((entry) => (
              <option key={entry.section} value={entry.section} disabled={group.disabled}>
                {entry.label}
              </option>
            ))}
          </optgroup>
        ))}
      </select>

      <div className="flex-1 max-[899px]:hidden">
        {groups.map((group) => (
          <div key={group.title} className="mt-[14px]">
            <div className="truncate px-[20px] pb-[6px] text-[10.5px] font-semibold uppercase tracking-[0.06em] text-dim2">
              {group.title}
            </div>
            {group.disabled ? (
              <p className="m-0 px-[20px] py-[6px] text-[12.5px] text-dim2">Aucun personnage ouvert</p>
            ) : (
              <ul className="m-0 list-none p-0">
                {group.entries.map((entry) => {
                  const active = entry.section === current
                  return (
                    <li key={entry.section}>
                      <Link
                        to={appSectionPath(entry.section)}
                        replace
                        aria-current={active ? 'page' : undefined}
                        className={`flex h-[34px] items-center gap-[10px] px-[20px] text-[13px] no-underline
                                    hover:bg-panel2 ${
                                      active
                                        ? 'bg-panel3 font-semibold text-txt shadow-[inset_2px_0_0_var(--acc)]'
                                        : 'text-dim'
                                    }`}
                      >
                        <span className="min-w-0 flex-1 truncate">{entry.label}</span>
                        {entry.state && (
                          <span className="flex-none text-[11.5px] font-normal tabular-nums">
                            <StatusPill tone={entry.state.tone} mark={entry.state.mark ?? true}>
                              {entry.state.text}
                            </StatusPill>
                          </span>
                        )}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        ))}
      </div>

      <p className="m-0 px-[20px] py-[16px] text-[12px] text-dim2 max-[899px]:hidden">
        Les réglages d'une génération sont sur{' '}
        <Link className="link text-[12px]" to={PATHS.produce}>
          Produire
        </Link>
        , dans le panneau des réglages.
      </p>
    </nav>
  )
}
