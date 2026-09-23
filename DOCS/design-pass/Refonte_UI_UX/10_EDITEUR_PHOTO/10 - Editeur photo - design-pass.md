# Écran 10 : Éditeur photo (développement, panneau droit hiérarchisé)

Périmètre validé par l'utilisateur le 2026-09-23. Maquette validée : `Revue UX 10 - Editeur photo.dc.html`, option **10a** (A1 éditeur avancé, A2 modale simplifiée, A3 masque en cours de placement). L'option 10b est écartée.

**Prérequis** : écran 0 (chrome) et écrans 4 et 5 (Revue, Galerie) livrés. La modale s'ouvre depuis leurs actions « Éditer ».

**Référence de comportement** : `DOCS/design-pass/screen-photo-editor.md` (§7a modale, §7b éditeur avancé), déjà implémenté. Ce design-pass change la présentation, pas le comportement.

Fichiers concernés :
- `src/screens/review/PhotoEditor.tsx`, `photoEditorStyles.ts` (modale simplifiée) ;
- `src/screens/photo-editor-advanced/` : `PhotoEditorAdvancedScreen.tsx`, `LayerList.tsx`, `AddLayerMenu.tsx`, `PresetsPanel.tsx`, `HistoryPanel.tsx`, `LayerSettingsPanel.tsx`, `AdvancedColorPanel.tsx`, `SharpenBlurPanel.tsx`, `PerspectivePanel.tsx`, `AiRetouchPanel.tsx`, `MaskPicker.tsx`, `Histogram.tsx` ;
- `src/chrome/ZoomControls.tsx` (restylage seulement) ;
- les fumigations des deux éditeurs.

## Invariants rappelés

- La photo de base est **verrouillée** : jamais masquée, déplacée ni supprimée. Elle est toujours en bas de la pile.
- **Avant/après** neutralise seulement la colorimétrie des calques (`NEUTRAL_SETTINGS`). Visibilité, opacité et ordre ne changent pas.
- **Historique** : les glissés de curseur sont regroupés, seules les actions structurantes ont une ligne. Un préréglage = une seule étape.
- Le **masque** se place sur l'aperçu. Le mode d'édition du masque se ferme au changement de calque (garde-fou actuel conservé).
- **Enregistrer une copie** est l'action principale. **Écraser la source…** passe par la confirmation actuelle, texte inchangé.
- **Retouche IA** et les masques **Sujet, Ciel, Arrière-plan** restent inertes : aucun appel réseau, aucun faux résultat, et le motif est écrit.
- Le calcul de pixels (`photoEditorLayersPixels.ts`, `*Math.ts`) n'est **pas modifié**.

## S : Structure

### S1. Éditeur avancé : grille

```
[ barre d'écran 48 px, pleine largeur, collée au chrome ]
[ préréglages / historique 220 px ][ aperçu flex, fond #0e0e0e ][ panneau 360 px ]
```

Le modèle `.wrap` et les cartes arrondies disparaissent : trois zones bord à bord séparées par un filet `--line2`. Hauteur = viewport moins le chrome, sans défilement de page. Chaque panneau défile seul.

### S2. Barre d'écran

De gauche à droite :
- bouton de retour secondaire avec chevron, qui porte le nom de l'écran d'origine (« Galerie » ou « Revue », via `screenForImage`) ;
- filet vertical ;
- nom du fichier en 600 ;
- si `dirty` : point `--warn` + « modifications non enregistrées » en `--warn-txt` ;
- espace flexible ;
- Annuler / Rétablir en icônes (`UndoRedoButtons` restylé, `aria-label`) ;
- **segmenté d'aperçu** : Réglages · Rideau · Avant (voir S4), avec le raccourci `\` affiché à côté ;
- filet vertical ;
- `--pri` « Enregistrer une copie » ;
- secondaire « Écraser la source… » en `--danger-txt`, bordure `--line2` (plus jamais un bouton rouge plein).

L'état actif du segmenté est `--panel3` + 600, **pas** `--acc` plein. L'accent reste réservé au calque sélectionné et à l'outil actif.

### S3. Colonne gauche (220 px)

- Onglets soulignés « Préréglages · Historique » (`role="tablist"`, soulignement 2 px `--txt`).
- **Préréglages** : grille de 2 colonnes de vignettes 4:5, chacune rendue avec le préréglage appliqué au calque sélectionné (voir Dépendances), puis le libellé 12 px. Le dernier appliqué est entouré d'un contour 2 px `--txt`. Au survol (et au focus), l'aperçu central montre le préréglage **sans l'appliquer**. Le clic l'applique en une étape. Note 11,5 px `--dim2` : « S'applique au calque sélectionné, en une seule étape d'historique. »
- **Historique** : liste actuelle restylée, lignes de 30 px, ligne courante en `--panel3` + 600 + `aria-current`, lignes postérieures au curseur en `--dim2`.

### S4. Aperçu central

