# Détail visage/mains : ComfyUI Studio vs pipeline SoulGlade (P4.1)

Descend d'un cran sous `DOCS/recherche/2026-09-05-comfyui-studio-v362.md`
(inventaire structurel) pour comparer, graphe par graphe et étage par
étage, comment ComfyUI Studio traite le détail visage/peau et les mains,
face au pipeline de production réel de SoulGlade. Alimente P4.3
(détection des mains) et P4.4 (adoption d'un étage) du cadrage
`DOCS/cadrage/2026-09-06-phase-4-qualite-workflows-mains.md`.

**Méthode** : lecture directe des JSON (format UI — groupes, nœuds,
`widgets_values`), jamais copiés. Licence de chaque custom node candidat
vérifiée par son `LICENSE`/`pyproject.toml` sur l'installation ComfyUI
Studio (`H:\ComfyUIStudio\v362\App\ComfyUI\custom_nodes\`).

**Fichiers inspectés** — voir la liste complète en fin de note.

**Note liminaire** : le cadrage cite « §7 du cadrage J8 » pour les deux
contraintes non négociables (jamais copier un graphe tiers, vérifier la
licence). Le fichier source (`DOCS/cadrage/2026-09-04-architecture-
quatre-couches.md`, référencé par `DOCS/cadrage/README.md`, `ROADMAP.md`
et `BACKLOG.md`) est introuvable dans le dépôt — recherche plein texte et
historique git sans résultat, jamais commité. Les deux contraintes sont
de toute façon données explicitement dans la demande de ce chantier ;
appliquées telles quelles ci-dessous. À signaler à Pierre, pas un sujet à
creuser dans cette note.

## Constat qui cadre toute la suite : l'asymétrie Flux/SDXL est déjà là, avant tout ajout

Avant de comparer aux outils tiers : le pipeline SoulGlade actuel n'est
**pas symétrique entre les deux familles**, indépendamment de ce chantier.

- **Flux/Léna** (`WORKFLOWS/content/lena_master_prod_ui.json`) a déjà un
  refiner de réalisme (groupe 07, SDXL img2img denoise 0.40) **et** un
  FaceDetailer (groupe 08, PuLID-patché) **et** un upscale (groupe 09),
  tous les trois en bypass par défaut mais câblés, mesurés, documentés à
  l'octet près dans les notes du graphe (identité 0.72-0.78 conforme).
- **SDXL/Abyssiaelle** (`WORKFLOWS/content/abyssiaelle_master_prod_ui.json`)
  est un **brouillon J6 à 13 nœuds** : Checkpoint → IPAdapter FaceID →
  KSampler unique (dpmpp_2m/karras, 30 steps, cfg 6.0) → VAEDecode →
  SaveImage. **Aucun refiner, aucun FaceDetailer, aucun upscale.** Le
  fichier le dit lui-même dans sa note : « BROUILLON J6 étape 3 ». La
  capacité plateforme `upscale` (`PLATFORM/capabilities.json`) reste
  disponible pour ce pack en théorie (elle ne dépend d'aucun pack), mais
  rien dans le graphe de production ne l'invoque aujourd'hui.

Conséquence directe pour P4.4 et le critère de sortie de la phase (§3,
« une amélioration qui n'aide qu'une des deux familles est une
régression déguisée sur l'autre ») : **tout étage testé sur Abyssiaelle
mesurera un gain face à une base quasi nulle**, pas face à un pipeline
déjà affiné comme pour Léna. Un candidat qui améliore Abyssiaelle de
façon spectaculaire ne prouve rien en soi — il faut d'abord amener SDXL
au même niveau de base (refiner + FaceDetailer, qui existent déjà comme
patron côté Flux) avant de comparer des étages de détail plus avancés.
Ce n'est pas dans le périmètre de P4.1, mais P4.2 (banc de comparaison)
et P4.4 doivent le savoir avant de lancer une mesure.

## Carte comparative

### 1. Retouch Pro (`RETOUCH PRO 3.json`)

Un seul fichier, 3 variantes de moteur en groupes bypassables (pas de
fichiers séparés) : `RETOUCH PRO SDXL`, `RETOUCH PRO FLUX GGUF`,
`RETOUCH PRO inpaint`.

| Question | Réponse |
|---|---|
| Custom nodes absents de SoulGlade | `ComfyUI_LayerStyle_Advance` (`LayerUtility: HLFrequencyDetailRestore`), `rgthree-comfy` (Lora Loader Stack, Image Comparer — déjà utile ailleurs mais pas dans le manifeste SoulGlade), `comfyui-styles_csv_loader` (Load Styles CSV), `IPAdapterStyleComposition` (transfert de texture par image de référence) |
| Étage détail visage/peau | `LayerUtility: HLFrequencyDetailRestore` en fin de chaîne, sur les 3 variantes — séparation haute/basse fréquence entre l'image régénérée et la source, recompose la texture fine sans re-diffuser. Paramètres vus : `[10, 8, 0]` (SDXL), `[10, 10, 0]` (Flux GGUF, inpaint) |
| Étage mains | Aucun. Négatif SDXL vide, pas de mention mains dans les 3 variantes |
| Sampler/scheduler/steps/cfg | SDXL : KSampler `ddpm`/`exponential`, 20 steps, cfg 2, denoise 1 (régénération complète, pas un refiner). Flux GGUF (`flux1-dev-Q4_0.gguf`, quantifié) : `SamplerCustomAdvanced` + `KSamplerSelect euler` + `BasicScheduler simple`, 10 steps, `FluxGuidance` 3.5. Écart avec SoulGlade : Flux tourne à guidance 2.2 côté Léna (« peau moins lissée qu'à 3.5 », note du graphe) — Retouch Pro utilise justement la valeur que SoulGlade a mesurée et écartée |
| Ordre des étages | Génère/inpainte au format cible (souvent 1024-1200px via `ImageResizeKJ`) → `HLFrequencyDetailRestore` en tout dernier, après compositing. Pas d'upscale dans ce fichier — la HD est un fichier séparé |
| Autre | ControlNet en mode `segment` (guidage par masque sémantique) sur les 3 variantes ; `IPAdapterStyleComposition` + `LoadImage TEXTURE` optionnels (bypass) pour injecter une texture de peau/matière externe —技 risque identité plus élevé, non retenu comme candidat (voir plus bas) |

### 2. Skin Fix (`0-IMAGE/SKIN FIX 3.json`)

3 variantes : `SKIN FIX sdxl` (×2 groupes de même nom, un pour SDXL
classique et un mal étiqueté « SKIN FIX Z image » pour Z-Image),
`SKIN FIX qwen realistic`.

| Question | Réponse |
|---|---|
| Custom nodes absents de SoulGlade | `comfyui_face_parsing` (`FaceParse`, `FaceParsingModelLoader`, `FaceParsingResultsParser` — segmentation sémantique du visage par classe : peau, yeux, lèvres…), `ComfyUI_LayerStyle_Advance` (`LayerMask: PersonMaskUltra V2` — matting précis, `LayerUtility: PurgeVRAM`, `HLFrequencyDetailRestore`), `comfyui-florence2` (captioning auto de la zone masquée — **déjà listé comme commun aux deux packs** dans `modeles-par-pack.md`, donc déjà disponible) |
| Étage détail visage/peau | Pipeline complet : `PersonMaskUltra V2` (matting `VITMatte(local)`, seuils 0.01/0.99) segmente la peau → `FaceParsingResultsParser` exclut yeux/lèvres/sourcils de la zone à retoucher → `GrowMaskWithBlur` (grow 15px, blur 4) adoucit les bords → `SetLatentNoiseMask` + `KSampler` régénère **seulement la zone masquée** → `ImageCompositeMasked` recolle sur l'original → `HLFrequencyDetailRestore` (variante Qwen uniquement, `[5, 5, 0]`) |
| Étage mains | Aucun — le masque `PersonMaskUltra V2` cible la peau visible en général mais rien n'isole ni ne corrige spécifiquement les mains dans ce fichier |
| Sampler/scheduler/steps/cfg | SDXL : `dpmpp_sde`/`karras`, 20 steps, cfg 2, denoise 0.3. Qwen (checkpoint `qwreal`, custom) : `euler`/`simple`, 10 steps, cfg 1, denoise 0.3 — cohérent avec les valeurs basses déjà utilisées côté SoulGlade pour Qwen-Image-Edit (`nsfw_branch`, cfg 1, 4-8 steps) |
| Ordre des étages | Masque → caption auto (Florence2) → régénération **locale, denoise faible (0.3)** → composite → (option) frequency restore |
| Autre | Utilise `ControlNetApplyAdvanced` en mode `segment` comme Retouch Pro. C'est la seule des 3 recherches à faire de la **régénération localisée par masque précis** plutôt qu'un refiner pleine image — voir candidat #2 plus bas |

### 3. Portrait Master (`PORTRAIT MASTER.json`)

Pas vraiment un outil de détail : le nœud `PortraitMaster`
(`comfyui-portrait-master`) est un **constructeur de prompt structuré**
(âge, ethnie, coiffure, lumière… par listes déroulantes), avec un
upscaler Inspire Pack optionnel en aval.

| Question | Réponse |
|---|---|
| Custom nodes absents de SoulGlade | `comfyui-portrait-master` (nœud `PortraitMaster`), `comfyui-inspire-pack` (`PixelKSampleUpscalerProvider`, `IterativeLatentUpscale`, `KSampler //Inspire`) |
| Étage détail visage/peau | Aucun dédié — c'est le prompt qui porte les descripteurs de peau (`natural skin`, `skin details, skin texture`), pas un mécanisme de traitement d'image |
| Étage mains | Aucun mécanisme — uniquement du **negative prompting** (`bad anatomy… fused fingers, malformed limbs, missing arms, missing legs, mutated hands, poorly drawn hands, too many fingers`). Utile à citer dans le mini-inventaire (§ plus bas) comme référence de ce qui **ne détecte ni ne corrige rien** |
| Sampler/scheduler/steps/cfg | `KSampler //Inspire` : `ddpm`/`exponential`, 20 steps, cfg 2 (checkpoint `realvisxlV40...LightningBakedvae`, cohérent avec le reste du pack Studio). Upscale optionnel (bypass) : `PixelKSampleUpscalerProvider`, denoise 0.6, `4x_foolhardy_Remacri` |
| Ordre des étages | Génération unique → upscale itératif optionnel (bypass par défaut) |
| Autre | Non retenu comme candidat de détail — trop éloigné du périmètre (constructeur de prompt, pas un traitement d'image). Cité pour mémoire dans la carte car demandé explicitement par le cadrage |

### 4. Ultimate SD Upscale (`7-UPSCALE/ULTIMATE SD UPSCALE.json`)

| Question | Réponse |
|---|---|
| Custom nodes absents de SoulGlade | `comfyui_ultimatesdupscale` (`UltimateSDUpscaleCustomSample`) |
| Étage détail visage/peau | Indirect : chaque tuile est **re-diffusée** (pas un simple resize), donc regénère de la texture fine partout, visage inclus, sans détection dédiée |
| Étage mains | Aucun ciblage — négatif du prompt contient littéralement `"hands"` (`text, watermark, smile, hands` en negative prompt) : une béquille par prompt, pas un mécanisme |
| Sampler/scheduler/steps/cfg | `UltimateSDUpscaleCustomSample` : upscale ×2, `ddpm`/`exponential`, 20 steps, cfg 2, denoise 0.45, tuiles 1024×1024, padding 64. Checkpoint `realvisxlV40...LightningBakedvae` (SDXL) |
| Ordre des étages | Upscale-modèle implicite dans le nœud (pas de `ImageUpscaleWithModel` séparé visible) puis re-diffusion par tuile en une seule passe |
| **Écart structurel avec SoulGlade** | SoulGlade (`WORKFLOWS/platform/upscale_ui.json`, groupe 09 des deux graphes de prod) fait un **upscale ESRGAN pur** (`ImageUpscaleWithModel` + `ImageScale` de redescente) — **aucune re-diffusion**. Ultimate SD Upscale ajoute une repasse générative par tuile (denoise 0.45) : plus de détail potentiel, mais un vrai coût d'identité à mesurer (c'est une régénération, pas un simple super-résolution) |

### 5. SeedVR2 (`7-UPSCALE/SEED VR2 img and vid.json`)

| Question | Réponse |
|---|---|
| Custom nodes absents de SoulGlade | `seedvr2_videoupscaler` (`SeedVR2LoadDiTModel`, `SeedVR2LoadVAEModel`, `SeedVR2VideoUpscaler`) |
| Étage détail visage/peau | Indirect — c'est un **modèle de restauration diffusion (DiT 3B/7B)**, pas un ESRGAN ni un KSampler classique. Pas de detector dédié visage/mains |
| Étage mains | Aucun |
| Sampler/scheduler/steps/cfg | Sans objet — pas de sampler/cfg au sens SD : le nœud `SeedVR2VideoUpscaler` prend une résolution cible, un `batch_size`, une correction couleur (`lab`), pas de steps/cfg exposés |
| Ordre des étages | Un seul nœud fait tout (charge DiT + VAE, restaure, ressort à la résolution demandée). 4 variantes dans le fichier : vidéo 1080p, image 2K, image 4K, batch dossier |
| **Écart structurel avec SoulGlade** | Architecture complètement différente de l'ESRGAN utilisé partout côté SoulGlade — un vrai modèle de diffusion dédié à la restauration, chargé en plus du modèle de génération. Poids DiT 3B (`seedvr2_ema_3b_fp16`, ~6 Go) à 7B sharp (`seedvr2_ema_7b_sharp_fp16`) : sur les 16 Go de la carte de dev (`modeles-par-pack.md`), cohabiter avec Flux+PuLID ou Qwen-Image-Edit (déjà ~20 Go en bf16, déjà en offload RAM) est risqué. Écarté des 3 candidats retenus pour cette raison — noté pour référence si un jour un poste dédié à l'upscale existe |

## Trois étages candidats à emprunter (par ordre d'intérêt)

### #1 — `LayerUtility: HLFrequencyDetailRestore` (séparation haute/basse fréquence)

- **Ce qu'il change concrètement** : aujourd'hui, le seul mécanisme
  SoulGlade qui ajoute de la texture de peau est le refiner SDXL img2img
  (groupe 07 de `lena_master_prod_ui.json`, denoise 0.40) — une
  **régénération partielle par diffusion**, qui a un coût identité mesuré
  et documenté (0.76 conforme dans le bon ordre, 0.42 dans le mauvais).
  `HLFrequencyDetailRestore` fait la même chose que la technique de
  retouche photo classique (Photoshop skin retouching) : sépare l'image
  en fréquences basses (couleur/forme) et hautes (grain/texture), et
  recompose en piochant la texture haute fréquence d'une source vers une
  cible. C'est du **compositing pur sur image décodée** — zéro passage
  diffusion supplémentaire, donc zéro nouveau risque de dérive de
  géométrie faciale par construction (contrairement au refiner actuel ou
  à un FaceDetailer). Un candidat naturel à ajouter **après** le refiner
  et le FaceDetailer existants, pas à leur place.
- **Famille** : les deux, sans distinction — le nœud travaille sur des
  images RGB décodées, indépendant du modèle qui les a produites.
- **Pour l'intégrer** : un seul custom node,
  `ComfyUI_LayerStyle_Advance` (licence MIT — pas dans le manifeste
  aujourd'hui). Ajout simple à `AUTOMATION/comfyui_manifest.json`
  (`packs: ["platform"]`, un seul nœud utilisé). Câblage : un
  `LayerUtility: HLFrequencyDetailRestore` en fin de groupe 08/09 côté
  Flux (Léna a déjà un pipeline complet à qui l'accrocher), et à
  construire en même temps que le refiner/FaceDetailer manquants côté
  SDXL/Abyssiaelle (voir constat d'asymétrie plus haut — ne pas tester
  cet étage seul sur Abyssiaelle sans d'abord poser la base).
- **Risque** : faible sur l'identité (pas de diffusion). Risque réel :
  mal réglé, peut réintroduire du bruit de capteur/grain qui existe déjà
  dans le groupe 10 (« Grain + export ») de SoulGlade — a tester en
  ordre après le grain, pas avant, pour ne pas dupliquer l'effet. Les
  paramètres exacts vus dans Retouch Pro/Skin Fix (`[10, 8, 0]`,
  `[5, 5, 0]`) ne sont pas assez documentés dans les workflows tiers pour
  en déduire la sémantique précise (pas de note explicative dans les
  fichiers) — à vérifier contre le code source du nœud avant un premier
  essai plutôt que copier ces valeurs à l'aveugle.

### #2 — Régénération localisée par masque précis (patron Skin Fix : matting + face-parsing + inpaint ciblé)

- **Ce qu'il change concrètement** : le refiner actuel de SoulGlade
  redessine **toute l'image** à denoise 0.35-0.40 (groupe 07/N3b) — la
  note du graphe `lena_nsfw_branch_ui.json` le confirme : « le refiner
  déplace légèrement les traits ». Le patron Skin Fix régénère
  **seulement la peau**, avec un masque alpha précis (`PersonMaskUltra
  V2`, seuils 0.01/0.99) qui **exclut explicitement** les yeux/lèvres/
  sourcils via `FaceParsingResultsParser`, à un denoise plus bas (0.30).
  Le reste de l'image (fond, vêtements, cheveux, et surtout les traits
  fins que PuLID/le verrou d'identité porte) n'est jamais touché. C'est
  plus chirurgical que le refiner pleine image actuel — potentiellement
  moins de coût identité pour un gain de texture comparable, à mesurer.
- **Famille** : les deux — la segmentation et le matting opèrent sur
  l'image décodée, le KSampler local peut tourner sur n'importe quel
  checkpoint SDXL du pack (Léna a déjà un checkpoint SDXL chargé pour
  son propre refiner ; Abyssiaelle est nativement SDXL).
- **Pour l'intégrer** : deux nouveaux custom nodes —
  `comfyui_face_parsing` (MIT) pour la segmentation par classe,
  `ComfyUI_LayerStyle_Advance` (MIT, déjà candidat #1 — `PersonMaskUltra
  V2` vient du même pack) pour le matting. `comfyui-florence2` (captioning
  automatique de la zone) est **déjà listé comme commun aux deux packs**
  dans `modeles-par-pack.md` — pas un nouvel ajout. Complexité
  d'intégration nettement plus élevée que le candidat #1 : 6-8 nœuds
  enchaînés contre 1, plus de réglages (seuils de matting, grow/blur du
  masque, quel checkpoint pour le KSampler local).
- **Risque** : moyen. Le masque mal réglé peut laisser un liseré visible
  au raccord (`ImageCompositeMasked`) — exactement le défaut que la note
  QC de `lena_nsfw_branch_ui.json` demande déjà de vérifier (« aucun
  liseré de mâchoire ni rupture de carnation »), donc un risque connu et
  déjà surveillé côté SoulGlade, pas un nouveau. Plus lourd en temps de
  génération qu'un simple post-traitement (candidat #1) : un KSampler
  complet en plus, même localisé.

### #3 — Upscale par re-diffusion tuilée (patron Ultimate SD Upscale) comme alternative à l'ESRGAN pur

- **Ce qu'il change concrètement** : l'upscale SoulGlade
  (`WORKFLOWS/platform/upscale_ui.json`, capacité plateforme partagée par
  les deux packs) est un **super-résolution pur** — un modèle ESRGAN
  (`4x_NMKD-Siax_200k.pth`) suivi d'un redimensionnement, sans re-diffusion.
  Il agrandit la netteté existante mais n'invente pas de détail nouveau.
  `UltimateSDUpscaleCustomSample` re-diffuse chaque tuile de l'image
  agrandie (denoise 0.45 dans l'exemple Studio) — un vrai gain de détail
  fin (peau, tissu) au prix d'une seconde génération complète sur
  l'image entière, tuile par tuile.
- **Famille** : les deux en théorie (le nœud est agnostique du
  checkpoint), mais l'exemple Studio est réglé pour SDXL — un essai Flux
  demanderait de recâbler le sampler Flux (cfg 1, euler/simple) plutôt
  que reprendre tel quel les réglages SDXL (ddpm/exponential, cfg 2).
- **Pour l'intégrer** : `comfyui_ultimatesdupscale` (licence **GPL-3.0**
  — voir note licences plus bas, pas disqualifiant en soi mais à traiter
  avec le même mécanisme de manifeste que Impact Pack). Remplacerait ou
  compléterait le groupe upscale existant — décision à prendre : garder
  l'ESRGAN pur comme option rapide et ajouter la re-diffusion tuilée
  comme option qualité, plutôt que remplacer purement.
- **Risque** : le plus élevé des trois. C'est une repasse diffusion sur
  **toute l'image agrandie**, pas seulement le visage — le même risque
  que le groupe 05 (« hires 2K latent ») de `lena_master_prod_ui.json`,
  déjà documenté comme incompatible en VRAM avec le FaceDetailer sur 16
  Go (« CUDA error: invalid argument », note du graphe) et jamais mesuré
  pour son coût identité (il est en bypass par défaut, jamais activé en
  série de production). Un test sur Abyssiaelle mesurerait un gain face
  à zéro upscale existant — biaisé par l'asymétrie de base (voir plus
  haut) tant qu'un vrai upscale n'est pas d'abord mis en service côté
  SDXL.

**Écarté explicitement, pas dans le top 3** : SeedVR2 (architecture DiT
3B-7B trop lourde pour le poste de dev à 16 Go en cohabitation avec Flux
ou Qwen-Image-Edit — voir carte comparative §5) et l'injection de
texture par `IPAdapterStyleComposition` vue dans Retouch Pro (un second
vecteur d'identité en plus de PuLID/LoRA, risque de conflit avec le
verrou principal, pas creusé).

## Mini-inventaire : détection/detailer de mains dans l'écosystème (pour P4.3)

Purement descriptif — aucune décision, alimente les 3 sous-questions de
P4.3 (détecteur, métrique, affichage).

| Mécanisme | Nature | Déjà provisionné côté SoulGlade ? | Notes |
|---|---|---|---|
| **DWPose** (`comfyui_controlnet_aux`, `dwpose/hand.py`) | Détecteur de keypoints (21 points/main, corps+visage+mains en un passage) | **Oui** — `comfyui_controlnet_aux` est déjà dans `AUTOMATION/comfyui_manifest.json` (`packs: ["platform"]`), poids DWPose (~200 Mo) déjà téléchargés au premier lancement. `AUTOMATION/pose_render.py` consomme déjà un format `hand_left_keypoints_2d`/`hand_right_keypoints_2d` (nommage OpenPose) pour dessiner le squelette de pose — **c'est probablement déjà DWPose et non MediaPipe** qui alimente ce format, à confirmer en remontant la chaîne d'extraction avant P4.3. Zéro nouvelle dépendance si confirmé — candidat le plus direct pour le détecteur |
| **MediaPipe Hands (pip `mediapipe`)** | Détecteur de landmarks (21 points/main + score de confiance), bibliothèque Google, hors ComfyUI | Non installé — et **`references/pieges-noeuds-custom.md` documente un incident réel** : installer `mediapipe` (via le `requirements.txt` de `comfyui_controlnet_aux`, justement évité pour cette raison) installe `opencv-contrib-python` à côté d'`opencv-python`, casse InsightFace et tout le scoring d'identité. Le cadrage P4.3 le cite comme « déjà utilisé dans pose_render.py » — **cette recherche ne confirme pas cette affiliation** (voir DWPose ci-dessus) ; à vérifier avant de s'appuyer dessus, un ajout naïf de `mediapipe` répéterait un incident déjà documenté |
| **Impact/Inspire Pack — détecteur bbox + Detailer** | Détection + **correction** (crop, redessine, recolle) — pas un détecteur pur | `comfyui-impact-pack`/`-subpack` **déjà dans le manifeste** (`packs: ["platform"]`), déjà utilisé pour `FaceDetailer` dans les deux graphes de prod. Généraliser à `HandDetailer` demande un modèle YOLO entraîné sur des mains (ex. `hand_yolov8s.pt`, modèle communautaire distinct de `face_yolov8m.pt` déjà provisionné) — pas trouvé dans cette installation Studio ni dans le manifeste SoulGlade, à chercher/ajouter séparément si retenu. Mécanisme de **correction automatique**, pas juste de mesure — à mettre en tension avec PROJET.md (« la plateforme mesure et informe, elle n'arbitre pas ») : utilisable comme détecteur seul (juste la détection bbox, sans le nœud Detailer qui redessine) |
| **MeshGraphormer** (`comfyui_controlnet_aux`, `node_wrappers/mesh_graphormer.py`) | Estimateur de maillage 3D de la main → carte de profondeur pour un ControlNet-depth guidant une régénération | Le wrapper est présent dans `comfyui_controlnet_aux` (déjà provisionné), mais **le modèle de main sous-jacent (MANO) est distribué sous une licence non-commerciale, avec inscription obligatoire sur le site du Max Planck Institute** — disqualifiant tel quel pour un pack destiné à la vente (cohérent avec la vigilance licence du cadrage). À écarter pour SoulGlade sauf à trouver un remplacement du modèle de main sous licence permissive |

**Pour trancher les 3 sous-questions de P4.3** (à partir de cet
inventaire, pas une décision prise ici) :
- **Détecteur** : DWPose semble le candidat à zéro coût d'ajout (déjà
  provisionné, déjà partiellement consommé par `pose_render.py`) — mais
  vérifier d'abord que c'est bien lui et pas MediaPipe qui alimente ce
  fichier aujourd'hui, avant de bâtir P4.3 dessus.
- **Métrique** : DWPose donne 21 points/main avec un score de confiance
  par point (comme MediaPipe) — un score de plausibilité géométrique
  (ex. distances inter-articulations cohérentes) resterait à construire
  par-dessus, ce n'est fourni par aucun des mécanismes inventoriés ici.
- **Affichage** : hors périmètre de cette recherche (question UI, pas
  détection) — la même barre latérale que l'identité/QC existants,
  comme le cadrage le précise déjà.

## Vérification des licences (contrainte non négociable, cadrage J8 §7)

| Custom node candidat | Licence | Verdict |
|---|---|---|
| `ComfyUI_LayerStyle_Advance` | MIT | OK sans réserve |
| `comfyui_face_parsing` | MIT | OK sans réserve |
| `comfyui-florence2` | MIT | OK — déjà commun aux deux packs, pas un nouvel ajout |
| `comfyui_controlnet_aux` | Apache-2.0 | OK — déjà dans le manifeste (`packs: ["platform"]`) |
| `comfyui-impact-pack` / `-subpack` | GPL-3.0 | **Déjà utilisé par SoulGlade aujourd'hui** (manifeste, `FaceDetailer` dans les deux graphes de prod) — précédent déjà posé |
| `comfyui-inspire-pack` | GPL-3.0 | Non retenu comme candidat (Portrait Master écarté du top 3) |
| `comfyui_ultimatesdupscale` | GPL-3.0 | Candidat #3 — voir nuance ci-dessous |
| `comfyui-portrait-master` | GPL-3.0 | Non retenu |
| `seedvr2_videoupscaler` | Apache-2.0 | Non retenu (poids VRAM, pas la licence) |
| MeshGraphormer (modèle MANO) | Non-commerciale, inscription requise | **Disqualifiant** — voir mini-inventaire mains |

**Nuance sur le GPL-3.0** : quatre des candidats tiers sont GPL-3.0, dont
un déjà utilisé en production côté SoulGlade (`comfyui-impact-pack`).
Le modèle de distribution de SoulGlade (`AUTOMATION/comfyui_manifest.json`,
ADR-0022) **ne vendorise jamais le code d'un custom node** — il déclare
une référence (dépôt git + commit, ou registre + version) que
`comfy_provision.py` installe sur la machine de l'utilisateur final, qui
fait tourner ComfyUI comme process séparé et parle avec lui par API. Ce
n'est pas la même situation que si le code GPL était copié dans le dépôt
SoulGlade ou lié statiquement à son propre code. Sous cette lecture, le
GPL-3.0 n'est pas disqualifiant pour ces candidats — mais ce n'est pas
un avis juridique, et le sujet mérite une vraie vérification (pas
seulement une lecture de licence par un développeur) avant de vendre un
pack qui en dépend, vu que la question n'a apparemment encore jamais été
tranchée formellement pour le node déjà en production (Impact Pack).

## Symétrie Flux/SDXL — rappel des cases mono-famille

Pour respecter le critère de sortie de la phase :
- Le candidat #1 (`HLFrequencyDetailRestore`) est utilisable tel quel
  sur les deux familles — pas de biais.
- Le candidat #2 (masque + inpaint local) est utilisable sur les deux,
  mais demande un checkpoint SDXL local pour le KSampler de régénération
  quelle que soit la famille de génération — déjà le cas côté Léna
  (refiner SDXL existant), nouveau pour Abyssiaelle (déjà SDXL nativement,
  donc pas de modèle supplémentaire à charger).
- Le candidat #3 (upscale tuilé) est utilisable sur les deux en théorie,
  mais l'exemple Studio n'est réglé que pour SDXL — un essai Flux
  demande un recâblage des réglages de sampler avant de pouvoir comparer
  quoi que ce soit.
- **Aucun des trois ne peut être mesuré équitablement sur Abyssiaelle
  tant que le brouillon `abyssiaelle_master_prod_ui.json` n'a pas au
  moins un refiner et un FaceDetailer câblés** (voir constat d'ouverture)
  — sans ça, P4.2/P4.4 mesureraient un gain face à une base vide, pas
  un gain comparable à ce qui serait mesuré côté Léna.

## Fichiers inspectés

**ComfyUI Studio** (`H:\ComfyUIStudio\v362\`) :
- `1-WORKFLOWS\RETOUCH PRO 3.json`
- `1-WORKFLOWS\0-IMAGE\SKIN FIX 3.json`
- `1-WORKFLOWS\PORTRAIT MASTER.json`
- `1-WORKFLOWS\7-UPSCALE\ULTIMATE SD UPSCALE.json`
- `1-WORKFLOWS\7-UPSCALE\SEED VR2 img and vid.json`
- `App\ComfyUI\custom_nodes\{ComfyUI_LayerStyle_Advance, comfyui_face_parsing,
  comfyui-inspire-pack, comfyui-florence2, comfyui-impact-pack,
  comfyui-impact-subpack, comfyui_controlnet_aux, comfyui_ultimatesdupscale,
  comfyui-portrait-master, seedvr2_videoupscaler}\{LICENSE*, pyproject.toml}`

**SoulGlade** :
- `WORKFLOWS/content/lena_master_prod_ui.json`
- `WORKFLOWS/nsfw/lena_nsfw_branch_ui.json`
- `WORKFLOWS/content/abyssiaelle_master_prod_ui.json`
- `WORKFLOWS/platform/upscale_ui.json`
- `PACKS/instagram-influenceur/universe.json`
- `PACKS/rpg-personnage/universe.json`
- `PLATFORM/capabilities.json`
- `AUTOMATION/comfyui_manifest.json`
- `AUTOMATION/pose_render.py`
- `.claude/skills/workflow-comfyui/references/{modeles-par-pack.md,
  pieges-noeuds-custom.md, format-ui-mecanique.md}`
