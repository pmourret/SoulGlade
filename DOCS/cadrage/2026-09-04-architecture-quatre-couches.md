# Architecture en quatre couches

Point complet — sessions des 3 et 4 septembre 2026 — décisions arrêtées et
découpage du chantier J8.

Ce document remplace la note de session précédente. Il fixe le modèle de
responsabilités de la plateforme, les décisions qui en découlent, et le
découpage du chantier en cinq étapes livrables séparément. Aucune ligne de
code n'a été écrite pendant ces sessions : tout ce qui suit est du cadrage.

## 1. Le problème résolu

Le blocage de départ : impossible de voir comment déterminer
automatiquement workflows, modèles et LoRA à la création d'un personnage,
ni comment rendre un univers vendable sur Patreon. La cause était
structurelle : la notion de pack mélangeait du technique et du contenu.
Tant que les deux sont confondus, vendre un univers revient à livrer du
code — et cela ne s'automatise effectivement pas.

## 2. Décision fondatrice — quatre couches, une règle de propriété

| Couche | Contenu |
| --- | --- |
| **Plateforme** | Capacités agnostiques de la famille de modèle, appliquées à une image finie : upscale, grain, recadrage, correction colorimétrique, watermark, banc de mesure. Porte ses propres graphes (un upscale ESRGAN reste un graphe ComfyUI), versionnés, mais sans condition de pack. Toujours disponibles. |
| **Pack technique** | Capacités liées à la famille de modèle : production, verrou d'identité, édition d'identité, inpaint guidé. Un FaceDetailer PuLID ne tourne pas sur SDXL, un LoRA de personnage ne tourne pas sur Flux. Écrit et testé par toi, jamais vendu. |
| **Monde (+ peau)** | Aucun graphe, aucune ligne de code. Lore, catalogues (vêtements, lieux, tons, scènes types), vocabulaire, et le style visuel : checkpoint, LoRA de style, fragments de prompt de rendu. C'est l'unité distribuable. |
| **Personnage** | Instance d'un pack et d'un monde. Apporte son identité propre (LoRA, base gelée), ses seuils mesurés, et ses surcharges de catalogue. Déjà hors repo, inchangé. |

*(Schéma 1 — la ligne de propriété du graphe : Plateforme et Pack technique
peuvent porter un graphe ; Monde et Personnage jamais. L'unité vendable est
à droite de la ligne : aucune ligne de code ne la franchit.)*

La règle qui découpe : qui a le droit de porter un graphe. Plateforme et
pack technique : oui. Monde et personnage : jamais. C'est cette ligne, et
elle seule, qui rend un monde distribuable sans risque.

## 3. Le contrat d'un monde

Un monde déclare trois choses, et rien d'autre :

- **Ce qu'il exige** — famille de modèle compatible (`sdxl`, `flux`),
  version minimale de plateforme.
- **Ce qu'il apporte** — checkpoint, LoRA de style, fragments de prompt,
  catalogues, lore.
- **Ce qu'il a mesuré** — seuils QC par défaut, poids recommandés, avec le
  marqueur `measured` déjà en place.

La résolution devient une vérification, pas une invention :
`resolve(type, style)` sort le pack technique, le monde déclare sa famille
de modèle, on compare. Incompatible → refus explicite, jamais de repli
silencieux. C'est `resolution.json` étendu d'un cran.

*(Schéma 2 — résolution à la création d'un personnage : type + style de
sortie → `resolve()` → pack technique (famille de modèle) comparé au monde
choisi (déclare sa famille) → compatible ou refus explicite, jamais de
repli silencieux.)*

## 4. Question du style — tranchée

Décision : le monde et sa peau restent une seule unité en V1. Le monde
porte le lore et les catalogues (du texte, indépendant du checkpoint) ; la
peau porte le rendu (checkpoint, LoRA de style, fragments de prompt). La
distinction est reconnue dans le modèle mais n'est pas formalisée comme
sous-unité séparée maintenant.