- Fond `#0e0e0e`, canvas centré, radius 2 px, sans bordure.
- **Trois modes d'aperçu** :
  - **Réglages** : rendu composé normal ;
  - **Avant** : `beforeAfter = true` (comportement actuel) ;
  - **Rideau** : la partie gauche est rendue en neutre et la partie droite en réglages, séparées par une ligne verticale de 2 px `--txt` avec une poignée ronde de 28 px (⇆). La poignée se tire à la souris et aux flèches (`role="slider"`, 0 à 100 %, défaut 50 %). Étiquettes « AVANT » / « APRÈS » en haut, sur `--scrim`.
  - `\` passe de Réglages à Avant et inversement (le Rideau se choisit au clic).
  - Le rideau se dessine sur **le même canvas** : on compose deux fois et on découpe (`clip`). Aucune modification des fonctions de calcul.
- En bas à gauche : dimensions natives « L × H » sur `--scrim`.
- En bas à droite : `ZoomControls` restylé (− · Ajuster · pourcentage · +) sur `--scrim`.
- **Masque en cours** (A3) : curseur en croix, teinte rouge actuelle conservée, poignées de placement (cercles de 10 px, contour 2 px `--txt`) pour le dégradé et le radial. En haut au centre, une **barre flottante** remplace le texte actuel du bas : pastille rouge, « Masque du {flou | de la retouche IA} · {mode} », « glisse sur l'image », bouton blanc « Terminer » et raccourci `Échap`. `Échap` quitte le mode masque.

### S5. Panneau droit (360 px) : ordre fixe

1. **Histogramme** : 64 px de haut, sans titre (il se reconnaît), barres `#5a5a5a`, `aria-hidden`.
2. **Calques** (toujours ouvert, jamais replié) :
   - en-tête : capitales « Calques », bouton secondaire compact « + Ajouter » (`AddLayerMenu`, modale conservée) ;
   - ligne de 36 px : icône œil (`eye` / `eyeOff`, `aria-label` actuel), **vignette** 24×28 du calque, nom 12,5 px avec le type en 11 px `--dim2` dessous (« Réglage », « Retouche · vide », « Base verrouillée »), opacité en chiffres, puis **poignée de glisser** (`grip`) ou **cadenas** pour la base ;
   - ligne sélectionnée : `--panel3` + `inset 2px 0 0 var(--acc)` + 600 ;
   - **réordonner** : glisser-déposer sur la poignée **et** `Alt` + ↑ ↓ sur la ligne focalisée. Les boutons ↑ ↓ disparaissent de l'affichage. Même garde qu'aujourd'hui (rien ne passe sous la base) ;
   - **supprimer** : `Suppr` sur la ligne focalisée, et une entrée « Supprimer le calque » dans un menu contextuel (clic droit). Le ✕ permanent disparaît ;
   - **opacité** : un seul curseur sous la liste, pour le calque sélectionné (absent pour la base).
3. **Réglages du calque sélectionné**, en sections repliables (`<details>` restylés, 40 px, filet haut) :
   - **Base** (ouverte par défaut) : les 4 curseurs de `LAYER_SLIDERS` ;
   - **Colorimétrie avancée** : courbes, niveaux, HSL (`AdvancedColorPanel`, `CurvesEditor`) ;
   - **Netteté et flou sélectif** (`SharpenBlurPanel` + `MaskPicker`) ;
   - **Recadrage avancé** (`PerspectivePanel`) ;
   - **Retouche IA** : étiquette en pointillés « pas encore branchée » dans l'en-tête. Ouverte, elle montre le panneau actuel et le motif en toutes lettres sous le bouton désactivé (`RAISON_INERTE`), en plus de `data-hint-text`.
   - En-tête de chaque section : chevron, titre 13 px 600, **résumé** 11,5 px `--dim2` (« neutre » ou « N modifiés »), et à droite « Réinitialiser » (lien souligné, présent seulement si au moins un réglage de la section est modifié). « Réinitialiser » remet la section au neutre en **une** étape d'historique.
   - Les sections gardent leur état ouvert ou fermé en changeant de calque (état local, non persisté).
   - Le titre actuel « Colorimétrie — {calque} » disparaît : le calque sélectionné est déjà signalé dans la liste.

### S6. Curseur de réglage (`AdjustSlider.tsx`, nouveau, partagé par la modale et l'éditeur)

