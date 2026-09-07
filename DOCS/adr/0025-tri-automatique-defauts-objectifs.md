# ADR-0025 : les défauts objectifs sont triés par la plateforme, l'identité reste arbitrée par l'utilisateur

## Statut

Accepté (2026-09-07)

## Contexte

Le tri automatique ne regarde aujourd'hui qu'**un seul** score : la
similarité d'identité (`runner/sortie.py`, `checker.verdict(score)`).
Tout le reste — réalisme, et depuis P4.3 les mains — est mesuré,
enregistré, affiché en Revue, et n'influence rien.

Ce partage vient de `PROJET.md` (« la plateforme mesure et informe, elle
n'arbitre pas à sa place »). Il a tenu tant que les mesures non-identité
étaient des indicateurs de confort. Il a cassé le 2026-09-07 : deux
productions (`intime_chambre_matin_20260907_01.png` et `..._01_2.png`)
aux mains fondues dans la cuisse et au torse anormalement allongé sont
parties en `OK` — visage conforme (0.738 et 0.759), donc tri satisfait.

L'objection de l'utilisateur, qui ouvre cet ADR : *« si l'utilisateur
final doit inspecter finement à chaque génération mains + anatomie +
identité, la plateforme perd de son intérêt »*. Elle est juste, et elle
révèle que le principe de `PROJET.md` mélangeait deux choses très
différentes sous le mot « arbitrage » :

- **Un jugement subjectif et contextuel** — « est-ce bien elle ? » n'a
  pas la même réponse sur un gros plan et sur un plan large. Personne
  d'autre que l'utilisateur ne peut trancher, et un seuil qui tranche à
  sa place lui retire une décision qui lui revient.
- **Un défaut objectif** — une main à six doigts est ratée pour tout le
  monde, dans tous les contextes. Il n'y a rien à arbitrer : la faire
  regarder à un humain à chaque génération est du travail imposé, pas de
  la souveraineté rendue.

## Décision

Deux familles de mesures, avec deux rôles explicitement distincts :

- **Les mesures qui TRIENT** — défauts objectifs : mains cassées
  (capacité `hands`, P4.3), plausibilité anatomique (P4.5). Une image que
  ces mesures condamnent est écartée par la plateforme, sans passer par
  l'œil de l'utilisateur.
- **Les mesures qui INFORMENT** — jugement subjectif : identité,
  réalisme. Affichées, jamais bloquantes. Inchangé.

**Condition d'entrée dans la famille « trie », non négociable :** une
mesure ne devient bloquante qu'après avoir démontré sa fiabilité sur un
corpus étiqueté à la main — faux positifs ET faux négatifs comptés, et
le taux jugé acceptable par l'utilisateur. Tant que cette démonstration
n'est pas faite, la mesure reste informative, quelle que soit
l'impatience de la brancher.

Cette condition n'est pas de la prudence de principe : elle est écrite
parce que la mesure `mains` v1, mesurée le jour même de cet ADR sur les
48 images que l'utilisateur avait validées en `OK`, en aurait **rejeté
16 (33 %)** et mis 4 de plus en suspect — tout en gardant en `OK` les
deux images réellement cassées qui ont motivé ce chantier (scorées 1.0,
voir `DOCS/recherche/2026-09-07-signal-geometrique-mains.md`). La
brancher telle quelle aurait fait exactement l'inverse de ce qui est
demandé ici : jeter le bon travail, garder les ratés. Un tri automatique
faux est strictement pire que pas de tri automatique — l'utilisateur
perd la confiance ET les images.

Conséquence immédiate : **aucune mesure ne trie aujourd'hui**. Le
comportement du runner ne change pas dans ce commit. `hands` reste
informative jusqu'à ce qu'un juge fiable existe (piste Florence-2 :
DWPose localise, un modèle qui regarde les pixels juge) ; `proportions`
(P4.5) naît directement avec cette barre à franchir.

## Alternatives envisagées

- **Brancher le tri sur `hands` immédiatement** — écarté par la mesure :
  33 % de faux positifs sur le corpus validé, 0 % de détection sur les
  deux cas réels. Ce n'est pas un réglage de seuil à affiner, c'est une
  mesure qui regarde la mauvaise chose (le squelette, pas les pixels).
- **Un seuil très permissif** (ne rejeter que `score = 0`) — écarté :
  les deux images cassées scorent 1.0. Un tel filet n'attrape rien de ce
  qu'on veut attraper, tout en donnant l'illusion d'une protection —
  pire que rien, parce qu'il déresponsabilise la relecture.
- **Garder tout en informatif** (statu quo) — écarté : c'est exactement
  le problème remonté. Mesurer sans jamais agir transforme chaque
  génération en inspection manuelle, ce que l'outil est censé éviter.
- **Laisser l'utilisateur choisir mesure par mesure ce qui bloque** (des
  cases à cocher dans les réglages) — écarté pour l'instant : reporte
  sur lui une décision qu'il ne peut pas prendre sans connaître les taux
  d'erreur de chaque mesure, c'est-à-dire précisément le travail que
  cette condition de fiabilité impose au projet. À reconsidérer une fois
  que plusieurs mesures auront un taux d'erreur connu.

## Conséquences

`PROJET.md` est amendé (positionnement et critères de sortie V1) : c'est
lui qui portait le principe renversé ici, et il doit être modifié en
premier (`CLAUDE.md`).

P4.3 gagne un objectif qu'il n'avait pas : rendre `hands` assez fiable
pour trier, ce qui veut dire un second étage qui juge les pixels du crop
plutôt qu'un indicateur de plus sur les keypoints. P4.5 hérite de la
même barre dès son cadrage.

Deux points volontairement non tranchés ici, qui appartiennent à
l'implémentation du premier tri automatique : le bucket de destination
d'un rejet objectif (`REJET` définitif, ou `A_REVOIR` pour rester
réversible), et la trace laissée à l'utilisateur — une image écartée
sans qu'il l'ait vue doit dire pourquoi, sinon le gain de temps se paie
en opacité.
