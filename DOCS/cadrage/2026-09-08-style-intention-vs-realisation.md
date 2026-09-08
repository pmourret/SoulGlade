# Le style est un cran, pas un spectre

Cadrage écrit le 8 septembre 2026, en marge de l'itération IT-3. Ce
chantier **n'est pas ouvert** : il part au tableau de bord, section
horizon (Règle 5). Ce fichier existe pour que le raisonnement ne soit
pas à refaire le jour où il monte en EPIC, pas pour autoriser du code.

Trois questions (Règle 3, `PROJET.md`).

## D'où ça vient

Question posée en session : « qu'est-ce qui empêcherait Abyssiaelle
d'utiliser un autre modèle de base, en restant dans la famille SDXL ? »

Réponse mesurée dans le dépôt : **rien techniquement, tout
structurellement**. Le swap de checkpoint est câblé de bout en bout
(`universe.style_effect()` → `runner/comfy.py:234-236`) et le rôle
`checkpoint` résout correctement sur le nœud 2 du graphe SDXL depuis
IT-2. Mais la valeur vit dans `output_styles.<style>.checkpoint` du
pack : c'est « le modèle réaliste **de ce pack** », pas celui d'un
personnage, et le style est figé à la création (`PROJET.md` §3,
invariant 8).

Le constat qui a déclenché ce cadrage est ailleurs : Abyssiaelle « fait
IA ». Ça reste un rendu acceptable, mais un utilisateur qui crée un
personnage RPG voudra pousser le trait réel plus loin — et il n'a aucun
cran pour le faire.

## À quoi ça sert

Trois problèmes distincts sont aujourd'hui emmêlés sous l'étiquette
« l'application n'est pas assez permissive ». Les séparer est le premier
livrable de ce cadrage.

**P1 — le défaut du pack est médiocre et n'a jamais été mesuré.**
`PACKS/rpg-personnage/universe.json` porte `checkpoint: null` sur
`realiste`, donc le graphe garde `juggernautXL_ragnarok`, figé dans un
widget. Personne n'a jamais comparé ce checkpoint à un autre. Ce n'est
pas une décision, c'est un reste. **Problème de valeur, pas de liberté**
— et le seul des trois qui touche l'aha moment (`PROJET.md` :
« production d'une image satisfaisante »).

**P2 — l'axe style confond intention esthétique et réalisation
technique.** « Réaliste » désigne une intention ; le pack la traduit en
une réalisation unique et non négociable. Un pack peut déjà déclarer
`realiste` et `realiste-photo` avec deux checkpoints — c'est de la
donnée pure, ça marche aujourd'hui sans une ligne de code. Le vrai
blocage n'est donc pas le champ manquant : c'est que **le style est
choisi à l'aveugle**, avant la première image, et gelé ensuite. Personne
ne peut arbitrer entre deux crans de réalisme sans avoir vu les deux.

**P3 — rien n'est re-mesurable après coup.** Changer le checkpoint de
base change le visage : le poids du LoRA, les seuils QC et la base gelée
sont mesurés contre juggernaut. Le marqueur `measured: false` existe
déjà (`character_defaults.json` : `identity`, `qc`, `bench`) mais il
n'est que **lu**, pour avertir (`runner/prompt.py:152`) — aucune route
ne le repose quand un amont bouge, et `state.py:129` note que la route
d'écriture qui saurait le faire reste à concevoir. Tant que ça manque,
toute permissivité ajoutée est un piège : ça ressemble à de la liberté
et ça livre une régression silencieuse.

### Ce que la table de résolution dit du gel

`PACKS/resolution.json` mappe `(rpg-personnage, realiste)`,
`(…, fantastique)`, `(…, cartoon)` et `(…, manga)` sur **le même pack**.
Pour ce type, le style n'influence donc *aucune* résolution de pack.

Or `PROJET.md` §3 justifie le gel du style par la dérivation du pack.
Cette raison ne s'applique pas ici. Ce qui justifie réellement le gel,
c'est la **mesure d'identité** — une contrainte différente, avec un
remède différent (re-mesurer, pas interdire). Cette confusion est
probablement pourquoi le gel paraît arbitraire de l'extérieur : il l'est
à moitié.

Le gel de `type` (panel d'outils) et de `monde` (assets, catalogue de
lieux) reste solide. Celui du `style` est le maillon faible des trois.

### Ce qui corrobore, déjà écrit

