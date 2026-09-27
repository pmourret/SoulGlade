# Écran 19 : Référentiel, Mondes après IT-11 (le livret du monde)

Périmètre validé par l'utilisateur le 2026-09-27. Maquette : `Revue UX 19 - Mondes (IT-11).dc.html`, **tour 2, option 19d** (D1 nominal, D2 monde tout juste créé). Écartées : 19a, 19b (tour 1), 19c (tour 2). De 19b, on garde le choix du monde dans la barre.

**Remplace** la structure de `screen-11-mondes.md` (trois colonnes registre · catalogue 400 · inspecteur). Ses invariants restent (ADR-0015, ADR-0016, ADR-0027). La colonne de 400 px venait de ce design-pass, sans raison écrite : elle disparaît.

Routes : `/worlds`, `/worlds/:worldId/places` (inchangées).

Fichiers concernés :
- `src/screens/worlds/` : `WorldsScreen.tsx`, `CatalogueColumn.tsx` (remplacé), `WorldList.tsx` (devient le menu), `EntryInspector.tsx`, `ToneInspector.tsx`, `NewWorldDialog.tsx` (inchangé), `catalogSpecs.ts`, les hooks (inchangés) ;
- les fumigations des mondes, `test_charte`, `test_cadres_ua`.

## L'idée à rendre visible

Un monde, c'est **des lieux** (où), **des intentions** (pour quoi), **des scènes** qui croisent une intention et un lieu avec ce qui s'y passe (quoi), et **des tons** (comment, facultatifs). Ses personnages reçoivent tout. L'écran se lit dans cet ordre, et chaque chapitre dit en une ligne ce qu'il contient.

## Constats à mesurer d'abord

À confirmer en capture Playwright à 1440 et 1024 avant tout correctif, un constat par problème avec sa mesure :

1. Pas de barre d'écran de 48 px.
2. Colonne centrale à 400 px (`MIDDLE`), hors de l'échelle, sans raison écrite.
3. Colonne de droite vide (`EmptyInspector`) tant que rien n'est ouvert : mesurer sa surface.
4. En-tête de monde dense : titre 18 px, identifiant, familles en cadres, ambiance tronquée dans un cadre.
5. Porteurs de 13,5 px (23 relevés au 27/09), le 18 px du titre, le point de 9 px « modifié ».
6. Quatre onglets de listes plates : compter les clics pour créer une scène dans un monde vide (lieu, intention, scène).

## Invariants rappelés

- Un monde est une ressource de monde : une correction change ce qu'héritent **tous** ses personnages.
- L'identifiant d'une entrée existante n'est **jamais** modifiable ; il ne s'édite qu'à la création (`slugify`, règles de `catalogSpecs`).
- L'enregistrement passe par le **bandeau du chrome** (`useRegisterPendingSave`), Ctrl S compris. Quitter une entrée modifiée passe par `leaveGuard` (Enregistrer puis continuer, Abandonner, Annuler).
- Un lieu ou une intention qu'une scène utilise **ne part pas** (`services/worlds.py`).
- La **branche adulte** est un catalogue de scènes livré à part (`WORLDS/<id>.adulte.json`) : son **compte est annoncé**, son **contenu n'apparaît qu'à la demande** (arbitrage du 21/09). Retirer sa dernière scène la supprime.
- Un seul `useCatalogueEditor` par catalogue, `useToneCatalogue` pour les tons, `catalogSpecs` pour les champs. Aucun changement de hook.

## S : Structure

### S1. Grille

```
[ barre d'écran 48 : [Monde ▾]  famille · N personnages y vivent ]
[ sommaire 240 ][ livret, flex, défile ][ inspecteur 340 ]
```

- Trois zones, chacune défile pour son compte. Plus de colonne registre.
- **Toujours une entrée ouverte** dans l'inspecteur : à l'ouverture d'un monde, la première scène ; sinon la première entrée du premier chapitre non vide ; monde vide : le formulaire « Nouveau lieu » (comportement actuel de `freshWorld`).

