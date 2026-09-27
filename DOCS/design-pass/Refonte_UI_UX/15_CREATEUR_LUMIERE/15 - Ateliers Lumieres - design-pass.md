# Écran 15 : Ateliers, Lumières (la fiche au centre, l'essai en inspecteur)

Périmètre validé par l'utilisateur le 2026-09-27. Maquette validée : `Revue UX 15 - Ateliers Lumieres.dc.html`, option **15a** (A1 nominal, A2 état vide, A3 1024, A4 écrit à la main + Améliorer, A5 couleur d'effet libre). L'option 15b est écartée.

Route : `/bank/lights` (`?character=lena`, `?character=abyssiaelle`). Ni Léna ni Abyssiaelle n'ont de lumière : en créer pour la revue, dont une du monde et une ajustée.

Fichiers concernés :
- `src/screens/bank/lights/` (`LightsView.tsx`, `LightInspector.tsx`, `LightSetupFields.tsx`, `LightEffectsField.tsx`, `lightCompose.ts`) ;
- `src/screens/render-trial/RenderTrialPanel.tsx` (variante en colonne, la barre des Tons ne change pas) ;
- `src/chrome/theme/HueWheel.tsx` et `oklch.ts` (réutilisés, non modifiés) ;
- les fumigations des lumières (`AUTOMATION/tests/*light*`), `test_charte`, `test_cadres_ua`.

## Constats à mesurer d'abord

Lus dans le code, à confirmer en capture Playwright à 1440 et 1024 avant tout correctif, un constat par problème, chacun avec sa mesure :

1. **Deux zones, pas trois** : grille `minmax(0,1fr) 340px`, la liste occupe le centre. Mesurer la longueur de ligne de `.line-clamp-2` quand rien n'est ouvert.
2. **L'essai déplace la liste** : `RenderTrialPanel` s'insère au-dessus de la liste dès qu'une fiche s'ouvre. Mesurer le décalage vertical de la ligne cliquée entre avant et après le clic, puis après un essai (images de 200 px).
3. **La fiche en 340 px** : hauteur totale défilée de `#lightInspector` avec 11 schémas, le schéma de direction 180 × 176, quatre groupes, 9 effets et plus. Largeur laissée au texte voisin du schéma.
4. **Le pied collant grossit** : hauteur de `#lightFooter` en mode main, proposition « Améliorer » dépliée, à 900 px de haut. Part de la colonne qu'il prend.
5. **État vide** : deux boutons de création (`#btnLightNew` primaire et « Créer une lumière » dans `#lightsEmpty`).
6. **Pas de titre** : rien ne nomme en tête la lumière ouverte.

## Invariants rappelés

- La phrase se compose avec la **même grammaire que le serveur** (`lightCompose.ts` = `lights.compose`). Rien ne change dans cette grammaire ; `test_lights.js` reste la preuve.
- **Aucune écriture optimiste** (`useLights`) : ce qu'une scène reçoit, c'est le serveur qui le dit.
- Quitter une fiche modifiée demande confirmation (`choose`, audit du 26/09) : conservé tel quel.
- Le vocabulaire vient de `/api/lighting`, jamais d'une copie.
- `color` d'un effet reste **du texte anglais** (clé de palette ou mots libres). Aucun changement de schéma.

## S : Structure

### S1. Grille de l'écran

```
[ barre d'atelier 48 : Scènes · Poses · Tons · Assets · Tenues · Lumières | résumé | Nouvelle lumière ]
[ liste 260 ][ fiche, flex ][ essai 340 ]
```

- Les trois colonnes défilent chacune pour leur compte (charte).
- « Nouvelle lumière » passe en **bouton secondaire** : le seul primaire de l'écran est Enregistrer (ou Créer la lumière) dans la barre de la fiche.
- Rien d'ouvert et au moins une lumière : la **première** est ouverte (même règle que les Tons). La colonne centrale n'est jamais vide.

### S2. Liste (gauche, 260)

