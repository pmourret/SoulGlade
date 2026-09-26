# IT-11, chantier 6 : le composeur de scènes, redéfini sur le nouveau modèle

Cadrage d'IT-11 : `2026-09-26-it11-monde-lieux-intentions-scenes.md`.
Décision : ADR-0027.

## Pourquoi

Le composeur transforme un texte libre en scènes proposées, grâce au modèle de
langage local de ComfyUI. Aucun écran ne l'affiche plus depuis le passage au
compositeur à onglets, alors que sa route répond toujours. Il nomme aussi
« intention » le texte libre, comme la clé du catalogue du monde, et ne connaît
pas les lieux.

**Pour qui.** L'utilisateur qui veut une scène que son monde ne livre pas, et
qui préfère la décrire en une phrase plutôt que l'écrire en anglais, champ par
champ.

## Tranché avec Pierre le 26/09

Le composeur est remonté et redéfini :

- le texte libre devient « ce que tu veux montrer » ;
- l'intention (optionnelle) et le lieu se choisissent dans les listes du
  monde ;
- le modèle n'écrit que ce qui se passe : le décor vient du lieu, au lancement
  (chantier 5).

Les scènes retenues sont propres au personnage et marquées « composée »
(`origin: compose`).

## Ce qui change

**Le contrat de la route.** Il devient `brief`, `intention` (la clé imposée),
`place` et `count`. Les anciens noms partent, sans compatibilité (données
jetables). Un lieu inconnu du monde est refusé. Le texte du décor est donné au
modèle pour qu'il ne le répète pas, et chaque proposition ressort avec son
lieu et l'origine `compose`.

**La Banque.** Un bouton « Proposer… » ouvre un dialogue qui contient :

- le texte libre, l'intention, le lieu et le nombre de scènes ;
- les propositions, chacune avec « Ajouter » et « Ignorer ».

Une scène ajoutée s'ouvre dans le composeur comme « Depuis le monde », et le
bandeau l'enregistre. La liste dit « composée ».

L'écran orphelin `Composer.tsx` est supprimé.

## Hors périmètre

- L'amélioration IA d'une scène existante (panneau « Amélioration IA », sans
  route).
- Le choix d'un autre modèle de langage.

## Critère de fin

- Depuis la Banque, une phrase, une intention et un lieu donnent des scènes
  proposées par le modèle local.
- Une proposition ajoutée est marquée « composée ». Enregistrée, elle se
  compose au lancement avec le décor de son lieu.
- Le test de la route tourne sans ComfyUI. Le parcours est vérifié en vrai,
  ComfyUI allumé.
