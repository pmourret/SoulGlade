# L'expression se transfère en mouvement, pas en pixels

Phase de recherche ouverte et refermée le 25/09/2026, pendant IT-10
(`DOCS/cadrage/2026-09-25-it10-ateliers.md`), à l'étape 6 du chantier des tons
(`DOCS/cadrage/2026-09-25-creer-un-ton.md`). Trois itérations, candidat adopté
à la troisième, validé à l'œil par Pierre.

## Ce qui bloquait

Les selfies de Léna sortaient avec les cheveux crêpés, un grain sur la peau
et un visage mou depuis la migration du frontend. Le diagnostic du jour a
d'abord accusé le LoRA d'identité (vrai, retiré), puis le fragment
« slight motion blur » du ton `joueur` (faux). L'essai de rendu à trois images
d'IT-10 a séparé les deux moitiés du ton : même seed 1001, prompt de `joueur`
**sans** expression, netteté 158 et image propre ; `joueur` complet, 51 et
image dégradée. Retirer le fragment ne changeait presque rien (4,65 d'écart
moyen sur 255).

La question : **pourquoi la passe d'expression dégrade-t-elle le rendu, et
comment poser une expression sans abîmer l'image ?**

Elle est sur le parcours nominal : tout ton qui déclare une expression passe
par cette étape, et Produire imposait un ton à chaque image depuis la
migration.

## La cause, vérifiée dans le code du nœud

`ExpressionEditor` (`comfyui-advancedliveportrait/nodes.py`, lu le 25/09) :

1. le visage détecté est agrandi par `crop_factor` (2.0 par défaut, ce qui
   englobe les cheveux) ;
2. ce recadrage est ramené à **512 × 512**, et LivePortrait régénère le visage
   à cette taille ;
3. la sortie est ré-agrandie à la taille du recadrage (`INTER_LINEAR`) et
   mélangée à l'image par un **masque gabarit fixe** qui couvre tout le
   recadrage (lignes 925-926).

Sur une image de 1080 × 1920, tout le recadrage — cheveux compris, 14 % de
l'image mesuré — est régénéré à 512 puis agrandi. **Un aller-retour neutre,
tous paramètres à zéro, dégrade autant que `joueur`** : netteté 158 → 123,
cheveux crêpés. Ce n'est pas l'expression qui abîme, c'est le recollage.
`expression.py` le laissait voir depuis le 24/08 sans que personne n'en tire
la conséquence : l'aller-retour à vide y fait déjà tomber l'identité de la
base gelée de 1,0 à 0,910.

## Candidats examinés

| # | Approche | Ce qu'elle rend | Verdict |
|---|---|---|---|
| H3 | Baisser l'amplitude | l'aller-retour neutre dégrade déjà autant | **clos** |
| H2 | Réduire `crop_factor` (1.5 / 1.7) | netteté 122 → 130, visage toujours mou | **clos** |
| C1 | Recoller seulement les pixels que l'expression a bougés (sortie comparée à l'aller-retour neutre) | cheveux sauvés, visage toujours mou : l'expression bouge tout le visage | **clos** |
| C2 | Repasse de détail après l'expression | non mesurée ; un étage de graphe, du temps, et le risque de défaire l'expression | **à re-vérifier** si C5 déçoit en production |
| C3 | Poser l'expression avant les étages de détail | réordonne la chaîne (invariant 5) et déplace la bande d'identité | **clos** pour ce chantier |
| **C5** | **Transférer le mouvement** : flux optique entre l'aller-retour neutre et la sortie expressive, appliqué à l'image d'origine en pleine résolution ; recoller depuis l'expression seulement ce que la déformation ne peut pas créer (les dents d'une bouche qui s'ouvre) | texture de la source intacte, expression présente | **adopté** |

Tout est vérifié sur des rendus réels ; aucun candidat externe n'a été
téléchargé. C5 n'utilise que le nœud déjà installé (deux appels) et OpenCV,
déjà présent dans l'interpréteur de ComfyUI.

## Ce qu'on a mesuré

Protocole : scène `selfie_miroir_entree`, Léna, **5 seeds appariées** (1001,
1138, 1275, 1412, 1549 — celles des bancs du 09/09 et du 14/09), sources
rendues **sans ton**, puis les plages d'expression de `joueur` et de `doux`
tirées à chaque seed comme en production. Les deux méthodes partent de la
même source et des mêmes paramètres. Images :
`PROD/LENA/_BENCH/recherche-expression-it3/`, planche
`planche_source_actuel_c5.png`.

