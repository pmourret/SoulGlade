# ADR-0026 : SoulGlade est publié sous AGPL-3.0, avec droits d'auteur conservés en propre

## Statut

Accepté (2026-09-07)

## Contexte

Le dépôt `pmourret/SoulGlade` est **public** — un clone anonyme
fonctionne — et ne contient **aucun fichier de licence**. Le `README.md`
annonce encore un dépôt « qui a vocation à devenir public » et une
licence « à définir avant le passage en public ». Les deux affirmations
sont fausses depuis que le dépôt est en ligne.

Conséquence juridique de cet état, et c'est le point qui rend la
décision urgente : en l'absence de licence, le code reste sous droit
d'auteur plein, tous droits réservés. Personne ne peut légalement le
copier, le modifier ni le redistribuer. Le positionnement « outil open
source destiné à d'autres créateurs » écrit en tête de `PROJET.md` n'a,
en l'état, aucune existence juridique — seulement une intention publiée.

Trois contraintes encadrent le choix :

1. **Le modèle économique** (`PROJET.md`, § Monétisation) : vente de
   packs de monde, vente ultérieure de l'éditeur de packs, base
   plateforme gratuite et open source sans dégradation fonctionnelle.
   La licence ne doit donc pas empêcher de vendre, et ne doit pas
   obliger à libérer ce qui n'est pas la base.
2. **Le risque de reprise en service hébergé** : SoulGlade est une
   application web locale. Rien n'empêche techniquement un tiers de la
   déployer en service en ligne fermé, en gardant ses modifications pour
   lui. Une licence permissive autorise explicitement ce scénario.
3. **Pierre est seul auteur.** Aucune contribution externe n'a jamais
   été intégrée. Il détient donc l'intégralité des droits patrimoniaux
   sur le code — position qui autorise des choses qu'aucun contributeur
   tiers ne pourrait faire, et qui se perd au premier apport extérieur
   accepté sans cadre.

## Décision

**SoulGlade est publié sous GNU Affero General Public License version 3
(AGPL-3.0).** Le texte officiel est posé tel quel en `LICENSE` à la
racine, sans modification — le document interdit lui-même d'être altéré.

Ce que ce choix produit concrètement :

- **Un tiers qui déploie SoulGlade en service en ligne doit publier ses
  modifications.** C'est la section 13 de l'AGPL, l'unique différence de
  fond avec la GPL-3.0, et la seule raison de préférer l'AGPL ici :
  elle ferme le scénario 2 ci-dessus, que la GPL laisse ouvert dès lors
  qu'il n'y a pas de distribution de binaire.
- **La vente de packs de monde reste possible.** Un pack est un jeu de
  données — prompts, catalogues, réglages, assets — jamais un graphe
  (invariant 10, ADR-0017) et jamais du code lié à la plateforme. Il
  n'est pas une œuvre dérivée du programme et ne tombe pas sous le
  copyleft. Cette lecture est celle qui fonde la décision ; elle est
  raisonnable, elle n'est pas vérifiée juridiquement (voir plus bas).
- **La double licence reste ouverte.** Détenant tous les droits, Pierre
  peut publier sous AGPL *et* concéder le même code sous d'autres termes
  — notamment pour un futur éditeur de packs vendu sous licence
  commerciale. Ce n'est pas une entorse à l'AGPL : le titulaire des
  droits n'est pas lié par la licence qu'il accorde aux autres.

**Contrepartie non négociable de ce dernier point : aucune contribution
externe n'est intégrée sans cession de droits écrite** (accord de
contribution, signé avant fusion). Une seule contribution acceptée sans
ce cadre suffit à faire perdre la propriété exclusive, donc la
possibilité de double licence — et le modèle économique avec elle.
Tant que le dépôt n'a pas d'accord de contribution, la position est
simple : les correctifs proposés se réécrivent, ils ne se fusionnent
pas.

## Alternatives envisagées

- **Apache-2.0** — écarté. Permissif, meilleur pour l'adoption large,
  clause de brevet explicite. Mais il autorise exactement ce que la
  contrainte 2 cherche à empêcher : reprendre la base, l'héberger en
  service fermé, ne rien rendre. Pour un outil dont la valeur est
  l'orchestration elle-même, c'est le seul risque qui compte vraiment.
- **GPL-3.0** — écarté. Même copyleft sur le code distribué, mais muet
  sur l'usage en réseau. SoulGlade étant une application web, c'est
  précisément le trou par lequel le scénario 2 passe.
- **Propriétaire, tous droits réservés (statu quo)** — écarté. C'est
  l'état de fait actuel, et il contredit frontalement le positionnement
  de `PROJET.md`. Le laisser durer, c'est publier un code que personne
  n'a le droit d'utiliser tout en annonçant l'inverse.
- **AGPL-3.0-or-later plutôt que -only** — non tranché ici, et assumé :
  le fichier `LICENSE` est le texte de la version 3. La formule « ou
  toute version ultérieure » se pose dans les en-têtes de fichiers, pas
  dans le texte de la licence ; ce point se règle au moment d'ajouter
  les en-têtes, si on les ajoute.

## Conséquences

- `LICENSE` (texte AGPL-3.0 officiel) posé à la racine.
- `PROJET.md`, § Monétisation, amendé : la licence n'est plus « à
  définir », et la condition de cession de droits pour toute
  contribution externe y figure, puisqu'elle conditionne le modèle
  économique.
- `README.md` corrigé sur deux points : le dépôt est public (il ne
  « a pas vocation à » le devenir), et la licence est AGPL-3.0.
- ADR-0024 (custom nodes GPL) reste valide et devient plus confortable :
  l'AGPL-3.0 est compatible GPL-3.0, ce qui retire la tension théorique
  qu'une licence permissive aurait créée avec Impact Pack. Le point
  ouvert d'ADR-0024 — aucune vérification juridique réelle de
  l'exposition GPL — n'est **pas** refermé par cet ADR.

**Ceci n'est pas un avis juridique.** Deux points restent dus avant la
première vente d'un pack : la vérification de l'exposition GPL héritée
d'ADR-0024, et la confirmation que la frontière pack/programme retenue
ici tient dans le cadre du copyleft AGPL. Aucun des deux n'est bloquant
tant qu'aucun pack n'est vendu ; les deux le deviennent le jour où le
premier l'est.