Conséquence assumée : un monde est livré avec exactement une peau. Le coût
du multi-style n'est pas payé tout de suite, et la porte reste ouverte —
« un monde, plusieurs peaux » deviendra une extension, pas une refonte.
Vendre une peau seule pour un monde déjà possédé reste un produit possible
plus tard.

## 5. Ce qui est automatisable, et ce qui ne l'est pas

| | |
| --- | --- |
| **Automatisable** | Validation d'un pack de monde (manifeste complet, hashes, résolution qui passe, génération témoin atteignant le seuil annoncé) ; installation et téléchargement des modèles ; scaffolding d'un monde vide depuis un formulaire ; peuplement assisté des catalogues textuels par LLM (même mécanisme que l'importeur d'assets prévu). |
| **Non automatisable** | Choisir le checkpoint qui rend bien, sourcer ou entraîner les LoRA de style, mesurer les seuils, curer les catalogues. C'est le travail réel — et c'est précisément ce qui se vend. Un monde généré automatiquement n'aurait aucune valeur marchande. |

## 6. Capacités de pack — la généralisation retenue

Un pack déclare aujourd'hui `workflow` et `edit_workflow` : deux champs
nommés en dur. La chaîne `"flux+edit"` répandue en 17 endroits est le
symptôme — elle encode « ce pack sait éditer » faute d'une notion de
capacité.

À la place : une carte de capacités (`produce`, `edit`, `upscale`,
`expression`…), chacune avec son graphe et son contrat de rôles. Le studio
interroge la carte pour savoir quels outils proposer, quelle que soit la
couche qui les fournit. L'invariant 7 devient vrai pour tous les outils.
Un pack incomplet ne casse rien : la capacité est absente, l'outil
n'apparaît pas — motif déjà validé par `edit_workflow: null` en J7.

*(Schéma 3 — d'où vient une capacité : Plateforme (upscale, grain, banc de
mesure) et Pack technique (produce, edit, inpaint) alimentent la Carte de
capacités, lue par le Panel du studio. Une capacité absente fait
disparaître l'outil, jamais griser un bouton. Le monde ne fournit aucune
capacité, seulement des réglages par défaut pour celles ci-dessus.)*

## 7. Emprunter des optimisations sans copier des graphes

Le grain d'emprunt n'est pas le graphe, c'est l'étage. Ce qui transfère
d'un workflow extérieur : une façon de détailler un visage, un upscale en
deux passes, un couple sampler/scheduler mieux réglé, un ordre
d'opérations qui évite une perte. La question devant un graphe tiers est
« quel étage font-ils mieux que moi », jamais « quel graphe je récupère ».

Le bug `cfg["preset"]["refiner"]` en dur dit la même chose : la notion
d'étage optionnel existe de fait mais n'est pas formalisée. Une fois
posée, adopter une optimisation devient un ajout local, testable seul,
sans toucher les autres packs.

**Trois vigilances si un graphe extérieur est repris**

- Un graphe tiers ne respecte pas le contrat de titres de nœuds et de
  groupes : l'import est une annotation aux rôles attendus, puis
  `wf_check` et un `--essai` réel. Jamais un copier-coller de JSON.
- Chaque workflow spécialisé traîne ses custom nodes — autant de
  dépendances d'installation invisibles, à déclarer et vérifier.
- Licence et attribution : un graphe repris d'une bibliothèque tierce
  n'est pas forcément redistribuable. À vérifier avant publication, pas
  après.

## 8. Découpage du chantier J8

Cinq étapes, chacune livrable et testable seule, dans l'ordre. L'ordre est
délibéré : les catalogues passent avant la couche plateforme, parce que
plus on attend, plus il y a de contenu réel à migrer.

