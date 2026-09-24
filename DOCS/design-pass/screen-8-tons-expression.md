# Écran 8 : Ateliers, Tons et éditeur d'expression (liste et éditeur côte à côte)

Périmètre validé par l'utilisateur le 2026-09-23. Maquette validée : `Revue UX 08 - Ateliers Tons.dc.html`, option **8a** (A1 nominal, A2 ton neutre sans photo). L'option 8b est écartée.

**Prérequis** : écrans 0, 6 (Ateliers Scènes) et 7 (Ateliers Poses) livrés. La barre d'atelier Scènes · Poses · Tons est en place.

**Référence de comportement** : `DOCS/design-pass/screen-expression-editor.md`, déjà validé (S, B1 à B6, A1). Ce design-pass s'y ajoute, il ne le remplace pas. S'il n'a pas encore été implémenté, il l'est dans le même chantier.

Fichiers concernés :
- `src/screens/bank/tones/` (`TonesView.tsx`, `ToneCard.tsx`, `useToneBank.ts`) ;
- `src/screens/expression-editor/` (`ExpressionEditorScreen.tsx`, `ExpressionSliders.tsx`, `useExpressionEditor.ts`, `CopyFromToneMenu.tsx`, `expressionBounds.ts`) ;
- `src/app/App.tsx` (routes) ;
- les fumigations des tons et de l'expression.

## Invariants rappelés

- Les tons **se déclarent dans `creative.json`**. Cet écran n'en crée, n'en renomme et n'en supprime aucun. Il règle seulement la plage `expression` d'un ton existant.
- `PARAM_BOUNDS` est le miroir d'un contrat fixe du nœud (`expression.py`, `BORNES`) : aucune valeur de borne ne s'écrit ailleurs.
- L'ordre QC → expression → grain reste l'ordre (invariant 5). L'aperçu ne l'altère pas.
- `/api/expression/preview` : un appel par photo, erreur **par photo**, attrapée large dans la route (`backend.md`, `run_in_executor`). Rien ne change côté serveur.
- « Copier depuis… » passe par `applyParamsAction` : **un seul** geste d'historique.

## S : Structure

### S1. Routes

