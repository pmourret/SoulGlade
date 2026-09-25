# Créer, renommer et supprimer un ton depuis l'interface

**Date** : 2026-09-25 · **État** : cadré, non construit · **Construction** : IT-10, ouverte le 25/09

> **Amendé le 2026-09-25 au soir** : le chantier devient une itération
> (IT-10), avant IT-3f, et son périmètre s'élargit. Voir la section
> « Amendement du 25/09 » en fin de document : elle prévaut sur « Pour qui »
> et sur le périmètre ci-dessous là où ils divergent.

## Le constat

Pierre le signale le 25/09 depuis le compositeur : il est impossible de créer un
ton. Vérifié, c'est plus large que le compositeur, et ce n'est pas une
régression de l'écran 8.

Il n'existe **aucun chemin de création d'un ton dans l'application**.

- `/bank/tones` règle la plage d'expression d'un ton existant. Son bandeau le
  dit : « les tons se déclarent dans creative.json ».
- Le compositeur, panneau « Tons affins »
  (`composer/panels/GeneralPanel.tsx`), n'offre que des cases à cocher sur les
  clés déjà déclarées, et affiche « aucun ton déclaré » quand il n'y en a pas.
- La seule route qui écrit un ton, `POST /api/expression/tone`, **refuse** un
  ton inconnu, et le dit en toutes lettres dans
  `api/services/expression.py` : « this route never creates one, tones
  themselves stay hand-authored ».

Le seul moyen aujourd'hui est d'éditer `CHARACTERS/<perso>/creative.json` ou le
`creative.json` du monde à la main. Renommer et supprimer sont dans le même
état.

## Pour qui, et pourquoi pas plus tôt

Un nouvel utilisateur hérite des tons de son pack de monde : il produit et
publie sans jamais en créer un. Ce chantier n'est donc **pas sur le parcours
nominal** (règle 2 de `PROJET.md`), il sert la deuxième piste, la qualité
mesurée de la production de l'utilisateur zéro : un ton est ce qui fait qu'une
même scène rend deux images différentes, et ne pas pouvoir en ajouter plafonne
la diversité du corpus, donc celle du jeu d'entraînement.

C'est pour ça qu'il est cadré maintenant et construit après IT-9, plutôt que
versé à l'horizon sans instruction ou glissé dans l'itération en cours.

## La question que le code n'a pas encore tranchée

Elle n'est pas « où mettre le bouton ». Elle est **à qui appartient un ton
créé**, et la réponse n'est pas neutre.

`worlds._merge_by_key` remplace **entièrement** une entrée de même `key` : un
ton écrit côté personnage masque celui du monde, champ pour champ, et ne
fusionne jamais. C'est exactement le piège que `save_tone_expression` contourne
déjà en réécrivant le ton résolu complet plutôt que `{key, expression}` — sans
quoi `label` et `prompt_add` du monde disparaîtraient au prochain chargement.

Trois arbitrages en découlent.

**A1. Un ton créé appartient par défaut au personnage.** Il s'écrit dans
`CHARACTERS/<perso>/creative.json`, comme la plage d'expression. Un ton du monde
sert tous ses personnages ; en créer un depuis la fiche d'un seul le rendrait
visible partout sans que personne l'ait demandé. Le monde a déjà son propre
chemin d'écriture (`POST /api/worlds/{id}/places` en donne le patron), qui
pourra recevoir une variante « créer pour tout le monde » plus tard, visible
uniquement depuis l'éditeur de mondes. **À confirmer avec Pierre.**

**A2. Une clé de ton est unique et immuable.** Elle est écrite dans les scènes
(`tones`), dans les lignes du journal (`ton`), dans les manifestes d'export et
dans `creative.json`. « Renommer » signifie donc changer le **libellé**, jamais
la clé. Changer une clé serait une migration de données, pas une édition.

**A3. Supprimer un ton ne casse jamais une scène.** Le compositeur garde déjà
offerte une clé qu'une scène porte mais que `creative.json` ne déclare plus
(commentaire de `GeneralPanel.tsx`). La suppression retire donc la déclaration,
elle ne balaye pas les affinités des scènes, et l'écran dit combien de scènes
citent encore ce ton avant de confirmer. Un ton **hérité du monde** ne se
supprime pas depuis le personnage : on ne supprime pas ce qu'on ne possède pas.

