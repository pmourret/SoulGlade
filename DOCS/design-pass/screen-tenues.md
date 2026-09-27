# Écran 16 : Ateliers, Tenues (silhouette à emplacements, rangée par zones)

Périmètre validé par l'utilisateur le 2026-09-27. Maquette : `Revue UX 16 - Ateliers Tenues.dc.html`.
- **Retenue : 16e** (tour 3), qui affine **16c** (tour 2) : silhouette, 16 emplacements rangés en 7 zones, inspecteur de zone.
- La **table des emplacements** du tour 3 est validée telle quelle.
- Écartées : 16a, 16b (tour 1), 16d (tour 2), 16f (tour 3).
- Squelette commun avec les Lumières (`screen-lumieres.md`, option 15a) : liste 260, fiche au centre, barre de fiche 48, bandeau « Ce que la scène reçoit », un seul appel de création.

Route : `/bank/outfits` (`?character=lena`, `?character=abyssiaelle`). Aucun des deux n'a de tenue : en créer pour la revue (une propre, une du monde, une ajustée, une composée avant les emplacements).

Fichiers concernés :
- `src/screens/bank/outfits/` (`OutfitsView.tsx`, `OutfitInspector.tsx`, `outfitText.ts`, `useOutfits.ts`) ;
- `AUTOMATION/tenues.py`, `AUTOMATION/web/api/schemas/outfits.py` (**une** dépendance backend, § D) ;
- les fumigations des tenues, `tests/test_tenues.py`, `test_charte`, `test_cadres_ua`.

## Constats à mesurer d'abord

Lus dans le code, à confirmer en capture Playwright à 1440 et 1024 avant tout correctif, un constat par problème avec sa mesure :

1. **Deux zones** : `minmax(0,1fr) 340px`, la liste au centre sur toute la largeur quand rien n'est ouvert.
2. **Tout dans 340 px** : libellé, pièces, écriture, Améliorer, grille des vêtements, puis le texte reçu, la case monde et Enregistrer. Mesurer à quelle hauteur passent `#outfitText` et `#btnOutfitSave` avec 8 vêtements dans les Assets.
3. **Texte hors échelle** : libellés de vignette à 10,5 px, « sans fragment » à 9,5 px.
4. **État vide** : deux boutons de création (`#btnOutfitNew`, « Créer une tenue » dans `#outfitsEmpty`).
5. **Ordre** : ↑ ↓ seulement, aucun numéro d'ordre alors que l'ordre est celui du prompt.
6. **Pas de titre** : la tenue ouverte n'est nommée que dans son champ.

## Invariants rappelés

- `tenues.texte` : pièces jointes par une virgule, **dans l'ordre enregistré**. Il ne change pas.
- Une scène qui porte `@clé` s'assemble **à l'octet près** comme la même scène avec le texte en dur (invariant 3 de `tenues.py`) : une tenue sans emplacement part au rendu comme aujourd'hui.
- **Aucune écriture optimiste** (`useOutfits`). Référence pendante = erreur, jamais une tenue vide.
- Au monde, une pièce asset doit être un asset du monde (`_pieces_valides`) : inchangé.
- Aucune classe d'asset nouvelle : un vêtement reste `classe = vetement`. L'emplacement est porté par la **pièce**, pas par l'asset.

## T : La table des emplacements (`outfitSlots.ts`)

Seule source côté écran. Seize emplacements, **dans l'ordre du prompt** :

| ordre | emplacement | clé | zone | pièces | mots qui le proposent |
|---|---|---|---|---|---|
| 1 | Une pièce | `onepiece` | Buste (couvre aussi Taille et jambes) | une | dress, jumpsuit, one-piece swimsuit, romper |
| 2 | Haut | `top` | Buste | une | shirt, blouse, t-shirt, sweater, tank top, bodysuit |
| 3 | Par-dessus | `outer` | Buste | une | jacket, coat, blazer, trench, cardigan |
| 4 | Bas | `bottom` | Taille et jambes | une | jeans, trousers, pants, skirt, shorts |
| 5 | Jambes | `legwear` | Taille et jambes | une | tights, stockings, socks, leggings |
| 6 | Pieds | `feet` | Pieds | une | shoes, boots, sandals, loafers, sneakers, heels |
| 7 | Dessous haut | `under_top` | Buste | une | bra, bralette, sports bra, bikini top, undershirt |
| 8 | Dessous bas | `under_bottom` | Taille et jambes | une | panties, thong, briefs, boxer briefs, swim trunks |
| 9 | Couvre-chef | `head` | Tête | une | hat, cap, beanie, headband |
| 10 | Lunettes | `eyes` | Tête | une | glasses, sunglasses |
| 11 | Oreilles | `ears` | Tête | plusieurs | earrings, studs, hoops |
| 12 | Cou | `neck` | Cou | plusieurs | necklace, scarf, tie, choker |
| 13 | Taille | `waist` | Taille et jambes | une | belt, garter belt |
| 14 | Mains | `hands` | Bras et mains | plusieurs | gloves, rings |
| 15 | Poignets | `wrists` | Bras et mains | plusieurs | watch, bracelet |
| 16 | Porté | `carried` | Porté | plusieurs | bag, handbag, backpack, umbrella |

