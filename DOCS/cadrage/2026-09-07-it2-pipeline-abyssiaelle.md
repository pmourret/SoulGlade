# IT-2 — Abyssiaelle produit au même niveau que Léna

Session du 7 septembre 2026, ouverture de l'itération IT-2 du tableau de
bord (EPIC E5, E2). Trois questions (Règle 3, `PROJET.md`).

Le chantier était noté « BACKLOG absorbé — pipeline Abyssiaelle » sans
fichier de cadrage : celui-ci le pose avant la première ligne de code.

## À quoi ça sert

`WORKFLOWS/content/abyssiaelle_master_prod_ui.json` est resté le
brouillon J6 : 13 nœuds, checkpoint → IPAdapter FaceID → un KSampler →
VAEDecode → SaveImage. Aucun refiner, aucun FaceDetailer, aucun upscale,
aucun étage d'export. Le graphe Flux de Léna porte les quatre depuis
J8, câblés, mesurés et documentés dans ses propres notes.

Deux conséquences, déjà écrites ailleurs et jamais traitées :

1. **La moitié de la production est bridée.** Un pack sur deux sort une
   image 1024 brute, sans détail de visage ni haute résolution.
2. **Aucune comparaison n'est honnête tant que ça dure.** Constat
   d'ouverture de `DOCS/recherche/2026-09-06-workflows-detail-visage-
   mains.md` : « tout étage testé sur Abyssiaelle mesurera un gain face
   à une base quasi nulle ». C'est ce qui a sorti Abyssiaelle du
   périmètre de la phase 4 (cadrage du 06/09, section Hors périmètre) —
   IT-2 lève exactement ce blocage, et rend mesurable ce que IT-1 vient
   d'apprendre à mesurer.

Le travail n'est pas d'inventer un pipeline SDXL : c'est de **porter le
patron déjà éprouvé côté Flux** (groupes 07 à 10 du graphe de Léna) sur
la famille SDXL, avec les mêmes titres de nœuds et de groupes — donc
sans une ligne de runner en plus, l'orchestration s'accroche déjà à ces
contrats (`WorkflowRunner._roles()`, `active_groups`).

## Hors périmètre

- **Un deuxième chemin d'exécution.** Rien à ajouter dans
  `execute_jobs` ni dans `WorkflowRunner` en dehors de la levée
  d'ambiguïté du rôle `checkpoint` (voir plus bas) : le runner pilote
  déjà `switch`/`refiner`/`export_scale`/`grain_node`/`sharpen` et les
  groupes `FACEDETAILER`/`UPSCALE IMAGE 2K`/`GRAIN + EXPORT`
  (invariant 2).
- **La pose ControlNet SDXL** (groupe 13 côté Léna). Le modèle
  `controlnet-canny-sdxl-1.0` est déclaré au manifeste sans URL, et
  l'A/B de pose est un chantier de mesure à lui seul.
- **L'outil d'édition (Qwen) pour ce pack.** `capabilities.edit` reste
  volontairement absente de `PACKS/rpg-personnage/universe.json` — la
  raison est écrite dans ses `_notes`, elle ne change pas ici.
- **Les étages de détail candidats de la phase 4** (frequency restore,
  inpaint masqué, upscale tuilé). IT-2 amène la base ; ce qui se compare
  à cette base vient après, et le candidat #1 est déjà rejeté au banc
  (IT-1).
- **Les textes incrustés** (groupe 11 de Léna, `DrawText+`) — étage de
  publication Instagram, sans objet pour un personnage RPG.
- **Renommer les fichiers de graphe** par pack plutôt que par
  personnage. Dette connue, notée dans les deux `universe.json`, jamais
  bloquante.

## Ce que ça change, concrètement

Dans le graphe (édition directe du JSON, invariant 1 amendé le
2026-09-01 — **Pierre valide dans ComfyUI avant de s'y fier**) :

| Groupe ajouté | Étage | Contrat lu par le runner |
|---|---|---|
| `03 - REFINER REALISME` | checkpoint SDXL photo-réaliste + img2img denoise 0.40, derrière un `Switch any [Crystools]` à entrées lazy (coût nul quand OFF) | rôles `switch`, `refiner` |
| `04 - FACEDETAILER` | détecteur `face_yolov8m` + FaceDetailer sur le modèle **verrouillé** (sortie `IPAdapterFaceID`, donc LoRA de personnage compris) | groupe `FACEDETAILER` |
| `05 - UPSCALE IMAGE 2K` | `4x_NMKD-Siax` puis redescente au format visé | groupe `UPSCALE IMAGE 2K` |
| `06 - GRAIN + EXPORT` | taille de publication, grain capteur, micro-sharpening | groupe `GRAIN + EXPORT`, rôles `export_scale`, `grain_node`, `sharpen` |

Tous livrés **en bypass** (ou interrupteur sur `false`), convention du
repo : c'est la config du personnage qui les allume, jamais un second
fichier de workflow.

Deux points de vigilance identifiés avant d'écrire :

- **L'ordre refiner → FaceDetailer n'est pas négociable.** Mesuré côté
  Léna (note du groupe 07) : 0.76 d'identité dans cet ordre, 0.42 dans
  l'autre — « un autre visage ». Le refiner déplace les traits, le
  FaceDetailer les remet avec le modèle qui porte l'identité. Ici ce
  modèle est la sortie du verrou (LoRA `abyss1a` + IPAdapter à poids
  neutralisé, `AUTOMATION/identity/lora_sdxl.py`), pas le checkpoint nu.
- **Un second `CheckpointLoaderSimple` rend le rôle `checkpoint`
  ambigu.** `find_node` lève sur l'ambiguïté, `_roles()` l'avale en
  `None`, et le swap de checkpoint par style de sortie (4 styles
  déclarés pour ce pack) casserait **en silence**. Le rôle passe donc
  d'une recherche par type seul à une recherche par fragment de titre
  (`CHECKPOINT`) : convention explicite, le checkpoint de base d'un
  graphe porte `CHECKPOINT` dans son titre, un loader auxiliaire jamais.
  Comportement de Léna inchangé (aucun de ses deux loaders ne porte ce
  fragment, le rôle y valait déjà `None`).

## Critère de sortie

Repris du tableau de bord, précisé :

1. `wf_check.py --roles --famille sdxl` vert **et** `--essai` vert (le
   seul niveau qui aurait attrapé l'entrée manquante d'un
   `ControlNetApplyAdvanced` — skill `workflow-comfyui`), graphe rouvert
   et re-sauvegardé une fois dans ComfyUI.
2. Le banc (`AUTOMATION/bench.py`) tourne sur Abyssiaelle, un axe à la
   fois (`facedetailer`, `upscale_2k`, `refiner`, `grain_export`), et
   rend un verdict chiffré par axe — adopté ou rejeté par écrit, comme
   l'étage de détail de IT-1.
3. Le score d'identité tient sur la série mesurée (repère : 0.51–0.63
   mesurés à l'onboarding sur cadre neutre, `identity/lora_sdxl.py`) —
   un étage qui le fait chuter est rejeté, pas « ajusté ».
4. `CHARACTERS/abyssiaelle/config.json` ne prend les clés de preset
   correspondantes **qu'après** la mesure (invariant 4 et §8.4 : aucune
   valeur copiée de `lena/config.json`).
5. Tests du module verts : `test_model_family_sdxl.py`,
   `test_build_jobs_abyssiaelle.py`, `test_bench.py`,
   `test_pack_capabilities.py`.

Ce que ce chantier ne prouve pas : que SDXL vaut Flux. Il rend les deux
familles comparables — ce qui est la condition pour en juger, pas le
jugement.

---

## Mesures du 2026-09-07 (banc, deux axes sur quatre)

Graphe validé avant toute mesure : `wf_check --roles --famille sdxl` vert,
`--essai` vert **deux fois** — une fois tel quel, une fois avec
`--groupes "FACEDETAILER,UPSCALE IMAGE 2K,GRAIN + EXPORT"`, et ComfyUI a
réellement **exécuté** les deux (pas seulement accepté) sans erreur.

Protocole : `bench.run_bench`, scène nommée, 5 seeds fixes
(1001/2002/3003/4004/5005) rejouées à l'identique, un seul axe modifié
par variante (`validate_variant_cfg` le vérifie par le code). Marges du
personnage : 0.02 sur l'identité, 0.05 ailleurs. Toutes les mesures de
`qc_realisme` sont normalisées à 1024 px sur le grand côté avant calcul —
un écart de netteté n'est donc **pas** un effet de résolution.

### Axe `upscale_2k` — scène `portrait_etude` — **ADOPTÉ**

| genre | référence | upscale_2k=True | delta | verdict |
|---|---|---|---|---|
| netteté | 122,06 | 261,57 | **+139,51** | améliorée |
| texture_visage | 3,0064 | 3,2876 | **+0,2812** | améliorée |
| identité | 0,6680 | 0,6697 | +0,0017 | stable |
| bruit_fond | 0,4614 | 0,2418 | −0,2196 | dégradée |

Verdict global du banc : « mixte », à cause du seul bruit de fond. Lu
correctement, c'est le résultat attendu : l'ESRGAN lisse le plancher de
bruit, et l'étage qui le repose est précisément le groupe 06 (grain),
pas encore mesuré. La comparaison visuelle confirme le chiffre — mèches
de cheveux, dentelle du collier et pores de peau apparaissent
franchement, sans dérive de traits ni couture visible.

`preset.upscale_2k = true` dans `CHARACTERS/abyssiaelle/config.json`.
La sortie de production passe donc à 2048 (archive), comme côté Léna où
le 2K est l'archive et l'export la taille de publication.

### Axe `facedetailer` — deux scènes — **NON ADOPTÉ en l'état**

| genre | `portrait_etude` réf → var | `camp_soir` réf → var |
|---|---|---|
| netteté | 122,06 → 118,95 (**−3,11**) | 71,39 → 70,06 (**−1,33**) |
| texture_visage | 3,0064 → 2,8584 (−0,148) | 2,6076 → 2,5194 (−0,088) |
| identité | 0,6680 → 0,6673 (−0,0006) | 0,4756 → 0,4917 (**+0,0161**) |
| bruit_fond | 0,4614 → 0,4616 (stable) | 0,6774 → 0,6772 (stable) |
| mains | — | 0,524 (n=2) → 0,397 (n=3), insuffisant |

Mesuré d'abord sur portrait, puis **re-mesuré sur plan large** parce
qu'un portrait est la scène où un FaceDetailer a le moins à faire (le
visage y occupe déjà ~500 px, `guide_size` vaut 512 : rien à agrandir).
Le second banc ne change pas la conclusion : aucun gain mesurable sur
les deux cadrages, et un très léger adoucissement.

Un seul signal positif, et il est cohérent avec le mécanisme :
**+0,0161 d'identité sur plan large**, soit le plus gros delta
d'identité de toute la session — mais sous la marge de 0,02 du
personnage, donc « stable », donc pas une preuve. C'est aussi le
cadrage où l'identité est la plus basse (0,4756, sous
`qc.threshold_ok` = 0,5).

Décision : `preset.facedetailer = false`. L'étage **reste câblé** — en
bypass il ne coûte rien, et le retirer supprimerait la seule piste
identifiée. Ce qu'il faudrait pour y revenir : faire varier
`guide_size` et le `denoise` du FaceDetailer, qui ne sont **pas** des
axes de banc aujourd'hui (`bench.CFG_AXES` ne porte que des booléens
d'étage). C'est un chantier de mesure à part, pas une retouche.

Contrairement au candidat #1 de IT-1, rien n'est retiré ici : le harnais
est le patron déjà en production côté Léna, pas un nœud tiers à
provisionner.

### Reste à mesurer

Les axes `refiner` et `grain_export` (périmètre volontairement réduit à
deux axes pour cette session). **IT-2 reste ouverte** tant qu'ils n'ont
pas leur chiffre : le refiner porte la question de fond du pack SDXL
(un refiner SDXL sur une génération déjà SDXL sert-il à quelque chose ?)
et `grain_export` est ce qui doit reposer le bruit de fond que
l'upscale enlève.

### Axe `refiner` — scène `portrait_etude`, deux passes — **NON ADOPTÉ**

Mesuré sur le pipeline avec l'upscale déjà adopté. Deux bancs, parce
qu'un seul n'aurait rien voulu dire : côté Léna le refiner ne s'utilise
**jamais seul**, le FaceDetailer le suit toujours. Le banc n'accepte
qu'un axe par variante — la seconde passe change donc la référence
(FaceDetailer actif des deux côtés) plutôt que de croiser deux axes.

| genre | refiner **seul** | refiner **+ FaceDetailer** |
|---|---|---|
| texture_visage | 3,288 → **4,221** (+0,934) | 3,101 → **3,541** (+0,439) |
| identité | 0,6697 → **0,4638** (−0,2059) | 0,6650 → **0,6153** (−0,0497) |
| netteté | 261,6 → 245,3 (−16,3) | 254,6 → 237,7 (−16,9) |
| bruit_fond | 0,242 → 0,226 (stable) | 0,242 → 0,227 (stable) |
| tri automatique | **3 images sur 5 en `A_REVOIR`** | 5 sur 5 en `OK` |

**Ce que ça dit du refiner.** Il apporte exactement ce qui manque au
pack SDXL — la peau devient photographique, taches et pores visibles,
c'est net à l'œil autant qu'au chiffre. Et il **réécrit le visage** :
l'identité tombe sous `qc.threshold_ok` (0,5) et le tri le voit tout
seul, sans qu'on ait rien à lui apprendre. Le FaceDetailer derrière en
récupère l'essentiel (0,464 → 0,615) et fait repasser les cinq images,
mais il rabote au passage la moitié du gain de texture — il redessine le
visage, donc une partie de ce que le refiner venait d'y déposer.

Reste, même en paire, **−0,050 d'identité, plus du double de la marge de
0,02**. Critère de sortie n° 3 de ce cadrage : *un étage qui fait
chuter l'identité est rejeté, pas « ajusté »*. Donc `preset.refiner =
false`. La paire reste activable en connaissance de cause (`refiner` ET
`facedetailer` à `true`, jamais `refiner` seul) — c'est un arbitrage
d'identité, et `PROJET.md` dit que celui-là revient à l'utilisateur, pas
à la plateforme.

**Ce que ça dit du FaceDetailer**, et qui corrige la lecture de la
section précédente : ce n'est pas un étage d'amélioration, c'est un
étage de **réparation**. Seul, il n'apporte rien (mesuré sur deux
cadrages). Derrière le refiner, il rend +0,15 d'identité. Inutile tant
que rien ne casse le visage, indispensable dès que quelque chose le
casse. Sa place dans le graphe — juste après le refiner, sur le modèle
verrouillé — est donc la bonne, et son bypass par défaut aussi.

**Limite d'outillage, vue deux fois.** Les deux étages rejetés de IT-2
ont leur vraie question dans un **réglage continu**, pas dans un
booléen : `refiner_denoise` (0,40 mesuré ; la note du graphe de Léna
donne 0,25 comme « effet léger ») et le `guide_size`/`denoise` du
FaceDetailer. Or `bench.CFG_AXES` ne porte que des interrupteurs
d'étage. Tant que le banc ne sait pas balayer une valeur, ces deux
rejets sont des rejets **du réglage livré**, pas de l'étage. À noter
comme tel — c'est un manque du banc, pas une conclusion sur le pack.

### Où en est le pipeline SDXL après IT-2

Trois axes sur quatre mesurés, un seul étage adopté. Ce n'est pas un
échec du chantier : le graphe porte désormais les quatre étages, et
c'est ce qui a permis de les juger. La texture de visage d'Abyssiaelle
reste à 3,10 quand celle de Léna tourne autour de 4,9 (chiffre IT-1) —
l'écart est réel, il est identifié, et le seul étage qui le comblait
coûte l'identité. C'est exactement ce que le candidat #2 de la phase 4
(régénération locale masquée) est censé traiter : retoucher la peau
**sans** redessiner les traits.

`grain_export` reste le dernier axe non mesuré.

### Axe `grain_export` — scène `portrait_etude` — **ADOPTÉ**

| genre | référence | grain_export=True | delta | verdict |
|---|---|---|---|---|
| netteté | 261,57 | **582,71** | +321,14 | améliorée |
| bruit_fond | 0,2418 | **0,3898** | +0,1480 | améliorée |
| texture_visage | 3,2876 | 3,5648 | +0,2772 | améliorée |
| identité | 0,6697 | 0,6793 | +0,0097 | stable |

Seul verdict global « meilleure sur tous les axes suivis » de la
session, 5 images sur 5 en `OK`, et la comparaison visuelle ne montre
aucun halo de sur-netteté.

**Ce que cet étage est réellement ici.** Le nœud `ImageAddNoise` est
piloté à 0,0 (`grain_strength` absent de la config) — choix identique à
celui de Léna, expliqué dans `runner/comfy.py` : ce nœud ajoute autant
de bruit de chrominance que de luminance, ce qu'aucun capteur ne fait,
donc c'est `AUTOMATION/grain.py` qui pose le grain au moment de
l'export. Ce banc mesure donc la **redescente à `export_sizes` + le
micro-sharpening (0,30)**, pas le grain capteur.

Ce qui explique aussi le +0,148 de bruit de fond : ce n'est pas du grain
ajouté, c'est le micro-sharpening qui réamplifie le résidu haute
fréquence que l'ESRGAN avait lissé. Le plancher remonte de 0,242 à
0,390, contre 0,461 sur la base sans upscale — l'essentiel est repris.

Le +321 de netteté demande une lecture honnête : l'image de la variante
**est** native en 1024 (taille de publication), là où la référence est
un 2048 que la mesure redescend elle-même en `INTER_AREA` avant de
calculer. La comparaison reste la bonne — 1024 est la taille réellement
publiée — mais une partie de l'écart vient de ce que la référence perd à
ce redimensionnement, pas seulement du sharpening.

**Conséquence à connaître** : la sortie de production redescend à 1024
(`export_sizes` 1:1). Le 2048 de l'upscale n'est pas archivé, il sert de
sur-échantillonnage — c'est lui qui fait que ce 1024 est meilleur qu'un
1024 généré directement (texture visage +0,28, netteté). Monter
`export_sizes` si une archive 2K est voulue.

## Bilan de IT-2

Les quatre axes sont mesurés, la config d'Abyssiaelle est le résultat
de ces mesures et de rien d'autre :

| étage | verdict | ce qui l'a décidé |
|---|---|---|
| `upscale_2k` | **adopté** | netteté ×2,1, identité stable |
| `grain_export` | **adopté** | seul « meilleure sur tous les axes » |
| `refiner` | rejeté | texture +0,93 mais identité 0,67 → 0,46 |
| `facedetailer` | rejeté seul | aucun gain ; garde son rôle de réparation |

Le graphe SDXL porte les mêmes étages que le graphe Flux, le banc a
mesuré l'écart avant/après sur chacun, et l'identité tient sur la série
réelle (0,67–0,68 avec la config adoptée, 5 images sur 5 triées `OK`).
Les trois points du critère de sortie du tableau de bord sont tenus.

Ce que IT-2 laisse derrière, écrit pour ne pas être redécouvert :

1. **La texture de visage reste le vrai écart entre les deux packs**
   (3,29 pour Abyssiaelle, ~4,9 pour Léna). Le seul étage qui la
   comblait coûte l'identité. C'est le sujet du candidat #2 de la
   phase 4 — régénération locale masquée, qui retouche la peau sans
   redessiner les traits.
2. **Le banc ne sait varier que des booléens.** Les deux étages rejetés
   ont leur vraie question dans un réglage continu (`refiner_denoise`,
   `guide_size`). Ce sont des rejets du réglage livré, pas de l'étage.
3. **Le FaceDetailer est un étage de réparation, pas de gain** — à
   activer avec le refiner, jamais tout seul, jamais avant lui.
