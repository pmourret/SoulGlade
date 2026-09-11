# Maestro (Blizaine) — source d'inspiration

Source : https://github.com/Blizaine/Maestro, relevé le 10/09/2026 à la
lecture du README, plus les fichiers de lanceur de l'installation locale
`G:/pinokio/api/Maestro.git`. L'application elle-même n'a pas été lancée :
tout ce qui touche à son comportement est déclaratif, à revérifier avant de
s'appuyer dessus. `H:\Wan2GP` est présent sur le disque, et c'est la base
technique que Maestro déclare reprendre.

## Ce que c'est

Studio créatif local tout-en-un : génération image/vidéo/audio, LLM local
(llama-server), et un éditeur timeline multi-piste pour le montage final.
Son argument principal est le « Director Mode » : un prompt unique planifie
un clip entier — découpage en plans, script, images de continuité — puis
lance les générations.

## Les quatre points qui recoupent des sujets déjà ouverts ici

1. **Installation des outils tiers par Pinokio.** Maestro ne demande pas à
   l'utilisateur d'installer ComfyUI, un environnement Python ou des
   modèles : il se pose par un lanceur tiers qui porte les dépendances.
   C'est exactement le problème de l'entrée d'horizon « Embarquer les outils
   tiers dans le produit » (E10), et une réponse possible qui n'était pas
   au catalogue jusqu'ici.

2. **Navigateur de LoRA intégré.** Recherche CivitAI, installation en un
   clic, détection des mises à jour, dans l'application. À rapprocher de
   « Atelier d'entraînement intégré » : ici c'est la consommation de LoRA
   qui est intégrée, pas leur entraînement, et c'est la moitié la moins
   chère du chemin.

3. **Personnage portable en un fichier.** Les « RefMods » sont des
   `.maestro.safetensors` qui embarquent l'identité visuelle et la voix.
   SoulGlade tient ses personnages hors dépôt (ADR-0005) sous forme de
   dossier `CHARACTERS/<nom>/` ; l'idée d'un artefact unique transportable
   pose la question de l'export d'un personnage, jamais tranchée.

4. **Gestionnaire de stockage.** Détection des modèles dupliqués et
   nettoyage. Le manifeste (`AUTOMATION/comfyui_manifest.json`, ADR-0022)
   décrit ce qu'une installation doit porter ; il ne dit rien de ce qu'elle
   porte en trop.

## Ce qui ne transfère pas

Le Director Mode et l'éditeur timeline visent le film et le clip musical :
un axe produit que `PROJET.md` ne porte pas. Le catalogue de modèles vidéo
(LTX, MiniMax, Hunyuan) est hors sujet pour la V1. Et un studio en Node.js
qui embarque son propre pipeline n'est pas un patron d'architecture pour
SoulGlade, qui parle à ComfyUI par HTTP et le garde externe.