### S2. Barre d'écran (48)

- **Menu du monde** : bouton `--panel3`, nom 15 px 650 + ▾ (`#worldPick` passe sur ce bouton ; menu `role="menu"`). Le menu liste les mondes comme `WorldList` aujourd'hui (nom, « N scènes » ou « vide », identifiant `font-code`, familles ; `data-world-card` sur chaque ligne), puis « + Nouveau monde » au pied (`data-new`), qui ouvre `NewWorldDialog`.
- Après le menu, en 12,5 px `--dim2` : famille(s) compatibles · « N personnages y vivent » (depuis `registry.characterCount`, affiché seulement à partir de 1).

### S3. Sommaire (gauche, 240)

- `.lab` « Sommaire », puis cinq entrées : **Où ?** Lieux · N, **Pour quoi ?** Intentions · N, **Quoi ?** Scènes · N, **Comment ?** Tons · N, **Adultes** branche à part · N.
- La question en 13 px 500, le nom en 12 px `--dim2`, le compte en `font-code`.
- Un clic fait défiler le livret jusqu'au chapitre ; le chapitre visible est marqué (`--panel3` + `inset 2px 0 0 var(--acc)`, `aria-current="true"`).
- `?onglet=lieux|intentions|scenes|tons` (lien des Tons et de la Banque) **ouvre le chapitre** correspondant au montage : même paramètre, lu une fois.

### S4. Livret (centre)

Page bornée à 960 px, padding 18 / 24, chapitres espacés de 28 px.

1. **« Prêt à produire »** : carte `--panel`, puis quatre cases qui se cochent seules : un lieu, une intention, une scène, des tons (facultatif). Case cochée : aplat `--acc` + coche ; vide : bordure `--line2`. Le texte dit l'état, la case n'en est que l'écho.
2. **Ambiance** du monde (`world.tone`) en entier, 13 px `--dim`, plus de cadre ni de troncature. Absente : rien.
3. **Où ?** (`#lieuxBlock`) : titre 17 px 650 + « Lieux · N · des décors, sans action ni lumière » en 12,5 px `--dim2`. Grille `auto-fill minmax(180px,1fr)` de cartes : nom 13 px 600, décor `font-code` 12 px sur deux lignes, « N scènes » (ou « aucune scène »). Carte « + Lieu » en pointillés à la fin.
4. **Pour quoi ?** (`#intentionsBlock`) : cartes nom (avec l'icône de l'intention si elle en a une), fragment sur une ligne, « ton proposé : … », « N scènes ». Carte « + Intention ».
5. **Quoi ?** (`#scenesBlock`) :
   - en tête, la **phrase de création** : « Nouvelle scène : [intention ▾] au [lieu ▾] [Créer] ». Créer appelle `sceneEditor.add()` avec intention et lieu posés, et met le focus dans « Ce qui s'y passe ». Sans lieu ou sans intention : la phrase est désactivée et dit « Il faut d'abord un lieu et une intention », avec un lien vers le chapitre qui manque ;
   - puis les scènes **groupées par intention** (`.lab` du groupe + compte), groupe « Sans intention » en dernier. Carte : nom 13 px 500, « au {lieu} » 12 px `--dim2` (« sans lieu » sinon), niveau minimum s'il y en a un.
