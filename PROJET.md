# Projet Soulglade

Ce document précède la roadmap et les invariants techniques. Il fixe le
cadrage stratégique du projet et se lit en premier, à chaque ouverture de
session. Toute décision d'architecture qui remet en cause un point ci-
dessous modifie d'abord ce document, et l'ADR qui en découle le cite.

## Ce que c'est

Soulglade est un outil open source de création de contenu par IA, destiné
à d'autres créateurs. Il orchestre ComfyUI plutôt que de le remplacer :
Soulglade compose et pilote, ComfyUI exécute les graphes.

## Le cœur

**Amendé le 2026-09-08.** Le cœur de la plateforme n'est pas de pouvoir
créer des univers, des packs ou des workflows — ce sont des moyens, et
pour certains un modèle économique. Sa puissance tient à deux choses :

- **elle est agnostique.** Aucun personnage, aucun pack, aucune famille
  de modèle n'a de traitement particulier. C'est ce qui fait qu'un outil
  écrit une fois sert tout le monde, et c'est déjà la loi du dépôt
  (invariants 2, 7, 9, 10) ;
- **son centre est le créateur de scène.** C'est là que l'utilisateur
  décide de ce qu'il fabrique. Tout le reste — packs, graphes, verrou
  d'identité, mesures — existe pour que cette décision aboutisse à une
  image.

C'est ce que « studio IA » veut dire ici : **créer, corriger, modifier,
et rester libre de ses choix, sans avoir à porter la complexité
technique.** Les trois verbes comptent autant que la liberté — un outil
qui produit sans laisser reprendre n'est pas un studio.

Conséquence directe, et c'est un test à appliquer : chaque fois que la
plateforme tranche à la place de l'utilisateur sur un choix qui n'a pas
de bonne réponse objective, elle mord sur son propre cœur. Le flou de
fond, tranché le 08/09, en est le premier cas nommé — mesuré comme un
défaut, il s'est révélé être un choix, et il devient un réglage de scène
plutôt qu'une règle
(`DOCS/cadrage/2026-09-08-flou-de-fond-choix-de-scene.md`).

## Pour qui

Cible V1 : créateur qui connaît déjà l'IA générative (a manipulé un
Automatic1111, une interface web équivalente, comprend ce qu'est un
prompt, un LoRA, un checkpoint) mais qui découvre Soulglade. Ni néophyte
complet, ni expert ComfyUI.

Non-cibles V1 : néophyte complet en IA générative ; utilisateur qui veut
publier automatiquement sans intervention ; opérateur multi-utilisateur en
SaaS.

## Aha moment

Un utilisateur exécute le parcours complet du néant à la publication :
installation, création d'un personnage, production d'une image
satisfaisante, export prêt-à-poster. La V1 est finie quand ce parcours est
possible sans intervention extérieure.

## Positionnement

Soulglade est un outil d'aide, pas une plateforme décisionnelle.
L'utilisateur garde la main sur les choix créatifs, publicitaires et
éthiques : la plateforme ne les arbitre jamais à sa place.

**Amendé le 2026-09-07.** Ce principe ne couvre pas les défauts
objectifs. Une main à six doigts, un bras deux fois trop long ne sont
pas des choix créatifs — ce sont des ratés mécaniques, sans arbitrage
possible, et faire inspecter ça à l'utilisateur à chaque génération vide
l'outil de son intérêt. La plateforme les trie donc elle-même, dès
qu'elle sait les reconnaître de façon démontrée fiable (ADR-0025). Ce
qui lui reste est le jugement qui dépend vraiment de lui : l'identité —
« est-ce bien elle ? » — n'a pas la même réponse sur un gros plan et sur
un plan large.

## Monétisation

- Vente de packs de monde via Patreon
- Vente ultérieure de l'éditeur de packs
- La base plateforme reste open source, gratuite, sans dégradation
  fonctionnelle