Règles :
- **Aucun emplacement n'est genré.** Les mots de proposition couvrent tous les corps.
- **Ordre du prompt, du plus visible au plus discret** : vêtements (1 à 6), dessous (7, 8), détails (9 à 16). Un dessous porté sous une chemise ne passe pas devant elle ; porté seul, il se lit quand même.
- Les mots **proposent**, ils ne refusent jamais : tout vêtement peut aller sur tout emplacement. Correspondance en mot entier, casse ignorée, sur le fragment de l'asset (même règle que `lightWordsIn`).
- « Une pièce » remplie : Haut et Bas disent « couvert par {libellé} », sans se bloquer.
- La même liste de clés vit côté serveur (§ D). Un test vérifie que les deux sont identiques.

## S : Structure

### S1. Grille

```
[ barre d'atelier 48 : Scènes · Poses · Tons · Assets · Tenues · Lumières | résumé | Nouvelle tenue ]
[ liste 260 ][ fiche, flex ][ inspecteur de zone 340 ]
```

- Les trois colonnes défilent chacune pour leur compte. Rien d'ouvert et au moins une tenue : la première est ouverte. « Nouvelle tenue » est secondaire ; le seul primaire est Enregistrer (ou Créer la tenue).
- À l'ouverture d'une tenue, la zone active par défaut est la **première zone qui porte une pièce**, sinon Buste.

### S2. Liste (gauche, 260)

Comme les Lumières : `.lab` « Tenues · N », libellé 13 px 500, « N pièces » 11 px, pastille de couche, texte `font-code` 12 px sur deux lignes, erreur en `--warn-txt` avec l'icône `warn`, « modifiée » en texte. Ligne ouverte : `--panel3` + `inset 2px 0 0 var(--acc)`. Garder `data-outfit` et `aria-pressed`.

### S3. Fiche (centre)

1. **Barre 48** : libellé 15 px 650, pastille de couche (`data-outfit-layer`, indice en `data-hint-text`), « modifiée, non enregistrée » en `--warn-txt`. À droite : le segmenté **Silhouette** (Féminine · Masculine · Neutre, § S5), `#btnOutfitDelete`, `#btnOutfitSave`.
2. **Bandeau « Ce que la scène reçoit »** (`#outfitText`), fixe, fond `--panel2` : `.lab` + `.tiny` « dans l'ordre des emplacements », puis « wearing … » en `font-code` 13 px. Le fragment de l'emplacement actif est surligné (fond `--acc` à 20 %, `box-shadow` de 2 px de la même couleur : **aucun padding**, qui ajouterait une espace avant la virgule). Pièce qui ne se résout pas : le bandeau passe en famille `--warn-*` et dit le problème de `draftText`.
3. **Libellé** (`#outfitLabel`) : en tête du corps, 320 px max.
4. **Silhouette et zones** : silhouette de 240 × 520 au centre, et 7 **cartes de zone** de 228 px, reliées à la partie du corps par un filet de 1 px (`--line2`, `--acc` pour la zone active) :
   - à gauche : Tête, Cou, Bras et mains, Pieds ; à droite : Buste, Taille et jambes, Porté ;
   - carte : `.lab` du nom, « N / M » en `font-code` 11 px, puis ce qui est porté (libellés, ou « vide ») en 12 px ;
   - pleine : bordure `--line2` ; vide : pointillés `--line2` ; active : 2 px `--acc` et « actif » en texte ;
   - la partie du corps porte le même état : pleine en `--panel3`, vide en pointillés, active cerclée d'`--acc`. **L'état se dit en texte sur la carte**, la silhouette n'en est que l'écho.
   - Carte et partie du corps sont un même bouton de zone (`data-outfit-zone="<zone>"`), clic ou Entrée.
