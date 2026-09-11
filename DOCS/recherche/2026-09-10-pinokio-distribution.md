# Pinokio — le système de distribution, comme piste pour E10

Relevé le 10/09/2026 sur l'installation locale `G:\pinokio` (runtime dans
`prototype/`, 87 exemples de lanceurs dans `prototype/system/examples/`,
documentation `PINOKIO.md` et `PTERM.md`) et sur le lanceur réel de Maestro
(`G:\pinokio\api\Maestro.git`, voir la note du même jour). Rien n'a été
installé ni testé pour ce relevé : c'est de la lecture. Licence non
constatée, à vérifier avant toute décision.

## Le mécanisme

Un lanceur est un dépôt git ordinaire. À sa racine, six fichiers de script ;
le code de l'application vit dans `app/`, séparé et publiable seul :

| Fichier | Rôle |
|---|---|
| `install.js` | pose les dépendances, une fois |
| `start.js` | lance le serveur, `daemon: true` |
| `update.js` | met à jour scripts et application |
| `reset.js` | efface ce qu'`install.js` a posé |
| `pinokio.js` | la barre latérale, rendue dynamiquement selon l'état |
| `pinokio.json` | métadonnées, icône, limites de plateforme |

Un script est une liste d'étapes déclaratives, pas un shell : `shell.run`
(avec `venv`, `env`, `path`, et un `on` qui rend la main sur une expression
régulière), `fs.download`, `hf.download`, `json.set`, `script.start`,
`input`, `filepicker`, `notify`. L'installation se distribue par URI git :
l'utilisateur colle une adresse, Pinokio clone et exécute `install.js`.

Quatre choses que le runtime porte, et qui sont précisément ce qu'un
installeur maison devrait écrire lui-même :

1. **Les gestionnaires de paquets sont déjà là** : `uv`, `npm`, `conda`,
   `git`, `bun`, `brew`. Un script ne les installe pas, il les appelle.
2. **`requires: { bundle: "ai" }`** déclenche les prérequis machine avant le
   script — CUDA sur NVIDIA, CLI Hugging Face. Un `torch.js` fourni installe
   torch, xformers, triton, sageattention de façon multiplateforme.
3. **Les ports et l'URL** : `{{port}}` donne le prochain port libre, et
   l'URL du serveur se capture au vol dans la sortie du terminal par une
   regex, puis devient l'onglet « ouvrir l'interface ».
4. **Les journaux** sont rangés par script (`logs/api/`, `logs/shell/`), ce
   qui rend une installation ratée diagnosticable à distance.

Le lanceur de Maestro montre le patron complet en vrai : refus explicite si
le GPU n'est pas NVIDIA, contrôle de la version du pilote avant d'installer
un runtime CUDA 13, puis `uv pip install -r requirements.txt` et `torch.js`.

## Pourquoi c'est une piste sérieuse ici

L'entrée d'horizon « Embarquer les outils tiers dans le produit » (E10) dit
que ComfyUI, kohya_ss et ce qui suivra sont aujourd'hui des prérequis que
l'utilisateur installe lui-même, et que « installation de bout en bout
vérifiée par un tiers » n'a jamais été faite. Deux atouts propres à
SoulGlade :

- `AUTOMATION/comfyui_manifest.json` (ADR-0022) est déjà la liste de ce
  qu'une installation doit porter, avec `url` ou `provenance` par entrée.
  C'est l'entrée exacte d'un `install.js` : les entrées à `url` deviennent
  des `fs.download`/`hf.download`, celles à `provenance` un `notify` qui
  demande le geste humain.
- SoulGlade parle à ComfyUI par HTTP (`COMFY_URL`). Un lanceur qui installe
  et démarre ComfyUI ne touche donc à aucun invariant : il pose un serveur
  et une adresse, rien de plus.

## Ce que ça coûte, et qui n'est pas tranché

Distribuer par Pinokio, c'est faire du produit l'invité d'un runtime tiers :
l'arborescence d'installation, la mise à jour et le diagnostic passent par
lui. La question n'est pas technique mais de cadrage — quel est le mode
d'installation du produit V1 — et `PROJET.md` ne la tranche pas. Cette note
n'ouvre rien : elle met un candidat nommé en face d'une entrée d'horizon qui
n'en avait aucun.
