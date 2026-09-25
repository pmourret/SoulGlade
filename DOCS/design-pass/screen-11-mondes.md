# Écran 11 : Référentiel, Mondes (trois colonnes : mondes, lieux, lieu)

Périmètre validé par l'utilisateur le 2026-09-23. Maquette validée : `Revue UX 11 - Mondes.dc.html`, option **11a** (A1 nominal, A2 nouveau monde, A3 catalogue adulte vide). L'option 11b est écartée.

**Prérequis** : écran 0 (chrome) livré, avec la catégorie Référentiel et sa barre de module Personnages · Mondes, et `DirtyBar` en place.

Fichiers concernés :
- `src/screens/worlds/` (`WorldsScreen.tsx`, `WorldPlacesScreen.tsx`, `CatalogueSection.tsx`, `PlaceInspector.tsx`, `useWorldPlaces.ts`, `useCatalogueEditor.ts`) ;
- `src/app/App.tsx` (routes) ;
- les fumigations des mondes et des lieux.

## Invariants rappelés (ADR-0015, ADR-0016)

- Un monde est une **ressource de monde**, pas de personnage : modifier un lieu change ce qu'héritent tous les personnages qui y composent.
- La **création** d'un monde reste courte : nom, identifiant, pack (qui sert **seulement** à dériver `compatible_families`, jamais à router), ton optionnel. Elle se termine **sur le catalogue** du monde créé.
- L'**identifiant d'un lieu existant n'est jamais modifiable** (sinon les `world_ref` deviennent orphelins). Il n'est éditable qu'à la création.
- L'enregistrement d'un catalogue **remplace le catalogue entier** (contrat actuel de `useWorldPlaces.save`).
- Le **catalogue adulte** est un fichier séparé, derrière ses propres routes. Il est annoncé (compteur) mais jamais imposé à l'écran. Retirer son dernier lieu supprime le catalogue (comportement serveur actuel).
- Retirer un lieu passe par la **confirmation actuelle**, texte inchangé.
- `useWorldPlaces` reste le seul appelant des routes `places` et `places-adulte`. Une instance de `useCatalogueEditor` par catalogue.

## S : Structure

### S1. Routes

- `/worlds` monte l'écran avec le **premier monde** du registre sélectionné (ou l'état « registre vide »).
- `/worlds/:worldId/places` monte **le même écran** avec ce monde sélectionné.
- Changer de monde : `navigate(worldPlacesPath(id))` (**replace** si l'on vient de `/worlds`).
- L'onglet et le lieu ouverts **ne sont pas** dans l'URL (état local), sauf un paramètre `?place=` optionnel si c'est simple. À dire en mode Plan, et à ne pas ajouter si cela complique.
- Modifications non enregistrées au moment de changer de monde ou de lieu : confirmation `useConfirm` avec Enregistrer, Abandonner ou Annuler.

### S2. Grille

```
[ DirtyBar du chrome si un lieu est modifié ]
[ registre 260 px ][ catalogue 400 px ][ inspecteur flex, fond --panel2 ]
```

Trois zones bord à bord, filets `--line2`, hauteur pleine, chaque zone défile seule. Le modèle `.wrap` et les cartes à bordure 2 px disparaissent.

### S3. Registre (gauche)

- Titre « Mondes · N » en capitales 10,5 px.
- Ligne de monde (`data-world-card` conservé) :
  - nom 13,5 px, avec à droite « N lieux » ou « vide » en 11,5 px `--dim2` `tabular-nums` ;
  - dessous, l'identifiant en mono 11 px · les familles compatibles.
- Ligne active : `--panel3` + `inset 2px 0 0 var(--acc)` + 600.
- `role="listbox"`, ↑ ↓.
- Pied : bouton secondaire pleine largeur « + Nouveau monde » (`data-new` conservé), qui ouvre la modale S6.

### S4. Catalogue (centre)

1. **En-tête du monde** :
   - nom 18 px 650 + identifiant mono `--dim2` ;
   - étiquettes 11,5 px à bordure `--line2` : chaque famille compatible, puis « ton : … » si le monde en a un. Pas de ton : pas d'étiquette.
2. **Onglets soulignés** « Ordinaire N · Adulte N » (`role="tablist"`) :
   - Ordinaire actif par défaut, soulignement 2 px `--txt` ;
   - l'onglet Adulte, actif, se souligne en `--warn` (et non en `--txt`) : le changement de registre se voit ;
   - le compteur adulte se charge comme aujourd'hui (les deux catalogues sont chargés à l'ouverture), et le contenu ne s'affiche qu'au clic ;
   - `#adulteBlock` : garder l'identifiant sur le panneau de l'onglet Adulte, pour la fumigation (ou migrer le sélecteur dans le même commit).
