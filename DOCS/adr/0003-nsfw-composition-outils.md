# ADR-0003 : Le NSFW est une composition d'outils existants, pas un sous-système

## Statut

Accepté (2026-08-26)

## Contexte

Chez Léna, la branche NSFW existait comme un pipeline semi-séparé
(`nsfw_batch.py`, onglet dédié). En généralisant à plusieurs univers, le
risque était de reconstruire un sous-système NSFW dédié pour chacun.

## Décision

Le NSFW est un flux manuel en quatre étapes — génération → sélection
manuelle de l'image par l'utilisateur → reprise NSFW via l'outil de
modification live par IA → retouche via l'éditeur d'image — recomposé à
partir de deux outils globaux déjà prévus, sans aucun outil dédié.
Réglage dans le paramétrage de l'app, **off par défaut**.

## Alternatives envisagées

- **Génération NSFW native dans chaque outil dès sa conception** — écarté :
  coûteux à reconstruire pour chaque univers et chaque outil.
- **Garder une branche parallèle dédiée par univers**, comme pour Léna
  aujourd'hui — écarté : duplique un sous-système entier à chaque univers
  ajouté, alors que le flux réel ne varie pas.

## Conséquences

Ajouter un univers n'implique aucun travail NSFW spécifique tant que les
deux outils globaux existent pour lui. Aucun nouvel outil dédié au NSFW
n'est jamais nécessaire.

## Amendement du 2026-09-10 — la scène NSFW native redevient possible

Pierre, en cadrant la capacité NSFW : « garder la possibilité de repartir
d'une même scène, mais **construire une scène NSFW doit être également
possible** ».

**Ce que cet ADR avait écarté, il l'écarte toujours.** L'alternative rejetée
était « génération NSFW native **dans chaque outil** dès sa conception »,
pour un motif qui n'a pas bougé : elle demandait de reconstruire le NSFW
outil par outil et univers par univers. Ce n'est pas ce qui est demandé ici.

**Ce qui est demandé n'avait pas été considéré** : un palier de plus sur le
pipeline `produce` **déjà existant** — même `execute_jobs` (invariant 2),
mêmes rôles de graphe, même verrou d'identité, seuls la garde-robe et le
`prompt_add` changent. C'est de la recomposition, pas un sous-système :
l'invariant 9 tient.

La décision devient donc : **le NSFW a deux voies, et l'édition reste la
première.**

- **Voie 1, l'édition** (inchangée) : générer en SFW, choisir l'image, y
  appliquer une instruction, le verrou re-rend le visage. C'est celle qui
  tourne, et elle garde son avantage mesuré — +0,028 d'identité, parce que le
  visage est re-rendu depuis la base gelée.
- **Voie 2, la scène native** : un palier d'intensité dont le `pipeline` vaut
  `produce`. Elle n'existe pas encore.

### Ce que cet amendement ne tranche pas

**Quel modèle rend la voie 2 possible.** C'est la vraie question, et elle
n'est pas de pipeline : le checkpoint Flux de Léna n'est pas fait pour ça,
et le pack déclare déjà `Qwen-Rapid-AIO-NSFW` pour la voie 1. Le palier natif
demande-t-il ce modèle, un LoRA, ou un troisième ? Non tranché.

**Et son revers, qui est indissociable.** Aujourd'hui un nu involontaire en
SFW est quasi impossible *parce que* rien n'est natif : le checkpoint n'est
jamais sollicité pour ça et la garde-robe couvre le corps palier par palier.
Ouvrir la voie 2 ouvre mécaniquement la voie accidentelle. Les deux se
décident ensemble, jamais l'une sans l'autre.

Cadrage : `DOCS/cadrage/2026-09-10-capacite-nsfw.md`.
