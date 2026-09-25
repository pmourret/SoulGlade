# Préréglages personnalisés et verrouillage des calques (éditeur photo avancé)

**Date** : 2026-09-25 · **État** : cadré, non construit · **Construction** : après IT-9

## Le constat

Pierre le signale le 25/09, en recettant l'écran 10 : on ne peut pas ajouter un
préréglage à soi, et aucun calque ne se verrouille. Les deux sont exacts. Ils
sont réunis ici parce qu'ils viennent du même écran et de la même question
(ce que l'éditeur laisse l'utilisateur conserver), mais ils n'ont ni le même
coût ni le même risque, et ils peuvent être livrés séparément.

## Pour qui, et pourquoi pas plus tôt

Un nouvel utilisateur produit, trie et publie sans jamais écrire un préréglage
ni verrouiller un calque : les cinq préréglages livrés couvrent les virages
courants, et une pile de deux ou trois calques se tient dans la tête. Ce
chantier n'est donc **pas sur le parcours nominal** (règle 2 de `PROJET.md`).

Il sert la deuxième piste, la qualité mesurée de la production de
l'utilisateur zéro : un préréglage à soi est ce qui rend une série cohérente
sans refaire quatre curseurs à chaque image, et un verrou est ce qui empêche
de détruire par mégarde le calque qu'on a mis le plus longtemps à régler.

C'est pour ça qu'il est cadré maintenant et construit après IT-9, plutôt que
versé à l'horizon sans instruction ou glissé dans l'itération en cours.

---

## Partie A. Préréglages personnalisés

### Ce qui existe

`PRESETS` vit dans `photoEditorLayersPixels.ts` : cinq entrées, constante de
code, avec sa propre note expliquant pourquoi elle n'est pas derrière une route
de configuration (« a studio constant, not a business threshold »). Cette
décision reste juste **pour les cinq livrés**. Elle ne dit rien d'un préréglage
que l'utilisateur écrit lui-même, qui est une donnée, pas une constante.

### La question que le code n'a pas tranchée : à quelle couche appartient un préréglage

`DOCS/architecture.md` (ADR-0017) pose quatre couches : plateforme, pack, monde,
personnage. L'invariant 7 de `CLAUDE.md` range explicitement **l'édition
d'image parmi les outils de plateforme**. Un préréglage de colorimétrie est
donc, par défaut, une donnée de plateforme, et pas de personnage.

**A1. Un préréglage créé appartient à la plateforme.** Il s'écrit dans
`PLATFORM/photo-presets.json`, à côté de `capabilities.json`, seul fichier de
cette couche aujourd'hui. L'alternative (un préréglage par personnage) ferait
d'un réglage d'outil une donnée de personnage : le même look serait recopié
autant de fois qu'il y a de personnages, et invisible depuis les autres.
**À confirmer avec Pierre.**

**A2. Les cinq préréglages livrés restent en code, et ne se modifient pas.**
Ils sont le plancher : un studio dont on peut supprimer tous les préréglages
s'ouvre un jour sur une colonne vide. Les préréglages créés s'ajoutent à leur
suite, et eux seuls se renomment et se suppriment.

**A3. Un préréglage capture le LOOK, pas la retouche.** Il enregistre ce que
`layerSummary.ts` compte pour les sections **Base** et **Colorimétrie
avancée** : exposition, contraste, saturation, température, courbes, niveaux,
HSL. Il ne capture ni la netteté, ni le flou sélectif, ni la perspective, ni la
retouche IA. Ces quatre-là portent une géométrie ou un masque placés sur UNE
image précise ; les rejouer sur une autre ne veut rien dire.

### Périmètre

Dans le chantier :

- enregistrer les réglages du calque sélectionné comme préréglage nommé ;
- renommer et supprimer un préréglage créé ;
- la colonne gauche distingue à l'écran ce qui est **livré** de ce qui est
  **à soi**, sans quoi A2 est incompréhensible.

Hors périmètre :

- un préréglage par personnage ou par monde (attend A1) ;
- modifier les cinq livrés (A2) ;
- importer ou exporter un préréglage, qui est un sujet de partage, pas de
  création ;
- les préréglages de la modale simplifiée, qui n'en a pas et n'en demande pas.

### Ce qu'il faut construire

**Backend.** Une route de lecture et trois d'écriture, dans un routeur à part
(`api/routers/photo_editor.py` porte déjà `/layers` et `/save`), et une
fonction par geste dans le service, jamais dans le routeur. Elles écrivent le
seul `PLATFORM/photo-presets.json`, avec `rotate_backup` comme
`save_tone_expression`. Refus explicites : nom déjà pris, nom vide, nom d'un
préréglage livré, suppression d'un préréglage livré.

