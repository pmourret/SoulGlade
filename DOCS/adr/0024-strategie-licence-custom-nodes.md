# ADR-0024 : les custom nodes GPL sont tolérés au cas par cas via le manifeste, jamais vendorisés — position provisoire avant vérification juridique

## Statut

Accepté (2026-09-06)

## Contexte

La recherche P4.1 (`DOCS/recherche/2026-09-06-workflows-detail-visage-
mains.md`, § « Vérification des licences ») a relevé les licences de
tous les custom nodes candidats identifiés chez ComfyUI Studio : MIT
(`ComfyUI_LayerStyle_Advance`, `comfyui_face_parsing`, `comfyui-florence2`),
Apache-2.0 (`comfyui_controlnet_aux`, `seedvr2_videoupscaler`), et
**GPL-3.0** (`comfyui-impact-pack`/`-impact-subpack`,
`comfyui-inspire-pack`, `comfyui_ultimatesdupscale`,
`comfyui-portrait-master`).

Ce n'est pas une question théorique : `comfyui-impact-pack` et
`comfyui-impact-subpack` (GPL-3.0) sont **déjà en production** aujourd'hui
— déclarés dans `AUTOMATION/comfyui_manifest.json` (`packs: ["platform"]`),
utilisés pour `FaceDetailer` dans les deux graphes de production
(`WORKFLOWS/content/lena_master_prod_ui.json`,
`WORKFLOWS/nsfw/lena_nsfw_branch_ui.json`). Aucune décision explicite sur
la licence de ce node n'a jamais été écrite avant cet ADR : ADR-0022
documente le mécanisme de distribution du manifeste, pas ses implications
de licence.

