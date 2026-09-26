# IT-10, chantier 4 : la pose porte son texte

**Date** : 2026-09-26 · **Décision** : Pierre, 26/09 (vision sur la photo ;
après retouche, heuristique puis LLM local)

## Pour qui

Pour l'utilisateur qui choisit un squelette dans le composeur : aujourd'hui
le champ « En mots » reste vide, et il doit décrire à la main une pose que
le studio a pourtant vue, sur la photo, au moment de l'extraire. Pour celui
qui retouche un squelette ensuite : rien ne lui dit que la description ne
correspond plus.

## Ce qui est constaté

Une pose est un PNG et un JSON sœur dans `INPUTS/POSE/` (le frame OpenPose,
plus `label`, `source`, `created_at`). `/api/pose/save` réécrit le frame tel
que l'éditeur le renvoie : une clé de plus y fait l'aller-retour sans
changer de schéma. La banque de poses est **commune** à tous les
personnages (déjà le cas, `serve_pose`).

La photo n'existe que pendant `pose_tools.extraire` : elle est supprimée
quoi qu'il arrive. C'est la seule fenêtre où un modèle peut la lire.

## Ce qui est mesuré (26/09, modèles déjà au manifeste)

Banc : quatre images générées du studio (personnage fictif) en guise de
photo, quatre squelettes de la banque.

| Entrée | Modèle | Résultat |
|---|---|---|
| photo | Qwen3-VL (`llm_local`), consigne « pose seule » | 3 à 5 s. Deux textes justes (selfie, lecture), deux avec des « arms crossed » inventés (café, cuisine). Aucun vêtement, aucun visage. |
| photo | Florence PromptGen `prompt_gen_analyze` | propre mais pauvre (`action: sitting`) |
| squelette | Florence, trois tâches | « stick insect », « six arms » : inutilisable |
| squelette | Qwen3-VL | sortie vide, ou « spread » juste une fois sur deux en question fermée |
| texte seul | Qwen3-VL, consigne courte | écho ou vide (même échec que `legende.py` le 10/09) |
| texte seul | Qwen3-VL, consigne cadrée à la `compose.py`, faits mesurés + ancien texte, réponse JSON | 2 s, **identique sur trois graines**, suit les faits, n'invente rien. Laisse tomber des accessoires (« holding phone ») : l'erreur prudente. |

Conséquence : aucun modèle installé ne lit un squelette. Ce qui connaît le
squelette après retouche, c'est sa géométrie.

## Ce qui est tranché

- **Le texte naît de la photo**, à l'extraction, par Qwen3-VL avec une
  consigne « pose seule » et une réponse JSON. Un échec (ComfyUI, sortie
  vide) ne fait pas échouer l'extraction : la pose naît sans texte.
- **Après une retouche, le texte est marqué « à revoir »**, jamais réécrit
  en silence. Un bouton le réécrit à la demande : une **heuristique** lit les
  points-clés (posture, chaque bras, tête, vue) et en tire des faits ; le
  **LLM local** réécrit l'ancien texte pour qu'il colle à ces faits.
  Gabarit et pose from-scratch : même bouton, sans ancien texte.
- **Le texte reste une proposition.** Il se corrige à la main dans l'éditeur
  de pose ; le composeur ne l'écrase jamais.
- **Le visage n'entre jamais** : le texte passe par
  `legende.sans_clause_de_visage` avant d'être écrit (invariant 6).

## Ce qui entre

Backend, un commit :

1. Le frame porte `texte` et `texte_points`, l'empreinte des points-clés
   pour lesquels le texte a été écrit. « À revoir » = l'empreinte ne
   correspond plus. Une édition à la main du texte la remet à jour.
2. `pose_texte.py` : `depuis_photo(image)`, `faits(frame)` (l'heuristique,
   pure) et `reecrire(frame)` (faits + ancien texte → LLM). Les appels
   modèle passent par `llm_local`, jamais un second client ComfyUI.
3. `pose_tools.extraire` appelle `depuis_photo` pendant que la photo est
   encore là, dans le même `try/finally`.
4. `/api/pose/bank` rend `texte` et `texte_a_jour`. `POST /api/pose/texte`
   `{name}` réécrit depuis le squelette, en executor, avec l'`except
   Exception` large de la route (`backend.md`).
5. Tests : `faits` sur des frames synthétiques connus (debout, bras levé,
   assis, profil) ; l'empreinte bascule « à revoir » après un déplacement de
   point et revient « à jour » après édition du texte ; une extraction dont
   le modèle échoue produit quand même la pose.

Frontend, un commit :

6. Éditeur de pose : un champ « Texte de la pose », un badge « à revoir »,
   un bouton « Réécrire depuis le squelette ».
7. Composeur, panneau Pose : choisir un squelette remplit « En mots » **s'il
   est vide** ; sinon un lien « Reprendre le texte de la pose » le remplace
   sur demande. Scène liée au monde : rien, le champ est verrouillé.
8. Tests navigateur : le préremplissage sur champ vide, l'absence
   d'écrasement sur champ rempli.

## Hors périmètre

- Relire la photo après coup : elle n'est jamais conservée, et ne le sera
  pas.
- Un modèle qui lit un squelette : rien d'installé ne le fait (mesuré). Si
  l'heuristique s'avère trop pauvre, c'est une phase de recherche à part.
- Le texte des gabarits eux-mêmes (`pose_presets/`) : une pose née d'un
  gabarit passe par le bouton.

## Critère de sortie

Une photo extraite donne une pose avec son texte, sans visage ni vêtement.
Un point déplacé la fait passer « à revoir », et le bouton en réécrit une
qui dit ce que le squelette montre. Choisir cette pose dans une scène au
champ vide remplit « En mots », et ne touche jamais un champ déjà écrit.
L'audit `audit-ux-ui` est vérifié en vrai : éditeur de pose et panneau Pose
du composeur, à 1440 et 1024.