**Frontend.** Un bouton « Enregistrer comme préréglage » sous la grille de
vignettes, le renommage là où le libellé s'affiche, la suppression au menu
contextuel comme pour les calques. Les vignettes des préréglages créés se
rendent par le même `thumbDataUrl` que les autres : mesuré à 0,80 ms pour cinq,
il n'y a pas de seuil à craindre avant plusieurs dizaines.

**Tests.** Un test de service par refus. La fumigation
`test_photo_editor_advanced` gagne la création d'un préréglage jeté, son
application, puis sa suppression, avec `PLATFORM/photo-presets.json` restauré à
l'octet près, comme `test_expression_editor` le fait déjà pour `creative.json`.

---

## Partie B. Verrouillage des calques

### Ce qui existe

**Presque tout.** `Layer.locked` est déjà dans le schéma généré, le backend le
persiste déjà dans le sidecar `<nom>.layers.json`, et le frontend le lit déjà :
`LayerList` désactive l'œil, n'offre ni poignée, ni menu contextuel, ni `Suppr`,
et `reorder` refuse de franchir un calque verrouillé. Rien ne manque au
transport.

Ce qui manque est qu'**aucun geste ne met `locked` à vrai** : seul
`baseLayer()` le pose, à la construction.

### La question : que verrouille un verrou

**B1. Un calque verrouillé ne se déplace pas, ne se supprime pas et ne se
règle pas.** Les deux premiers sont déjà tenus. Le troisième ne l'est pas : les
cinq panneaux de réglage écrivent dans `selectedLayer.settings` sans jamais
regarder `locked`. C'est le seul endroit à fermer, et c'est aussi le seul qui
compte, parce qu'un verrou qui laisse modifier la couleur ne verrouille rien.

**B2. `locked` cesse de vouloir dire « c'est la base ».** La base se reconnaît
par `kind === 'photo'`, ce que `baseLayerOf`, `removeLayer` et `composeLayers`
font déjà. `locked` devient une propriété que l'utilisateur pose et retire.
C'est le seul point de ce chantier qui change le sens d'un champ existant.

**B3. La base reste verrouillée, et son verrou ne se retire pas.** L'invariant
de l'écran 10 le dit : la photo de base n'est jamais masquée, déplacée ni
supprimée. Elle affiche son verrou, fermé et inerte.

**B4. Un calque verrouillé se masque quand même.** Masquer est un geste de
LECTURE (voir ce qu'il y a dessous), pas une modification : il ne change aucun
pixel enregistré tant qu'on ne sauvegarde pas. La condition de l'œil passe donc
de `locked` à `kind === 'photo'` : seule la base garde un œil inerte, parce
qu'une base masquée ne laisse rien à composer.

### Périmètre

Dans le chantier : poser et retirer un verrou, fermer l'écriture des cinq
panneaux, déplacer la condition de l'œil, montrer l'état à l'écran.

Hors périmètre : verrouiller une PROPRIÉTÉ isolée (la position seule,
l'opacité seule), qui est le modèle de Photoshop et demande un champ par
propriété là où un booléen suffit aujourd'hui.

### Ce qu'il faut construire

**Aucun backend.** `locked` fait déjà l'aller-retour.

**Frontend.** Un `toggleLocked` dans `usePhotoEditorAdvanced.ts`, poussé par
`pushAction` (verrouiller est une action structurante : elle mérite sa ligne
d'historique et son annulation). Un bouton cadenas dans la rangée, avec son
`aria-label` des deux côtés comme l'œil. Les cinq panneaux reçoivent l'état et
rendent leurs curseurs inertes, avec le motif écrit plutôt qu'un simple
`disabled` muet, comme la Retouche IA le fait déjà.

**Tests.** La fumigation gagne : verrouiller un calque, vérifier qu'un curseur
n'écrit plus, que `Suppr` et le glisser ne font rien, que l'œil marche encore,
puis déverrouiller et vérifier que tout revient.

---

## Critère de sortie

Enregistrer les réglages d'un calque comme préréglage nommé, le voir apparaître
sous les cinq livrés avec sa vignette, l'appliquer à une autre image, le
renommer, le supprimer ; constater qu'aucun des cinq livrés n'a bougé.

Verrouiller un calque, constater qu'aucun des cinq panneaux ne l'écrit plus,
que ni `Suppr` ni le glisser ne l'atteignent, que l'œil le masque toujours, que
l'état survit à un enregistrement et à une réouverture, et qu'un seul Ctrl+Z
retire le verrou.
