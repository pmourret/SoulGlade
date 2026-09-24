# Écran 6 bis : Composeur de scène, les sept panneaux

Périmètre validé par l'utilisateur le 2026-09-24. Maquette : `Revue UX 06b - Composeur de prompt.dc.html`. Options retenues : **1b, 2a, 3b, 4a, 5a, 6a, 7a + diff côte à côte**.

**Prérequis** : design-pass 06 (`screen-7b-composeur-refonte.md`) livré : rail à libellés, formulaire borné à 880 px, aperçu vivant, `DirtyBar`.

Ce design-pass ne touche **que le contenu des panneaux** de `composer/SceneComposer.tsx`. Le cadre (liste, `SceneHeader`, `SectionRail`, `ScenePreviewPanel`) ne change pas.

## Invariants

- **Un seul assembleur** : `composePrompt` (et `build_jobs` côté serveur). Les vues colorées passent par `sceneFragments`, jamais par une concaténation locale.
- `scenes.json` inchangé : `prompt` reste une chaîne. `promptBase`, `promptLight`, `promptPose` restent des fragments de brouillon.
- `wardrobe` reste le texte plat « N: description » ; `splitWardrobeByLevel` / `joinWardrobeByLevel` restent l'aller-retour, dérivé à chaque rendu, jamais stocké.
- ADR-0015 : scène liée à un lieu, décor, lumière et prose de pose verrouillés avec le `lockedNote` existant ; `wardrobe` et `pose` restent éditables.
- Champ modifié : bordure `--warn`. Repères : décor `--acc`, lumière `--frag-light`, pose `--frag-pose`. Seules teintes ajoutées : `--diff-add-*` et `--diff-del-*` (voir 7), à déclarer dans `tokens.css`.
- Aucun champ du modèle ajouté ni retiré. Aucune valeur en dur hors `tokens.css`.

## 1. Général (option 1b)

1. **Carte d'identité** (`--panel`, filet `--line`) :
   - identifiant en champ 17 px 600 mono, pleine largeur de la carte ;
   - intention en pastille arrondie à droite (même `<select>`, restylé ; désactivée et annotée « héritée du lieu » si lié) ;
   - sous la ligne, 12 px `--dim2` « nom de fichier et d'export ». Si l'id diffère de l'enregistré **et** `produced > 0` : texte `--warn-txt` « N images produites seront détachées si tu enregistres ce nom ».
