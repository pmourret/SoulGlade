# Écran 4 : Revue et Galerie, bibliothèque à trois panneaux

Périmètre validé par l'utilisateur le 2026-09-23. Maquette validée : `Revue UX 04 - Revue.dc.html`, option **4a** (A1 loupe, A2 grille avec sélection). Option 4b écartée.

**Prérequis** : écrans 0, 2 et 3b livrés. Tokens graphite en place, `.seg` sans aplat d'accent.

Ce design-pass **remplace la mise en page** de `screen-5-revue-galerie.md` sans toucher à sa logique. Restent vrais :
- les deux routes `/review` et `/gallery` pour un seul composant ;
- l'atterrissage sur le premier dossier non vide ;
- le filtre de score et `scoreBand` ;
- `useReviewKeys` et **toute sa pile de gardes** ;
- la sélection multiple (`useSelection`) et Comparer (`SurveyMode`, 4 au plus) ;
- la mesure par lots tant que `restant > 0` (piège §5.6-4) ;
- le jeton `v` via `api.image()` (piège §5.6-1) ;
- le bandeau « n'est pas dans ce dossier » ;
- les compteurs d'espace (`SpaceCount`).

Fichiers concernés : `src/screens/review/` (`ReviewScreen.tsx`, `Tile.tsx`, `FullFrame.tsx`, `ScoreBars.tsx`, `ReviewActions.tsx`, `CorpusLabels.tsx`, `FlagButtons.tsx`, `EmptyState.tsx`, `Filmstrip.tsx`, `SurveyMode.tsx`, `actionStyles.ts`) et la fumigation `test_review.js`.

## Invariants rappelés

- **Galerie** : les gestes de tri sont **absents**, jamais grisés. Les raccourcis `vrxadu` y restent ignorés (garde existante).
- Les étiquettes de corpus (P F N B M H) restent **en loupe seulement**, jamais en grille.
- Les trois axes de jugement restent distincts : `flag` (goût), `anatomie`, `mains_juge`. Aucun n'est fondu dans un autre visuellement.
- Toute URL d'image passe par `api.image()`.

## S : Structure

### S1. Grille de l'écran

Pleine hauteur de `<main>`, sans défilement de page. Le modèle « article centré » (`.wrap`, `--maxw`) est abandonné.

```
[ filtres 232 px ][ centre flex ][ inspecteur 320 px ]
```

Panneaux sur `--panel`, centre sur `--bg`.

### S2. Panneau gauche : filtres (`ReviewFilters.tsx`)

1. **Espace** : segmenté SFW / NSFW sur toute la largeur. `#spaceSel`, `data-sp` et le radiogroup avec roving sont conservés. Le compteur (`SpaceCount`) est affiché en 11 px `--dim` dans chaque segment.
2. **Dossier** (Revue seulement) : liste de lignes de 30 px, `role="radiogroup"`, roving conservé.
   - Chaque ligne : libellé + compteur tabulaire 11,5 px `--dim2`.
   - Ligne active : fond `--panel3`, 600, `inset 2px 0 0 var(--acc)`.
   - Garder `#bucketSel`, `data-b` et les `id="b{KEY}"` des compteurs.
3. **Score d'identité** : liste de lignes, radiogroup.
   - Chaque ligne : carré 8 px teinté (`--ok` / `--warn` / `--bad`, « Toutes » sans carré), libellé, bornes chiffrées lues dans `qc` (`≥ 0.80`, `0.76–0.80`, `< 0.76`), compteur.
   - Garder `#scoreSel` et `data-f`.
   - Le `title` actuel est supprimé : la borne est désormais écrite en clair.
4. **Pied** (collé en bas, filet haut) :
   - `#btnMesurer` : « Mesurer le réalisme (N) » / « Mesure… N restante(s) » ;
   - `#btnUndo` : « Annuler le dernier tri » + `U` en mono, Revue seulement.
   
   Ce sont deux boutons secondaires pleine largeur.
5. **Pendant une sélection multiple**, le panneau passe à `opacity:.45` et devient inerte (`inert`), avec la ligne « Filtres figés pendant la sélection. » (même règle qu'aujourd'hui, où la barre groupée remplace les filtres).

**Galerie** : la section Dossier est absente. Espace et Score restent.

### S3. Centre

1. **Barre d'outils**, 44 px, filet bas :
   - nom de la scène 13 px 600, puis « 3 / 12 · filtre : {bande} » en `--dim2` ;
   - à droite, `#viewSel` : **Loupe · Grille · Comparer**. Le libellé « Revue » devient « Loupe », pour ne plus se confondre avec le module Revue ; `data-v="revue"` est conservé.
2. **Pendant une sélection** (grille), la barre d'outils devient la **barre groupée** : fond `--panel2`, filet `--line2`, 48 px, tous les enfants en `flex:none; white-space:nowrap`.
   - `#bulkCount` : « N sélectionnées » 650 ;
   - `#bulkBar` : « Garder » (`--pri`), « Rejeter », « Archiver » (secondaires), `data-a` conservés ;
   - lien « Annuler » + `Échap` ;
   - `#viewSel` à droite.
   
   **Pas de bouton « Comparer (N) »** : le segment Comparer du sélecteur de vue suffit.
