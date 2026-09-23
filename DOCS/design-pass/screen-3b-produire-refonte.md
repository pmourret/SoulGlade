# Écran 3 : Produire, trois panneaux façon Développement de Lightroom

Périmètre validé par l'utilisateur le 2026-09-23. Maquette validée : `Revue UX 03 - Produire.dc.html`, option **3a** (A1 nominal, A2 lot en cours + onglet Réglages, A3 palier d'édition). Option 3b écartée.

**Prérequis** : écrans 0 (chrome) et 2 (fiche) livrés, tokens graphite en place.

Ce design-pass **remplace la mise en page** de `screen-3-produire.md` (04/09) sans toucher à sa logique. Tout ce qui y est décidé côté comportement reste vrai :
- `/api/plan` rejoué et temporisé ;
- `runDisabled` calculé en une seule expression ;
- `runSummary` comme seule source du « pourquoi » ;
- amendements valables pour une seule scène ;
- `?scene=` vers les Ateliers ;
- toast de fin de lot.

Fichiers concernés :
- `src/screens/produce/` : `ProduceScreen.tsx`, `IntensityBar.tsx`, `IntentRail.tsx`, `SceneCard.tsx`, `SceneDevelopPanel.tsx`, `SettingsPanel.tsx`, `PromptPreview.tsx`, `EditStep.tsx`, `QueueRail.tsx`, `useOverlayPanel.ts` ;
- `src/styles/screens.css` (`.launch`, `.seg`, `.chip-t`) ;
- `chrome/ChromeContext.tsx` (`gearOpen`) ;
- la fumigation Produire.

## Invariants rappelés

- `#btnRun.disabled` reste l'unique expression `runDisabled` (AUDIT §5.6, piège 3). Le raccourci clavier passe par la même garde, jamais par un second calcul.
- La confirmation d'un palier `requires:'confirm'` reste sur le chemin de **tous** les gestes : clic, flèches, raccourci.
- Le NSFW ne construit aucun sous-système : le palier d'édition garde `EditStep` et `useNsfwSources`, seule leur place change.
- Aucune valeur de réglage en dur : les références viennent de `config.json` (`presetRef`, `nsfwRef`).

## S : Structure

### S1. Grille de l'écran

L'écran occupe toute la hauteur de `<main>`, sans défilement de page. Chaque colonne défile pour son propre compte.

```
[ panneau gauche 248 px ][ centre flex ][ panneau droit 340 px ]
[ barre de lancement 60 px, ancrée, pleine largeur ]
```

- Panneaux : `--panel`, filets `--line`. Centre : `--bg`.
- La `IntensityBar` pleine largeur **disparaît** : elle devient la première section du panneau gauche.
- `.launch` n'est plus `position:fixed`. C'est la dernière rangée de la grille de l'écran, donc plus de calcul `left:calc(var(--nav)+var(--rail))` ni de dégradé.

### S2. Panneau gauche (`ProduceSidebar.tsx`, remplace `IntentRail.tsx` et absorbe `IntensityBar.tsx`)

Trois sections. Chaque titre est en capitales 10,5 px, 600, `letter-spacing:.7px`, `--dim`.

