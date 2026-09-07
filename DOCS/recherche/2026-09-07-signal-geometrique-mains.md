# Mains cassées : le squelette DWPose ne porte pas le signal

Sonde menée le 2026-09-07 après un retour d'usage réel : deux images de
production (`intime_chambre_matin_20260907_01.png` et `..._01_2.png`,
`PROD/LENA/OK/`) montrent des mains fondues dans la cuisse et le drap, et
la capacité `hands` livrée en P4.3 les a scorées **1.0 — parfait** sur
les deux.

Question posée : existe-t-il, dans la sortie DWPose déjà disponible, un
indicateur géométrique qui aurait attrapé ces deux cas ? C'est le volet
« v2 géométrique » que
`DOCS/cadrage/2026-09-07-p4-3-metrique-mains.md` avait reporté « après un
premier retour d'usage ». Réponse : **non**, et cette note ferme la piste
plutôt que de la laisser ouverte à re-tenter.

## Protocole

15 images de la banque Léna passées dans le graphe d'extraction
(`WORKFLOWS/utils/pose_extract_ui.json`, DWPose corps + mains) : les 2
étiquetées mauvaises par Pierre, et 13 images de `PROD/LENA/OK/`
utilisées comme contrôle. Trois indicateurs calculés depuis les seuls
keypoints, sans modèle supplémentaire :

- **hors-cadre** — nombre de points de la main placés en dehors du
  canvas (DWPose extrapole au-delà du bord),
- **ratio main / avant-bras** — longueur poignet→bout du majeur divisée
  par la longueur coude→poignet (une main réelle fait ~0.7 avant-bras),
- **asymétrie des bras** — écart relatif entre bras gauche et droit.

## Chiffres

| Image | étiquette | asym. bras | hors-cadre (D / G) | ratio (D / G) |
|---|---|---|---|---|
| `intime_chambre_matin_20260907_01` | **mauvaise** | 0.32 | 0 / 12 | 0.37 / 0.26 |
| `intime_chambre_matin_20260907_01_2` | **mauvaise** | 0.08 | 0 / 2 | 0.69 / 0.50 |
| `lifestyle_salon_lecture_20260824_01` | ok | 0.02 | 0 / 0 | 0.78 / 1.11 |
| `selfie_miroir_entree_20260822_02` | ok | 0.09 | 0 / 1 | 0.32 / 0.43 |
| `intime_chambre_matin_20260829_01` | ok | 0.13 | 0 / 7 | 0.83 / 0.73 |
| `lifestyle_cafe_terrasse_20260904_02` | ok | 0.07 | 0 / 0 | 1.62 / 0.23 |
| `mode_detail_atelier_20260824_01` | ok | 0.05 | **14** / 1 | **0.11** / 0.22 |
| `selfie_miroir_entree_20260904_01` | ok | 0.00 | 1 / 0 | — / 0.71 |
| `lifestyle_cuisine_matin_20260824_01` | ok | 0.05 | 0 / 0 | 0.65 / — |

(Les 6 autres images de contrôle n'ont pas de main évaluable — cadrage
serré ou bras hors champ ; elles ne départagent rien et sont omises.)

## Ce que ça dit

- **Hors-cadre ne discrimine pas.** Une image ok (`mode_detail_atelier`)
  a 14 points hors cadre, plus que la pire des mauvaises. C'est
  attendu : une main partiellement coupée par le bord du cadre est un
  cas photographique banal, et DWPose extrapole toujours au-delà.
- **Le ratio main/avant-bras ne discrimine pas.** Les mauvaises tombent
  entre 0.26 et 0.69, en plein dans la plage des ok (0.11 à 1.62). La
  perspective (main pointant vers l'objectif) écrase ce ratio autant
  qu'une déformation.
- **L'asymétrie des bras attrape UNE des deux** (0.32 contre un maximum
  de 0.14 chez les ok) — mais pas l'autre (0.08, banal). Un seuil calé
  là-dessus n'attraperait qu'un cas sur deux, sur 13 images de contrôle :
  très loin d'un étalonnage honnête.

## La raison de fond, et pourquoi la piste est fermée

DWPose détecte **21/21 points sur les deux mauvaises images**, avec des
positions cohérentes entre elles : le squelette de main est plausible en
tant que squelette. Le défaut n'est pas dans sa géométrie — il est dans
le fait que **les pixels sous ce squelette ne forment pas une main**.
DWPose pose une structure anatomiquement correcte sur une bouillie.

Aucune analyse du squelette seul ne peut voir ça, par construction :
l'information manquante n'est pas dans les keypoints. Ajouter un
troisième, un quatrième indicateur géométrique reviendrait à chercher
une clé sous un lampadaire — ce n'est pas une question de trouver le bon
ratio, c'est que la donnée n'y est pas.

**Conséquence directe** : le volet « v2 géométrique » de
`2026-09-07-p4-3-metrique-mains.md` est clos, sans regret et sans
re-tentative. Ce qui reste de la capacité `hands` v1 est ce qu'elle
mesure honnêtement — DWPose n'a pas réussi à trouver de main là où le
corps en annonce une — soit un cas franchement plus rare que le défaut
que Pierre vient de rencontrer.

## Ce qu'il faudrait à la place

Un juge qui regarde **les pixels**, pas les keypoints. L'architecture
qui découle des mesures ci-dessus : **DWPose localise** (il sait où est
la main, il est fiable pour ça, y compris sur les images ratées) et
**un second étage juge le crop**.

Piste la plus directe, à instruire avant de coder quoi que ce soit :
`comfyui-florence2` est **déjà provisionné** (`AUTOMATION/
comfyui_manifest.json`, commun aux deux packs) et regarde réellement les
pixels. Le patron existe déjà dans l'écosystème — `SKIN FIX 3.json` de
ComfyUI Studio s'en sert pour légender automatiquement une zone masquée
(`DOCS/recherche/2026-09-06-workflows-detail-visage-mains.md`). Reste à
vérifier ce qu'un VLM répond vraiment sur un crop de main cassée, et
avec quelle constance — une question ouverte, pas une solution acquise :
un VLM qui hallucine « une main normale » serait le même angle mort
qu'aujourd'hui, déplacé d'un cran.

## Note utile pour les proportions (P4.5)

Le même jeu de mesures dit l'inverse pour le corps : l'asymétrie des
bras de l'image 1 (0.32) **sort nettement** du lot des ok (max 0.14).
C'est cohérent — une proportion est un rapport de longueurs entre
points, exactement ce que le squelette porte ; une main cassée est une
forme locale, que le squelette ne porte pas. Un signal squelette est
donc plausible pour les proportions là où il est vain pour les mains.
Point de départ mesuré pour `DOCS/cadrage/2026-09-07-p4-5-proportions.md`,
pas un acquis : un cas sur deux, 13 contrôles.
