# Écran 0 — Chrome : identité graphite + barre de catégories (big bang)

Périmètre validé par l'utilisateur le 2026-09-23. Maquette validée : `Revue UX 01 - Chrome.dc.html`, option **2a** (catégories + sous-barre de modules). Les options 1a, 1b et 2b sont écartées.
Première étape d'une revue UX/UI complète (12 étapes : chrome, puis les écrans dans l'ordre du parcours). Direction : poste de travail façon Lightroom / Resolve, identité **graphite quasi achromatique** (l'image est la seule couleur), base 14 px, system-ui.

Fichiers concernés :
- `src/styles/tokens.css`, `base.css`, `chrome.css`, `DESIGN.md`
- `src/chrome/Shell.tsx`, `Header.tsx`, `SideNav.tsx` (remplacé), `ProbeStrip.tsx`, `FaultBar.tsx`, `DirtyBar.tsx`, `IdentityMenu.tsx`, `ChromeContext.tsx`, `theme/deriveTheme.ts`
- `src/app/routes.ts`
- les fumigations qui ciblent le chrome

## T — Tokens (nouveau `tokens.css`, valeurs de plateforme)

| Token | Valeur | Rôle |
|---|---|---|
| `--bg` | `#141414` | plan de travail (derrière les images) |
| `--panel` | `#1c1c1c` | chrome, panneaux |
| `--panel2` | `#252525` | survol, contrôle levé |
| `--panel3` (nouveau) | `#2a2a2a` | élément courant / actif |
| `--sub` (nouveau) | `#181818` | fond de la sous-barre de modules |
| `--line` / `--line2` | `#2b2b2b` / `#3a3a3a` | filets |
| `--txt` / `--dim` / `--dim2` | `#e8e8e8` / `#a6a6a6` / `#8c8c8c` | textes |
| `--pri` / `--on-pri` (nouveaux) | `#e8e8e8` / `#141414` | bouton principal **neutre** |
| `--acc` | accent personnage (OKLCH, inchangé) | sélection, emplacement courant, avatar — jamais un aplat de bouton |
| `--ok` / `--warn` / `--bad` | `#6fa877` / `#c9a24a` / `#d0706a` | verdicts, identiques pour tous |
| `--warn-bg/-line/-txt` | `#2a2213` / `#5a4722` / `#ecd39e` | bandeau d'avertissement |
| `--danger-bg/-line/-txt` | `#2a1716` / `#5a2a27` / `#f2b8b3` | bandeau de panne |
| `--font` | `14px/1.45 system-ui,'Segoe UI',sans-serif` | base (était 15/1.55) |
| `--r` | pack : `instagram-influenceur` 8 px, `rpg-personnage` 4 px | rayon des cartes |

Rayon des contrôles : 5–6 px. Libellés en capitales : 10,5 px, `letter-spacing:.7px`, `--dim2`.

**Points à respecter :**
- `.btn.primary` passe sur `--pri` / `--on-pri`. Au survol : `#ffffff`.
- `deriveTheme.ts` : la valeur « au repos » (pas d'`appearance`) doit retomber sur le graphite. Par défaut, teinte neutre libre et intensité 0 = chroma 0, avec la luminance des valeurs ci-dessus. Revalider le calcul de `--on-acc` et de `--focus`.
- Refaire la vérification des contrastes WCAG décrite dans `DESIGN.md` §Contrastes, contre `--bg`, `--panel` et `--panel2`, pour `--dim2`, `--warn-txt`, `--danger-txt` et la barre de défilement (`--sb`/`--sb-h` à retinter en gris neutre).

## S — Structure

### S1. La navbar latérale disparaît, remplacée par des catégories

- `routes.ts` : chaque `Destination` gagne un champ `category: 'production' | 'atelier' | 'referentiel'`. Nouvelle table `CATEGORIES`, dans cet ordre : **Production** (Produire, Revue, Galerie), **Atelier** (Ateliers, Entraînement), **Référentiel** (Fiche, Mondes).
- **Application** sort des destinations de catégorie. Elle devient un bouton icône (`application`) dans la zone d'état, à droite de l'en-tête. `/app` et `/app/journal` restent des routes. Quand elles sont ouvertes, aucune catégorie n'est allumée et le bouton passe en `aria-current`.
- La catégorie active se déduit du chemin (`isDestinationActive`), jamais d'un état séparé.
- `SideNav.tsx` est remplacé par `CategoryBar.tsx` (dans l'en-tête) et `ModuleBar.tsx` (sous-barre). **Contrat de navigation conservé** :
  - chaque module garde `data-s={key}` ;
  - le conteneur garde la classe `.tabs` ;
  - le compteur Revue garde `id="nTri"` et `data-zero`.
  
  Faire un grep des fumigations sur `data-s`, `.tabs`, `#nTri`, `#studioNav`, `#btnFocus` et `#btnNavPli` **avant** de toucher au balisage, et adapter les sélecteurs dans le même commit.
- `--nav` vaut `0px` partout. `.launch` (position fixed, `left:calc(var(--nav)+var(--rail))`) doit rester aligné : vérification visuelle sur Produire.
- `ToolRail` reste inchangé (`RAIL_ON` est vide).

### S2. En-tête, 48 px (était 56)

De gauche à droite :

1. **Marque** : « Soulglade », 13 px, 650, `--dim`, suivie d'un filet vertical de 20 px en `--line2`.
2. **Sélecteur d'identité** (`IdentityMenu`, comportement inchangé) : avatar de 26 px (initiale, bordure 1,5 px `--acc`, texte `--acc`, fond `--panel3`), nom en 13,5 px/600, puis une ligne 11,5 px `--dim2` « {type} · {monde} ». L'ensemble est posé sur `--panel2`, radius 6, avec un chevron vers le bas. L'identifiant technique (`brand-id`) et les deux pastilles `brand-tag` **quittent l'en-tête** et vont dans le menu d'identité, en 1re ligne.
3. **Pastille « ADULTE ARMÉ »**, uniquement si le personnage courant a le NSFW armé : 11 px, 600, en famille `--warn-*`, radius 4. C'est du texte, jamais une simple couleur.
4. **Catégories**, centrées (`justify-content:safe center`, `min-width:0`). Chaque catégorie fait 13,5 px et occupe toute la hauteur, avec `padding:0 16px`.
   - Active : `--txt`, 600, `box-shadow: inset 0 -2px 0 var(--acc)`. Elle porte le compteur A_REVOIR si > 0 (pastille `--pri` / `--on-pri`, 10 px, 700).
   - Inactive : `--dim`, suivie d'un chevron de 12 px.
   - Au survol, au clic, ou avec Entrée / ↓ au clavier, une catégorie inactive ouvre un **menu déroulant** de 220 px (`--panel`, bordure `--line2`, radius 8, `--elev`). Il contient le titre de la catégorie en capitales, puis ses modules (icône + libellé, 32 px). Échap ferme le menu. Un clic sur la catégorie elle-même ouvre son premier module.
5. **Zone d'état** (`StatusZone`) :
   - **Lot en cours** : « Génération » `--dim`, « 3 / 8 » tabulaire 600, « ~2 min » `--dim`, puis le bouton « Arrêter » (24 px, bordure `--line2`, garde `id="btnHeaderStopBatch"`).
   - Filet.
   - **ComfyUI** : point de 7 px `--ok` + « ComfyUI ». Hors ligne : losange de 7 px `--bad` + « ComfyUI hors ligne » en `--danger-txt`. Garder `#dot` et `#stTxt`.
   - Filet.
   - **Sondes** (`ProbeStrip`) : libellé texte « RAM / VRAM / GPU » (10,5 px, `--dim2`) + valeur chiffrée. Les paliers `mid` / `haut` colorent la valeur (`--warn`, `--bad` éclairci `#e59a94`). Infobulles et `tabIndex` inchangés.
   - Filet.
   - **Bouton Application**.
   - **Bouton ⏻ unique** qui ouvre un menu « Arrêter ComfyUI » / « Arrêter le tableau de bord ». Mêmes confirmations (`useProcessControls`). Les items gardent `id="btnHeaderComfyStop"` et `id="btnHeaderAppStop"`.

### S3. Sous-barre de modules, 34 px

Fond `--sub`, filet bas `--line`, modules centrés. Chaque module : icône 16 + libellé 13 px, `padding:0 14px`.
- Actif : `--txt`, 600, `inset 0 -2px 0 var(--txt)`. On utilise `--txt` et non l'accent : l'accent marque déjà la catégorie, on ne double pas le signal.
- Inactif : `--dim`.

Le compteur Revue est une pastille `--pri` / `--on-pri`.

### S4. Filet de progression, 2 px

Juste sous la sous-barre, sur toute la largeur. Fond `--panel`, remplissage `--txt` à `index/total`. Visible uniquement quand `state.running`. Transition de 0,5 s, neutralisée par `prefers-reduced-motion`.

### S5. Bandeaux (`FaultBar`, `DirtyBar`)

Hauteur 38 px, 13 px, texte à gauche, actions à droite.
- **Panne** : titre en gras `--danger-txt`, détail en `--dim`, bouton secondaire « Voir le journal » (lien vers `/app/journal`) et bouton `--pri` « Relancer ComfyUI » (même action que l'écran Application).
- **Modifications non enregistrées** : titre `--warn-txt` « N modifications non enregistrées », nom du document en `--dim`, lien « Annuler », bouton `--pri` « Enregistrer » et raccourci `Ctrl S` affiché en mono.

Les ids `#panneBar` et `#dirtyBar` sont conservés.

### S6. États

| État | Chrome |
|---|---|
| Sas (aucun personnage) | En-tête avec la marque seule (en `--txt`) + zone d'état. Pas de catégories, pas de sous-barre. |
| < 1100 px | Marque masquée, sélecteur réduit à avatar + nom, sondes réduites à VRAM. Catégories et sous-barre conservées (libellés visibles). Pas de hamburger. |
| Mode focus (`f`, `#btnFocus` déplacé dans le menu d'identité ou en bouton de sous-barre) | L'en-tête 48 px disparaît. La sous-barre reste et reçoit à droite un mini-état (point ComfyUI + « 3/8 ») et « Quitter le focus · F ». |
| ComfyUI hors ligne | Losange + texte dans l'en-tête, bandeau de panne. |

`body.editing` masque toujours le rail et la barre d'intensité.

## A — a11y

- Catégories : `role="menubar"` n'est pas nécessaire. Utiliser un `<nav aria-label="Navigation du studio">`. Chaque catégorie est un `<button aria-haspopup="menu" aria-expanded>` et son menu un `role="menu"` avec des `role="menuitem"` qui restent des `<a>`. Prévoir flèches, Échap, focus rendu au déclencheur.
- Modules : `<a aria-current="page">`. Le libellé reste le nom accessible en largeur réduite (retrait visuel par `clip-path`, jamais `display:none`).
- Tous les boutons icône (Application, ⏻) portent un `aria-label`.
- Contraste : tout texte ≥ 4,5:1 sur son fond réel, la jauge et le filet ≥ 3:1.

## Dépendances à coordonner (hors frontend seul)

- **Pastille « ADULTE ARMÉ »** : aucune dépendance. `CharacterSheet.nsfw` (`schemas/state.py`) est déjà exposé par `/api/character` et lu par `useCharacter().sheet`.
- **« dernière réponse il y a N s »** dans le bandeau de panne : **optionnel**, uniquement si la sonde l'expose déjà. Sinon, le retirer du texte.

## Hors périmètre

- Le contenu des écrans : chacun a son étape.
- Le wizard, et l'écran Application en dehors de son entrée dans le chrome.
- Aucune modification de workflow, du runner, ni d'un invariant.

## Critère de sortie

- `typecheck`, `build`, les fumigations de tous les écrans et les tests Python des modules touchés sont verts.
- Audit `audit-ux-ui` **vérifié en vrai** : captures à 1440 et 1024, sas, focus, ComfyUI arrêté (`--no-comfy`), lot en cours, contenu adulte armé.
- `DESIGN.md` est mis à jour : la section navbar est remplacée par catégories + sous-barre, et l'inventaire des composants est revu.