5. **Case monde** (`#outfitToWorld`) sous la silhouette, quand elle s'applique (existant).

### S4. Inspecteur de zone (droite, 340)

- Tête 48 : nom de la zone 14 px 650, « N / M emplacements ».
- Les emplacements de la zone en lignes, **dans l'ordre du prompt**, chacune : n° d'ordre `font-code`, `.lab` du nom, ce qui est porté ou « vide » (avec « couvert par … » le cas échéant), chevron. Une ligne ouverte à la fois (`aria-expanded`), bordure 2 px `--acc`.
- **Ligne ouverte** (`data-outfit-slot="<clé>"`) :
  - **Porté** : la ou les pièces (vignette 36 px ou « écrite » + champ), chacune avec × ; un emplacement « plusieurs » garde « + Ajouter » ;
  - une phrase de contexte quand elle aide : « Porté sous « Chemise lin blanche » : il vient après elle dans le prompt. » (dessous sous un vêtement) ;
  - **Proposés pour {emplacement}** : les vêtements dont le fragment contient un mot de la table, grille de 3, le mot trouvé sous la vignette ;
  - **Autres vêtements · N** : repli, fermé par défaut, grille de 4 ;
  - **Écrire une pièce** (`#outfitWritten`) + « Poser » + `EnhanceControl` (kind `outfit`) ;
  - un vêtement sans fragment reste inerte et dit « sans fragment : l'analyser dans Assets » (lien).
