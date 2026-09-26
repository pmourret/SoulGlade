/* Le composeur de scène : un rail de sections, et le panneau ouvert.

   CE FICHIER NE FAIT PLUS QUE ROUTER (design-pass screen-7c). Il portait les
   sept panneaux, leurs sous-composants et leurs dialogues — mille trois cents
   lignes où une correction de la grille des vêtements se relisait au milieu
   du sélecteur de pose. Chaque panneau vit désormais dans `panels/`, un
   fichier chacun, et ce qui reste ici est ce qui leur est commun : l'état de
   la section ouverte, les labels de pose chargés une fois, et la phrase du
   verrou ADR-0015.

   VERTICAL TABLIST, RADIX. Le rail est `Tabs.List` (`SectionRail.tsx`) :
   `orientation="vertical"` suffit à ce que ↑ ↓ Home End et le roving tabindex
   suivent. `data-tab`, jamais un `id` : Radix calcule `aria-controls` depuis
   un id qu'il génère lui-même, et le remplacer casse à la fois la référence
   ARIA et la recherche du trigger suivant (trois bugs distincts avant que la
   bibliothèque ne prenne la main).

   LE PROMPT EST DÉCOUPÉ ICI, ASSEMBLÉ NULLE PART AILLEURS. `scenes.json`
   porte toujours UNE chaîne `prompt`, lue par `build_jobs` comme avant (test
   à l'octet près, CLAUDE.md §3). `promptBase`/`promptLight`/`promptPose` sont
   des fragments de brouillon, joints par `composePrompt` à l'enregistrement ;
   `sceneFragments` les redécoupe pour les vues colorées, sans jamais les
   rejoindre. `wardrobe` n'est pas un quatrième fragment : la tenue est
   injectée par niveau à la génération, jamais fondue dans le prompt. */
import { useEffect, useRef, useState } from 'react'
import * as Tabs from '@radix-ui/react-tabs'

import { useApi } from '../../../api/useApi'
import type { Creative } from '../../../state/TaxonomyContext'
import type { Scene, SceneDraft } from '../../../state/ScenesStoreContext'
import type { SceneField } from '../sceneChanges'
import { SECTIONS, type SectionKey } from './sections'
import { SectionRail } from './SectionRail'
import { AiPanel } from './panels/AiPanel'
import { ClothingPanel } from './panels/ClothingPanel'
import { GeneralPanel } from './panels/GeneralPanel'
import { JsonPanel } from './panels/JsonPanel'
import { LightPanel } from './panels/LightPanel'
import { PosePanel, type PoseSummary } from './panels/PosePanel'
import { RecapPanel } from './panels/RecapPanel'