6. **Comment ?** (`#tonsBlock`) : cartes nom et fragment (`data-tone-row`). Carte « + Ton ». Vide : `#tonesEmpty` avec le texte actuel.
7. **Adultes** : chapitre **replié par défaut**, qui annonce « N scènes adultes, livrées à part » et un bouton « Afficher ». Déplié : le bandeau `#adulteBanner` (texte actuel), puis ses cartes de scènes et sa phrase de création. `#branchOrdinaires` / `#branchAdultes` migrent vers « Afficher / Masquer » de ce chapitre (même état `branch`).
- **Carte** : `rounded-card`, fond `--panel`, bordure `--line` ; ouverte : 2 px `--acc` ; modifiée non enregistrée : « modifiée » en `--warn-txt` (remplace le point de 9 px). Garder `data-entry-row` sur chaque carte d'entrée. `#btnAddEntry` passe sur la carte « + » du chapitre ouvert (ou migrer ses lecteurs).
- **Monde tout juste créé** (D2) : la carte « Prêt à produire » vide, puis les quatre chapitres en lignes pointillées, dans l'ordre, chacun avec sa phrase et son bouton (« + Premier lieu » primaire, les suivants secondaires) ; « Quoi ? » à 55 % tant qu'il manque un lieu ou une intention, avec la raison en texte.

### S5. Inspecteur (droite, 340)

