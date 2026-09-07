# Budget de contexte Claude Code — outillage du dépôt

Session du 7 septembre 2026, après audit du dépôt : le démarrage nominal
d'une session Claude Code coûte ~39,7 k tokens avant la première
question, dont ~31 k de roadmap déjà livrée, et le garde-fou censé
exclure les gros fichiers (`.claudeignore`) n'est pas lu par Claude Code.

Six chantiers d'outillage. Trois questions (Règle 3, `PROJET.md`).

**Amendé le 2026-09-07** — c'était « ~34 k tokens […] dont ~26 k de
roadmap » : chiffre d'estimation, remplacé par le comptage réel
(`tiktoken` / `cl100k_base`) de la spécification d'implémentation,
39 734 tokens dont 35 841 pour `ROADMAP.md` seul.

Ce cadrage ne porte **aucune décision produit**. Rien ici ne touche les
quatre couches, les invariants de `CLAUDE.md`, ni un critère de sortie de
`PROJET.md` — c'est de l'outillage de développement. Par la Règle 2, il ne
va donc ni en jalon de `ROADMAP.md`, ni en `BACKLOG.md` : un utilisateur
qui installe Soulglade n'en a besoin à aucun moment.

## À quoi ça sert

Rendre le coût de contexte d'une session proportionnel au travail
demandé, et non à l'histoire accumulée du dépôt. Aujourd'hui trois
mécanismes le font dériver :

1. **De l'histoire close lue comme si elle était vivante.** `ROADMAP.md`
   pèse 120 Ko, dont 102 Ko (l. 6→1536) de V1 terminée le 2026-09-05.
   `CLAUDE.md` demande de suivre `ROADMAP.md` : ces 31 k tokens entrent
   dans presque toutes les sessions pour dire ce qui est déjà livré.
2. **Une protection fictive.** `.claudeignore` n'est pas un fichier que
   Claude Code lit — le produit ne l'a jamais supporté et le mécanisme
   documenté est `permissions.deny` dans `.claude/settings.json`. Tout ce
   que ce fichier prétend exclure (`AUDIT.md`, `DOCS/handoffs/`,
   `openapi.json`, `schema.d.ts`, `package-lock.json`, gros workflows) est
   en réalité atteignable par Read, Glob et Grep. `openapi.json` +
   `schema.d.ts` seuls représentent 456 Ko, soit ~110 k tokens exposés à
   un seul Grep large.
3. **Un filtre de sortie qui ne se déclenche jamais.**
   `.claude/hooks/filter-verbose-output.sh` a deux défauts vérifiés : son
   motif ne reconnaît pas les commandes réellement utilisées (tests lancés
   via `python_embeded` sur `AUTOMATION/tests/test_*.py`,
   `run_browser_tests.py`, builds Vite — il ne voit que `pytest` et
   `wf_check.py`) ; et il construit son JSON par interpolation de chaîne,
   donc produit du JSON invalide dès que la commande contient un
   guillemet, ce qui est le cas de toutes les commandes ComfyUI. Il est
   silencieusement inactif.

L'effet cumulé n'est pas seulement un coût : c'est la fréquence de
compaction. Une session qui démarre à 39,7 k tokens compacte plus tôt, et
chaque compaction perd du contexte de chantier — c'est ce qui limite
l'avancement, pas le prix.

### Les six chantiers

| # | Chantier | Ce que ça vise |
|---|---|---|
| 1 | Exclusion réelle | Remplacer `.claudeignore` par `permissions.deny` et supprimer le fichier mort |
| 2 | Roadmap vivante | Archiver V1, Phase 2, Phase 3 hors de `ROADMAP.md` |
| 3 | Fil conducteur généré | Produire le HTML depuis `ROADMAP.md` par script, plus jamais à la main |
| 4 | Hook réparé | Motif élargi, JSON construit par `jq`, résumé et code de sortie conservés |
| 5 | Générés hors dépôt | Sortir `openapi.json` et `schema.d.ts` du versionné |
| 6 | Skills allégés | Ramener les corps de SKILL.md sous ~5 Ko, détail en `references/` |

