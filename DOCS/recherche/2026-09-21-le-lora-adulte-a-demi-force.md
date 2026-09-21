# Le LoRA adulte, et pourquoi c'est la demi-force qui gagne

Verdict du cadrage `DOCS/cadrage/2026-09-21-scene-nsfw-native-le-modele.md`,
ouvert et refermé le même jour. Il restait une question à IT-3e : avec quoi
fabrique-t-on une scène adulte native ?

**Réponse : `nsfw_flux_lora_v1` à force 0.4, sur le checkpoint Flux dev du
pack.** À demi-force le LoRA ne coûte plus rien à l'identité et rend mieux
qu'à pleine force — mesuré des deux côtés, jugé à l'œil, et le seul réglage
qui franchisse le portillon d'enrôlement.

## Ce qui a été décidé avant de mesurer

Arbitrage de Pierre : le NSFW natif reste dans la famille du modèle du pack,
plus un LoRA. Qwen ne sort pas de son rôle, il édite une image déjà produite.
Les deux autres candidats du cadrage (`flux1-krea-dev`, `Qwen-Rapid-AIO` en
natif) sont fermés **par la décision, sans mesure** : le premier changeait le
checkpoint du pack, le second perdait le verrou PuLID.

La raison tient en une phrase : PuLID-Flux est lié à l'architecture
Flux.1-dev. Un modèle de cette famille garde le verrou et sort une image
identifiée en une passe ; tout autre le perd.

## Ce qui a été mesuré

Deux candidats, tous deux déjà installés — aucun téléchargement n'a été
nécessaire pour commencer, l'inventaire des 60 LoRA du dossier ayant été lu
dans les en-têtes `safetensors` et non dans les noms de fichiers :

| | tenseurs | blocs doubles / simples | verdict |
|---|---|---|---|
| `anatomy_fineart_nudity_by_caith` | 648 | 19 / 38 | Flux.1-dev |
| `nsfw_flux_lora_v1` | 988 | 19 / 38 | Flux.1-dev |

19 doubles et 38 simples est la signature exacte de Flux.1-dev. Le doute
initial (« le premier est peut-être du SDXL ») ne tenait pas : un LoRA SDXL
montrerait des blocs `down`/`up` en 320/640/1280.

Protocole, trois passages, tous sur les **cinq mêmes seeds** que la campagne
LoRA d'identité du 14/09 :

1. **capacité**, scène explicite, les deux candidats à 0.8 ;
2. **coût**, banc sur une scène habillée ordinaire, axe unique sur la force
   (0.0, 0.4, référence 0.8) ;
3. **capacité à demi-force**, scène explicite, le candidat retenu à 0.4.

Tout passe par le chemin livré le matin même — `config.json / nsfw / lora`
puis `runner.comfy.lora_pack_actif` puis `node_modes` — donc ce que l'essai
mesure est ce que la production ferait.

## Résultats

**Le choix du fichier, à l'œil (Pierre).** `anatomy_fineart_nudity_by_caith`
sort deux erreurs d'anatomie sur cinq images (corps trop allongé, aberration
de bras) ; `nsfw_flux_lora_v1` une seule, légère (tête trop grosse). Les
chiffres, eux, ne les départageaient pas : 0.020 d'écart d'identité, soit le
bruit de réplicat du banc. **C'est l'œil qui a tranché, et c'est le cas
prévu par la double condition.**

**La force, mesurée deux fois.** Au banc, sur scène habillée :

| | identité | texture visage | netteté | fond net |
|---|---|---|---|---|
| éteint | 0.784 | 5.78 | 430 | 0.89 |
| 0.4 | 0.761 | 5.40 | 501 | 0.72 |
| 0.8 | 0.760 | 5.05 | 555 | 0.59 |

Verdict du banc : `0.4` **stable**, `0.8` coûte 0.024 d'identité (juste
au-dessus du bruit) et 0.73 de texture de visage (environ deux écarts-types).

Sur la scène explicite, le même classement, cette fois franchement
au-dessus du bruit :

| | identité / ancre | identité / gabarit | netteté | texture |
|---|---|---|---|---|
| **0.4** | **0.775** | **0.921** | 279 | 5.16 |
| 0.8 | 0.745 | 0.881 | 216 | 4.62 |

+0.030 contre l'ancre et +0.040 contre le gabarit pour un plancher de bruit
à 0.020. À demi-force le LoRA ne coûte pas : il rend mieux.

**Le seuil franchi.** À 0.4 le score au gabarit vaut 0.921, au-dessus du
portillon d'enrôlement de Léna (`qc.threshold_gabarit` = 0.9125) ; à 0.8 il
tombe à 0.881, dessous. Les images du palier natif produites à demi-force
sont donc éligibles au jeu de référence d'identité — conséquence assumée de
l'arbitrage du même jour, qui a retiré l'espace des critères d'identité.

## Le revers, tranché avec le modèle

Le cadrage exigeait que ce qui empêche le nu involontaire en SFW soit nommé
et testable, et que ce ne soit ni la garde-robe ni le prompt. C'est livré
avec le câblage, le même jour : le LoRA n'entre dans le graphe que si un
palier déclare `lora_adulte`, et `services/creative.apply_tier_rules` remet
sa force à zéro partout ailleurs — SFW, Suggestif, et la passe de génération
d'une requête d'édition. `AUTOMATION/tests/test_lora_pack.py` verrouille les
trois conditions, palier par palier.

## Ce que la mesure n'a pas su voir

**Trois erreurs d'anatomie sur dix images jugées**, toutes relevées par
l'œil, aucune par un instrument. Le corpus étiqueté du 08/09 en comptait une
sur 92 jugeables côté SFW, et c'est ce qui avait fermé la piste « mesurer et
seuiller » faute de positifs à calibrer (dette E6, dette E9). Si la voie
native tient ce taux, elle fournit enfin de quoi calibrer. À confirmer sur
un n honnête : dix images ne sont pas un corpus.

Vérification faite au passage sur la question du cadrage (« est-ce la
caméra ? ») : la part de hauteur d'image occupée par le visage vaut 30,4 %
sur l'image signalée, contre 36,0 % sur une image du même lot qui n'a rien
déclenché. Ce n'est donc pas la focale du prompt, constante sur les dix, ni
la taille du visage dans le cadre : c'est le rapport tête/corps à cadrage
donné, une faiblesse de composition par seed.

## Ce qui reste

Le palier natif lui-même n'existe pas encore : il faut un cran déclarant
`lora_adulte` dans `creative.json`, et la banque de scènes NSFW décidée le
21/09 (portée par le monde). C'est le chantier suivant d'IT-3e, et il n'a
plus de question ouverte devant lui.

Reste aussi à déclarer `nsfw_flux_lora_v1.safetensors` au manifeste
(invariant 12) le jour où un graphe ou un pack livré en dépend : aujourd'hui
il n'est nommé que par une donnée de personnage, et le fichier vient de
CivitAI sans URL relevée.