- **Tête 48** : nom 14 px 650 et, à droite, la nature (« scène », « lieu », « intention », « ton ») en 11,5 px `--dim2`.
- **Scène** : en tête du corps, la **phrase** « {Intention ▾} au {Lieu ▾} », deux menus en pastilles `--panel3` (ce sont les champs `intention` et `place` de `SCENE_SPEC`). Puis « Ce qui s'y passe » (avec « Améliorer » dans sa ligne de libellé, `screen-ameliorer.md`), Niveau minimum, puis « Ce que les personnages reçoivent » (`composedPrompt`).
- **Lieu, intention, ton** : les champs de leur spec (ou `ToneInspector`) en une colonne, puis **« Sert à N scènes »** avec leur liste cliquable.
- **Pied 52** : Retirer (désactivé, avec la raison et la liste, si l'entrée sert encore : remplace le toast de `refuseIfUsed`), et l'identifiant en `font-code` `--dim2` (éditable seulement à la création, « figé, cité par… » dit en aide).

### S6. Moins de 1100 px

Le sommaire tombe : il devient une **rangée de pastilles** collée en haut du livret (mêmes cinq entrées, mêmes comptes). Le livret garde le centre, l'inspecteur reste à 340. Le menu du monde reste dans la barre.

## A : a11y

- Sommaire : `nav` avec liens d'ancre, `aria-current` sur le chapitre visible.
- Chapitres : `section` avec `aria-labelledby` sur leur titre (`h2` réel, habillé à 17 px ; la charte : une balise dit le rang, une classe l'aspect).
- Cartes : `button` avec `aria-pressed` pour l'entrée ouverte ; flèches entre cartes d'un même chapitre (`listKeys`).
- Phrase de création : deux `select` étiquetés (« intention de la nouvelle scène », « lieu de la nouvelle scène »).
- Retirer désactivé : la raison sur l'enveloppe (`data-hint-text`) et en texte sous le bouton.
- Contrastes texte 4,5:1, interface 3:1, vérifiés aussi avec Abyssiaelle. Rayons : cartes et inspecteur en `rounded-card`, pastilles et champs en `rounded-[Npx]`. Aucun 13,5 px, plus de 18 px (15 barre, 17 titres de chapitre).

## Dépendances

Aucune côté serveur. Les quatre catalogues et les tons sont déjà chargés à l'ouverture d'un monde.

## Découpage

```
screens/worlds/
  WorldsScreen.tsx     barre + sommaire + livret + inspecteur ; sélection par défaut ; ?onglet= -> chapitre
  WorldMenu.tsx        menu du monde (remplace WorldList.tsx)
  WorldBook.tsx        le livret : prêt à produire, ambiance, chapitres (remplace CatalogueColumn.tsx)
  BookChapter.tsx      titre, phrase, grille de cartes, carte « + »
  SceneSentence.tsx    « Nouvelle scène : [intention] au [lieu] »
  BookToc.tsx          sommaire, et sa rangée de pastilles sous 1100
  EntryInspector.tsx   tête 48, phrase de scène, « Sert à N scènes », pied 52
  ToneInspector.tsx    même tête et même pied
```

## Critère de sortie

- `typecheck`, `build`, `run_browser_tests.py --only` sur les fumigations des mondes, `test_charte`, `test_cadres_ua` : au vert. Crochets préservés ou migrés dans le même commit : `#worlds`, `#worldPlaces` (sur le livret), `data-world-card`, `data-new`, `#worldPick`, `#lieuxBlock`, `#intentionsBlock`, `#scenesBlock`, `#tonsBlock`, `#branchOrdinaires`, `#branchAdultes`, `#adulteBanner`, `data-entry-row`, `data-tone-row`, `#tonesEmpty`, `#btnAddEntry`.
- Audit `audit-ux-ui` **en vrai**, captures à 1440 et 1024, DOM mesuré, avec Léna (Slow life) puis Abyssiaelle (son monde) :
  - création d'un monde, puis premier lieu, première intention, première scène par la phrase : compter les clics contre le constat 6 ;
  - ouverture d'une scène, changement de son lieu par la phrase de l'inspecteur (elle change de carte « au … ») ;
  - lieu utilisé : Retirer désactivé avec la liste ; lieu libre : confirmation actuelle ;
  - branche adulte repliée (compte seul), dépliée, première scène adulte, dernière retirée ;
  - modification non enregistrée puis changement de monde (garde de sortie) ; Ctrl S ;
  - `?onglet=tons` depuis l'atelier des Tons ;
  - à 1024 : sommaire en pastilles, rien de caché.

---

## Écarts assumés à l'implémentation (2026-09-27)

1. **Le sommaire suit le défilement par un calcul sur `scroll`**, pas par un `IntersectionObserver` : le chapitre marqué est le premier dont le bas passe sous une ligne au tiers du livret (120 px au plus). Un clic du sommaire garde la main 250 ms, sinon un chapitre court en fin de livret ne serait jamais marqué. Le défilement règle `scrollTop` à la main, jamais `scrollIntoView`.
2. **Pas de carte « + Scène »** : la phrase de création est le seul geste de création d'une scène, et c'est son bouton Créer qui porte `#btnAddEntry` quand le chapitre Scènes est ouvert.
3. **La phrase pose un nom** « {intention} au {lieu} », et un identifiant rendu unique par `_2`, `_3` (`slugify.freeId`, testé) : sans nom, l'enregistrement aurait refusé une scène sans identifiant. Le nom reste à réécrire.
4. **Échap et un retrait retombent sur la sélection par défaut**, dans le chapitre ouvert d'abord : l'inspecteur n'est jamais vide.
5. **« Sert à N scènes » ne nomme une scène adulte que si le chapitre Adultes est déplié** ; replié, il les compte (« et N scènes adultes »). Même règle pour la raison de Retirer désactivé.
6. **Le Retirer d'un ton reste actif** : retirer un ton ne casse aucune scène. Sa liste « Sert à » informe seulement.
7. **`test_cadres_ua`** sonde le menu du monde (`#worldPick` → `#worldMenu`) à la place de la modale « Nouveau monde », désormais à deux clics ; la modale reste couverte par `test_worlds`.

## Ce que les mesures ont tranché

| Mesure | Avant | Après |
|---|---|---|
| Barre d'écran | aucune | 48 px |
| Colonnes à 1440 | 260 / 400 / 780 | 240 / 860 / 340 |
| Colonnes à 1024 | 0 / 340 / 684 | pastilles / 684 / 340, document = vue |
| Inspecteur vide à l'ouverture | 54 % de l'écran à 1440 | toujours une entrée (la première scène) |
| Porteurs 13,5 px / 18 px | 23 / 1 | 0 / 0 |
| Clics d'un monde vide à sa première scène | 9 | 5 |
| Contraste le plus bas (Léna, Abyssiaelle) | 5,48:1 (registre et catalogue seuls, 25/09) | 4,27:1 trouvé à l'audit (`--dim2` sur la ligne courante du sommaire), corrigé en `--dim` : 4,56:1 |