2. **Trois tuiles** de même hauteur, grille `1.5fr .8fr 1fr` :
   - **Format** : quatre cadres dessinés à la proportion (4:5, 2:3, 9:16, 1:1), boutons `aria-pressed`, actif bordure `--acc` + fond `--acc` à 10 %. Remplace le `<select>`.
   - **Images par passage** : pas à pas − / valeur 32 px / +, min 1. Remplace l'input nombre.
   - **Niveaux** : échelle verticale 3 → 0. Crans `bandLo..band[1]` remplis `--acc`. Clic sur un cran = nouveau `bandLo`. Étiquettes « minimum » et « plafond ». Le plafond reste **déduit** (`bandOf`), un clic sur l'étiquette « plafond » ouvre l'onglet Vêtements (remplace `BandGauge` et l'input `band_lo`). `InfoHint` existant conservé.
3. **Tons affins** : puces bascule issues de `creative.tones` (clé affichée). Une clé présente dans la scène mais absente de `creative` reste affichée (même règle que `intentionOptions`). La valeur écrite reste la chaîne à virgules.
4. **Tags** : saisie de puces (Entrée ou virgule valide, × retire). Valeur écrite inchangée.
5. **Réglages avancés** : disclosure fermé par défaut, résumé « guidance : réglage du studio » ou la valeur. Dedans, l'input guidance, placeholder « studio », aide « vide = réglage du studio ».

## 2. Lumière (option 2a)

1. **Fil de contexte** au-dessus du champ : trois cases « décor , **lumière · ici** , pose », texte des voisins tronqué, repères de couleur. Données : `sceneFragments(draft)`. Case d'un voisin cliquable → son onglet (décor → Décor et prompt).
2. `PromptField` lumière, libellé « Lumière de la scène », compteur de caractères à droite, mention « modifié » `--warn-txt` si changé. Agrandir / vider inchangés.
3. **Variantes** : liste, une ligne par variante (n°, texte éditable en place, ×), dernière ligne « + Ajouter une variante ». Sous-titre « alternatives à la lumière de base, jamais une tenue ». Stockage inchangé : `draft.variants`, une variante par ligne.
4. Catalogue de templates : remplacé par une ligne 12 px `--dim2` « Templates de lumière réutilisables : bientôt ». `EmptyCatalog` n'est plus utilisé ici.

## 3. Vêtements (option 3b)

1. Ligne de modèle : « champ wardrobe · jamais dans le prompt : ajouté à la génération selon le niveau ».
2. Grille `300px | 1fr` :
   - **Catalogue** (gauche) : recherche, filtres de catégorie en puces (`WARDROBE_CATALOG`), grille 3 colonnes de tuiles carrées (zone vignette hachurée réservée + libellé 10,5 px).
   - **Niveau actif** (droite) : segmenté 0 · 1 · 2 · 3, point sous chaque niveau renseigné, « plafond : niveau N » à droite. Défaut : `bandLo` (comme aujourd'hui).
3. **Un clic sur une pièce l'ajoute au niveau actif.** Cela remplace le parcours en deux temps (sélection puis +). Garde-fous qui répondent au motif de l'ancien choix (« un mauvais clic passe inaperçu ») :
   - la ligne ajoutée apparaît surlignée (`--warn-bg`, bordure `--warn`, mention « ajoutée ») pendant 3 s ;
   - toast « Ajoutée au niveau N · Annuler » (retire exactement cette ligne) ;
   - `Ctrl Z` n'est pas requis.
4. Le niveau actif liste ses pièces (une ligne de `wardrobe` = une rangée, texte éditable, ×) et une rangée « Saisir une pièce libre ».
5. Sous le niveau actif, résumé 12 px des trois autres niveaux ; niveau vide : « vide : reprend le niveau 0 ». Clic = devient actif.
6. **Lignes sans niveau** (`extra`) : puisque 5a retire le miroir brut, elles s'affichent ici dans un bloc `--warn` « N lignes sans niveau reconnu » avec, par ligne, un choix « niveau 0…3 » ou « supprimer ». Jamais effacées en silence.

## 4. Pose (option 4a)

1. Deux colonnes égales, titrées en capitales 10,5 px `--dim2` :
   - **« En mots · rejoint le prompt »** : `PromptField` `prompt_pose`, filet gauche `--frag-pose`, aide sous le champ « Décris la pose. Les deux peuvent coexister : la prose guide, le squelette impose. »
   - **« En squelette · imposé, option »** : carte avec aperçu 112×140 (`/img/pose?name=`), libellé humain (`label || name`), nom de fichier en mono `--dim2`, pastille « cran SFW uniquement », boutons Retoucher (ouvre `PoseEditorModal` existant), Changer, Retirer (`pose: ''`). Sous la carte : « Un squelette de dos ou de profil peut ne pas être suivi : vérifier à l'œil. »
   - Sans squelette : la carte montre « Aucun squelette » et un bouton « Choisir ».
2. **Changer de squelette** : bande horizontale défilante sous un filet, ouverte par « Changer » (ouverte d'office si aucun squelette). Tuiles 76×92 avec libellé : aucune, les poses, « + nouvelle » (`NewPoseDialog` existant). Lien « Éditeur de pose » à droite.

## 5. Décor et prompt (option 5a)

1. Le panneau `recap` se renomme **« Décor et prompt »** (libellé du rail et titre ; clé `recap` inchangée).
2. Chaîne numérotée 1, 2, 3 (pastilles à la couleur du fragment) :
   - **1 Décor, cadrage** : `PromptField` `prompt_base` en grand, seul champ éditable du panneau. Aide en ligne « ne décris jamais le visage : le verrou d'identité le porte ».
   - **2 Lumière**, **3 Pose** : rangées compactes en lecture (texte tronqué) + « Modifier » qui ouvre leur onglet. Les `PromptField` miroirs `prompt_light_recap` / `prompt_pose_recap` sont retirés.
3. Le miroir brut `wardrobe_recap` est **retiré** (voir 3.6 pour les lignes sans niveau).
4. **Prompt enregistré** : carte unique, « N car. », « Copier », texte coloré par fragment via `sceneFragments`. Remplace `ComposedPromptPreview` + la zone en lecture seule. La valeur copiée est `composePrompt(draft)`.
5. Ligne finale : « Ajouté à la génération, hors de ce prompt : tenue du niveau demandé (lien Vêtements) · verrou d'identité ».

## 6. Amélioration IA (option 6a)

**Dépendance serveur** : une route qui renvoie `{ base, light, pose }` réécrits à partir des trois fragments et d'une consigne. **Hors périmètre de ce chantier.**

À livrer maintenant :
1. La mise en page : consigne (input), raccourcis en puces (Plus naturel, Plus court, Plus précis sur la lumière, Style photo amateur : remplissent la consigne), « Proposer ».
2. Zone de comparaison **Actuel / Proposé** construite sur le composant de diff de 7 (`WordDiff`), mots retirés barrés `--diff-del-*`, ajoutés surlignés `--diff-add-*`. Ligne « N fragments changent : … ». Actions Rejeter, Proposer autre chose, **Appliquer** (écrit les trois fragments dans le brouillon via `onPatch` ; rien n'est enregistré).
3. **État actuel non branché** : consigne, puces et « Proposer » désactivés, message « Arrivera avec le branchement du modèle ». La zone de comparaison n'est pas rendue (pas de zones vides). Le bouton « Sauvegarder le prompt IA » disparaît.

## 7. JSON final (option 7a + diff)

1. En-tête : segmenté **Tout · Comparer · N** (N = lignes changées), « Copier » (aria-label « Copier le JSON final » conservé).
2. **Tout** : bloc de code `--bg-deep`, numéros de ligne `--dim3`, clés `--dim`, chaînes `--txt`, nombres `--acc`. Lignes qui diffèrent de la version enregistrée : barre gauche 3 px `--warn` + fond `--warn-bg`.
3. **Comparer** : diff façon revue de code.
   - Bandeau de fichier : id de scène, `+N` `--good`, `−N` `--diff-del-txt`, cinq carrés de proportion, segmenté **Côte à côte · Unifié** (préférence en `localStorage`).
   - Côte à côte : colonnes « Enregistré · scenes.json » / « Brouillon », numéros de ligne des deux côtés, signes − / +, fond de ligne `--diff-del-bg` / `--diff-add-bg`, **mots changés** surlignés `--diff-del-word` / `--diff-add-word`. Ligne absente d'un côté : fond `--panel-deep`.
   - Unifié : une colonne, deux gouttières de numéros.
   - Lignes inchangées repliées par paquets (3 lignes de contexte), bandeau `--info-bg` « ⋯ N lignes inchangées (clés) », clic = déplie.
   - Clic sur une ligne modifiée : ouvre la section qui produit la clé (`prompt` → section du fragment changé, `variants` → Lumière, `wardrobe` → Vêtements, `pose` → Pose, le reste → Général).
   - Scène jamais enregistrée : tout en ajout. Aucune modification : « Identique à la version enregistrée ».
4. Source : `JSON.stringify(draftsToScenes([draft])[0], null, 2)` contre la même sérialisation de la scène enregistrée (déjà disponible pour `sceneChanges`). Diff **côté client** : lignes (LCS) puis mots dans les lignes appariées. Petit utilitaire interne `ui/src/lib/diff.ts` (pas de dépendance npm sans accord).
5. Pied : « Annuler les modifications » (même action que le bandeau) et **Enregistrer** (même mot que le bandeau ; remplace « Sauvegarder »).

## A : a11y

- Tuiles format, crans de niveau, puces de tons : `button` + `aria-pressed`. Échelle de niveaux : `aria-label` « Niveau N, minimum » etc.
- Segmentés (niveau actif, Tout/Comparer, Côte à côte/Unifié) : `role="radiogroup"`.
- Diff : chaque ligne porte un texte masqué « supprimé » / « ajouté » ; la couleur n'est jamais seule (signes − / +).
- Toast « Annuler » atteignable au clavier, 6 s minimum.
- Contraste ≥ 4,5:1 pour tout texte sur les fonds diff.

## Découpage

```
screens/bank/composer/
  SceneComposer.tsx        routage des panneaux (inchangé)
  panels/GeneralPanel.tsx  1b
  panels/LightPanel.tsx    2a
  panels/ClothingPanel.tsx 3b
  panels/PosePanel.tsx     4a
  panels/RecapPanel.tsx    5a
  panels/AiPanel.tsx       6a (état non branché)
  panels/JsonPanel.tsx     7a + diff
  FragmentTrail.tsx        fil de contexte (2a)
  WordDiff.tsx             diff côte à côte / unifié (6a, 7a)
lib/diff.ts                LCS lignes + mots
```

## Hors périmètre

Route IA (6), catalogue illustré de vêtements, templates de lumière, tout changement serveur ou de `scenes.json`.

## Critère de sortie

- `typecheck`, `build`, `test_bank.js` verts. Sélecteurs préservés ou migrés dans le même commit : `data-f` des champs (`id`, `intention`, `format`, `count`, `guidance`, `band_lo`, `tones`, `tags`, `variants`, `wardrobe_N`, `pose`, `prompt_*`), « Copier le JSON final ». `prompt_light_recap`, `prompt_pose_recap`, `wardrobe_recap` retirés : tests adaptés.
- Tests unitaires de `lib/diff.ts` (ajout, retrait, modification de mots, fichier identique, scène neuve).
- Audit `audit-ux-ui` en vrai, captures à 1440 et 1024 : chaque panneau ; scène liée au monde ; id renommé avec images produites ; ajout de pièce + Annuler ; lignes sans niveau ; squelette absent ; diff côte à côte et unifié ; scène jamais enregistrée ; IA non branchée.

## Écarts assumés, et ce que l'audit a corrigé (livré le 2026-09-24)

Trois écarts sur la lettre de la spec :

1. **Les jetons.** Six ajoutés, pas onze : `--diff-add-*` et `--diff-del-*`.
   `--bg-deep`, `--dim3`, `--panel-deep`, `--good` et `--info-bg` ont déjà
   leur équivalent (`--panel` + filet, `--dim2`, `--bg`, `--ok`, `--panel2`),
   et une famille privée pour un seul panneau est ce que la charte évite.
   Validé avec l'utilisateur avant d'écrire.
2. **§7.1, la pastille du segmenté.** Elle compte les **lignes** qui diffèrent,
   pas la somme des deux compteurs : le bandeau dit déjà « +2 −2 », et une
   pastille à 4 en face donnait deux chiffres qui se contredisent pour un
   même fait.
3. **§3.6, le bloc des lignes hors niveaux.** Sa phrase couvre deux cas, pas
   un : un niveau au-delà de 3 s'enregistre sans broncher mais n'apparaît
   dans aucun des quatre champs, tandis qu'une ligne sans niveau du tout fait
   refuser l'enregistrement. Depuis la validation de banque côté serveur, le
   second cas ne peut plus venir que d'un fichier édité à la main.

Cinq correctifs nés de l'audit, tous mesurés à l'exécution :

- les lignes du diff s'enroulent au lieu d'être coupées : la ligne `prompt`,
  celle qu'on vient comparer, se faisait trancher au bord d'une colonne de
  300 px ;
- les étiquettes de l'échelle de niveaux se posent **sur la ligne du cran**
  qu'elles nomment ; aux deux extrémités, « plafond » se lisait comme le nom
  du cran du haut, qui n'est pas le plafond dès que la scène s'arrête plus
  bas. Un plafond au-delà de 3 se pose sur le cran du haut avec son vrai
  chiffre, au lieu de disparaître ;
- ranger une ligne hors niveaux **retire son ancien préfixe** : sans ça, la
  jointure reposait le sien par-dessus (« 2: 4: a linen dress ») ;
- une tuile de pose sans image ne répète plus son mot dans le carré **et**
  dessous ;
- le `<button>` de catégorie du catalogue déclarait sa bordure mais pas son
  fond, et retombait donc sur la face grise du navigateur. Trouvé par le
  sous-agent `gardien-invariants` : `test_cadres_ua` ne balaie que l'état de
  repos des écrans, où le composeur n'est pas monté. C'est exactement le trou
  consigné à IT-9 le 24/09.

Le modèle et les données n'ont pas bougé : `scenes.json` porte toujours une
chaîne `prompt`, `wardrobe` reste le texte plat « N: description », et
`composePrompt` reste le seul assembleur.