Ordre d'exécution : 1 et 2 d'abord (ils portent l'essentiel du gain),
puis 4 et 5, puis 3 et 6. Chacun est indépendant et livrable seul.

## Hors périmètre

- **Toucher au contenu de la roadmap.** Le chantier 2 déplace des
  sections terminées, il n'en réécrit, ne réordonne et n'en supprime
  aucune ligne. Un jalon coché reste coché à l'identique dans l'archive.
- **Toucher aux `references/` des skills.** Le chantier 6 déplace du
  corps vers les références existantes ou en crée ; il ne reformule ni ne
  résume aucun contenu de skill. Un skill qui perd du sens en maigrissant
  n'a pas été allégé, il a été cassé.
- **Supprimer un skill.** Mesuré : chevauchement maximal de 1,9 % entre
  les 7 skills (comparaison par 8-grammes sur les 21 fichiers de
  `.claude/` plus `CLAUDE.md`, `PROJET.md`, `DOCS/architecture.md`).
  Aucun doublon, et les descriptions coûtent ~800 tokens au total. Il n'y
  a rien à gagner à en retirer un.
- **Purger `DOCS/`.** Handoffs, ADR, design-pass et recherche restent où
  ils sont et gardent leur historique. Le chantier 1 les rend
  inaccessibles par défaut, il ne les efface pas.
- **`CLAUDE_CODE_SUBAGENT_MODEL`.** Le réglage `haiku` reste tel quel.
  Recommandation notée ici sans chantier : ne pas déléguer `audit-ux-ui`
  ni l'édition de workflow à un sous-agent, un résumé faux sur ces
  sujets coûte plus en reprise qu'il n'économise.
- **Toute réorganisation de `AUTOMATION/`.** Hors sujet.

## Critère de sortie

1. **Démarrage nominal sous 8 k tokens.** Somme de `CLAUDE.md` +
   `PROJET.md` + `ROADMAP.md` + descriptions de skills mesurée avant et
   après, chiffre reporté ici. Référence avant : **39 734 tokens**
   (mesure du 2026-09-07, `tiktoken` / `cl100k_base`).
   Mesure après : *(à écrire par la dernière étape du chantier 2)*.
2. **`ROADMAP.md` sous 20 Ko**, ne contenant que la phase en cours, le
   prochain jalon, V2/V3 et l'exigence transverse. Les sections
   archivées sont retrouvables depuis `ROADMAP.md` par un lien, et
   comparables à l'identique avec `git show` avant/après.
3. **`.claudeignore` supprimé**, ses entrées reportées en
   `permissions.deny` dans `.claude/settings.json`, et la section « Ne
   pas ouvrir sans raison explicite » de `CLAUDE.md` mise en cohérence
   avec cette liste. La règle écrite reste la protection principale : le
   deny ne bloque que les outils intégrés, pas un `cat` en Bash.
4. **Hook vérifié sur cinq commandes réelles** — un test `python_embeded`
   direct, `pytest`, `wf_check.py --essai`, `run_browser_tests.py`, un
   build de la chaîne d'outils — filtrées toutes les cinq, avec JSON
   valide sur une commande contenant des guillemets. Sur un run qui
   passe, la sortie conserve la ligne de résumé et le code de sortie :
   une sortie vide ferait relancer la commande sans filtre, soit deux
   fois le coût au lieu de zéro.
5. **`openapi.json` et `schema.d.ts` inatteignables par Read, Grep et
   Glob**, vérifié en session neuve, **et régénération prouvée identique
   à l'octet près** (`toolchain.py types` suivi d'un `git diff` vide).
   Les deux fichiers restent versionnés.

   **Amendé le 2026-09-07** — c'était « git-ignorés, régénérés par la
   chaîne d'outils, et un clone neuf qui lance `toolchain.py install &&
   build` obtient un typecheck vert sans eux ». Inatteignable :
   `toolchain.py build` exécute `tsc -b && vite build` et n'appelle
   jamais `regenerate_types()`, alors que `client.ts` importe
   `./schema` — un clone sans `schema.d.ts` échoue à la première ligne
   du typecheck. Le rendre atteignable ferait dépendre le build frontend
   d'un environnement Python, l'inverse de ce que la docstring de
   `regenerate_types()` acte (« a fresh clone can build without a Python
   round-trip »). **Ce renversement demanderait une ADR**, pas un
   chantier d'outillage. Et `.gitignore` ne répondait de toute façon pas
   au problème posé — un fichier non suivi reste sur le disque, lisible
   par Read et balayé par Grep ; seul `permissions.deny` (chantier 1)
   l'adresse.
6. **Fil conducteur généré par commande**, **données rendues identiques**
   à celles du fichier actuel — vérifié par commande, pas à l'œil.
   `CLAUDE.md` ne demande plus de le modifier à la main.

   **Amendé le 2026-09-07** — c'était « résultat identique au fichier
   actuel ». L'identité octet pour octet est impossible : l'objet
   `ROADMAP_DATA` actuel est un littéral JS mis en forme à la main (clés
   sans guillemets, retours à la ligne choisis) et `json.dumps` produit
   une autre mise en forme. Ce qui compte — et ce qui est désormais
   exigé — est l'égalité des **données**, testée par la commande de
   vérification du chantier 3. La page affichée est identique ; seul le
   texte source du bloc de données change.
7. **Les deux plus gros corps de SKILL.md allégés** — `nouvel-outil` et
   `workflow-comfyui` — avec le contenu déplacé retrouvé mot pour mot
   dans une `references/`, et **aucun contenu résumé ni reformulé**.

   **Amendé le 2026-09-07** — c'était « aucun corps de SKILL.md au-dessus
   de 6 Ko ». Inatteignable en ne traitant que deux skills, ce que ce
   cadrage prévoit : `comfyui-custom-nodes` (8 111 o), `nouvel-pack`
   (8 177 o), `nouveau-personnage` (7 190 o) et `image-realism-check`
   (6 048 o) restent au-dessus de 6 Ko après le chantier. **Les alléger
   est un chantier séparé possible**, à ouvrir seulement si le coût
   d'invocation le justifie. Sur les deux skills traités, la cible reste
   6 Ko, avec un dépassement toléré et motivé plutôt qu'un résumé — le
   hors-périmètre ci-dessus l'emporte sur le chiffre.

Et l'invariant de toute cette affaire : **aucun test existant ne change
de comportement**. Un test réécrit sur le fond pendant ce chantier est le
signal que le chantier déborde de son périmètre — s'arrêter et le
signaler.