## Périmètre

Dans le chantier :

- créer un ton (clé, libellé, `prompt_add`), côté personnage ;
- modifier son libellé et son `prompt_add` ;
- supprimer un ton que le personnage possède ;
- l'atelier Tons distingue à l'écran ce qui est **hérité du monde** de ce qui
  appartient au personnage. Il ne le fait pas aujourd'hui, et c'est ce qui rend
  A1 et A3 incompréhensibles sans cette distinction.

Hors périmètre :

- créer un ton côté monde (attend A1, et vit dans l'éditeur de mondes) ;
- changer la clé d'un ton (A2) ;
- les intentions, qui ont la même structure et le même trou : même patron, un
  chantier séparé, sinon celui-ci double de taille sans rien apprendre de plus ;
- les paliers d'intensité, qui sont liés au pack et jamais fusionnés avec le
  monde.

## Ce qu'il faut construire

**Backend.** Une route d'écriture par geste, dans
`api/routers/bank.py` (la taxonomie créative y vit déjà) et une fonction par
geste dans `api/services/creative.py`, jamais dans le routeur. Elles écrivent
le seul `creative.json` du personnage, avec `rotate_backup` comme
`save_tone_expression`. Refus explicites : clé déjà prise, clé absente, clé
vide ou non normalisée, suppression d'un ton hérité.

**Frontend.** L'atelier Tons porte les trois gestes, puisqu'il est déjà la page
des tons : un bouton « Nouveau ton » dans la barre, et l'édition du libellé
là où le nom du ton s'affiche déjà, en tête du panneau de paramètres. Le
bandeau du chrome porte l'enregistrement, comme la plage.

**Tests.** Un test de service par refus, et un test d'isolation entre deux
personnages sur la route de création, comme l'exige `CLAUDE.md`. La fumigation
`test_expression_editor` gagne la création puis la suppression d'un ton jeté,
avec son instantané de `creative.json` restauré à l'octet près, comme elle le
fait déjà pour la plage.

## Critère de sortie

Créer un ton depuis l'atelier, le voir apparaître dans le compositeur et dans
la barre latérale de Produire sans rechargement, lui régler une plage
d'expression, produire une image avec, puis le supprimer et constater que la
scène qui le citait reste valide. `creative.json` du monde inchangé sur tout le
parcours.

---

## Amendement du 25/09 : l'atelier Tons devient une itération (IT-10)

### Ce qui l'a déclenché

Le diagnostic de la perte de qualité relevée à la rétro d'IT-9
(`DOCS/retros/2026-09-25-phase-9-studio-poste-de-travail.md`) a trouvé deux
causes. La première, le LoRA d'identité, est retirée. La seconde est un ton.

Un A/B à seed fixe (1001 et 1138, scène `selfie_miroir_entree`, même config,
seul le ton change) rend une image propre sans ton, et avec `joueur` des
cheveux crêpés, une trame de grain et un visage mou. `joueur` ajoute au
prompt « candid movement, slight motion blur, spontaneous gesture »
(`WORLDS/slow-life.json`), et Flux rend « motion blur » comme une image
dégradée, pas comme un flou de mouvement. Images :
`PROD/LENA/_BENCH/diag-ton-20260925/`.

Ce fragment date d'août. Il est devenu visible parce que l'écran Produire
impose un ton depuis la migration React (`ProduceScreen.tsx`, `pickIntent` :
le ton par défaut de l'intention, sinon le courant, sinon le premier, jamais
aucun), et que `selfie` a `joueur` pour défaut.

**Le vrai défaut est l'outil.** La part d'un ton qui pèse le plus sur le rendu,
son fragment de prompt, n'est ni visible ni modifiable dans le studio. On ne
pouvait ni voir que `joueur` demandait du flou, ni le corriger sans ouvrir le
JSON du monde. Et le bandeau de l'atelier ment : « les tons se déclarent dans
creative.json », alors qu'ils viennent du monde depuis J8.3.

### Pourquoi une itération, et maintenant

Décision de Pierre, le 25/09 : **les outils de la plateforme doivent être
entièrement fonctionnels avant d'ajouter de nouvelles choses** (reportée dans
`PROJET.md`, règle 2). L'argument « hors parcours nominal » de la section
« Pour qui » ne tient plus : un ton est choisi à chaque production, et un
outil qui en cache la moitié dégrade toutes les images sans le dire.

