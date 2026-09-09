# Le manifeste dit comment obtenir chaque modèle

Cadrage ouvert le 2026-09-09, après la clôture de T1 (logs). Chantier E10
« Exploitation & installation », item au statut `dette` : « URLs de
modèles incomplètes au manifeste — une quinzaine d'entrées sans URL
vérifiée ». Trois questions comme tout cadrage (règle 3, `PROJET.md`).

## L'état réel, relu le 09/09 dans le manifeste, sur le disque et dans les workflows

1. **17 entrées sur 27 n'ont pas d'URL.** `AUTOMATION/comfyui_manifest.json`.
2. **Rien de tout ça ne bloque Pierre.** `comfy_provision --check` sur sa
   machine ne signale qu'un seul modèle absent (`flux1-krea-dev-fp8`,
   expérimental). Les 16 autres sont physiquement là depuis des mois.
   **Cette dette ne coûte rien à celui qui l'a créée et tout à celui qui
   installe** — c'est exactement le job d'E10, et c'est pour ça qu'elle
   n'a jamais fait mal.
3. **Le provisionneur les avale en silence.** `ensure_models` empile les
   noms de fichiers sans URL et rend une ligne : « N modèle(s)
   manquant(s) sans URL dans le manifeste ». Un nom de fichier n'est pas
   une instruction : le tiers qui installe reçoit une liste et aucun
   endroit où aller.
4. **Huit sont téléchargeables et personne n'était allé voir.** Vérifiées
   le 09/09, et recoupées à la taille du fichier réellement présent sur
   le disque de Pierre — c'est ce recoupement qui a évité une erreur :
   `controlnet-canny-sdxl-1.0` fait 2,50 Go ici, donc c'est la variante
   **fp16** du dépôt `diffusers`, pas le fichier de 5 Go qu'on aurait
   déclaré en lisant le nom du dépôt.
5. **Quatre ne seront jamais téléchargeables automatiquement.**
   `juggernautXL_ragnarok` et `intorealismUltra` sont sur CivitAI (compte
   requis, pas d'URL directe stable) ; ils sont dans les graphes de
   production des DEUX packs livrés. Le NSFW `Qwen-Rapid-AIO-NSFW-v23`,
   lui, est bien sur HuggingFace — trouvé le 09/09.
6. **Deux entrées ne sont pas des modèles tiers du tout.**
   `abyss1a_v1.safetensors` est le LoRA d'identité d'Abyssiaelle,
   entraîné localement le 20/07/2026 — donc une donnée de personnage
   (ADR-0005, hors dépôt). `Realistic_Adult_Flux_10-000001.safetensors`
   porte un nom de sortie d'entraînement kohya (`_10-000001`), ne
   correspond à aucun modèle publié retrouvé, et **il est chargé par le
   graphe de production de Léna**. Aucune URL ne les fera exister chez un
   tiers.
7. **Cinq entrées sont du WIP vidéo LTX-2.3**, hors V1 (`PROJET.md`), et
   ce sont des repacks : le dépôt officiel `Lightricks/LTX-2.3` porte
   bien l'upscaler spatial 1.1 (996 Mo, la taille exacte du fichier
   local) mais ni le `22b-dev-fp8`, ni le vocoder, ni le LoRA distillé
   `dynamic_fro09` que l'installation contient.

## À quoi ça sert, et pour qui

**Pour le tiers qui installe, uniquement.** C'est le seul bénéficiaire, et
c'est la définition d'E10 : « que l'outil démarre chez quelqu'un qui
n'est pas toi ». Le critère de sortie V1 demande un parcours exécutable
« sans intervention extérieure » ; aujourd'hui, un utilisateur qui suit
l'installation obtient un ComfyUI incapable de charger le graphe de l'un
ou l'autre pack, et une liste de noms de fichiers pour tout secours.

**Ce n'est pas « trouver 17 URLs ».** C'est la reformulation qui décide
du reste : la question n'est pas *quelle URL*, mais **comment ce fichier
s'obtient** — automatiquement, à la main sur une page, ou pas du tout
parce qu'il n'est pas distribuable. Poser la question comme une chasse
aux URLs est ce qui a laissé la dette ouverte : elle n'a pas de fin
atteignable, puisque CivitAI et un LoRA privé n'en auront jamais.

## Ce qui est fait

1. **Un champ `source` dans le manifeste**, texte libre, à côté d'`url`.
   Il dit à un humain comment obtenir le fichier quand la machine ne
   peut pas : page CivitAI et compte requis, artefact entraîné
   localement, repack introuvable. **Règle totale, sans exception :
   toute entrée porte `url` OU `source`.** C'est ce qui rend la dette
   fermable — un `url: null` isolé ne se distingue pas d'un oubli, un
   `source` renseigné dit que la question a été posée et tranchée.
2. **Les URLs vérifiables sont vérifiées et posées** (huit), recoupées à
   la taille du fichier local quand il est présent.
3. **Le provisionneur devient actionnable** : `ensure_models` et
   `--check` rendent `nom -> source` au lieu d'une liste de noms nus.
   Aucun changement de comportement — rien de plus n'est téléchargé,
   rien de moins.