| Étape | Contenu |
| --- | --- |
| J8.1 | ADR et vocabulaire — `UNIVERS/` → `PACKS/`, `CLAUDE.md`, skills |
| J8.2 | Carte de capacités — `workflow` + `edit_workflow` → `capabilities` |
| J8.3 | Héritage des catalogues — `scenes.json` / `creative.json` : monde → personnage |
| J8.4 | Couche plateforme — premier habitant : upscale |
| J8.5 | Banc de comparaison — deuxième capacité de plateforme |

### J8.1 — ADR et vocabulaire

ADR des quatre couches. Renommage `UNIVERS/` → `PACKS/` — déjà dans le
hors-périmètre J7bis, désormais justifié plutôt qu'esthétique. `CLAUDE.md`
(Architecture et invariants) mis à jour, skills réalignés. Aucun
changement de comportement.

**Test** : migration mécanique, suite complète verte avant et après,
aucun test réécrit sur le fond.

### J8.2 — Carte de capacités

`workflow` et `edit_workflow` deviennent des entrées d'une carte
`capabilities`. Le studio interroge la carte au lieu de tester
`"flux+edit"` — les 17 occurrences disparaissent. Migration des deux packs
existants.

**Test** : un pack sans capacité `edit` fait disparaître l'outil, jamais
griser un bouton. Non-régression Léna et Abyssiaelle sur le chemin de
production.

### J8.3 — Héritage monde → personnage des catalogues

Point le plus sensible du chantier. Aujourd'hui `scenes.json` et
`creative.json` vivent dans `CHARACTERS/<id>/` — or scènes types, tons et
vocabulaire appartiennent au monde : c'est précisément ce qui se vend.
Sans ce déplacement, un monde acheté arrive vide et l'acheteur ressaisit
tout. Le monde fournit les catalogues de base, le personnage surcharge et
étend ; résolution en deux temps à la lecture. Migration de Léna et
Abyssiaelle, qui ont tout en propre.

**Test** : un personnage neuf créé sur un monde existant hérite des
catalogues sans ressaisie ; une surcharge de personnage l'emporte sur la
valeur du monde ; les catalogues actuels des deux personnages sont
préservés à l'identique après migration.

### J8.4 — Couche plateforme

Emplacement pour les graphes agnostiques du modèle. Capacités toujours
disponibles, sans passer par `resolve()`. Premier habitant : l'upscale.

**Test** : la même capacité fonctionne pour Léna (Flux) et Abyssiaelle
(SDXL) sans aucune condition de pack ni de personnage.

### J8.5 — Banc de comparaison de variantes

Deuxième habitant de la couche plateforme plutôt qu'un chantier isolé.
Rend outillable ce qui a été fait à la main pour le sweep IPAdapter
d'Abyssiaelle. Sert deux fois : valider une optimisation candidate, et
mesurer les seuils par défaut d'un nouveau monde avant publication.

**Test** : voir le prompt détaillé ci-dessous.

## 9. Prompt d'ouverture — J8.1

À coller en ouverture de la prochaine session.

```
Chantier J8.1 : ADR des quatre couches et alignement du vocabulaire.

Contexte. Deux sessions de cadrage ont fixe un modele de responsabilites en
quatre couches : plateforme (capacites agnostiques du modele, appliquees a une
image finie), pack technique (capacites liees a la famille de modele), monde
(donnees pures, unite distribuable, aucun graphe), personnage (instance des
deux, identite et seuils propres). La regle qui decoupe : qui a le droit de
porter un graphe. Plateforme et pack : oui. Monde et personnage : jamais.

Cette etape ne change AUCUN comportement. Elle fixe le vocabulaire avant que
le reste du chantier ne s'appuie dessus.

A faire :
1. Une ADR pour la separation en quatre couches. Elle doit dire explicitement
ce que chaque couche a le droit de porter, et pourquoi la ligne passe la.
2. Renommage UNIVERS/ -> PACKS/ (deja liste en hors-perimetre J7bis).
Purement mecanique, aucun changement de structure interne.
3. CLAUDE.md : sections Architecture et Invariants mises a jour. L'invariant 7
(le panel vient du registre) doit desormais couvrir les quatre couches, pas
seulement le pack.
4. Skills a realigner sur le nouveau vocabulaire : nouveau-personnage,
nouvel-univers (a renommer ?), workflow-comfyui, nouvel-outil.

Contrainte : la suite de tests complete doit etre verte avant ET apres, sans
qu'aucun test ait ete reecrit sur le fond. Si un test doit changer autrement
que par un chemin renomme, c'est que cette etape deborde de son perimetre :
signale-le plutot que de le faire.

Commence en mode Plan. Le plan doit lister les fichiers touches par le
renommage et signaler tout endroit ou le mot 'univers' porte un sens qui n'est
PAS celui de pack technique.
```