- Titre « Lumières · N » en `.lab`.
- Ligne : libellé 13 px 500, pastille de couche (« monde », « ajustée ») en 11 px, puis la phrase en `font-code` 12 px `--dim`, deux lignes (`line-clamp-2`).
- Erreur : la ligne de phrase est remplacée par l'icône `warn` + `light.erreur` en `--warn-txt` (existant).
- Ligne ouverte : `--panel3`, `inset 2px 0 0 var(--acc)`, libellé 600. Modifiée non enregistrée : mention texte « modifiée » en `--warn-txt` (pas un point seul).
- **La liste ne bouge plus** à l'ouverture d'une fiche : l'essai n'est plus au-dessus d'elle.
- Garder `data-light` et `aria-pressed` sur le bouton de ligne.

### S3. Fiche (centre)

1. **Barre de fiche, 48 px** : libellé 15 px 650 ; pastille de couche (`data-light-layer`) ; « modifiée, non enregistrée » en `--warn-txt` si `dirty` ; à droite `#btnLightDelete` (secondaire, « Retirer » ou « Rendre au monde ») puis `#btnLightSave` (primaire, « Enregistrer » ou « Créer la lumière »). L'indice de couche (`layer.hint`) passe en `data-hint-text` sur la pastille.
2. **Phrase, bandeau fixe** sous la barre, fond `--panel2`, filet bas `--line` :
   - `.lab` « Ce que la scène reçoit » + `.tiny` « après le décor ; en variante, à la place de la lumière de la scène » + à droite `#btnLightHand` / `#btnLightSheet` ;
   - phrase `#lightPhrase` en `font-code` 13 px, `aria-live="polite"` (existant) ;
   - en mode main : `#lightText` (80 px min), `EnhanceControl` dessous, `#lightTextHint`, puis `problem` et `light.erreur` en `role="status"`. Mention « écrite à la main : la fiche ne l'écrase plus » en `--warn-txt` à côté du `.lab`.
   - Le bandeau ne défile pas : régler la fiche et voir la phrase bouger est la raison d'être de l'écran.
3. **Corps, défile** : grille `252px minmax(0,1fr)`, `gap 16px 28px` :
   - colonne gauche : Libellé (`#lightLabel`), puis Direction ;
   - **schéma de direction à 252 × 246** (×1,4 de l'actuel, `R = 87`, points de 28 px, anneau « Dessus » de 46 px). La légende passe **sous** le schéma : libellé 600, puis terme et « l'appareil est en bas » en `--dim2` ;
   - colonne droite : « Partir d'un schéma » (`#lightSchemes`), puis les quatre réglages en lignes `96px 1fr` séparées d'un filet `--line` : `.lab` à gauche, pastilles puis **terme du métier sur la même ligne**, en `.tiny` ;
   - sous les deux colonnes, pleine largeur : « Effets · N choisis » + « Créer un effet… » à droite, puis la grille des effets en **3 colonnes**. Un effet coché qui prend une couleur occupe toute la ligne (`grid-column: 1 / -1`) pour porter sa rangée de couleurs ;
   - en dernier, la case « Corriger dans le monde » / « Créer dans le monde {monde} » quand elle s'applique (existant).
4. **Pastille choisie** (`chip-t.on`) : aplat `--txt`, texte `--bg`, 600, coche `check` 11 px. L'état se lit par la forme et la coche, pas par la teinte seule. Point de direction choisi : aplat `--acc` **et** anneau extérieur de 1 px `--acc` à 3 px d'écart.

### S4. Essai de rendu (droite, 340)

- `RenderTrialPanel` reçoit une prop `layout: 'bar' | 'column'` (défaut `'bar'`, les Tons ne changent pas). En `column` :
  - tête 48 px « Essai de rendu » + `.tiny` « hors production » ;
  - scène (`#lightTrialScene`) et graine (`#lightTrialSeed`) sur une ligne `1fr 96px` ;
  - `#btnLightTrial` « Essayer la fiche » + motif de blocage ou indice en `.tiny` ;
  - « dernier essai · « scène » · graine N » (la graine reste un bouton qui la reprend) ;
  - les deux images **empilées**, 196 px de haut, légende et mesures sur une ligne.
- **Essai périmé** : si `myTrial.sentence !== draft.sentence`, bandeau famille `--warn-*` au-dessus des images : « La fiche a changé depuis cet essai » + une phrase. Dit en texte, pas en couleur seule.

### S5. États

- **Aucune lumière** (A2) : pas d'encadré. La fiche neuve (`selected = NEW`) est ouverte d'office. La liste porte `#lightsEmpty` : « Lumières · 0 » et le texte actuel reformulé (« Celle que tu règles à droite sera la première… »). « Nouvelle lumière » n'est **pas** rendu tant que la liste est vide : « Créer la lumière » est le seul appel. Pas de déplacement du focus au montage ; il va à `#lightLabel` quand la fiche neuve s'ouvre par un geste.
- **Fiche vide** : phrase en `--dim2` « Choisir un schéma ou un réglage : la phrase anglaise se compose ici. », « Créer la lumière » désactivé, essai bloqué avec le motif « la fiche est vide » (existant).
- **Vocabulaire en chargement** : `role="status"` actuel, à la place du corps de fiche.
- **ComfyUI hors ligne, lot en cours** : motifs existants de `reason`.
- **Moins de 1100 px** (A3, `narrow`) : la liste passe à **240**, la fiche garde le centre, l'**essai tombe en tiroir** de 340 à droite (`useOverlayPanel`, Échap différée comme aujourd'hui, `role="dialog"`, « × » `aria-label="Fermer l'essai"`). Le tiroir s'ouvre par un bouton « Essai » dans la barre de fiche, qui porte « périmé » en texte quand l'essai l'est. Le corps de fiche passe à `180px 1fr` (schéma à sa taille actuelle). C'est le geste courant, régler la fiche, qui tranche : la liste sert à changer de lumière, l'essai à vérifier.

