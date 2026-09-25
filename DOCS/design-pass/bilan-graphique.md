# Bilan graphique : ce que le studio doit tenir

*Cadrage écrit — règle 3 de `PROJET.md`. Dernier travail d'IT-9, après les
quatorze écrans du design-pass. 25/09/2026.*

## Pourquoi maintenant

Les quatorze écrans ont été refaits un par un, chacun avec son cadrage validé.
Personne n'a relu les quatorze **ensemble**. Ce qui s'est répété quatorze fois
n'est écrit nulle part comme une règle : il est recopié quatorze fois, donc il
a dérivé quatorze fois, chaque fois d'un cheveu.

La charte vit dans `AUTOMATION/web/ui/src/styles/DESIGN.md`, qui la porte déjà
en partie — mais elle décrit aussi, par endroits, un studio qui n'existe plus
(la barre `.launch`, l'écran `#creer`, les « deux modèles de largeur »). Une
charte fausse est pire qu'une charte absente : elle se cite.

Ce travail ne refait aucun écran. Il mesure les quatorze, écrit la règle là où
elle s'est répétée, corrige les écarts qui coûtent quelque chose, et laisse
ceux qui ont une raison.

## Ce qui a été mesuré

Recensement des valeurs littérales de `src/` (14 écrans, 160 fichiers), plus
une mesure en vivo du DOM sur onze routes.

### Le sur-titre de section

Le même objet — un libellé en petites capitales qui nomme un groupe dans un
panneau — apparaît **25 fois, écrit 25 fois à la main**, et dérive sur quatre
axes indépendants :

| Axe | Valeurs trouvées |
|---|---|
| taille | 10,5 px (14) · 11,5 px (6) · 12 px (2) · 11 px · 10 px |
| interlettrage | `.5px` (10) · `.7px` (6) · `0.06em` (3) · `.6px` · `.4px` · `.3px` (2) · `.8px` |
| couleur | `--dim2` (11) · `--dim` (10) |
| graisse | `font-semibold` (12) · rien (10) |

Deux labels de même rang, sur deux écrans voisins, ne se ressemblent donc pas.
Les deux derniers écrans du design-pass (12 et 13) ont convergé d'eux-mêmes sur
`10,5px / 600 / uppercase / .06em / --dim2` : c'est cette valeur qui devient la
règle, pas la majorité.

**Et la cause est nommable** : `base.css` habille la balise `h2`
(13 px, `uppercase`, `.9px`, `--dim`). Un écran qui veut un vrai titre doit
donc *défaire* cet habillage. Trois écrans le font, avec un commentaire qui
explique la manoeuvre à chaque fois (`training/SectionHead.tsx`,
`training/ExportPanel.tsx`, `produce/SceneDevelopPanel.tsx`), et
`review/ReviewToolbar.tsx` écrit `normal-case tracking-normal` sur son `h2`.
Quatre contournements pour une règle : c'est la règle qui est fausse. Une
balise dit le **rang**, pas l'aspect.

### La barre d'écran

Onze écrans portent une barre en tête, sous la sous-barre de modules : le nom
de ce qu'on regarde et les actions de l'écran. Sa hauteur :

| Hauteur | Écrans |
|---|---|
| 48 px | Produire, Assistant, Éditeur de pose, Éditeur photo avancé |
| 44 px | Ateliers Scènes, Ateliers Poses, Ateliers Tons, Revue, Galerie |

Et `review/ReviewToolbar.tsx` porte **les deux** : 44 px au repos, 48 px en
mode sélection. Entrer en sélection décale donc tout le contenu de l'écran de
4 px vers le bas.

48 px est la valeur qui tient : c'est celle du header, et le studio se lit
alors sur un rythme vertical de 48 / 34 (modules) / 48.

### Le rayon des cartes

`--r` est le **seul** jeton qu'un pack a encore le droit de redéfinir
(Phase 0b) : 8 px sous `instagram-influenceur`, 4 px sous `rpg-personnage`.
Mesuré en vivo, même DOM, en basculant `data-pack` sur `<html>` : sur onze
routes au repos, **11 surfaces suivent le jeton et 36 restent figées à 8 px**.

Nuance qui compte : l'essentiel de ces 36 sont des `.btn` et des `.seg`, dont
la charte assume le rayon en dur (« les rayons de contrôle restent bruts »).
Les vrais écarts sont les **surfaces** : le cadre de portrait de la fiche, les
trois blocs de l'écran Application, le champ d'Entraînement. Le code source en
compte 51 occurrences de `rounded-[8px]`, dont une quarantaine sur des
surfaces — elles ne se voient pas au repos parce qu'elles vivent dans des
panneaux, des modales et des menus.

Cause : `--r` vaut 8 px et le rayon de contrôle vaut 8 px. Les deux nombres
étant le même, ni le code ni l'écran ne les distingue plus, et une carte
écrite `rounded-[8px]` a l'air correcte.

### Ce qui ne porte plus rien

Quatre familles de règles décrivent des surfaces qui n'existent plus, et
`DESIGN.md` les décrit encore comme vivantes :

| Règle | Ce qu'elle habillait | Depuis |
|---|---|---|
| `.launch` (4 règles, `screens.css`) | la barre de lancement fixe de Produire et de l'assistant | écrans 3b et 14 |
| `.it` / `.intents` (8 règles) | la carte de choix de Produire et de l'assistant | écrans 3b et 14 |
| `.viewsel` (1 règle) | le sélecteur de vue de l'ancienne banque | écran 6 |
| `--nav` et `--rail` (4 déclarations) | la couture que `.launch` lisait pour s'écarter des colonnes | écrans 3b et 14 |

Vérifié : aucun porteur dans `src/`, aucune citation dans les 23 fumigations.

### Les largeurs de colonne

Relevé des grilles d'écran, colonne de gauche puis inspecteur de droite :

    Produire       248 / 340      Revue (tri)     232 / 320
    Ateliers       260 / 340      Revue (loupe)     — / 320
    Tons           220 / 440      Poses             — / 320
    Éditeur pose   240 / 360      Entraînement      — / 412
    Assistant      260 / 340      Personnages       — / 360
    Application    260 /  —       Fiche           300 /  —

Sept largeurs à gauche, six à droite, pour deux rôles. **Rien n'est corrigé
ici**, et c'est un choix : 220 tient trois cartes de ton, 440 tient l'image à
sa résolution servie, 412 tient le panneau d'export. Chaque valeur a été
mesurée contre son contenu dans son cadrage. Uniformiser à 16 px près
déplacerait dix écrans validés pour un écart que personne ne voit. La charte
écrit donc l'**échelle** et la règle du choix, pas une valeur unique.

## Ce qui est fait

1. **Le sur-titre devient une primitive.** `.lab` dans `base.css`, à côté de
   `.tiny` et `.muted` (les deux autres primitives de texte, 75 et 1 porteurs,
   absentes de `DESIGN.md`). Les 25 variantes y passent, et `.lab` compte
   33 porteurs.
2. **`base.css` cesse d'habiller `h2`.** La balise garde son reset (graisse,
   marge, taille héritée) et perd l'aspect. Les quatre `h2` qui vivaient de
   cet habillage prennent `.lab` ; les quatre contournements
   (`normal-case`, `tracking-normal`) partent avec leur commentaire.
