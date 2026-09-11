# Soulglade

> Studio de création de personnages IA construit au-dessus de ComfyUI —
> orchestration multi-personnage en quatre couches (plateforme, pack,
> monde, personnage), pensée comme une couche supplémentaire au-dessus de
> ComfyUI plutôt qu'un remplacement.

## Statut

Projet personnel, en développement actif. Voir
[`soulglade-tableau-de-bord.html`](soulglade-tableau-de-bord.html) pour
l'avancement (V1 en cours).

## Ce que c'est

Une plateforme qui gère plusieurs personnages IA, chacun avec un outil de
travail complet plutôt qu'un pipeline à usage unique. Elle s'organise en
quatre couches, découpées par une règle : qui a le droit de porter un
graphe ComfyUI (`DOCS/adr/0017-quatre-couches-plateforme-pack-monde-personnage.md`).

- **Plateforme** — capacités agnostiques du modèle, appliquées à une image
  finie : upscale, banc de comparaison, détection des mains. Porte des
  graphes.
- **Pack** — capacités liées à une famille de modèle : production, verrou
  d'identité, édition. Porte des graphes. En place :
  `instagram-influenceur` (Flux) et `rpg-personnage` (SDXL).
- **Monde** — données pures, aucun graphe : lieux, intentions, tons, style.
  En place : `slow-life` et `terres-sauvages`.
- **Personnage** — instance d'un pack et d'un monde, avec son identité et
  ses seuils mesurés. Hors dépôt.

D'autres packs (art pur) et un monde RPG complet sont à l'horizon — voir
le tableau de bord.

## Structure du repo

```
CHARACTERS/<nom>/    # données de chaque personnage — non versionnées
PLATFORM/            # carte des capacités de plateforme
PACKS/<nom>/         # capacités et panel d'outils par pack
WORLDS/<nom>.json    # catalogues et style par monde
WORKFLOWS/           # graphes ComfyUI (plateforme et packs)
AUTOMATION/          # moteur partagé : exécution, conversion de
                     # workflows, verrous d'identité, base
DOCS/
  adr/               # historique des décisions d'architecture
  cadrage/           # sessions de cadrage brutes (archivé)
.claude/
  skills/            # connaissances de domaine pour Claude Code
CLAUDE.md                            # règles pour Claude Code
soulglade-tableau-de-bord.data.json  # état du projet : EPIC, statuts, itérations
```

## Prérequis

Une instance ComfyUI locale avec les nœuds custom listés dans
`.claude/skills/workflow-comfyui/references/modeles-par-pack.md`. GPU
recommandé : 16 Go de VRAM ou plus (développé sur RTX 4070 Ti Super).

**Node.js 20+** pour construire l'interface. C'est le seul prérequis en
dehors de ComfyUI ; un lanceur s'en chargera à terme.

## Démarrer

Le studio est **portable** : tout ce que la chaîne d'outils télécharge
reste dans le répertoire du dépôt (`.toolchain/`), jamais sous
`%APPDATA%`. Déplacer le dossier déplace le studio entier.

```
python AUTOMATION/tools/toolchain.py install   # dépendances de l'interface
python AUTOMATION/tools/toolchain.py build     # bundle de l'interface
python AUTOMATION/web/app.py                   # http://127.0.0.1:8189
```

Documentation d'API (Swagger) sur `/docs`.

## Documentation

| Besoin | Où |
|---|---|
| Comprendre les règles actuelles de la plateforme | `CLAUDE.md` |
| Voir où en est le développement | `soulglade-tableau-de-bord.html` |
| Comprendre pourquoi une décision structurante a été prise | `DOCS/adr/` |
| Retrouver la réflexion d'origine, session par session | `DOCS/cadrage/` |
| Connaissances de domaine (ComfyUI, conventions de code) | `.claude/skills/` |

## Contenu

Les personnages de cette plateforme sont des personnages fictifs
entièrement générés — jamais basés sur une personne réelle. Chaque
personnage peut activer un mode de contenu mature, **désactivé par
défaut**, à activer explicitement dans le paramétrage.

## Contribuer

Projet solo. Le dépôt est public ; les données de personnage restent
hors du dépôt versionné (`DOCS/adr/0005-separation-donnees-code.md`).

Les correctifs et suggestions sont les bienvenus en issue. En revanche
aucune contribution de code n'est fusionnée tant qu'un accord de
cession de droits n'existe pas — le modèle économique du projet repose
sur une propriété exclusive du code (`DOCS/adr/0026-licence-agpl-3.md`).

## Licence

GNU Affero General Public License v3.0 — voir [`LICENSE`](LICENSE).

Un tiers qui héberge SoulGlade en service accessible sur un réseau doit
en publier le code source, modifications comprises (section 13 de
l'AGPL). Les packs de monde, qui sont des données et non du code, ne
sont pas couverts par ce copyleft.
