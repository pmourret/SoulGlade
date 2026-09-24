# Écran 2 — Fiche personnage : passeport + panneau de propriétés

Périmètre validé par l'utilisateur le 2026-09-23. Maquette validée : `Revue UX 02 - Fiche.dc.html`, option **2a** (l'option 2b est écartée).

**Prérequis** : l'écran 0, le chrome (`DOCS/design-pass/screen-0-chrome.md`), est livré. Ses tokens graphite sont supposés en place : `--panel3`, `--pri` / `--on-pri`, `--font` à 14 px.

Fichiers concernés :
- `src/screens/CharacterSheetScreen.tsx`, découpé selon la règle en trois rôles : Screen / hook / présentation
- `src/styles/screens.css` (`.meta` si nécessaire)
- la fumigation de la fiche

Invariants rappelés :
- La fiche reste en **lecture seule**. Elle n'arme rien et n'édite aucun des trois axes figés.
- Il n'y a qu'**une** porte pour changer de personnage : le menu d'identité, via `openIdentityMenu()`.
- Il n'y a qu'**une** porte pour le contenu adulte : Application → Contenu adulte.
- Aucun `if character ==`.

## S — Structure

### S1. Mise en page

Conteneur centré, `max-width:1120px`, `padding:32px 32px 48px`. Grille `300px minmax(0,1fr)`, `gap:40px`. En dessous de 1100 px : `220px minmax(0,1fr)`, `gap:28px`, `padding:24px`.

### S2. Colonne gauche (`<aside>`, collante `position:sticky; top:24px`)

1. **Portrait**, ratio 4:5, radius 8, bordure 1 px `--line`.
   - Tant que la route du portrait n'existe pas (voir Dépendances), ou si elle échoue : afficher l'**initiale** (`initialOf`) en grand, `--acc`, centrée sur `--panel`.
   - Si la base est `introuvable` : bordure pointillée `--danger-line`, fond sombre teinté, et la ligne « Base gelée introuvable » en `--danger-txt` sous l'initiale.
2. **Nom** : 24 px, 650, `letter-spacing:-.2px`. L'**identifiant** vient dessous, mono 12 px, `--dim2`.
3. **Pastilles d'état**, en `flex-wrap`, `gap:6px`. Toujours un point ou un losange **plus du texte**, jamais la couleur seule :
   - base présente : famille `--ok` (fond `#1f2a21`, bordure `#2f4a34`, texte `#b9dcbf`, point `--ok`), texte « Base gelée présente » ;
   - base introuvable : famille `--danger-*` avec losange ;
   - base absente : pastille neutre « Aucune base gelée » ;
   - adulte armé : même pastille « ADULTE ARMÉ » que dans l'en-tête (famille `--warn-*`).
4. **Actions** :
   - bouton `--pri` pleine largeur, 36 px : « Produire avec {nom} », qui mène à `PATHS.produce` ;
   - bouton secondaire, 34 px, bordure `--line2` : « Changer de personnage ». Il appelle `openIdentityMenu()` avec `stopPropagation`, comme l'actuel `#ficheAutres`. **Garder `id="ficheAutres"`**.

### S3. Colonne droite : panneau de propriétés

Cinq sections, dans cet ordre. Chaque section se compose :
- d'un **en-tête** : titre en capitales 10,5 px, 600, `letter-spacing:.7px`, `--dim`, suivi sur la même ligne de la **règle** en 12 px `--dim2`, puis d'un filet bas `--line2` ;
- de **lignes** : grille `190px minmax(0,1fr) auto`, `min-height:40px`, filet bas `#232323` (à tokeniser en `--line` si le contraste reste lisible). L'étiquette est en 13 px `--dim`, la valeur en 14 px `--txt`, et un lien d'action optionnel à droite (12,5 px, souligné, `text-underline-offset:3px`).

Utiliser `<section>` + `<h2>` pour le titre et `<dl>` / `<dt>` / `<dd>` pour les lignes.

