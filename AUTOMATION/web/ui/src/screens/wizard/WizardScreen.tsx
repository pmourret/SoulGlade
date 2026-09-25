/* Wizard « nouveau personnage » (J7bis) — identité → type → style → monde →
   base d'identité, puis création.

   THE ONLY SCREEN THAT WRITES A SHEET. Type, output style and world are the
   three HUMAN choices, frozen at creation: changing one means creating another
   character (CLAUDE.md §3, §8.8). The pack is not among them — it is RESOLVED
   from (type, style) server-side, which is why this screen never asks for it.

   IT GENERATES NO GRAPH. The wizard attaches a character to the pack of its
   family; there is never a graph file per character (§8.11). The frozen base is
   supplied or generated here — a generated portrait goes through the pack's
   graph with the identity lock BYPASSED, since no reference exists yet — and
   then never changes.

   LAYOUT (design-pass screen-14, 25/09/2026): a 48 px screen bar, then the
   steps down a 260 px column, the step in the middle, the sheet being built on
   the right, and a 60 px bottom bar that is part of the grid — the fixed
   `.launch` bar used to lie over the content. Name and id became a step of
   their own, Identité, with the only new gating rule. The writes, the upload
   guard and the polling are unchanged. */
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { errorOf, type Schema } from '../../api/client'
import { useApi } from '../../api/useApi'
import { useCharacter } from '../../character/CharacterContext'
import { useConfirm } from '../../chrome/ConfirmContext'
import { Icon } from '../../chrome/Icon'
import { useToast } from '../../chrome/ToastContext'
import { PATHS } from '../../app/routes'
import { isValidId, slugify } from '../worlds/slugify'
import { BuildSheetPanel } from './BuildSheetPanel'
import { missingFor, missingUpTo, type WizardChoices } from './missingFor'
import { StepBody, StepBodySkeleton } from './StepBody'
import { WizardFooter } from './WizardFooter'
import { WizardSteps } from './WizardSteps'
import { NOTE_ERR, STEPS, candidateUrl, type CandidateState, type CharacterType } from './shared'

type WizardOptions = Schema<'WizardOptionsResponse'>
type BaseNameResponse = Schema<'BaseNameResponse'>
type BaseGenerateResponse = Schema<'BaseGenerateResponse'>
type BaseCandidatesResponse = Schema<'BaseCandidatesResponse'>
type CreateCharacterResponse = Schema<'CreateCharacterResponse'>

/* The id becomes a folder name, a URL parameter and a database key. `isValidId`
   is the same expression the server validates with (`slugify.ts`, screen 11) —
   a slug refused here is refused there too. */
const MAX_UPLOAD = 20 * 1024 * 1024

/* Candidate polling. 4 s between rounds and 150 rounds at most: a portrait takes
   about 1 to 2 minutes, four of them can take ten, and a run that never finishes
   must stop asking rather than poll for ever. */
const POLL_MS = 4000
const POLL_MAX = 150

function ScreenBar({ onLeave }: { onLeave: (event: React.MouseEvent) => void }) {
  return (
    <div className="flex h-[48px] flex-none items-center gap-[12px] border-b border-line bg-panel px-[14px]">
      <Link className="btn sm inline-flex items-center gap-[6px]" to={PATHS.characters} id="wizLeave" onClick={onLeave}>
        <Icon name="chevron" className="h-[13px] w-[13px]" />
        Personnages
      </Link>
      <span className="text-[14px] font-semibold text-txt">Nouveau personnage</span>
    </div>
  )
}

