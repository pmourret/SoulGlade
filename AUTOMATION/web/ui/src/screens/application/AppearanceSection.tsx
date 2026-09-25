/* « Apparence » — the section of the Application screen (Phase 0b, DOCS/
   design-pass/phase-0b-theme-utilisateur.md; restyled by screen-12 §S6, the
   behaviour untouched). Same role in the file as
   `AdultContentSection.tsx` next to it: a small, character-scoped setting
   that lives here because Application is where the platform's own
   capabilities sit, agnostic of the pack (CLAUDE.md §7).

   DRAFT VS SAVED, same split as `/api/expression/preview` vs `/api/
   expression/tone` — every wheel/slider move repaints the WHOLE document
   immediately (draft), and nothing is written to `character.json` until
   Enregistrer. The draft must never survive past this section: switching
   character, or leaving without saving, hands the document straight back to
   what `chrome/useCharacterTheme.ts` (mounted once, in Shell) already shows
   for the character's actually SAVED appearance — never an abandoned drag. */
import { useEffect, useState } from 'react'

import { errorOf, type Schema } from '../../api/client'
import { useApi } from '../../api/useApi'
import { useCharacter } from '../../character/CharacterContext'
import { AdjustSlider } from '../../chrome/AdjustSlider'
import { HueWheel } from '../../chrome/theme/HueWheel'
import {
  ACCENT_C, ACCENT_L, DEFAULT_ACCENT_HUE, DEFAULT_NEUTRAL_HUE, DEFAULT_NEUTRAL_INTENSITY,
  NEUTRAL_REFERENCE_C, NEUTRAL_REFERENCE_L, THEME_TOKEN_NAMES, computeThemeTokens, warnNearVerdict,
} from '../../chrome/theme/deriveTheme'
import { useToast } from '../../chrome/ToastContext'
import { SectionHeader } from './SectionShell'

type AppearanceBrief = Schema<'AppearanceBrief'>

// Ceiling of the intensity slider (document, "Pourquoi une intensité, pas
// seulement une teinte") — deliberately low, past it risks falling back
// under the WCAG thresholds already validated at Phase 0.
const INTENSITY_MAX = 0.05
/* The shared slider (chrome/AdjustSlider) prints its raw value, and `0.023`
   says nothing: it runs in percent of the ceiling instead. Step 2 % = 0.001,
   the step the range always had, so the reachable values are the same. */
const toPercent = (intensity: number) => Math.round((intensity / INTENSITY_MAX) * 100)
const fromPercent = (percent: number) => Number(((percent / 100) * INTENSITY_MAX).toFixed(3))

