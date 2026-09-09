# L'ancre n'est pas le gabarit — et le thermomètre mesurait un autre visage

Phase de recherche ouverte le 2026-09-09 par Pierre, sur les deux points d'E2 :
**centroïde évolutif** et **LoRA d'identité par personnage**, avec trois
questions explicites — les méthodes des sites qui vendent de la cohérence de
personnage (AI influencer), la possibilité d'un auto-entraînement depuis la
revue par itération, et l'intégration de kohya_ss dans le dépôt comme outil à
part entière (ou un entraîneur maison).

Rattachement : `DOCS/cadrage/2026-09-09-lora-identite-par-personnage.md`, dont
l'étage 1 reste le chantier. Deux itérations, closes le jour même.

Test de la règle 2, dit une fois : **non**, ni le centroïde ni le LoRA ne sont
sur le parcours d'un nouvel utilisateur jusqu'à sa première publication. Le
cadrage l'écrivait déjà pour le LoRA (« deuxième semaine, pas première heure »).
Pierre l'assume, la phase s'est ouverte.

## Ce qui bloquait

IT-3b a fermé l'étape peau sur un constat d'architecture : identité et texture
de peau sont le même curseur. Mesuré au banc le 09/09 sur `identity_weight`
(0.85 → 0.65 : −0,092 d'identité à 6,2 σ, 5 images OK sur 5 puis 0 sur 5). La
sortie connue est de remplacer l'adaptateur par un LoRA entraîné.

Le centroïde, lui, ne bloquait rien — il ne tournait pas. État relevé en base
avant d'ouvrir une source externe :

```
reference_set            : 0 ligne      le centroïde n'a JAMAIS été construit
embedding                : 29 (lena 20, abyssiaelle 9), antelopev2 / 512d
image                    : 113 lena (84 SFW + 29 NSFW), 9 abyssiaelle
lena SFW sans embedding  : 58           (~190 ms/image, soit ~20 s de calcul)
flag humain              : lena ok 36 / ia 47      abyssiaelle ok 5 / ia 4
```

Le mécanisme et ses cinq garde-fous existent (`base.construire_jeu`), et rien
ne les appelle : `identite_centroide` est écrit et jamais utilisé pour trier,
`mcp_server.py:178` lit le jeu actif en dur sur `"lena"`, et le seul
constructeur est un script de `tests/`.

## Candidats examinés

| # | Approche | Ce qu'elle rend | Disponibilité | Chiffres annoncés | Verdict pour nous |
|---|---|---|---|---|---|
| 1 | **Gabarit style-apparié** : scorer contre le centroïde des images validées, l'ancre gelée restant juge du gabarit | une mesure calibrée dans l'espace de conditions de la production | **vérifié** — le code existe déjà (`base.construire_jeu`, `centroide`, `rescorer`) | — | **candidat n° 1, adopté** |
| 2 | **CCIP** (deepghs) — similarité de personnage entraînée sur de l'illustration | « est-ce le même personnage » sur du non-photoréaliste, avec seuil publié | **vérifié** — poids sur HuggingFace, `dghs-imgutils` sur PyPI, détection de visage anime incluse | seuil 0,213231 sur `ccip-caformer_b36-24`, calé au maximum de F1 ; entraîné sur ~240 000 images / 3 982 personnages | **à re-vérifier** — licence des poids, et couverture du semi-réaliste |
| 3 | **DINOv2 / CLIP-I** comme mesure universelle | similarité de **sujet** sur l'image entière | **lu annoncé** | métrique de fidélité au sujet de DreamBooth ; DINO préféré à CLIP-I, trop permissif sur les indices fins d'identité | **clos pour le portillon** |
| 4 | **Face swap correctif** en fin de chaîne (ReActor / FaceDetailer) | un visage juste recollé après coup | **lu annoncé** — pratique courante du métier | « filet de sécurité », consistance garantie | **clos** |
| 5 | **Atelier d'entraînement maison** | un entraîneur écrit dans le dépôt | — | — | **clos** |
| 6 | **ComfyUI-FluxTrainer** (kijai) — kohya emballé en nœuds ComfyUI | l'entraînement comme un graphe, dans la file existante | **vérifié** — Apache-2.0, 166 commits, 143 issues ouvertes ; ni installé ni au manifeste | l'auteur : « You can use same python environment, I faced no incompatibilities » | **candidat n° 1 pour l'étage 2, à re-vérifier** |

Vérifié = page consultée, dépôt ouvert, licence lue, ou mesure faite en base.
Lu annoncé = un article ou un README l'affirme.

Sur le candidat 5 : `ai-toolkit` (MIT, `python run.py config.yml`, Flux 1/2,
SDXL, Qwen-Image) et `sd-scripts` (Apache-2.0, CLI + TOML) se réduisent tous
deux à « sous-processus + fichier de config ». **Le choix du moteur n'est donc
pas une décision d'architecture**, c'est une ligne de configuration —
et réimplémenter l'entraînement LoRA Flux (block swap, quantification, cache de
latents) n'est pas un raccourci, c'est un projet. La branche maison se ferme.

