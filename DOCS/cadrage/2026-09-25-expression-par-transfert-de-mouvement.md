# L'expression par transfert de mouvement

**Date** : 2026-09-25 · **État** : cadré, non construit · **Itération** : IT-10
· **Verdict d'origine** : `DOCS/recherche/2026-09-25-l-expression-se-transfere-en-mouvement-pas-en-pixels.md`

## À quoi ça sert

La passe d'expression abîme toute image qu'elle touche : LivePortrait
régénère le recadrage du visage à 512, cheveux compris, et le recolle. Les
selfies de Léna en sortaient les cheveux crêpés et le visage mou, et Produire
imposait un ton — donc cette passe — à chaque image depuis la migration.

La phase de recherche du 25/09 a adopté le transfert de mouvement (C5) : la
texture de la source est gardée sur 10 paires sur 10, pour +2,7 s par image.
Ce chantier le met en production.

## Ce qui change

**Une seule fonction de pose**, dans `AUTOMATION/expression.py`, partagée par
la production (`appliquer`, `poser_sous_budget`) et par l'aperçu de l'atelier
(`apercu`) — jamais deux compositions qui dérivent :

1. appel du nœud `ExpressionEditor` à vide (aller-retour neutre) ;
2. appel du même nœud avec les paramètres du ton ;
3. flux optique de la sortie expressive vers l'aller-retour neutre, appliqué à
   l'image d'origine en pleine résolution ;
4. recollage, depuis la sortie expressive, de ce que la déformation ne peut
   pas créer (dents, intérieur de bouche), mesuré contre l'aller-retour neutre
   déformé de la même façon.

Les deux premiers appels passent par le graphe à un nœud qui existe déjà.
Aucun graphe neuf (invariant 10), aucun modèle ni nœud à déclarer
(invariant 12 : `ExpressionEditor` est déjà au manifeste), OpenCV est déjà
dans l'interpréteur de ComfyUI. L'ordre QC → expression → grain ne bouge pas
(invariant 5).

**Les réglages de la composition** (paramètres du flux, seuil et fondu du
recollage) sont des constantes de méthode, comme `BORNES` : ils décrivent
l'algorithme, pas un goût ni un personnage. Ils vivent dans `expression.py`,
nommés et commentés avec la mesure qui les a fixés.

## Le garde-fou d'identité, repensé

`poser_sous_budget` refuse aujourd'hui une expression qui coûte plus de
`expression_budget` (0,05 chez Léna) d'identité, mesurée contre le visage
**neutre**. Or une expression franche fait baisser le score par nature
(24/08 : sourire franc 0,910 → 0,824, à identité constante), et C5 ajoute
environ 0,035 à expression égale. Le garde-fou refuserait ce qu'on demande.

**À trancher par Pierre avant le mode Plan** — recommandation en premier :

1. **Borner la déformation elle-même** (recommandé). Le flux optique est déjà
   calculé : son amplitude dans le cadre du visage, rapportée à la taille du
   visage, dit directement si l'expression tord le visage. Le seuil se mesure
   sur les plages de `slow-life` et vit dans `config.json` (invariant 4). Le
   score d'identité après expression reste mesuré et enregistré
   (`identite_apres_expression`), mais ne refuse plus rien.
2. Garder le budget d'identité, recalibré pour C5 : le plus petit changement,
   mais il continue de punir une expression franche.
3. Un budget qui dépend de l'amplitude demandée : juste sur le papier, mais
   il faut étalonner une courbe score / amplitude par personnage.

## Hors périmètre

- Les grandes rotations de tête et les grandes ouvertures de bouche : le
  verdict ne les a pas vues. Elles se testent après livraison, avec l'essai
  de rendu.
- La repasse de détail (C2), gardée en réserve si C5 déçoit en production.
- Abyssiaelle (SDXL) : même code, vérifié après Léna.

## Étapes

1. `expression.py` : la fonction de composition et ses deux appels ; `apercu`
   et `appliquer` passent par elle. Test unitaire sur images fixes : une
   expression nulle rend l'image d'origine à l'octet près ou presque, la
   texture hors visage est inchangée.
2. Le garde-fou, selon l'option retenue.
3. L'essai de rendu d'IT-10 rejoué sur `joueur` et `doux` : l'image « ton
   complet » doit rejoindre « fragment seul » en netteté, et Pierre juge.

## Critère de sortie

Sur les 5 seeds du banc, une production avec `joueur` garde la netteté et la
texture de la même production sans expression (écart dans le bruit du banc),
l'expression est visible, le temps par image n'augmente pas de plus de 3 s,
et Pierre valide à l'œil. Les tests d'isolation de l'expression
(`test_expression_isolation.py`) et l'octet près de l'assembleur restent
verts.
