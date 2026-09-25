# Design system du tableau de bord

Deux couches, deux responsabilités (`.claude/rules/frontend.md`) :

| Fichier | Rôle | Change d'un univers à l'autre ? |
|---|---|---|
| `styles/tokens.css` | **identité visuelle** : palette, typographie, forme | **oui** — c'est le seul fichier qu'un univers redéfinit |
| `styles/base.css` | reset, barres de défilement, primitives de bouton | non |
| `styles/chrome.css` | surfaces permanentes (en-tête, navbar, rail, bandeaux, modales) | non |
| `styles/screens.css` | ce que plusieurs écrans partagent (segments, tables, vides) | non |
| `styles/theme.css` | le pont entre les jetons et les espaces de noms Tailwind | non — il ne déclare aucune valeur |

Ils sont importés dans cet ordre par `src/main.tsx`, `theme.css` en **dernier**
(voir son en-tête : les utilitaires y sont non-calqués, donc départagés par
l'ordre).

*Mis à jour le 31/08/2026 :* il n'y a **plus de feuille d'écran**. La ligne
`screens/<écran>/*.css` — et la phrase qui disait qu'un écran importait la
sienne, donc chargée après les feuilles communes — décrivaient les sept
feuilles d'écran de la migration React. Elles sont passées une à une en
utilitaires Tailwind ; la mise en page d'un écran vit désormais **à côté de son
balisage**, dans son `.tsx`. Ce qui était partagé par plusieurs écrans est
remonté dans `screens.css` (segments, `.meta`, `.kbd`, `details.adv`, `.chips`,
`.it` + `.intents`, `.launch`) ou dans `base.css` (`.btn.danger`, `a.btn`,
`@keyframes wizspin`). La phrase sur l'ordre de chargement était de toute façon
fausse : `main.tsx` importe `App` avant toute CSS, donc les feuilles d'écran
atterrissaient en PREMIER dans le bundle, pas en dernier.

> Migration React du 30/08/2026 : `components.css` et le `screens.css` unique de
> l'ancien frontend ont été répartis entre `styles/chrome.css` (ce qui est
> permanent) et les feuilles d'écran (ce qui ne l'est pas). Le contrat de tokens
> ci-dessous n'a pas bougé — c'est lui qui rendait le découpage possible.

## Contrat de tokens

`base/components/screens` ne référencent l'identité visuelle **que** par
`var(--…)`. Aucune valeur en dur qui encoderait un choix de style.

*Mis à jour le 03/09/2026 (Phase 0, `DOCS/design-pass/.old/phase-0-tokens`,
amendée le même jour par la Phase 0b, `DOCS/design-pass/
phase-0b-theme-utilisateur.md`) :* un pack ne fournit plus un `tokens.css`
séparé — le personnage est un state React qu'on bascule sans recharger la
page (§ ci-dessus), donc un import statique unique ne peut pas porter
plusieurs identités. Un habillage de pack vit dans **le même** `tokens.css`,
comme un bloc `:root[data-pack="<id>"]{…}` — mais depuis la Phase 0b, ce bloc
ne redéclare plus que `--r` (rayon des cartes). Neutre, accent, `--focus` et
les barres de défilement ne varient plus PAR PACK ; ils restent à la valeur
de plateforme sur `:root` nu jusqu'à ce qu'un **personnage** les
personnalise (§ ci-dessous). Verdicts, bandeaux, profondeur, typographie,
`--maxw` restent volontairement identiques quel que soit le pack ET le
personnage — signal de sécurité, pas une ambiance. `chrome/usePackTheme.ts`
pose l'attribut `data-pack` sur `<html>` (jamais sur le shell `.app` : un
portail vers `<body>`, comme l'écran de panne de `ApplicationScreen.tsx`,
doit résoudre les mêmes tokens). Absent — sas, `#registre`, wizard avant que
le pack soit résolu — la feuille retombe sur les valeurs communes de
`:root`, jamais un nom d'écran en dur.

