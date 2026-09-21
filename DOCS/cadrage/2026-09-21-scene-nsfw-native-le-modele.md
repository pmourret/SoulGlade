# La scène NSFW native : d'abord le modèle

Cadrage ouvert le 2026-09-21 à la demande de Pierre, avant toute ligne de
code. C'est le dernier point ouvert de la DoD d'IT-3e, et le seul que les
deux cadrages précédents ont refusé de trancher en passant :

- le 10/09 (`2026-09-10-capacite-nsfw.md`, point 6) pose la question et la
  laisse ouverte : « la vraie question n'est pas le pipeline, c'est le
  modèle. Le palier natif demande-t-il ce modèle, un LoRA, ou un
  troisième ? Non tranché, et c'est ce qu'il faudra mesurer avant d'écrire
  une ligne de graphe » ;
- le 21/09 (`2026-09-21-flux-nsfw.md`, arbitrage 4) décide l'ordre : la
  banque de scènes et le palier natif viennent **après** cette réponse,
  jamais avant.

Ce fichier ne rouvre ni le pipeline, ni la destination, ni la mesure du
corps. Il ne traite que le modèle, et le revers qui se décide avec lui.

## Ce que la question n'est pas

Le **pipeline est tranché** depuis le 10/09 : un palier de plus sur
`produce`, même `execute_jobs`, mêmes rôles, même verrou. ADR-0003, amendé
le même jour, continue d'écarter « la génération NSFW native dans chaque
outil » ; ce qui est demandé n'est pas ça. L'invariant 9 tient.

La **banque de scènes** est tranchée aussi (21/09, arbitrage 3) : une
banque séparée, portée par le monde, héritée par le personnage. Séparation
de données, pas de sous-système. Elle n'attend que le modèle.

Reste une seule question, et elle est technique : **avec quoi fabrique-t-on
l'image ?**

## La contrainte qui commande tout : l'identité

Le verrou d'identité du pack de Léna est **PuLID-Flux**, et il est lié à
l'architecture Flux.1-dev — pas à un goût, à une compatibilité. Deux
conséquences qui décident presque seules :

1. **Un modèle de la famille Flux.1-dev garde le verrou.** Une image native
   sort avec son identité posée en une passe, et ses mesures se comparent
   à tout l'historique.
2. **Tout autre modèle le perd.** L'image native n'est alors « personne » ;
   il faut une seconde passe pour lui rendre son visage — c'est-à-dire
   exactement la voie d'édition d'aujourd'hui, avec une autre image de
   départ.

`PROJET.md` le dit d'un autre angle, et dans le sens qui interdit de
contourner : le checkpoint appartient au **pack**, « parce qu'en changer
périme les mesures d'identité ». Un personnage est figé à son pack
(invariant 8). Léna ne peut donc pas emprunter le checkpoint d'un autre
pack pour un palier, et un second pack n'est pas une réponse à cette
question-ci : ce serait un autre personnage.

## Ce qui est réellement installé

Relevé dans `AUTOMATION/comfyui_manifest.json` et dans la référence de pack
(`.claude/skills/workflow-comfyui/references/modeles-par-pack.md`) — pas
dans un souvenir :

| Modèle | Rôle aujourd'hui | Famille | Verrou d'identité |
|---|---|---|---|
| `flux1-dev-fp8` | checkpoint de production du pack | Flux.1-dev | PuLID-Flux ✔ |
| `Realistic_Adult_Flux_10-000001` | LoRA de **réalisme**, pas d'identité, chargé par le graphe de production | Flux | — |
| `Qwen-Rapid-AIO-NSFW-v23` (28,4 Go) | modèle de la **voie d'édition** NSFW | Qwen-Image-Edit | aucun ✘ |
| `krea2_turbo_fp8_scaled` | installé, jamais câblé, marqué `experimental` | Krea 2 | à vérifier ✘ |
| `flux1-krea-dev-fp8` | nommé par `experiments/krea_nsfw_test_ui.json`, **jamais installé** ici | Flux.1-dev | PuLID-Flux ✔ |

Cette dernière ligne est une piste laissée en plan, pas un échec mesuré :
un graphe d'essai existe, il nomme un fichier qui n'a jamais existé sur
cette machine, et le dépôt officiel publie ce modèle sous un autre nom.

## Les quatre candidats

