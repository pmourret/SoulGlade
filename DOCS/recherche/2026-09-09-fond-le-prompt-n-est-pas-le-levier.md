# Le flou de fond ne répond pas au prompt

Suite directe de `2026-09-08-fond-nettete-non-uniforme.md` (front 1 d'IT-3b)
et clôture du cadrage `2026-09-08-flou-de-fond-choix-de-scene.md` par son
**critère de sortie 3** : sur une même scène et les mêmes seeds, `net` et
`flou` doivent se séparer sur `fond_net`, sinon le réglage est retiré
plutôt que livré.

Ils ne se séparent pas.

## Protocole

Scène `ruelle_ville` — choisie parce qu'elle a de la profondeur réelle et
qu'aucun vocabulaire de flou ne figure dans son texte (deux scènes de
`slow-life.json` en portent, `cafe_terrasse` et `mode_detail_atelier` :
elles auraient testé « le fragment gagne-t-il contre le texte du lieu »,
une autre question).

5 seeds fixes appariés (1001, 1138, 1275, 1412, 1549), chaîne de production
réelle et complète (Flux, refiner 0.4, FaceDetailer, upscale 2K, grain),
passage par `execute_jobs` avec un `Sink` : rien dans PROD, la Revue, le
journal ou les tables de production. 20 images en tout.

Quatre variantes, à seeds égaux :

1. `auto` — le champ absent, comportement d'avant le 08/09 ;
2. `net` — `deep depth of field, sharp background`, injecté par
   `background_focus` après le texte de scène ;
3. `flou` — `shallow depth of field, blurred background`, même place ;
4. `net fort, en tête` — `everything in sharp focus from foreground to
   background, f/11, crisp legible background details`, placé juste après
   l'ancre d'identité, pour écarter l'hypothèse « le fragment est noyé au
   milieu d'un prompt de 580 caractères ».

## Résultats

| variante | fond_net moyen | min | max |
|---|---|---|---|
| auto | 0.580 | 0.381 | 0.819 |
| net | 0.552 | 0.331 | 0.794 |
| flou | 0.561 | 0.375 | 0.819 |
| net fort, en tête | 0.552 | 0.350 | 0.756 |

Écart `net` − `flou` : **−0.009**, du mauvais côté. 2 paires sur 5 dans le
sens attendu, deltas par seed `[+0.006, −0.007, −0.044, −0.025, +0.025]`.
Le détail par seed dit l'essentiel :

| seed | auto | net | flou | net fort |
|---|---|---|---|---|
| 1001 | 0.419 | 0.406 | 0.400 | 0.456 |
| 1138 | 0.738 | 0.706 | 0.713 | 0.681 |
| 1275 | 0.381 | 0.331 | 0.375 | 0.350 |
| 1412 | 0.819 | 0.794 | 0.819 | 0.756 |
| 1549 | 0.544 | 0.525 | 0.500 | 0.519 |

`fond_net` varie de **0.35 à 0.82 d'un seed à l'autre** de la même scène, et
de ±0.03 entre les quatre demandes. Le seed décide ; le texte, non. Sur
4 seeds sur 5, demander « net » rend un fond **moins** net que ne rien
demander — bruit, pas signal inversé.

## Ce que ce n'est pas

Ce n'est pas un défaut de câblage. Vérifié à l'octet : à seed égal, les
trois variantes rendent trois images **différentes** (md5 distincts, 2 à
5 % d'écart pixel moyen). Le fragment atteint bien le modèle. Il déplace
parfois le **cadrage** — sur le seed 1549, `net` colle le sujet au mur
quand `flou` ouvre la ruelle en enfilade — mais jamais la mise au point.
À l'œil, sur les 20 images, le fond est défocalisé partout.

## Décision

Le réglage `background_focus` est **retiré** (revert du commit qui le
livrait), comme le critère de sortie l'exigeait. Ce qui est retiré est le
livrable, pas le constat : le flou de fond reste un choix créatif que la
plateforme n'a pas à trancher (`PROJET.md`), et l'utilisateur n'a
toujours aucune prise dessus.

Ce que la mesure ajoute au constat du 08/09 : le levier n'est pas là où le
cadrage le supposait. La scène explique 71 % de la variance de `fond_net`,
mais **pas par son texte** — par ce que sa composition induit dans le
modèle, ce qu'aucune formulation ne semble renégocier. Reprendre ce sujet
demande un autre levier que le prompt : une image de fond importée et
conservée, un conditionnement structurel, ou un réglage de pipeline. Aucun
n'est cadré, aucun n'est du ressort d'IT-3b.

`fond_net` sort de l'épisode intacte dans son rôle d'instrument : elle a
mesuré une absence d'effet avec la même stabilité qu'elle mesurait le flou
(ADR-0025 tient, elle n'est toujours pas un juge).
