# La référence primaire n'a jamais été posée

Verdict d'IT-3d (`DOCS/cadrage/2026-09-09-lora-identite-par-personnage.md`,
étage 1, points 4 à 6), ouvert par une observation de Pierre le 19/09 en
jugeant les sorties du banc du 14/09 : « on a énormément dévié de la
référence primaire de Léna ».

**La dérive est réelle et elle est ancienne. Elle ne vient pas du LoRA.**
Les sorties du banc du 14/09 sont à **0.61** des quatre images publiées
de juillet ; la production du 04/09, sans LoRA, est à **0.614**. Et les
quatre publiées ne sont qu'à **0.605** les unes des autres. L'écart que
l'œil voit n'est pas dans l'embedding d'identité, et la référence contre
laquelle on voudrait le mesurer n'a pas assez de cohésion pour servir de
référence.

Planche de jugement : `DOCS/analyse/2026-09-20-planche-lena-reference-primaire.jpg`
— les 65 sorties du banc, l'ancre, les quatre publiées et le contrôle du
04/09, visages découpés à l'identique, aucun tri.

## Ce qui a été mesuré

Similarité cosinus InsightFace antelopev2 — le même modèle que PuLID,
donc la même chose que ce que le verrou « voit » (`qc_identity.py`).

Deux références, et c'est tout l'objet de la fiche :

- **anc** — l'ancre gelée `OFM_LENA_BASE_00025_.png` (24/07), ce que
  `config.json / base_gelee` désigne et ce que le genre `identite` du
  banc a toujours mesuré ;
- **pub** — le centroïde des quatre images publiées de juillet
  (`OFM_00029_`, `OFM_00030_`, `OFM_00036_`, `e123a_eavdue_135z`, 22/07),
  qui sont en base avec `role='reference'`. Attention au faux ami : ce
  rôle est celui du **corpus de réalisme** (six images, dont deux qui ne
  sont pas de Léna), l'étalon auquel `texture_visage` et `nettete` se
  comparent. Aucune mesure d'identité ne s'en sert, et c'est tout le
  sujet de cette fiche.

Les embeddings des images de production, du gabarit et du jeu
d'entraînement étaient déjà en base (`embedding`, 114 lignes) : aucune
repasse InsightFace pour eux. Les 65 sorties du banc et le contrôle du
04/09 ont été mesurés pour cette fiche, sous le Python de ComfyUI.

**Leave-one-out pour les quatre publiées.** Une image comparée à un
centroïde qui la contient se note elle-même : chacune est donc notée
contre le centroïde des trois autres. Sans cette précaution la ligne de
référence de la planche paraîtrait tenir à 0.78.

## 1. L'ancre n'est pas ce qui a été publié

| | vs ancre |
|---|---|
| `OFM_00029_` | 0.654 |
| `OFM_00030_` | 0.636 |
| `OFM_00036_` | 0.518 |
| `e123a_eavdue_135z` | 0.496 |
| centroïde des quatre | 0.732 |

Bandes du dépôt : ≥ 0.72 conforme, 0.60–0.71 dérive visible, < 0.60 ce
n'est plus le même visage. **Les quatre publiées sont toutes sous le
seuil de conformité, deux sous 0.60.**

L'ancre date du 24/07, deux jours après ces images. Elle n'a pas été
posée *avant* la production : elle a été choisie dedans, après coup — et
pas au centre.

## 2. Les quatre publiées ne forment pas une référence

| | vs les trois autres (LOO) |
|---|---|
| `OFM_00029_` | 0.658 |
| `OFM_00030_` | 0.667 |
| `OFM_00036_` | 0.529 |
| `e123a_eavdue_135z` | 0.568 |
| **moyenne** | **0.605** |

Similarité par paires : moyenne 0.491, minimum 0.419. Le gabarit actuel,
lui, a une cohésion interne de **0.931** (`reference_set` n° 4).

Une partie de l'écart est de la pose — `OFM_00036_` est couchée, tête à
90°, et le cosinus s'écroule sur les poses extrêmes. Pas 0.49 pour
autant. **Juillet n'est pas un personnage, c'est un nuage.** C'est le
sens exact de « elle n'était pas posée dès le début » : il n'y a pas
d'objet « Léna primaire » dans le dépôt, il y a quatre images qui
plaisent et qui ne s'accordent pas entre elles.

Conséquence directe, et c'est la plus gênante : **« distance aux
publiées » ne peut pas servir de critère**. Son plancher de bruit (0.605)
est au niveau des valeurs qu'on voudrait juger avec (0.59–0.65).

## 3. Le gabarit et le jeu d'entraînement ont figé l'après

Le set de référence actif (n° 4) compte 45 images, **toutes datées du
22/08 au 04/09**. Aucune de juillet.