### S6. Couleur d'effet libre (A5)

Demande explicite de l'utilisateur : **laisser plus de liberté que les 6 teintes**.

- La rangée de couleurs d'un effet garde les 6 teintes de `vocabulary.palette` (le geste rapide), puis une **7e case « Autre… »** qui remplace le champ libre `…-free` actuel.
- « Autre… » ouvre un **sélecteur** (`EffectColorPicker.tsx`, nouveau, présentation seule), popover de 300 px ancré sous la case, `rounded-card`, `--elev` :
  - `.lab` « Couleur du {effet} » + fermer ;
  - **`HueWheel`** existant (120 px), avec l'aperçu de la couleur au centre ;
  - deux curseurs **Clarté** et **Intensité** (style `.rg` du panneau Apparence), chacun avec son mot à droite (« sombre », « vive »…) ;
  - champ « Ce que le prompt reçoit » en `font-code`, prérempli d'un **nom anglais** composé d'après la couleur, **modifiable** ; `.tiny` « Nom proposé d'après la teinte, en anglais. Modifiable : le modèle lit des mots, pas une valeur. » ;
  - « Utiliser » (primaire) et « Annuler ». Échap = Annuler, focus rendu à la case « Autre… ».
- **Ce qui est enregistré** : les mots du champ, dans `color`, comme aujourd'hui. **Jamais** une valeur hexadécimale ou OKLCH dans le prompt.
- **Nommage** (`colorName.ts`, pur, testable) :
  - un nom de teinte lu dans une table par plage de teinte OKLCH : rose, red, coral, orange, amber, gold, yellow, lime, green, emerald, teal, cyan, sky blue, blue, indigo, violet, purple, magenta, pink ;
  - **au plus un** qualificatif, dans cet ordre de priorité : intensité basse → `muted`, clarté basse → `deep`, clarté haute → `pale`, intensité haute → `vivid` ;
  - calibrage : les 6 teintes de la palette plateforme, passées par la roue, doivent retomber sur leur nom de teinte (magenta, cyan, blue, red, amber, green). Un test le vérifie.
- **Dès que l'utilisateur écrit dans le champ**, le nom ne suit plus la roue (même règle que la phrase écrite à la main).
- **Pastille après rechargement** : seuls les mots sont stockés. La case « Autre… » retrouve une pastille approchée par la table inverse (centre de plage + qualificatif) ; un nom inconnu de la table garde une case neutre en pointillés. Dans tous les cas, sous la rangée : libellé français approché + mot anglais en `font-code` (« Violet profond · deep violet »).
- Le texte d'une couleur libre existante (champ actuel) s'ouvre dans ce sélecteur, champ prérempli, roue positionnée si la table reconnaît le nom.