4. **Un test verrouille la règle totale** dans `test_comfy_provision.py`,
   qui teste déjà ce module : une entrée ajoutée demain sans `url` ni
   `source` fait échouer le test. C'est la seule chose qui empêche la
   dette de se reformer entrée par entrée.

## Hors périmètre

- **Télécharger depuis CivitAI** (jeton d'API, conditions d'usage,
  fichiers versionnés qui bougent) : le manifeste dit où aller, il ne
  s'authentifie pas.
- **Réparer les deux graphes de production** qui chargent un artefact
  local (LoRA de Léna, LoRA d'Abyssiaelle). Le manifeste le NOMME comme
  tel ; le corriger est un chantier de pack, pas de manifeste, et il
  monte au tableau de bord avec sa raison.
- **Chasser les repacks LTX-2.3.** Vidéo hors V1 : `source` pointe le
  dépôt officiel et dit ce qui n'y est pas.
- **Vérifier les sommes de contrôle** des fichiers téléchargés. Une autre
  dette, réelle, qui n'est pas celle-ci.
- **Le health-check plateforme** et **l'installation vérifiée par un
  tiers**, les deux autres items d'E10 : ils viennent après, et le
  second ne veut rien dire tant que celui-ci n'est pas fait.

## Critère de sortie

- Les 27 entrées portent `url` ou `source`, et le test le vérifie.
- `comfy_provision --check` sur une machine où il manque un modèle non
  téléchargeable rend une ligne où aller, pas un nom de fichier nu.
- Aucune URL posée sans avoir été vérifiée le jour même — et quand le
  fichier existe sur le disque, sa taille recoupe celle de la source.
- Les deux artefacts locaux sont nommés comme tels dans le manifeste, et
  la question qu'ils posent aux graphes de production est inscrite au
  tableau de bord au lieu de rester dans une `note`.

## Note d'implémentation, le même jour

**Les huit URLs ont été vérifiées deux fois, et la seconde a servi.** Après
les avoir relevées dans les arborescences HuggingFace, une requête `HEAD`
sur chacune a comparé le `Content-Length` distant à la taille du fichier
installé. Sept concordaient à l'octet. La huitième,
`krea2_warmpastel.safetensors`, rendait **404** : ce LoRA de style a été
retiré de `main` depuis que Pierre l'a téléchargé (le dépôt n'y publie plus
que `darkbrush`, `dotmatrix`, `retroanime`…). Elle est donc **épinglée à un
commit** — `67751d8`, qui le sert encore à 469,29 Mo, la taille exacte du
fichier local — comme les `custom_nodes` le sont déjà.

C'est la démonstration que le critère « aucune URL posée sans avoir été
vérifiée » n'est pas décoratif : une URL plausible, lue dans un résultat de
recherche, était morte. Sans le `HEAD`, le manifeste aurait annoncé un
téléchargement qui échoue chez le premier tiers qui installe — exactement
la classe de problème que ce chantier corrige.

Le recoupement des tailles a payé une seconde fois, comme prévu au cadrage :
`controlnet-canny-sdxl-1.0` fait 2,50 Go, donc c'est la variante fp16 du
dépôt `diffusers`. Déclarer le fichier de 5 Go que le nom du dépôt suggère
aurait donné un téléchargement réussi et un modèle différent de celui sur
lequel les graphes ont été réglés — la pire des deux erreurs, parce qu'elle
ne se serait vue qu'à l'image.

Le script de vérification n'entre pas dans la suite de tests : il touche le
réseau, et un test qui dépend de HuggingFace échoue un jour où HuggingFace
tousse. Ce que le test verrouille, c'est la règle (`url` ou `provenance`) ;
la vérification réseau est un geste de session, à refaire le jour où on
ajoute une URL.

## L'arbitrage de Pierre, le même jour

Les deux entrées que le cadrage laissait ouvertes sont tranchées, et la
seconde change une règle du dépôt.

- **`Realistic_Adult_Flux_10-000001`** vient de **CivitAI RED**, la partie
  adulte du site. C'est l'explication des quatre recherches infructueuses :
  ce contenu n'est pas indexé. Il reste au manifeste — c'est un LoRA de
  **réalisme**, pas d'identité — avec une `provenance` qui dit où aller et
  que le compte est requis.
- **Le LoRA d'identité d'Abyssiaelle sort du manifeste**, et tout artefact
  personnel de personnage avec lui, y compris celui de Léna quand il
  existera. Le manifeste décrit ce qu'une **installation** doit porter, pas
  ce qu'un **personnage** apporte avec lui (ADR-0005). `CLAUDE.md`,
  invariant 12, est amendé de cette phrase.

Conséquence sur ce que ce cadrage appelait « une dette d'un autre ordre » :
il n'y en a pas deux, il n'y en a même pas une au sens où je l'avais écrit.
Ce qui reste est un **chantier déjà cadré**, et Pierre le nomme comme le
prochain : les deux points d'E2 — **centroïde évolutif** et **LoRA
d'identité par personnage** (`DOCS/cadrage/2026-09-09-lora-identite-par-
personnage.md`). L'entrée `dette` que j'avais ouverte au tableau de bord
est retirée : elle décrivait comme un défaut ce qui est une décision.