- **Poser** une pièce sur un emplacement « une » **remplace** la pièce portée ; Ctrl Z la rend (le brouillon de la fiche garde un historique d'un pas au moins).
- `#outfitGarments` et `data-garment` passent sur les grilles de l'inspecteur.

### S5. Silhouette

- Trois variantes, même encombrement (240 × 520), formes simples en jetons `--panel*` : **Féminine**, **Masculine**, **Neutre**. Ce n'est pas une illustration : même famille que le schéma de direction des Lumières.
- Par défaut : ce que dit la fiche du personnage (champ à trouver en mode Plan) ; **Neutre** si elle ne dit rien. Le choix se retient **par personnage** en `localStorage` (`studio.outfit-silhouette.<id>`), sans backend.
- Changer de silhouette ne change **ni** les emplacements, **ni** les propositions, **ni** le prompt.

### S6. États

- **Aucune tenue** : pas d'encadré. La fiche neuve est ouverte d'office, zone Buste active. La liste porte `#outfitsEmpty` avec le texte actuel reformulé. « Nouvelle tenue » n'est pas rendu tant que la liste est vide. Pas de déplacement du focus au montage.
- **Tenue composée avant les emplacements** (maquette 16c · C2) : bandeau famille `--warn-*` au-dessus de la silhouette, « N pièces sans emplacement », les pièces en pastilles glissables avec l'emplacement proposé (« → Haut »), et le bouton « Ranger d'après les fragments ». Une pièce écrite sans mot reconnu reste sans emplacement. **Tant qu'elle n'est pas rangée, la tenue part au rendu dans son ordre d'origine.** Rien n'est écrit avant Enregistrer.
- **Aucun vêtement dans les Assets** : l'inspecteur dit « Aucun vêtement dans les Assets » avec un lien, l'écriture reste disponible.
- **Pièce en défaut** (asset introuvable, sans fragment) : carte de zone et ligne d'emplacement en `--warn-*`, bandeau en avertissement, Enregistrer désactivé avec le motif.
- **Moins de 1100 px** : liste à 240 ; la silhouette et ses cartes gardent le centre ; l'**inspecteur de zone tombe en tiroir** de 340 (`useOverlayPanel`, `role="dialog"`, « × » `aria-label="Fermer la zone"`), ouvert au clic d'une zone, focus rendu à la zone à la fermeture. Si la largeur ne tient pas 2 × 228 + 240, les cartes passent en liste à côté d'une silhouette réduite.

## A : a11y

- Zones : `role="button"` (ou `<button>`) avec `aria-label` « Buste, 3 emplacements sur 4 remplis », `aria-pressed` sur la zone active. Flèches ↑ ↓ entre zones dans l'ordre Tête, Cou, Buste, Bras et mains, Taille et jambes, Pieds, Porté.
- Lignes d'emplacement : bouton de repli avec `aria-expanded` et `aria-controls`.
- Pastilles de rangement (C2) : glisser au pointeur, **et** au clavier Entrée pose à l'emplacement proposé, Maj Entrée ouvre un menu des 16 emplacements.
- `EnhanceControl` : focus vers la proposition puis retour au bouton (acquis du 27/09).
- Contrastes texte 4,5:1, interface 3:1, vérifiés aussi avec Abyssiaelle. Rayons : cartes, inspecteur, silhouette en `rounded-card` ; champs, pastilles, vignettes en `rounded-[Npx]`. Aucun 13,5 px ; plus aucun 9,5 ni 10,5 hors `.lab`.

## D : Dépendance backend (une seule)

- `schemas/outfits.py` : `OutfitPiece.slot: Optional[str] = None`.
- `tenues.py` : une constante `EMPLACEMENTS` (les 16 clés, dans l'ordre) ; `_pieces_valides` **garde** `slot` quand il est dans `EMPLACEMENTS`, refuse une clé inconnue avec un message prêt pour l'écran, et le laisse absent sinon.
- `texte` et `resoudre` **ne changent pas** : l'écran enregistre les pièces déjà triées par emplacement (ordre de la table, puis ordre de pose dans un emplacement « plusieurs »), les pièces sans emplacement à la fin dans leur ordre d'origine.
- `tests/test_tenues.py` : une tenue avec `slot` se résout comme la même sans ; une clé inconnue est refusée ; `EMPLACEMENTS` égale la table de `outfitSlots.ts` (lecture du fichier, comme `test_lights.js` pour la grammaire des lumières).

## Découpage

```
screens/bank/outfits/
  OutfitsView.tsx        grille 3 colonnes, état vide = fiche neuve, tiroir de zone sous 1100
  OutfitList.tsx         liste (présentation)
  OutfitSheet.tsx        barre 48, bandeau, libellé, silhouette + cartes de zone
  Silhouette.tsx         trois variantes, parties du corps cliquables (présentation)
  ZoneInspector.tsx      lignes d'emplacement, ligne ouverte (porté, proposés, autres, écrire)
  UnplacedTray.tsx       bandeau des pièces sans emplacement + « Ranger d'après les fragments »
  outfitSlots.ts         la table (clé, libellé, zone, ordre, une/plusieurs, mots), proposeSlot(fragment), sortPieces(pieces)
  outfitText.ts          inchangé (draftText, lineView, addPiece)
```

## Critère de sortie

- `typecheck`, `build`, `run_browser_tests.py --only` sur les tests des tenues, `test_charte`, `test_cadres_ua`, et `tests/test_tenues.py` : au vert. Crochets préservés ou migrés dans le même commit : `#bankOutfits`, `#nOutfits`, `#btnOutfitNew`, `#outfitsEmpty`, `#outfitPanel`, `#outfitInspector`, `#outfitLabel`, `#outfitPieces`, `#outfitWritten`, `#outfitGarments`, `#outfitText`, `#outfitToWorld`, `#btnOutfitSave`, `#btnOutfitDelete`, `data-outfit`, `data-outfit-layer`, `data-piece-kind`, `data-garment`. Nouveaux : `data-outfit-zone`, `data-outfit-slot`.
- Tests unitaires de `outfitSlots.ts` : `proposeSlot` sur les exemples de la table (dont bra, boxer briefs, one-piece swimsuit), `sortPieces` stable, pièces sans emplacement en fin.
- Audit `audit-ux-ui` **en vrai**, captures à 1440 et 1024, DOM mesuré, avec Léna puis Abyssiaelle :
  - aucune tenue (un seul appel) ;
  - composition par zones : un vêtement proposé, un « autre », une pièce écrite + Améliorer ; remplacement puis Ctrl Z ;
  - « Une pièce » remplie (Haut et Bas « couverts ») ;
  - dessous sous un haut (ordre du prompt vérifié dans `#outfitText`) ;
  - tenue d'avant les emplacements : rendu identique tant qu'elle n'est pas rangée, puis « Ranger d'après les fragments », puis Enregistrer et relecture ;
  - silhouette changée (rien d'autre ne bouge), retenue au rechargement ;
  - tenue du monde, ajustée, en erreur ; changement de tenue avec des modifications en attente ;
  - clavier : zones, lignes, rangement.
