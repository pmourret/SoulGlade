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

## Partir des données, dater la rupture

Avant toute hypothèse sur une dégradation, interroger ce que le projet
enregistre déjà : la base (`image`, `score`, `lora_identite`, `ton`…) par
jour, les configurations et leurs `.bak`, `git log` sur la période. Dater
la rupture, puis chercher ce qui a changé à cette date.

Cas du 25/09 : « depuis la migration du frontend, les images ont perdu en
qualité ». La base montrait une rupture nette le 21/09 — premier jour où
toute la production portait le LoRA d'identité — et non à la migration.
Sans cette lecture, on aurait fouillé le frontend.

## Décomposer ce qui porte plusieurs facteurs

« Un seul facteur change à la fois » ne suffit pas quand l'objet comparé
en porte plusieurs sans le dire. Un ton ajoute un fragment au prompt **et**
pose une expression après le contrôle d'identité : « sans ton / avec ton »
change deux choses. Le 25/09, cette comparaison a accusé le fragment
« slight motion blur » — faux : c'était l'expression. L'essai à trois
images (sans, fragment seul, complet) a séparé les deux.

Avant de comparer « sans / avec » un objet, lister ce qu'il fait, et
insérer une image intermédiaire par facteur.

## Qualifier l'instrument avant de le croire

Un instrument se qualifie sur des cas **connus** avant de juger un cas
inconnu :

- **des positifs** — ce qui doit laisser la mesure immobile ;
- **des négatifs** — ce qui doit la faire bouger, à plusieurs amplitudes,
  dont au moins une que l'œil juge nettement ;
- la question de la section précédente : **peut-il monter sans que ce
  qu'on cherche change ?**

Deux cas vécus, tous deux sur des mesures qui paraissaient évidentes :

- **La netteté comptait le bruit comme du piqué.** Variance des hautes
  fréquences : un LoRA qui ajoutait une trame de grain la faisait passer de
  193 à 431, et il a été gardé sur ce « gain ». Il dégradait le rendu.
- **Les 106 points du visage suivent l'apparence, pas la géométrie.** À
  mouvement horizontal **nul** sur les pommettes, ils y voyaient un
  élargissement de 0,010 : l'ombre d'un sourire déplace l'estimation.
  L'instrument ne pouvait ni juger une ancre ni valider la contrainte qui
  la tenait.

Et des négatifs trop faibles ne qualifient rien : une première gamme de
déformations (mâchoire +8 %) était invisible à l'œil et ne représentait
aucune perte d'identité.

## Lire la cause dans le code qui la produit

Un effet mesuré n'est pas une cause. Quand un étage de la chaîne est en
cause, lire son code source avant de proposer une piste — un custom node
installé se lit en quelques minutes. Le 25/09, trois lignes de
`comfyui-advancedliveportrait/nodes.py` (recadrage à 512, agrandissement,
masque gabarit) ont expliqué d'un coup la dégradation de l'expression, et
montré qu'un aller-retour **à vide** devait déjà l'abîmer — ce que la
mesure a confirmé.

## Garantir par construction plutôt que surveiller par mesure

Quand le mécanisme se contrôle, rendre le défaut **impossible** vaut mieux
que le **détecter** : aucune mesure ne se trompe sur ce qui ne peut pas
arriver, et aucun seuil n'est à étalonner. Les ancres d'identité (menton,
pommettes, sourcils, iris) ne se mesuraient pas ; elles se tiennent dans
le champ du transfert de mouvement, qui les rend rigides
(`DOCS/recherche/2026-09-26-les-ancres-d-identite-se-tiennent-par-construction.md`).

Une garantie par construction se vérifie par un **test synthétique** de la
fonction pure qui la porte. C'est ce test, pas l'œil, qui a trouvé que le
recollage calculé après la contrainte remettait la mâchoire refusée.

## Quand un diagnostic se révèle faux

Le corriger **partout où il a été écrit**, dès qu'on le sait : cadrage,
rétro, tableau de bord, `PROJET.md`, textes d'aide de l'interface. Les
messages de commit ne se réécrivent pas : la rétro et la fiche disent
l'erreur, sa cause, et ce qui l'a révélée. Un faux diagnostic laissé dans
un texte d'aide devient une consigne donnée à l'utilisateur.

## Ne jamais inventer une mesure

Les chiffres cités viennent des mesures que le projet calcule déjà et de
sa base. Un chiffre reconstruit de mémoire ou approché dans une fiche
contamine toutes les décisions qui s'appuieront dessus.
