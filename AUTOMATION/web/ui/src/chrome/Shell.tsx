/* The permanent chrome: header, module sub-bar, banners, and the screen outlet.

   A column — header (48 px, carrying the category bar), the module sub-bar
   (34 px) and its progress fillet, the banners, then `.shell` with the tool
   rail and <main> side by side. `min-height:0` and `min-width:0` on the flex
   children are not cosmetic: without them the PAGE scrolls instead of <main>,
   which is the bug they were added for.

   THE SIDE NAVBAR IS GONE (23/09/2026, design-pass screen-0-chrome §S1). It
   held 208 px of width to say where one could go; the categories now say it in
   the header and the sub-bar lists the open category's modules, for 0 px of
   width. With it went the collapse preference — `nav-mince`, `icons-only` and
   `#btnNavPli` had no subject left once the column did not exist. The RAIL's
   own collapse is a different geste and did not move.

   The tool rail decides for itself whether it exists: it only shows where its
   entries have a surface (Produire, Banque), and it says so in one place rather
   than making the shell test the route. */
import { Outlet } from 'react-router-dom'

import { useCharacter } from '../character/CharacterContext'
import { DirtyBar } from './DirtyBar'
import { FaultBar } from './FaultBar'
import { Header } from './Header'
import { HintLayer } from './HintLayer'
import { ModuleBar } from './ModuleBar'
import { ToolRail } from './ToolRail'
import { useChrome } from './ChromeContext'
import { useCharacterTheme } from './useCharacterTheme'
import { usePackTheme } from './usePackTheme'

export function Shell() {
  const { isClaimed, sheet } = useCharacter()
  const { railCollapsed, focus } = useChrome()
  usePackTheme()
  useCharacterTheme(sheet?.appearance)

  /* Chrome state travels as classes on the shell root, not on <body>: the
     legacy frontend had no choice (its CSS was global), a React tree does. */
  const classes = [
    'app',
    isClaimed ? '' : 'no-character',
    railCollapsed ? 'rail-mince' : '',
    focus ? 'focus' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={classes}>
      {/* focus mode hides the header: what REMAINS is what drives the work.
          We remove what says « where am I », not what serves to do — hence the
          sub-bar below, which stays and carries the way out. */}
      {!focus && <Header />}
      <ModuleBar />
      <FaultBar />
      <DirtyBar />
      <div className="shell">
        <ToolRail />
        <main>
          <Outlet />
        </main>
      </div>
      <HintLayer />
    </div>
  )
}