## 10. Prompt — J8.5 (banc de comparaison), pour plus tard

Version mise à jour : le banc est désormais rattaché à la couche
plateforme et suppose J8.1 à J8.4 terminées.

```
Chantier J8.5 : banc de comparaison de variantes, deuxieme capacite de la
couche plateforme (apres l'upscale livre en J8.4).

Contexte. Nous mesurons deja l'identite (InsightFace) et le realisme (QC) sur
chaque generation, avec des seuils par personnage. Mais toute comparaison A/B
d'un reglage ou d'un etage de graphe se fait a la main, hors plateforme (cf.
le sweep IPAdapter d'Abyssiaelle en J6, qui a renverse une hypothese
d'architecture). Ce chantier en fait une capacite de plateforme : agnostique
de la famille de modele, disponible pour tout personnage sans condition.

Il servira a deux choses : valider une optimisation candidate empruntee a un
workflow exterieur, et mesurer les seuils par defaut d'un nouveau monde avant
publication.

Objectif fonctionnel. Definir un lot de variantes (meme personnage, meme
scene, meme jeu de seeds, un seul axe qui change), le lancer, et obtenir un
verdict chiffre par variante : identite et realisme agreges sur les seeds,
ecart-type, comparaison a la variante de reference. La sortie doit permettre
de dire 'cette variante est meilleure sur les deux axes' sans juger a l'oeil.

Contraintes non negociables :
- passe par execute_jobs, jamais un chemin d'execution parallele (invariant 2)
- aucun seuil en dur, tout vient de la config du personnage (invariant 4)
- aucun if character == ... ni if pack == ... en dur (invariant 7)
- ne cree aucun fichier de graphe par personnage (invariant 10)
- s'enregistre comme capacite de plateforme via la carte de capacites (J8.2),
jamais comme un ecran cable en dur
- les resultats de banc n'entrent pas dans PROD/ comme une production normale :
ils ne doivent polluer ni la Revue ni l'export. Decider ou ils vivent fait
partie du plan.

Commence en mode Plan, sans ecrire de code. Le plan doit trancher :
1. Ou vivent les resultats de banc (disque + base) et comment ils restent
distincts d'une production normale.
2. Comment se declare une variante : quel axe est modifiable (poids d'identite,
sampler, scheduler, steps, cfg, etage optionnel actif ou non) et comment on
garantit qu'un seul axe change entre deux variantes.
3. Comment le jeu de seeds est fixe et rejoue a l'identique entre variantes.
4. La forme du verdict : quelles metriques agregees, quel critere de
comparaison, et comment on evite de conclure sur un echantillon trop petit.
5. Le decoupage en etapes commitables separement (backend d'abord, ecran
ensuite), avec le test qui accompagne chaque etape.
```

## Points laissés ouverts, volontairement

- La peau n'est pas formalisée comme sous-unité : un monde = une peau en
  V1.
- Le graphe d'édition SDXL pour `rpg-personnage` reste manquant —
  Abyssiaelle n'a toujours pas l'outil NSFW. Indépendant de J8.
- Les étages optionnels sont reconnus comme notion mais non formalisés : à
  traiter quand un deuxième pack en aura réellement besoin, pas avant.
- Créateur de lumière et importeur d'assets restent au backlog Studio IA,
  après J8.
