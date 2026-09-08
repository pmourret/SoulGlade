# P4.5 — Plausibilité des proportions du corps

Cadrage court (règle 3, `PROJET.md`) ouvert le 2026-09-07 après un
retour d'usage : deux productions Léna (`intime_chambre_matin_
20260907_01.png` et `..._01_2.png`) montrent un torse anormalement
allongé et des bras de longueurs incohérentes, et **aucune mesure
existante ne les voit** — ni l'identité (le visage est conforme, 0.738
et 0.759), ni le réalisme (netteté/texture/bruit de fond), ni les mains
(P4.3, qui les score 1.0). Trou de couverture, pas régression.

Trois questions, comme tout cadrage.

## À quoi ça sert

Le tri automatique classe OK une image dont le visage est bon, quelle
que soit l'anatomie du reste du corps. C'est cohérent avec ce que le
tri sait faire aujourd'hui, mais ça laisse passer en production des
images que Pierre rejetterait d'un coup d'œil. Une mesure de
plausibilité des proportions rend ce défaut visible — et, une fois sa
fiabilité démontrée, permet à la plateforme de **l'écarter elle-même**
(ADR-0025) : une anatomie incohérente est un raté mécanique, pas un
choix créatif à soumettre à l'utilisateur.

Deuxième raison, spécifique à ce moment du projet : c'est la seule des
trois familles de défauts constatées le 07/09 pour laquelle le signal
semble réellement disponible. La recherche
`DOCS/recherche/2026-09-07-signal-geometrique-mains.md` a fermé la piste
géométrique **pour les mains** (l'information n'est pas dans le
squelette) — mais elle a mesuré au passage que l'asymétrie des bras de
la première image sort nettement du lot (0.32 contre 0.14 au maximum sur
13 images de contrôle). Une proportion est un rapport de longueurs entre
points : exactement ce qu'un squelette porte.

## Hors périmètre

- **Corriger les proportions.** Comme pour les mains : on mesure et on
  affiche, on ne retouche pas. Toute régénération automatique déborde.
- **Un nouveau détecteur.** DWPose est déjà provisionné et déjà invoqué
  par la capacité `hands` (P4.3) ; cette mesure doit se servir de la
  MÊME extraction, pas en déclencher une seconde par image — sinon on
  double une deuxième fois le coût ComfyUI par génération.
- **Les mains.** Traitées par P4.3, et leur volet géométrique est clos
  (voir la recherche citée). Aucun recouvrement.
- **Un modèle anthropométrique complet** (canons de proportions, ratios
  tête/corps par morphologie). Le personnage est fictif et stylisé ; la
  cible n'est pas « conforme à un canon », c'est « cohérent avec
  lui-même » — deux bras de la même personne ont la même longueur, quel
  que soit son gabarit.

## Critère de sortie

1. Une mesure `proportions` (score continu 0..1, même patron que
   `identite` et `mains`), calculée depuis le squelette DWPose **déjà
   extrait** par la capacité `hands`, enregistrée en base et affichée
   dans la Revue à côté des autres scores.
2. Le score sépare, sur un corpus étiqueté à la main, les images dont
   Pierre juge les proportions fausses de celles qu'il garde — vérifié
   par des chiffres, pas à l'œil sur deux cas.
3. Seuil par personnage dans `config.json` (`qc.proportions`), jamais en
   dur (invariant 4). Valeur de départ marquée non mesurée tant que le
   corpus de l'étape 1 ne l'a pas calibrée.
4. **Ajouté le 2026-09-07 (ADR-0025)** : l'anatomie est un défaut
   objectif, donc cette mesure a vocation à TRIER, pas seulement à
   informer. Elle ne devient bloquante qu'après le même examen que les
   mains — faux positifs et faux négatifs comptés sur le corpus de
   P4.5.1, taux jugé acceptable par Pierre. Sans cette démonstration
   elle reste affichée sans bloquer, quelle que soit l'envie de la
   brancher.

## Découpage en étapes

### P4.5.1 — Constituer le corpus étiqueté

Le blocage de P4.3 était l'absence de corpus : impossible de calibrer
honnêtement un seuil sur deux images. Cette étape le règle en premier,
avant toute ligne de code de mesure.

Passer la banque Léna existante en revue et étiqueter chaque image
« proportions correctes » / « proportions fausses ». Le jugement humain
est la seule référence disponible — même discipline que les bandes de
`qc_realisme`, qui se calibrent sur ce que l'utilisateur marque
convaincant, jamais sur une constante écrite dans le code.

**Livrable** : une liste étiquetée, stockée là où le reste des jugements
vit déjà.

**Tranché le 2026-09-08** — second champ, pas fichier séparé. L'étiquette
est un champ `anatomie` de `mesures.json`, à côté de `flag` (qui reste le
jugement de réalisme, inchangé) : le store est déjà indexé par nom de
fichier, déjà suivi quand le tri renomme (`mesures.renommer`), déjà
préservé quand l'éditeur écrase les pixels (`demesurer` efface les
mesures, garde les jugements). Un fichier de corpus séparé aurait dû
réimplémenter les trois, et aurait divergé au premier tri. P4.5.2 joint
étiquette et squelette par un `dict` sur le même nom.

Trois valeurs, pas deux : `ok` (corps visible, proportions cohérentes),
`ko` (corps visible, défaut mécanique), `na` (non jugeable — portrait
serré, corps hors champ, membre coupé par le cadre). Le `na` est
structurel, pas du confort : sans lui les portraits tombent en `ok`,
DWPose n'y trouve pas de squelette exploitable, et l'indicateur affiche
une séparation qui ne mesure rien — exactement le piège des 33 % de faux
positifs de la mesure `mains`.

Étiquetage dans la Revue, en plein cadre uniquement (`p` / `f` / `n`) :
un axe de plus sur `/api/flag`, qui porte déjà un jugement humain non
bloquant qui ne déplace aucun fichier. Pas de vignette — une proportion
ne se juge pas sur une image de 200 px. Pas d'écriture en base pour cet
axe tant qu'une seconde lecture ne la demande pas.

**Test** : au moins une trentaine d'images étiquetées, dont une dizaine
de « fausses » — sous ce volume, aucun seuil n'est défendable. Étiqueter
**avant** qu'un score `proportions` existe : un étiquetage fait en voyant
le score n'est plus une référence indépendante. Passer aussi les
`REJET` et les deux personnages — si les `ko` ne venaient que du dossier
REJET, l'indicateur apprendrait le tri de Pierre, pas l'anatomie ; s'ils
ne venaient que de Léna, il apprendrait sa morphologie.

### P4.5.2 — Choisir les indicateurs sur ce corpus

Calculer plusieurs candidats sur tout le corpus et garder ceux qui
séparent réellement les deux classes. Candidats de départ, tous
calculables depuis les points corps de DWPose (épaules 2/5, coudes 3/6,
poignets 4/7, hanches 8/11, cou 1) :

- **asymétrie gauche/droite** des bras et des avant-bras — le seul déjà
  mesuré, prometteur sur un cas sur deux ;
- **ratio buste / largeur d'épaules** (cou→milieu des hanches rapporté à
  l'écart d'épaules) — vise directement le torse allongé constaté ;
- **ratio avant-bras / bras**, du même côté ;
- **cohérence des deux moitiés du corps** (écart entre les mêmes ratios
  à gauche et à droite).

**Livrable** : une note de recherche, comme celle du 07/09 sur les
mains, qui dit lesquels séparent et lesquels ne séparent pas — un
résultat négatif est un livrable valide et referme une piste.

**Test** : chaque indicateur retenu est accompagné de sa plage sur les
deux classes du corpus, pas d'une affirmation.

### P4.5.3 — Mesure, base, Revue

Implémenter les indicateurs retenus, sur le patron exact de `qc_mains`
(module pur testable hors ComfyUI + branchement dans `execute_jobs`,
addition à `reel`, seuil de config, affichage à côté des autres scores).

**Livrable** : score `proportions` mesuré par génération, affiché dans
la Revue.

**Test** : les deux images du 07/09 qui ont ouvert ce chantier ressortent
sous le seuil ; un échantillon d'images gardées reste au-dessus.

## Séquence et dépendances

P4.5.1 avant tout le reste (sans corpus, rien n'est calibrable), puis
P4.5.2, puis P4.5.3. Indépendant de P4.2 (banc) et P4.4 (adoption d'un
étage) : peut s'intercaler ou attendre, au choix de Pierre.

Dépendance technique unique, à respecter : réutiliser l'extraction
DWPose de la capacité `hands` plutôt que d'en lancer une seconde. Si
les deux mesures finissent par partager le même appel, `qc_mains.mesure`
devra rendre le squelette en plus du score — un refactor local, à faire
à ce moment-là et pas par anticipation.