- `/bank/tones` monte l'écran avec le **premier ton** sélectionné (ordre de `creative.tones`).
- `/bank/tones/edit/:tone` monte **le même écran** avec ce ton sélectionné. La route reste l'adresse partageable de la sélection.
- Changer de ton dans la liste fait un `navigate` vers `/bank/tones/edit/:tone` (**replace** si l'on vient de `/bank/tones` sans paramètre).
- **Modifications non enregistrées** au moment de changer de ton : confirmation « Abandonner les modifications de {ton} ? » via `useConfirm`, avec le choix Enregistrer, Abandonner ou Annuler.

### S2. Grille de l'écran

```
[ barre d'atelier 44 px : Scènes · Poses · Tons | « Les tons se déclarent dans creative.json · cet écran règle leur plage d'expression » ]
[ liste des tons 220 px ][ essai flex ][ paramètres 440 px ]
```

Le bandeau des modifications non enregistrées du chrome (`DirtyBar`) porte « Plage de "{ton}" modifiée · creative.json · Annuler · Enregistrer la plage · Ctrl S ». Il remplace le `<p>` « Modifications non enregistrées » actuel (A5 du design-pass de pose, même règle : `role="status"`).

### S3. Liste des tons (`ToneList.tsx`, remplace la grille de `ToneCard`)

- Titre « Tons · N » en capitales 10,5 px.
- Ligne de ton :
  - libellé 13 px ;
  - compteur à droite 11 px : « N / 12 » en `--dim`, ou « neutre » en `--dim2` ;
  - point `--warn` si le ton a des modifications non enregistrées ;
  - sous le libellé, une **mini-bande de 12 repères** de 3 px, un par paramètre dans l'ordre de `PARAM_GROUPS` : `--acc` si inclus, `--line2` sinon. Elle est décorative (`aria-hidden`), le compteur porte l'information.
- Ligne active : `--panel3` + `inset 2px 0 0 var(--acc)`, 600.
- `role="listbox"` avec `aria-selected`, flèches ↑ ↓. Garder `data-tone-card` et `data-key` sur la ligne.

### S4. Colonne d'essai (centre)

1. **Barre** :
   - « Photos d'essai » + « N / 3 · choisies dans la Galerie » ;
   - segmenté **Original · Rendu** (bascule existante) ;
   - bouton `--pri` « Rendre l'essai » + touche `R`, désactivé si aucune photo n'est choisie ou si ComfyUI est hors ligne (le motif est dans l'infobulle).
2. **Bande de choix** : vignettes de 64 px de haut issues de la Galerie (`PhotoPicker` actuel).
   - Choisies : `outline:2px solid var(--acc)`, sinon `opacity:.6`.
   - Une 4e vignette cliquée affiche un toast « 3 photos maximum, décoche-en une pour en ajouter une autre » (B4).
   - Scène, date et score passent en `data-hint-text` (A1).
3. **Cartes de rendu** : grille de 3 colonnes égales, hauteur restante, **aucun défilement** (S du design-pass d'expression).
   - Chaque carte : image (original ou rendu), puis la ligne « {scène} · identité {score après} ». Le score est coloré par sa bande `qc` (texte + couleur, jamais la couleur seule).
   - **Erreur par photo** (B1) : bordure `--danger-line`, losange + « Aucun visage détecté » (ou le message du serveur tel quel), une phrase `--dim` et un bouton « Réessayer celle-ci » qui ne relance que cette photo.
   - **Rendu périmé** (B5) : bandeau en haut de la carte, famille `--warn-*` : « Réglages modifiés depuis ce rendu ». Il n'apparaît pas en vue Original.

### S5. Colonne des paramètres (440 px)

1. **En-tête** : nom du ton 14 px 650, « N / 12 paramètres », « Copier depuis… » (`CopyFromToneMenu` existant, restylé en menu `role="menu"`), puis Annuler / Rétablir en icônes avec `aria-label` et `Ctrl Z` / `Ctrl Maj Z`.
2. **En-tête de colonnes** en capitales 10,5 px : « Paramètre · Plage · essai · min / max ».
3. **Groupes** (`PARAM_GROUPS`) : titre en capitales + « N / M inclus » (B2).
4. **Ligne de paramètre** (une seule ligne, 36 px, S du design-pass) :
   - **case** d'inclusion carrée 16 px dans un vrai `<label>` qui englobe aussi le nom : grand clic, cochée = `--acc` + `check` ;
   - **nom** 12,5 px (`PARAM_LABELS`, textes inchangés) ;
   - **réglette de plage** (`RangeRule.tsx`, nouveau composant partagé) : piste 2 px `--line2` couvrant `PARAM_BOUNDS`, trait vertical 1 px `--line2` à **zéro** (neutre), bande `--acc` à 60 % d'opacité de min à max, **repère d'essai** 3×14 px `--txt`. Le repère se tire à la souris et aux flèches (c'est le curseur d'essai actuel, présenté autrement). Paramètre non inclus : pas de bande, ligne à `opacity:.55` ;
   - **min / max** en mono 11,5 px, cliquables pour saisir une valeur exacte (champs numériques actuels, ouverts sur place) ;
   - raccourcis de ligne : **`[`** pose l'essai comme min, **`]`** comme max (boutons « mn » / « mx » actuels, conservés au clavier et retirés de l'affichage). Une légende au pied du panneau les rappelle.
5. **Pied** : la légende de la réglette (« Barre blanche : valeur d'essai. Bande colorée : plage tirée au hasard à chaque génération. Trait gris : zéro. [ et ] posent l'essai comme min ou max. »).

### S6. États

- **Ton neutre** (aucun paramètre inclus) et aucune photo choisie : état vide au centre, « "{ton}" tire toujours un visage neutre », une phrase explicative, puis « Choisir des photos d'essai » (`--pri`, fait défiler vers la bande) et « Copier depuis… ». La colonne des paramètres reste affichée, toutes cases décochées.
- **Aucun ton déclaré** : état vide pleine largeur, « Aucun ton déclaré pour ce personnage. Les tons s'ajoutent dans creative.json. »
- **Galerie vide** : la bande de choix affiche « Aucune image validée pour essayer une expression » avec un lien vers la Revue.
- **ComfyUI hors ligne** : « Rendre l'essai » est désactivé avec son motif. Les réglages restent modifiables et enregistrables.
- **Moins de 1100 px** : la liste des tons devient un sélecteur déroulant dans la barre d'atelier. Les cartes passent à 2 colonnes, et la 3e photo passe en défilement horizontal.

## A : a11y

- `RangeRule` : `role="slider"` pour le repère d'essai (`aria-valuemin`, `aria-valuemax`, `aria-valuenow`, `aria-valuetext` qui énonce aussi la plage « essai 0,62, plage 0,3 à 0,9 »). Flèches = pas du paramètre, `Maj` + flèches = pas × 10.
- La case d'inclusion est un vrai `<input type="checkbox">` restylé, dans le `<label>`.
- L'erreur par carte est annoncée (`role="alert"` sur la carte en échec, une seule fois).
- Le bandeau « rendu périmé » n'est pas une live region, il est lu au focus de la carte.

## Dépendances

Aucune. `/api/expression/preview` (un appel par photo), l'écriture de la plage (route existante de `routers/expression`) et `creative.tones[].expression` (via `useTaxonomy`) restent inchangés.

## Découpage

```
screens/expression-editor/
  ExpressionEditorScreen.tsx   composition 3 colonnes, routes /bank/tones et /bank/tones/edit/:tone
  ToneList.tsx                 liste des tons (présentation)
  TrialColumn.tsx              barre + bande de choix + cartes de rendu
  ParamPanel.tsx               en-tête + groupes + lignes
  RangeRule.tsx                réglette de plage (présentation, testable)
  useExpressionEditor.ts       passe aux structures par photo (B1) si pas déjà fait
screens/bank/tones/            TonesView.tsx redirige vers l'écran unifié ; ToneCard.tsx supprimé si inutilisé
```

## Critère de sortie

- `typecheck`, `build` et les fumigations tons et expression passent au vert. Les sélecteurs `#bankTones`, `#tonesGrid` (à migrer vers la liste), `[data-tone-card]`, `[data-key]` et les sélecteurs de l'éditeur existant sont préservés ou migrés dans le même commit.
- Audit `audit-ux-ui` **en vrai**, avec captures à 1440 et 1024, sous `python_embeded` (`cv2` requis pour la mesure) :
  - passage d'un ton à l'autre, avec et sans modifications ;
  - rendu sur 3 photos dont une sans visage (erreur locale, les deux autres rendues) ;
  - réglage modifié après rendu (bandeau périmé) ;
  - « Copier depuis… » puis un seul Ctrl+Z qui annule toute la copie ;
  - tentative d'une 4e photo (toast) ;
  - ton neutre ;
  - `--no-comfy` ;
  - enregistrement puis relecture de `creative.json` ;
  - clavier : ↑ ↓ dans la liste, flèches et `Maj` sur la réglette, `[` et `]`, `R`, `Ctrl S`, `Ctrl Z`.

## Écarts assumés à l'implémentation (2026-09-24)

1. **« Copier depuis… » garde sa boîte de dialogue**, contre §S5 qui demande un
   menu `role="menu"`. Ce menu a déjà existé : positionné sous son déclencheur,
   il a été mesuré comme recouvrant 6 à 8 des 12 lignes de paramètres une fois
   la hauteur de ligne resserrée, et il n'avait jamais la place du sous-titre
   par ton (les paramètres que ce ton inclut) sans courir sur la liste qu'il
   survole. La boîte règle les deux structurellement. Tranché avec Pierre au
   moment du plan.
2. **Le bouton d'enregistrement à icône quitte l'application entière.** §S2
   donne le geste au bandeau du chrome ; Tons était le dernier écran à porter
   encore `#btnSaveScenes`, après Scènes en 7b et Poses en 7d. Il part avec son
   infobulle.
