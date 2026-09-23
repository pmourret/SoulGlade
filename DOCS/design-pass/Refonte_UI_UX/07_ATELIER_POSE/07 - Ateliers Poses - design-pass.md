# Écran 7 : Ateliers, Poses (catalogue en table, dépôt direct)

Périmètre validé par l'utilisateur le 2026-09-23. Maquette validée : `Revue UX 07 - Ateliers Poses.dc.html`, option **7b**. Option 7a écartée. Deux éléments de 7a sont repris parce qu'ils ne dépendent pas du modèle d'écran : la confirmation de retrait qui nomme les scènes (A3), et la fenêtre « Nouvelle depuis un gabarit » (onglet gabarit de A2).

**Prérequis** : les écrans 0 et 7b (composeur) sont livrés. La barre d'atelier Scènes · Poses · Tons est en place.

L'éditeur de squelette (`/bank/poses/edit`, `screen-6-editeur-de-pose.md`) est **hors périmètre** et sera traité à son étape.

Fichiers concernés : `src/screens/bank/poses/` (`PosesView.tsx`, `PoseCard.tsx`, `usePoseBank.ts`), `src/screens/pose-editor/NewPoseModal.tsx` (restylage seulement) et la fumigation `test_bank.js` (partie poses).

## Invariants rappelés

- **La photo source n'est jamais gardée** (`pose_tools.py` la supprime de `ComfyUI/input`, succès ou échec). L'écran le dit au moment où l'on choisit ou dépose le fichier.
- L'envoi reste en base64 dans un corps JSON, jamais en multipart : le garde d'origine en dépend (`api/security.py`).
- La banque de poses est **partagée par tous les personnages** (aucun `character=` sur `/img/pose` ni `/api/pose/*`). L'écran le dit dans sa barre.
- Imposer une pose à une scène reste une propriété de la scène, qui se règle dans la section Pose du composeur.
- `usePoseBank` : recherche, filtres, tri, `rename`, `duplicate`, `remove`, `reload(true)` (rechargement protégé) restent inchangés.

## S : Structure

### S1. Grille de l'écran

```
[ barre d'atelier 44 px : Scènes · Poses · Tons | recherche | Provenance | Utilisation | Nouvelle depuis un gabarit | Extraire d'une photo ]
[ tableau flex ][ aperçu 320 px ]
```

La barre d'atelier est celle de l'écran 7b du composeur, complétée par les contrôles de la banque. À gauche du premier contrôle, en 12,5 px `--dim2`, le texte « Squelettes OpenPose · partagés par tous les personnages », masqué sous 1280 px.

### S2. Barre

- **Recherche** : 220 px, icône loupe, recherche sur le nom ou le libellé (`search`).
- **Provenance** : sélecteur compact « Toutes / Gabarit / Photo » (`provenanceFilter`).
- **Utilisation** : sélecteur compact « Toutes / Utilisées / Non utilisées » (`usageFilter`).
- **Nouvelle depuis un gabarit** : bouton secondaire qui ouvre `NewPoseModal` (inchangé en logique, restylé).
- **Extraire d'une photo** : bouton `--pri` qui ouvre le sélecteur de fichier. Garder `#poseFile` (input masqué) et `#btnPoseExtract` sur ce bouton, ou migrer la fumigation.
- Tous les enfants sont en `flex:none; white-space:nowrap`.
- Le sélecteur de densité compact / confortable **disparaît** : la table a une seule densité. Retirer `density` de `usePoseBank` seulement si rien d'autre ne le lit (grep).

### S3. Tableau (`PoseTable.tsx`, remplace la grille de `PoseCard`)

Un vrai `<table>`, avec des en-têtes triables (`<button>` dans `<th>`, `aria-sort`).

| Colonne | Contenu | Tri |
|---|---|---|
| (vignette) | squelette 44×44 sur fond **noir** (`/img/pose`), `loading="lazy"` | non |
| Libellé | libellé 13 px (ou le nom si pas de libellé), puis le nom de fichier en mono 11 px `--dim2` | alphabétique (`sortBy="name"`) |
| Provenance | « Gabarit » / « Photo » / « Ancienne » si `source === null` | non |
| Utilisée par | « N · scène1, scène2 » (ellipse), ou « non utilisée » en `--dim2`. Construit à partir de `scenesUsing`, **seule source** | par utilisation (`sortBy="usage"`) |
| Ajoutée | date, **seulement si `/api/pose/bank` la renvoie déjà** ; sinon la colonne n'existe pas | plus récent (`sortBy="recent"`) |

- Lignes de 58 px, filet `--line`.
- Ligne active : fond `--panel3` + `inset 2px 0 0 var(--acc)`, libellé en 600. Ligne occupée (`busyNames`) : `opacity:.5` + `aria-busy`.
- Clic ou Entrée = sélectionner. Double-clic = ouvrir l'éditeur. Flèches ↑ ↓ = ligne suivante ou précédente. `Suppr` = retirer (avec confirmation).
- Garder les attributs `data-pose-card` et `data-n` sur la ligne (`<tr>`) pour la fumigation.
- **Vide** : « Aucun squelette pour l'instant. », puis les deux actions de la barre répétées au centre.
- **Filtre vide** : « Aucun squelette ne correspond à ces filtres » + « Réinitialiser les filtres ».

### S4. Dépôt direct