| | vs ancre | vs pub |
|---|---|---|
| centroïde du gabarit | 0.810 | 0.657 |
| membres du gabarit (moyenne) | — | 0.612 |
| centroïde du jeu d'entraînement (export 10/09, 24 images + l'ancre) | 0.824 | 0.668 |

Le jeu d'entraînement du LoRA est un sous-ensemble de cette même fenêtre.
Le LoRA ne pouvait donc apprendre que le visage d'août — et le gabarit,
qui sert à mesurer, est tiré du même nuage. **L'instrument et le sujet
viennent de la même quinzaine :** rien dans la chaîne n'était en position
de signaler une dérive par rapport à juillet.

Ce n'est pas une faute du gabarit. `2026-09-09-l-ancre-n-est-pas-le-gabarit.md`
avait tranché que le gabarit est versionné et mesuré contre ses pairs ;
ce qu'il ne dit pas, et qui manquait, c'est **à quoi on rattache le
premier gabarit**.

## 4. Le banc du 14/09 n'est pas plus loin que la production du 04/09

| lot | n | vs ancre | vs pub |
|---|---|---|---|
| `lora_strength=0.0` (LoRA éteint) | 5 | 0.758 | 0.629 |
| `lora_strength=0.6` | 5 | 0.779 | 0.622 |
| `lora_strength=0.8` | 5 | 0.779 | 0.613 |
| `identity_weight=0.65` | 5 | 0.770 | 0.619 |
| `identity_weight=0.75` | 5 | 0.769 | 0.620 |
| époque 000002 | 5 | 0.737 | 0.583 |
| époque 000004 | 5 | 0.781 | 0.613 |
| époque 000006 | 5 | 0.752 | 0.608 |
| époque 000008 | 5 | 0.767 | 0.599 |
| **contrôle : production 04/09, même scène, même 9:16, sans LoRA** | 1 | 0.752 | **0.614** |

Tout le banc tient dans une bande de 0.05, contrôle compris. Le LoRA
éteint (0.629) est *au-dessus* du LoRA à pleine force (0.613). Et à l'œil,
sur la planche, la géométrie du visage est la même à 0.0 et à 0.8 : même
mâchoire en losange, mêmes deux plaques symétriques de taches de
rousseur.

**Le LoRA n'est pas la cause de ce que Pierre voit.** Ce qu'il voit
existait déjà dans la production de début septembre.

## 5. Ce que le banc ne peut pas dire : son bruit vaut sa marge

Quatre lots du 14/09 tournent la **configuration identique** (LoRA v1 à
0.8, poids PuLID 0.85) sur les **cinq mêmes seeds** : la référence de
chacun des trois bancs, plus la variante `lora_strength=0.8`. Leurs
images ne sont pas les mêmes fichiers (md5 tous différents) : **la chaîne
n'est pas déterministe à seed fixée.**

| réplicat de la même condition | vs ancre | vs pub |
|---|---|---|
| référence du banc `lora_strength` | 0.759 | 0.594 |
| `lora_strength=0.8` | 0.779 | 0.613 |
| référence du banc `lora_name` | 0.766 | 0.603 |
| référence du banc `identity_weight` | 0.776 | 0.607 |

- étendue des moyennes de lot : **0.019** sur les deux colonnes ;
- écart-type des moyennes de lot : 0.009 ;
- étendue moyenne **par seed** : 0.029.

`config.json / bench / margin / identite` vaut **0.02**. Le bruit de
réplicat de la chaîne est donc de la taille exacte de la marge qui sert à
rendre le verdict. Le « meilleure sur tous les axes suivis » rendu à
`lora_strength=0.8` contre sa propre référence **compare la condition à
elle-même** : +0.020, soit son bruit.

C'est la même leçon que le 09/09 sur `nettete`, sur un autre genre et
avec une cause différente : là c'était la variance de scène, ici c'est la
non-reproductibilité de la chaîne. La source reste à identifier —
candidat immédiat, la variation d'expression (`expression_budget: 0.05`),
qui perturbe le prompt à réglages égaux ; à confirmer, ce n'est pas
mesuré ici.

## Verdict IT-3d

La DoD demandait « un chiffre écrit, dans un sens ou dans l'autre. Soit
le banc montre que le LoRA desserre le curseur identité/texture […] soit
il montre que non ».

**Il montre que non.**

- identité contre l'ancre : 0.758 sans LoRA → 0.779 à pleine force, soit
  +0.021, dans le bruit de réplicat mesuré ci-dessus ;
- identité contre les publiées : 0.629 → 0.613, dans le mauvais sens, et
  dans le bruit aussi ;
- ce que le LoRA apporte réellement est ailleurs, et là ce n'est pas du
  bruit : netteté 193 → 431, texture de visage 5.43 → 5.86, fond net
  0.504 → 0.888 entre force 0.0 et force 0.8.