export function AppearanceSection() {
  const api = useApi()
  const toast = useToast()
  const { sheet, refreshSheet } = useCharacter()
  const saved = sheet?.appearance

  const [neutralHue, setNeutralHue] = useState(DEFAULT_NEUTRAL_HUE)
  const [neutralIntensity, setNeutralIntensity] = useState(DEFAULT_NEUTRAL_INTENSITY)
  const [accentHue, setAccentHue] = useState(DEFAULT_ACCENT_HUE)
  const [saving, setSaving] = useState(false)

  // The draft follows the saved appearance on mount AND on every character
  // switch — an unsaved drag from character A must never seed character B's
  // wheels.
  useEffect(() => {
    setNeutralHue(saved?.neutral_hue ?? DEFAULT_NEUTRAL_HUE)
    setNeutralIntensity(saved?.neutral_intensity ?? DEFAULT_NEUTRAL_INTENSITY)
    setAccentHue(saved?.accent_hue ?? DEFAULT_ACCENT_HUE)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheet?.id])

  // Live preview. `atDefault` mirrors `useCharacterTheme`'s own rule: at the
  // exact platform default, apply NOTHING rather than a computed "chroma
  // zero" approximation of it — see the long comment on that hook for why
  // the two are not byte-identical.
  useEffect(() => {
    const root = document.documentElement
    const atDefault =
      neutralHue === DEFAULT_NEUTRAL_HUE &&
      neutralIntensity === DEFAULT_NEUTRAL_INTENSITY &&
      accentHue === DEFAULT_ACCENT_HUE
    if (atDefault) {
      THEME_TOKEN_NAMES.forEach((name) => root.style.removeProperty(name))
    } else {
      const tokens = computeThemeTokens({ neutralHue, neutralIntensity, accentHue })
      THEME_TOKEN_NAMES.forEach((name) => root.style.setProperty(name, tokens[name]))
    }
    return () => {
      // Unmount, or the saved appearance just changed under us (Enregistrer
      // / Réinitialiser -> refreshSheet): hand back to what the SAVED
      // appearance means, exactly what useCharacterTheme shows everywhere
      // else in the app.
      const savedHue = saved?.neutral_hue ?? DEFAULT_NEUTRAL_HUE
      const savedIntensity = saved?.neutral_intensity ?? DEFAULT_NEUTRAL_INTENSITY
      const savedAccent = saved?.accent_hue ?? DEFAULT_ACCENT_HUE
      if (savedHue === DEFAULT_NEUTRAL_HUE && savedIntensity === DEFAULT_NEUTRAL_INTENSITY && savedAccent === DEFAULT_ACCENT_HUE) {
        THEME_TOKEN_NAMES.forEach((name) => root.style.removeProperty(name))
      } else {
        const tokens = computeThemeTokens({ neutralHue: savedHue, neutralIntensity: savedIntensity, accentHue: savedAccent })
        THEME_TOKEN_NAMES.forEach((name) => root.style.setProperty(name, tokens[name]))
      }
    }
  }, [neutralHue, neutralIntensity, accentHue, saved?.neutral_hue, saved?.neutral_intensity, saved?.accent_hue])

  const hasSaved = saved?.neutral_hue != null || saved?.neutral_intensity != null || saved?.accent_hue != null
  const isDirty =
    neutralHue !== (saved?.neutral_hue ?? DEFAULT_NEUTRAL_HUE) ||
    neutralIntensity !== (saved?.neutral_intensity ?? DEFAULT_NEUTRAL_INTENSITY) ||
    accentHue !== (saved?.accent_hue ?? DEFAULT_ACCENT_HUE)
  const warning = warnNearVerdict(accentHue)

  const save = async (body: Partial<AppearanceBrief>, okMessage: string) => {
    setSaving(true)
    const response = await api.post<AppearanceBrief>('/api/character/appearance', body)
    setSaving(false)
    const failure = errorOf(response)
    if (failure) {
      toast(failure)
      return
    }
    // Re-sync the DRAFT from the server's own answer, not just `refreshSheet()`:
    // the sheet refresh is a separate fetch that lands on its own schedule, and
    // the draft-follows-`sheet.id` effect above does not fire on a same-
    // character save — without this, a stale dragged value could keep painting
    // the document after a successful Enregistrer/Réinitialiser.
    setNeutralHue(response.neutral_hue ?? DEFAULT_NEUTRAL_HUE)
    setNeutralIntensity(response.neutral_intensity ?? DEFAULT_NEUTRAL_INTENSITY)
    setAccentHue(response.accent_hue ?? DEFAULT_ACCENT_HUE)
    toast(okMessage)
    refreshSheet()
  }

  const onSave = () =>
    save({ neutral_hue: neutralHue, neutral_intensity: neutralIntensity, accent_hue: accentHue }, 'apparence enregistrée')
  const onReset = () => save({}, 'apparence réinitialisée')

  const name = sheet?.name || 'ce personnage'

  return (
    <section id="appearanceBox">
      <SectionHeader
        title="Apparence"
        state={hasSaved ? { tone: 'ok', text: 'personnalisée' } : { tone: 'none', text: 'thème de la plateforme' }}
        scope={
          <>
            Teintes de l'interface pour <b className="text-txt" id="appearanceQui">{name}</b>{' '}
            seulement, indépendantes du pack. L'aperçu s'applique tout de suite ;
            Enregistrer pour la garder au prochain chargement.
          </>
        }
      />

      <div className="flex flex-wrap items-start gap-[32px]">
        <div className="min-w-[300px] flex-1">
          <div className="flex flex-wrap gap-[28px]">
            <div className="flex flex-col items-center gap-[8px]">
              <HueWheel
                label="Teinte du fond"
                value={neutralHue}
                onChange={setNeutralHue}
                trackL={NEUTRAL_REFERENCE_L}
                trackC={NEUTRAL_REFERENCE_C}
                size={112}
              />
              <span className="text-[12.5px] text-dim">
                Fond <b className="font-semibold text-txt tabular-nums">{Math.round(neutralHue)}°</b>
              </span>
            </div>
            <div className="flex flex-col items-center gap-[8px]">
              <HueWheel
                label="Teinte de l'accent"
                value={accentHue}
                onChange={setAccentHue}
                trackL={ACCENT_L}
                trackC={ACCENT_C}
                size={112}
              />
              <span className="text-[12.5px] text-dim">
                Accent <b className="font-semibold text-txt tabular-nums">{Math.round(accentHue)}°</b>
              </span>
            </div>
          </div>
          {/* The ring's own reference chroma (deriveTheme.ts,
              NEUTRAL_REFERENCE_C) is far more saturated than the real applied
              effect ever gets (intensity tops out at 0.05) — audited live: at
              hue 30° the ring shows #ca5747, the real --bg at max intensity is
              #1c0201. Said in words rather than toned down, so the wheel stays
              easy to pick a hue on. */}
          <p className="mt-[10px] mb-[16px] max-w-[420px] text-[12px] text-dim2">
            L'anneau du fond exagère la teinte pour le choix : l'effet réel reste
            discret, regarde l'aperçu ou le fond de l'écran.
          </p>
          <div className="max-w-[420px]">
            <AdjustSlider
              id="appearanceIntensity"
              label="Intensité du fond"
              value={toPercent(neutralIntensity)}
              min={0}
              max={100}
              step={2}
              suffix=" %"
              neutral={toPercent(DEFAULT_NEUTRAL_INTENSITY)}
              onChange={(percent) => setNeutralIntensity(fromPercent(percent))}
            />
          </div>

          {warning && (
            <p className="mt-[10px] mb-0 text-[12.5px] text-warn-txt" role="status" id="appearanceVerdictWarning">
              {warning}
            </p>
          )}

          <div className="mt-[20px] flex gap-[12px]">
            <button className="btn primary" id="btnAppearanceSave" type="button" disabled={saving || !isDirty} onClick={onSave}>
              Enregistrer
            </button>
            <button
              className="btn"
              id="btnAppearanceReset"
              type="button"
              disabled={saving || !hasSaved}
              aria-describedby={hasSaved ? undefined : 'appearanceResetWhy'}
              onClick={onReset}
            >
              Réinitialiser
            </button>
          </div>
          {!hasSaved && (
            <p className="mt-[6px] mb-0 text-[12px] text-dim2" id="appearanceResetWhy">
              Aucune personnalisation à réinitialiser.
            </p>
          )}
        </div>

        {/* A miniature of the studio, painted by the same tokens the draft is
            writing on :root right now: it follows the live preview with no
            computation of its own. Decorative — the whole page is the real
            preview. */}
        <div
          aria-hidden="true"
          className="w-[220px] flex-none overflow-hidden rounded-[8px] border border-line2 bg-bg"
        >
          <div className="flex h-[26px] items-center gap-[6px] border-b border-line bg-panel px-[10px]">
            <i className="h-[7px] w-[7px] rounded-full bg-acc" />
            <i className="h-[5px] w-[54px] rounded-[2px] bg-line2" />
            <i className="ml-auto h-[5px] w-[24px] rounded-[2px] bg-line2" />
          </div>
          <div className="flex gap-[8px] p-[10px]">
            <div className="flex w-[54px] flex-col gap-[5px]">
              <i className="h-[5px] rounded-[2px] bg-panel3" />
              <i className="h-[5px] rounded-[2px] bg-line2" />
              <i className="h-[5px] rounded-[2px] bg-line2" />
            </div>
            <div className="flex-1 rounded-[4px] bg-panel p-[8px]">
              <i className="block h-[46px] rounded-[3px] bg-panel2" />
              <i className="mt-[8px] block h-[12px] w-[52px] rounded-[3px] bg-acc" />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