- Faire glisser un fichier image (`dataTransfer.types` contient `Files`) **au-dessus du tableau** affiche une superposition : bordure pointillée 2 px `--txt`, fond `--bg` à 90 %, titre 17 px « Déposer pour extraire le squelette », et la phrase « La photo est supprimée après l'extraction, seul le squelette est gardé ».
- Au dépôt, on appelle **la même fonction `extract()`** que le bouton. Pas de second chemin d'envoi.
- Types acceptés : `image/png`, `image/jpeg`, `image/webp`. Un autre type donne un toast « format non pris en charge », sans appel.
- Pendant l'extraction : bandeau fin en haut du tableau avec le nom du fichier, une barre indéterminée et « Extraction en cours… environ 20 s » (`role="status"`, remplace `#poseMsg`). Le dépôt et le bouton sont désactivés.
- ComfyUI hors ligne : le bouton et le dépôt sont désactivés. Le bouton porte l'infobulle « nécessite ComfyUI en ligne », et la superposition de dépôt dit la même chose au lieu de proposer l'extraction.

### S5. Aperçu (`PoseInspector` de banque, 320 px)

- Squelette en grand, 1:1 sur fond noir.
- **Libellé éditable sur place** (Entrée valide, Échap annule, logique actuelle de `PoseCard`). Garder `data-pose-label` et `data-pose-label-input`.
- Nom de fichier en mono.
- Ligne « {Provenance} · utilisée par {liste} » (ou « non utilisée »). Chaque scène est un lien vers `PATHS.bankScenes?scene=<id>`, mécanisme déjà en place.
- Provenance expliquée en 12 px `--dim2`, avec les textes actuels des infobulles de `PoseCard`.
- Pied : « Éditer le squelette » (`--pri`, lien vers `PATHS.poseEditor/<name>`), « Dupliquer » (secondaire), « Retirer… » (texte `--danger-txt`).
- **Pose ancienne sans points-clés** (`source === null`) : Renommer et Dupliquer sont remplacés par la ligne « Extraite avant les points-clés : ni renommable ni duplicable. » Plus de bouton désactivé muet.

### S6. Confirmation de retrait (repris de 7a · A3)

Même `useConfirm`, restylé :
- titre « Retirer ce squelette ? » ;
- si la pose est utilisée : « {libellé} est imposée à **N scènes**. Elles la perdront au prochain enregistrement, et la validation le signalera. », suivi de la liste des scènes dans un encart `--bg`, et du bouton **« Retirer quand même »** (bordure `--danger-line`, texte `--danger-txt`) ;
- si elle ne l'est pas : texte actuel + bouton « Retirer ».

### S7. Largeur inférieure à 1100 px

L'aperçu devient un tiroir, ouvert par la sélection d'une ligne. La colonne « Ajoutée » est masquée. La recherche passe à 160 px.

## A : a11y

- `<table>` avec `<caption>` visuellement masquée « Squelettes de pose », en-têtes `scope="col"`, `aria-sort` sur la colonne triée.
- La ligne active porte `aria-selected`. Le roving tabindex est sur les lignes.
- La superposition de dépôt est annoncée (`aria-live="polite"` : « Relâcher pour extraire »), et le bouton reste l'équivalent clavier du dépôt.
- La vignette a un `alt` égal au libellé ou au nom (actuel).

## Dépendances

Aucune. `/api/pose/bank`, `/api/pose/extract`, `/api/pose/delete`, `/api/pose/keypoints`, `/api/pose/save` et `/img/pose` restent inchangés. La colonne « Ajoutée » dépend de la présence d'une date dans la réponse existante : la vérifier, **ne pas l'ajouter côté serveur** dans ce chantier.

## Découpage

```
screens/bank/poses/
  PosesView.tsx        composition barre + tableau + aperçu, dépôt
  PoseTable.tsx        tableau (présentation)
  PoseInspector.tsx    aperçu de la ligne active (présentation)
  usePoseDrop.ts       état du glisser-déposer, délègue à extract()
  usePoseBank.ts       inchangé (densité retirée si inutilisée)
```

`PoseCard.tsx` est supprimé s'il n'est plus importé ailleurs (grep : le composeur a son propre sélecteur de pose).

## Critère de sortie

- `typecheck`, `build` et `test_bank.js` (poses) verts. Les sélecteurs `#bankPoses`, `#poseGrid` (à migrer vers la table), `[data-pose-card]`, `[data-n]`, `[data-pose-label]`, `#poseFile`, `#btnPoseExtract` et `#nPoses` sont préservés ou migrés dans le même commit.
- Audit `audit-ux-ui` **en vrai**, avec captures à 1440 et 1024 :
  - tableau trié par chaque colonne ;
  - filtres ;
  - filtre vide ;
  - banque vide ;
  - pose sélectionnée utilisée, puis non utilisée ;
  - renommage sur place ;
  - duplication ;
  - retrait d'une pose utilisée (confirmation qui nomme les scènes) ;
  - pose ancienne sans points-clés ;
  - dépôt d'une photo réelle (extraction jusqu'au bout, **puis vérifier qu'aucune photo ne reste dans `ComfyUI/input`**) ;
  - dépôt d'un fichier non image ;
  - `--no-comfy` (dépôt et bouton désactivés, avec le message) ;
  - clavier : ↑ ↓, Entrée, double-clic, Suppr.
