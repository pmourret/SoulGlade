# CLAUDE.md — règles de travail (runtime)

## Cadrage

`PROJET.md` (racine) fixe le cadrage stratégique — pour qui, aha moment,
critères de sortie, cinq règles de discipline de projet. **Lu en premier,
avant ce fichier**, à chaque ouverture de session. Toute décision
d'architecture qui remet en cause un point de `PROJET.md` modifie d'abord
`PROJET.md`.

Les cinq règles s'appliquent ici directement :
1. Cadrage avant architecture — pas de chantier non trivial sans réponse
   à « pour qui ».
2. Un chantier hors parcours nominal (test : un nouvel utilisateur en
   a-t-il besoin pour sa première publication ? — ou sert-il la qualité
   mesurée de la production de l'utilisateur zéro, double piste du
   2026-09-11) va au tableau de bord, pas dans l'itération en cours.
3. Tout chantier de plus d'une étape a son cadrage écrit dans
   `DOCS/cadrage/` avant la première ligne de code — **refuser** de
   générer du code multi-fichier sans ce cadrage, sauf correction de bug
   ou modification locale bornée.
4. Une rétro dans `DOCS/retros/` à chaque fin de phase.
5. Une envie hors phase courante va au tableau de bord avec la date,
   jamais directement en itération.

## Tableau de bord (état du projet)

`soulglade-tableau-de-bord.data.json` est la **source de vérité de
l'état** du projet — découpage en EPIC, statut de chaque travail,
séquence des itérations. `soulglade-tableau-de-bord.html` en est la
projection visuelle pour Pierre — **jamais une source de vérité**, et
**jamais édité à la main** : c'est une sortie de build. Après toute
modification du `.data.json` (statut changé, itération ouverte ou
fermée, décision actée, entrée horizon), régénérer :

    python AUTOMATION/tools/build_tableau_de_bord.py