3. **La barre d'écran fait 48 px**, sur les cinq écrans à 44 et dans les deux
   branches de la barre de Revue.
4. **Les surfaces suivent `--r`** : `rounded-[8px]` devient `rounded-card` sur
   les cartes, panneaux, cadres et corps de modale. Les contrôles gardent leur
   rayon brut, qui est une valeur de contrôle et pas une valeur de pack.
5. **Les règles mortes sont supprimées**, `--nav` et `--rail` avec elles.
6. **`DESIGN.md` devient la charte** : les sections périmées sont réécrites sur
   ce qui est mesuré ici, et la charte gagne ce qui manquait (les primitives de
   texte, l'échelle de taille, le rythme vertical, les deux familles de rayon,
   l'échelle de largeur).
7. **Un garde** : `AUTOMATION/tests/test_charte.js`, statique, qui échoue si un
   écran réinvente un sur-titre à la main, sort de l'échelle des hauteurs de
   barre, repose un rayon de carte en dur hors des huit contrôles nommés, ou
   remet un habillage sur la balise `h2`.

## Ce qui n'est pas fait, et pourquoi

- **Les largeurs de colonne** : voir ci-dessus. Écart assumé, écrit dans la
  charte comme une échelle.
- **L'échelle de taille de texte** (12 / 13 / 12,5 / 11,5 / 11 / 10,5 px, plus
  une queue de 14 / 15 / 17 / 18 / 9 px). Six pas pour du texte d'interface est
  déjà beaucoup, mais chaque pas sert une densité réelle et les rapprocher
  demanderait de rejuger quatorze écrans un par un — pas un bilan, une autre
  passe. La charte écrit l'échelle et interdit d'en ajouter un pas.