| Section | Règle affichée | Lignes |
|---|---|---|
| **Création** | « figée à la création — en changer, c'est créer un autre personnage » | Type de personnage · Style de sortie (libellé lisible : `realiste` → « Réaliste », table de libellés côté front) · Monde + lien « Ouvrir le monde » → `worldPlacesPath(world.id)` |
| **Pack** | « déduit du type et du style · porte le verrou d'identité » | Pack (`universe.label`) · Famille de modèle (`universe.model_family`) · Base gelée : point + « Présente » + nom en mono tronqué avec ellipse / « Introuvable » + phrase explicative (reprise de `FrozenBase`) / « Absente » |
| **Contenus** | « registre de création » | Image : point `--ok` + « Actif » · les types inactifs regroupés sur une ligne : « Déclarés, pas encore branchés », en `--dim` (reprise de `ContentTypes`) |
| **Contenu adulte** | « se règle dans Application → Contenu adulte » | État : « Activé » (`--warn-txt`) / « Activé, sans outil d'édition dans ce pack » / « Désactivé » · Effet : phrase existante d'`AdultContent`, avec lien « Régler » → `PATHS.application`. Si `!has_graph && reason`, afficher `reason` tel que rendu par le serveur, sous l'état. |
| **Production** | « lu dans l'état du studio » | À revoir : `state.counts.A_REVOIR`, avec lien « Ouvrir la Revue » · Validées : `state.counts.OK`, avec lien « Ouvrir la Galerie ». Vérifier les clés réelles de `counts` : **aucune valeur inventée**. Si une clé est absente, la ligne est absente. |

**Libellés supprimés** : la phrase « Fiche du personnage ouvert — en lecture… » et le lien texte « Tous les personnages ». Le bouton « Changer de personnage » les remplace.

### S4. États

- **Chargement** : squelette à la forme exacte de S1 à S3 (bloc portrait, deux barres pour nom et id, 6 lignes étiquette / valeur). `aria-hidden`. Garder l'`id="registre" data-vue="fiche"` du conteneur.
- **Erreur** (`sheetError`) : carte centrée de 440 px, `--panel`, bordure `--danger-line`. Losange et titre « Fiche indisponible » en `--danger-txt`, phrase actuelle, bouton `--pri` « Réessayer » (garder `id="ficheRetry"`) et bouton secondaire « Voir le journal » → `PATHS.journal`.
- **Aucun personnage** : état vide actuel, restylé (bouton `--pri` « Ouvrir le registre »).

## Découpage des fichiers

```
screens/character-sheet/
  CharacterSheetScreen.tsx   composition + les 3 états
  SheetAside.tsx             portrait, nom, pastilles, actions (présentation pure)
  PropertySection.tsx        <section> titre + règle + <dl>
  sheetRows.ts               fonctions pures : sheet + counts → lignes
                             (libellés de style, contenus, état adulte)
  useSheetPortrait.ts        uniquement si la dépendance est livrée
```

Mettre à jour l'import de `App.tsx`. `sheetRows.ts` est testable sans React.

## A — a11y

- Un `<h1>` porte le nom du personnage, un `<h2>` le titre de chaque section. `<dl>` pour les propriétés.
- Portrait : `alt="Portrait de base gelée de {nom}"`. L'initiale de repli est `aria-hidden`, le nom étant lu juste après.
- Les liens d'action sont des `<a>` (`Link`) avec un texte explicite, jamais « ici ».
- Contraste ≥ 4,5:1 pour tout texte, pastilles comprises, contre leur fond réel.

## Dépendance — portrait de base gelée (implémentée séparément, commit backend préalable)

Aucune route ne sert aujourd'hui les octets de la base gelée. C'est volontaire : l'isolation du 29/08/2026, `FrozenBaseBrief`, `initialOf`.

Route proposée : `GET /api/character/base` (routeur `state` ou `images`, selon la frontière des modules).
- Liée au personnage courant par `?character=`, comme tout appel de `useApi()`.
- Lit **uniquement** le nom `base_gelee` du `config.json` de ce personnage et résout le fichier dans l'entrée ComfyUI configurée (ADR-0008). **Jamais** un nom de fichier passé en paramètre.
- Rend une vignette bornée (même mécanisme que les miniatures existantes). 404 JSON `{"ok":false,"erreur":…}` si le fichier est introuvable.
- **Test d'isolation obligatoire** : le personnage A ne peut jamais recevoir la base du personnage B, y compris via le chemin d'erreur.
- Mettre à jour le commentaire de `FrozenBaseBrief` et celui de `initialOf`, qui affirment qu'aucune route n'existe.
- Régénérer les types (`dump_openapi.py` → `toolchain.py`).

**Si l'utilisateur refuse cette route**, la fiche se livre avec l'initiale en grand : le design reste complet.

## Hors périmètre

- Le menu d'identité, déjà traité par le chrome.
- L'écran Application et l'écran Mondes.
- Toute écriture sur la fiche.

## Critère de sortie

- `typecheck`, `build` et la fumigation de la fiche sont verts (sélecteurs `#fiche`, `#ficheAutres`, `#ficheRetry` préservés ou migrés dans le même commit). Tests Python de la route si elle est livrée.
- Audit `audit-ux-ui` **en vrai** : captures à 1440 et 1024 ; base présente, introuvable et absente ; adulte désactivé, activé, activé sans graphe (personnage d'un pack sans `edit_workflow`) ; chargement lent (réseau ralenti) ; erreur (serveur arrêté).
