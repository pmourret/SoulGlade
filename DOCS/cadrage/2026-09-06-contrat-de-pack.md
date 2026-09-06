# Contrat de pack — cadrage

Session du 6 septembre 2026. Trois questions (Règle 3, `PROJET.md`).

## À quoi ça sert

Écrire noir sur blanc ce qu'un monde doit contenir pour être « prêt à
vendre », **à partir du code réel et des deux mondes existants** — pas
du cadrage J8 qui anticipait certaines choses inexactement. Préalable à
toute automatisation (validation, scaffolding) et à tout premier monde
vendable.

## Hors périmètre

- L'outillage (validateur, scaffolder, world/pack builder) — ici le
  contrat, pas le code qui le vérifie.
- Le multi-style par monde (un monde = une peau, §4 du cadrage J8).
- Le graphe d'édition SDXL manquant (décision P2.4, `BACKLOG.md`).
- Le contenu réel d'un premier monde vendable (§5 cadrage J8 : travail
  non automatisable, vient après le contrat).

## Critère de sortie

Un schéma normatif validé par toi, machine-lisible, qui distingue « prêt
à vendre » de « placeholder ». Appliqué aux deux mondes existants.

---

## Ce qu'est réellement un monde — vu depuis le code, pas depuis le PDF

Le cadrage J8 (§3) décrivait le contrat d'un monde comme portant
*"checkpoint, LoRA de style, fragments de prompt"*. L'inspection du code
réel contredit ou nuance chacun des trois.

### Le checkpoint ne vit pas dans le monde

Le checkpoint vit dans le **pack technique**, pas dans le monde :
`PACKS/<id>/universe.json` → `output_styles.<style>.checkpoint`. C'est
le pack qui swap un checkpoint par style de rendu (réaliste, fantastique,
manga…). Le monde n'y a pas accès, et n'a pas à y avoir accès — il
déclare juste sa compatibilité avec la famille de modèle du pack
(`compatible_families`).

### Le LoRA n'est pas le seul mécanisme d'identité visuelle

Le code montre deux mécanismes distincts pour l'identité d'un
**personnage** :