- Grille `96px 1fr 38px`, hauteur 32 px.
- Libellé 12,5 px : `--dim` au neutre, `--txt` si la valeur est modifiée.
- Piste 2 px `--line2`, **repère de neutre** vertical 1 px × 8 px `#4a4a4a`, **remplissage** `--txt` du neutre à la valeur, pouce rond de 10 px `--txt`.
- Valeur à droite 12,5 px 600 `tabular-nums`, signée (« +12 »), en `--dim2` au neutre.
- **Double-clic** sur la piste ou le libellé : retour au neutre (une étape d'historique).
- **Clic sur la valeur** : saisie numérique sur place, `Entrée` valide, `Échap` annule.
- Accessibilité : c'est un `<input type="range">` natif restylé (garder `id` : `peExpo`, `peContrast`, `peSat`, `peTemp`), `aria-valuetext` signé.
- Curseurs sans neutre central (niveaux, rayon de pinceau) : pas de repère de neutre, remplissage depuis la gauche.

### S7. Modale simplifiée (A2)

- `Dialog` actuel, marges 40 / 32 px, radius 8, bordure `--line2`, ombre forte.
- En-tête 48 px : « Éditer » 15 px 650, nom du fichier `--dim2`, espace flexible, bouton secondaire « Éditeur avancé » (plus de flèche en texte), fermeture ×.
- Gauche : aperçu sur `#0e0e0e`. Le cadre de recadrage est un contour 1 px `--txt` avec l'extérieur assombri et une grille des tiers.
- Droite, 300 px :
  - **Recadrage** : segmenté des formats (`#edRatio` conservé, `role="radiogroup"`), puis Pivoter · Miroir · Redresser en boutons secondaires égaux ;
  - **Réglages** : les 4 `AdjustSlider` ;
  - pied : « Annuler » en lien, `--pri` « Enregistrer une copie ».
- « Éditeur avancé » garde son comportement actuel (vraie navigation, `bucket` et `space` en paramètres). Si la modale a des modifications, confirmation avant de partir (à vérifier dans `PhotoEditor.tsx` : si ce n'est pas déjà le cas, l'ajouter via `useConfirm`).

### S8. États

- **Chargement** : barre d'écran avec le nom et un squelette des trois zones, `aria-hidden`.
- **Erreur de chargement** (`loadError`) : carte centrée 440 px, bordure `--danger-line`, losange + message tel quel, bouton de retour.
- **Image illisible** (`imageError`) : dans l'aperçu, losange + « Échec du chargement de l'image », panneaux désactivés.
- **Enregistrement en cours** (`saving`) : les deux boutons d'enregistrement sont désactivés, « Enregistrer une copie » affiche « Enregistrement… ».
- **Moins de 1100 px** : la colonne gauche se replie en un bouton « Préréglages » dans la barre d'écran (panneau flottant), le panneau droit passe à 320 px.

## A : a11y

- Icônes de calque : `aria-label` actuels conservés (« Masquer le calque », etc.), cibles ≥ 24×24 px.
- Liste des calques : `role="listbox"`, `aria-selected`. Le glisser-déposer a son équivalent clavier (`Alt` + ↑ ↓) annoncé dans `aria-describedby`.
- Rideau : `role="slider"`, `aria-label="Position du rideau avant après"`.
- Barre de masque : `role="status"` à l'entrée dans le mode.
- Motifs d'inertie écrits dans le panneau, pas seulement en infobulle.

## Dépendances

Aucune côté serveur.
- **Vignettes de préréglage** : rendues côté client sur un canvas réduit (environ 96 px de large), avec les fonctions de composition existantes, et recalculées seulement quand le calque sélectionné change. Si le coût mesuré dépasse environ 50 ms, repli sur une pastille de couleur représentative, sans rendu.
- **Vignette de calque** : même mécanisme, pour les calques image et retouche. Pour un calque de réglage, pastille de sa teinte dominante.

## Découpage

```
screens/photo-editor-advanced/
  PhotoEditorAdvancedScreen.tsx  composition 3 zones + états
  EditorTopBar.tsx               S2
  PreviewStage.tsx               S4 (canvas, rideau, barre de masque, zoom)
  LayerList.tsx                  S5.2, restylé (glisser, clavier, menu contextuel)
  AdjustSection.tsx              en-tête repliable + résumé + Réinitialiser
  PresetsPanel.tsx               vignettes
  (les autres panneaux restylés, sans changement de logique)
chrome/
  AdjustSlider.tsx               S6, partagé avec review/PhotoEditor.tsx
```

## Critère de sortie

- `typecheck`, `build` et les fumigations des deux éditeurs passent au vert. Les sélecteurs `#photoEditorAdvanced`, `#peCanvas`, `#peExpo`/`#peContrast`/`#peSat`/`#peTemp`, `[data-layer-list]`, `[data-layer]`, `[data-layer-kind]`, `[data-history]`, `[data-presets]`, `#addLayerBox`, `#edRatio` sont préservés ou migrés dans le même commit.
- Audit `audit-ux-ui` **en vrai**, captures à 1440 et 1024 :
  - modale avec recadrage 4:5 puis passage à l'éditeur avancé ;
  - ajout de 2 calques, réordonnancement à la souris et au clavier ;
  - préréglage appliqué puis Ctrl+Z (une seule étape) ;
  - rideau déplacé au clavier ;
  - masque dégradé placé puis `Échap` ;
  - section réinitialisée (une étape) ;
  - double-clic sur un curseur ;
  - Retouche IA ouverte (motif lisible) ;
  - « Écraser la source… » annulé puis confirmé, sur une image de test ;
  - erreur de chargement.