**Licence, arrêtée le 2026-09-07 (ADR-0026).** La base est publiée sous
AGPL-3.0 : un tiers qui la déploie en service en ligne doit publier ses
modifications. Un pack de monde est un jeu de données, jamais un graphe
(invariant 10) — il n'est pas une œuvre dérivée du programme, et sa
vente reste possible.

Condition qui tient ce modèle : Pierre détient l'intégralité des droits
sur le code, ce qui l'autorise à concéder le même code sous d'autres
termes — notamment un éditeur de packs vendu sous licence commerciale.
**Aucune contribution externe n'est fusionnée sans cession de droits
écrite.** Une seule intégration sans ce cadre suffit à faire perdre la
propriété exclusive, donc la double licence, donc le modèle.

## NSFW

Citoyen de première classe du produit. Activable par personnage, désactivé
par défaut. Aucun sous-système parallèle : recompose les outils existants.

## Publication

- V1 : export prêt-à-poster, formats natifs pour Meta
  (Instagram/Facebook), export générique pour toutes les autres
  destinations
- Publication assistée par API : reportée après V1. Raisons : maintenance
  perpétuelle des tokens tiers, incompatibilité du NSFW avec Meta,
  responsabilité qu'un outil open source solo ne peut pas porter

## Mondes livrés d'origine

Deux ou trois mondes, exigeants sur la qualité. Ils servent de
démonstration muette du format d'un pack payant. Léna et Abyssiaelle
restent des personnages de vitrine, jamais livrés dans le produit.

## Ce qui n'est explicitement pas dans la V1

- Multi-personnage en scène
- Vidéo (déclarée dans le registre, workflows non branchés)
- Voix
- Publication automatisée
- Personnages templates fournis
- Mode multi-utilisateur / SaaS
- Univers "monde RPG" complet (lore/carte/PNJ)
- Intégration MCP

## Critères de sortie V1

- Parcours nominal exécutable de bout en bout par un utilisateur cible en
  une session
- Aucun crash silencieux ; toute erreur remontée à l'interface est
  actionnable
- Retour temps réel pendant la génération
- Défauts objectifs (mains cassées, anatomie incohérente) mesurés ET
  triés automatiquement — sous condition de fiabilité démontrée sur un
  corpus étiqueté, jamais sur une mesure à l'aveugle (ADR-0025)
- Cohérence de l'identité mesurée et affichée, arbitrage laissé à
  l'utilisateur
- Suite complète de tests de non-régression verte
- Chaque écran du parcours nominal passe un audit UX/UI vérifié en vrai
- Critères UI/UX détaillés à formaliser au moment du découpage en phases

## Discipline de projet

Cinq règles matérialisées dans le dépôt, à respecter avant tout code :

1. **Le cadrage vient avant l'architecture.** Toute décision non triviale
   demande d'abord "pour qui est-elle prise". Sans réponse, cadrage avant
   code. `PROJET.md` est la source.

2. **Un chantier hors parcours nominal attend.** Se demander avant tout
   nouveau chantier : "un utilisateur qui n'a jamais installé Soulglade
   en a-t-il besoin pour aller jusqu'à sa première publication ?". Sinon,
   le tableau de bord (section horizon).

3. **Un chantier ambitieux se cadre par écrit avant la première ligne de
   code.** Tout chantier de plus d'une étape dans le tableau de bord a
   son fichier dans `DOCS/cadrage/` avant démarrage. Trois questions : à
   quoi ça sert, hors périmètre, critère de sortie.

4. **Une rétro à chaque fin de phase.** Dossier `DOCS/retros/`, format à
   deux questions : livré non prévu, prévu non livré. Trente minutes
   max.

5. **La motivation est un signal, pas un ordre.** Une envie qui prend en
   cours de phase va dans le tableau de bord (section horizon) avec la
   date, jamais directement en itération. Relecture en fin de phase — ce
   qui parle encore peut être promu par cadrage explicite.