export function SceneComposer({
  draft,
  saved,
  creative,
  poses,
  produced,
  worldLinked,
  changed,
  narrow,
  onPatch,
  onSaveDocument,
  onRevert,
}: {
  draft: SceneDraft
  /** The same scene as the last save left it — the JSON panel compares
      against it, and `undefined` means the bank has never seen it. */
  saved: Scene | undefined
  creative: Creative | null
  poses: string[]
  produced: number | null
  /* A scene bound to a world place (ADR-0015): its frame — décor, lumière and
     the pose prose — is re-derived server-side on every save, so those three
     are locked here regardless of what gets typed. Wardrobe levels and the
     pose skeleton are OVERLAY keys, never locked by this. */
  worldLinked: boolean
  /** Draft fields differing from the saved scene (`sceneChanges`) — borders
      in the panels, dots on the rail. */
  changed: Set<SceneField>
  /** Under 1100 px the rail keeps its icons and clips its labels. */
  narrow: boolean
  onPatch: (patch: Partial<SceneDraft>) => void
  /** The document-level save, offered again from the JSON panel. */
  onSaveDocument: () => void
  /** Drop every pending change — the same action as the banner's « Annuler ». */
  onRevert: () => void
}) {
  const [tab, setTab] = useState<SectionKey>('general')
  const idRef = useRef<HTMLInputElement | null>(null)
  const api = useApi()

  /* Labels for `poses` — refetched whenever the filename list itself changes,
     same trigger `usePoseBank`'s own `reloadBankDetail` uses. A pose with no
     sidecar (legacy, or the fetch hasn't landed yet) falls back to its
     filename, same as `PoseCard`'s own `label || name`. */
  const [poseLabels, setPoseLabels] = useState<Record<string, string | null>>({})
  useEffect(() => {
    let cancelled = false
    void api
      .get<{ poses?: { nom: string; label: string | null }[] }>('/api/pose/bank')
      .then((response) => {
        if (cancelled) return
        const map: Record<string, string | null> = {}
        for (const entry of response.poses ?? []) map[entry.nom] = entry.label
        setPoseLabels(map)
      })
    return () => {
      cancelled = true
    }
  }, [api, poses])
  const posesWithLabels: PoseSummary[] = poses.map((name) => ({
    name,
    label: poseLabels[name] ?? null,
  }))

  /* Opening a DIFFERENT scene always starts on Général and puts the cursor in
     its name — the same "opening focuses the identifier" contract the flat
     form had. Switching section on the SAME scene must not fight the user's
     own navigation, hence keying on `draft.uid` and nothing else. */
  useEffect(() => {
    setTab('general')
    idRef.current?.focus()
  }, [draft.uid])

  const lockedNote =
    'repris du monde — « Modifier pour ce personnage », en tête de scène, en fait sa copie.'

  return (
    <Tabs.Root
      value={tab}
      onValueChange={(v) => setTab(v as SectionKey)}
      orientation="vertical"
      className="flex min-h-0 flex-1"
    >
      <SectionRail active={tab} changed={changed} narrow={narrow} />

      {/* Sous 1100 px le formulaire ne défile PAS pour son compte : toute la
          colonne défile d'un bloc (BankScreen, §S6), sinon deux barres de
          défilement imbriquées se disputent le même geste. */}
      <div className="min-h-0 min-w-0 flex-1 overflow-y-auto max-[1100px]:overflow-visible">
        {/* Les SEPT panneaux restent montés (`forceMount`) — seul le CONTENU
            de celui qui est ouvert existe. Radix ne monte que le panneau
            actif par défaut, ce qui ferait pointer `aria-controls` vers un
            élément absent pour les six autres ; `hidden` donne le même effet
            pratique sans ce mensonge. */}
        {SECTIONS.map((section) => (
          <Tabs.Content
            key={section.key}
            value={section.key}
            data-tabpanel={section.key}
            forceMount
            hidden={tab !== section.key}
          >
            {tab === section.key && (
              /* LE PANNEAU PREND LA COLONNE, la mesure de lecture reste bornée
                 (amendement du 24/09 au §S4.3 de screen-7b). Le plafond de
                 880 px avait été écrit contre un écran de 1440, où la colonne
                 du composeur fait 664 px : il ne mordait jamais. Sur un écran
                 de 2560 il laissait un tiers de la colonne vide à droite de
                 chaque panneau, et empilait en hauteur ce qui tenait côte à
                 côte. Ce qui reste plafonné est donc le CHAMP DE TEXTE, pas le
                 panneau — au-delà, les blocs se posent l'un à côté de l'autre.

                 `@container` et non une media query : la largeur disponible
                 dépend de la colonne, et la colonne dépend de l'aperçu ouvert
                 ou non, pas de la fenêtre. Chaque panneau décide de sa bascule
                 avec `@[…px]:`.

                 Le plafond, quand il reste, est sur un enfant et jamais sur
                 l'élément `hidden` : une utilitaire de mise en page et le
                 `[hidden]{display:none}` du navigateur ont la même
                 spécificité, et l'utilitaire peut gagner. */
              <div className="@container p-[20px]">
                <h2 className="m-0 text-[15px] font-[650]">
                  {section.label}
                </h2>
                <p className="tiny mt-[2px] mb-[16px]">{section.model}</p>

                {section.key === 'general' && (
                  <GeneralPanel
                    draft={draft}
                    creative={creative}
                    produced={produced}
                    worldLinked={worldLinked}
                    changed={changed}
                    idRef={idRef}
                    onPatch={onPatch}
                    onGotoClothing={() => setTab('clothing')}
                  />
                )}
                {section.key === 'light' && (
                  <LightPanel
                    draft={draft}
                    worldLinked={worldLinked}
                    lockedNote={lockedNote}
                    changed={changed}
                    onPatch={onPatch}
                    onGoto={setTab}
                  />
                )}
                {section.key === 'clothing' && (
                  <ClothingPanel draft={draft} changed={changed} onPatch={onPatch} />
                )}
                {section.key === 'pose' && (
                  <PosePanel
                    draft={draft}
                    poses={posesWithLabels}
                    worldLinked={worldLinked}
                    lockedNote={lockedNote}
                    changed={changed}
                    onPatch={onPatch}
                  />
                )}
                {section.key === 'recap' && (
                  <RecapPanel
                    draft={draft}
                    worldLinked={worldLinked}
                    lockedNote={lockedNote}
                    changed={changed}
                    onPatch={onPatch}
                    onGoto={setTab}
                  />
                )}
                {section.key === 'ai' && <AiPanel draft={draft} />}
                {section.key === 'json' && (
                  <JsonPanel
                    draft={draft}
                    saved={saved}
                    changed={changed}
                    onGoto={setTab}
                    onSaveDocument={onSaveDocument}
                    onRevert={onRevert}
                  />
                )}
              </div>
            )}
          </Tabs.Content>
        ))}
      </div>
    </Tabs.Root>
  )
}