3. **Vue Loupe** (`FullFrame.tsx`) :
   - Scène : l'image centrée sur `--bg`, hauteur disponible, `object-fit:contain`, radius 3. Flèches ‹ › sur `--scrim`, 34×56. Zoom `− 100 % +` sur `--scrim` en bas à droite. Toute la mécanique de zoom et de déplacement est conservée : pas, écouteur `wheel` non passif, seuil de 5 px, clic à 100 % qui ouvre la lightbox, double clic qui réinitialise. Garder `#stageImg`.
   - **Barre d'actions**, 52 px, sous l'image, centrée, fond `--sub` :
     - Revue, `A_REVOIR` : « Garder » (`--pri`, V), Décliner D, Rejeter X, Archiver A, Suivante →, séparateur, « Éditer », « Supprimer… » (`--danger-txt`, sans fond) ;
     - `REJET` et `ARCHIVE` : « Restaurer » (`--pri`, V) ;
     - `OK` dans la Revue : Décliner, Suivante, Archiver, Rejeter (logique actuelle de `ReviewActions`).
     
     Chaque bouton affiche sa touche en mono `--dim2` et garde son `data-a`. Enfants en `flex:none; white-space:nowrap`.
   - **Galerie** : « Télécharger » (`--pri`, `<a download>`), Éditer, Décliner, Suivante →, et « Poster sur Instagram » inerte avec « pas encore branché » en infobulle (`data-hint-text`, plus de `title`).
   - **Bandeau de vignettes** (`Filmstrip`), 84 px, fond `--panel`, vignettes de 64 px de haut. Courante : `outline:2px solid var(--acc)`, les autres à `opacity:.7`. Le `role="listbox"` et sa garde clavier sont conservés.
4. **Vue Grille** (`Tile.tsx`) :
   - `repeat(auto-fill,minmax(180px,1fr))`, `gap:12px`, `grid-auto-rows:max-content`.
   - **Vignette** : image 4:5 **sans pastille de score par-dessus**, radius 6, fond `--panel`.
     - En haut à gauche : case à cocher **carrée** de 18 px, cochée = fond `--acc` + icône `check`. Elle reste un `<input type="checkbox">` visuellement restylé (`appearance:none`), sibling du bouton vignette, avec `data-select` conservé.
     - Si `flag === 'ia'` : étiquette « FAIT IA » en haut à droite sur `--scrim`, **en plus** de l'opacité .62 (jamais la seule opacité).
     - Sous l'image, une seule ligne : nom 12 px 600 (ellipse), repère de bande (point si conforme ou excellente, losange si sous la bande), score tabulaire.
     - Image visée : `outline:2px solid var(--txt)`. Sélectionnée : `outline:2px solid var(--acc)`. Les deux se distinguent sans la couleur seule, grâce à la case cochée.
   - **Plus de rangée d'actions ni de `ScoreBars` sur la vignette.** Les 7 glyphes (♥ ⟳ ✕ ▣ ◉ ◌ 🗑) disparaissent.
   - Le tri se fait au clavier sur l'image visée (inchangé), via la barre groupée, ou via un **menu contextuel** (clic droit ou `Shift+F10` / touche Menu sur la vignette focalisée). Ce menu liste les mêmes actions que la barre de la loupe, avec leur touche. Il suit le patron `role="menu"` d'`IdentityMenu`, se ferme avec Échap, et rend le focus à la vignette.
   - Le bouton vignette garde `data-thumb` et `data-k`, ainsi que « Entrée ouvre en loupe ».
5. **Vue Comparer** (`SurveyMode`) : seulement restylée aux tokens, structure inchangée.

### S4. Inspecteur droit (`ReviewInspector.tsx`)

Sections séparées par des filets. Ordre :

1. **Identité** :
   - score 30 px 650 tabulaire ;
   - pastille de verdict (point ou losange + texte « Conforme » / « À surveiller » / « Hors bande », familles `--ok-*` / `--warn-*` / `--danger-*`) ;
   - ligne `--dim2` « similarité à la base gelée · bande conforme ≥ {qc.ok} » ;
   - **réglette de bande** : piste de 2 px découpée aux seuils `qc.watch` / `qc.ok` / `qc.high` (lus dans la config, jamais écrits en dur), repère vertical `--txt` à la valeur ;
   - puis la ligne « Mains » : valeur + verdict (même mécanisme `qcMains`).
2. **Réalisme** :
   - titre + ligne `calibration()` inchangée ;
   - trois réglettes (net, peau, fond) : la bande cible en fond `#34423a` (**à tokeniser** en `--band`, dérivé de `--ok` à faible luminance), un repère vertical à la valeur (`--ok` si dans la bande, `--warn` sinon), la valeur à droite ;
   - « non mesuré » si `nettete == null` ;
   - dessous, `FlagButtons` devient deux boutons texte « Convaincante C » / « Fait IA I » en `aria-pressed`, actif = fond `--panel3` + bordure `--txt`.
