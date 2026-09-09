# Produire un chiffre qui vaut quelque chose

Une phase de recherche adopte sur **un chiffre et un œil**. Cette
référence dit comment obtenir le chiffre, et comment reconnaître un
instrument qui ment.

## Le banc, pas l'anecdote

Toute comparaison avant/après passe par le banc de comparaison de
variantes (ADR-0021). Trois exigences non négociables :

- **Seeds appariés.** La même liste de seeds pour la référence et pour
  chaque variante. Comparer deux tirages différents ne mesure que le
  hasard.
- **Images de référence identiques à l'octet près.** Vérifier par `md5`
  quand plusieurs bancs doivent être comparés entre eux ; sans ça leurs
  verdicts ne sont pas commensurables.
- **Une seule chose change à la fois.** Deux axes bougés ensemble
  produisent un chiffre ininterprétable.

## Combien de seeds — la question se calcule

Le nombre de seeds ne se choisit pas au feeling : il se déduit du **bruit
de l'instrument sur la scène testée**.

1. Mesurer le bruit intra-scène : même réglage, N seeds, écart-type de la
   mesure.
2. En déduire l'erreur-type (écart-type / racine de N).
3. Comparer l'écart qu'on veut trancher à cette erreur-type. Un écart
   inférieur à deux erreurs-types n'est pas tranchable au nombre de seeds
   courant.
4. Si le nombre de seeds nécessaire dépasse le budget GPU raisonnable, la
   conclusion est écrite telle quelle : **cette mesure ne tranchera pas ce
   réglage**, et on juge à l'œil en le disant.

Exprimer les écarts en sigma, pas en valeur absolue seule : « −0,092
(6,2 σ) » se relit ; « −0,092 » ne se relit pas.

## Reconnaître un instrument qui ment

Trois pannes, par ordre de fréquence :

- **Juge et partie.** La mesure et le levier reposent sur la même
  quantité — un filtre d'accentuation augmente l'écart-type local, et la
  mesure de texture *est* une statistique d'écart-type local. Le gain
  mesuré ne prouve alors que le fonctionnement du filtre. Avant d'adopter
  sur un chiffre, se demander : ce levier peut-il augmenter la mesure sans
  rien changer à ce qu'on cherche ?
- **Aveugle à ce que l'œil voit.** La mesure déclare deux images
  identiques quand le développeur les distingue immédiatement. Verdict :
  la mesure ne guidera pas ce travail — l'écrire, et passer à l'œil.
- **Corrélée à la scène, pas au pipeline.** Si l'essentiel de la variance
  vient du choix de scène, la mesure est un instrument descriptif, jamais
  un juge de qualité.

## Mesurer le coût, ne jamais l'estimer

Pour tout candidat qui entrerait dans la boucle de production : temps par
image (et par crop si le traitement est local), VRAM occupée, et effet sur
le débit d'un batch réel. Un chiffre de justesse sans chiffre de coût est
une demi-mesure — un candidat a déjà été refermé sur le seul coût.

## Détecteur ou tri : compter les deux erreurs

Un détecteur ne se juge jamais sur le rappel seul. Faux positifs **et**
faux négatifs, comptés sur le corpus étiqueté, comparés au dispositif en
place. Un candidat qui ne fait pas mieux que l'existant est refermé par
écrit. Rien ne devient bloquant dans la chaîne sans ces deux comptes
(ADR-0025).

## Ne jamais inventer une mesure

Les chiffres cités viennent des mesures que le projet calcule déjà et de
sa base. Un chiffre reconstruit de mémoire ou approché dans une fiche
contamine toutes les décisions qui s'appuieront dessus.
