# Écran 5 : Galerie, planche de publication avec panier

Périmètre validé par l'utilisateur le 2026-09-23. Maquette validée : `Revue UX 05 - Galerie.dc.html`, option **5b**. L'option 5a est écartée.

**Prérequis** : les écrans 0, 2, 3b et 5b (Revue) sont livrés. La Galerie partage `ReviewScreen` avec la Revue (`trade="galerie"`) et reprend ses composants restylés : Loupe, `ReviewInspector`, menu contextuel.

## Ce qui change par rapport à la Revue refondue

La Galerie ne trie pas. Sa **vue Grille** est remplacée par une **Planche**. La vue Loupe et la vue Comparer restent celles de la Revue (4a), avec les actions propres à la Galerie : Télécharger en action principale, Éditer, Décliner, et « Poster sur Instagram » inerte.

## Invariants rappelés

- Aucun geste de tri dans la Galerie. Les raccourcis `vrxadu` restent ignorés (garde existante de `useReviewKeys`).
- Toute URL d'image passe par `api.image()` (jeton `v`, piège §5.6-1). Les téléchargements sont des `<a download>` sur `/img`, déjà lié au personnage (isolation du 29/08).
- L'espace NSFW n'est jamais exporté, et l'écran le dit (bandeau `--warn-*`).
- Le contenu du panier n'est **enregistré nulle part** : c'est un state d'écran, perdu au changement de personnage. `useCharacter().claimed` sert de clé de réinitialisation, ce qui empêche tout mélange entre deux personnages.

## S : Structure

### S1. Grille de l'écran

```
[ barre de filtres 44 px, pleine largeur ]
[ planche flex ][ panneau Cadrage 320 px ]
[ barre panier 64 px, visible si panier non vide ]
```

Aucun panneau gauche. Les filtres sont dans la barre.

### S2. Barre de filtres (`GalleryFilters.tsx`)

- **Espace** : segmenté SFW / NSFW avec compteurs. Conserver `#spaceSel`, `data-sp` et le radiogroup.
- **Format** : sélecteur « Tous / 4:5 / 9:16 / 2:3 / 1:1 » avec compteurs. La liste est calculée à partir des formats réellement présents dans `items`.
- **Grouper par** : Intention (défaut), Scène, Date (jour). Aucun groupement n'est demandé au serveur, tout se calcule côté client.
- **Score** : le filtre existant (`#scoreSel`), réduit à un sélecteur.
- **Recherche** : sous-chaîne sur `scene` et `date`.
- **Vue**, à droite : `#viewSel` avec **Planche · Loupe · Comparer**. `data-v="grille"` est conservé pour Planche et `data-v="revue"` pour Loupe.

### S3. Planche (`GalleryBoard.tsx`)

- Un groupe par clé de regroupement, trié du plus récent au plus ancien.
- **En-tête de groupe** : libellé 14 px 650, puis méta 12 px `--dim2` (« 14 images · 4:5, 9:16 »), filet bas `--line`, et à droite le lien « Tout ajouter au panier ».
- **Lignes justifiées** : chaque image garde **son vrai ratio**, lu depuis `item.format`, avec repli 4:5. La hauteur cible est de 190 px et chaque ligne se remplit jusqu'à la largeur du conteneur. C'est un algorithme de justification pur, dans une fonction `justifyRows(items, width, targetHeight, gap)` placée dans `boardLayout.ts` et testable sans React. La largeur est mesurée avec `ResizeObserver`. Les vignettes sont servies avec `thumb:true`.
- **Vignette** :
  - radius 4 ;
  - case carrée 18 px en haut à gauche, qui ajoute l'image au panier ou l'en retire ; cochée = fond `--acc` + `check`, restylée depuis `<input type="checkbox">` avec un nom accessible « Ajouter {scène} au panier » ;
  - étiquette de format en bas à gauche sur `--scrim` ;
  - image visée : `outline:2px solid var(--txt)` ; dans le panier : `outline:2px solid var(--acc)`.
- **Gestes** :
  - clic sur l'image = viser ;
  - double-clic ou Entrée = ouvrir en Loupe ;
  - `B` = ajouter l'image visée au panier ou l'en retirer ;
  - flèches = viser l'image précédente ou suivante, dans l'ordre de lecture de la planche ;
  - clic droit = menu contextuel (Télécharger, Ajouter au panier, Éditer, Décliner).
- **Vide** : « Aucune image validée pour l'instant. » avec deux actions : « Ouvrir la Revue · N à revoir » (`--pri`, à partir de `state.counts.A_REVOIR`) et « Produire ».
- **Filtre vide** : « Aucune image pour ce filtre » avec le bouton « Tout afficher ».

### S4. Panneau Cadrage (`FramingPanel.tsx`)