### Périmètre ajouté

En plus de créer, modifier et supprimer (ci-dessus) :

1. **Le ton se lit en entier.** L'atelier affiche le fragment de prompt et la
   plage d'expression, et dit pour chaque ton s'il vient du monde, s'il est
   surchargé par le personnage ou s'il lui appartient. Le bandeau dit vrai.
2. **Un essai de rendu, pas seulement d'expression.** L'aperçu actuel ne pose
   que l'expression sur une photo déjà produite, alors que le fragment de
   prompt, lui, ne se voit qu'à la génération. L'essai produit la même scène
   à la même seed, avec et sans le ton, hors production : le `Sink` du banc
   (`runner/sortie.py`), donc `execute_jobs` (invariant 2), sans toucher à la
   Revue ni aux tables `image`/`score`. C'est ce geste, fait à la main le
   25/09, qui a trouvé le défaut.
3. **« Aucun ton » dans Produire.** Le ton redevient un choix : l'intention
   propose son ton par défaut, elle ne l'impose plus.
4. **`joueur` corrigé par l'outil**, dans l'onglet Tons du monde, pas à la
   main, et vérifié par l'essai de rendu. C'est le cas d'acceptation du
   chantier.

### Où vit le créateur de tons (tranché le 25/09, A1 inversé)

Un ton appartient à la couche **monde**, comme un lieu : il est créé avec le
monde, et c'est ce qu'un monde vendu apporte. Le code le prévoyait déjà
sans l'outil : `readiness` porte `{places, tones, style}` (ADR-0023), mais
`create_world` naît sans liste de tons et l'éditeur de mondes n'édite que
les lieux.

| Où | Rôle |
|---|---|
| Référentiel › Mondes, onglet **Tons** à côté des Lieux | **Créer** un ton : clé, libellé, fragment, plage d'expression. Le créateur de tons est ici. |
| Ateliers › Tons, par personnage | **Ajuster** : lire le ton en entier et sa couche, le surcharger pour ce personnage, l'essayer en rendu. Un ton propre au personnage reste possible, ce n'est plus le chemin principal. |
| Produire | Choisir un ton, ou **aucun**. |

A1 s'inverse donc : un ton se crée dans le monde, le personnage le
surcharge. `joueur` se corrige dans `slow-life` et vaut pour tous ses
personnages.

**L'installation neuve.** Revers de l'agnosticisme : la plateforme ne livre
aucun ton, puisqu'un ton est un choix esthétique qu'elle n'a pas à trancher.
Deux conséquences qui entrent au périmètre :

- « aucun ton » est obligatoire, pas un confort : un monde neuf sans ton
  produit sa première image ;
- l'onglet Tons du monde part de zéro, avec un état vide qui dit quoi faire.
  Reprendre le ton d'un autre monde est un plus, jamais un prérequis.

**L'essai de rendu vit dans l'atelier du personnage.** Il passe par le verrou
d'identité, donc par un personnage, et un monde n'en a pas. L'éditeur de
mondes y renvoie (« Essayer ce ton avec… ») plutôt que de dupliquer le geste.

**Les intentions ont le même trou** et la même couche. Leur créateur est un
chantier séparé d'IT-10, qui reprend le patron de l'onglet Tons : celui-ci
est construit pour être repris tel quel.

### Hors périmètre, confirmé

- La guidance par ton (note du 24/08 : jamais sans A/B à seed fixe).
- Les intentions : chantier séparé d'IT-10, même patron.
- L'amélioration des fragments par IA (horizon du 24/09).

### Critère de sortie, complété

Celui de la section précédente, plus : l'atelier montre le fragment de
`joueur` et sa couche ; un monde neuf crée son premier ton depuis l'état vide ; l'essai de rendu de `joueur` avant correction
reproduit le défaut à l'écran ; après correction dans l'onglet Tons de `slow-life`, le même essai
à la même seed rend une image que Pierre juge propre ; Produire lance une
scène sans ton. Audit `audit-ux-ui` vérifié en vrai en fin de chantier
(patron 2 du skill `nouvel-outil`).
