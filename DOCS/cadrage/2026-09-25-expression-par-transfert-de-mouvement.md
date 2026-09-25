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

**Tranché par Pierre le 25/09 : des ancres d'identité, pas un score
global.** Une expression a le droit de bouger ce qui est expressif — la
bouche, les paupières, la hauteur des sourcils. Elle n'a pas le droit de
toucher aux **points d'ancrage** qui font le visage : la forme du menton, les
pommettes, l'implantation et l'épaisseur des sourcils, la couleur des yeux.
Le score d'identité global (ArcFace) ne sait pas faire cette différence : il
baisse avec n'importe quel sourire. Le garde-fou devient une mesure propre à
la plateforme, qui vérifie les ancres une par une.

- **Les points existent déjà.** InsightFace charge `2d106det` (106 points
  2D) et `1k3d68` (68 points 3D) à chaque contrôle d'identité ; seuls
  la détection et l'embedding sont utilisés aujourd'hui. Aucun modèle neuf.
- **La forme, pas la position.** Ouvrir la bouche abaisse le menton : c'est
  réel. Ce qui ne doit pas changer est la forme du contour (comparée après
  alignement : translation, échelle et rotation retirées), la largeur aux
  pommettes rapportée à l'écart des yeux, l'arc et l'épaisseur des sourcils.
- **Photométrique quand la géométrie ne suffit pas.** La couleur des yeux se
  compare sur la teinte de l'iris, l'épaisseur des sourcils sur la bande
  sombre mesurée le long de leurs points.
- **Par construction autant que par contrôle.** Avec le transfert de
  mouvement, une ancre peut aussi être protégée à la source : le flux se
  borne sur ses points au lieu d'être mesuré après coup.
- **Agnostique.** Les 106 points valent pour tout visage humain, quel que soit
  le personnage ou le pack. Sur un visage que le détecteur ne sait pas lire
  (un pack non photoréaliste), l'ancre se déclare **non mesurable** et ne
  refuse rien : c'est l'entrée d'horizon « mesure d'identité pour un
  personnage non photoréaliste », pas un cas à forcer ici.
- **Tolérances mesurées, jamais écrites en dur** (invariant 4) : étalonnées
  au banc sur les plages de `slow-life` et sur des déformations volontaires
  (négatifs), puis portées par la configuration du personnage, avec leurs
  valeurs de départ dans les défauts du pack.

Le score d'identité après expression reste mesuré et enregistré
(`identite_apres_expression`), mais il ne refuse plus rien.

**Tranché le 25/09** : « placement des sourcils ». Le paramètre `eyebrow` d'une
expression les lève exprès. L'ancre porte sur l'implantation
(position du départ et de la queue du sourcil par rapport à l'œil, au repos)
et sur l'épaisseur, pas sur la hauteur de l'arc, qui est expressive.

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
2. Les ancres d'identité : une mesure de plateforme (module à part, pas dans
   `expression.py`), étalonnée au banc sur des expressions réelles et des
   déformations volontaires, avec faux positifs et faux négatifs comptés
   avant qu'elle refuse quoi que ce soit (ADR-0025). Elle remplace le budget
   d'identité dans `poser_sous_budget`.
3. L'essai de rendu d'IT-10 rejoué sur `joueur` et `doux` : l'image « ton
   complet » doit rejoindre « fragment seul » en netteté, et Pierre juge.

## Critère de sortie

Sur les 5 seeds du banc, une production avec `joueur` garde la netteté et la
texture de la même production sans expression (écart dans le bruit du banc),
l'expression est visible, le temps par image n'augmente pas de plus de 3 s,
et Pierre valide à l'œil. Les tests d'isolation de l'expression
(`test_expression_isolation.py`) et l'octet près de l'assembleur restent
verts.
