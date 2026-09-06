# ADR-0023 : un monde déclare sa maturité via trois flags `readiness`, posés jamais calculés

## Statut

Accepté (2026-09-06)

## Contexte

Le cadrage `DOCS/cadrage/2026-09-06-contrat-de-pack.md` a établi ce qu'un
monde vendable doit réellement porter — `places`, `intentions`, `tones`,
`compatible_families` — à partir de ce que le runner consomme
effectivement, pas du cadrage J8 qui anticipait certaines choses
inexactement. Restait une question ouverte : comment un monde déclare
qu'il a atteint cette maturité, par opposition à un simple placeholder.

Avant cet ADR, ce signal n'existait qu'en prose libre dans `_notes`
(`"assets : PLACEHOLDER"`, `"DETTE DECLAREE"` dans `terres-sauvages.json`)
ou en heuristique dans `worlds._diagnostic()` : un monde était dit
`"pret"` si `assets.lora` ou `assets.prompt_add` était renseigné, `"assets
vides (dette declaree)"` sinon. Cette heuristique confond « champ rempli »
et « rendu validé », et ne dit rien de `places` ni `tones` — un monde
avec 3 lieux squelettiques et aucune plage `expression` calibrée pouvait
être lu comme « pret » dès qu'un `prompt_add` existait.

## Décision

Un champ `readiness` structuré, frère de `assets` (jamais un sous-champ),
dans `WORLDS/<id>.json` :

```json
"readiness": {
  "places": false,
  "tones": false,
  "style": false
}
```

Posé par le créateur du monde, jamais calculé automatiquement. Définition
de chaque flag :

- **`places: true`** — chaque lieu du catalogue a été généré au moins une
  fois, le rendu jugé conforme au prompt par le créateur du monde, et
  chaque intention déclarée par le monde a au moins un lieu qui la
  couvre. `intentions` n'a pas son propre flag : si les `places`
  couvrent toutes les intentions, elles sont validées de fait.
- **`tones: true`** — les plages `tones[].expression` sont calibrées
  contre un personnage réel de ce monde (une mesure), pas copiées d'un
  autre monde ni posées au jugé. Un ton sans plage `expression` ne peut
  jamais valoir `true`.
- **`style: true`** — le différenciateur visuel du monde (LoRA de monde,
  image de référence de style, ou autre mécanisme) est renseigné **et**
  le runner sait le charger (câblage fait). Exception explicite : un
  monde dont la différenciation repose uniquement sur le `prompt_add` de
  ses lieux/tons/intentions peut valoir `true` si c'est un choix assumé
  et documenté dans `_notes` — pas un trou masqué derrière l'absence de
  LoRA.

« Prêt à vendre » = les trois flags à `true`.

Cette granularité remplace toute mention de maturité en prose libre dans
`_notes` (`"PLACEHOLDER"`, `"dette declaree"`, `"rien a mesurer"`) : ce
qui était une phrase à retrouver et interpréter devient un champ à lire.

## Alternatives envisagées

- **Un seul booléen global** (`ready: true/false`) — écarté : masque
  quelle dimension précise manque, oblige à rouvrir `_notes` en texte
  libre pour comprendre pourquoi un monde n'est pas prêt.
- **Un score continu (0–100 %)** — écarté : donne une fausse précision
  sur des critères qui sont d'authentiques seuils qualitatifs (calibré ou
  pas, câblé ou pas), pas une quantité qui s'additionne linéairement.
- **Calculer `readiness` automatiquement depuis le contenu** (compter les
  lieux, vérifier la présence de `tones[].expression`) — écarté :
  `places: true` et `tones: true` demandent un jugement humain (rendu
  visuellement conforme, calibrage réel contre un personnage) qu'aucune
  heuristique sur la seule forme du JSON ne peut attester. Un calcul
  automatique ne prouverait que la présence de données, jamais leur
  validation — exactement le défaut de l'ancienne heuristique `assets`
  que cet ADR corrige.

## Conséquences

`AUTOMATION/worlds.py` gagne un accesseur `readiness(wid)` au même
idiome que `assets(wid)` : rétro-compatible, un monde sans champ
`readiness` renvoie `{places: false, tones: false, style: false}`.
`create_world()` initialise les trois flags à `false` sur tout nouveau
monde. `_diagnostic()` affiche les trois flags au lieu de l'heuristique
`assets vides (dette declaree)`.

Rend visible, sans ambiguïté, que `style: true` est aujourd'hui
inatteignable pour tout monde qui ne s'appuie pas uniquement sur le
prompt : le câblage des assets de monde dans le runner reste hors
périmètre (C3, `BACKLOG.md`). C'est un signal honnête, pas un blocage
artificiel — un monde peut être vendable avec `style: false` s'il assume
et documente que sa différenciation est purement textuelle.

Cet ADR ne fournit aucun outillage pour poser ou valider `readiness` au-
delà de l'édition manuelle du JSON — le world/pack builder (C4,
`BACKLOG.md`) est un chantier séparé.