- `AUTOMATION/identity/lora_sdxl.py` (Abyssiaelle, SDXL) — un LoRA
  entraîné (`abyss1a_v1.safetensors`) + IPAdapter FaceID (neutralisé à
  0.0 après mesure, le LoRA porte seul l'identité réelle)
- `AUTOMATION/identity/pulid_flux.py` (Léna, flux) — **aucun LoRA** : une
  image de référence (`base_gelee`) alimente un nœud PuLID, sans aucun
  entraînement

La distinction est structurelle (famille de modèle → mécanisme
d'identité), pas un choix de monde. **Mais le même raisonnement
s'applique au style du monde** : un monde SDXL utilisera
vraisemblablement un LoRA de style, un monde flux quelque chose de
différent. Le champ `assets.lora` du schéma monde actuel ne capture
qu'un seul des deux cas.

### Les assets monde ne sont pas consommés par le runner

`AUTOMATION/worlds.py`, ligne 28, en toutes lettres :
> *"le cablage [des assets] dans le runner est explicitement hors
> perimetre (ROADMAP)"*

Concrètement : `worlds.assets(wid)` existe, renvoie `{lora,
lora_strength, prompt_add}`, et seulement `prompt_add` est lu — par
`base_portrait.py` (génération du portrait de base au wizard), **pas
par le runner de production**. Ni `runner/comfy.py` ni `runner/prompt.py`
ne consomment `assets.lora` ni `assets.lora_strength`.

Autrement dit : même si un monde portait un LoRA de style correctement
renseigné, **personne ne le chargerait dans le graphe** — le câblage
n'a jamais été écrit.

### Ce qui EST consommé en production

Depuis `runner/prompt.py` et `worlds.py`, ce que le runner utilise
réellement d'un monde :

| Consommé par | Quoi | Où |
| --- | --- | --- |
| `runner/prompt.py` → `load_creative()` | `intentions[]` et `tones[]` fusionnés avec les surcharges personnage | `WORLDS/<id>.json` |
| `runner/prompt.py` → `merge_scene()` (indirectement, via la banque) | `places[]` — cadre hérité en direct par toute scène qui porte un `world_ref` | `WORLDS/<id>.json` |
| `base_portrait.py` → `_base_prompt()` | `assets.prompt_add` — ajouté au prompt du portrait de base (wizard seulement) | `WORLDS/<id>.json` |
| `base_portrait.py` → `_check_choices()` | `compatible_families` — vérifié compatible avec la famille du pack | `WORLDS/<id>.json` |
| Non consommé | `assets.lora`, `assets.lora_strength` | Déclarés mais jamais injectés |

## Ce que le cadrage J8 avait juste

- La règle de propriété du graphe : un monde ne porte jamais de graphe,
  vérifié dans le code (aucun champ `graph` nulle part dans `WORLDS/`).
- L'héritage monde→personnage (J8.3, ADR-0019) : fonctionne, testé,
  `merge_creative_vocab()` et `merge_scene()` sont le cœur vivant.
- La résolution `resolve(type, style)` qui vérifie la compatibilité
  monde/famille : en place, testée, jamais de repli silencieux.

## Ce qu'un monde vendable doit donc contenir — proposition

Fondé sur ce qui est réellement consommé, pas sur ce qui est prévu :

### Obligatoire pour « prêt à vendre »

1. **`places[]`** — catalogue de lieux avec `intention` + `prompt`.
   C'est l'essentiel de la valeur : un monde acheté sans lieux oblige
   l'acheteur à tout ressaisir. Minimum suffisant à trancher : assez de
   lieux pour couvrir les intentions que le monde déclare (chaque
   intention a au moins un lieu).
2. **`intentions[]`** — catégories créatives avec defaults et
   `prompt_add`. C'est le squelette de l'expérience de création.
3. **`tones[]`** — ambiances avec `prompt_add` et plages `expression`.
   Les plages doivent être calibrées contre un personnage réel du monde,
   pas juste posées au jugé.
4. **`tone`** — ambiance textuelle globale du monde (une phrase).
5. **`compatible_families`** — vérification de compatibilité.

### Nécessaire mais pas encore câblé (dette technique explicite)

6. **Différenciateur visuel** — le champ `assets` doit être étendu pour
   représenter le mécanisme réel du monde :
   - Monde SDXL : LoRA de style (champ `lora` existant, mais non
     consommé par le runner)
   - Monde flux : mécanisme à définir (image de référence de style ?
     IP-Adapter style ? `prompt_add` seul ?)
   - Le câblage dans le runner (charger le LoRA / l'image de référence
     dans le graphe) est un chantier technique à part entière, pas un
     bout de JSON à remplir

### Indicatif / optionnel

7. **`suggested_styles`** — filtre wizard, pas consommé en production.
8. **`ui_skin_token`** — jeton de peau UI, déclaratif.
9. **`assets.prompt_add`** — uniquement consommé au wizard
   (portrait de base), pas en production courante.

## `measured` — proposition détaillée

`measured` est posé par l'utilisateur via le world/pack builder (pas
automatique). Granularité proposée :

```json
{
  "readiness": {
    "places": false,
    "tones": false,
    "style": false
  }
}
```

- **`places: true`** — chaque lieu a été généré au moins une fois, rendu
  jugé conforme au prompt par le créateur du monde.
- **`tones: true`** — les plages `expression` ont été calibrées contre
  un personnage réel de ce monde (pas juste copiées d'un autre monde).
- **`style: true`** — le différenciateur visuel (LoRA ou autre) est
  renseigné ET le runner sait le charger (câblage fait). En V1, aucun
  monde ne peut passer ce critère tant que le câblage n'existe pas — et
  c'est le signal honnête qu'il envoie.

`intentions` n'a pas son propre flag : c'est du texte structuré, rien à
calibrer — si les `places` couvrent toutes les intentions, les
intentions sont validées de fait.

Un monde avec `places: true` + `tones: true` + `style: false` est un
monde **structurellement complet mais visuellement générique** — vendable
si le créateur assume que le style repose uniquement sur le prompt (cas
`slow-life` aujourd'hui), pas vendable s'il prétend une esthétique propre
sans la porter techniquement.

## État des deux mondes existants, évalué honnêtement

| | `slow-life` (Léna) | `terres-sauvages` (Abyssiaelle) |
| --- | --- | --- |
| `places` | 17 lieux, couvrant 9 intentions — **riche** | 3 lieux, 2 intentions — **squelettique** |
| `tones` | 5 tons, plages `expression` calibrées (24/08) | 2 tons, aucune plage `expression` |
| `style` | Aucun différenciateur + câblage absent | `_notes` dit « dette déclarée » + câblage absent |
| Verdict | places ✅ tones ✅ style ❌ | places ❌ tones ❌ style ❌ |

`slow-life` est le seul des deux qui pourrait être vendu *en l'état* —
à condition d'assumer que le style est porté uniquement par le prompt
(le `prompt_add` de chaque lieu/ton/intention, sans LoRA ni image de
référence de style). Ce n'est pas un monde à LoRA manquant, c'est un
monde dont la différenciation repose sur le cadrage textuel. Ça peut
être un produit valide si c'est dit clairement, pas si c'est un trou
masqué.

## Découpage

- **C1 — Diagnostic** (fait ci-dessus) : contrat réel vs anticipé,
  écarts trouvés et documentés.
- **C2 — Trancher le schéma normatif** (fait, `DOCS/adr/0023-readiness-mondes.md`) :
  répondre à la question de granularité de `readiness` ci-dessus, écrire
  le schéma final, l'appliquer aux deux mondes existants (ajouter le
  champ structuré, retirer de `_notes` ce qui est désormais porté par un
  champ).
- **C3 — Câbler les assets monde dans le runner** : chantier technique
  séparé, prérequis pour que `style: true` soit atteignable. Entre en
  `BACKLOG.md` comme chantier à cadrer.
- **C4 — World/pack builder** : outillage qui permet de poser
  `readiness` (et à terme de valider/scaffolder). Entre en `BACKLOG.md`.
