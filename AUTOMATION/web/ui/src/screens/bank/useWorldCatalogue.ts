/* What the character's world offers that its bank does not hold yet — the
   « Ajouter depuis le catalogue du monde » gesture (21/09).

   THE GESTURE DID NOT EXIST FOR ANY PLACE. A bank was seeded from the world
   at the character's creation (`runner/prompt.py`), and never again: a place
   added to a world afterwards stayed out of reach of every character of that
   world, adult or not. This hook serves both catalogs for that reason — the
   adult one was only the occasion.

   THE ADULT PLACES ARE OFFERED ONLY WHEN TWO THINGS HOLD: the character is
   armed (ADR-0003, off by default), and its taxonomy names a native tier
   (`niveau_natif` of `/api/creative`). Missing either, the adult list is
   empty — not greyed: a greyed row is still an invitation, the same rule the
   intensity slider already follows for the notch that requires arming.

   It loads through `useWorldCatalog` (the only caller of the world routes) and
   hands out plain data and one callback; it never talks to the API itself. */
import { useMemo } from 'react'

import { useCharacter } from '../../character/CharacterContext'
import { useScenes } from '../../state/ScenesStoreContext'
import { useTaxonomy } from '../../state/TaxonomyContext'
import { useWorldCatalog, type WorldScene } from '../worlds/useWorldCatalog'
import { missingPlaces, sceneFromPlace } from './sceneFromPlace'

export function useWorldCatalogue(worldId: string | null) {
  const { sheet } = useCharacter()
  const { creative } = useTaxonomy()
  const { drafts } = useScenes()
  const ordinary = useWorldCatalog<WorldScene>(worldId, 'scenes')
  const adult = useWorldCatalog<WorldScene>(worldId, 'scenes-adulte')

  const nativeLevel = creative?.niveau_natif ?? null
  const armed = Boolean(sheet?.nsfw)
  const adultAllowed = armed && nativeLevel != null

  /* What the bank holds, read from the DRAFTS so a place added and not yet
     saved is not offered a second time. */
  const held = useMemo(
    () => drafts.map((d) => ({ id: d.id, world_ref: d.base.world_ref })),
    [drafts],
  )
  const ordinaryMissing = useMemo(() => missingPlaces(ordinary.entries, held), [ordinary.entries, held])
  const adultMissing = useMemo(
    () => (adultAllowed ? missingPlaces(adult.entries, held) : []),
    [adultAllowed, adult.entries, held],
  )

  /* The scene a place would become, for THIS character. Never called for an
     adult place when the adult list is not allowed — it would not be listed. */
  const toScene = (place: WorldScene, isAdult: boolean) =>
    sceneFromPlace(place, worldId ?? '', isAdult && nativeLevel != null ? { nativeLevel } : null)

  return {
    loading: ordinary.entries === null,
    error: ordinary.error ?? (adultAllowed ? adult.error : null),
    ordinaryMissing,
    adultMissing,
    adultAllowed,
    /* A notice ONLY for the armed character whose taxonomy has no native
       tier — a configuration gap worth saying. An unarmed character gets
       nothing at all about adult places: telling it they exist and how to
       reach them would be the invitation that « off by default » refuses. */
    adultNotice:
      armed && nativeLevel == null ? "ce personnage n'a pas de palier natif déclaré" : null,
    nativeLevel,
    toScene,
  }
}
