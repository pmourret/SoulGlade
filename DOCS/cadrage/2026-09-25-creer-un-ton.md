# Créer, renommer et supprimer un ton depuis l'interface

**Date** : 2026-09-25 · **État** : cadré, non construit · **Construction** : après IT-9

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
