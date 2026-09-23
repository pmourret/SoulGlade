# Écran 9 : Entraînement (rapport de préparation, export toujours visible)

Périmètre validé par l'utilisateur le 2026-09-23. Maquette validée : `Revue UX 09 - Entrainement.dc.html`, option **9a** (A1 proposition prête, A2 pas de proposition). L'option 9b est écartée.

**Prérequis** : écran 0 (chrome) livré, avec la barre de module Ateliers · Entraînement.

Fichiers concernés :
- `src/screens/training/` (`TrainingScreen.tsx`, `ProposalPanel.tsx`, `ExcludedList.tsx`, `ExportHistory.tsx`, `useTrainingSet.ts`) ;
- la fumigation de l'entraînement.

## Invariants rappelés

- L'écran **n'entraîne pas**. Il prépare un jeu et l'exporte pour une machine kohya. Aucun bouton en forme de trou (« Entraîner », « bientôt ») : le texte dit que c'est une décision.
- Les quatre nombres **ne se fusionnent jamais** : file (empreintes), exportables (fichier sur le disque), écartées (défaut objectif), jamais étiquetées (dans la file, absence de défaut supposée). Aucun total n'additionne deux compteurs de nature différente.
- Un critère a trois verdicts, écrits en toutes lettres : **tenu**, **manque**, **sans seuil**. Un seuil absent ne devient jamais une valeur par défaut.
- Le **goût n'écarte jamais** : seul le défaut objectif sort, et il est nommé. Les atypiques sont signalées, jamais écartées seules.
- Un export **n'écrase jamais** le précédent. Un manifeste illisible est affiché comme illisible, jamais masqué.
- Répétitions vides = défaut du serveur. L'écran n'invente aucun nombre.
- Le refus 409 (« une production tourne ») et toute erreur serveur sont affichés **tels quels**, jamais réécrits.
- `useTrainingSet` garde l'état et les gestes. Les panneaux restent de la présentation pure.

## S : Structure

### S1. Grille

```
[ contenu : rapport, flex, padding 22px 32px, défilement vertical ][ panneau d'export 380 px, fixe, défilement propre ]
```

Le modèle « article centré » (`.wrap`) disparaît. Moins de 1100 px : le panneau passe à 300 px. Moins de 900 px : il passe sous le rapport, en première position après le verdict.

### S2. Verdict (en tête du rapport, `role="status"`)

- **Prêt** : fond `--ok` sombre (`#1f2a21`, bordure `#2f4a34`), point `--ok`, titre « Proposition d'entraînement prête » 15 px 650. En dessous, une ligne de synthèse 12,5 px : « N critères tenus, M sans seuil · gabarit #id, santé x.xxx · N image(s) produite(s) sous un LoRA » (ou « aucune »).
- **Pas prêt** : famille `--warn-*`, losange, titre « Pas de proposition d'entraînement », puis `proposal.blocage` tel quel.
- La synthèse se calcule côté client à partir de `criteres`, `jeu` et `compteurs.derives`. Aucune valeur nouvelle.

### S3. « Du corpus au jeu » (remplace les deux premières cartes `.meta`)

- En-tête de section : capitales 10,5 px + règle 12 px `--dim2` « la file raisonne sur des empreintes, l'entraînement a besoin du fichier ».
- **Quatre cases** en grille de 4 colonnes égales, séparées par un filet de 1 px :
  - libellé 12 px `--dim`, nombre 26 px 650 `tabular-nums`, indice 12 px `--dim2` ;
  - Dans la file (« empreintes en base »), Exportables (« N sans fichier sur le disque », ou rien si 0), Écartées (« défaut objectif nommé »), Jamais étiquetées (« comptées dans la file »).
  - **Garder `data-count`** sur chaque nombre (`file`, `exportables`, `ecartes`, `sans_etiquette`).
