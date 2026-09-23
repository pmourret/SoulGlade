/* The permanent banner, 48 px (design-pass screen-0-chrome §S2, 23/09/2026).
   Left to right: the brand, the identity card, the adult-armed pill, the three
   categories centred, and the status zone.

   IT WENT FROM 56 TO 48 PX AND GAINED THE NAVIGATION. The side navbar's 208 px
   of width bought a list of eight destinations; the categories buy the same
   answer to « where can I go » inside a bar that already existed, and the 8 px
   saved go to the sub-bar below. What LEFT the banner in exchange is everything
   that identified the character a second time — `brand-id` and the two
   `brand-tag` (type, world) moved into the identity menu's first line, where
   they are read when one asks « who am I working on », not carried permanently.

   The identity badge is the INITIAL, never the frozen base portrait: no route
   serves those bytes (the file lives outside PROD/, on the ComfyUI input side)
   and inventing one that reads that folder without a character_id bound would
   reopen the leak the isolation of 29/08/2026 closed. Deferred, not forgotten. */
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'

import { errorOf, type ActionLike } from '../api/client'
import { useApi } from '../api/useApi'
import { APPLICATION, isDestinationActive } from '../app/routes'
import { initialOf, useCharacter } from '../character/CharacterContext'
import { useSystemState } from '../state/SystemStateContext'
import { CategoryBar } from './CategoryBar'
import { Icon } from './Icon'
import { IdentityMenu } from './IdentityMenu'
import { ProbeStrip } from './ProbeStrip'
import { Takeover } from './Takeover'
import { useToast } from './ToastContext'
import { useProcessControls } from './useProcessControls'

const APP = 'Soulglade'

/** Seconds as the studio writes them: rounded, and in minutes past 90 s. */
export const mmss = (seconds: number | null | undefined): string =>
  seconds == null ? '' : seconds < 90 ? `${Math.round(seconds)} s` : `${Math.round(seconds / 60)} min`

/* The application name, then a 20 px rule. It is the stable decor: it names the
   tool, it does not compete with the character. On the gate it stands alone and
   in `--txt`, because it is then the only thing the banner has to say. */
function Brand({ alone = false }: { alone?: boolean }) {
  return (
    <div className={`brand${alone ? ' alone' : ''}`} id="brand">
      <span className="brand-app">{APP}</span>
      {!alone && <span className="brand-rule" aria-hidden="true" />}
    </div>
  )
}

/* The identity card inside the menu trigger: avatar, name, and the one line
   that situates the character. Falls back immediately on the raw id, enriched
   as soon as /api/character answers — a failed call leaves the fallback rather
   than a broken banner, and the failure itself is said by the fault banner. */
function IdentityCard() {
  const { claimed, sheet } = useCharacter()
  const shown = sheet ?? { id: claimed, name: claimed, type: null, world: null }
  const world = (shown as { world?: { label?: string } | null }).world

  return (
    <span className="idcard">
      <span className="brand-av" aria-hidden="true">
        {initialOf(shown)}
      </span>
      <span className="idcard-txt">
        <i>{shown.name || shown.id}</i>
        <small>
          {[shown.type, world?.label].filter(Boolean).join(' · ') || shown.id}
        </small>
      </span>
    </span>
  )
}

/* ADULT CONTENT ARMED — TEXT, never a colour alone (.claude/rules/frontend.md:
   status is never carried by colour by itself). Reads `sheet.nsfw`, already
   exposed by /api/character; this chantier changes nothing server-side. It is
   shown only when the flag is on: a permanent « SFW » counterpart would put a
   label on the normal case, which is noise. */
function AdultPill() {
  const { sheet } = useCharacter()
  if (!sheet?.nsfw) return null
  return <span className="adult-pill">ADULTE ARMÉ</span>
}

/* THE ONE power button, replacing the two icon buttons the banner used to
   carry. Two power glyphs side by side told apart only by their aria-label was
   a puzzle at a glance; one button that opens a two-item menu names both
   actions in words. The item IDS are unchanged — `useProcessControls` and its
   confirmations are untouched, only where one clicks them moved. */
