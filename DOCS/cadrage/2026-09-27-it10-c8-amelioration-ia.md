# IT-10, chantier 8 : l'amélioration des prompts par IA

**Date** : 2026-09-27 · **Décision** : Pierre, 27/09 (le chantier se mène en
trois étapes dans cet ordre : **inventaire** des endroits où l'améliorateur se
place, puis **format** de chacun, puis **modèle par défaut**, interchangeable
au niveau de la plateforme)

Dernier chantier d'IT-10 (`2026-09-25-it10-ateliers.md`, ligne 8). Les
chantiers 1 à 7 ont rendu visibles les fragments de prompt ; celui-ci propose
de les réécrire. Ce document se complète au fil des trois étapes : seule la
première est tranchée.

## Pour qui

Pour le créateur cible (`PROJET.md`, « Pour qui ») qui sait ce qu'est un
prompt mais n'écrit pas couramment le prompt anglais qu'attend un modèle
d'image — et pour l'utilisateur zéro, dont les catalogues de monde portent des
fragments écrits à la main, inégaux d'un lieu à l'autre.

L'améliorateur **propose**, il ne décide jamais : le texte proposé se compare
à l'actuel, et c'est l'utilisateur qui l'accepte (`PROJET.md`,
« Positionnement »).

## Ce qui est constaté

- **La place est déjà réservée, et vide.** `AiPanel.tsx` (composeur de
  scène) montre une consigne, quatre raccourcis et un bouton « Proposer »,
  désactivés, avec « Arrivera avec le branchement du modèle ». La
  comparaison Actuel / Proposé est prévue sur `WordDiff.tsx`.
- **Un modèle de langage local existe déjà.** `llm_local.py` passe par le
  nœud cœur `TextGenerate` de ComfyUI, alimenté par `qwen3vl_4b_fp8_scaled`
  (déclaré au manifeste, ADR-0022). Il sert le composeur (`compose.py`),
  l'analyse d'assets (`assets.py`) et le légendeur. Ollama a été écarté par
  écrit le 10/09 (`2026-09-10-legendage-du-jeu-d-entrainement.md`) :
  dépendance externe non déclarée, contre l'invariant 12.
- **Le modèle de référence cité par Pierre** est celui de Maestro pour son
  « enhance » : `Abhiray/gemma-4-E4B-it-heretic-GGUF`. Deux différences avec
  l'existant, à instruire à l'étape 3 : le **format GGUF** (le chemin actuel
  charge un safetensors par `CLIPLoader`) et la **variante sans refus**
  (« heretic »), qui compte pour la branche NSFW.

## Étape 1 — les endroits (tranché le 27/09)

Treize champs portent un texte qui finit dans un prompt ou dans une consigne
de modèle. Ils se rangent en quatre familles.

### A. Fragments de catalogue — une phrase anglaise courte

| # | Champ | Où | Contrainte de contenu |
|---|---|---|---|
| 1 | Décor d'un lieu | `worlds/catalogSpecs.ts` (`prompt`) | le lieu seul, ni personnage ni action |
| 2 | Fragment d'une intention | `worlds/catalogSpecs.ts` (`prompt_add`) | ne décrit pas le décor |
| 3 | Fragment d'un ton | `worlds/ToneInspector.tsx`, `expression-editor/ToneTextCard.tsx` | même donnée, deux éditeurs |
| 4 | Lumière écrite à la main | `bank/lights/LightInspector.tsx` | la fiche de studio compose déjà la phrase |
| 5 | Pièce ou tenue | `bank/outfits/OutfitInspector.tsx` | un `<input>`, texte très court |
| 6 | Fragment d'un asset | `bank/assets/AssetInspector.tsx` | le modèle vision l'écrit déjà |
| 7 | Texte d'une pose | `pose-editor/PoseTextPanel.tsx` | le corps seul |

### B. La scène