- **Barre de répartition** de 8 px sous les cases : exportables (`--ok`), sans fichier (`--dim2`), écartées (`--danger`), jamais étiquetées (`--warn` hachuré). Chaque segment est proportionnel à son compteur **sur la somme affichée** (c'est une répartition visuelle, pas un total annoncé). Légende en dessous : pastille + libellé + nombre, qui porte l'information (la barre est `aria-hidden`).
- Si les compteurs se recoupent (une image jamais étiquetée est aussi exportable), la barre montre les parts de la file et les jamais étiquetées en surcouche hachurée. Claude Code **vérifie la sémantique exacte** des compteurs dans `entrainement.py` avant de dessiner et le dit en mode Plan.
- Cohésion et écart-type passent dans la synthèse des critères (S4), plus en carte séparée.

### S4. Critères et diversité (deux colonnes, `minmax(0,1.1fr) minmax(0,1fr)`, gap 28 px)

**Critères** :
- Liste `<ul>`, une ligne par critère : colonne verdict 96 px (forme + mot : point = tenu, losange = manque, carré = sans seuil, couleurs `--ok` / `--danger` / `--warn`), puis `message` tel quel en 13 px.
- Pied 12 px `--dim2` : « Un seuil absent ne devient jamais une valeur par défaut : il se mesure par personnage. »

**Diversité** :
- Une ligne par axe (libellés `AXIS_LABELS`) : nom 78 px, barre de 6 px avec **distinctes** en `--line2` et **effectives** en `--acc` par-dessus, puis « effectives / distinctes » à droite (effectives en 600).
- Échelle commune à tous les axes (le plus grand `distinctes` de la réponse).
- `sans` > 0 : « N sans donnée » en 11,5 px `--dim2` sous la ligne.
- Pied : « Dix quasi-doublons font une seule observation, pas dix. »

### S5. Écartées et atypiques (repliables, en fin de rapport)

- Un bloc à deux lignes, bordure `--line2`, radius 6. Chaque ligne est un `<details>` restylé : chevron, titre 600, résumé `--dim`, règle à droite.
  - « N écartées pour défaut objectif » · « 12 mains · 4 anatomie » (résumé par raison actuel) · « le goût n'écarte jamais ».
  - « N atypiques » · « signalées, jamais écartées seules ».
- Ouverts : tableaux actuels restylés (en-têtes capitales 10,5 px, lignes de 32 px, nombres `tabular-nums`, fichiers en mono).
- Absents si la liste est vide (comportement actuel).

### S6. Panneau d'export (droite)

1. Titre « Exporter le jeu » 15 px 650.
2. Grille étiquette / valeur, 12,5 px :
   - Images : « N » (+ « ancre réinjectée » si l'export la réinjecte ; **à vérifier** dans la réponse avant affichage, sinon la mention est absente) ;
   - Légendes : « N depuis le prompt » · « quelques secondes » en `--ok`, ou « N par le légendeur, plusieurs minutes » en `--warn-txt` ;
   - Famille : seulement si la proposition l'expose, sinon la ligne est absente.
3. **Répétitions par image** : champ numérique 92 px, placeholder « défaut », `id="trainRepetitions"` conservé, avec l'aide « vide = défaut proposé. C'est un réglage d'entraînement : il te revient. »
4. **Aperçu du dossier** : bloc mono 11,5 px, `--panel` + bordure `--line2`, avec l'arborescence « TRAINING/{personnage}/{date}/ » puis `img/` (N images + légendes), `manifeste.json`, `dataset.toml · entrainer.sh`, `kohya_config.json`. Le chemin exact n'est connu qu'après l'export : avant, il reste générique. Claude Code vérifie les noms réels écrits par l'exporteur et **n'affiche que ceux-là**.
5. Bouton `--pri` pleine largeur 38 px « Exporter N images », `id="btnTrainExport"` conservé. Pendant la requête : « Export en cours… » + désactivé. Désactivé aussi si exportables = 0, avec le motif actuel en dessous (« aucune image de la file n'a de fichier sur le disque »).
6. Note 12 px `--dim2` : « Ne lance pas d'entraînement. Le dossier part tel quel sur une machine kohya : `bash entrainer.sh` après avoir vérifié les chemins en tête du script. »
7. **Exports déjà sortis** (sous un filet) : titre capitales + « aucun n'est écrasé ». Une entrée par export : date lisible (`readableStamp`) en 600, puis la synthèse « N images (+ ancre) · N rép. (défaut) · famille · script » en `--dim`, et le dossier en mono 11 px tronqué avec ellipse et `title` complet. Manifeste illisible : entrée en `--danger-txt`, « manifeste illisible » + raison. Aucun export : « Aucun export pour ce personnage. »

Après un export réussi : toast actuel, rechargement, et la nouvelle entrée en tête de l'historique avec un fond `--panel3` pendant 2 s (sans animation de mouvement).

### S7. États

- **Chargement** : squelette à la forme exacte de S2 à S6, `aria-hidden`.
- **Erreur** (`error`) : carte centrée 440 px, bordure `--danger-line`, losange + « Jeu d'entraînement indisponible », message tel quel, bouton « Réessayer » (appelle `reload`) et « Voir le journal ».
- **Aucune donnée** (`proposal` nul) : état vide « Ce personnage n'a pas encore de jeu de référence » + lien vers la Revue.
- **Pas de proposition** (A2) : verdict `--warn`, critères manqués en premier, **export toujours possible** si exportables > 0 (c'est au joueur de juger), avec la phrase « L'export reste possible même sans proposition : c'est à toi de juger. »

## A : a11y

- Un `<h1>` « Jeu d'entraînement », un `<h2>` par section (Du corpus au jeu, Critères, Diversité, Exporter le jeu, Exports déjà sortis).
- Compteurs en `<dl>`. Barre de répartition et barres de diversité `aria-hidden`, la valeur étant écrite à côté.
- Verdicts : le mot porte le statut, la forme et la couleur le répètent. Contraste ≥ 4,5:1.
- `<details>` natifs restylés, `summary` focalisable.

## Dépendances

Aucune. `/api/training/proposal`, `/api/training/exports` et `/api/training/export` restent inchangés.

## Découpage

```
screens/training/
  TrainingScreen.tsx     composition 2 colonnes + états
  VerdictBanner.tsx      S2 (présentation)
  CorpusFunnel.tsx       S3 (présentation, data-count)
  CriteriaList.tsx       S4 gauche
  DiversityBars.tsx      S4 droite
  ExcludedList.tsx       S5, restylé
  ExportPanel.tsx        S6 1 à 6
  ExportHistory.tsx      S6 7, restylé en liste
  trainingSummary.ts     fonctions pures : synthèse du verdict, parts de la barre
  useTrainingSet.ts      inchangé, sauf reload déjà exposé
```

`ProposalPanel.tsx` disparaît, remplacé par les composants ci-dessus. `trainingSummary.ts` est testable sans React.

## Critère de sortie

- `typecheck`, `build` et la fumigation de l'entraînement passent au vert. `data-count`, `#trainRepetitions`, `#btnTrainExport` et `#training` sont préservés.
- Audit `audit-ux-ui` **en vrai**, captures à 1440 et 1024 :
  - proposition prête ;
  - pas de proposition avec critère manqué ;
  - exportables = 0 (bouton désactivé avec motif) ;
  - légendes par le légendeur (mention en `--warn-txt`) ;
  - export réussi (nouvelle entrée en tête) ;
  - refus 409 pendant une production (toast verbatim) ;
  - manifeste illisible dans l'historique ;
  - erreur serveur ;
  - aucun export.