- Titre « Cadrage » et segmenté **Feed 4:5 · Story 9:16**.
- **Aperçu** de l'image visée dans le cadre choisi (`object-fit:cover`, centré), cadre en `1px --line2`.
- **Zone souvent recouverte** : une bande hachurée légère (`#e8e8e814`) avec un filet pointillé `--dim2` et la légende mono « zone souvent recouverte ». Hauteurs proposées :
  - Feed : 16 % en bas ;
  - Story : 14 % en haut et 20 % en bas.
  
  Ces valeurs sont des repères génériques, déclarés dans une table de `boardLayout.ts`. Ce n'est pas une mesure. **Ne reproduire aucune interface de plateforme** : ni icône, ni avatar, ni bouton.
- Nom de la scène et dimensions réelles (`naturalWidth` × `naturalHeight` lus à la charge de l'image, jamais inventés).
- Actions : « Ajouter au panier » + touche `B`, et « Éditer ».
- Ligne `--dim2` : « Décliner, mesures, prompt et graine restent en loupe (double-clic ou Entrée). »

### S5. Barre panier (`CartBar.tsx`)

N'apparaît que si le panier contient au moins une image. Hauteur 64 px, fond `--panel`, filet haut.

- « Panier » en 650, puis le résumé (« 3 images · 2 feed, 1 story »).
- Mini-vignettes de 44 px de haut à leur ratio, chacune avec un bouton × de retrait (`aria-label="Retirer {scène} du panier"`).
- Lien « Vider ».
- Bouton `--pri` « Télécharger N images ».

**Téléchargement en V1 : fichier par fichier.** La séquence est un `<a download>` par image, déclenchés à tour de rôle avec un court délai pour ne pas être bloqués par le navigateur. En cas d'échec, un toast nomme les fichiers non téléchargés. Aucune route n'est ajoutée.

### S6. Espace NSFW

Bandeau famille `--warn-*` sous la barre de filtres : « Espace NSFW · isolé, jamais exporté · fichiers dans PROD/EXPORT_NSFW/ ». Le panier fonctionne pareil : il télécharge depuis `/img` avec `space=nsfw`.

### S7. Largeur inférieure à 1100 px

Le panneau Cadrage devient un tiroir superposé, ouvert par un bouton « Cadrage » dans la barre de filtres (`useOverlayPanel`). La hauteur cible des lignes passe à 150 px.

## A : a11y

- La planche est un `role="grid"` : chaque groupe est un `rowgroup` avec son en-tête, et les vignettes sont des `gridcell`, en roving tabindex dans l'ordre de lecture.
- La case du panier a un nom accessible explicite et `aria-checked`.
- Le nombre d'images du panier est annoncé à chaque changement (`aria-live="polite"` sur le résumé de la barre).
- Le menu contextuel suit le même patron que la Revue (`role="menu"`, Échap, rendu du focus).
- Aucune information portée par la couleur seule : panier = case cochée, format = étiquette texte.

## Dépendances

- **Aucune pour le panier ni le cadrage.**
- **Regroupement par intention** : l'intention est dérivée côté client de la scène (`item.scene` → `scenes.json` via `useScenes()`, la scène porte son intention). Si une scène n'est plus dans la banque, le groupe s'appelle « Sans intention ». Rien à changer côté serveur.
- **Optionnel, plus tard** : une route `zip` pour un seul fichier regroupé. **Hors de ce chantier.**

## Découpage

```
screens/review/gallery/
  GalleryFilters.tsx
  GalleryBoard.tsx
  FramingPanel.tsx
  CartBar.tsx
  useCart.ts          state du panier, réinitialisé sur changement de personnage
  boardLayout.ts      justifyRows(), groupBy(), SAFE_ZONES (fonctions pures)
```

`ReviewScreen.tsx` monte `GalleryBoard` à la place de la grille quand `trade === 'galerie'`.

## Hors périmètre

- Publication assistée (reportée après la V1, `PROJET.md`).
- Route zip.
- Refonte de `PhotoEditor` et `DeclineDialog`.

## Critère de sortie

- `typecheck`, `build` et `test_review.js` passent en vert, y compris le parcours Galerie.
- Test unitaire de `justifyRows` et de `groupBy` (fonctions pures).
- Test du panier : il est vidé quand on change de personnage.
- Audit `audit-ux-ui` **en vrai**, avec captures à 1440 et 1024 :
  - planche regroupée par intention, puis par date ;
  - filtre de format ;
  - 3 images dans le panier ;
  - téléchargement de 3 fichiers (vérifier qu'ils arrivent tous) ;
  - cadrage feed puis story ;
  - espace NSFW ;
  - Galerie vide ;
  - changement de personnage avec un panier plein (le panier doit être vide ensuite) ;
  - clavier : flèches, B, Entrée, Échap.
