# Écran 13 : Éditeur de pose (poste de travail)

Périmètre validé par l'utilisateur le 2026-09-23. Maquette validée : `Revue UX 13 - Editeur de pose.dc.html`, option **13a** (A1 nominal, A2 multi-sélection et point non placé, A3 modale rapide). L'option 13b est écartée.

**Prérequis** : écran 0 livré. Les écrans 6 (Scènes, onglet Pose du composeur) et 7 (Poses) sont livrés ou en cours.

**Référence de comportement** : `DOCS/design-pass/screen-6*` (pose, §A2, §B2, §B3), déjà implémenté. Ce design-pass change la présentation, pas le comportement.

Fichiers concernés :
- `src/screens/pose-editor/` (`PoseEditorScreen.tsx`, `PoseInspector.tsx`, `ReferenceControls.tsx`, `NewPoseModal.tsx`, `PoseEditorModal.tsx`, `UndoRedoButtons.tsx`, `PoseCanvas.tsx` pour les couleurs et tailles seulement) ;
- la fumigation de l'éditeur de pose.

## Invariants rappelés

- **Une seule pose** partagée par la vue du corps et les deux gros plans de mains : une édition, pas une synchronisation.
- Écoute clavier **élevée** sur le conteneur (`handlePoseKeyDown`), avec la garde des champs de saisie. Rien ne revient dans `PoseCanvas`.
- Décalage de groupe (`onOffset`) = **une** étape d'historique, origines capturées au focus (comportement actuel).
- « Placer ce point » garde sa règle actuelle (promouvoir une estimation existante, sinon placement calculé).
- Nouvelle pose : **toujours depuis un gabarit**, par la modale. « Créer aussi un gabarit » ne s'applique qu'au premier enregistrement.
- La modale rapide n'offre **pas** l'épinglage (comportement actuel).
- `PoseCanvas` : **aucune modification de logique** (glisser, rotation Maj, sélection rectangle, zoom). Seuls les couleurs et tailles de rendu changent.

## S : Structure

### S1. Grille

```
[ barre d'écran 48 px ]
[ liste des points 240 px ][ vue du corps flex, fond #0e0e0e ][ panneau 360 px ]
```

Le modèle `.wrap` et la colonne des mains à gauche disparaissent. Zones bord à bord, chaque panneau défile seul.

### S2. Barre d'écran

De gauche à droite :
- bouton de retour secondaire « Poses » avec chevron (`PATHS.bankPoses`) ;
- filet ;
- nom de la pose en 600, identifiant de fichier en mono `--dim2` (absent pour une pose neuve) ;
- si `dirty` : point `--warn` + « modifications non enregistrées » (`role="status"`) ;
- espace flexible ;
- Annuler / Rétablir (`UndoRedoButtons` restylé en icônes) ;
- **segmenté Édition · Rendu**. Rendu appelle `refreshPreview` puis affiche l'aperçu, Édition appelle `clearPreview`. Pendant le calcul : « Rendu… » et segmenté désactivé. En mode Rendu, un bouton « Actualiser » apparaît à côté ;
- bouton `?` qui ouvre l'aide des raccourcis (S6) ;
- filet ;
- **bouton scindé** `--pri` « Enregistrer » + chevron, dont le menu contient « Enregistrer sous une nouvelle pose » (seulement si la pose a un nom).

### S3. Liste des points (gauche, `PoseInspector` → `JointOutline.tsx`)