### A. Flux dev + un LoRA NSFW, chargé au seul palier natif

Le checkpoint du pack ne bouge pas, le verrou reste, les mesures restent
comparables. Le coût est du câblage : un rôle de LoRA de **pack** dans le
graphe de production, allumé par le palier et par lui seul — le motif
existe déjà deux fois (le LoRA d'identité du personnage, l'interrupteur du
`handdetailer`).

À vérifier : qu'un tel LoRA existe à un niveau de rendu acceptable sur
Flux dev, et ce qu'il coûte à l'identité quand il est actif (PuLID et un
LoRA de style se disputent le visage — c'est le troc identité/texture déjà
mesuré le 09/09, une troisième fois).

### B. `flux1-krea-dev`, la piste abandonnée

Même architecture Flux.1-dev, donc **verrou conservé**, et une réputation
de rendu moins lisse. Un graphe d'essai existe déjà.

À vérifier avant tout : le vrai nom de fichier publié, son installation
(11,9 Go), et si le modèle accepte réellement ce que Flux dev refuse. Si
oui, c'est le candidat le moins cher en architecture : un checkpoint de la
même famille, au même endroit.

### C. `Qwen-Rapid-AIO-NSFW`, déjà là, mais sans visage

C'est le modèle qui produit déjà du NSFW dans le dépôt, et il est installé.
Son nom dit `AIO` : à vérifier s'il génère depuis un texte seul, ou
seulement depuis une image.

Même s'il génère, **il ne porte aucun verrou d'identité** : la scène native
serait une inconnue, et il faudrait une seconde passe pour lui rendre le
visage de Léna. On retomberait sur la chaîne actuelle, avec une image de
départ produite au lieu d'une image validée. Ce n'est pas disqualifiant —
c'est un chiffre à comparer : identité et réalisme d'une image « Qwen puis
identité » contre « SFW validée puis édition ».

### D. Le renoncement écrit

La voie d'édition reste la seule porte. Elle fonctionne, elle répare les
mains depuis le 20/09, elle passe la même chaîne de validation et elle
exporte depuis le 21/09. Ce qu'on perd est nommé : on ne peut pas composer
une scène adulte, on ne peut que transformer une scène existante.

C'est une issue légitime, au même titre que le flou de fond et le juge
pixel. Elle s'écrit dans `DOCS/recherche/`, elle ne se subit pas.

## Le revers se décide avec le modèle, jamais après

Point 3 du 10/09, cité tel quel : « aujourd'hui l'accident est quasi
impossible *parce que* rien n'est natif : le checkpoint n'est jamais
sollicité pour ça. Ouvrir la voie native ouvre mécaniquement la voie
accidentelle. On ne les décide jamais l'une sans l'autre. »

Le candidat retenu doit donc dire, dans la même page, **ce qui ferme la
porte en SFW**. Pour A, c'est le palier qui charge le LoRA et lui seul.
Pour B, c'est un second checkpoint chargé au seul palier natif. Pour C, le
problème ne se pose pas : le modèle n'est jamais dans le chemin SFW. Un
candidat dont la garde ne tient qu'à la garde-robe et au prompt est refusé
d'avance : ce sont des données, pas une garde.

## Ce qui décide

La double condition habituelle, et rien d'autre :

1. **un chiffre au banc**, sur seeds appariés, une scène tenue fixe : score
   d'identité contre le gabarit, netteté, texture de visage, et le taux de
   mains jugeables. Le banc sait déjà faire varier un checkpoint ou un
   LoRA par un axe — `lora_name` et `lora_strength` existent depuis le
   14/09, un axe `checkpoint` reste à ouvrir s'il faut comparer B ;
2. **l'œil de Pierre**, sur une planche de crops montée comme celle des
   mains : le rendu adulte est précisément ce qu'aucune de nos mesures ne
   sait juger.

Rappel qui a coûté cher le 14/09 : le banc n'est pas reproductible à seed
fixée, son bruit de réplicat vaut 0.019 sur l'identité, soit sa marge.
**Tout écart d'identité sous 0.03 ne décide rien** (dette E5). Un candidat
ne se départage pas sur 0.01.

## Hors périmètre

- **La mesure du corps** : dette E9, refermée par renoncement le 20/09
  (`DOCS/recherche/2026-09-20-nsfw-le-corps-n-est-pas-l-accuse.md`). Elle
  ne revient pas ici.