## A : a11y

- La fiche garde ses `role="radiogroup"` / `role="radio"` et `useRovingChoice` (réglages et direction).
- Sélecteur de couleur : `role="dialog"` + `aria-label`, focus posé sur la roue à l'ouverture, piégé dans le popover, rendu à « Autre… » à la fermeture. `HueWheel` est déjà `role="slider"`. Les deux curseurs sont des `input type="range"` avec `aria-valuetext` en mots (« sombre », « vive »).
- « Autre… » : `aria-pressed` quand la couleur de l'effet n'est pas une clé de palette.
- `EnhanceControl` : le focus va à la proposition puis revient au bouton (acquis du 27/09, à ne pas perdre avec le déplacement vers le bandeau).
- Contrastes : texte 4,5:1, interface 3:1, vérifiés aussi avec un autre thème de personnage (Abyssiaelle). La pastille choisie `--bg` sur `--txt` se mesure.
- Rayons : fiche, essai, popover, schéma en `rounded-card` ; pastilles, champs, cases de couleur en `rounded-[Npx]`.
- Texte : échelle de la charte, **aucun 13,5 px** sur cet écran.

## Dépendances

Aucune côté serveur. `/api/lights`, `/api/light-effects`, `/api/lighting`, `/api/lights/essai` inchangées. `color` reste du texte libre.

## Découpage

```
screens/bank/lights/
  LightsView.tsx          grille 3 colonnes, état vide = fiche neuve, tiroir d'essai sous 1100
  LightList.tsx           liste (présentation), extraite de LightsView
  LightInspector.tsx      devient LightSheet : barre 48, bandeau de phrase, corps en grille
  LightSetupFields.tsx    schéma de direction paramétré par taille (252 / 180), réglages en lignes
  LightEffectsField.tsx   grille 3 colonnes, case « Autre… »
  EffectColorPicker.tsx   nouveau : roue + clarté + intensité + nom anglais
  colorName.ts            nouveau : nom anglais d'une couleur OKLCH, et table inverse
screens/render-trial/
  RenderTrialPanel.tsx    prop layout: 'bar' | 'column'
```

## Critère de sortie

- `typecheck`, `build`, `run_browser_tests.py --only` sur les tests des lumières, `test_charte`, `test_cadres_ua` : au vert. Crochets préservés : `#bankLights`, `#nLights`, `#btnLightNew`, `#lightsEmpty`, `#lightPanel`, `#lightInspector`, `#lightLabel`, `#lightSchemes`, `#lightSetup`, `#lightEffects`, `#lightPhrase`, `#lightText`, `#btnLightHand`, `#btnLightSheet`, `#btnLightSave`, `#btnLightDelete`, `#lightToWorld`, `#lightTrial*`, `data-light`, `data-light-layer`, `data-light-setting`, `data-option`, `data-light-effect`, `data-color`, `data-light-hand`. `#lightFooter` n'a plus de pied à nommer : migrer ses lecteurs dans le même commit, ou le porter sur le bandeau de phrase avec un commentaire.
- Test unitaire de `colorName.ts` : les 6 teintes plateforme retombent sur leur nom, un qualificatif au plus, aucune sortie hors table.
- Audit `audit-ux-ui` **en vrai**, captures à 1440 et 1024, DOM mesuré, avec Léna puis Abyssiaelle :
  - aucune lumière (une seule création possible) ;
  - création depuis un schéma, puis ajustement de la direction et d'un effet coloré ;
  - couleur libre par la roue, nom proposé, nom modifié à la main, enregistrement, rechargement (pastille approchée) ;
  - essai rendu, puis fiche modifiée (bandeau périmé) ;
  - écrit à la main + Améliorer déplié, focus suivi au clavier ;
  - lumière du monde (case « Corriger dans le monde »), lumière ajustée (« Rendre au monde »), lumière en erreur ;
  - changer de lumière avec des réglages non enregistrés (confirmation) ;
  - `--no-comfy`.