IT-2 laisse derrière elle exactement la même forme de manque
(`DOCS/cadrage/2026-09-07-it2-pipeline-abyssiaelle.md`, point 2) : « le
banc ne sait varier que des booléens », donc les deux étages rejetés
l'ont été **sur le réglage livré**, pas sur l'étage. Le checkpoint de
base est le même cas, un cran plus haut : ni rejeté ni adopté, jamais
mis au banc.

### La distinction qui tient tout

Une valeur **libre** se choisit ; une valeur **mesurée** se prouve.
`PROJET.md` (amendement du 2026-09-07) trace déjà cette ligne pour le
tri : les défauts objectifs ne sont pas des choix créatifs. Le
checkpoint de base est du même côté — il se tranche au banc, pas au
goût, et son changement périme ce qui a été mesuré en aval.

La permissivité recherchée n'est donc pas « un sélecteur de plus ».
C'est : **le pack propose, le personnage mesure**. Le précédent existe
et il est écrit dans `DOCS/architecture.md` §4 (« la mesure reste par
personnage, leçon J6 ») : le mécanisme d'identité du pack d'Abyssiaelle
dégradait son identité, son poids a été mesuré à 0.0. Même forme, un
étage plus haut.

## Hors périmètre

- **Changer de famille de modèle.** Sortir de SDXL (Krea2 hors famille,
  Flux, autre) reste un nouveau pack : implémentation d'identité,
  ControlNet, graphe, et **LoRA de personnage à réentraîner**. Ce n'est
  pas ce sujet et ça ne le devient jamais par extension.
- **Rendre `type` et `monde` mutables.** Leur gel est justifié par autre
  chose que la dérivation du pack (outils, assets) et n'est pas remis en
  cause ici.
- **Un sélecteur de checkpoint dans l'interface.** C'est la réponse
  intuitive et c'est la mauvaise : elle délègue le choix à quelqu'un qui
  a moins d'information que l'auteur du pack — ni banc, ni série de
  seeds, ni score d'identité. Il aurait la liberté de choisir aussi mal,
  en plus lentement. Si un cran d'interface arrive un jour, il vient
  **après** P3, jamais avant.
- **L'éditeur de packs** (`PROJET.md`, Monétisation). C'est là que ce
  raisonnement atterrit un jour ; ce n'est pas ici qu'on le commence.
- **Le balayage de valeurs continues au banc** (`refiner_denoise`,
  `guide_size`). Manque réel, noté par IT-2, chantier voisin mais
  distinct.
- **Les mesures d'IT-1 et IT-2.** Rien n'y est rouvert.

## Condition d'ouverture

P1 doit être traité **avant** que ce chantier s'ouvre, et il ne lui
appartient pas : il tient en une itération courte.

`bench.py` n'a pas d'axe `checkpoint` (`CFG_AXES` : sept axes,
`JOB_AXES` : `sampler`, `scheduler`). L'ajouter, c'est une entrée
`JOB_AXES` plus le `if "checkpoint" in overrides` qui manque à côté de
`sampler_name` dans `WorkflowRunner.api_for` — même mécanique que les
axes existants, aucune nouvelle notion. Ensuite juggernaut se compare à
deux ou trois candidats SDXL sur Abyssiaelle, et le défaut du pack
devient une décision écrite au lieu d'un reste.

Tant que P1 n'est pas fait, P2 n'a pas de sens : on ouvrirait le choix
entre des crans dont aucun n'a de chiffre.

## Critère de sortie

Pour le chantier P2/P3, le jour où il monte en EPIC :

1. Un personnage peut porter une **réalisation** différente du défaut de
   son pack, à l'intérieur de sa famille de modèle — et l'incompatibilité
   de famille est **refusée explicitement**, jamais découverte à la
   première génération ratée (même exigence que `UnresolvedPackError`,
   ADR-0012).
2. Ce changement **repose les marqueurs `measured` en aval**
   (`identity`, `qc`) et l'interface le dit — la re-mesure en cascade est
   le livrable, pas un effet de bord.
3. Le changement est **chiffré au banc** avant d'être adopté, comme tout
   étage depuis IT-1.
4. Aucun `if character == …` ni chemin de graphe par personnage
   n'apparaît (invariants 7 et 10) : la famille, l'implémentation
   d'identité et le graphe restent au pack. Seule la valeur bouge.
5. `PROJET.md` §3 est corrigé sur le point relevé plus haut — le gel du
   style est justifié par la mesure d'identité, pas par la dérivation du
   pack — et l'ADR qui ouvre le chantier cite ce cadrage.

Ce que ce chantier ne prouvera pas : qu'un autre checkpoint rend mieux.
Il rend la question posable et mesurable, ce qui est la condition pour
en juger, pas le jugement.