| 10 paires | Passe actuelle | C5 |
|---|---|---|
| Netteté vs source | −51 en moyenne, 10/10 plus bas | −0,6 à −2 (≈ source), 10/10 |
| Texture du visage | en baisse, 10/10 | ≈ source, parfois au-dessus |
| Identité, **à expression égale** | référence | `joueur` −0,039 (5/5, σ 0,012) ; `doux` −0,030 (4/5, σ 0,031) |
| Zone recollée depuis l'expression | tout le recadrage | 0 à 0,29 % de l'image |
| Temps par image | 2,0 s | 2,0 s + 2,05 s (aller-retour neutre) + 0,64 s (flux) = **+2,7 s** |

L'identité se compare **méthode contre méthode, à paramètres égaux**, jamais
contre la source neutre : une expression déforme les traits, et le score
baisse par nature (Pierre, 25/09 ; déjà mesuré le 24/08 : sourire franc
0,910 → 0,824, rire → 0,627, à identité constante).

## Le verdict

**C5 adopté.** Chiffre au banc : la texture de la source est gardée sur 10/10
paires, la passe actuelle en perd sur 10/10. Œil de Pierre : validé sur la
planche. Coût : +2,7 s sur une image qui en prend environ 70.

**Une réserve assumée, non expliquée.** À paramètres égaux, C5 coûte environ
0,035 d'identité de plus que la passe actuelle, de façon constante sur
`joueur`. Hypothèse non vérifiée : la passe actuelle lisse le visage à 512,
et l'embedding d'identité est plus indulgent avec un visage lissé. Si c'est
le cas, la mesure récompense précisément le défaut qu'on retire — un
instrument qui ne voit pas ce que l'œil voit.

## Ce que je n'ai pas vérifié

- **Un sourire large, une tête tournée** (`rotate_*`, `aaa` haut). Le flux
  optique suit un mouvement modéré ; un grand déplacement ou une occlusion
  peut le mettre en défaut. Les plages de `slow-life` sont modestes, mais un
  monde pourra en déclarer d'autres.
- **La dent, la langue, les yeux fermés.** Le recollage de ce que la
  déformation ne peut pas créer n'a été vu qu'à petite ouverture de bouche
  (1275 `joueur`).
- **L'origine des 0,035 d'identité** (hypothèse ci-dessus).
- **Un autre personnage, un autre pack** (Abyssiaelle, SDXL).

## Pistes écartées

- **H2 réduire le recadrage** : gain marginal ; en l'état, visage toujours
  mou.
- **H3 baisser l'amplitude** : ne touche pas la cause ; en l'état, des
  expressions plus plates et la même dégradation.
- **C1 recollage sélectif des pixels** : sauve les cheveux, pas le visage.
- **C3 expression avant les détailleurs** : refait la chaîne et la bande
  d'identité pour un gain que C5 obtient sans y toucher.

## Suites

1. **Ingénierie, dans IT-10** (cadrage à écrire avant le code) : C5 dans
   `AUTOMATION/expression.py`, par le même nœud, en deux appels (aller-retour
   neutre et expression), le flux et la composition en Python. Même ordre
   QC → expression → grain (invariant 5), aucun graphe neuf, aucun modèle à
   déclarer au manifeste. Une seule fonction de composition, partagée par la
   production et par l'aperçu de l'atelier.
2. **Le garde-fou d'identité se repense** (`poser_sous_budget`). Il refuse
   aujourd'hui toute expression qui coûte plus de 0,05, et le coût d'une
   expression franche est par nature supérieur. Pistes à trancher au
   cadrage : borner la déformation elle-même (amplitude du flux) plutôt que
   le score, ou un budget qui dépend de l'amplitude demandée.
3. **Après livraison** : repasser l'essai de rendu à trois images sur `joueur`
   et `doux` ; l'image « ton complet » doit rejoindre « fragment seul » en
   netteté.

## Sources

- `comfyui-advancedliveportrait/nodes.py` (installé), lu le 25/09 :
  `detect_face` (l. 226-243), `prepare_source` (l. 354-380), composition
  finale (l. 925-926).
- `AUTOMATION/expression.py`, docstring d'en-tête (mesures du 24/08).
