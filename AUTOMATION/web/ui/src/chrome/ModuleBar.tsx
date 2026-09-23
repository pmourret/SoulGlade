/* The 34 px sub-bar: the modules of the open category, and the chrome controls
   that must survive focus mode (design-pass screen-0-chrome §S3/§S4/§S6,
   23/09/2026). Second half of what replaced `SideNav.tsx`.

   THE ACTIVE MODULE IS MARKED IN `--txt`, NOT IN `--acc`. The accent already
   marks the category above; using it again one row down would draw the same
   signal twice for two different grains, and « where am I » would read as two
   competing answers instead of one path.

   `data-m` carries the ScreenKey — the module half of the navigation contract
   (`app/routes.ts`). Labels are never `display:none`: at reduced width they are
   removed VISUALLY (clip-path, in chrome.css) and stay the link's accessible
   name.

   IT SURVIVES FOCUS MODE, and that is why the focus toggle lives here. The
   48 px header goes when focus is on; a control placed there would be reachable
   to enter the mode and gone to leave it. Here, entering and leaving are the
   same button in the same place. */
import { NavLink, useLocation } from 'react-router-dom'

import {
  activeCategory,
  characterPath,
  isDestinationActive,
  modulesOf,
} from '../app/routes'
import { useCharacter } from '../character/CharacterContext'
import { useSystemState } from '../state/SystemStateContext'
import { useChrome } from './ChromeContext'
import { Icon } from './Icon'

/* The 2 px progress fillet, full width, immediately under the sub-bar. It
   exists only while a batch runs: a permanent empty gutter would be a piece of
   chrome that means nothing most of the time. The 0.5 s transition is the one
   `base.css`'s `prefers-reduced-motion` block already neutralises for the whole
   studio — nothing to repeat here. */
function ProgressFillet() {
  const { state } = useSystemState()
  if (!state?.running) return null
  const total = state.total || 0
  const done = total ? Math.min(100, Math.max(0, (state.index / total) * 100)) : 0
  return (
    <div
      className="prog"
      role="progressbar"
      aria-label="Progression du lot"
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={state.index}
    >
      <span style={{ width: `${done}%` }} />
    </div>
  )
}

export function ModuleBar() {
  const { isClaimed } = useCharacter()
  const { state } = useSystemState()
  const { focus, toggleFocus } = useChrome()
  const { pathname } = useLocation()

  if (!isClaimed) return null

  const current = activeCategory(pathname)
  const modules = current ? modulesOf(current) : []
  const waiting = state?.counts?.A_REVOIR ?? 0

  return (
    <>
      <div className="modbar">
        <nav className="mods" aria-label="Modules de la catégorie">
          {modules.map((destination) => {
            const on = isDestinationActive(destination, pathname)
            return (
              <NavLink
                key={destination.key}
                className={`mod${on ? ' on' : ''}`}
                data-m={destination.key}
                to={destination.key === 'character' ? characterPath(isClaimed) : destination.path}
                aria-current={on ? 'page' : undefined}
              >
                <Icon name={destination.icon} className="mod-ic" />
                <span className="nav-lab">
                  {(isClaimed && destination.labelWhenClaimed) || destination.label}
                </span>
                {/* Revue only. Galerie has a module but no counter: a counter
                    announces pending work, and a validated image awaits none.
                    `#nTri` is here while Production is open, and on the
                    Production category otherwise — see CategoryBar.tsx. */}
                {destination.badge && waiting > 0 && (
                  <span className="n" id="nTri" data-zero="0">
                    {waiting}
                  </span>
                )}
              </NavLink>
            )
          })}
        </nav>

        <div className="modbar-end">
          {/* Focus mode strips the header, so the two readings one cannot work
              without follow the work down here: is ComfyUI up, and how far is
              the batch. `#dot` keeps its id — the header's copy is unmounted
              while focus is on, so exactly one exists at any time. */}
          {focus && (
            <span className="mini">
              <span className={`dot${state?.comfy ? ' on' : ''}`} id="dot" />
              {/* In the header this dot always has `#stTxt` beside it. Here it
                  would be a mute pip, so it carries its own label, removed
                  VISUALLY and never by display:none — the shape (disc or
                  diamond) carries the difference to the eye. */}
              <span className="vh">{state?.comfy ? 'ComfyUI' : 'ComfyUI hors ligne'}</span>
              {state?.running && (
                <b>
                  {state.index}/{state.total}
                </b>
              )}
            </span>
          )}
          <button
            type="button"
            className="modbar-btn"
            id="btnFocus"
            aria-pressed={focus}
            onClick={toggleFocus}
          >
            <Icon name="focus" className="mod-ic" />
            <span className="nav-lab" id="focusLab">
              {focus ? 'Quitter le focus' : 'Mode focus'}
            </span>
            <span className="kbd" aria-hidden="true">
              F
            </span>
          </button>
        </div>
      </div>
      <ProgressFillet />
    </>
  )
}