Sur le candidat 6, ce qu'il change au cadrage : il annule le **coût n° 1** des
cinq listés (un second environnement Python de plusieurs Go, en conflit avec le
`python_embeded` de ComfyUI) et retourne le **coût n° 2** — l'entraînement
cesse d'être un second consommateur de GPU concurrent, il devient un job dans
la file ComfyUI, c'est-à-dire dans le seul état d'exécution que le dépôt
possède déjà.

## Ce qu'on a mesuré

### 1. Les deux portillons ne filtrent pas la même chose

```
Léna, 74 images scorées (seuil_haut = 0.74, lu dans son config.json)
  passent le portillon d'identité seul  : 34
  passent le flag humain « ok » seul    : 30
  passent LES DEUX                      : 15
Abyssiaelle (seuil_haut = 0.60), 9 images :  3 / 5 / 3
```

Recouvrement à moitié. C'est attendu et sain : `mesures.py` définit
`flag = "ok"` comme « convaincante comme photographie » — un jugement de
**réalisme**, pas de ressemblance. Conséquence directe sur l'auto-entraînement
depuis la revue : brancher la file d'entraînement sur le flag humain
entraînerait un LoRA sur « ça ressemble à une photo », pas sur « c'est bien
elle ».

### 2. Chaque image contre son ancre, puis contre ses pairs

Protocole : leave-one-out — chaque image comparée au centroïde des **autres**
images du même personnage, jamais au sien. Bande imposteur = les images de
l'autre personnage contre ce même centroïde.

```
                       bande PERSONNAGE      bande ÉTRANGER      MARGE
Abyssiaelle
  vs son ancre (photo)  0.402 .. 0.663      0.20 .. 0.35 *     ~ +0.05, négative en scène
  vs ses pairs          0.614 .. 0.868      0.138 .. 0.265         +0.349
Léna
  vs son ancre          0.678 .. 0.808            —                  —
  vs ses pairs          0.787 .. 0.947      0.050 .. 0.225         +0.562
```

\* mesurée par Pierre le 28/08, notée dans `CHARACTERS/abyssiaelle/config.json`.

**Les 29 images sur 29 scorent plus haut contre leurs pairs que contre leur
ancre**, de +0,072 à +0,340 chez Abyssiaelle, de +0,097 à +0,210 chez Léna.

### 3. Le score stocké est-il cohérent avec l'embedding stocké ?

Les deux sortent du même appel (`runner.sortie.ranger_mesures`, depuis le même
`checker.mesure()`). Donc `cos(ancre, embedding_stocké)` doit redonner le score
stocké. Recalculé sur les 29 :

```
28 images sur 29 : écart 0.000
 1 image         : écart +0.552
   lifestyle_salon_lecture_20260908_01.png — stocké 0.232, recalculé 0.784
```

C'est cette image, et elle seule, que l'œil de Pierre avait signalée : *« la
forme du visage se retrouve, le placement des yeux, la forme des lèvres, le nez
aussi — c'est ok malgré une légère dérive »*. Elle était classée dans
`PROD/LENA/REJET/`.

### 4. La cause, trouvée dans le code puis datée dans la base

`AUTOMATION/web/shared_state.py`, `checker_partage(configuration)` : le cache ne
tenait **qu'un seul checker**, construit au premier appel du processus. Son
argument était ensuite ignoré. Tout personnage suivant était mesuré contre la
base gelée **et les seuils** du premier chargé.

```
08:52:47  abyssiaelle  -> CHECKER construit sur ABY_MAIN_REF.jpg, seuils 0.50 / 0.35
08:53:11  abyssiaelle
08:56:19  lena         -> mesurée contre CETTE ancre : 0.232, verdict REJET
```

Trois minutes. 0,232 est exactement la bande d'un visage **étranger** contre
`ABY_MAIN_REF` (0,20-0,35, mesure du 28/08). L'embedding, lui, ne dépend
d'aucune ancre : il est resté juste, et c'est ce désaccord qui a rendu la panne
visible.

La contamination ne se limitait pas à la re-mesure : `services/batch.py` lisait
la globale `ss.CHECKER` pour la production **et** pour l'édition NSFW. Un lot
entier généré pour un personnage après qu'un autre a été chargé était trié
contre la mauvaise référence — et le verdict décide du dossier de rangement.

