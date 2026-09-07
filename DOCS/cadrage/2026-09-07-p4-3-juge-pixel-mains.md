# Juge pixel pour les mains — spécification d'implémentation

Cadrage + spec d'exécution (règle 3, `PROJET.md`), écrite pour être
exécutée par un autre agent sans qu'il ait à trancher d'architecture.
Chaque décision de conception est prise ici, avec sa raison ; ce qui
reste ouvert est marqué explicitement comme tel, jamais implicite.

**À lire avant de coder** : `DOCS/cadrage/2026-09-07-p4-3-metrique-mains.md`,
`DOCS/recherche/2026-09-07-signal-geometrique-mains.md`,
`DOCS/adr/0025-tri-automatique-defauts-objectifs.md`, `AUTOMATION/qc_mains.py`
(docstring de tête). Ce document ne répète pas leur contenu, il s'appuie
dessus.

## 1. Le problème, exactement

`AUTOMATION/qc_mains.py` (capacité de plateforme `hands`, P4.3) mesure un
taux de détection de keypoints DWPose. Vérifié empiriquement le 07/09 :
DWPose pose un squelette à pleine confiance (21/21 points) sur des mains
que l'œil juge cassées — deux productions réelles (`intime_chambre_matin_
20260907_01.png`, `..._01_2.png`) scorées 1.0. La sonde géométrique qui a
suivi (15 images, trois indicateurs) a fermé toute piste qui resterait au
niveau du squelette : **l'information manquante n'est pas dans les
keypoints**, elle est dans les pixels que le squelette recouvre.

`ADR-0025` pose la condition d'entrée : une mesure ne devient bloquante
(tri automatique) qu'après avoir démontré sa fiabilité sur corpus
étiqueté, faux positifs et faux négatifs comptés. `hands` v1 ne la
remplit pas (33 % de faux positifs mesurés sur la banque déjà validée).

**Objectif de ce chantier** : ajouter un second étage qui regarde
réellement le crop de la main — candidat retenu dans les trois notes
citées : Florence-2, déjà provisionné dans l'écosystème (patron Skin Fix
de ComfyUI Studio, `DOCS/recherche/2026-09-06-workflows-detail-visage-
mains.md` §2) — et vérifier, avec des chiffres, s'il sépare réellement
les mains cassées des mains propres. **Ce n'est pas acquis.** Florence-2
est un modèle de captioning/détection/grounding, pas un classifieur de
qualité anatomique entraîné pour ça : personne n'a encore vérifié qu'il
sait faire ce qu'on lui demande ici. D'où la structure en deux temps
ci-dessous — jamais d'intégration avant preuve.

## 2. Faits vérifiés sur ce dépôt (pas supposés)

Contre l'installation réelle (`H:\ComfyUI\ComfyUI_windows_portable\
ComfyUI\custom_nodes\comfyui-florence2`, `\comfyui-custom-scripts`) :

- **Node `Florence2Run`** (`nodes.py:309`) : entrées `image` (IMAGE),
  `florence2_model` (FL2MODEL), `text_input` (STRING, optionnel selon
  la tâche), `task` (liste fermée de modes). **Il n'y a pas de mode VQA
  ouvert** ("*est-ce que cette main a l'air normale ?*" n'est pas une
  requête que ce node sait poser) — `docvqa` existe mais c'est le mode
  Document-VQA (formulaires, texte de document), pas de la VQA sur
  image naturelle. Modes utilisables pour juger un crop :
  - `more_detailed_caption` → sortie `caption` (STRING) : une
    description en langage naturel du crop.
  - `caption_to_phrase_grounding` (avec `text_input="hand"`) → sortie
    `data` (JSON) : bbox(es) + label(s) que le modèle associe à la
    phrase "hand" dans l'image. Nécessite un sérialiseur JSON→STRING
    supplémentaire pour être sauvé par le même mécanisme (voir §4) —
    piste secondaire, pas prioritaire.
  - Sortie `caption` (STRING) : texte utile **seulement** pour les
    tâches de captioning (`caption`/`detailed_caption`/
    `more_detailed_caption`/etc.) — pour `caption_to_phrase_grounding`
    c'est le texte brut avant parsing (tokens `<loc_..>`, illisible),
    l'info utile est dans `data`.
- **Modèle déjà téléchargé sur ce poste** :
  `models/LLM/Florence-2-Flux-Large/` = `gokaygokay/Florence-2-Flux-
  Large` (fine-tune spécialisé captioning, pas un Florence-2 générique).
  Aucun téléchargement supplémentaire nécessaire si ce modèle convient.
  Widget `DownloadAndLoadFlorence2Model.model` doit valoir exactement
  `gokaygokay/Florence-2-Flux-Large`, `precision` = `fp16`.
- **`Florence2Run` n'est PAS un `OUTPUT_NODE`** — sa sortie `caption`
  n'apparaît pas dans `/history` sans un nœud de sortie en aval.
- **Mécanisme de sauvegarde texte déjà disponible, zéro config
  supplémentaire** : `SaveText|pysssss` (`comfyui-custom-scripts/py/
  text_files.py`), `OUTPUT_NODE = True`. Son `root_dir="output"` résout
  déjà vers `$output/**/*.txt`
  (`comfyui-custom-scripts/user/text_file_dirs.json`, vérifié tel quel
  sur ce poste — **aucune modification de ce fichier de config
  n'est nécessaire**). Écrit avec `open(path, "w")` : **le
  sous-dossier doit exister avant l'appel**, ce nœud ne le crée pas
  (contrairement à `SaveImage`).
- **Licences** — `comfyui-florence2` MIT (déjà dans le tableau de
  `DOCS/recherche/2026-09-06-workflows-detail-visage-mains.md`),
  `comfyui-custom-scripts` MIT (`Copyright (c) 2023 pythongosssss`).
  Aucun frein.
- **Ni `comfyui-florence2` ni `comfyui-custom-scripts` ne sont dans
  `AUTOMATION/comfyui_manifest.json`** aujourd'hui, alors qu'ils sont
  installés sur ce poste. Gap réel vis-à-vis de l'invariant 12 — à
  combler dans ce commit (§5.5), pas seulement pour ce chantier :
  `comfyui-florence2` était déjà utilisé de fait (captioning commun aux
  deux packs, `modeles-par-pack.md`) sans jamais avoir été déclaré.

## 3. Architecture retenue

**Deux sauts ComfyUI, un crop en Python entre les deux — jamais un seul
graphe qui ferait tout.**

1. **Extraction DWPose** (déjà en place, capacité `hands`,
   `WORKFLOWS/utils/pose_extract_ui.json`) : donne le squelette complet
   de l'image de production, y compris les 21 points par main. Inchangé.
2. **Crop, en Python pur, sans ComfyUI** (PIL, déjà une dépendance du
   repo) : bounding box des points détectés d'UNE main, avec marge,
   depuis les coordonnées déjà obtenues à l'étape 1 — jamais une
   deuxième extraction DWPose pour recalculer ce qu'on a déjà.
3. **Jugement Florence-2** (nouveau graphe `WORKFLOWS/platform/
   hands_judge_ui.json`) : soumet le CROP (pas l'image entière) à
   Florence-2, récupère un texte, et c'est CE texte que le code Python
   interprète.

**Pourquoi pas tout dans un seul graphe ComfyUI** (DWPose + crop +
Florence-2 en une soumission) : le crop dépend d'un calcul (bbox +
marge) plus simple et plus lisible à faire en Python testable
(`qc_mains.py` a déjà cette discipline : fonctions pures séparées de
l'orchestration ComfyUI) qu'à câbler avec des nœuds `ImageCrop`
paramétrés dynamiquement par job — et ça garde les deux étages
indépendamment débogables (on peut rejouer le jugement sur un crop
sauvegardé sans refaire l'extraction).

**Pourquoi un jugement PAR main** (pas une seule passe sur l'image
entière) : demander à Florence-2 de juger "les mains" sur l'image
complète le laisserait libre de décrire n'importe quoi d'autre dans le
cadre (visage, corps, décor) et diluerait le signal. Chaque main
évaluée par `qc_mains.metrique()` (poignet détecté) reçoit son propre
crop et son propre jugement ; le score image final reste le **minimum**
des mains jugées — même agrégation que la v1 DWPose, cohérence de
patron.

**Coût assumé, à ne pas cacher** : ce chantier ajoute **un aller-retour
ComfyUI supplémentaire par main évaluée**, en plus de celui déjà fait
pour DWPose — jusqu'à deux par image. Une stratégie "n'appeler le juge
pixel que si le score DWPose est bas" a été explicitement écartée :
c'est justement le cas qui a motivé ce chantier (score DWPose 1.0 sur
les deux mains cassées) — un tel filtre n'aurait rien attrapé de ce
qu'on cherche à attraper. Le juge pixel tourne sur CHAQUE main évaluée,
sans condition. Le coût réel (secondes par image) est mesuré à l'étape 0.

## 4. ÉTAPE 0 — Validation empirique, OBLIGATOIRE avant toute intégration

**Rien de ce qui suit (§5) ne se code avant que cette étape ait produit
un verdict GO écrit.** Script jetable, pas un module du repo — dans le
répertoire de scratch de l'agent qui l'exécute, jamais commité tel quel.

### 4.1 — Jeu d'images étiquetées

Réutiliser les images déjà identifiées dans cette session, pas en
choisir de nouvelles à l'aveugle :

**Mains cassées (confirmées à l'œil ET par la sonde géométrique)** :
- `PROD/LENA/OK/intime_chambre_matin_20260907_01.png` — main gauche
  (`hand_left_keypoints_2d`) fondue dans la cuisse.
- `PROD/LENA/OK/intime_chambre_matin_20260907_01_2.png` — les deux
  mains visuellement dégradées.

**Mains propres (confirmées à l'œil)** :
- `PROD/LENA/OK/lifestyle_salon_lecture_20260824_01.png` — deux mains,
  tient un livre.
- `PROD/LENA/OK/selfie_miroir_entree_20260822_02.png` — une main tient
  un téléphone.
- `PROD/LENA/REJET/selfie_miroir_entree_20260822_01.png` — une main
  tient un téléphone (rejetée pour l'identité, pas pour la main).
- `PROD/LENA/_NSFW/OK/nsfw_intime_lit_reveil_agite_20260826_01_2_
  20260826_021301.png` — une main visible.
- `PROD/LENA/REJET/mode_chambre_soir_20260826_02_2.png` — une main sur
  un oreiller.

Minimum 2 mauvaises, 5 bonnes. Si le temps le permet, étendre l'échantillon
plutôt que le réduire — un signal qui "marche" sur 7 images est fragile,
le dire dans le rapport (§4.4) plutôt que le taire.

### 4.2 — Extraire et cropper chaque main évaluée

Pour chaque image, chaque main dont le poignet est détecté (même
logique que `qc_mains.metrique()`, à réutiliser — ne pas dupliquer le
gating par poignet) :

1. Appeler `qc_mains._mesure(...)` en mode debug (ou reproduire ses
   trois premiers blocs : upload, soumission `pose_extract_ui.json`,
   lecture du frame POSE_KEYPOINT — voir `AUTOMATION/qc_mains.py::
   _mesure` pour le code exact à réutiliser, ne pas le réécrire).
2. **Nouvelle fonction pure à ajouter dans `qc_mains.py`** (utile aussi
   pour l'intégration finale, §5.1) :

   ```python
   def bbox_main(people_entry, cote, marge_frac=0.35, marge_min_px=40):
       """Boite englobante (x0,y0,x1,y1) des points detectes de la main
       `cote` ("droite"/"gauche"), plus le poignet du corps si le point 0
       de la main lui-meme n'est pas detecte. Marge = max(marge_frac *
       diagonale de la boite brute, marge_min_px), sur les quatre cotes.
       None si aucun point n'est detecte pour cette main."""
   ```

   Marge de départ `0.35` / `40px` — **valeur de confort, pas mesurée**.
   Avant d'aller plus loin : sauver 3-4 crops sur le disque et les
   REGARDER. Si le crop rogne des doigts visiblement ou au contraire
   noie la main dans un décor immense, ajuster `marge_frac` à l'œil
   avant de lancer Florence-2 dessus — inutile de mesurer un signal
   contre des crops mal cadrés.
3. `Image.open(path).crop((x0,y0,x1,y1))` (PIL, déjà une dépendance),
   sauver chaque crop sous un nom qui trace son origine, ex.
   `<image>__main_<cote>.png`, dans le répertoire de scratch.

### 4.3 — Construire le graphe de test dans ComfyUI (pas à la main)

Même règle que tout fichier `_ui.json` du repo (`workflow-comfyui`,
§ Format) : **assemblé et sauvegardé depuis l'interface ComfyUI**,
jamais un JSON écrit à la main (widgets_values est positionnel et
dépend de l'ordre serveur — voir `references/format-ui-mecanique.md`).

Dans ComfyUI (`http://127.0.0.1:8188`, `python -c "import comfy_server;
comfy_server.ensure()"` si éteint) :