- Titre « Points » + « N / 60 placés ».
- **En-têtes de partie** (Corps, Main gauche, Main droite) : 12 px 600 `--dim`, avec « placés / total » à droite.
- **Groupes** (`BODY_JOINT_GROUPS`, `HAND_JOINT_GROUPS`) : chevron, nom, « placés / total ». Ouverture automatique si un point du groupe est sélectionné (comportement actuel de `useExpandedGroups`).
- **Ligne de point** 26 px, plus un bouton plein :
  - pastille 7 px : `--line2` placé, blanc si sélectionné, cercle pointillé `--dim2` si non placé ;
  - nom 12,5 px, en `--dim2` si non placé ;
  - icône `pin` 12 px si épinglé (remplace l'émoji).
- Ligne sélectionnée : `--panel3` + `inset 2px 0 0 var(--acc)` + 600.
- Clic = sélectionner, Ctrl/Cmd + clic = ajouter (actuel). `role="tree"` / `treeitem` avec `aria-selected`, `aria-expanded`. Les `aria-label` actuels sont conservés (épinglé, sélectionné).

### S4. Vue du corps (centre)

- Fond `#0e0e0e`, canvas de la pose centré avec une bordure 1 px `#262626`. Étiquette « Corps complet » en haut à gauche sur `--scrim`.
- **Rendu du squelette** (`PoseCanvas`, présentation seulement) :
  - os : couleurs **atténuées** par membre (bras droit `#b98a8a`, bras gauche `#8aa3b9`, jambe droite `#a3b98a`, jambe gauche `#b9a88a`, tête `#9a8ab9`, cou `--dim`), opacité 0,85, épaisseur 3 px à 100 % ;
  - point : disque `--panel` + contour `--txt` 1,4 px ;
  - point sélectionné : disque `--txt` + anneau `--acc` 2 px ;
  - point épinglé : petit carré ou icône épingle au-dessus à droite ;
  - point non placé : cercle pointillé `--dim2`.
  - Les mêmes couleurs sont reprises dans les gros plans de mains (une teinte par doigt).
  - **Garder les couleurs OpenPose de sortie** : ces teintes ne concernent que l'affichage de l'éditeur, jamais le PNG écrit. Claude Code vérifie en mode Plan que le rendu écran et l'export sont bien séparés dans `PoseCanvas` ou `poseFrame`, et s'arrête si ce n'est pas le cas.
- **Barre flottante** en bas au centre (`--panel`, bordure `--line2`) :
  - zoom − · pourcentage · + ;
  - « Recentrer » + touche `F` (sur la sélection, sinon sur toute la pose) ;
  - **Référence** : sans photo, bouton « Photo de référence… » (`#poseRefFile` conservé). Avec photo, curseur d'opacité 90 px (`#poseRefOpacity` conservé) + pourcentage, « Changer… » et × (`aria-label` actuel).
  - Elle ne change pas de largeur de façon brusque : les éléments de la référence apparaissent sans décaler le zoom ni Recentrer.

### S5. Panneau droit (360 px)

1. **Gros plans des mains**, en grille 2 colonnes : chaque main a son titre 12 px 600 et, à droite, un lien « Copier la droite » ou « Copier la gauche » (`mirrorHand`), puis un canvas carré (`PoseCanvas focus="handLeft|handRight"`). Même rendu que S4.
2. **Sélection** (capitales + « Désélectionner » en lien si une sélection existe) :
   - **aucune** : « Aucun point sélectionné. Clique un point ou choisis-le dans la liste. » ;
   - **un point placé** : pastille, nom 14 px 600 + partie en `--dim2`, bouton « Épingler » / « Libérer » avec icône `pin` (`aria-pressed`). Champs x / y (`NumberField` restylé, 32 px, étiquette dans le champ). Ligne « Depuis {parent} · angle° · longueur px » (`angleAndLength`), puis l'aide « Maj + glisser tourne le membre en gardant cette longueur. ». Racine : « Racine, aucun os parent à mesurer. » ;
   - **un point non placé** (A2) : pastille pointillée, nom, phrase actuelle, `--pri` « Placer ce point » ;
   - **plusieurs points** (A2) : « N points » + partie commune si elle existe (« Main droite · Index »), « Épingler tout » / « Libérer tout », sous-titre « Décaler le groupe, en une seule étape », champs dx / dy (`OffsetField`), Aligner X / Aligner Y.
3. **Outils** :
   - Symétrie corps : Droite → gauche · Gauche → droite ;
   - Alignement : Aligner X · Aligner Y, **désactivés** avec le motif « L'alignement demande au moins deux points sélectionnés. » quand la sélection a moins de deux points. Il reste visible pour qu'on le trouve.
   - « Recentrer sur la sélection » quitte le panneau (il est dans la barre flottante).

### S6. Aide des raccourcis

- Popover ancré au bouton `?` (et touche `?`), `role="dialog"`, 320 px.
- Liste à deux colonnes (touche, effet), reprenant **exactement** le texte actuel de l'`InfoHint` : glisser, flèches (Maj = 10), Maj + glisser (rotation), Ctrl/Cmd + clic, Maj + glisser le fond (rectangle), Ctrl Z / Ctrl Maj Z. Ajout : `F` recentrer.
- Les `InfoHint` du nom et de la multi-sélection disparaissent. Leur texte passe dans l'aide ou dans la phrase d'aide de S5.

### S7. Modale rapide (A3, `PoseEditorModal`)

- `Dialog` actuel (`#poseEditorModal`, `#poseModalClose` conservés).
- En-tête 48 px : « Éditeur de pose » 15 px 650, nom de la pose `--dim2`, espace flexible, bouton secondaire « Ouvrir l'écran complet » (navigation vers `${PATHS.poseEditor}/{name}`, avec confirmation si `dirty`), fermeture ×.
- Corps : canvas du corps seul, rendu S4.
- Pied 52 px : Annuler / Rétablir, état non enregistré, espace, « Annuler » en lien (ferme), `--pri` « Enregistrer ».

### S8. Modale « Nouvelle pose »

- `Dialog` 460 px (`#newPoseBox`, `#newPoseName` conservés).
- Titre, phrase actuelle, champ Nom.
- **Gabarits** : grille de cartes. Chaque carte montre une vignette du squelette si la réponse de `/api/pose/presets` la fournit (à vérifier), sinon le nom seul, sans vignette inventée. Sélection : contour 2 px `--txt` + `aria-pressed`.
- Case « Créer aussi un gabarit réutilisable à partir de cette pose ».
- Pied : « Annuler » en lien, `--pri` « Créer ».

### S9. États

- **Chargement** : barre d'écran avec le nom et un squelette des trois zones.
- **Erreur de chargement** : carte centrée 440 px, bordure `--danger-line`, losange + message tel quel, bouton « Retour aux Poses ».
- **Enregistrement en cours** : bouton scindé désactivé, « Enregistrement… ».
- **Moins de 1100 px** : la liste des points se replie en un bouton « Points » dans la barre d'écran (panneau flottant), et les mains passent l'une sous l'autre.

## A : a11y

- Liste des points en arbre (`tree`) navigable aux flèches.
- Boutons d'icône avec `aria-label`, cibles ≥ 24×24 px.
- Aide des raccourcis atteignable au clavier (`?`), fermée par `Échap`.
- Motifs d'indisponibilité écrits dans le texte.

## Dépendances

Aucune côté serveur. Vignettes de gabarit seulement si déjà fournies.

## Découpage

```
screens/pose-editor/
  PoseEditorScreen.tsx      composition barre + 3 zones + états
  PoseTopBar.tsx            S2 (bouton scindé, segmenté Édition · Rendu)
  JointOutline.tsx          S3 (ex JointList de PoseInspector)
  CanvasToolbar.tsx         S4 barre flottante (remplace ReferenceControls dans l'en-tête)
  SelectionPanel.tsx        S5.2 (ex PoseInspector, sans la liste)
  PoseToolsPanel.tsx        S5.3
  ShortcutsHelp.tsx         S6
  poseCanvasTheme.ts        couleurs et tailles de rendu écran (pure)
  PoseEditorModal.tsx, NewPoseModal.tsx   restylés
```

## Critère de sortie

- `typecheck`, `build` et la fumigation de l'éditeur de pose passent au vert. Les sélecteurs `#poseEditor`, `#poseRefFile`, `#poseRefOpacity`, `#poseEditorModal`, `#poseModalClose`, `#newPoseBox`, `#newPoseName` sont préservés ou migrés dans le même commit.
- Contrôle : le PNG enregistré d'une pose est **identique octet pour octet** avant et après le changement de couleurs d'affichage, sur une pose de test.
- Audit `audit-ux-ui` **en vrai**, captures à 1440 et 1024 :
  - point sélectionné dans la liste puis sur le canvas ;
  - multi-sélection et décalage dx puis dy, puis un seul Ctrl+Z par champ ;
  - point non placé puis placé ;
  - épinglage ;
  - symétrie ;
  - alignement désactivé avec un point, actif avec deux ;
  - photo de référence ajoutée, opacité, retirée ;
  - Édition → Rendu → Édition ;
  - « Enregistrer sous » ;
  - aide `?` ;
  - modale rapide depuis le composeur puis « Ouvrir l'écran complet » ;
  - nouvelle pose depuis un gabarit avec « Créer aussi un gabarit ».