### 5. Une hypothèse posée puis jetée

Avant de trouver la vraie cause, l'explication tentée était « le visage est trop
petit dans le cadre, le crop 112×112 perd le détail fin ». Mesurée, donc
écartée :

```
                                     image px   visage px   % de l'aire   vs ancre
ANCRE (base gelée)                  1536x2752    988x1366      31.98 %      1.000
REJET 0.232 (l'œil dit : c'est elle) 1080x1350    231x315       5.02 %      0.780
OK    0.808                          1080x1350    279x390       7.48 %      0.807
OK    0.767                          1080x1350    291x420       8.39 %      0.749
```

Le même fichier re-mesuré aujourd'hui rend **0,780**, pas 0,232. Un visage à
5 % de l'aire score comme un visage à 7,5 %. L'hypothèse ne tenait pas.

## Le verdict

**L'œil et le chiffre divergeaient, et l'œil avait raison — mais la mesure ne
voyait pas ce qu'il voyait pour une raison qu'aucune limite d'instrument
n'expliquait : elle regardait le visage d'un autre personnage.** C'est le
résultat principal de cette phase, et il était invisible à l'écran : un score,
un verdict, un dossier REJET, tout se présentait normalement.

Trois conclusions, dans l'ordre de ce qu'elles coûtent :

**1. Le bug est corrigé, à la racine** (2026-09-09). Le cache est désormais
clé par ancre (`CHECKER_ANCRE`), et les trois lectures directes de `ss.CHECKER`
dans `services/batch.py` passent par l'accesseur — un contrôle d'ancre qui se
contourne ne sert à rien. Test :
`AUTOMATION/tests/test_checker_par_personnage.py`, qui vérifie aussi qu'aucun
appelant ne relit la globale. Vérifié : il échoue contre l'ancien code.

Second défaut refermé au passage, de la même famille : `mesures.mesurer()` — le
bouton « Mesurer » de la Revue — écrivait le score sans jamais écrire
l'embedding. Le désaccord entre les deux moitiés était le seul témoin de la
panne ; il devient impossible plutôt que rare.

**2. L'ancre et le gabarit sont deux objets, et les confondre est le défaut de
fond.** L'ancre gelée dit **qui est** le personnage : elle ne bouge jamais. Le
gabarit dit **contre quoi on le mesure** : il doit vivre dans l'espace de
conditions de la production. Une photographie unique et figée est un gabarit
hors distribution — franchement pour un personnage stylisé (Abyssiaelle, marge
+0,05 contre +0,349), plus discrètement pour un personnage photoréaliste (Léna,
+0,097 à +0,210 sur 20 images).

Le dépôt avait déjà fait cette découverte une fois, le 24/08, sur le seuil de
santé : membres à 0,764 de la base, centroïde à 0,815, seuil absolu de 0,95
arithmétiquement inatteignable, d'où « le bon test est **relatif** ». Cette
leçon a été appliquée à la santé du jeu de référence — **jamais au portillon par
image**, resté absolu.

Le centroïde évolutif n'est donc pas un confort de suivi. **C'est le gabarit
d'enrôlement correct**, et il vaut pour tous les styles.

**3. La question de la mesure non photoréaliste reste ouverte, et elle est
architecturale.** ADR-0011 a rendu le **verrou** agnostique
(`universe.json / identity` → `pulid_flux` | `lora_sdxl`) et a laissé la
**mesure** commune, à dessein : « `qc_identity.py`, InsightFace antelopev2 ».
C'était juste — la mesure ne doit rien savoir de la méthode de génération — mais
ça suppose silencieusement **un visage humain photographiable**. Deux packs sur
deux respectaient l'hypothèse. Un pack manga la casse, et pas en se dégradant :
`IdentityChecker.__init__` lève `RuntimeError("aucun visage detecte dans la base
gelee")`. Le personnage se crée, et toute la chaîne QC refuse de partir — pas de
score, pas d'embedding, pas de centroïde, pas de banc pour juger le LoRA.

La mesure doit donc devenir une interface choisie par le pack, sur le patron
déjà écrit pour le verrou (`identity.for_universe`).

## Ce que la phase a fixé du mécanisme

Le schéma complet est dans le cadrage. Ce que la recherche y a ajouté, et
pourquoi :

1. **La mesure est résolue au wizard, et l'enrôlement peut refuser.** Un refus
   à la création vaut mieux qu'une chaîne qui s'arrête six semaines plus tard.
