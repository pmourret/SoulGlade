/* A character's frozen base, or its initial (design-pass screen-14 §S2, §S3).

   `GET /img/base?character=<id>` is bound to the character NAMED in the query
   and takes no file name: it reads `base_gelee` from that character's own
   config, so a row can never be served another character's face
   (`AUTOMATION/tests/test_base_isolation.py`). A character with no base, a
   missing file, or an unknown pack (the dependency refuses it) answers an
   error, and the initial takes over.

   The accent is the studio's, not the character's: `/api/characters` carries
   no tint, and the registry shows only what it is given. */
import { useState } from 'react'

import { initialOf } from '../../character/CharacterContext'

export function CharacterPortrait({
  id,
  name,
  className,
  initialClass,
  knownPack = true,
}: {
  /** False for a pack the studio cannot resolve: the route would answer 400,
      so it is not asked — the initial is the known answer. */
  knownPack?: boolean
  id: string
  name: string
  className: string
  initialClass: string
}) {
  const [failed, setFailed] = useState(!knownPack)
  if (failed) {
    return (
      <span className={`${className} flex items-center justify-center bg-panel3 font-bold text-acc ${initialClass}`} aria-hidden="true">
        {initialOf({ id, name })}
      </span>
    )
  }
  return (
    <img
      className={`${className} object-cover bg-panel2`}
      src={`/img/base?character=${encodeURIComponent(id)}`}
      alt=""
      loading="lazy"
      onError={() => setFailed(true)}
    />
  )
}