Le modèle économique de SoulGlade (`PROJET.md`, § Monétisation : vente de
packs de monde via Patreon, vente ultérieure de l'éditeur de packs) rend
la question réelle et pas seulement académique : un pack vendu embarque-
t-il, d'une façon ou d'une autre, du code sous licence copyleft forte ?
Tant qu'aucun pack n'est vendu, la question reste ouverte sans urgence —
mais un chantier de qualité (phase 4) qui ajoute de nouveaux candidats
GPL (Inspire Pack, UltimateSDUpscale) est le bon moment pour écrire la
position plutôt que de la re-découvrir tribalement à chaque nouveau node.

## Décision

**Le mécanisme de distribution actuel, décrit précisément avant toute
conclusion** (ADR-0022) : `AUTOMATION/comfyui_manifest.json` déclare une
**référence** vers chaque custom node — un dépôt git épinglé à un commit,
ou un publisher+version du Comfy Registry — jamais son code. Le module
`AUTOMATION/comfy_provision.py` installe cette référence **sur la machine
de l'utilisateur final**, pas dans le dépôt SoulGlade ni dans l'archive
d'un pack vendu. ComfyUI tourne ensuite comme un **process séparé** ; le
runner SoulGlade lui parle par l'API HTTP/WebSocket de ComfyUI
(`AUTOMATION/runner/comfy.py`), jamais par import Python ni liaison
statique. Ce que Pierre distribue — que ce soit le dépôt open source ou
un futur pack payant — ne contient et n'a jamais contenu le code source
d'aucun custom node : seulement une référence à aller le chercher
ailleurs, exactement le patron déjà en place pour Impact Pack.

Sous ce mécanisme précis, la position adoptée :

- **MIT / Apache-2.0** : toléré sans réserve, aucune vérification
  supplémentaire au-delà de la lecture de licence déjà faite en P4.1.
- **GPL-3.0** : toléré **au cas par cas**, jamais par défaut ni par
  interdiction de principe, à condition que les trois propriétés du
  mécanisme ci-dessus restent vraies pour ce node précis : (1) jamais
  vendorisé — ni dans le dépôt SoulGlade, ni copié dans l'archive d'un
  pack vendu ; (2) toujours déclaré explicitement dans
  `AUTOMATION/comfyui_manifest.json` (déjà une obligation, CLAUDE.md
  invariant 12) ; (3) jamais lié statiquement au code SoulGlade — invoqué
  uniquement via l'API ComfyUI, comme tout autre custom node. Un node qui
  ne peut pas respecter ces trois propriétés (par exemple un node qui
  demanderait à être importé directement dans du code Python SoulGlade)
  redevient un cas à trancher séparément, pas couvert par cette position.
- **Licence du modèle, distincte de la licence du code du node** : un
  modèle sous licence non-commerciale ou à inscription obligatoire reste
  disqualifiant indépendamment de la licence du node qui le charge.
  Exemple trouvé en P4.1 : le wrapper `mesh_graphormer` de
  `comfyui_controlnet_aux` est Apache-2.0, mais le modèle de main MANO
  qu'il requiert est distribué sous licence non-commerciale avec
  inscription obligatoire (Max Planck Institute) — disqualifiant pour un
  pack destiné à la vente, quelle que soit la licence du code qui
  l'appelle. Les deux vérifications (code du node, poids du modèle) sont
  toujours distinctes et doivent être faites séparément.

**Ceci n'est pas un avis juridique.** C'est la position de travail qui
permet de continuer à construire sans re-ouvrir le débat à chaque node,
fondée sur une lecture raisonnable du mécanisme de distribution réel —
pas une garantie. Avant qu'un pack payant ne s'appuie de façon
structurante sur un node GPL (Impact Pack aujourd'hui, potentiellement
Inspire Pack ou UltimateSDUpscale demain), une vraie vérification
juridique reste due. Ce point est explicitement laissé ouvert par cet
ADR, pas résolu par lui.

## Alternatives envisagées

- **Refuser tout GPL par défaut** — écarté : casserait un précédent déjà
  en production (`comfyui-impact-pack`, `FaceDetailer`, utilisé dans les
  deux graphes de prod depuis avant cet ADR) sans bénéfice clair, puisque
  le mécanisme de distribution actuel n'embarque de toute façon jamais le
  code GPL dans ce qui est distribué.
- **Demander un avis juridique formel maintenant, avant de trancher quoi
  que ce soit** — écarté pour cet ADR : disproportionné avant qu'un pack
  payant existe réellement (aucun pack vendu à ce jour ; `BACKLOG.md`
  note le test commercial de l'idée comme préalable à toute décision de
  monétisation). La vraie vérification reste due avant la première
  vente, pas avant la première ligne de code d'un chantier de qualité.
- **Ne rien écrire, laisser la question tribale comme avant P4.1** —
  écarté : c'est exactement le problème que cet ADR corrige. Un futur
  chantier (P4.4, ou l'ajout d'un node GPL supplémentaire) redécouvrirait
  la même tension sans trace de la décision ni de son raisonnement.

## Conséquences

Le tableau de licences de P4.1 devient le premier exemple concret jugé
par cette grille : les candidats #1 (`ComfyUI_LayerStyle_Advance`, MIT)
et #2 (`comfyui_face_parsing`, MIT) sont adoptables sans réserve de
licence ; le candidat #3 (`comfyui_ultimatesdupscale`, GPL-3.0) est
adoptable sous les trois conditions ci-dessus, à vérifier explicitement
au moment de l'intégrer (P4.4) plutôt qu'à supposer.

Tout futur custom node candidat se juge désormais par cette même grille
(licence du code, licence du/des modèles associés, respect du mécanisme
manifeste-jamais-vendorisé) avant adoption, au lieu d'une décision au cas
par cas non tracée.

Point ouvert et assumé, pas résolu par cet ADR : aucune vérification
juridique réelle n'a eu lieu sur l'exposition GPL de SoulGlade à ce jour.
À rappeler explicitement avant la première vente d'un pack qui dépend,
même indirectement, d'un node GPL — Impact Pack en premier lieu, puisque
déjà en production.