1. **Intensité** : liste verticale de lignes de 30 px, `role="radiogroup"`, roving tabindex conservé (`useRovingChoice`).
   - Chaque ligne : un carré de 8 px teinté (`lv0` → `--ok`, `lv1` → `--dim2`, `lv2`/`lv3` → `--warn`, palier d'édition → `--bad`), le libellé, puis le compteur 11 px `--dim2`.
   - Ligne active : fond `--panel3`, `--txt`, 600. **Plus aucun aplat de teinte.**
   - Sous la liste, la ligne `#intHint` existante, en 11,5 px `--dim2`.
2. **Intention** : lignes de 30 px, radiogroup.
   - Icône de `creative.json` en `filter:grayscale(1); opacity:.75`, libellé, compteur.
   - Active : fond `--panel3` + `box-shadow: inset 2px 0 0 var(--acc)`.
   - « À peupler » : séparateur, puis des lignes 12,5 px `--dim2` préfixées « ＋ » qui ouvrent le composeur (comportement actuel).
3. **Ton** : pastilles compactes de 26 px, radius 5, bordure `--line2`.
   - Active : fond `--pri`, texte `--on-pri`, 600. Radiogroup conservé.

**Au palier d'édition**, les sections Intention et Ton sont remplacées par :
- un encart famille `--warn-*` : « Édition, n'engendre rien » + destination `PROD/EXPORT_NSFW/` ;
- une ligne `--dim2` : « Intention et ton ne s'appliquent pas à ce palier ».

### S3. Centre

- **Barre d'outils**, 48 px, filet bas :
  - titre « Scènes » + `#sceneHint` (« 6 à ce niveau · 2 cochées ») ;
  - `#sceneSearch` (240 px, icône loupe du registre `Icon`) ;
  - tri `#sceneSortBy` ;
  - `#btnCompare` en bouton secondaire.
- **Grille** `#sceneGrid` : `repeat(auto-fill,minmax(200px,1fr))`, `gap:14px`, **`grid-auto-rows:max-content`**.
- **Carte de scène** (`SceneCard.tsx`) :
  - radius `--r`, fond `--panel`, sélection = `outline:2px solid var(--acc); outline-offset:-2px` ;
  - image 4:5 ;
  - case à cocher **carrée** de 20 px (radius 4) en haut à droite : cochée = fond `--acc` + icône `check` du registre, sinon fond `--scrim` + bordure `#ffffff66` (valeur brute déjà listée dans `DESIGN.md`) ;
  - « ce ton » et « pose imposée » : étiquettes texte sur `--scrim`, en haut à gauche, empilées. **« ⛓ » est supprimé** ; `data-hint-text` + `tabIndex` sont conservés pour la pose ;
  - bloc texte : nom 13 px 600 (ellipse) + format à droite 11 px `--dim2` ; point de score + score tabulaire + « N produites » ; mini-barre 2 px (validées/produites, logique actuelle) ;
  - bouton ✎ : visible seulement au survol / focus de la carte (`opacity` 0 → 1, jamais `display:none`), toujours au clavier.
- `NewSceneCard` : bordure pointillée `--line2`, « + » et « Créer une scène ».
- **Palier d'édition** : le centre devient la grille `#srcGrid` (`minmax(150px,1fr)`) avec la même case carrée, l'étiquette « À REVOIR » en famille `--warn-*`, et le bouton `#btnAllSources` dans la barre d'outils. La hauteur fixe de 330 px disparaît.

### S4. Panneau droit : onglets (`ProduceInspector.tsx`)

Radix Tabs, déjà en dépendance (`@radix-ui/react-tabs`). Onglets de 13 px, actif = `--txt`, 600, `inset 0 -2px 0 var(--txt)`.

- **Scène** : contenu de `SceneDevelopPanel` réorganisé.
  - Ligne « Dernière image » : vignette 36×45 + lien.
  - Nom de la scène pointée + format.
  - Aperçu 4:5.
  - Grille étiquette / valeur : score moyen, tons affins (pastille `--acc` pour le ton courant), pose.
  - Boutons « Sélectionner » / « Retirer de la sélection » et « Éditer ».
- **Réglages** : `SettingsPanel` quitte la surimpression et vit ici.
  - Sections repliables de `settings.ts`, sans rien changer à `SECTIONS`, `PRESETS` ni `fmtVal`.
  - Chaque réglage modifié par rapport à sa référence : valeur en `--warn-txt`, bordure du champ `--warn`, et « mesuré X » en 11 px `--dim2`.
  - En-tête de section : « N modifié(s) ».
  - L'onglet porte une pastille `--warn` avec le nombre total de modifications.
  - En tête du panneau : « N réglages modifiés pour ce lancement » + lien « Revenir aux valeurs mesurées », qui appelle `onReset`.
  - Curseurs : piste 3 px, remplissage `--warn` si modifié, repère vertical `--ok` à la valeur mesurée, pouce 14 px `--txt`.
- **Prompt** : `PromptPreview` quitte le dessus de la barre de lancement et vit ici.
  - Fragments, échos, amendement libre et 4 amendements.
  - Mêmes règles « une seule scène » et `disabled`.
  - Le fragment « scène » est surligné en `--panel2`, **au lieu de `#1e2630`** (reste bleuté de l'ancienne palette).
- **Palier d'édition** : onglets **Instruction · Réglages**. Instruction reprend `EditStep` : textarea, alertes `plan.alertes` en famille `--warn-*`, destination.

`gearOpen` et `toggleGear` de `ChromeContext` : l'ancien bouton ⚙ ouvre désormais l'onglet Réglages. Si plus rien d'autre ne les lit, retirer ces clés du contexte dans le même commit (grep avant).

### S5. Barre de lancement (60 px, `--panel`, filet haut)

- À gauche :
  - `#sumN` en 17 px 650 tabulaire ;
  - `#sumT` en 12,5 px `--dim`, ou en `--warn-txt` quand c'est un blocage (lot en cours, ComfyUI hors ligne, scène non enregistrée), ou en `--danger-txt` pour `plan.erreur`.
- À droite :
  - segmenté qualité `#qual` : fond `--bg`, option active = fond `--panel3` + 600. **Plus d'aplat d'accent** : c'est désormais la règle pour tout `.seg` du studio, à appliquer dans `screens.css` ;
  - `#btnRun`, bouton `--pri` de 36 px : libellé « Générer » ou « Éditer N images », plus l'indication `Ctrl ↵` en mono.
- Les boutons `#btnApercu` et `#btnGear` disparaissent de la barre : leurs contenus sont les onglets Prompt et Réglages. Garder les ids sur les déclencheurs d'onglet si la fumigation les vise.

### S6. Journal technique

`QueueRail` ne rend plus le `<details>` du journal. Il garde uniquement l'effet du toast de fin de lot. Le journal reste lisible dans Application → Journal (déjà existant). Vérifier qu'aucune fumigation ne lit `#queueRail pre`.

### S7. Largeur inférieure à 1100 px

- Le panneau gauche passe à 200 px.
- Le panneau droit se replie en tiroir superposé, ouvert par un bouton « Inspecteur » dans la barre d'outils du centre. Même composant, `useOverlayPanel` pour le focus et Échap.
- La barre de lancement reste ancrée.

## A : a11y

- Radiogroups, roving tabindex et flèches conservés pour intensité, intention, ton et qualité.
- `Ctrl+Entrée` déclenche `launch()` uniquement si `!runDisabled`. Le raccourci est désactivé quand le focus est dans un `textarea` sans modificateur, et quand `body.editing` est posé.
- Onglets : sémantique Radix (`tablist` / `tab` / `tabpanel`), flèches gauche et droite.
- Tout bouton icône a un `aria-label`. La case de carte reste `aria-pressed` sur le bouton de la carte.
- Contrastes ≥ 4,5:1 pour le texte, ≥ 3:1 pour les marques de palier, case, repère mesuré.

## Dépendances

Aucune. Tout ce qui est affiché existe déjà : `bank.stats`, `bank.previews`, `/api/plan` (`total`, `apercu`, `alertes`, `erreur`), `config.preset` / `config.nsfw`, `creative.intensity` / `intentions` / `tones`, `state`.

## Découpage

```
screens/produce/
  ProduceScreen.tsx       composition : grille 3 colonnes + barre de lancement
  ProduceSidebar.tsx      intensité + intention + ton (présentation)
  ProduceInspector.tsx    onglets Scène / Réglages / Prompt (ou Instruction / Réglages)
  SceneCard.tsx           restylé
  SettingsPanel.tsx       rendu en panneau, plus en overlay
  PromptPreview.tsx       rendu en panneau
  LaunchBar.tsx           résumé + qualité + Générer
  useLaunchShortcut.ts    Ctrl+Entrée, lit runDisabled
```

`IntentRail.tsx` et `IntensityBar.tsx` sont supprimés, leur logique passe dans `ProduceSidebar.tsx`. Fonctions pures inchangées : `runSummary.ts`, `settings.ts`.

## Hors périmètre

La comparaison (`SceneCompareView`) est seulement restylée aux tokens, sans changement de structure. Aucun changement serveur ni de workflow.

## Critère de sortie

- `typecheck`, `build`, fumigation Produire verte : sélecteurs `#intSel`, `#railIntent`, `#railTone`, `#sceneGrid`, `#btnRun`, `#qual`, `#sumN`, `#sumT`, `#apercuPanel`, `#sceneOverride`, `#srcGrid` préservés ou migrés dans le même commit.
- Audit `audit-ux-ui` **en vrai**, avec captures à 1440 et 1024 :
  - nominal ;
  - aucune scène cochée ;
  - scène non enregistrée ;
  - lot en cours ;
  - `--no-comfy` ;
  - palier à confirmer (dialogue) ;
  - palier d'édition, sans puis avec sources ;
  - onglet Réglages avec 2 valeurs modifiées ;
  - onglet Prompt avec amendement ;
  - `Ctrl+Entrée` bloqué puis autorisé.
