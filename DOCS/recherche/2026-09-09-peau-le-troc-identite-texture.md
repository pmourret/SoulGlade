# La peau et l'identité sont le même curseur

Étape 2 du front 1 d'IT-3b (`DOCS/cadrage/2026-09-08-phase-rd-juge-generaliste.md`),
après le fond (`2026-09-09-fond-le-prompt-n-est-pas-le-levier.md`). Le
cadrage posait la question avant le travail : « soit un indicateur qui
sépare, soit accepter de juger à l'œil et le dire ». Les deux réponses
sont mesurées ci-dessous.

## L'instrument ne sépare pas, et on sait de combien

`texture_visage` a un bruit intra-scène de 0.335 sur la production de
Léna (erreur-type 0.150 à cinq seeds). Les écarts que les réglages
produisent valent 0.25 à 0.76. Pour trancher un écart de +0.35 à deux
erreurs-types il faudrait **23 seeds par variante**, soit ~78 minutes de
GPU pour confirmer ce que deux images montrent en un coup d'œil.

Décision : pour la peau, **on juge à l'œil, et on l'écrit**. L'identité,
elle, reste chiffrée — c'est le seul plateau de la balance que la mesure
tient (bruit 0.008, tout écart réel sort à plusieurs sigma).

Corollaire méthodologique découvert en route : sur `sharpen`,
`texture_visage` est pire qu'aveugle, elle est **juge et partie**. La
mesure est la médiane de l'écart-type local ; un filtre d'accentuation
augmente l'écart-type local par définition. Un gain mesuré sur cet axe ne
prouve rien d'autre que le fonctionnement du filtre.

## Trois axes, même scène, mêmes seeds

Scène `selfie_miroir_entree` (le visage y est le plus grand, donc le crop
de mesure est le moins interpolé), 5 seeds appariés, 45 images. Les trois
bancs partagent des images de référence **identiques à l'octet près** —
vérifié par md5, ce qui rend leurs verdicts comparables entre eux.

| axe | valeur | identité | texture_visage | tri |
|---|---|---|---|---|
| — | référence | 0.762 | 4.960 | 5 OK / 5 |
| `identity_weight` | 0.75 | −0.042 (3.0 σ) | +0.307 | 2 OK / 5 |
| `identity_weight` | 0.65 | **−0.092 (6.2 σ)** | +0.354 | 0 OK / 5 |
| `refiner_denoise` | 0.25 | +0.016 (stable) | −0.251 | 5 OK / 5 |
| `refiner_denoise` | 0.55 | **−0.078 (2.1 σ)** | +0.711 | 1 OK / 5 |
| `sharpen` | 0.55 | −0.002 (stable) | +0.298 | 5 OK / 5 |
| `sharpen` | 0.80 | −0.003 (stable) | +0.760 | 5 OK / 5 |

## Ce que ça dit

**Deux mécanismes indépendants, un seul arbitrage.** L'adaptateur
d'identité et le refiner n'ont rien de commun — l'un injecte un
embedding, l'autre re-débruite l'image entière. Les deux donnent le même
échange, dans les mêmes proportions : tout ce qui rend de la liberté au
modèle sur le visage rend de la texture et coûte l'identité. Ce n'est pas
un réglage à trouver, c'est une propriété de l'architecture — l'identité
est imposée à l'inférence, et elle est imposée en tirant le visage vers
un centre lisse. Le lissage plastique de PuLID-Flux est d'ailleurs un
défaut documenté de la brique, pas une particularité de ce dépôt.

**Le tri automatique le dit sans qu'on le lui demande** : 5 images OK sur
5 à la référence, 0 sur 5 à `identity_weight` 0.65. Le coût n'est pas
théorique, il se compte en images jetées.

**Les leviers post-génération étaient déjà tirés, sauf un.**
`grain_strength` est à 0.0 délibérément (le nœud `ImageAddNoise` pose un
bruit RGB plat, ce qu'aucun capteur ne fait ; c'est `grain.py` qui pose
le grain, calibré le 24/08 contre un corpus de vraies photos et qui
atteint ses rapports structurels). `detail_restore` a été rejeté en IT-1
sur deux câblages et quatre réglages, verdict visuel « peau beaucoup trop
lisse » confirmé à 5 σ. Restait `sharpen`, jamais mesuré.

## Ce qui est adopté

`sharpen` 0.30 → **0.55** sur Léna, jugé à l'œil par Pierre sur les
images à taille réelle (le protocole que l'instrument impose). Identité
inchangée, tri inchangé, gain de micro-contraste visible. 0.80 donnait
plus, jugé trop.

Le gabarit du pack reste à 0.30 : c'est une mesure sur UN personnage, et
un réglage de personnage (invariant 4). Un autre personnage du même pack
mesurera le sien — c'est la règle partout ailleurs dans ce dépôt, et le
seul moyen de ne pas transformer un jugement en dogme.

Ce n'est pas la peau « réparée » : c'est un filtre qui rattrape un peu de
micro-contraste sur une image dont la peau est lissée en amont. La cause
reste entière, et sa sortie connue est ailleurs — un LoRA d'identité par
personnage, inscrit en E2 le même jour, mécanisme commun et jamais un
traitement de faveur pour un personnage.

## Ce que l'étape laisse au dépôt

Deux corrections nées de cette mesure, toutes deux committées :

- le banc **ne rend plus de verdict sur du bruit** : la marge disait si
  un écart méritait qu'on s'y intéresse, jamais s'il était distinguable.
  Deux verdicts du 07/09 étaient du bruit (`facedetailer`, −1.33 de
  netteté pour un écart-type de 14.3) ;
- le banc **sait varier un réglage continu** (dette E5 d'IT-2), sans quoi
  ni `refiner_denoise` ni `sharpen` n'auraient pu être posés en question.

Et une erreur de protocole, corrigée à mi-parcours : les comparaisons
côte à côte détectaient le visage dans CHAQUE image, donc le cadrage du
crop bougeait avec le réglage et on comparait deux recadrages en plus de
deux peaux. Contrôle qui l'a révélée : à `sharpen` égal les contours
restent au même endroit (IoU 0.65, différence moyenne 1.6/255) — un
filtre, pas une re-diffusion. Les montages sont désormais faits avec le
rectangle de la référence, appliqué tel quel aux variantes.