- **Un second personnage armé** : contrainte permanente du 10/09, point 5.
  Ce qui s'écrit ici doit rester agnostique sans pouvoir le prouver.
- **Le pack `rpg-personnage`** et son écosystème SDXL/Pony : un autre pack
  est un autre personnage, pas une réponse pour Léna.
- **La banque de scènes NSFW** : tranchée le 21/09, elle attend, et elle
  n'attend que ça.
- **Changer le checkpoint de production du pack** : il périmerait toutes
  les mesures d'identité de tout l'historique.

## L'ordre

1. **Vérifier ce qui est vrai de C**, parce que c'est gratuit : le modèle
   est installé. Génère-t-il depuis un texte seul, oui ou non ? Une demi-
   journée de manipulation, aucune décision d'architecture.
2. **Vérifier B** : le nom de fichier réel, l'installation, et ce que le
   modèle accepte. Même famille, donc le candidat le moins cher s'il tient.
3. **Chercher pour A** un LoRA NSFW Flux dev de niveau acceptable, et le
   déclarer au manifeste s'il entre (invariant 12).
4. **Le banc**, sur le ou les candidats qui restent debout, puis la
   planche.
5. **Écrire le verdict** dans `DOCS/recherche/`, y compris si c'est D.

## Arbitrage de Pierre, le 21/09

**Candidat A.** Le NSFW natif reste dans la famille du modèle du pack — ici
Flux dev — plus un LoRA. Qwen ne sort pas de son rôle : il édite une image
déjà produite, et rien d'autre.

Les candidats B (`flux1-krea-dev`) et C (`Qwen-Rapid-AIO` en natif) sont
donc **fermés**. Pas mesurés, pas départagés : écartés par la décision, et
c'est légitime — B changeait le checkpoint du pack, C perdait le verrou.
Les rouvrir demanderait de rouvrir cette page.

## Ce que la machine porte déjà

Relevé le 21/09 en lisant l'en-tête `safetensors` de 60 fichiers, pas leur
nom : la famille d'un LoRA est dans ses tenseurs et ses métadonnées.

| Fichier | Architecture déclarée | Taille | Ce que c'est |
|---|---|---|---|
| `anatomy_fineart_nudity_by_caith` | `Flux.1-dev/lora` | 135 Mo | nu / anatomie, titre `anatomy_h_7000` |
| `standingdoggylora` | `flux-1-dev/lora`, dim 32 | 145 Mo | acte explicite, mot déclencheur `st4ndingd0ggy` |
| `Realistic_Adult_Flux_10-000001` | Flux (diffusers) | 90 Mo | LoRA de réalisme déjà chargé en production |

Le reste du dossier est SDXL/Pony (l'écosystème NSFW local d'avant Flux),
WAN ou LTX. **Conséquence : le candidat A se teste aujourd'hui, sans rien
télécharger.** CivitAI reste la source pour élargir le choix une fois que
le banc saura comparer deux LoRA.

## Ce qui manque pour lancer la mesure

Un seul point, et il est de câblage : le graphe de production **n'a pas de
place pour un LoRA de pack**. Il en charge un en dur (le réalisme) et
accueille celui du personnage par le rôle `character_lora`
(`identity.injecter_lora`). Il faut un troisième emplacement, allumé par le
palier natif et par lui seul — c'est aussi ce qui **ferme la porte du nu
involontaire en SFW**, donc la garde demandée plus haut et le câblage sont
le même travail.

Tant qu'il n'existe pas, aucune mesure honnête n'est possible : détourner
`identity.lora` pour y mettre le LoRA NSFW retirerait à Léna son LoRA
d'identité et son mot déclencheur, et comparerait deux choses à la fois.

## Critère de sortie

Ce cadrage se ferme quand :

- un candidat est **nommé**, avec son chiffre au banc et le jugement de
  l'œil, ou que le renoncement est écrit ;
- le revers est tranché **dans la même décision** : ce qui empêche le nu
  involontaire en SFW est nommé et testable, et ce n'est ni la garde-robe
  ni le prompt ;
- le modèle retenu est déclaré dans `AUTOMATION/comfyui_manifest.json`
  avec son `url` ou sa `provenance` (invariant 12, ADR-0022) ;
- le palier natif peut alors s'écrire : c'est l'objet du chantier suivant,
  pas de celui-ci.