1. `LoadImage` — titre **`CROP MAIN`**.
2. `DownloadAndLoadFlorence2Model` — `model` =
   `gokaygokay/Florence-2-Flux-Large`, `precision` = `fp16`.
3. `Florence2Run` — titre **`Florence2 - jugement main`** — brancher
   `image` sur `LoadImage`, `florence2_model` sur le loader. `task` =
   `more_detailed_caption` pour le premier essai (voir §4.4 pour les
   variantes à tester), `text_input` vide, `fill_mask` = False (les
   sorties `image`/`mask` ne servent pas ici, ne pas les brancher).
4. `SaveText|pysssss` — titre **`JUGEMENT MAIN (texte)`** — `root_dir` =
   `output`, `file` = un nom fixe pour l'essai manuel (ex.
   `_HANDS_JUDGE/essai.txt` — **créer le sous-dossier
   `ComfyUI/output/_HANDS_JUDGE/` à la main avant de lancer**, ce nœud
   n'auto-crée pas), `append` = `overwrite`, `text` branché sur la
   sortie `caption` de `Florence2Run`.

Sauver sous `WORKFLOWS/platform/hands_judge_ui.json` (nom définitif,
sera réutilisé tel quel en §5 si GO — pas de fichier "test" séparé du
fichier final, un seul graphe pour les deux usages).