3. **Liste des lieux** (`data-place-row` conservé), ligne sur deux niveaux :
   - nom 13,5 px (+ point `--warn` si le lieu est modifié), intention à droite en 11,5 px `--dim` ;
   - dessous, l'**extrait du prompt** sur une ligne, 12 px `--dim2`, tronqué avec ellipse ;
   - ligne active : même traitement que le registre. `role="listbox"`, ↑ ↓, Entrée ouvre dans l'inspecteur.
   - **Le × de retrait disparaît** de la ligne (voir S5).
4. **Pied** : bouton pointillé pleine largeur « + Ajouter un lieu » (ou « + Ajouter un lieu adulte » dans l'onglet Adulte).
5. **Onglet Adulte ouvert** (A3) : sous les onglets, un bandeau d'information `--warn-*` avec un carré (pas un ⚠) reprend le texte actuel : « Des cadres, jamais une tenue. Ces lieux n'apparaissent dans aucune banque ordinaire. Une scène qui en dérive ne se voit qu'au cran natif d'un personnage armé. » suivi du fichier `WORLDS/{id}.adulte.json`. Vide : état actuel restylé (« Aucun lieu adulte », phrase actuelle, bouton pointillé).

### S5. Inspecteur (droite, `PlaceInspector` restylé)

1. **En-tête** 52 px : nom du lieu 15 px 650, puis à droite « Retirer… » en `--danger-txt` (bouton texte), qui déclenche `editor.remove`, donc la confirmation actuelle. Absent pour un lieu en cours de création.
2. **Ligne de portée** (fixe, sous l'en-tête, filet bas) : icône `globe` + « Partagé par **tous les personnages** de « {monde} ». Le modifier change ce qu'ils héritent. » en 12,5 px `--dim`. Elle remplace le paragraphe ⚠ orange actuel. Si une route **existante** donne le nombre de personnages qui composent dans ce monde, le DirtyBar peut l'afficher (« N personnages composent dans ce monde ») ; sinon, rien. Claude Code vérifie en mode Plan et **n'ajoute aucune route**.
3. **Propriétés**, `max-width:720px` :
   - **Identifiant** : lieu existant, grille étiquette / valeur en mono + « figé, sert de world_ref aux scènes » en `--dim2`. Lieu en création, champ éditable, pré-rempli depuis le nom (voir S7) ;
   - **Nom du lieu** : champ 34 px ;
   - **Intention** : champ 34 px, étiquette « Intention · sert aussi de dossier d'export » ;
   - **Prompt du lieu** : zone de texte, `min-height:110px`, redimensionnable, avec l'aide dessous « Décor, cadrage, lumière. Jamais le visage, jamais la tenue : c'est un cadre, pas une garde-robe. ».
   - Un champ modifié prend une bordure `--warn`.
4. **Enregistrement** : il passe par `DirtyBar` (« Lieu « {nom} » modifié · WORLDS/{id}.json · Annuler · Enregistrer le lieu · Ctrl S »). Le bouton « Enregistrer le lieu » local disparaît. Mêmes conditions de désactivation qu'aujourd'hui (prompt vide, identifiant vide en création). `status` (identifiant déjà utilisé, échec) s'affiche sous le champ concerné, ou dans le bandeau pour une erreur serveur.
5. `Échap` ferme l'inspecteur (comportement actuel), avec confirmation si le lieu est modifié.
6. **Aucun lieu ouvert** : état vide centré « Ouvre un lieu dans la liste, ou ajoutes-en un. »

### S6. Modale « Nouveau monde » (A2)

- `Dialog` 440 px.
- Titre « Nouveau monde », puis la phrase « Son catalogue démarre vide. Tu arriveras dessus pour ajouter un premier lieu. »
- Champs dans l'ordre : Nom, Identifiant (voir S7, validation écrite), Pack (`select`, avec la famille dérivée affichée à droite et l'aide « sert seulement à dériver la famille compatible »), Ton (optionnel).
- Erreur serveur : sous les champs, `role="alert"`, message tel quel.
- Pied : « Annuler » en lien, puis `--pri` « Créer et ouvrir le catalogue ». Désactivé tant que le formulaire n'est pas prêt, « Création… » pendant la requête.
- Succès : toast actuel, puis navigation vers le catalogue (comportement actuel).
- Garder `data-new-open` sur le contenu de la modale, ou migrer le sélecteur.

### S7. Identifiant proposé depuis le nom

- Tant que l'utilisateur n'a pas modifié l'identifiant à la main, il suit le nom : minuscules, accents retirés (normalisation NFD), espaces et caractères interdits remplacés par `_`, sans doublon de `_`, et un préfixe si le nom commence par un chiffre (`CID_RE` exige une lettre en premier).
- Dès qu'il est modifié à la main, il ne suit plus.
- Validation **écrite** à droite du champ : point `--ok` + « valide », ou losange + le motif (« minuscules, chiffres, - et _ », « déjà utilisé »). Plus de coche seule.
- Même mécanisme pour un nouveau lieu (unicité vérifiée dans le catalogue courant, comme aujourd'hui).

### S8. États

- **Chargement** : squelettes des trois colonnes, `aria-hidden`.
- **Registre illisible** : carte d'erreur centrée (losange, « Registre indisponible », phrase actuelle, « Réessayer »).
- **Registre vide** : colonnes 2 et 3 remplacées par un état vide « Aucun monde pour l'instant » + `--pri` « Nouveau monde ».
- **Catalogue illisible** (`error` de `useWorldPlaces`) : message tel quel dans la colonne du catalogue concerné, `role="alert"`.
- **Monde neuf, catalogue vide** : état vide actuel restylé dans la colonne 2, et l'inspecteur ouvert directement sur un nouveau lieu (`editor.add()` à l'arrivée depuis la création).
- **Moins de 1100 px** : le registre devient un sélecteur déroulant dans l'en-tête du catalogue, qui passe à 340 px.

## A : a11y

- Deux `role="listbox"` (mondes, lieux) navigables au clavier. L'inspecteur est une `<section aria-label>`.
- Onglets `role="tablist"` / `tab` / `tabpanel`.
- Validation d'identifiant liée par `aria-describedby`.
- La ligne de portée est un texte normal, pas une live region.
- Contraste ≥ 4,5:1. L'onglet Adulte souligné en `--warn` porte aussi son libellé.

## Dépendances

Aucune. Les routes `/api/worlds`, `/api/worlds/options`, `/api/worlds/{id}/places` et `/api/worlds/{id}/places-adulte` restent inchangées. Le nombre de personnages par monde ne s'affiche que s'il est déjà fourni par une route existante.

## Découpage

```
screens/worlds/
  WorldsScreen.tsx         écran unifié 3 colonnes, routes /worlds et /worlds/:worldId/places
  WorldList.tsx            S3 (présentation)
  CatalogueColumn.tsx      S4 : en-tête, onglets, liste, pied (remplace CatalogueSection)
  PlaceInspector.tsx       S5, restylé
  NewWorldDialog.tsx       S6
  slugify.ts               S7, fonction pure testable
  useWorldPlaces.ts        inchangé
  useCatalogueEditor.ts    ajoute dirty et reset, sans changer save et remove
WorldPlacesScreen.tsx      supprimé ou réduit à une redirection
```

## Critère de sortie

- `typecheck`, `build` et les fumigations des mondes et des lieux passent au vert. Les sélecteurs `#worlds`, `#worldPlaces`, `[data-world-card]`, `[data-new]`, `[data-new-open]`, `[data-place-row]`, `#adulteBlock` sont préservés ou migrés dans le même commit.
- Tests unitaires de `slugify.ts` : accents, espaces, chiffre en tête, caractères interdits.
- Audit `audit-ux-ui` **en vrai**, captures à 1440 et 1024 :
  - changement de monde avec et sans modifications ;
  - création d'un monde (identifiant proposé, puis modifié à la main) jusqu'à l'arrivée sur son catalogue vide ;
  - ajout d'un lieu avec un identifiant déjà utilisé ;
  - modification puis Ctrl S ;
  - retrait confirmé puis annulé ;
  - onglet Adulte vide, puis avec un lieu ;
  - registre illisible (serveur arrêté).

---

## Écarts assumés à l'implémentation (2026-09-25)

1. **`?place=` n'est pas ajouté.** La spec le laissait optionnel, « à ne pas
   ajouter si cela complique ». Il complique : le seul paramètre d'écran de ce
   genre dans le dépôt (`?scene=` de la Banque) est un lien profond consommé
   une fois puis retiré de l'URL, précisément pour ne pas se battre avec une
   sélection ultérieure. Un vrai miroir devrait porter l'onglet en plus du
   lieu, et écrirait l'URL à chaque ouverture et fermeture d'inspecteur, en
   concurrence avec le rattrapage `?character=` de `CharacterContext`.

2. **Le brouillon d'un lieu sort dans `usePlaceDraft.ts`**, pas dans
   `useCatalogueEditor` seul. `PlaceInspector` est partagé avec la Banque, qui
   n'a pas d'éditeur de catalogue et aurait recopié la remise à plat.
   `useCatalogueEditor` l'appelle et ré-expose `dirty` et `reset`, comme le
   découpage le demande.

3. **`save` rend désormais un booléen.** Son corps est celui qu'il avait ; la
   valeur de retour est ce qui permet à « Enregistrer puis continuer » de
   rester sur place quand le serveur refuse, au lieu de naviguer en laissant
   partir le refus avec l'inspecteur.

4. **Les flèches d'une liste déplacent le focus, pas la sélection**
   (`listKeys.ts`). `chrome/useRovingChoice` sélectionne en se déplaçant : sur
   ces deux listes, sélectionner navigue ou ouvre un inspecteur, donc chaque
   pression de flèche aurait posé une question d'abandon.

5. **Le compte de personnages s'affiche dans le DirtyBar, jamais à zéro.**
   `GET /api/characters` le donne déjà ; `CHARACTERS/` étant hors dépôt, un
   registre vide ou illisible n'affiche rien plutôt qu'un « 0 personnage » qui
   se lirait comme une mesure.

6. **L'étiquette de ton est tronquée sur une ligne**, avec le texte entier au
   survol. Un ton est une phrase, et l'étiquette entière devenait un bloc de
   deux lignes large comme la colonne.

7. **Aucun monde d'essai ne reste.** Aucune route ne supprime un monde : la
   fumigation n'en crée donc jamais, et celui de l'audit a été retiré à la
   main.

## Ce que l'audit a corrigé

| Trouvé en vrai | Ce que c'était | Correction |
|---|---|---|
| Un monde neuf n'ouvrait pas son premier lieu | Le drapeau se consommait contre le catalogue du monde PRÉCÉDENT : `useWorldPlaces` garde la liste chargée jusqu'à la réponse suivante | Le drapeau porte l'id du monde, et attend « ce monde, et il est vide » |
| Le bandeau adulte et sa liste tombaient en bas de la colonne | Radix pose `hidden` sur le panneau inactif, et `[hidden]{display:none}` perd contre une utilitaire `.flex` de même spécificité : le panneau Ordinaire, vide, prenait sa part de `flex-1` | La mise en page passe sur une colonne intérieure, le panneau ne porte que sa hauteur |
| « slow-life.adulte » s'affichait comme un monde vide du registre | `worlds.list_worlds()` listait `*.json`, donc aussi le second catalogue d'un monde. Défaut du 21/09, déjà présent sur l'ancienne grille de cartes | `list_worlds()` écarte `*.adulte.json`, et `test_worlds_registry.py` le vérifie |
| L'étiquette de ton faisait un bloc de deux lignes | Une phrase dans une étiquette de 11,5 px | Tronquée, texte entier au survol |

## Ce que les mesures ont tranché

| Mesure | Valeur | Ce qu'elle a décidé |
|---|---|---|
| Grille à 1440 | coque 1440×818, registre 260, catalogue 400, inspecteur le reste, aucun débordement | La grille de S2 tient telle quelle |
| Grille à 1024 | registre 0×0, catalogue 340, inspecteur 684, sélecteur présent, document 1024 = vue | S8 tient : le registre devient un déroulant, rien ne déborde |
| Contraste le plus bas du registre et du catalogue | 5,48:1 | Au-dessus de 4,5:1, rien à reprendre |
| Nombre de personnages du monde ouvert | 1 | La route existante suffit, aucune n'est ajoutée |