3. **Corpus** : titre « Corpus » + « défauts objectifs ». Pour chaque axe de `LABEL_AXES`, un segmenté à trois options texte (`short`) + touche mono. Actif `ko` = famille `--danger-*`, sinon `--panel3`. `data-label` et `aria-pressed` sont conservés. Plus de glyphes ↕ ⤡ ✓ ✗.
4. **Métadonnées** : grille étiquette / valeur (Scène, Format · date, Graine en mono).
5. **Prompt utilisé** : section repliable (`details`), fermée par défaut.

**En grille**, l'inspecteur montre l'image visée : aperçu 4:5, score + verdict, puis la ligne « Entrée pour l'ouvrir en loupe ». Les sections 2 à 5 n'y figurent pas.

### S5. Suppression définitive

Le bouton rouge permanent `#btnSupprDef` devient « Supprimer… », en texte `--danger-txt`, et ouvre la confirmation existante (`deleteForever` passe déjà par `useConfirm`, sinon l'ajouter). La garde de destruction des fumigations est inchangée.

### S6. États

- **Vide** (`EmptyState`) : centré, titre 17 px, texte `--dim`. **Nouveau** : si l'autre espace a des images dans ce dossier (`spaceCounts`), afficher un encart famille `--warn-*` « N images {dossier} dans l'espace {autre} » + un bouton « Ouvrir » qui bascule l'espace. Aucune donnée nouvelle, les compteurs existent déjà.
- **Filtre vide** : « Aucune image dans cette bande » + « Tout afficher » (`#btnEmptyAll`).
- **Introuvable** (`notFound`) : encart en haut du centre, famille `--warn-*`, bouton « Fermer » (`#btnAvisFermer`).
- **Moins de 1100 px** : le panneau de filtres se replie en 56 px (icônes + compteurs en pastille), et l'inspecteur devient un tiroir superposé (bouton « Inspecteur » dans la barre d'outils, `useOverlayPanel`).

## A : a11y

- Tous les radiogroups et le roving existants sont conservés.
- Pile de gardes de `useReviewKeys` intacte. Le menu contextuel ajoute sa propre garde : quand il est ouvert, les touches de tri ne partent pas.
- La case restylée garde un nom accessible (`aria-label` actuel) et un focus visible.
- Aucune information par la couleur seule : bande = forme + chiffre, verdict = texte, IA = étiquette.
- Chaque bouton de la barre d'actions a un libellé texte, la touche est `aria-hidden` (elle est redite dans `aria-keyshortcuts`).

## Dépendances

Aucune. Tout vient de `/api/gallery`, `/api/state` (`counts`, `nsfw_counts`, `undo`), `config.qc` / `qc.mains` et des bandes de calibration déjà servies.

## Découpage

```
screens/review/
  ReviewScreen.tsx      composition 3 colonnes, état, routes
  ReviewFilters.tsx     espace + dossier + score + pied (présentation)
  ReviewToolbar.tsx     barre d'outils / barre groupée
  ActionBar.tsx         barre d'actions de la loupe (remplace ReviewActions.tsx)
  TileMenu.tsx          menu contextuel de vignette
  ReviewInspector.tsx   identité, réalisme, corpus, méta, prompt
  BandRule.tsx          réglette de bande (identité, mains, réalisme)
  Tile.tsx, FullFrame.tsx, ScoreBars.tsx, CorpusLabels.tsx, FlagButtons.tsx : restylés
```

## Hors périmètre

`PhotoEditor` et `DeclineDialog` sont restylés aux tokens seulement : leur refonte est une étape à part. Aucun changement serveur.

## Critère de sortie

- `typecheck`, `build` et `test_review.js` verts. Sélecteurs préservés ou migrés dans le même commit : `#trier[data-metier]`, `#spaceSel`, `#bucketSel`, `#scoreSel`, `#viewSel`, `[data-tile]`, `[data-thumb]`, `[data-select]`, `[data-a]`, `#bulkCount`, `#bulkBar`, `#stageImg`, `#btnMesurer`, `#btnUndo`, `#btnEmptyAll`, `#btnAvisFermer`, `[data-label]`, `[data-f]`.
- Audit `audit-ux-ui` **en vrai**, avec captures à 1440 et 1024 :
  - Revue en loupe et en grille ;
  - sélection de 3 images + barre groupée ;
  - menu contextuel ;
  - Comparer ;
  - dossier vide avec images dans l'autre espace ;
  - filtre vide ;
  - image introuvable par URL ;
  - Galerie en loupe et en grille ;
  - clavier : V, X, A, D, C, I, P, B, U, Échap, Entrée, flèches, dont une touche de tri pressée **pendant** que le menu contextuel est ouvert (elle doit être ignorée).