| # | Champ | Où |
|---|---|---|
| 8 | « Ce qui s'y passe », lumière et pose de la scène | `bank/composer/PromptField.tsx` — un composant, trois sites du composeur |
| 9 | La scène entière réécrite depuis une consigne | `bank/composer/panels/AiPanel.tsx` — la place prévue |
| 10 | « Ce qui s'y passe » dans le catalogue de monde | `worlds/catalogSpecs.ts` (`prompt` des scènes) |

### C. Au lancement

| # | Champ | Où |
|---|---|---|
| 11 | Remplacement du prompt final | `produce/PromptPreview.tsx` |

### D. Consignes pour un modèle d'édition — pas un prompt de génération

| # | Champ | Où |
|---|---|---|
| 12 | Consigne d'édition (branche adulte, Qwen) | `produce/EditStep.tsx` |
| 13 | Prompt de retouche au pinceau IA | `photo-editor-advanced/AiRetouchPanel.tsx` |

### Écartés

- **L'ancre d'identité** (`wizard/IdentityStep.tsx`,
  `bank/SceneInspector.tsx`). Elle est verrouillée à l'octet par
  l'assembleur (invariant 3) et le légendeur la substitue mot pour mot : une
  ancre réécrite par une IA périme les mesures d'identité.
- **La demande de « Proposer des scènes »** (`bank/ProposeDialog.tsx`). Ce
  texte part déjà au modèle ; l'améliorer, c'est passer deux fois par lui.

## Étape 2 — les formats

### Tranché le 27/09 (Pierre)

- **Un traducteur français → anglais entre dans le chantier.** On écrit en
  français, le modèle d'image reçoit de l'anglais.
- **La scène entière se réécrit des deux façons** : les trois fragments
  ensemble, pour qu'ils restent cohérents entre eux, ou un fragment à la
  fois.
- **Les consignes d'édition (famille D) restent dans ce chantier.**
- **Le remplacement au lancement (C-11) sort du chantier**, sur
  recommandation, à confirmer par Pierre. Il porte déjà l'ancre d'identité
  (invariant 3). Il ne vaut que pour un lancement, donc une réécriture y
  serait perdue au suivant. Et il mélange tous les fragments, ce qui rend la
  comparaison illisible. Une réécriture faite dans la scène (B-9) sert, elle,
  à chaque lancement.

### Les formats retenus

- **fragment typé** (A, B-8, B-10) : un texte en entrée, un texte du même
  type en sortie, avec une consigne propre au type (un décor ne décrit pas
  le personnage, une pose ne décrit que le corps) ;
- **scène entière sur consigne** (B-9) : les fragments de la scène et une
  consigne libre en entrée. En sortie, les fragments réécrits ensemble ou un
  seul, comparés un à un ;
- **consigne d'édition** (D) : le vocabulaire d'un modèle d'édition, pas
  celui d'un modèle de génération ;
- **traduction** : transversale aux trois formats, et **invisible** (Pierre,
  27/09). Un seul bouton : la langue de l'entrée est détectée. Une entrée
  qui n'est pas en anglais est d'abord traduite fidèlement, sans rien
  ajouter, pour garder le sens. Ce qui en sort passe ensuite à
  l'amélioration. Une entrée déjà en anglais va directement à l'amélioration.

  Conséquence sur la comparaison : un texte français face à une proposition
  anglaise ne se compare pas mot à mot (`WordDiff`). Quand il y a eu
  traduction, les deux textes se montrent côte à côte.

