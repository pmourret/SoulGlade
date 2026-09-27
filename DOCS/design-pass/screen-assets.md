# Écran 17 : Ateliers, Assets (les classes à gauche, cibles de dépôt)

Périmètre validé par l'utilisateur le 2026-09-27. Maquette validée : `Revue UX 17 - Ateliers Assets.dc.html`, option **17a** (A1 nominal, A2 dépôt sur une classe, A3 import en cours et hors ligne, A4 1024). L'option 17b est écartée.

Route : `/bank/assets` (`?character=lena`, `?character=abyssiaelle`). Même famille que les Lumières (`screen-lumieres.md`) et les Tenues (`screen-tenues.md`) : liste à gauche, travail au centre, inspecteur 340 avec tête 48 et pied 52.

Fichiers concernés :
- `src/screens/bank/assets/` (`AssetsView.tsx`, `AssetInspector.tsx`, `useAssetLibrary.ts`) ;
- `src/screens/bank/useFileDrop.ts` (plusieurs cibles de dépôt, § S4) ;
- `src/screens/bank/outfits/outfitSlots.ts` (lu seulement, pour l'emplacement proposé ; livré par `screen-tenues.md`) ;
- les fumigations des assets, `test_charte`, `test_cadres_ua`.

## Constats à mesurer d'abord

À confirmer en capture Playwright à 1440 et 1024 avant tout correctif, un constat par problème avec sa mesure :

1. **Quatre contrôles dans la barre** : `#assetFilter` (168), `#assetClass` (168), `#assetOwner` (186), `#btnAssetImport`. Le résumé est coupé (« … du mon… », relevé du 27/09 à 1440).
2. **Une carte seule dans un grand vide** : largeur de la carte, surface vide autour, avec un seul asset.
3. **La carte ne montre pas le fragment.**
4. **Le bandeau d'import** (`#assetImportBand`) est collé en haut de la liste, loin de la carte qui apparaîtra.
5. **Deux zones** : `minmax(0,1fr) 340px`, pas de colonne gauche ; l'inspecteur n'a ni tête ni pied.

## Invariants rappelés

- **La classe se choisit avant l'import** : elle décide de la consigne du modèle vision (`assets.CLASSES`). Elle **ne change plus ensuite** (`CHAMPS_AJUSTABLES = label, fragment`).
- **Invariant 7** : aucune classe n'est nommée dans l'écran. La colonne des classes, leur libellé et leur destination viennent de `classes` (`/api/assets`, champ `champ`). Une classe ajoutée côté serveur apparaît sans une ligne de front.
- **L'import n'échoue jamais faute de fragment** : ComfyUI hors ligne ou modèle muet, l'asset entre sans fragment et « Analyser l'image » réessaie.
- **Aucune écriture optimiste** (`useAssetLibrary`). Le toast lit l'asset **écrit par le serveur** (audit du 26/09).
- Octets en base64 dans du JSON, jamais en multipart (garde d'origine).
- Un asset porté par une tenue ne part pas : le refus du serveur s'affiche tel quel.

## S : Structure

### S1. Grille

```
[ barre d'atelier 48 : Scènes · Poses · Tons · Assets · Tenues · Lumières | « N assets · image et fragment de prompt » | Importer : {classe} ]
[ classes 260 ][ grille, flex ][ inspecteur 340 ]
```

- La barre ne porte **qu'un** bouton, `#btnAssetImport`, dont le libellé suit la classe ouverte : « Importer : Vêtement ». Sur « Toutes », il devient un bouton à menu (les classes de la table). `#assetFile` reste l'input caché derrière. L'indice `KEPT_HINT` reste sur l'enveloppe.
- Le résumé est court et ne se coupe plus à 1440 ; il disparaît sous 1280 comme aujourd'hui.
- L'inspecteur n'est rendu que si un asset est sélectionné ; rien d'ouvert : la grille prend la place.

### S2. Colonne des classes (gauche, 260)

- `.lab` « Classes ».
- **Toutes**, puis une ligne par classe de `classes` : libellé pluriel 13 px, compte en `font-code` 12 px, et **où va le fragment** en `.tiny` : `wardrobe` → « onglet Vêtements, tenues », `prompt` → « Scène et lieu », `null` → « bibliothèque seule ». Cette correspondance `champ` → phrase est la seule table de l'écran.
- Ligne ouverte : `--panel3` + `inset 2px 0 0 var(--acc)`, 600. `role="listbox"`, `aria-selected`, flèches ↑ ↓. Remplace `#assetFilter` (migrer ses lecteurs).
- Filet, puis **Sans fragment** avec son compte en `--warn-txt` et l'icône `warn` : un filtre de plus, qui sert de liste de choses à faire.
- **Pied : « Importer pour »**, segmenté Léna · Monde {monde} (`--acc` jamais : aplat `--panel3`, 600), et `.tiny` « Un asset du monde est hérité par tous ses personnages. » Désactivé, avec la raison, si le personnage n'a pas de monde. Remplace `#assetOwner` (même valeur, `personnage` | `monde`).

### S3. Grille (centre)

- Tête de 40 px : nom de la classe ouverte 14 px 650, puis `.tiny` avec le compte et la phrase de destination (« 4 · leur fragment se pose dans l'onglet Vêtements du composeur, ou dans une tenue »).
- Grille `repeat(auto-fill, minmax(180px, 1fr))`, `gap 12px`.
- **Carte** : image carrée `rounded-[6px]`, libellé 13 px, pastille de couche (« monde », « ajusté »), puis le **fragment** en `font-code` 12 px sur deux lignes, `--dim`. Sans fragment : « ⚠ sans fragment · à analyser » en `--warn-txt`. Sélectionnée : bordure 2 px `--txt`. Garder `data-asset`, `aria-pressed`.
- **La dernière case est toujours une case de dépôt** : pointillés 2 px `--line2`, « Déposer une image », `.tiny` « Elle entre comme {classe}. PNG, JPEG ou WebP, 20 Mo au plus. » Cliquable (ouvre `#assetFile`), et cible de dépôt.
- **État vide** (`#assetsEmpty`) : la grille n'a que la case de dépôt, agrandie, avec le texte actuel. Classe vide mais bibliothèque non vide : « Aucun asset de cette classe. » dans la case.

### S4. Dépôt

- **Trois cibles**, un seul chemin d'import (`bringIn`) :
  - la **case de dépôt** et la **grille** : classe ouverte ;
  - une **ligne de classe** à gauche : cette classe ;
  - **« Toutes »** ou la grille sur « Toutes » : un menu demande la classe au relâcher.
- Pendant le glisser, la cible survolée prend des pointillés 2 px `--acc` et **dit l'action en texte** (« Relâcher : importer comme décor »). La grille garde son voile actuel (`drop.over`) quand c'est elle qui est survolée.
- `useFileDrop` gagne la capacité d'être posé sur plusieurs éléments avec une classe par cible ; un seul fichier à la fois, comme aujourd'hui.

### S5. Import en cours (A3)

- La **carte de l'asset en cours** prend sa place dans la grille dès le dépôt (vignette locale du fichier), avec « Lecture de l'image par le modèle local… quelques secondes » (`role="status"`) et une barre fine. Elle remplace le bandeau `#assetImportBand` : garder l'id sur ce statut.
- Le résultat se lit sur la carte : fragment, ou « ⚠ sans fragment » avec la phrase « L'image est gardée. ComfyUI est hors ligne : « Analyser l'image » écrira le fragment quand il reviendra. » Le toast actuel reste.
- Un second dépôt pendant un import : refusé comme aujourd'hui (« Un import est déjà en cours »), dit sur la cible.

### S6. Inspecteur (droite, 340)

1. **Tête 48** : libellé 14 px 650, pastille de couche (`data-asset-layer`, indice de couche en `data-hint-text`).
2. **Corps, défile** :
   - image `object-contain`, 220 px de haut, `rounded-card` ;
   - Libellé (`#assetLabel`) ;
   - Fragment de prompt (`#assetFragment`), puis `EnhanceControl` (kind selon `champ`, règle actuelle) et `#btnAssetAnalyse` **sur la même rangée**, puis la phrase d'aide ;
   - table de lecture 96 px / 1fr : **Classe** (« Vêtement · fixée à l'import »), **Dans une tenue** (vêtements seulement : l'emplacement que `proposeSlot` donne au fragment, avec le mot trouvé, ou « aucun emplacement proposé »), **Fichier** (`fichier`, `font-code`) ;
   - case « Corriger dans le monde » (`#assetToWorld`) quand elle s'applique.
3. **Pied 52** : `#btnAssetSave` (primaire), `#btnAssetDelete` (« Retirer » ou « Rendre au monde »), et à droite « à jour » ou « modifié » en texte.

### S7. Moins de 1100 px (A4)

- La colonne des classes devient une **rangée de pastilles** sous la barre (Toutes, chaque classe avec son compte, « ⚠ Sans fragment »), et « Importer pour » un petit menu au bout de la rangée. Les pastilles restent des cibles de dépôt.
- L'inspecteur tombe en **tiroir** (existant, `useOverlayPanel`).
- Grille à `minmax(160px, 1fr)`.

## A : a11y

- Colonne des classes : `listbox` / `option`, `aria-selected`, flèches ; au dépôt clavier impossible, le bouton d'import suffit (il suit la classe ouverte).
- Les cibles de dépôt annoncent l'action en `aria-live="polite"` pendant le survol (existant pour la grille).
- Carte en cours d'import : `role="status"`, puis le résultat lu une fois.
- `EnhanceControl` : focus vers la proposition puis retour au bouton (acquis du 27/09).
- Contrastes texte 4,5:1, interface 3:1, vérifiés aussi avec Abyssiaelle. Rayons : cartes, case de dépôt, inspecteur en `rounded-card` ; image de carte, champs, pastilles en `rounded-[Npx]`. Aucun 13,5 px.

## Dépendances

Aucune côté serveur. `/api/assets` (et `classes`), `/import`, `/analyse`, `/save`, `/delete` inchangées. `outfitSlots.ts` vient du chantier Tenues : si Assets passe avant, la ligne « Dans une tenue » attend.

## Découpage

```
screens/bank/assets/
  AssetsView.tsx        grille 3 colonnes, un bouton d'import, cibles de dépôt
  ClassList.tsx         colonne des classes + « Sans fragment » + « Importer pour » (présentation)
  ClassChips.tsx        la même chose en rangée, sous 1100 px
  AssetGrid.tsx         cartes, carte en cours d'import, case de dépôt
  AssetInspector.tsx    tête 48, corps, pied 52
  classDestination.ts   champ -> phrase de destination (la seule table de l'écran)
screens/bank/
  useFileDrop.ts        plusieurs cibles, une classe par cible
```

## Critère de sortie

- `typecheck`, `build`, `run_browser_tests.py --only` sur les tests des assets, `test_charte`, `test_cadres_ua` : au vert. Crochets préservés : `#bankAssets`, `#nAssets`, `#assetFile`, `#btnAssetImport`, `#assetsEmpty`, `#assetImportBand`, `#assetPanel`, `#assetInspector`, `#assetLabel`, `#assetFragment`, `#assetToWorld`, `#btnAssetSave`, `#btnAssetAnalyse`, `#btnAssetDelete`, `data-asset`, `data-asset-layer`. Migrés dans le même commit : `#assetFilter` (colonne des classes), `#assetClass` (classe ouverte + menu sur « Toutes »), `#assetOwner` (segmenté « Importer pour »). Nouveaux : `data-asset-class` sur chaque ligne et pastille de classe, `data-asset-drop` sur la case de dépôt.
- Audit `audit-ux-ui` **en vrai**, captures à 1440 et 1024, DOM mesuré, avec Léna puis Abyssiaelle :
  - bibliothèque vide, puis un seul asset (plus de vide) ;
  - import par le bouton, par la case de dépôt, par dépôt sur une classe, par dépôt sur « Toutes » (menu) ;
  - import pour le monde ; personnage sans monde (segmenté désactivé avec sa raison) ;
  - `--no-comfy` : asset sans fragment, puis « Analyser l'image » quand ComfyUI revient ;
  - second dépôt pendant un import ;
  - filtre « Sans fragment » ;
  - retrait d'un asset porté par une tenue (refus du serveur affiché) ;
  - résumé de la barre non coupé à 1440 ;
  - clavier : ↑ ↓ dans les classes, menu du bouton d'import.