**Personnalisation par personnage (Phase 0b, 03/09/2026).** Neutre (fond,
lignes, texte) et accent sont détachés du pack et personnalisables **par
personnage** — panneau « Apparence » de l'écran Application
(`screens/AppearanceSection.tsx`), donnée `character.json / appearance`
(`{neutral_hue, neutral_intensity, accent_hue}`, tous optionnels — absent =
défaut de plateforme, teinte 220°, intensité 0). `chrome/useCharacterTheme.ts`
(sœur de `usePackTheme.ts`, montée dans `chrome/Shell.tsx`) calcule les 12
tokens dérivés en OKLCH (`chrome/theme/deriveTheme.ts`) et les pose en
`style.setProperty` inline sur `<html>` — jamais quand `appearance` est
entièrement absent : ce chemin ne s'active qu'au premier champ renseigné,
pour que « rien de personnalisé » reste au pixel près ce que `tokens.css`
affiche déjà (voir le commentaire de tête de ce fichier). L'écran Application
prévisualise en direct (avant tout Enregistrer) le même calcul, jamais
persisté tant que le bouton n'est pas actionné.

### Jetonné

- **Palette** — fonds (`--bg`, `--sub`, `--panel`, `--panel2`, `--panel3`),
  lignes (`--line`, `--line2`), textes (`--txt`, `--dim`, `--dim2`), accent
  (`--acc`, `--acc-d`, `--on-acc` = texte posé sur un aplat clair), verdicts
  (`--ok`, `--warn`, `--bad`, `--bad-lift`, `--high`, `--none`).
  *Élargie le 23/09/2026 :* `--sub` (fond de la sous-barre de modules) et
  `--panel3` (élément courant, fond d'avatar) complètent l'échelle neutre que
  le chrome à catégories demande ; `--bad-lift` est `--bad` remonté pour le
  petit texte des sondes.
- **Bouton principal** *(23/09/2026)* — `--pri` / `--pri-h` (survol) /
  `--on-pri`. `.btn.primary` peignait un aplat de `--acc` : ça posait la
  couleur la plus forte de l'interface sur un **contrôle** alors que la seule
  couleur de l'écran doit être l'image produite. `--acc` ne marque plus que la
  sélection, l'emplacement courant et l'avatar.
- **Familles de bandeau** — avertissement (`--warn-bg` / `--warn-line` /
  `--warn-txt`), danger (`--danger-bg` / `--danger-line` / `--danger-txt`),
  pastille « mesuré » (`--mes-bg` / `--mes-line`).
- **Profondeur** *(ajouté le 29/08/2026)* — `--elev` (ombre unique de toute
  surface qui flotte : `.idmenu`, `#gearPanel`, `.launch .inner`, `.ap`,
  `#toast`, `.card` des `<dialog>`), `--scrim` (voile posé sur du contenu :
  `::backdrop`, `#lightbox`, et les plaques sur vignette — `.sc .aff`, `.tick`,
  `.nav`, `.posebadge`, `.posecard .del`), `--focus` (anneau `:focus-visible`).
- **Barres de défilement** *(ajouté le 30/08/2026)* — `--sb` (pouce), `--sb-h`
  (pouce survolé), `--sb-l` (largeur). Elles étaient les seules surfaces non
  peintes du studio : le thème de l'OS s'invitait sur une douzaine de zones
  défilantes. Une seule règle dans `base.css`, piste transparente, pouce à
  gouttière — une barre qui flotte masquerait la fin des libellés au survol.
  Le pouce est un **composant d'interface** : contraste non-textuel ≥ 3:1
  (WCAG 1.4.11) contre `--bg`, `--panel` **et** `--panel2`, les trois fonds où
  il apparaît. Mesuré : 3,93 / 3,60 / 3,16.
- **Traces** *(ajouté le 25/09/2026, design-pass écran 10)* — `--graph` (barres
  d'un histogramme sur `--panel`), `--tick` (repère de neutre sur la piste d'un
  curseur). Deux gris plus sourds que `--line2`, et la seule famille de jetons
  à laquelle **aucun seuil de contraste ne s'applique** : ce ne sont ni du
  texte, ni ce qui identifie un contrôle ou son état. Un curseur dit sa valeur
  par son pouce, son remplissage et son nombre ; le repère est un repère de
  lecture, pas l'information. Ils sont ici et pas en dur dans leurs deux
  composants pour la raison habituelle : un univers qui reteint le studio doit
  les reteindre sans rouvrir un fichier de composant.
- **Typographie** — `--font` (texte courant), `--font-mono` (`.kbd`, raccourcis).
- **Forme** — `--r` (rayon des cartes), `--maxw` (largeur max du contenu centré).
  `--maxw` ne gouverne plus **tous** les écrans depuis le 29/08/2026 : Créer est
  passé en pleine largeur (voir ci-dessous). Les écrans-listes (registre, banque,
  revue, réglages, wizard) le gardent.

### Laissé brut, et pourquoi

- **Mouvement** — les deux seules durées de transition de l'inspecteur (fondu
  d'image `.28s`, barre de progression `.5s`) restent en dur : le bloc
  `prefers-reduced-motion` de `base.css` les écrase toutes, il n'y a rien qu'un
  univers voudrait redéfinir ici.
- **Détails de contrôle** — `0 1px 4px` du pouce de curseur, `0 2px 8px` de la
  pastille de score. Ce ne sont pas des surfaces flottantes : elles ne relèvent
  pas de `--elev`, qui les écraserait sous une ombre de menu.
- **Voile du cadre de recadrage** (`#edCropBox`, 40 %) — volontairement plus
  clair que `--scrim` : on doit voir l'image **hors** du cadre. Le passer au
  scrim serait une régression fonctionnelle de l'éditeur.
- **Liseré clair des pastilles cochées** (`#ffffff55`) — aucune famille de
  jetons ne décrit un rehaut clair ; en inventer une pour deux occurrences
  coûterait plus qu'elle ne rend.
- **Ambiances ponctuelles** — dégradé du composeur (désormais sur `--panel2`),
  surlignage de la scène dans l'aperçu de prompt, fond du journal technique,
  fond de vignette, bleu du badge « pose », noirs neutres des cadres image et
  du plan de travail de l'éditeur. Leurs valeurs ont été **retintées** avec la
  palette « Chambre noire » : elles étaient chaudes et faisaient des taches
  brunes sur le fond froid. Un univers qui les veut autrement les reprend ici.
- **Rayons secondaires** — les `border-radius` des contrôles (7–9 px) et pilules
  (20 px) restent en dur ; seul `--r` (cartes) est jetonné.

### Contrastes

Les valeurs de `tokens.css` sont vérifiées au ratio WCAG **contre les fonds où
elles servent réellement** — `--warn` porte du texte de 9,5 px sur `--warn-bg`,
`--dim` porte `#panneBar span` sur `--danger-bg`, etc. Une nouvelle palette
d'univers doit refaire ce contrôle : un jeu de couleurs cohérent à l'œil peut
très bien passer sous le seuil.

*Rejoué le 23/09/2026* sur la palette graphite, contre les cinq fonds
(`--bg` / `--sub` / `--panel` / `--panel2` / `--panel3`) :

| | `--bg` | `--panel` | `--panel2` | `--panel3` | `--sub` |
|---|---|---|---|---|---|
| `--txt` | 15,04 | 13,91 | 12,51 | 11,71 | 14,49 |
| `--dim` | 7,57 | 7,00 | 6,30 | 5,90 | 7,29 |
| `--dim2` | 5,48 | 5,07 | 4,56 | **4,27** | 5,28 |

Tout texte est à 4,5:1 ou mieux, **à une exception nommée** : `--dim2` sur
`--panel3` tombe à 4,27. `--panel3` ne porte pas de texte secondaire — c'est le
fond de l'avatar (initiale en `--acc`) et de l'élément courant d'un menu. Ne
pas y poser de `--dim2` sans remonter le jeton.

Non textuel, seuil 3:1 : `--acc` va de 6,28 à 8,06, `--focus` de 8,57 à 11,00,
et le pouce de barre de défilement (`--sb`, repassé au gris neutre) mesure
3,83 / 3,54 / 3,19 contre `--bg` / `--panel` / `--panel2` — les ratios d'avant
(3,93 / 3,60 / 3,16) à la teinte près. `--bad-lift` (7,61 sur `--panel`) est
`--bad` remonté pour le petit texte des sondes, où le rouge de verdict lisait
plus terne que le `--warn` voisin et inversait l'alarme.

### Header

**48 px depuis le 23/09/2026** (était 56). Le header a **repris la
navigation** : les destinations que le 29/08 avait envoyées dans une navbar
latérale reviennent sous forme de **trois catégories** (ci-dessous), et ce qui
part en échange est tout ce qui identifiait le personnage une deuxième fois.
De gauche à droite : la marque + un filet, la carte d'identité, la pastille
« ADULTE ARMÉ » si le personnage l'est, les catégories centrées, la zone
d'état.

`brand-id` et les deux `brand-tag` (type, monde) **ne sont plus dans le
header** : ils forment la première ligne du menu d'identité (`.idmenu-head`),
où on les lit quand on se demande sur qui on travaille, au lieu de les porter
en permanence dans chaque capture d'écran.

Le header n'hérite pas de `--font` : ses zones ont des tailles propres
(13 / 13,5 / 12,5 px). Sous 1100 px il se replie **du plus contextuel au plus
identifiant** : la marque disparaît, puis la deuxième ligne de la carte
d'identité (« type · monde »), puis deux sondes sur trois — VRAM reste, c'est
celle dont une génération manque. Le **nom du personnage** ne disparaît jamais,
et les catégories et modules **gardent leurs libellés** : pas de hamburger.

La zone d'état porte, dans cet ordre : le lot en cours et son « Arrêter »
(`#btnHeaderStopBatch`), la sonde ComfyUI (`#dot` + `#stTxt`), les trois sondes
machine, le bouton Application, et **un** bouton ⏻ qui ouvre un menu de deux
items (`#btnHeaderComfyStop`, `#btnHeaderAppStop`). Ces deux-là étaient deux
boutons icône côte à côte : deux glyphes d'alimentation identiques que seul
l'`aria-label` distinguait.

## Catégories et sous-barre de modules

*Remplace « La navbar latérale » le 23/09/2026 (`DOCS/design-pass/
screen-0-chrome.md`, option 2a).* La navbar de 208 px listait huit
destinations à plat : elle donnait le même poids à « produire une image » et à
« éditer un monde », et dépensait un cinquième d'un écran de 1024 px à dire où
l'on **pourrait** aller plutôt qu'à montrer ce qu'on fait. Les deux barres qui
la remplacent tiennent dans du chrome qui existait déjà, pour **0 px** de
largeur.

| Barre | Où | Contenu |
|---|---|---|
| `.tabs` (`CategoryBar.tsx`) | dans le header, centrée | les **trois catégories** |
| `.modbar` (`ModuleBar.tsx`) | sous le header, 34 px | les **modules de la catégorie ouverte** |

Trois catégories, dans cet ordre : **Production** (Produire, Revue, Galerie),
**Atelier** (Ateliers, Entraînement), **Référentiel** (Fiche, Mondes).
**Application en est sortie** : c'est un réglage de chrome, pas un lieu où l'on
travaille, et la lister à côté de « Produire » lui donnait le même poids. Elle
est un bouton icône de la zone d'état ; ses routes `/app` et `/app/journal`
existent toujours et l'allument par `aria-current`, aucune catégorie ne
s'éclairant alors.

### Le contrat de navigation, à deux grains

`.tabs` **garde son nom** — c'est le contrat — mais change de grain, et
`data-s` avec lui :

    data-s  sur une CATÉGORIE  -> `production` | `atelier` | `referentiel`
    data-m  sur un MODULE      -> la ScreenKey (sept valeurs)

Les sept modules **ne sont pas dans le DOM en même temps** : seuls ceux de la
catégorie ouverte le sont, plus ceux du menu déroulant ouvert. Une fumigation
qui veut les sept ouvre les trois menus (voir `test_journal.js` [2]).

La table `DESTINATIONS` d'`app/routes.ts` reste la seule source : chaque entrée
porte sa `category`, `activeCategory(pathname)` **dérive** la catégorie ouverte
de `isDestinationActive`, et rien n'est stocké dans un state parallèle — deux
sources de « où suis-je » divergent dès la première navigation qui ne passe pas
par la barre (lien profond, bouton retour, saut depuis l'inspecteur).

### Le pointeur et le clavier ne font pas la même chose

C'est délibéré, et c'est ce qui permet au bouton de catégorie d'être à la fois
un menu et une destination :

| Geste | Effet |
|---|---|
| survol d'une catégorie inactive | ouvre son menu (220 px) |
| clic | ouvre son **premier module** |
| Entrée / Espace / ↓ | ouvre le menu et y pose le focus |
| Échap | ferme, focus rendu au déclencheur |

Le gestionnaire clavier appelle `preventDefault()` : c'est ce qui empêche le
navigateur de synthétiser le clic qui, sinon, naviguerait. Une catégorie
**active** n'ouvre pas de menu au survol — ses modules sont déjà dans la
sous-barre juste en dessous.

### Ce que chaque barre marque, et pourquoi pas la même chose

- catégorie active : `--txt`, 600, `inset 0 -2px 0 var(--acc)` ;
- module actif : `--txt`, 600, `inset 0 -2px 0 var(--txt)`.

L'accent marque déjà la catégorie ; le reprendre une ligne plus bas dessinerait
**un seul signal deux fois**, et « où suis-je » se lirait comme deux réponses
en concurrence. Dans les deux cas c'est une **forme et une position**, pas
seulement une teinte (le statut n'est jamais porté par la couleur seule).

### Le compteur A_REVOIR

`#nTri` est un **id**, donc exactement un nœud le porte. Il vit sur le module
Revue tant que Production est ouverte, et **monte sur la catégorie Production**
sinon : un compteur dit qu'un travail **attend**, ce dont on a le plus besoin
justement quand on regarde ailleurs. À zéro il n'est pas rendu.

### États

| État | Catégories | Sous-barre |
|---|---|---|
| personnage chargé | visibles | visible |
| sas (`.no-character`) | **absentes** | **absente** |
| `body.focus` | header masqué, donc absentes | **reste**, et prend le mini-état (`#dot`, `3/8`) et la sortie |
| sous 1100 px | visibles, libellés compris | visible, libellés compris |
| éditeur photo (`body.editing`) | présentes, sous le voile de la modale | idem |

**Le mode focus est la raison pour laquelle `#btnFocus` vit dans la
sous-barre** et non dans le header ni dans le menu d'identité : le header
disparaît en focus, donc un bouton posé là serait atteignable pour **entrer**
dans le mode et absent pour en **sortir**.

### Ce qui est parti avec la navbar

Le repli. `#btnNavPli`, `#pliLab`, la clé `studio.nav-mince`, la classe
`.icons-only` et le `navCollapsed` / `toggleNav` de `ChromeContext` n'ont plus
de sujet : une barre qui ne coûte pas de largeur n'a rien à replier. Les
sections [8] et [9] de `test_journal.js` les testaient ; il en reste
l'assertion de repli **SPA**, qui n'a jamais porté sur la navbar. Le repli du
**rail** (`studio.rail-mince`, `#btnRailPli`) est un autre geste et n'a pas
bougé.

`--nav` est **conservé, à `0px` partout**. `.launch` est `position:fixed` et
s'écarte de `calc(var(--nav) + var(--rail))` : le jeton reste la couture, à
zéro, pour que la barre de lancement garde une règle au lieu d'en gagner une
seconde.

### Le filet de progression

2 px sous la sous-barre, pleine largeur, `index/total` en `--txt` sur
`--panel`, **visible seulement pendant un lot** : une gouttière vide permanente
serait du chrome qui ne veut rien dire la plupart du temps. Sa transition de
0,5 s est neutralisée par le bloc `prefers-reduced-motion` de `base.css`, qui
couvre déjà toutes les transitions du studio.

## Deux modèles de largeur

| Modèle | Écrans | Règle |
|---|---|---|
| **Article centré** | registre, banque, revue, réglages, wizard | `.wrap` à `--maxw`, marges auto |
| **Poste de travail** | **Créer** seulement | `#creer .wrap.split` en pleine largeur ; l'inspecteur touche le bord droit du **viewport**, pas celui d'un wrap |

Depuis le 29/08/2026 les deux modèles vivent à droite d'un **rail** de 200 px
(voir ci-dessous) : « pleine largeur » et « centré » s'entendent désormais dans
`<main>`, pas dans le viewport. Le rail est hors de `<main>`, donc hors des deux
modèles — il ne défile pas et ne participe d'aucun wrap.

Créer a changé de modèle le 29/08/2026 : `--maxw` y laissait ~200 px de gouttière
de chaque côté sur un écran large, et l'inspecteur collait au bord droit du wrap.
La correction n'est **pas** de monter `--maxw` — ce serait garder le modèle et le
distendre. Les deux surfaces de chrome qui bordent l'écran suivent
(`#creer .launch .inner` par portée, `body:has(#creer.on) .intbar .inner` parce
que la barre d'intensité vit hors des écrans). La colonne de droite est en
`clamp(280px, 22vw, 420px)` : la borne haute est la largeur réelle de la vignette
servie, au-delà on afficherait un fichier remonté au-dessus de sa résolution.

## Le rail d'outils n'est pas une seconde navigation

`.rail` (200 px, hors de `<main>`, dans `.shell`) porte les **outils du pack**
— lus dans `PACKS/<pack>/tools.json` via `/api/universe/tools` — et les
raccourcis d'atelier. Les **modules restent le chrome** : aucun n'est recopié
dans le rail. Les deux surfaces se lisent sans se confondre — les catégories et
leur sous-barre disent **où aller** dans l'application, le rail dit **quoi
faire** sur l'écran courant. *(Écrit « les cinq destinations de la navbar »
jusqu'au 23/09/2026, quand la navbar latérale a cédé la place aux catégories ;
la distinction, elle, n'a pas bougé.)*

| | Dans le rail | Jamais dans le rail |
|---|---|---|
| | outils déclarés par le pack, raccourcis Banque/Poses, ⚙ réglages de **génération** | Personnages, Produire, Revue, Application, n° de version, ETA (déjà dans `#stTxt`) |

Le rail ne connaît ni le personnage ni le pack (CLAUDE.md §8.7). Il lit le champ
`surface` de chaque outil et cherche ce que cette surface ouvre dans la table
`SURFACES` de `rail.js` — **une table de données, jamais un `if`**. Surface
inconnue → bouton **inerte qui dit pourquoi**, jamais une destination inventée.
Vérifié : Léna (`instagram-influenceur`) et Abyssiaelle (`rpg-personnage`)
rendent un rail identique, au caractère près.

Il s'affiche là où ses entrées ont une surface — **Produire et Banque** —, au
dessus de 1100 px, personnage chargé, éditeur photo fermé. Sous 1100 px il
disparaît, et en mode éditeur aussi : ce sont des **outils**, la retouche a les
siens. La navbar, elle, reste dans les deux cas — c'est la sortie. La condition
d'affichage est écrite en `@media(min-width:1101px)` avec
`.app:not(.no-character):has(.rail)`, ce qui fait du masquage le défaut.

*Corrigé le 31/08/2026 :* ce paragraphe annonçait un `:not(.editing)` dans cette
condition — il n'y en a jamais eu. Le mode éditeur est une **règle à part**
(`body.editing .app .rail`, arrivée de `screens/review/editor.css` avec la
migration Tailwind), et `.app` y est présent **pour la spécificité** : écrite
`body.editing .rail`, elle perdait (0,0,2,1) contre la condition d'affichage
ci-dessus (0,0,3,0) et ne peignait jamais. Sans conséquence visible jusqu'ici,
`ToolRail` ne montant rien sur les deux écrans d'où l'éditeur s'ouvre.

`--rail` (0, 58 ou 200 px) existe pour **une** raison : `.launch` est
`position:fixed`, donc aveugle à la grille — sans `left:var(--rail)` la barre de
lancement passerait sous le rail. La variable porte exactement la même condition
que l'affichage : une condition écrite deux fois, jamais deux conditions.

**Il se replie** *(30/08/2026)* — `#btnRailPli` au pied de la colonne,
`body.rail-mince`, retenu en `localStorage` : même geste, même place et même
mécanique que `#btnNavPli` pour la navbar. Replié il passe en **icônes seules**,
il ne disparaît pas : ses entrées restent à un clic. C'est la différence avec le
masquage sous 1100 px, où il s'efface faute de place — ici c'est un choix de
confort, et masquer des outils qu'on a demandé à garder serait un autre geste.

Les icônes sont attachées à la **surface**, dans la table `SURFACES` de
`rail.js`, jamais au libellé : le libellé vient du `tools.json` d'un pack, c'est
du texte libre qu'on ne connaît pas d'avance, alors que la surface est le
vocabulaire que le rail interprète déjà. Une surface sans icône, ou inconnue,
prend celle par défaut — un rail replié ne montre jamais un bouton vide.

## La banque a deux sous-vues

`#scenes` porte un `.seg` **Scènes | Poses** au-dessus de deux enveloppes
(`#bankScenes` / `#bankPoses`) que `setBankView()` montre ou masque — aucune
n'est repeinte à la bascule. Hash partageable : `#scenes` et `#scenes/poses`,
résolu par `ROUTES` dans `constants.js`, qui allume l'onglet **Banque** dans les
deux cas. L'onglet Banque rouvre toujours sur **Scènes** : la sous-vue laissée
au passage précédent n'est écrite nulle part dans l'URL.

La barre « Enregistrer scenes.json » reste visible sur les deux vues — elle
enregistre le document de l'écran, et une édition en attente sur l'autre vue
doit garder son bouton pendant que `#dirtyBar` avertit.

## Collision de noms de classe — la carte est scopée à sa grille

`sc` et `src` nomment chacun **deux à trois** choses différentes dans l'app : une
carte cliquable, et une ou deux étiquettes de texte. Tant que la règle de carte
était écrite `.sc{…}` / `.src{…}`, elle atteignait aussi les étiquettes et leur
posait `width:100%`, une bordure de 2 px et un curseur main.

| Classe | La carte | Les étiquettes qui portaient le même nom |
|---|---|---|
| `sc` | `.scenes .sc` (carte de scène) | `.fr.sc` (ligne « scène » de l'aperçu), `.bib .sc` (pastille de score) |
| `src` | `.srcgrid .src` (vignette de source NSFW) | `.fr .src` (provenance d'un fragment), `#declineBox .src` (sous-titre) |

C'est ce qui vidait l'aperçu du prompt de son texte : l'étiquette `.fr .src`
prenait toute la ligne et chassait `.fr .tx` hors du cadre — on lisait
« 5 % TENUE » et rien du fragment. Corrigé en scopant les règles de **bloc** à
leur grille ; les descendantes (`.sc .ph`, `.src .tick`…) restent non scopées,
elles ne trouvent rien à mordre ailleurs. Renommer aurait été plus propre mais
touchait le JS et le sélecteur de fumigation `.fr .src`.

**Règle pour la suite** : une règle de carte se scope à son conteneur. Un nom de
classe court (`sc`, `src`, `tx`, `fr`) n'est pas un identifiant global.

## L'éditeur photo est une modale

Il a occupé `<main>` (`body.editing` + un `.screen`) jusqu'au 30/08/2026, pour
une raison précise : le chrome devait rester visible parce que **la navbar était
la seule sortie du mode**. Une modale porte la sienne — `#edClose`, Échap, clic
sur le voile —, ce qui lève cette contrainte et donne en prime un plan de
travail de **taille connue** : `.edStage` ne dépend plus de ce que `<main>`
laisse, et `ajusterTailleCanvas` peut le mesurer au lieu de plafonner en dur.

`body.editing` reste posé, et ne sert plus à afficher : il tient les raccourcis
clavier du studio à l'écart (Échap du tri, « f » du focus) et masque le rail et
la barre d'intensité plutôt que de les laisser transparaître.

**Le cadre de recadrage est ancré sur `.edCanvasWrap`**, une boîte qui épouse le
canvas au pixel près — jamais sur `.edStage`, qui le centre. `#edCropBox` porte
des coordonnées **canvas** : les poser dans le repère du plan de travail les
décalait de la moitié de la gouttière (332 px mesurés). Deux symptômes pour un
seul bug : le voile assombrissait toute l'image, et le cadre paraissait
immobile. `positionnerCropBox` convertit en plus par `echelleAffichage()`, au
cas où le CSS remettrait le canvas à l'échelle entre deux rendus.

## Inventaire des composants

**Boutons** — `.btn` (+ `.primary`, `.sm`, `.danger`), `.link`.
**Contrôles** — `.seg` (segmenté, boutons `.on`/`:disabled`), `.chip-t` (pilule
à bascule), `.check`, `label.f` (champ + libellé), `input/select/textarea`,
`input[type=range]` (dans `.rg`).
**Cartes** — `.it` (intention), `.sc` (scène, avec `.ph`/`.tick`/`.info`/`.aff`),
`.tile` (vignette de tri), `.prop` (proposition du composeur), `.sceneCard`
(éditeur de scène), `.posecard` / `.src` (miniatures sélectionnables).
**Panneau de réglages** — `#gearPanel` > `.rgs` (section, `.pli` = repliée) >
`.rg` (un réglage : `.rgh`/`.rgv`/`.mes`/`.rge`/`.rgq`, états `.modif`/`.inerte`).
**Barre de lancement** — `.launch` > `.inner` > `.sum` / `.seg` / `.btn`.
**Exécution** — `.run` > `.bar` / `.strip` / `pre.log`.
**Inspecteur de l'écran Créer** *(29/08/2026)* — `#creer .wrap.split` (grille
deux colonnes) > `.cr-main` / `.cr-side` (collante) ; dans la colonne :
`.ins-shot` (cadre image, deux calques `.ins-layer` en fondu croisé,
état `.vide` + `.ins-void`) et `.ins-meta` (une `.meta`).
**Tri** — `.triage` > `.stage`/`.nav`/`.side`/`.meta`/`.score`/`.acts`/`.kbd`,
`.grid` de `.tile`, `.bars`/`.b2` (sous-scores), `.tacts` (actions directes),
`.badge` / `.chip` (score).
**Modales** — `#armBox` / `#declineBox` (`.card` centrée), `#editorBox`
(`.edWrap`), `#lightbox`.
**Bandeaux d'état** (haut d'écran, `flex:none`) — `#panneBar` (panne de
chargement), `#dirtyBar` (modifications non enregistrées).
**Chrome** *(refondu le 23/09/2026)* — `.brand` > `.brand-app` + `.brand-rule` ;
`.idwrap` > `#btnId` (le bouton EST toute la carte) > `.idcard` >
`.brand-av` (pastille d'initiale, 26 px, bordée d'accent) + `.idcard-txt`
(nom + « type · monde ») ; `.idmenu` > `.idmenu-head` (`.brand-id` + deux
`.brand-tag`) + changer de perso / fiche / nouveau ; `.adult-pill` ;
`.status` > `.run-lab` / `.run-n` / `.run-eta` / `.hd-btn` / `.dot` + `#stTxt` /
`.sondes-hd` > `.sonde-hd` > `.sonde-hd-lab` / `.hd-ic` (Application, ⏻) >
`.pwrwrap` > `.pwrmenu` ; `.intbar` (curseur d'intensité).
`.no-character` réduit le chrome au sas.
**Catégories et modules** *(23/09/2026)* — `.tabs` > `.cat-wrap` > `.cat`
(`data-s`, `.on`, `.cat-chev`, `.n` = `#nTri`) + `.catmenu` > `.catmenu-lab` +
liens `data-m` ; `.modbar` > `.mods` > `.mod` (`data-m`, `.on`, `.mod-ic`,
`.n`) + `.modbar-end` > `.mini` + `.modbar-btn` (`#btnFocus`) ; `.prog` (filet
de progression). État : `.focus`.
**Rail d'outils** *(29/08/2026)* — `.shell` (rail + `<main>` côte à côte) >
`.rail` > `.rail-grp` / `.rail-lab` / `.rail-it` (états `.on` / `:disabled`) /
`.rail-foot` (⚙, collé en bas) / `.rail-msg` (+ `.rail-ko` en panne).
**Sous-vues de la banque** *(29/08/2026)* — `.bankview` (un `.seg`) +
`#bankScenes` / `#bankPoses`.
**Panneau Apparence** *(Phase 0b, 03/09/2026)* — `#appearanceBox`, deux
`chrome/theme/HueWheel.tsx` (`role="slider"`, premier contrôle circulaire du
studio) + un curseur d'intensité au style `.rg` du gear panel, aperçu en
direct avant `#btnAppearanceSave` / `#btnAppearanceReset`.
**Divers** — `#toast`, `.empty` (état vide).