Questions ouvertes : longueur plafond par type, et ce que l'améliorateur
reçoit du contexte (monde, niveau d'intensité), sans jamais recevoir
l'ancre.

## Étape 3 — le modèle par défaut

### Tranché le 27/09 (Pierre), sur les mesures ci-dessous

- **`qwen3vl_4b` est le modèle par défaut.** Gemma reste une option
  ultérieure.
- **« Interchangeable » veut dire un réglage de plateforme**, dans son
  propre fichier, `PLATFORM/llm.json` (comme `lighting.json`, et pas dans
  `capabilities.json`, dont chaque entrée a la forme `{graph, roles}`). Il
  désigne le modèle que ComfyUI charge ; `llm_local` le lit à la place de sa
  constante. Aujourd'hui, `compose.py` et `llm_local.py` ont chacun leur
  constante ; il n'en reste qu'une. Brancher un serveur externe comme
  `llama-server` est un autre chantier, qui n'est pas cadré.
- **Consignes d'édition (famille D) : traduction seule**, jamais
  d'amélioration. Améliorer changerait ce que l'image fera.

### L'instruction

« Interchangeable au niveau de la plateforme » : le modèle se règle à la
couche plateforme (ADR-0017), jamais par personnage ni par pack. À
instruire, dans cet ordre (règle 6 : les données avant l'hypothèse) :

1. **Mesurer l'existant** : `qwen3vl_4b` refuse-t-il de réécrire un fragment
   adulte ? Sur quelques fragments réels de chaque famille, la sortie
   tient-elle son type ?

   **Mesuré le 27/09** : 13 fragments (7 en français, 4 adultes, 2
   consignes d'édition), chaîne détection → traduction → amélioration, un
   seed, jugé à l'œil par Claude. Ce n'est pas encore le jugement de Pierre.
   - **Refus : 0 sur 13**, y compris « nue », « topless » et « enlève son
     soutien-gorge ». L'argument « sans refus » pour un autre modèle n'est
     pas démontré sur cet échantillon.
   - **Traduction fidèle : 7 sur 7.** La détection de langue par
     heuristique (mots outils et accents, sans appel au modèle) : 13 sur 13.
   - **Durée** : 2 s sans traduction, 4 à 5 s avec.
   - **Consigne en prose : inutilisable.** Le modèle répond `user` ou rien.
     La consigne cadrée à réponse JSON (patron de `pose_texte`) marche du
     premier coup. C'est le quatrième cas du même constat (légendeur,
     `pose_texte`, assets).
   - **Défauts de l'amélioration**, qui relèvent de la consigne et pas du
     modèle :
     - des fragments de génération passent à l'impératif (« Stand upright »,
       « Lie naked ») ;
     - des éléments sont inventés : un angle de caméra, « aged stone
       walls » ;
     - un « She » apparaît en tête d'une scène, alors que les fragments du
       catalogue n'ont pas de sujet ;
     - une **consigne d'édition gonflée au-delà de la demande**
       (« déboutonne sa chemise » devient « … bare midriff, no fabric
       covering chest area »). Pour la famille D, améliorer, c'est risquer
       de changer ce que l'image fera.
2. **Le coût du GGUF** : quel custom node charge un GGUF Gemma 4 pour
   `TextGenerate` dans ComfyUI, ou quel serveur à côté — et sa déclaration
   au manifeste (invariant 12).
   **Constaté le 27/09** : le GGUF est déjà sur le poste de Pierre, dans le
   dossier de Maestro (`gemma-4-E4B-it-heretic-Q4_K_M.gguf`). Maestro le
   sert par `llama-server.exe`, le serveur de llama.cpp, un **processus à
   part de ComfyUI**. Pour la plateforme, ce serait un second moteur
   d'exécution de modèle à installer, lancer et surveiller, et un second
   occupant de la VRAM à côté de ComfyUI (5 Go).
3. **Comparer** Gemma 4 E4B heretic et `qwen3vl_4b` sur le même jeu de
   fragments, à l'œil et sur le respect du type.

   **Mesuré le 27/09**, même banc, mêmes consignes, `llama-server` lancé à
   la main pour la mesure puis arrêté. Il faut couper la réflexion du modèle
   (`enable_thinking: false`) : sans ça, Gemma consomme tout son budget de
   tokens à réfléchir et ne répond rien.

   | | `qwen3vl_4b` (ComfyUI) | Gemma 4 E4B heretic (llama.cpp) |
   |---|---|---|
   | Refus | 0 / 13 | 0 / 13 |
   | Traduction fidèle | 7 / 7 | 7 / 7, mais « sa chemise » devient « his shirt » |
   | Durée | 2 à 5 s | 0,3 à 0,6 s, modèle déjà chargé |
   | Idée de l'entrée perdue | aucune | 2 : « topless », « wet hair » |
   | Détail inventé | angle de caméra, murs de pierre | « steaming mug », « sun-drenched », « render with high detail » |
   | Passage à l'impératif | oui | oui, moins souvent |
   | « She » en tête de scène | oui | non |
   | Consigne d'édition gonflée | forte | moindre (« exposing his entire chest ») |

   Aucun des deux ne l'emporte sur la qualité. Gemma écrit mieux et bien plus
   vite, mais perd des idées, ce qui est le défaut le plus grave pour un
   outil qui doit garder le sens. Les défauts communs (impératif, invention,
   gonflement des consignes d'édition) relèvent de la consigne. Le genre du
   sujet (« sa » → his/her) manque aux deux : il faut le fournir dans le
   contexte, sans l'ancre.

## Ce qui entre

| # | Étape | Ce qu'elle livre |
|---|---|---|
| 1 | **Le service** | `AUTOMATION/enhance.py` : détection de la langue, traduction, amélioration par type, lecture de la réponse JSON. Le réglage `PLATFORM/llm.json`. Une route `POST /api/enhance` qui reçoit un type, un texte et le genre du sujet, et rend le texte proposé et s'il y a eu traduction. |
| 2 | **Le bouton sur les fragments** | Dans `PromptField` (3 sites du composeur) et sur les champs des familles A et B-10. Comparaison `WordDiff`, ou côte à côte après une traduction. Accepter ou laisser. |
| 3 | **La scène entière** | `AiPanel` : consigne, raccourcis, les trois fragments ensemble ou un seul. **Rouvre la méthode, sur le modèle de Maestro** (décidé le 27/09) : dialecte du modèle d'image porté par le pack, consigne libre prioritaire, et le cas de Qwen Image Edit pour la famille D. |
| 4 | **Les consignes d'édition** | Le même bouton sur `EditStep` et `AiRetouchPanel`, en traduction seule. |
| 5 | **Audit UX/UI vérifié en vrai** | Sur chaque écran touché (skill `audit-ux-ui`). |

**La consigne se corrige à l'étape 1, sur le banc du 27/09**, avant
d'être branchée à l'interface. Elle doit interdire l'impératif pour un
fragment de génération, interdire le sujet (« She ») et interdire tout
ajout qui n'est pas une précision de ce qui est écrit. Le genre du sujet
vient du personnage, jamais de l'ancre ; le champ qui le porte reste à
identifier.

### Étape 1 : la consigne sur le banc (27/09, trois itérations)

| Défaut du premier banc | Remède | Résultat |
|---|---|---|
| Impératif (« Stand upright ») | règle et exemple dans la consigne | corrigé |
| « She » en tête | règle dans la consigne | corrigé |
| Style télégraphique | exemple de phrase naturelle | corrigé |
| « sa chemise » → « her shirt » | règle, puis exemple : **sans effet** | corrigé par construction : `son/sa/ses` deviennent `le/la/les` avant le modèle |
| Consigne d'édition gonflée | traduction seule | corrigé par construction |
| Idées perdues | température 0,6 → 0,2 | **reste** : « naked », « sensual », « just after a shower » disparaissent, systématiquement (deux passages identiques) |
| Décor inventé (« dust motes, exposed brick wall ») | règle « rien d'ajouté » | **reste** |

Les pertes touchent les mots adultes : `qwen3vl_4b` ne refuse pas, il
adoucit en réécrivant. Trois itérations faites : la suite est un choix de
Pierre.

**Tranché le 27/09 (Pierre).**
- **Les pertes se contrôlent dans le code (option A).** Chaque mot de
  l'entrée, hors mots outils et pronoms, doit se retrouver dans la sortie,
  comparé par sa racine. S'il en manque, le modèle est relancé une fois, en
  nommant les mots oubliés. Ce qui manque encore part dans `lost`, que
  l'interface signale.
- **Les ajouts, eux, se montrent dans la comparaison**, sans contrôle.

Résultat sur le banc : « naked » et « just after a shower » reviennent
après la relance. Reste signalée une vraie perte : « sensual ». Restent
aussi signalés des synonymes : « raised » devenu « lifted », « looking »
devenu « head turned », le verbe « coming ». Une relance ajoute environ 2 s,
pour 6 s au plus.

**Emprunté à Maestro (27/09).** Son guide pour le contenu adulte
(`services/llm_guides/enhance/nsfw_shared.md`) porte la règle « ne jamais
édulcorer ni adoucir ». Ajoutée seule à la consigne, elle garde « naked »,
« sensual », « looking » et « raised » dès le premier appel. Il ne reste
qu'un signalement, « coming ». Le décor inventé, lui, reste et s'allonge
encore dans la cuisine.

### Ce que Maestro fait d'autre, et qui n'entre pas ici

- **Un dialecte par modèle d'image** (`llm_guides/dialect/`, `enhance/`).
  Le guide Flux demande de la prose, jamais des listes séparées par des
  virgules. Il interdit aussi les mots de qualité (« 8k », « masterpiece »).
  Chez nous, c'est la **couche pack** qui connaît la famille du modèle
  (invariant 7). Mais les fragments sont assemblés par l'assembleur verrouillé
  à l'octet (invariant 3). Le dialecte vaut donc pour la scène entière
  (étape 3), ou pour un chantier sur l'assemblage, pas pour un fragment isolé.
- **Le dialecte de Qwen Image Edit** remet en cause « traduction seule »
  pour la famille D. Selon Maestro, ce modèle ignore les formules du genre
  « keep everything else identical ». Il faut aussi lui décrire ce qui
  devient visible quand un vêtement est retiré, parce qu'il ne le devine
  pas. À mesurer sur de vraies éditions avant de rouvrir la décision du
  27/09.
- **Image fixe : pas de verbe de mouvement** (« walking », « reaching »)
  dans une scène ou une pose. C'est une règle de consigne, à mesurer au banc.
- **Texte dans l'image entre guillemets** pour Flux, spécifique au pack,
  comme le dialecte.
- **Une consigne libre ajoutée au texte** : chez Maestro, `@` ajoute une
  consigne prioritaire et `@@` remplace la consigne de base. C'est la
  consigne de l'étape 3 (`AiPanel`).
- **Des nettoyages déterministes après le modèle** (vêtements, remplissage
  narratif, répétitions). C'est la même philosophie que notre contrôle des
  pertes et nos possessifs : garantir dans le code ce que la consigne n'obtient
  pas du modèle.

## Hors périmètre

- **Toute réécriture sans validation** : rien n'est enregistré sans un
  geste de l'utilisateur sur la comparaison.
- **L'ancre d'identité**, et tout ce que l'assembleur verrouille à l'octet.
- **Un modèle distant ou payant** par défaut : rien ne sort de la machine
  sans décision écrite ici.
- **Une exposition MCP** de l'améliorateur (invariant 11 : elle écrirait).

## Critère de sortie

- **Sur le banc du 27/09** (13 fragments, plus ceux de l'étape 1), avec le
  modèle par défaut :
  - aucune idée de l'entrée perdue ;
  - aucun fragment de génération à l'impératif ;
  - aucun sujet ajouté ;
  - une consigne d'édition traduite sans rien de plus ;
  - le bon genre sur « sa chemise ».
  Jugé par Pierre à l'œil, pas seulement par Claude.
- L'`AiPanel` n'annonce plus une capacité vide. Chaque endroit retenu
  propose une réécriture comparée à l'actuel, que seul un geste de
  l'utilisateur enregistre.
- Un échec du modèle remonte à l'interface avec une cause actionnable :
  modèle absent, ComfyUI arrêté, sortie hors format.
- Changer le modèle dans `PLATFORM/llm.json` suffit à changer celui de
  toute la plateforme (composeur, légendeur, assets, améliorateur), sans
  toucher au code.
- Tests du module verts, avec un test qui aurait détecté l'ancre envoyée au
  modèle.