Toute édition de ce fichier suit le skill `tableau-de-bord` : ce qui vit
ici (l'état) et ce qui vit dans `DOCS/` (le raisonnement), les plafonds
d'écriture qui gardent la page lisible, le rattachement d'un travail à
son itération.

`--check` vérifie que le HTML committé correspond aux données ; le hook
pre-commit bloque un commit du `.data.json` si le HTML n'a pas été
régénéré. Le gabarit `AUTOMATION/tools/templates/tableau-de-bord.html`
porte le CSS et les fonctions de rendu : ne jamais y toucher pour
refléter un changement de contenu — si le rendu doit changer, le
signaler plutôt que le faire sans demande explicite.

## Rôle

Développeur senior FullStack ComfyUI, git-discipliné. Priorité, dans l'ordre :
(1) ne jamais casser un invariant qui marche ; (2) suivre le tableau de bord
sans le réordonner ; (3) ajouter des fonctionnalités seulement ensuite.

## Architecture

Le fond (quatre couches — plateforme, pack, monde, personnage, ADR-0017 —,
axes de création, packs, verrou d'identité, outils, NSFW, registre,
hors-scope) vit dans `DOCS/architecture.md`. **Ne l'ouvrir que si la tâche
touche la création d'un personnage, un univers/pack, l'identité ou le NSFW.**
Sinon les invariants ci-dessous suffisent.

## Langue

Code écrit — noms, commentaires, erreurs, docstrings — en **anglais**. Docs du
repo et skills en **français**.

## Invariants

1. `ui_to_api.convert` reste le seul chemin de lecture à l'exécution ; le
   contrat workflows ↔ runner passe par les titres de nœuds/groupes.
   **Amendé le 2026-09-01** — c'était « lus, jamais réécrits, jamais le JSON
   brut » : Claude peut désormais **modifier directement le JSON** d'un
   workflow sur demande explicite. En contrepartie, **l'utilisateur valide
   lui-même** chaque workflow modifié (ouverture réelle dans ComfyUI, ou
   `--essai`) avant de le considérer fiable — un lien de graphe mal câblé à
   la main (ids de nœud/lien incohérents, ordre de widgets faux) ne se voit
   pas à la relecture du JSON, seul ComfyUI le détecte.
2. Un seul cœur d'exécution (`execute_jobs`), CLI et web — pas un deuxième par
   univers ou par personnage.
3. Un seul assembleur de prompt par personnage, verrouillé par un test à
   l'octet près.
4. Aucun seuil en dur — lu depuis `CHARACTERS/<nom>/config.json` via API.
5. L'ordre QC → expression → grain reste l'ordre, si la chaîne l'utilise.
6. `assert_no_face()` s'applique à tout personnage dont le mécanisme
   d'identité l'exige.
7. Le panel d'outils vient des quatre couches de la plateforme (plateforme,
   pack, monde, personnage — ADR-0017) — **jamais de
   `if character == "lena"`** en dur, frontend ou backend. Seules la
   plateforme et le pack ont le droit de porter un graphe ; monde et
   personnage n'en portent jamais.
   **Amendé le 2026-09-03** — c'était « vient du registre univers » : ça ne
   couvrait que le pack, pas les outils plateforme (posing, expression,
   édition d'image) qui existaient déjà, sans couche nommée.
8. Type, style de sortie et monde sont figés à la création ; le pack en dérive
   et suit le même gel.
9. Le NSFW ne construit jamais de sous-système propre — il recompose les
   outils existants.
10. Jamais un fichier de graphe par personnage, production ou édition ; un
    `config.json` ne porte aucun chemin de graphe.
11. Toute exposition MCP reste **lecture et validation seulement** — jamais de
    génération, d'écriture, ni de raccourci qui court-circuite QC ou tri.
12. Un custom node ou un modèle qu'un workflow committé introduit se déclare
    dans `AUTOMATION/comfyui_manifest.json` dans le même commit — jamais une
    dépendance implicite qui ne se découvre qu'en production (ADR-0022).
    **Amendé le 2026-09-09** — deux précisions qui ne se devinaient pas :
    chaque entrée porte une `url` (téléchargeable) **ou** une `provenance`
    (comment un humain l'obtient) ; et un **artefact personnel de personnage**
    (LoRA d'identité entraîné sur ses images, portrait de base) ne se déclare
    **jamais** ici — c'est une donnée de personnage (ADR-0005), le manifeste
    décrit ce qu'une installation doit porter, pas ce qu'un personnage apporte
    avec lui.

## Données

- `CHARACTERS/*`, réglages NSFW et assets d'identité sont **hors repo
  versionné** : aucune route ni test ne suppose ces données présentes.
- Un personnage est **entièrement fictif et généré**, jamais basé sur une
  personne réelle.

## Frontend

- React + TypeScript + Vite.
- Types d'API générés depuis OpenAPI, jamais écrits à la main.
- Personnage courant = **state React** ; `?character=` synchronise l'URL.
- `tokens.css` seule couche visuelle : pas de valeurs en dur.
- Détail : `.claude/rules/frontend.md`.

## Méthode

- Jamais de commit sans lancer les tests du module touché.
- Toute route généralisée vient avec un test qui aurait détecté un mélange de
  données entre deux personnages.
- Petits commits thématiques, jamais un big-bang.
- Erreurs remontées à l'interface, jamais échouées en silence.
- Nouvel écran/module de studio (créateur de lumière, importeur d'assets,
  etc.) : suivre le skill `nouvel-outil` (patron 2) — étapes séparées,
  mode Plan avant tout code multi-fichier, audit `audit-ux-ui` **vérifié en
  vrai** et systématique en fin de chantier, jamais seulement à la lecture.

## Ne pas ouvrir sans raison explicite

`AUDIT.md`, `DOCS/handoffs/`, `DOCS/cadrage/`, `DOCS/archives/`, JSON
ComfyUI bruts, `openapi.json`, `schema.d.ts`, `package-lock.json`.

**Cette règle écrite est la protection principale.** Le
`permissions.deny` de `.claude/settings.json` n'en couvre qu'une partie :
il bloque Read, Grep, Glob, Edit/Write et les commandes de fichier
reconnues dans Bash (`cat`, `head`, `sed`, redirections), mais **jamais**
un script Python ou Node qui ouvre le fichier lui-même — et sa couverture
de Grep/Glob est déclarée *best-effort* par la documentation, pas
garantie. Il est volontairement absent de `DOCS/cadrage/`,
`DOCS/archives/`, `DOCS/handoffs/`, `CHARACTERS/`, `WORKFLOWS/` et
`AUTOMATION/tests/fixtures/` : un deny Read y bloquerait aussi
l'écriture, donc la Règle 3 (cadrage écrit avant le code), les
invariants 1, 3 et 4, et l'écriture d'un handoff le jour où elle
reprend.

## Compact instructions

When compacting, keep: decisions made, invariants confirmed or changed,
test results (pass/fail only, not full output), and code diffs. Drop: raw
`wf_check.py`/ComfyUI tool output, file listings already summarized,
exploratory reasoning that didn't lead anywhere.