- **`th` et `.meta dt`** (11 px / `.5px` et 11,5 px / `.5px`) : deux règles
  partagées, chacune à un seul endroit, donc sans dérive possible. Alignées sur
  `.lab` elles changeraient la largeur des colonnes de quatre tables. Nommées
  dans la charte comme la même famille à un cran près.
- **Les couleurs en dur restantes** : `#ffffff55` (liseré de pastille, déjà
  assumé), les noirs de cadre d'image, les trois couches de `CurvesEditor`
  (rouge, vert, bleu — ce sont les canaux, pas une ambiance), les valeurs de
  calcul de `oklch.ts` et `maskMath.ts`. Aucune n'encode un choix de style
  qu'un univers voudrait reprendre.

## Ce que ça donne, mesuré

| | Avant | Après |
|---|---|---|
| Sur-titres écrits à la main | 25, sur 4 axes | 0 (une classe) |
| Barres d'écran | 44 px (5 écrans), 48 px (4), et 44 **et** 48 sur Revue | 48 px partout |
| Surfaces à 8 px qui suivent `--r` (au repos, 12 routes) | 11 suivent, 36 figées dont 5 surfaces | 15 suivent, 32 figées, **toutes des contrôles** |
| Règles CSS sans porteur | 4 familles, 16 règles | 0 |

Le reste des surfaces converties (45 au total dans les sources) vit dans des
panneaux, des modales et des menus que le balayage au repos ne voit pas.

**Contraste rejoué en vivo** sur les 43 `.lab` visibles de quatorze routes,
fond réel calculé en remontant les ancêtres : pire ratio **5,07** (`--dim2` sur
`--panel`), aucun sous 4,5. Onze libellés passaient de `--dim` à `--dim2` en
prenant la classe, il fallait le vérifier et pas le supposer ; aucun ne tombe
sur `--panel3`, le fond où `--dim2` vaudrait 4,27.

**Un effet de bord assumé** : les deux `h2` de la barre de Produire
(« Scènes », « Images source ») ne déclaraient pas leur couleur et vivaient
donc de l'habillage de `base.css`. Ils passent de capitales grises à du texte
courant en `--txt`, c'est-à-dire exactement ce que la barre de Revue écrivait
déjà explicitement à côté. Vu en capture, comparé aux deux écrans voisins.

## Vérification

- `toolchain.py build`, typecheck, **24 fumigations vertes** sous
  `python_embeded`, `test_charte` compris.
- Le garde provoqué pour de vrai : trois violations injectées dans un écran
  (un sur-titre à la main, une barre à 46 px, une surface à 8 px), les trois
  détectées, fichier restauré. Un garde qui ne peut pas échouer ne garde rien.
- Captures à 1440 et 1024 sur les treize routes atteignables, avant et après,
  relues et comparées.
- Sonde DOM avant/après : seuls les changements voulus apparaissent, aucun
  déplacement de taille ou de couleur ailleurs.
- Sous-agents `verificateur` et `gardien-invariants`.
- Un commit.