2. **Deux portillons en série** — revue humaine (réalisme), puis identité —
   parce qu'ils ne filtrent pas la même chose : 15 sur 74 passent les deux.
3. **Deux verdicts distincts** : *rejetée de la file d'entraînement* ≠
   *rejetée*. Publiable et entraînable sont deux décisions.
4. **Le centroïde surveille la file, il ne l'ouvre pas.** L'admission reste
   jugée par l'ancre ; la santé en rapport attrape la dérive commune.
5. **Une alarme d'instrument** : si les bandes personnage et étranger se
   recouvrent, ni le portillon ni le banc ne valent, et aucun seuil par
   personnage ne doit masquer ça.
6. **La diversité est un critère au même titre que le compte.** Le mètre existe
   déjà en base — `cohesion = cos(centroïde, membres)`, commenté « à quel point
   la production se ressemble ». Seuil à calibrer.
7. **L'entraînement réinjecte l'ancre** à chaque tour, jamais seulement au
   premier.
8. **La proposition reste une proposition** (`PROJET.md` : la plateforme
   n'arbitre pas à la place de l'utilisateur).

Sur l'auto-entraînement depuis la revue, la théorie tranche : une boucle
auto-consommatrice **à curation** optimise implicitement les préférences du
curateur, à condition qu'une fraction non nulle de données réelles entre à
chaque tour — et elle **amplifie les biais du modèle de récompense**. Chez nous
la fraction réelle est acquise (l'ancre gelée, qui ne bouge jamais) ; le
problème est que le signal de curation disponible est un jugement de réalisme.
D'où le portillon d'identité en série, et non à la place.

Un apport extérieur repris tel quel (document soumis par Pierre le 09/09) : la
**provenance de la donnée** — `REFERENCE` / `OBSERVED` / `DERIVED`. Vérifié en
base, le trou est réel : aucun `params_json` sur les batches d'Abyssiaelle, 13
images sur 122 sans `batch_id`, et `image.source` ne sert qu'à la branche NSFW
(32 lignes). Impossible aujourd'hui de savoir en base quelles images ont été
produites sous `abyss1a_v1` — alors que ce sont les 9 qui portent tout le
résultat ci-dessus. Une image `DERIVED` ne doit jamais devenir l'**ancre** ;
elle peut servir de **gabarit**, sous surveillance de l'ancre. C'est la même
distinction qu'au point 2 du verdict.

## Pistes écartées

- **Face swap correctif en fin de chaîne** (ReActor, FaceDetailer). Raison : le
  score d'identité mesurerait le *swapper*, pas la génération — le cas « juge et
  partie » de `protocole-de-mesure.md`. Impact si mis en œuvre en l'état : la
  cohérence affichée deviendrait une propriété de l'outil de recollage, et la
  dérive serait masquée au lieu d'être mesurée, dans un dépôt dont le produit
  **est** la mesure de cohérence.
- **DINOv2 / CLIP-I comme portillon d'identité.** Raison : similarité de
  **sujet** sur l'image entière — vêtements, pose, décor. Impact : un portillon
  qui laisse passer une inconnue habillée pareil dans le même décor. Gardé en
  réserve pour un plan large sans visage lisible, où InsightFace ne rend rien.
- **Écrire un entraîneur maison.** Raison : kohya et ai-toolkit se réduisent au
  même patron (sous-processus + fichier de config), donc le moteur n'est pas une
  décision d'architecture ; et réimplémenter l'entraînement Flux est un projet,
  pas un raccourci. Impact : des mois de dette sur une brique que deux projets
  Apache-2.0 et MIT maintiennent déjà.
- **Geler le gabarit de mesure avec l'ancre** (proposition du document
  extérieur, §3). Raison : c'est exactement le défaut mesuré ici, et ça
  interdirait le centroïde évolutif — c'est-à-dire le chantier. Impact : le
  produit livrerait un portillon absolu dont on sait qu'il sous-sépare dès que
  la production s'éloigne des conditions de l'ancre.

## Ce que je n'ai pas vérifié

- **La bande imposteur ne compte que deux identités.** Léna contre Abyssiaelle,
  rien d'autre. Ce n'est pas un corpus étiqueté, c'est un test à deux classes.
- **Confusion possible personne / générateur.** Léna est Flux photoréaliste,
  Abyssiaelle SDXL fantasy : une part de la séparation croisée peut venir du
  générateur plutôt que du visage. Il faudrait deux personnages du **même** pack
  pour lever le doute ; ils n'existent pas.
- **Deux paires de doublons** (embeddings identiques à 1,000) gonflent le haut
  des bandes. Le bas — celui qui définit la marge — n'est pas touché.