**Le LoRA d'identité de Léna achète du piqué, pas de l'identité.** Aucune
raison de le retirer — il ne coûte rien de mesurable et il rend l'image
plus nette — mais il ne desserre pas le troc identité/texture du 09/09,
et IT-4 ne doit pas être planifiée en supposant qu'il le fera. Les
époques intermédiaires sont toutes en dessous de la v1 finale : rien à
récupérer de ce côté.

Le poids PuLID peut descendre de 0.85 à 0.75 sans rien perdre de
mesurable (0.776 → 0.769 contre l'ancre, 0.607 → 0.620 contre les
publiées) — mais au vu du point 5, cet écart est lui aussi dans le bruit.
**À ne pas acter sur ce banc seul.**

## Ce qui reste à décider, et qui n'est pas technique

Quelle est la Léna de référence ? Trois réponses possibles, aucune
gratuite :

1. **Le visage d'août-septembre fait foi.** Juillet était de
   l'exploration pré-verrou ; le personnage réel est celui que la
   plateforme produit depuis le 22/08, cohérent (0.931) et proche de
   l'ancre (0.810). Rien à refaire côté production, mais l'ancre elle-même
   ne montre plus ce visage et sert à deux choses à la fois : elle est la
   source d'injection PuLID autant que l'étalon de mesure.
2. **Le visage de juillet fait foi.** Il faut alors reposer une ancre,
   reconstruire un gabarit et réentraîner — sachant qu'on ne dispose que
   de quatre images de ce look, qu'elles ne s'accordent pas entre elles
   (0.605) et qu'aucune ne peut servir d'ancre seule. Le préalable n'est
   pas un réglage : c'est refabriquer une série cohérente de ce visage,
   donc un chantier de production avant tout chantier de mesure.
3. **Ce que l'œil voit n'est pas de l'identité.** Hypothèse à ne pas
   écarter : sur la planche, ce qui distingue le 14/09 du 22/07 est
   autant la morphologie du corps, la largeur de mâchoire, la répartition
   des taches de rousseur et la lumière que le visage lui-même — et
   l'embedding antelopev2 est presque aveugle à tout ça. C'est exactement
   la dette E6 « les mesures de réalisme ne voient pas ce que l'œil
   voit », et le sujet de corps ouvert par IT-3e. Si c'est la bonne
   lecture, ni 1 ni 2 ne règlent le problème et le levier est dans le
   prompt et le graphe, pas dans le verrou.

Ces trois réponses n'ont pas le même coût et ne s'excluent pas toutes :
1 et 3 sont compatibles. Le choix appartient à Pierre — la plateforme ne
tranche pas ce qui n'a pas de bonne réponse objective (`PROJET.md`,
« Le cœur »).

## Décision, le 20/09

**Réponse 1.** Le visage de septembre est la référence absolue par
défaut ; l'ancre de juillet ne fait plus foi ; reposer l'ancre dessus est
une dette assumée, calée dans la feuille de route et non dans la séquence
en cours (tableau de bord, décision du 20/09, dettes E2 et E5).

Ce que la dette recouvre, et qui n'est pas un simple renommage de
fichier : l'ancre est **la source d'injection PuLID** autant que
l'étalon. Les images de production les plus centrales du visage actuel
portent un visage de 230 à 360 px, contre 989 px pour l'ancre du 24/07 ;
aucune ne peut la remplacer telle quelle sans dégrader l'injection. Le
geste juste est de produire un portrait frontal du visage actuel dans les
conditions de l'ancre (fond neutre, cadrage serré, expression neutre),
de le geler, puis de rescorer l'historique contre lui. Les plus centrales
mesurées ce jour, si un repêchage devait quand même se faire sans
nouvelle génération : `lifestyle_cafe_terrasse_20260828_01` (0.950 du
centroïde du gabarit), `sport_tapis_20260904_01` (0.949),
`intime_salle_bain_apres_douche_20260824_01` (0.947, le plus grand visage
des trois à 361 px).

## Limites de cette fiche

- Les 65 sorties ont été **mesurées** une par une, mais seules quatre ont
  été regardées à l'œil pour écrire ceci. La planche existe pour que le
  jugement soit fait, il ne l'est pas. Le feuillet `Lena_lora_strength`
  d'`Analyse_hand_detailer.xlsx` ne couvre à ce jour que la force 0.
- Le contrôle du 04/09 est **une seule image**. Il suffit à montrer que
  la dérive précède le LoRA, il ne suffit pas à chiffrer la dérive
  d'août.
- La non-reproductibilité à seed fixée est **démontrée** (md5) et
  **chiffrée** (0.019 sur les moyennes de lot) ; sa cause ne l'est pas.
  Elle mérite son propre chantier : tant qu'elle tient, tout verdict du
  banc sous 0.03 sur l'identité est illisible, quel que soit l'axe.
- Les scripts de mesure et de montage sont jetables (scratchpad de
  session). Le protocole tient en vingt lignes sur la table `embedding` ;
  s'il doit resservir, il a sa place dans `AUTOMATION/tools/`, à côté de
  `planche_mains.py`.