Valider hors ligne avant tout envoi : `wf_check.py --roles` sur ce
fichier (le rôle attendu n'existe pas encore dans une table `ROLES_*` —
normal, ce graphe n'a pas de rôles pilotés par un runner de production ;
`--roles` sert ici surtout à détecter un lien orphelin ou un type
inconnu). Puis `wf_check.py --essai` — obligatoire, c'est le seul niveau
qui aurait détecté une entrée manquante sur un graphe neuf.

### 4.4 — Faire tourner et lire les résultats, sans conclure trop vite

Pour chaque crop (§4.2), soumettre le graphe (patcher `LoadImage` avec
le nom du crop, `SaveText` avec un nom de fichier unique par crop — même
technique que `qc_mains._mesure` : uuid dans le nom, pas "overwrite" sur
un nom fixe une fois qu'on boucle sur plusieurs crops). Collecter les
captions brutes dans un tableau `image | main | mauvaise? | caption`.

**Tester au minimum deux modes de tâche**, pas un seul :
- `more_detailed_caption` — la piste principale, patron déjà utilisé
  par ce modèle dans Skin Fix (ComfyUI Studio).
- `caption_to_phrase_grounding` avec `text_input="hand"` — si le
  premier mode ne sépare rien, celui-ci est la piste de repli
  (nécessite de router `data` plutôt que `caption`, donc un nœud
  supplémentaire pour sérialiser le JSON en STRING avant `SaveText` —
  chercher un nœud de conversion générique dans `comfyui_essentials`
  ou `comfyui-kjnodes`, déjà provisionnés, plutôt qu'en écrire un).

**Ce qui compte à la lecture** : est-ce qu'une règle simple et
*écrite après avoir lu les captions réelles* — pas devinée avant —
sépare les 2 mauvaises des 5+ bonnes ? Exemples de règles possibles
(à confirmer ou à rejeter contre les captions réellement obtenues, ne
JAMAIS présumer laquelle marche avant de les avoir lues) :
présence/absence du mot "hand"/"fingers" dans la caption, longueur de
la caption (un crop illisible produit souvent une description généra-
liste très courte), mots comme "blurry"/"unclear"/"distorted" — Florence-2
peut aussi ne JAMAIS produire ce genre de mot et décrire une main
cassée avec la même assurance qu'une main propre (risque réel,
documenté nulle part avant ce test — c'est précisément ce qu'on
vérifie).

### 4.5 — Rapport écrit, critère GO/NO-GO explicite

Nouveau fichier `DOCS/recherche/AAAA-MM-JJ-juge-pixel-mains-resultats.md`
(date du jour de l'exécution), même format que
`2026-09-07-signal-geometrique-mains.md` : le tableau complet des
captions obtenues, la règle de décision retenue (ou testée et rejetée),
et un verdict net.

**GO** si une règle simple sépare les mauvaises des bonnes sans aucune
erreur sur cet échantillon (2 mauvaises, 5+ bonnes) — et le temps par
image mesuré (chargement du modèle inclus au premier appel, exclu
ensuite). Passer à l'étape 5.

**NO-GO** si aucune règle ne sépare proprement, ou si le signal est
fragile (marche sur 6/7 mais pas 7/7, ou repose sur un détail qui sent
le sur-ajustement à ce petit échantillon). Dans ce cas : **s'arrêter
là**, ne pas coder l'intégration, ne pas essayer un troisième mode de
tâche Florence-2 sans repasser par une décision explicite (même
discipline que la fermeture de la piste géométrique en §P4.3). Le
rapport négatif est un livrable complet en lui-même — noter dans
`DOCS/cadrage/2026-09-06-phase-4-qualite-workflows-mains.md` (section
P4.3) que ce volet est fermé, avec la raison, sur le même modèle que
l'entrée du 07/09 sur la géométrie.

## 5. ÉTAPE 1+ — Intégration, SEULEMENT si §4.5 dit GO

### 5.1 — `AUTOMATION/qc_mains.py`

Ajouter, sans toucher aux fonctions existantes (`metrique`, `verdict`,
`mesure` gardent leur signature — addition, pas modification, même
discipline que le chantier P4.3 initial) :

- `bbox_main(people_entry, cote, marge_frac=0.35, marge_min_px=40)` —
  écrite en §4.2, à garder telle quelle si la marge choisie pendant
  l'étape 0 a été ajustée, sinon avec les valeurs par défaut ci-dessus.
- `juge_pixel(chemin_crop, comfy_url, timeout=180)` — soumet
  `WORKFLOWS/platform/hands_judge_ui.json` sur le crop déjà présent sur
  disque (le crop est produit par l'appelant, cette fonction ne fait
  QUE la soumission ComfyUI + lecture du texte), retourne la caption
  brute (`str`) ou `None` sur échec. Même patron défensif que
  `_mesure` : jamais d'exception qui remonte, log + `None`.
- `_verdict_pixel(caption)` — pure, applique la règle décidée à
  l'étape 4.5 (écrite en clair dans le code, avec en commentaire la
  référence au rapport qui l'a établie — ex. `# règle etablie dans
  DOCS/recherche/AAAA-MM-JJ-juge-pixel-mains-resultats.md, §4.4`).
  Rend un verdict parmi les MÊMES constantes déjà définies
  (`OK`/`SUSPECT`/`CASSE`) — pas un nouveau vocabulaire.
- Modifier `_mesure()` pour, quand une main est évaluée par
  `metrique()`, appeler `bbox_main` + cropper (PIL) + `juge_pixel` +
  `_verdict_pixel` sur CETTE main, et combiner ce verdict avec le score
  de détection existant. **Règle de combinaison** : le verdict le plus
  sévère l'emporte (`CASSE` > `SUSPECT` > `OK`) — le juge pixel peut
  dégrader un score de détection élevé (le cas qui a motivé ce
  chantier), jamais l'inverse (un score de détection bas mais un juge
  pixel qui dit "main propre" ne doit pas suffire à remonter en OK :
  la détection basse elle-même reste un signal, même faible). Le champ
  `verdict` retourné par `mesure()` devient donc le pire des deux ;
  ajouter un champ `verdict_detection` et `verdict_pixel` séparés dans
  le dict retourné, pour que la Revue (§5.4) puisse un jour les
  distinguer si besoin — mais ne PAS les afficher séparément dans
  cette étape, un seul verdict combiné suffit pour l'instant.

Docstring de tête du module à étendre avec un paragraphe "CHOIX
DOCUMENTÉ" sur le juge pixel, même style que l'existant.

### 5.2 — `AUTOMATION/tests/test_qc_mains.py`

- Bloc `[1]` (pur, hors ComfyUI) : tester `_verdict_pixel()` sur des
  captions fabriquées à la main reproduisant celles du rapport §4.5
  (les vraies captions obtenues, pas des exemples inventés).
- Bloc `[2]` (réel) : étendre les 3 cas existants avec le verdict
  combiné attendu sur les DEUX images cassées du 07/09 (actuellement
  seule `sport_course_20260823_01.png`, cas "hors-cadre", est testée en
  réel pour un score bas — les deux images à mains réellement cassées
  n'étaient pas dans ce test parce que la v1 ne les détectait pas ;
  elles y entrent maintenant).

### 5.3 — `PLATFORM/capabilities.json`

Nouvelle entrée, capacité séparée (un graphe = une capacité, comme
`upscale`/`hands` — ne pas surcharger l'entrée `hands` existante qui
pointe sur un graphe différent) :

```json
"handsjudge": {
  "graph": "WORKFLOWS/platform/hands_judge_ui.json",
  "roles": ["source", "save"]
}
```

Nom `handsjudge` (pas de séparateur, minuscule) : suit la convention
ADR-0018 (`upscale`, `bench`, `hands` — nom court, pas de préfixe/
underscore) au prix de ne pas être un mot du dictionnaire ; alternative
`handquality` jugée moins claire, tranchée ici pour ne pas laisser ce
choix à l'exécutant. `roles` : `source` = `LoadImage` (titre `CROP
MAIN`), `save` = `SaveText|pysssss` (titre `JUGEMENT MAIN (texte)`) —
les deux seuls nœuds que `qc_mains.py` adresse. Ajouter une entrée
`_notes` expliquant pourquoi une capacité séparée de `hands` (deux
graphes distincts, pas une généralisation du premier), même style que
les notes déjà présentes dans ce fichier.

Étendre `AUTOMATION/tests/test_platform_capabilities.py` avec un bloc
`[1]` pour `handsjudge`, même modèle que celui ajouté pour `hands`.

### 5.4 — `AUTOMATION/comfyui_manifest.json`

Ajouter DEUX entrées `custom_nodes` (gap déjà présent avant ce
chantier, §2, à combler ici) :

```json
{
  "id": "comfyui-florence2",
  "source": "registry",
  "publisher": "kijai",
  "version": "1.1.0",
  "repo": "https://github.com/kijai/ComfyUI-Florence2",
  "pip": "no-deps",
  "patches": [],
  "packs": ["platform"]
},
{
  "id": "comfyui-custom-scripts",
  "source": "registry",
  "publisher": "pythongosssss",
  "version": "1.2.5",
  "repo": "https://github.com/pythongosssss/ComfyUI-Custom-Scripts",
  "pip": "no-deps",
  "patches": [],
  "packs": ["platform"]
}
```

`publisher: "kijai"` réutilise exactement le slug déjà présent dans ce
manifeste pour `ComfyUI-KJNodes` (même auteur, confirmé par le nom dans
le fichier `LICENSE` de `comfyui-florence2` — "Jukka Seppänen" = kijai).
`publisher: "pythongosssss"` déduit du nom d'auteur dans la `LICENSE`
de `comfyui-custom-scripts`, **à vérifier** avec
`comfy node registry-search comfyui-custom-scripts` (ou
`https://registry.comfy.org`) avant de committer — si le slug réel
diffère, corriger la valeur, la structure de l'entrée ne change pas.

Ajouter une entrée `models` pour le poids Florence-2 :

```json
{"filename": "Florence-2-Flux-Large", "dest": "LLM",
 "url": "https://huggingface.co/gokaygokay/Florence-2-Flux-Large",
 "packs": ["platform"],
 "note": "Dossier HuggingFace complet (snapshot_download), pas un fichier unique — voir DownloadAndLoadFlorence2Model dans comfyui-florence2/nodes.py."}
```

### 5.5 — `AUTOMATION/runner/sortie.py` — trancher les deux points laissés ouverts par ADR-0025

**Seulement une fois que le juge pixel a un GO et un seuil calibré**
(pas avant — brancher un tri automatique sur une mesure non calibrée
reproduirait exactement l'erreur que ADR-0025 corrige).

1. **Bucket de destination** — tranché ici : **`A_REVOIR`**, jamais
   `REJET` directement. Raison : `A_REVOIR` existe déjà, a déjà un
   onglet dans la Revue, et reste réversible — un faux positif du juge
   (qui existera, même calibré) ne doit jamais détruire silencieusement
   une bonne image. `REJET` reste réservé au jugement humain explicite.
2. **Trace laissée à l'utilisateur** — tranché ici : **aucun nouveau
   champ de schéma**. Le score `mains` et son verdict sont déjà
   affichés dans `FullFrame.tsx` (P4.3, étape 5) à côté du score
   d'identité — un utilisateur qui ouvre une image en `A_REVOIR` voit
   déjà lequel des deux scores est hors bande. Si l'usage réel montre
   que ce n'est pas assez explicite (à observer après coup, pas à
   anticiper), un champ `motif` sur l'entrée `mesures.json`/`base.py`
   serait l'extension naturelle — non fait dans ce chantier, faute de
   preuve qu'il manque.

Modification dans `execute_jobs` (autour de la ligne où `mesurer_mains`
est déjà appelé, juste avant `sort_and_export`) :

```python
mains = mesurer_mains(src, cfg)
if mains:
    reel = {**(reel or {}), **mains}
    if mains.get("mains_verdict") in ("CASSE",) and verdict == "OK":
        verdict = "A_REVOIR"
```

`mesurer_mains` doit donc aussi remonter le verdict combiné (pas
seulement le score) — étendre son retour avec une clé
`mains_verdict`, sans casser la forme `{"mains": score}` déjà
consommée par `ranger_mesures`/`mesures.maj` (clé additionnelle, jamais
un remplacement). **Ne dégrade jamais un verdict `A_REVOIR`/`REJET`/
`SANS_VISAGE` déjà décidé par l'identité** — seul `OK → A_REVOIR` est
autorisé ; l'identité reste prioritaire pour tout ce qui n'est pas
`OK`, cohérent avec ADR-0025 (l'identité reste arbitrée par
l'utilisateur, ce mécanisme ne la contourne pas).

### 5.6 — Tests de non-régression obligatoires avant tout commit

- `AUTOMATION/tests/test_qc_mains.py` (étendu §5.2) vert.
- `AUTOMATION/tests/test_platform_capabilities.py` (étendu §5.3) vert.
- `AUTOMATION/tests/test_execute_jobs_sink.py` — **rejouer explicitement**,
  ce test a déjà révélé un bug réel dans P4.3 (dict `{"mains": None}`
  faussement vrai) exactement à cet endroit du code ; le même risque
  existe pour `mains_verdict`.
- `AUTOMATION/tests/test_coherence_base.py` — vérifier si
  `mains_verdict` doit rejoindre `GENRES_FICHIER`/`demesurer()` (suivre
  la même méthode que P4.3 §Étape 4 : lire si `ranger_mesures` écrit
  aussi ce champ dans `mesures.json`, pas supposer).
- Un run réel sur les deux images du 07/09 : `verdict` final doit
  passer de `OK` à `A_REVOIR` pour les deux, sans changer le
  comportement d'aucune image déjà correctement classée du corpus
  d'étape 0.

## 6. Fichiers touchés — récapitulatif

**Étape 0** (aucun fichier du repo modifié, sauf le graphe lui-même) :
- Nouveau : `WORKFLOWS/platform/hands_judge_ui.json`
- Nouveau : `DOCS/recherche/AAAA-MM-JJ-juge-pixel-mains-resultats.md`

**Étape 1+ (conditionnelle à un GO)** :
- Édition : `AUTOMATION/qc_mains.py`
- Édition : `AUTOMATION/tests/test_qc_mains.py`
- Édition : `PLATFORM/capabilities.json`
- Édition : `AUTOMATION/tests/test_platform_capabilities.py`
- Édition : `AUTOMATION/comfyui_manifest.json`
- Édition : `AUTOMATION/runner/sortie.py`
- Édition conditionnelle : `AUTOMATION/tests/test_coherence_base.py`,
  `AUTOMATION/mesures.py` (selon ce que révèle la vérification §5.6)
- Édition : `DOCS/cadrage/2026-09-06-phase-4-qualite-workflows-mains.md`
  (P4.3 passe de "informative" à "trie automatiquement OK→A_REVOIR",
  avec renvoi vers ce document et le rapport §4.5)
- Édition : `ROADMAP.md` (section Phase 4, P4.3) et
  `soulglade-fil-conducteur.html` (`ROADMAP_DATA` uniquement, jamais le
  CSS ni le rendu — règle `CLAUDE.md`)

## 7. Ce qui reste volontairement hors de ce document

- **P4.5 (proportions)** : chantier séparé, cadré indépendamment
  (`DOCS/cadrage/2026-09-07-p4-5-proportions.md`). Aucun recouvrement —
  ne pas fusionner les deux chantiers même si le juge pixel s'avère
  utile pour d'autres défauts un jour.
- **Étendre le juge pixel à d'autres défauts** (visage, membres) — hors
  périmètre, non demandé, non instruit ici.
- **Calibration du seuil par personnage au-delà de Léna** — ce document
  couvre Léna ; Abyssiaelle est explicitement hors périmètre de la
  phase 4 (voir la phase 4 elle-même) et n'a pas de pipeline mains à
  ce jour.