function PowerMenu() {
  const { stopApp, stopComfy } = useProcessControls()
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const buttonRef = useRef<HTMLButtonElement | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)

  const close = useCallback((giveFocusBack = false) => {
    setOpen(false)
    if (giveFocusBack) buttonRef.current?.focus()
  }, [])

  useEffect(() => {
    if (!open) return
    const onClick = (event: MouseEvent) => {
      if (event.target instanceof Node && !wrapRef.current?.contains(event.target)) close()
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close(true)
    }
    document.addEventListener('click', onClick)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('click', onClick)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open, close])

  useEffect(() => {
    if (open) menuRef.current?.querySelector<HTMLElement>('button')?.focus()
  }, [open])

  const onMenuKeyDown = (event: React.KeyboardEvent) => {
    const items = Array.from(menuRef.current?.querySelectorAll<HTMLElement>('button') ?? [])
    if (!items.length) return
    const index = items.indexOf(document.activeElement as HTMLElement)
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      items[(index + 1) % items.length].focus()
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      items[(index - 1 + items.length) % items.length].focus()
    }
  }

  return (
    <div className="pwrwrap" ref={wrapRef}>
      <button
        type="button"
        ref={buttonRef}
        id="btnHeaderPower"
        className={`hd-ic${open ? ' on' : ''}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Arrêter"
        data-hint-text="Arrêter ComfyUI, ou le tableau de bord."
        onClick={(event) => {
          event.stopPropagation()
          setOpen((current) => !current)
        }}
      >
        <Icon name="power" className="hd-ic-svg" />
      </button>
      <div
        className={`pwrmenu${open ? ' on' : ''}`}
        role="menu"
        aria-label="Arrêter"
        ref={menuRef}
        onKeyDown={onMenuKeyDown}
      >
        <button
          type="button"
          id="btnHeaderComfyStop"
          role="menuitem"
          tabIndex={-1}
          onClick={() => {
            close()
            stopComfy()
          }}
        >
          Arrêter ComfyUI
          <small>coupe net, sans le temps de finir un job</small>
        </button>
        <button
          type="button"
          id="btnHeaderAppStop"
          role="menuitem"
          tabIndex={-1}
          onClick={() => {
            close()
            stopApp()
          }}
        >
          Arrêter le tableau de bord
          <small>cette page ne répondra plus</small>
        </button>
      </div>
    </div>
  )
}

/* ComfyUI reachable or not (the dot) plus the progress of the running batch,
   straight from /api/state. A queue of pending jobs does not exist server-side
   yet. */
function StatusZone() {
  const api = useApi()
  const toast = useToast()
  const { claimed } = useCharacter()
  const { state } = useSystemState()
  const { takeover } = useProcessControls()
  const { pathname } = useLocation()
  const [stopping, setStopping] = useState(false)

  /* `state` is null in two different situations, and only one of them is a
     problem: no character claimed yet (SystemStateContext skips `/api/state`
     entirely — nothing to poll for) versus a real fetch failure once one is
     claimed (already surfaced through the fault/toast system separately).
     Reusing the same red dot and "état indisponible" copy for both made the
     entry gate — the very first screen, before any character is loaded —
     look like ComfyUI was down when nothing was actually wrong (P2.3,
     05/09/2026). The dot/text pair is simply not shown pre-claim now; the
     probes and the power button below stay, they read the machine, not a
     character's state. */
  const offline = state === null || !state?.comfy
  const text = state === null ? 'état indisponible' : state.comfy ? 'ComfyUI' : 'ComfyUI hors ligne'

  /* screen-3-produire §S/audit 2026-09-04: the running batch's own Stop
     lives HERE, not in a card buried in the scene grid's scroll — this
     status line is the one place on screen that survives scrolling, so it
     is the only honest home for a control that must stay reachable while a
     batch runs. No confirmation: stopping a batch was never destructive the
     way stopping ComfyUI or the dashboard is — images already produced stay
     on disk either way (same no-confirm contract RunPanel.tsx's `#btnStop`
     always had). */
  const stopBatch = async () => {
    setStopping(true)
    const response = await api.post<ActionLike>('/api/stop')
    const failure = errorOf(response)
    setStopping(false)
    if (failure) toast(failure || 'arrêt impossible')
  }

  const onApplication = isDestinationActive(APPLICATION, pathname)

  return (
    <div className="status">
      {/* THE RUNNING BATCH, first: it is the only thing here that is about to
          finish. « Génération » names it, the figures are tabular so they do
          not jitter as they climb. */}
      {state?.running && (
        <>
          <span className="run-lab">Génération</span>
          <b className="run-n">
            {state.index} / {state.total}
          </b>
          {state.eta ? <span className="run-eta">~{mmss(state.eta)}</span> : null}
          <button
            type="button"
            id="btnHeaderStopBatch"
            className="hd-btn"
            disabled={stopping}
            data-hint-text="Arrêter le lot en cours — les images déjà produites restent."
            onClick={stopBatch}
          >
            Arrêter
          </button>
          <span className="status-sep" aria-hidden="true" />
        </>
      )}

      {claimed && (
        <>
          {/* A DIAMOND, not a red disc, when ComfyUI is down: the shape carries
              the difference as well as the colour, and the text beside it says
              it in words. Status never by colour alone. */}
          <span className={`dot${!offline ? ' on' : ''}`} id="dot" />
          <span id="stTxt" className={offline && state !== null ? 'ko' : undefined}>
            {text}
          </span>
          <span className="status-sep" aria-hidden="true" />
        </>
      )}

      <ProbeStrip />
      <span className="status-sep" aria-hidden="true" />

      {/* Application left the categories (§S1): it is chrome settings, not a
          place one works. It keeps its routes, and lights here instead. */}
      <Link
        to={APPLICATION.path}
        id="btnApplication"
        className={`hd-ic${onApplication ? ' on' : ''}`}
        aria-label={APPLICATION.label}
        aria-current={onApplication ? 'page' : undefined}
        data-hint-text="Application — réglages, journal, processus."
      >
        <Icon name="application" className="hd-ic-svg" />
      </Link>

      <PowerMenu />
      {takeover && <Takeover>{takeover}</Takeover>}
    </div>
  )
}

export function Header() {
  const { claimed, sheet } = useCharacter()

  /* The tab title says whose studio this is. A switch to another character must
     be visible to the eye, not only in the network trace. */
  useEffect(() => {
    document.title = claimed ? `${sheet?.name || claimed} — production` : APP
  }, [claimed, sheet])

  return (
    <header>
      {/* the entry gate claims no character: nothing to switch away from, so
          the brand stands alone and there are no categories to show */}
      {claimed ? (
        <>
          <Brand />
          <IdentityMenu>
            <IdentityCard />
          </IdentityMenu>
          <AdultPill />
          <CategoryBar />
        </>
      ) : (
        <Brand alone />
      )}
      <StatusZone />
    </header>
  )
}