- **Le rayon d'impact réel du bug.** 1 image sur 29 est touchée *parmi celles
  qui portent un embedding*, seul contrôle possible. **58 images de Léna n'en
  ont pas** : impossible de savoir si leur score a été calculé contre la bonne
  ancre. Le backfill change donc de nature — ce n'est plus un remplissage, c'est
  l'audit.
- **Le manga n'a produit aucun chiffre.** Faute de personnage manga, la
  défaillance est lue dans le code (`RuntimeError` à l'enrôlement), pas mesurée.
- **CCIP** : licence des poids déclarée « openrail » sur HuggingFace, non lue
  ligne à ligne. ADR-0024 impose de vérifier la licence du modèle séparément de
  celle du code (`dghs-imgutils` est MIT), et une licence à restrictions d'usage
  dans un projet dont le NSFW est citoyen de première classe se lit en entier
  avant adoption. Couverture du semi-réaliste non testée.
- **ComfyUI-FluxTrainer** : fraîcheur de maintenance, support du Flux krea fp8,
  présence au registre — rien de tout ça n'est vérifié.

## Suites

Dans l'ordre, et le premier est gratuit :

1. **Lancer le backfill** (`AUTOMATION/tests/backfill_embeddings.py`) — 58
   embeddings à ~190 ms, puis le premier `reference_set` de l'histoire du dépôt.
   Il rend la santé, la cohésion et l'écart ancre/centroïde sur 113 images, sans
   aucun GPU de génération. Et il dit combien d'images ont été triées contre la
   mauvaise ancre. Deux réserves connues : le script est câblé en dur sur
   `"lena"`, et il écrit dans la base de production.
2. **Réparer les scores faussés** une fois les embeddings en place :
   `base.rescorer` recalcule un genre depuis les embeddings sans relire un PNG.
   Décision de Pierre — ça réécrit des verdicts, donc potentiellement des
   rangements.
3. **Porter le test relatif au portillon**, comme il l'a été à la santé le
   24/08. C'est le cœur de l'étage 1 côté mesure.
4. **Un ADR** : `identity_measure` comme interface choisie par le pack, sur le
   patron d'`identity.for_universe`. Il amende ADR-0011, dont il faut citer la
   phrase (« la couche de mesure d'identité reste commune ») et dire pourquoi
   elle ne tient plus.
5. **Un ADR, ou une section du précédent** : la **cohorte d'imposteurs**. La
   santé d'instrument exige une classe négative, or `CHARACTERS/*` est hors
   dépôt (ADR-0005) — un utilisateur qui crée son premier personnage n'a aucun
   étranger à comparer, et l'alarme d'instrument ne pourrait jamais se calculer.
   Piste la moins chère, non tranchée : embarquer une cohorte d'**embeddings**
   synthétiques (pas d'images, quelques centaines de kilo-octets, issus
   d'identités générées) — aucun visage réel distribué, cohérent avec un projet
   où tout est fictif par principe.
6. **La provenance** `REFERENCE` / `OBSERVED` / `DERIVED` en base, avec le
   modèle qui a produit chaque image. Et la règle qui manque à `construire_jeu` :
   **un jeu de référence ne mélange jamais deux modèles d'embedding** — la table
   porte déjà la colonne `modele`, rien ne filtre dessus, et un cosinus entre
   deux espaces ne veut rien dire. Même famille que « jamais deux personnages ».
7. **L'étage 1 du cadrage**, inchangé : parité Flux/SDXL sur `character_lora`,
   entraînement hors plateforme, banc. Les étages 2 et 3 restent rangés, avec un
   candidat nommé (ComfyUI-FluxTrainer) au lieu d'une question ouverte.

## Sources

- `arxiv.org/abs/2407.09499` — boucles auto-consommatrices avec curation
  (consulté le 09/09/2026)
- `arxiv.org/html/2505.09768v1` — curation adversariale ou bruitée
- `arxiv.org/pdf/2010.04072` — systèmes biométriques adaptatifs : self-update,
  infiltration d'imposteurs, dérive
- `arxiv.org/abs/1207.0783` — template update hybride, sous-références multiples
- `arxiv.org/html/2503.16025v1` — DINO vs CLIP-I comme métrique de fidélité au
  sujet
- `huggingface.co/deepghs/ccip` et `github.com/deepghs/imgutils` — CCIP
- `github.com/ostris/ai-toolkit`, `github.com/kohya-ss/sd-scripts`,
  `github.com/kijai/ComfyUI-FluxTrainer` — entraîneurs
- `make-influencer.ai/guides/ai-influencer-face-consistency` — méthodes du
  métier, **lu annoncé**, jamais comme preuve