export function WizardScreen() {
  const api = useApi()
  const toast = useToast()
  const confirm = useConfirm()
  const navigate = useNavigate()
  const { selectCharacter } = useCharacter()

  const [types, setTypes] = useState<CharacterType[] | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)
  const [step, setStep] = useState(0)
  const [name, setName] = useState('')
  const [cid, setCid] = useState('')
  /* The id follows the name until it is typed by hand (screen-14 §S7). */
  const [cidTouched, setCidTouched] = useState(false)
  const [type, setType] = useState<string | null>(null)
  const [style, setStyle] = useState<string | null>(null)
  const [world, setWorld] = useState<string | null>(null)
  const [frozenBase, setFrozenBase] = useState<string | null>(null)
  const [basePreview, setBasePreview] = useState('')
  const [fileMessage, setFileMessage] = useState('')
  const [genMessage, setGenMessage] = useState('')
  const [candidates, setCandidates] = useState<CandidateState[] | null>(null)
  const [creating, setCreating] = useState(false)

  /* The generation batch being polled. A ref, not state: the interval reads it,
     and re-creating the timer on every candidate update would restart the count. */
  const batch = useRef<{ pack: string; items: unknown[] } | null>(null)
  const timer = useRef<number | null>(null)

  const stopPoll = useCallback(() => {
    if (timer.current !== null) {
      window.clearInterval(timer.current)
      timer.current = null
    }
  }, [])

  // leaving the screen stops the polling: nothing keeps asking for a batch
  // nobody is looking at
  useEffect(() => stopPoll, [stopPoll])

  /* A ref rather than the effect's own closed-over flag: `loadOptions` is
     called from two places (mount, and the Retry button), and both must skip
     setting state once the screen is gone. */
  const mounted = useRef(true)
  useEffect(() => () => {
    mounted.current = false
  }, [])

  const loadOptions = useCallback(() => {
    setLoadFailed(false)
    api
      .get<WizardOptions>('/api/wizard/options')
      .then((response) => {
        if (!mounted.current) return
        if (errorOf(response) || !Array.isArray(response.types)) setLoadFailed(true)
        else setTypes(response.types)
      })
      .catch(() => {
        if (mounted.current) setLoadFailed(true)
      })
  }, [api])

  useEffect(() => {
    loadOptions()
  }, [loadOptions])

  const currentType = (types ?? []).find((t) => t.id === type) ?? null
  const cidValid = isValidId(cid)

  /* The id a base write was sent under. Freezing takes seconds (the server
     checks the face enrols): an id changed meanwhile asked no confirmation,
     since nothing was frozen yet, and the late answer then attached a base
     written under the OLD id (audit, 25/09/2026). A reply whose id is no
     longer the current one is dropped. */
  const cidNow = useRef(cid)
  cidNow.current = cid

  const pickType = (id: string) => {
    if (type === id) return
    setType(id)
    setWorld(null)
    /* A type with a single style takes it outright: there is no choice to
       offer. `?? []` because the schema declares `styles` with a default. */
    const picked = (types ?? []).find((t) => t.id === id)
    const styles = picked?.styles ?? []
    setStyle(styles.length === 1 ? styles[0] : null)
  }

  /* Changing the id invalidates the frozen base: it was written under the OLD
     one. Keeping it would attach a file named for a character that will not
     exist — so the change is asked first when there is a base to lose. */
  const applyCid = async (value: string) => {
    const next = value.trim()
    if (next === cid) return true
    if (frozenBase) {
      const ok = await confirm({
        title: "Changer l'identifiant ?",
        body: "Changer l'identifiant invalide la base d'identité déjà choisie.",
        button: 'Continuer',
      })
      if (!ok) return false
      setFrozenBase(null)
      setBasePreview('')
      setFileMessage('')
    }
    setCid(next)
    return true
  }

  const onName = (value: string) => {
    setName(value)
    if (!cidTouched && !frozenBase) setCid(slugify(value))
  }

  const onCid = async (value: string) => {
    if (await applyCid(value)) setCidTouched(true)
  }

  const onFile = async (file: File) => {
    if (file.size > MAX_UPLOAD) {
      setFileMessage('Image trop lourde (max 20 Mo).')
      return
    }
    setFileMessage('envoi…')
    /* base64 in a JSON body, never multipart: multipart is a "simple"
       Content-Type at the CORS level and would walk straight through the origin
       guard (api/security.py). */
    const dataUrl = await new Promise<string>((resolve) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.readAsDataURL(file)
    })
    const sentCid = cid
    const response = await api.post<BaseNameResponse>('/api/characters/base/upload', {
      cid,
      image_base64: dataUrl,
    })
    if (cidNow.current !== sentCid) {
      setFileMessage('')
      return
    }
    const failure = errorOf(response)
    if (failure) {
      setFileMessage('')
      toast(failure || "échec de l'envoi")
      return
    }
    stopPoll()
    batch.current = null
    setCandidates(null)
    setGenMessage('')
    setFrozenBase(response.base_gelee)
    setBasePreview(dataUrl)
    setFileMessage('image enregistrée.')
  }

  const poll = useCallback(async () => {
    if (!batch.current) return
    const response = await api.post<BaseCandidatesResponse>(
      '/api/characters/base/candidates',
      batch.current,
    )
    if (errorOf(response) || !Array.isArray(response.results)) return
    const results = response.results as CandidateState[]
    setCandidates(results)
    if (results.every((c) => c.state === 'ready' || c.state === 'error')) {
      stopPoll()
      setGenMessage(
        results.some((c) => c.state === 'ready')
          ? `${results.filter((c) => c.state === 'ready').length} sur ${results.length} prêts.`
          : 'La génération a échoué. Relance, ou fournis une image.',
      )
    }
  }, [api, stopPoll])

  const onGenerate = async () => {
    setGenMessage('mise en file…')
    const response = await api.post<BaseGenerateResponse>('/api/characters/base/generate', {
      cid,
      type,
      style,
      world,
      n: 4,
    })
    const failure = errorOf(response)
    if (failure) {
      setGenMessage('')
      toast(failure || 'échec de la génération')
      return
    }
    const queued = (response.candidates ?? []) as { file: string }[]
    batch.current = { pack: response.pack, items: queued }
    setCandidates(queued.map((c) => ({ ...c, state: 'pending' })))
    setGenMessage('')
    stopPoll()
    let rounds = 0
    timer.current = window.setInterval(() => {
      if (++rounds > POLL_MAX) {
        stopPoll()
        setGenMessage("La génération n'a pas répondu. Relance, ou fournis une image.")
        return
      }
      void poll()
    }, POLL_MS)
  }

  const freeze = async (file: string) => {
    const sentCid = cid
    const shown = genMessage
    setGenMessage('gel du portrait…')
    const response = await api.post<BaseNameResponse>('/api/characters/base/freeze', {
      cid,
      file,
    })
    setGenMessage(shown)
    if (cidNow.current !== sentCid) return
    const failure = errorOf(response)
    if (failure) {
      toast(failure || 'échec du gel')
      return
    }
    setFrozenBase(response.base_gelee)
    setBasePreview(candidateUrl(file))
  }

  /* GATING (`missingFor.ts`): each step has one condition, and the last one
     has the whole list — nothing is created half-chosen. */
  const choices: WizardChoices = { name, cidValid, type, style, world, frozenBase }
  const last = step === STEPS.length - 1
  const missing = last ? missingUpTo(STEPS[step], choices) : missingFor(STEPS[step], choices)

  const create = async () => {
    if (missingUpTo('base', choices)) return
    setCreating(true)
    const response = await api.post<CreateCharacterResponse>('/api/characters', {
      cid,
      name: name.trim(),
      type,
      style,
      world,
      base_gelee: frozenBase,
    })
    const failure = errorOf(response)
    if (failure) {
      setCreating(false)
      toast(failure || 'échec de la création')
      return
    }
    stopPoll()
    /* The new character becomes the current one, without reloading. Its sheet
       is the honest landing: it shows the three frozen axes and the resolved
       pack, which is exactly what was just decided. */
    selectCharacter(response.id, { to: PATHS.character })
  }

  /* Leaving with choices made asks first. Only this bar's link does: the
     router has no navigation guard, and adding one for a single screen is out
     of scope (screen-14 plan). What stays on disk is said as it is — nothing
     removes the generated portraits. */
  const onLeave = async (event: React.MouseEvent) => {
    if (!(name.trim() || type || frozenBase || candidates)) return
    event.preventDefault()
    const ok = await confirm({
      title: name.trim() ? `Abandonner la création de ${name.trim()} ?` : 'Abandonner la création ?',
      body: 'Les portraits déjà générés restent dans le dossier de sortie de ComfyUI.',
      button: 'Abandonner',
      danger: true,
    })
    if (ok) navigate(PATHS.characters)
  }

  if (loadFailed) {
    return (
      <div className="screen flex flex-col" id="wizard">
        <ScreenBar onLeave={onLeave} />
        <div className="flex flex-1 items-center justify-center p-[20px]">
          <div className="flex max-w-[440px] flex-col items-center gap-[14px] text-center">
            <p className={NOTE_ERR} data-note>
              Impossible de charger les choix de l'assistant : le serveur n'a pas répondu, ou sa
              réponse est illisible.
            </p>
            <button type="button" className="btn" id="wizRetry" onClick={loadOptions}>
              Réessayer
            </button>
          </div>
        </div>
      </div>
    )
  }

  const worldLabel = currentType?.worlds?.find((entry) => entry.id === world)?.label ?? null
  const answers = {
    identity: name.trim() ? `${name.trim()} · ${cid}` : cid || null,
    type: currentType?.label ?? null,
    style: style && (currentType?.styles ?? []).length === 1 ? `${style} (seul style du type)` : style,
    world: worldLabel,
    base: frozenBase,
  }

  return (
    <div className="screen flex min-h-0 flex-col" id="wizard">
      <ScreenBar onLeave={onLeave} />
      <div className="flex min-h-0 flex-1 max-[1100px]:flex-col max-[1100px]:overflow-y-auto">
        <nav
          className="w-[260px] flex-none overflow-y-auto border-r border-line bg-panel p-[14px]
                     max-[1100px]:w-auto max-[1100px]:border-r-0 max-[1100px]:border-b max-[1100px]:py-[8px]"
          aria-label="Progression"
        >
          <WizardSteps step={step} answers={answers} onGoTo={setStep} />
        </nav>
        <div className="min-w-0 flex-1 overflow-y-auto px-[36px] py-[28px] max-[1100px]:overflow-visible max-[1100px]:px-[20px]" id="wizBody">
          {types === null ? (
            <StepBodySkeleton />
          ) : (
            <StepBody
              step={STEPS[step]}
              types={types}
              currentType={currentType}
              name={name}
              cid={cid}
              cidValid={cidValid}
              cidProposal={slugify(name)}
              type={type}
              style={style}
              world={world}
              frozenBase={frozenBase}
              basePreview={basePreview}
              fileMessage={fileMessage}
              genMessage={genMessage}
              candidates={candidates}
              onName={onName}
              onCid={onCid}
              onPickType={pickType}
              onPickStyle={setStyle}
              onPickWorld={setWorld}
              onFile={onFile}
              onGenerate={onGenerate}
              onFreeze={freeze}
            />
          )}
        </div>
        <BuildSheetPanel
          name={name}
          cid={cid}
          typeLabel={currentType?.label ?? null}
          styleLabel={style}
          worldLabel={worldLabel}
          frozenBase={frozenBase}
          basePreview={basePreview}
        />
      </div>
      <WizardFooter
        missing={missing}
        last={last}
        name={name}
        canGoBack={step > 0}
        canGoOn={missing === null && types !== null}
        creating={creating}
        onBack={() => setStep(step - 1)}
        onNext={() => (last ? void create() : setStep(step + 1))}
      />
    </div>
  )
}
