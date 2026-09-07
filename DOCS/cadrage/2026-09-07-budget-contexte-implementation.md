# Budget de contexte — spécification d'implémentation

Exécution du cadrage `DOCS/cadrage/2026-09-07-budget-contexte.md`. Ce
document ne rejoue pas les trois questions : il dit, chantier par
chantier, quels fichiers bougent, comment, comment on prouve que c'est
fait, et dans quel ordre. Aucun invariant de `CLAUDE.md` ne bouge ; les
endroits où la solution en frôlait un sont signalés dans la section
concernée.

## Mesure « avant » (référence du critère de sortie 1)

Comptage `tiktoken` / `cl100k_base` — aucun tokenizer Claude n'est
disponible hors ligne. L'écart usuel sur du français est de +5 à 15 %,
donc ces chiffres sont un plancher, pas une borne haute.

| Fichier | Octets | Tokens |
|---|---:|---:|
| `CLAUDE.md` | 6 422 | 1 832 |
| `PROJET.md` | 5 411 | 1 458 |
| `ROADMAP.md` | 122 682 | 35 841 |
| descriptions des 7 skills | 2 243 | 603 |
| **TOTAL** | **136 758** | **39 734** |

Le cadrage annonçait ~34 k. Le chiffre réel est ~39,7 k — le cadrage a
été amendé le 2026-09-07 pour porter le comptage réel.

Découpage de `ROADMAP.md` (fichier CRLF, 1 785 lignes, pas de saut de
ligne final) :

| Section | Lignes | Octets (LF) | Tokens |
|---|---|---:|---:|
| en-tête | 1–5 | 179 | 55 |
| V1 — Fondations ✅ | 6–1535 | 105 838 | 31 174 |
| Phase 2 — Clôture V1 ✅ | 1536–1630 | 5 821 | 1 832 |
| Phase 3 — Contrat de pack | 1631–1655 | 1 432 | 429 |
| Phase 4 — Qualité de sortie | 1656–1746 | 5 643 | 1 791 |
| V2 | 1747–1756 | 421 | 119 |
| V3 / plus tard | 1757–1770 | 671 | 189 |
| Exigence transverse | 1771–1785 | 886 | 252 |

Commande de re-mesure, à rejouer après coup et à reporter dans le
cadrage. `tiktoken` s'installe dans un venv jetable, jamais dans le
`.venv` du dépôt :

```
python -m venv /tmp/tk && /tmp/tk/bin/pip install tiktoken
/tmp/tk/bin/python - <<'PYEOF'
import os, re, glob, tiktoken
e = tiktoken.get_encoding("cl100k_base")
tot_b = tot_t = 0
for f in ["CLAUDE.md", "PROJET.md", "ROADMAP.md"]:
    s = open(f, encoding="utf-8").read()
    b, t = os.path.getsize(f), len(e.encode(s))
    print(f"{f:16s} {b:8d} o  {t:6d} tok")
    tot_b += b; tot_t += t
for p in sorted(glob.glob(".claude/skills/*/SKILL.md")):
    fm = re.match(r"^---\n(.*?)\n---\n", open(p, encoding="utf-8").read(), re.S).group(1)
    tot_b += len(fm.encode("utf-8")); tot_t += len(e.encode(fm))
print(f"{'TOTAL':16s} {tot_b:8d} o  {tot_t:6d} tok")
PYEOF
```

## Résultat attendu après les six chantiers

| Fichier | Octets après | Tokens après |
|---|---:|---:|
| `CLAUDE.md` | ~7 100 | ~2 030 |
| `PROJET.md` | 5 411 | 1 458 |
| `ROADMAP.md` | ~11 400 | ~2 945 |
| descriptions des skills | 2 243 | 603 |
| **TOTAL** | **~26 150** | **~7 040** |

Sous les 8 k, avec ~1 k de marge. **Le chantier 2 porte à lui seul la
totalité du gain** (−33 006 tokens) ; le chantier 1 en rend ~200 (la
section « Ne pas ouvrir » s'allonge). Les chantiers 3, 4, 5 et 6 ne
touchent pas le démarrage nominal — leur gain est ailleurs et est nommé
dans chaque section.

## Ordre d'exécution et découpage en commits

Un commit par chantier, dans cet ordre :

| # | Commit | Chantier | Pourquoi à cette place |
|---|---|---|---|
| 1 | `Roadmap : archiver V1 et phase 2 hors du document vivant` | 2 | Porte tout le gain ; crée `DOCS/archives/` dont le chantier 1 a besoin |
| 2 | `Contexte : permissions.deny remplace .claudeignore` | 1 | Dépend de l'existence de `DOCS/archives/` |
| 3 | `Hook de filtrage : motif reel, JSON par bibliotheque, jq abandonne` | 4 | Indépendant |
| — | *(pas de commit — voir chantier 5)* | 5 | Constat, aucune modification |
| 4 | `Fil conducteur : genere depuis un fichier de donnees` | 3 | Après 1 et 2 pour éviter deux éditions concurrentes de `CLAUDE.md` ; touche aussi `.githooks/pre-commit` |
| 5 | `Skills : corps alleges, detail en references/` | 6 | Indépendant, aucun effet sur le démarrage |

`CLAUDE.md` est touché par les commits 2 et 4, dans deux sections
disjointes (« Ne pas ouvrir sans raison explicite » puis « Fil
conducteur »). Ne pas les fusionner : le message de commit doit dire
lequel des deux changements a cassé quelque chose si ça casse.

---

# Chantier 1 — Exclusion réelle (`permissions.deny`)

## Constat préalable, vérifié

- `.claudeignore` n'apparaît **nulle part** dans la documentation Claude
  Code (`code.claude.com/docs/en/permissions`, `.../settings` : zéro
  occurrence). Le fichier est mort.
- Un `Read(...)` de `permissions.deny` **couvre plus que ce que le
  cadrage supposait**. Documentation, verbatim :

  > Read and Edit deny rules apply to Claude's built-in file tools, to
  > file commands Claude Code recognizes in Bash, such as `cat`, `head`,
  > `tail`, and `sed`, and to the targets of Bash redirections such as
  > `> file` and `< file`. They don't apply to arbitrary subprocesses
  > that read or write files indirectly, like a Python or Node script
  > that opens files itself.

  Vérifié dans ce dépôt pendant la rédaction : `head -c 16 PROD/lena.db`
  a été **refusé** par la règle `Read(**/*.db)` déjà en place. La phrase
  du cadrage « le deny ne bloque que les outils intégrés, pas un `cat` en
  Bash » est donc fausse et ne doit pas être recopiée dans `CLAUDE.md`.
- Effet de bord décisif :

  > A `Read` deny rule also blocks the Edit and Write tools on the same
  > path, including creating a new file there.

  **Un deny Read interdit aussi d'écrire.** C'est ce qui élimine cinq
  entrées de `.claudeignore` (voir la table des exclusions refusées).
- Grep et Glob : couverture *best-effort*, pas garantie — « Claude makes
  a best-effort attempt to apply Read rules to all built-in tools that
  read files like Grep and Glob ».
- Ne jamais écrire de règle `Glob(...)` : Claude Code l'accepte, ne la
  consulte jamais, et **avertit au démarrage**. Utiliser `Read(...)`.

## Syntaxe des motifs, vérifiée contre la documentation

| Forme | Portée | Effet dans ce dépôt |
|---|---|---|
| `AUDIT.md` (nom nu) | sémantique gitignore : **toute profondeur** sous le répertoire courant | attrape aussi la copie dans un worktree |
| `DOCS/handoffs/**` (multi-segment) | **ancré** au répertoire courant, uniquement là | n'attrape PAS `.claude/worktrees/*/DOCS/handoffs/` |
| `node_modules/**` (segment unique) | en règle **deny**, toute profondeur | attrape les `node_modules` imbriqués |
| `**/handoffs/**` | tout répertoire nommé `handoffs`, toute profondeur | plus large, moins lisible — **non retenu** |
| `/DOCS/**` (slash initial) | ancré à la **source du réglage**, pas à la racine du disque | non utilisé ici |
| `//c/...` | chemin absolu réel | non utilisé ici |

Le choix retenu est `Read(DOCS/handoffs/**)`, forme ancrée et explicite,
complétée par `Read(.claude/worktrees/**)` qui couvre les copies. Écrire
`Read(**/handoffs/**)` reviendrait à cacher la vraie raison (les
worktrees) derrière un joker.

## Trouvaille hors `.claudeignore`

`git worktree list` remonte **deux worktrees Claude Code résiduels** :

```
.claude/worktrees/agent-a59e2b6f2b66494b5   932728b
.claude/worktrees/agent-a79311be374fc5767   932728b
```

9,2 Mo, soit une copie complète du dépôt à un commit antérieur à `main`.
Exclus de git par `.git/info/exclude`, donc invisibles à `git status`,
mais **chaque Grep large les compte deux fois**. Ils entrent dans le
deny. Un worktree *actif* n'est pas gêné : une règle de
`.claude/settings.json` s'ancre au répertoire de travail principal de la
session, et dans une session worktree ce répertoire est le worktree
lui-même. Le nettoyage réel (`git worktree prune`) est hors périmètre.

## Fichier touché : `.claude/settings.json`

Remplacer le tableau `permissions.deny` (4 entrées) par celui-ci. Le
tableau `permissions.allow`, le bloc `env` et le bloc `hooks` ne bougent
pas.

```json
"deny": [
  "Read(INPUTS/**)",
  "Read(**/*.db)",
  "Read(**/*.db-wal)",
  "Read(**/*.db-shm)",
  "Read(AUDIT.md)",
  "Read(openapi.json)",
  "Read(schema.d.ts)",
  "Read(package-lock.json)",
  "Read(.claude/worktrees/**)",
  "Read(node_modules/**)",
  "Read(__pycache__/**)",
  "Read(.venv/**)",
  "Read(.toolchain/**)",
  "Read(.pytest_cache/**)",
  "Read(.kombai/**)",
  "Read(AUTOMATION/web/ui/dist/**)",
  "Read(**/*.pyc)",
  "Read(**/*.bak)",
  "Read(**/*.avant-*)"
]
```

**19 règles.** `DOCS/handoffs/` n'y figure pas : décision tranchée
ci-dessous.

Volume rendu inatteignable : `.toolchain` 986 Mo, `node_modules` 132 Mo,
worktrees 9,2 Mo, `openapi.json` 252 Ko, `schema.d.ts` 212 Ko,
`package-lock.json` 110 Ko, `AUDIT.md` 41 Ko.

## Décision — `DOCS/handoffs/` reste **hors** du deny

*Tranchée par Pierre le 2026-09-07 : option B.*

Le raisonnement appliqué à `CHARACTERS/`, `DOCS/cadrage/`, `WORKFLOWS/`
et `fixtures/` — *un deny Read bloque aussi Edit et Write, donc la
création de fichier* — n'avait pas été appliqué à `DOCS/handoffs/`.
Il vaut pourtant à l'identique. Constat, vérifié :

| Fait | Valeur |
|---|---|
| Handoff le plus récent | `2026-08-31-creation-monde.md`, **2026-08-31** |
| Dernier commit touchant `DOCS/handoffs/` | 2026-09-02 |
| Handoffs écrits depuis la clôture de V1 (2026-09-05) | **aucun** |
| Consigne d'écriture dans `CLAUDE.md` | **aucune** — une seule occurrence, dans « Ne pas ouvrir sans raison explicite » |
| Consigne d'écriture dans `PROJET.md` | **aucune** — zéro occurrence |
| Consigne d'écriture dans les 7 skills | **aucune** — `audit-ux-ui` cite les handoffs comme *source passée* de sa checklist, pas comme livrable |
| Consigne d'écriture ailleurs | `DOCS/handoffs/README.md` (« écrit par Claude Code à la fin de sa session ») et `DOCS/CHECKLIST-finition-studio.md` l. 24 et 130 |

Ce que ça dit : l'écriture d'un handoff **n'est plus une consigne
active** — aucun des trois fichiers lus à l'ouverture de session ne la
demande. Elle survit dans deux documents secondaires, et la pratique
s'est éteinte le 2026-08-31, remplacée dans les faits par
`DOCS/cadrage/` (six cadrages depuis le 2026-09-04) et `DOCS/retros/`
(Règle 4 de `PROJET.md`, deux rétros le 2026-09-05). Les 23 handoffs
existants restent de l'historique lisible sur demande.

**Retenu : hors deny, règle écrite seule.** `DOCS/handoffs/` reste dans
la liste « Ne pas ouvrir sans raison explicite » de `CLAUDE.md`, au même
titre que `DOCS/cadrage/` et `DOCS/archives/`, et pour la même raison :
un deny Read y bloquerait l'écriture, donc le retour de la pratique le
jour où le besoin revient. Le coût assumé est de 220 Ko qu'un Grep large
peut encore balayer — atténué par le fait que la couverture Grep du deny
est de toute façon déclarée *best-effort*, jamais garantie.

**Ce que la décision évite.** L'option écartée — `Read(DOCS/handoffs/**)`
au deny — aurait rendu les 220 Ko inatteignables, mais au prix d'un
`DOCS/handoffs/README.md` et d'un `DOCS/CHECKLIST-finition-studio.md`
(l. 24 et 130) portant une consigne devenue mécaniquement infaisable. Il
aurait fallu les retirer dans le même commit, donc élargir le périmètre
d'un chantier d'outillage à un retrait de consigne. Le deny reste à
**19 règles**, et les deux documents gardent leur texte : la consigne
n'est plus relayée par `CLAUDE.md` ni `PROJET.md`, mais rien dans le
dépôt ne la rend impossible.

## Fichier touché : `.claudeignore`

Supprimé : `git rm .claudeignore`.

## Entrées de `.claudeignore` volontairement NON reportées

C'est la partie qui demande une décision, pas une transcription.

| Entrée | Verdict | Raison |
|---|---|---|
| `CHARACTERS/` | **refusée** | Invariant 4 : les seuils se lisent dans `CHARACTERS/<nom>/config.json`. Un deny Read bloque aussi Edit/Write : le wizard « nouveau personnage » et le skill `nouveau-personnage` deviendraient impraticables. |
| `DOCS/cadrage/` | **refusée** | Règle 3 de `PROJET.md` : tout chantier de plus d'une étape a son cadrage écrit **dans ce répertoire** avant la première ligne de code. Un deny Read y interdit la création de fichier — ce document-ci n'aurait pas pu être écrit. |
| `WORKFLOWS/experiments/`, `WORKFLOWS/nsfw/ltx2_3_persona_i2v_ui.json`, `WORKFLOWS/nsfw/video_ltx2_3_i2v.json`, `WORKFLOWS/content/lena_master_prod_ui.json` | **refusée** | Invariant 1, amendé le 2026-09-01 : Claude peut modifier directement le JSON d'un workflow sur demande explicite. Un deny Read bloque l'Edit sur le même chemin. Reporter ces entrées annulerait l'amendement sans ADR. |
| `AUTOMATION/tests/fixtures/` | **refusée** | 5,5 Ko, un seul fichier : `scenes-byte-exact.json`, la fixture de l'invariant 3 (assembleur de prompt verrouillé à l'octet près). Rien à protéger, et un deny casserait sa mise à jour légitime. |
| `PROD/` | **refusée** | 492 Mo, mais d'images et de vidéos : non greppables, donc pas un coût de contexte. Le skill `image-realism-check` doit pouvoir les **lire** pour juger une sortie. Seul fichier texte notable : `PROD/journal_batch.csv` (59 Ko) — à ajouter plus tard si un Grep le remonte réellement. |
| `DOCS/ideas/` | **refusée** | 186 octets, un fichier. Une règle pour ça est du bruit. |

## Fichier touché : `CLAUDE.md`, section « Ne pas ouvrir sans raison explicite »

Remplacer :

```
## Ne pas ouvrir sans raison explicite

`AUDIT.md`, `DOCS/handoffs/`, `DOCS/cadrage/`, JSON ComfyUI bruts,
`openapi.json`, `schema.d.ts`, `package-lock.json`.
```

par :

```
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
```

## Vérification

```
# 1 — le fichier mort a disparu
test ! -e .claudeignore && echo "OK .claudeignore supprime"

# 2 — le deny est bien formé et complet
python -c "import json; d=json.load(open('.claude/settings.json',encoding='utf-8')); \
r=d['permissions']['deny']; print(len(r),'regles'); print(chr(10).join(r))"

# 3 — la protection mord pour de vrai (session NEUVE : sinon le réglage
#     n'est pas rechargé)
head -c 16 AUDIT.md
```

Sorties attendues :

1. `OK .claudeignore supprime`
2. `19 regles`, puis les 19 lignes ci-dessus.
3. La commande est **refusée par le système de permissions**, pas
   exécutée. C'est la preuve que le deny couvre Bash. Une sortie
   d'octets signifie que le réglage n'a pas été rechargé (relancer la
   session) ou que le motif est faux.

Vérifier aussi qu'aucun avertissement `is not matched by file permission
checks` n'apparaît au démarrage : ce serait une règle posée sur un outil
que Claude Code ne consulte pas.

## Ordre

**Après le chantier 2.** L'édition de `CLAUDE.md` ajoute
`DOCS/archives/` à la liste, répertoire que le chantier 2 crée. Inversé,
le chantier 1 pose une liste incomplète et demande une deuxième passe sur
le même paragraphe de `CLAUDE.md` — ce que le découpage thématique
interdit. Aucune dépendance dans l'autre sens : le chantier 2 n'a pas
besoin du deny.

---

# Chantier 2 — Roadmap vivante

## Ce qui part, ce qui reste — et pourquoi Phase 3 reste

Le cadrage annonçait « V1, Phase 2, Phase 3 ». **Phase 3 reste dans la
roadmap vivante.** Constat qui le motive :

```
cases non cochées par section
  V1        : 0
  Phase 2   : 0
  Phase 3   : 2   <-- C3 et C4
  Phase 4   : 3
```

Phase 3 est cochée ✅ *au niveau de la phase* mais porte deux engagements
ouverts (C3 « Câbler les assets monde dans le runner », C4 « World/pack
builder »). Le hors-périmètre du cadrage dit « un jalon coché reste coché
à l'identique dans l'archive » — il présuppose du contenu clos. Archiver
deux cases non cochées, c'est la façon exacte dont un engagement se perd.
Le gain sacrifié est de 1 432 octets / 429 tokens, soit 1,3 % du gain
total : le critère « `ROADMAP.md` sous 20 Ko » est atteint à 11,4 Ko sans
elle.

Reste dans `ROADMAP.md` : en-tête, lien d'archive, Phase 3, Phase 4, V2,
V3, Exigence transverse.

## Emplacement de l'archive

`DOCS/archives/2026-09-05-roadmap-v1-et-phase-2.md`

Répertoire neuf. Nom daté du jour de clôture des deux sections
(2026-09-05), aligné sur la convention déjà en place dans `DOCS/cadrage/`
et `DOCS/retros/`. Le nom porte ce qu'il contient, pas un numéro de
version : une future archive de Phase 3 ou 4 s'ajoutera à côté sans
renommage.

`DOCS/archives/` **n'entre pas dans `permissions.deny`** — seulement dans
la liste écrite de `CLAUDE.md`. Raison : un deny est absolu et
inbypassable dans la session, alors qu'un « qu'a livré J5 exactement ? »
est une question légitime et occasionnelle. La règle écrite suffit à en
faire un accès conscient.

## Frontières exactes

Fichier CRLF, `core.autocrlf=true`, pas de `.gitattributes`, pas de saut
de ligne final. Le blob git fait 120 898 o (LF), le fichier du disque
122 682 o (CRLF). **Toute vérification se fait sur les blobs.**

```
l.   1–4    en-tête, reste
l.   5      ligne vide, reste
l.   6      "## V1 — Fondations ... ✅ *(terminée 2026-09-05)*"   <-- début du déplacement
...
l. 1630     ligne vide                                            <-- fin du déplacement
l. 1631     "## Phase 3 — Contrat de pack ✅ ..."                 reste
```

Déplacement = lignes **6 à 1630** incluses (111 659 octets LF,
33 006 tokens). Après retrait, la ligne vide 5 précède directement
`## Phase 3` : jointure propre, aucune ligne à réécrire.

## Procédure

Le contenu ne tient pas dans un diff. Découpage par script binaire :
`sed` en Git Bash convertit CRLF→LF silencieusement, ce qui suffirait
(git renormalise au commit) mais rendrait le fichier du disque incohérent
avec les autres `.md` entre-temps. Le mode binaire évite d'avoir à
raisonner là-dessus.

Étape 1 — écrire à la main le fichier de travail `DOCS/archives/_header.md`
(supprimé à la fin, il ne rentre pas dans le dépôt). Sa dernière ligne est
la sentinelle qui rend la vérification possible :

```
# Archive — ROADMAP V1 et Phase 2

Sections terminées de `ROADMAP.md`, déplacées ici le 2026-09-07 pour que
le document vivant ne porte plus que ce qui reste à faire. **Aucune ligne
n'a été réécrite** : le contenu sous la sentinelle ci-dessous est
identique à l'octet près aux lignes 6→1630 de `ROADMAP.md` avant
déplacement (voir la vérification dans
`DOCS/cadrage/2026-09-07-budget-contexte-implementation.md`).

<!-- DEBUT DU CONTENU DEPLACE - ne rien inserer sous cette ligne -->
```

Étape 2 — le découpage :

```
python - <<'PYEOF'
from pathlib import Path
src = Path("ROADMAP.md")
lines = src.read_bytes().splitlines(keepends=True)
assert lines[5].startswith("## V1 ".encode("utf-8")), lines[5][:40]
assert lines[1630].startswith("## Phase 3 ".encode("utf-8")), lines[1630][:40]
moved = b"".join(lines[5:1630])            # lines 6..1630, 1-indexed
kept = b"".join(lines[:5] + lines[1630:])
out = Path("DOCS/archives/2026-09-05-roadmap-v1-et-phase-2.md")
out.parent.mkdir(parents=True, exist_ok=True)
out.write_bytes(Path("DOCS/archives/_header.md").read_bytes() + moved)
src.write_bytes(kept)
PYEOF
rm DOCS/archives/_header.md
```

Les deux `assert` sont le garde-fou : si les numéros de ligne ont bougé
depuis la rédaction de cette spec, le script s'arrête au lieu de couper
au mauvais endroit.

Étape 3 — insérer le renvoi dans `ROADMAP.md` **après la ligne vide 5**,
et terminer le bloc inséré par une ligne vide. C'est le **seul contenu
ajouté** de ce chantier. Ce placement n'est pas cosmétique : il laisse les
cinq premières lignes intactes, ce dont la vérification 3 se sert pour
calculer l'écart attendu au lieu de le coder en dur :

```
V1 (neuf jalons, terminée le 2026-09-05) et Phase 2 (clôture V1, terminée
le 2026-09-05) sont archivées telles quelles dans
[`DOCS/archives/2026-09-05-roadmap-v1-et-phase-2.md`](DOCS/archives/2026-09-05-roadmap-v1-et-phase-2.md).
Ce document ne porte plus que ce qui reste ouvert.
```

## Vérification

Après le commit :

```
A=DOCS/archives/2026-09-05-roadmap-v1-et-phase-2.md

# 1 — le déplacement est exact à l'octet près
diff <(git show HEAD~1:ROADMAP.md | sed -n '6,1630p') \
     <(git show HEAD:$A | sed -n '/^<!-- DEBUT DU CONTENU DEPLACE/,$p' | tail -n +2) \
  && echo "DEPLACEMENT EXACT"

# 2 — taille du document vivant
wc -c ROADMAP.md

# 3 — aucune ligne perdue : l'écart attendu est CALCULÉ, pas codé en dur.
#     Les trois grandeurs sont mesurées sur les fichiers produits :
#       hdr    = lignes de l'en-tête d'archive, sentinelle comprise
#       renvoi = lignes insérées dans ROADMAP.md après la ligne vide 5
#       moved  = 1625 (lignes 6→1630) — la seule constante, et c'est celle
#                que les deux assert du script de découpage garantissent
moved=1625
p3=$(git show HEAD:ROADMAP.md | grep -n '^## Phase 3 ' | head -1 | cut -d: -f1)
hdr=$(git show HEAD:$A | sed -n '1,/^<!-- DEBUT DU CONTENU DEPLACE/p' | wc -l)
renvoi=$(( p3 - 1 - 5 ))
avant=$(git show HEAD~1:ROADMAP.md | wc -l)
apres=$(( $(git show HEAD:ROADMAP.md | wc -l) + $(git show HEAD:$A | wc -l) ))
echo "ecart=$(( apres - avant ))  attendu=$(( hdr + renvoi ))  (hdr=$hdr renvoi=$renvoi)"
test $(( apres - avant )) -eq $(( hdr + renvoi )) && echo "AUCUNE LIGNE PERDUE"

# 4 — l'archive contient exactement l'en-tête et les lignes déplacées
test $(git show HEAD:$A | wc -l) -eq $(( hdr + moved )) && echo "ARCHIVE COMPLETE"

# 5 — tête et queue de ROADMAP.md intactes
diff <(git show HEAD~1:ROADMAP.md | sed -n '1,5p') \
     <(git show HEAD:ROADMAP.md   | sed -n '1,5p') && echo "TETE INTACTE"
diff <(git show HEAD~1:ROADMAP.md | sed -n '1631,$p') \
     <(git show HEAD:ROADMAP.md   | sed -n "${p3},\$p") && echo "QUEUE INTACTE"
```

Sorties attendues :

1. `DEPLACEMENT EXACT`, et rien d'autre. Un diff non vide signifie qu'une
   ligne a été touchée : recommencer depuis le commit précédent, ne pas
   « corriger » le résultat.
2. `~11400 ROADMAP.md` — sous 20 000 (critère 2).
3. La ligne de comptage, puis `AUCUNE LIGNE PERDUE`. **`hdr` et `renvoi`
   sont mesurés sur les fichiers produits, pas supposés.** La version
   précédente de cette spec attendait « exactement 10 » : un nombre
   magique qui dépendait de la longueur de l'en-tête d'archive et du
   renvoi, deux grandeurs que le contrôle ne comptait pas. Un faux succès
   y valait une ligne de roadmap perdue sans que rien ne le dise.
4. `ARCHIVE COMPLETE`.
5. `TETE INTACTE` puis `QUEUE INTACTE`. Ces deux-là attrapent le seul cas
   que le comptage laisserait passer : une ligne perdue d'un côté et une
   ligne ajoutée de l'autre, écart net nul.

## Étape finale du commit 1 — rejouer la mesure et l'écrire dans le cadrage

Le critère de sortie 1 demande le chiffre reporté dans le cadrage. Le
tableau « Résultat attendu » plus haut est une prévision ; ce chantier
est le seul qui la rende mesurable, donc c'est ici que la mesure se
rejoue. **Dernière étape avant le commit**, pas après.

1. Rejouer la commande de re-mesure de la section « Mesure "avant" » de
   ce document, à l'identique — même venv jetable, même
   `cl100k_base`, mêmes quatre entrées. Changer le tokenizer ou le
   périmètre rendrait les deux chiffres incomparables.
2. Écrire le total réel dans
   `DOCS/cadrage/2026-09-07-budget-contexte.md`, critère de sortie 1,
   **sous la mesure « avant »** — à l'emplacement déjà réservé
   (« Mesure après : *(à écrire par la dernière étape du chantier 2)* »).
3. Comparer à l'attendu, **~7 040 tokens** :
   - écart inférieur à 10 % : écrire le chiffre, rien de plus ;
   - **écart supérieur à 10 % : le dire**, dans le cadrage, avec le
     chiffre brut et l'écart en pourcentage. Ne pas arrondir vers
     l'attendu, ne pas requalifier la prévision après coup. Un total
     au-dessus de 8 k signifie que le critère 1 n'est pas atteint par ce
     chantier seul — c'est un constat à poser, pas à absorber.

Le chiffre entre dans le même commit que le déplacement : une mesure
publiée dans un commit ultérieur ne se rattache plus à l'état qu'elle
décrit.

## Débordement signalé

`.claude/rules/backend.md:41` cite « Découpage du backend web
(`ROADMAP.md`, J2 …) ». J2 part à l'archive. C'est une référence
textuelle, pas un lien : elle ne casse rien, et la corriger sortirait du
périmètre (fichier de règles, pas de roadmap). Notée ici pour ne pas la
redécouvrir. Aucune autre référence du dépôt ne pointe vers une section
déplacée — `README.md`, `PROJET.md` et les skills ne citent que
`ROADMAP.md` en entier.

## Ordre

**Premier.** Il porte 33 006 des ~33 200 tokens gagnés ; livré seul, il
ferme déjà le critère 1. Le chantier 1 en dépend (répertoire
`DOCS/archives/`).

---

# Chantier 3 — Fil conducteur généré

## Décision : fichier de données JSON + gabarit, pas un parseur de `ROADMAP.md`

Le cadrage propose « produire le HTML depuis `ROADMAP.md` par script ».
**Ce n'est pas faisable sans perdre du contenu**, constat vérifié en
comparant `ROADMAP_DATA` (l. 168–290 du HTML) à `ROADMAP.md` et
`BACKLOG.md` :

| Clé de `ROADMAP_DATA` | Existe dans `ROADMAP.md` ? |
|---|---|
| `compass` | **non** — synthèse éditoriale écrite pour la vue |
| `phases_prevues` (Abyssiaelle, phase 5, phase 6) | **non** — 0 occurrence, ni dans `BACKLOG.md` |
| `paused` (« En pause fonctionnelle ») | **non** — 0 occurrence |
| `lookup` (table « où trouver quoi ») | **non** — table statique |
| `backlog` | non — vient de `BACKLOG.md`, autre structure |
| `phase1..4.summary`, `steps[].desc` | non — versions courtes, pas des extraits |

Environ 40 % de la vue n'a **aucune source** dans les deux markdowns. Un
parseur exigerait soit d'inventer un format d'annotation dans
`ROADMAP.md` — qui alourdirait le fichier qu'on vient d'alléger, à
contresens du chantier 2 —, soit de supprimer ces sections de la vue.
Les deux sont hors périmètre.

Donc : **les données sortent dans un JSON, un générateur les injecte dans
un gabarit.** Trois raisons de préférer le JSON à un `.js` inclus par
`<script src>` :

1. Le fichier est ouvert au double-clic, en `file://`. Un `fetch()` d'un
   JSON voisin y est bloqué par CORS — le HTML doit donc rester
   autonome, ce qui impose une étape de build de toute façon.
2. `json.load()` échoue **bruyamment** au build sur une virgule en trop.
   Un objet littéral JS mal formé, lui, produit une page blanche à
   l'ouverture, sans rien à lire : c'est le mode de panne actuel.
3. Le critère 6 demande « généré par commande ». Un `.js` inclus n'est
   pas généré, il est seulement déplacé.

## Fichiers touchés

| Chemin | Rôle | Édité par |
|---|---|---|
| `soulglade-fil-conducteur.data.json` (racine, neuf) | les données | Claude / Pierre |
| `AUTOMATION/tools/templates/fil-conducteur.html` (neuf) | CSS + fonctions de rendu + marqueur | personne, sauf demande de refonte visuelle |
| `AUTOMATION/tools/build_fil_conducteur.py` (neuf) | le générateur | — |
| `soulglade-fil-conducteur.html` (racine, existant) | **sortie de build**, reste committée | personne |
| `CLAUDE.md` § « Fil conducteur » | la consigne | — |

La donnée reste à la racine, à côté de ce qu'elle décrit ; le gabarit part
dans `AUTOMATION/tools/`, avec le reste de l'outillage.

## Procédure

1. Copier `soulglade-fil-conducteur.html` vers
   `AUTOMATION/tools/templates/fil-conducteur.html`.
2. Dans le gabarit, remplacer les **lignes 155 à 291** — le commentaire
   d'en-tête `ROADMAP_DATA`, l'objet, et la ligne
   `/* ==== fin de ROADMAP_DATA ==== */` — par la seule ligne :

   ```
   /* @@ROADMAP_DATA@@ */
   ```

   Les lignes 1–154 (`<style>` puis `<script>`) et 292–386 (fonctions de
   rendu) sont conservées intactes.
3. Extraire l'objet des lignes 168–290 vers
   `soulglade-fil-conducteur.data.json`, converti en JSON strict : clés
   entre guillemets, aucun commentaire, aucune virgule finale. Le
   commentaire d'en-tête (l. 155–167), qui était une consigne pour
   Claude, ne se recopie pas — JSON n'a pas de commentaires, et cette
   consigne est reprise par la section `CLAUDE.md` réécrite plus bas.
4. Écrire le générateur (contenu ci-dessous).
5. Le lancer, écraser `soulglade-fil-conducteur.html`.
6. Vérifier l'égalité des données avant de commiter.

## `AUTOMATION/tools/build_fil_conducteur.py`

```python
# -*- coding: utf-8 -*-
"""Render the visual roadmap page from its data file.

The page is a BUILD OUTPUT: never hand-edited. Content changes go to
soulglade-fil-conducteur.data.json, layout changes to the template.
Splitting them buys a loud failure -- json.load raises on a stray comma
here, where a malformed JS object literal used to render a blank page at
open time, with nothing to read in the console.

    python AUTOMATION/tools/build_fil_conducteur.py
    python AUTOMATION/tools/build_fil_conducteur.py --check
"""
import json
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
DATA = REPO / "soulglade-fil-conducteur.data.json"
TEMPLATE = Path(__file__).with_name("templates") / "fil-conducteur.html"
OUT = REPO / "soulglade-fil-conducteur.html"
MARKER = "/* @@ROADMAP_DATA@@ */"


def render():
    data = json.loads(DATA.read_text(encoding="utf-8"))
    template = TEMPLATE.read_text(encoding="utf-8")
    if MARKER not in template:
        sys.exit(f"!! marqueur {MARKER} absent de {TEMPLATE}")
    block = "const ROADMAP_DATA = " + json.dumps(
        data, indent=2, ensure_ascii=False) + ";"
    return template.replace(MARKER, block)


def main():
    html = render()
    if "--check" in sys.argv:
        same = OUT.exists() and OUT.read_text(encoding="utf-8") == html
        print("a jour" if same else "PERIME - relancer sans --check")
        sys.exit(0 if same else 1)
    OUT.write_text(html, encoding="utf-8")
    print(f"{OUT.name} — {len(html)} o depuis {DATA.name}")


if __name__ == "__main__":
    main()
```

## `CLAUDE.md`, section « Fil conducteur (vue visuelle) »

Remplacer intégralement la section actuelle par :

```
## Fil conducteur (vue visuelle)

`soulglade-fil-conducteur.html` (racine) est une vue visuelle de
`ROADMAP.md` et `BACKLOG.md` pour Pierre — **jamais une source de
vérité**, et **jamais édité à la main** : c'est une sortie de build. En
fin de session, si `ROADMAP.md` ou `BACKLOG.md` a changé (jalon coché,
étape de phase ajoutée ou terminée, décision de pause, entrée backlog),
modifier `soulglade-fil-conducteur.data.json` puis régénérer :

    python AUTOMATION/tools/build_fil_conducteur.py

Le gabarit `AUTOMATION/tools/templates/fil-conducteur.html` porte le CSS
et les fonctions de rendu : ne jamais y toucher pour refléter un
changement de contenu — si le rendu doit changer, le signaler plutôt que
le faire sans demande explicite.
```

## Fichier touché : `.githooks/pre-commit`

`soulglade-fil-conducteur.html` devient une **sortie de build committée à
côté de sa source**, ce que `.claude/rules/frontend.md:47-48` interdit
noir sur blanc : « `web/ui/dist/`, `node_modules/` et `.toolchain/` sont
git-ignorés — un build commité à côté de sa source en est une seconde
copie. »

L'exception est justifiée et bornée : le fil conducteur s'ouvre au
double-clic, en `file://`, où un `fetch()` du JSON voisin est bloqué par
CORS — la page doit donc rester autonome, et le seul moyen de la garder
autonome est de committer le rendu. Mais une exception à une règle
mécanique a besoin du garde-fou qui la rend mécanique à son tour, sinon
la seconde copie diverge de sa source en silence, ce qui est exactement
le mode de panne que la règle prévient.

Le hook porte déjà deux invariants mécaniques ; il en portera trois.
Modifications, dans la forme du fichier existant (`COMMIT BLOCKED — …`
puis `exit 1`) :

**1. Le commentaire d'en-tête**, l. 4–7. Remplacer :

```
# Mechanically enforces the two invariants that are cheap and reliable to
# check without knowing the exact test layout of whatever module changed:
#   1. Personal character data never enters the versioned tree (ADR-0005)
#   2. Every staged ComfyUI workflow passes static validation
```

par :

```
# Mechanically enforces the three invariants that are cheap and reliable
# to check without knowing the exact test layout of whatever module
# changed:
#   1. Personal character data never enters the versioned tree (ADR-0005)
#   2. Every staged ComfyUI workflow passes static validation
#   3. The committed fil conducteur matches its data file
```

**2. Le bloc de contrôle**, inséré après la boucle de validation des
workflows (après le `fi` l. 91) et avant le rappel final :

```bash
# 3. The fil conducteur is a build output committed next to its source --
#    the one exception to "no build output in the tree" (frontend.md), and
#    it only holds if the copy is provably in sync. Checked on the data
#    file, not the HTML: staging data without the rebuilt page is the
#    failure this catches, and the reverse is caught by --check anyway.
if echo "$staged_files" | grep -qx 'soulglade-fil-conducteur.data.json'; then
  if ! python AUTOMATION/tools/build_fil_conducteur.py --check; then
    echo "COMMIT BLOCKED — soulglade-fil-conducteur.html is stale."
    echo "Run 'python AUTOMATION/tools/build_fil_conducteur.py' and stage the result."
    exit 1
  fi
fi
```

`grep -qx` sur le nom exact : `staged_files` est une liste de chemins
relatifs à la racine, un par ligne, et le fichier de données est à la
racine. `python` nu, pas `$COMFYUI_PYTHON` : le générateur n'utilise que
`json` et `pathlib`, et le hook résout déjà `python` sur le PATH pour son
propre bootstrap (l. 21).

Note d'ordre : le hook s'exécute avec `set -e`, mais le `if !` neutralise
la sortie non nulle de `--check`, donc le message de blocage est bien
atteint.

## Vérification

```
# 1 — le HTML committé correspond bien aux données
python AUTOMATION/tools/build_fil_conducteur.py --check

# 2 — les données rendues sont identiques à celles d'avant le chantier
node -e "
const fs=require('fs'), cp=require('child_process');
const pick = s => { const i = s.indexOf('const ROADMAP_DATA = ');
  return eval('(' + s.slice(i + 21, s.indexOf('\n};', i) + 2) + ')'); };
const a = pick(cp.execSync('git show HEAD~1:soulglade-fil-conducteur.html').toString('utf8'));
const b = pick(fs.readFileSync('soulglade-fil-conducteur.html','utf8'));
console.log(JSON.stringify(a) === JSON.stringify(b)
  ? 'DONNEES IDENTIQUES' : 'DIVERGENCE');"
```

```
# 3 — le garde-fou du pre-commit mord pour de vrai
python - <<'EOF'
import json, pathlib
p = pathlib.Path("soulglade-fil-conducteur.data.json")
d = json.loads(p.read_text(encoding="utf-8"))
d["_probe"] = 1
p.write_text(json.dumps(d, indent=2, ensure_ascii=False), encoding="utf-8")
EOF
git add soulglade-fil-conducteur.data.json
git commit -m "essai — doit etre bloque"   # attendu : COMMIT BLOCKED, exit 1
git restore --staged --worktree soulglade-fil-conducteur.data.json
```

Sorties attendues : `a jour`, puis `DONNEES IDENTIQUES`, puis
`COMMIT BLOCKED — soulglade-fil-conducteur.html is stale.` avec le commit
refusé. **Ce troisième contrôle se fait pour de vrai, pas à la lecture** :
un hook qu'on n'a pas vu bloquer est un hook dont on ignore s'il tourne —
c'est précisément l'histoire du filtre du chantier 4.

**Écart avec le critère 6 d'origine — désormais absorbé par
l'amendement du 2026-09-07.** Le critère disait « résultat identique au
fichier actuel » ; il demande maintenant l'identité des **données
rendues**, ce que la commande 2 vérifie. Ce paragraphe reste pour porter
la raison. L'identité **octet pour octet** est hors d'atteinte :
l'objet actuel est un littéral JS mis en forme à la main (clés sans
guillemets, retours à la ligne choisis), `json.dumps` produit une autre
mise en forme. Ce qui est vérifié — et ce qui compte — est l'égalité **des
données rendues**, testée par la commande 2. La page affichée est
identique ; seul le texte source du bloc de données change.

## Ordre

**Après 1 et 2.** Pas de dépendance technique : la seule raison est de ne
pas éditer `CLAUDE.md` dans deux commits qui se suivent. Inversé, rien ne
casse — au pire deux commits touchent `CLAUDE.md` dans un ordre qui rend
son `git log -p` moins lisible.

---

# Chantier 4 — Hook réparé

## Constat : quatre défauts, pas deux

Les deux défauts annoncés sont confirmés. Un troisième les précède et les
rend théoriques ; un quatrième est apparu en éprouvant l'implémentation
de remplacement, et il est décrit plus bas, à sa place.

**Défaut 0 — `jq` n'existe pas sur ce poste.**

```
$ which jq
which: no jq in (/c/Users/.../bin:/mingw64/bin:/usr/local/bin:/usr/bin:...)
$ jq --version
bash: jq: command not found   (exit 127)
```

Cherché aussi dans `/c/Program Files/Git/usr/bin/`, `/mingw64/bin/` et
`/c/ProgramData/chocolatey/bin/` : absent partout. La toute première
ligne utile du hook (`cmd=$(echo "$input" | jq -r '.tool_input.command')`)
échoue donc à chaque appel, `$cmd` reste vide, le motif ne matche rien,
le hook émet `{}`. **Le hook est mort avant même d'atteindre ses deux
bugs.** Le cadrage demande « JSON construit par `jq` » : impossible en
l'état.

**Défaut 1 — le motif ne reconnaît pas les commandes réelles.** Motif
actuel rejoué sur les cinq commandes du critère 4 :

```
NO-MATCH | "H:/.../python_embeded/python.exe" AUTOMATION/tests/test_serveur_http.py
NO-MATCH | python AUTOMATION/tests/run_browser_tests.py
NO-MATCH | python AUTOMATION/tools/toolchain.py build
MATCH    | pytest AUTOMATION/tests
MATCH    | python AUTOMATION/wf_check.py WORKFLOWS/platform/upscale_ui.json --essai
```

Trois sur cinq passent au travers — dont le mode d'exécution de test le
plus courant du dépôt (`python_embeded` sur `AUTOMATION/tests/test_*.py`,
voir les huit entrées correspondantes de `permissions.allow`).

**Défaut 2 — le JSON casse sur les guillemets.** Reproduit :

```
cmd='"H:/ComfyUI/python_embeded/python.exe" -c "import sys; print(1)"'
-> {"...","updatedInput":{"command":""H:/ComfyUI/..." -c "import sys..."}}}
json.decoder.JSONDecodeError: Expecting ',' delimiter: line 1 column 110
```

**Défaut 3, non annoncé — le filtre perd ce que le critère 4 exige de
garder.** Le remplacement `cmd 2>&1 | grep -A5 -E '(FAIL|...)' | head -100`
fait deux choses interdites : le code de sortie observé devient celui de
`head` (toujours 0), et sur un run vert la sortie est **vide** — la ligne
de résumé (`37 passed`) ne matche aucun motif d'erreur. Le chantier 4 est
donc une **réécriture du hook**, pas un correctif de deux lignes.

## Décision : Python, pas bash + `jq`

`jq` est absent, et l'installer ajouterait un prérequis machine à un dépôt
qui se revendique portable (en-tête de `toolchain.py` : « le dépôt est
PORTABLE… Node est le seul prérequis manuel »). `python` est sur le PATH
(3.10.6, vérifié) et `json` est dans la bibliothèque standard. Le hook
passe en Python.

## Décision — `permissionDecision: "allow"` est **gardé**

*Tranchée par Pierre le 2026-09-07.*

L'argument de principe tient : la version actuelle auto-autorise toute
commande qui matche, et élargir le motif élargit mécaniquement ce
contournement du système de permissions. Ce qui n'avait pas été chiffré,
c'est le prix de le retirer.

**Le chiffre.** La commande enveloppée (`f=$(mktemp); { … }`) ne
ressemble à aucune entrée de `permissions.allow`, qui compare des
préfixes de commande. Passé au crible des `TRIGGERS` et du garde
`COMPOUND`, sur les 45 entrées d'`allow` :

| # | Entrée rendue inopérante |
|---|---|
| 17 | `…python_embeded/python.exe" AUTOMATION/tests/test_universe_registry.py` |
| 22 | `…python_embeded/python.exe" AUTOMATION/tests/test_character_registry.py` |
| 23 | `…python_embeded/python.exe" AUTOMATION/tests/test_coherence_base.py` |
| 24 | `…python_embeded/python.exe" AUTOMATION/tests/test_serveur_http.py` |
| 42 | `…python_embeded/python.exe" AUTOMATION/wf_check.py --help` |
| 43 | `…python_embeded/python.exe" AUTOMATION/tests/test_model_family_sdxl.py` |
| 44 | `python AUTOMATION/tools/toolchain.py build` |
| 45 | `python AUTOMATION/wf_check.py WORKFLOWS/platform/upscale_ui.json --essai` |

**8 entrées sur 45**, et ce sont exactement les huit qui portent les
tests pré-autorisés. Sans `allow`, chacune redevient un prompt, **à
chaque run**. Zéro entrée est épargnée par `COMPOUND` : la totalité de
l'intersection bascule.

**Le compromis.**

- *Retirer `allow`* — le flux de permission normal s'applique à la
  commande réécrite, et Pierre voit l'enveloppe dans le prompt avant de
  l'accepter. Coût : la friction revient sur les huit commandes de test
  les plus fréquentes du dépôt, et elle revient précisément parce qu'on a
  réparé le hook. Le risque évité est théorique tant que `TRIGGERS` ne
  contient que six motifs de test.
- *Garder `allow`* — l'auto-autorisation reste bornée par deux verrous
  qui n'existaient pas avant ce chantier : `TRIGGERS`, six motifs qui ne
  décrivent que des lanceurs de test et de validation ; et `COMPOUND`,
  qui refuse toute commande composée — donc aucun `; rm -rf` ni aucune
  redirection ne peut se glisser dans une commande auto-autorisée. La
  surface est plus étroite que celle du hook d'origine, dont le motif
  était certes plus petit mais sans aucun garde de composition.

**Retenu : garder `permissionDecision: "allow"`.** Le motif est élargi,
mais il l'est *sous* un garde qui n'existait pas ; et le coût de le
retirer tombe précisément sur le geste que ce chantier cherche à rendre
moins cher.

**Contrepartie, exigée par la décision et non facultative** : le hook
porte un commentaire disant que `TRIGGERS` et `COMPOUND` sont ce qui
borne l'auto-autorisation. Sans lui, la prochaine personne qui ajoute un
motif à `TRIGGERS` élargit une auto-autorisation sans savoir qu'elle le
fait — c'est la seule façon dont cette décision peut mal tourner, et
elle se prévient par trois lignes de commentaire. Elles sont dans le code
ci-dessous.

## Défaut 4, découvert en éprouvant l'implémentation de remplacement

Un motif malformé dans `TRIGGERS` fait lever `re.error` à la **première**
`re.search`, donc avant que le moindre motif suivant soit essayé. Le
`try/except` nu de `__main__` l'avale, rend `{}`, sort 0 : **le hook est
silencieusement mort, exactement comme la version shell qu'il
remplace** — et pas seulement pour le motif fautif, pour tous.

Reproduit pendant la rédaction : un `tests[/\]test_\w+\.py` (une barre
oblique inverse perdue) a fait tomber **deux** des sept commandes de
vérification, dont `toolchain.py build` qui ne partage pourtant rien avec
le motif cassé. Le symptôme lu depuis la sortie était « le motif ne
matche pas », le vrai défaut était trois lignes plus haut.

Correctif : compiler les motifs **au chargement du module**, hors de
portée du `try/except`. Un motif malformé fait alors échouer le hook
bruyamment (`hook error` dans le transcript) au lieu de le désactiver en
silence.

## Fichiers touchés

- `.claude/hooks/filter-verbose-output.sh` → supprimé (`git rm`)
- `.claude/hooks/filter-verbose-output.py` → neuf
- `.claude/settings.json` → la commande du hook devient
  `python "$CLAUDE_PROJECT_DIR/.claude/hooks/filter-verbose-output.py"`

## `.claude/hooks/filter-verbose-output.py`

```python
# -*- coding: utf-8 -*-
"""Trim noisy test/validation output before it enters the context.

Rewrites the Bash command so its output is captured, then replayed as
(a) the lines that matter and (b) the tail. The tail is what keeps the
summary line and the real exit code: a run that prints nothing gets
re-run without the filter, which costs twice instead of nothing.

Never blocks. Any failure -- bad stdin, missing key, unexpected shape --
prints "{}" and exits 0, and the command runs untouched.
"""
import json
import re
import sys

# Compiled at import, on purpose and OUTSIDE the catch-all in __main__: a
# malformed pattern raises on the FIRST search, so every later pattern is
# skipped too and the whole hook dies silently as "{}" -- the exact
# failure of the shell version this replaces. Compiling here turns that
# into a loud load-time error instead.
#
# TRIGGERS and COMPOUND together are also what bounds the
# permissionDecision below: six test-launcher shapes, and nothing
# composed. Widening either one widens what gets auto-allowed.
TRIGGERS = tuple(re.compile(p) for p in (
    r"\bpytest\b",
    r"wf_check\.py",
    r"run_browser_tests\.py",
    r"tests[/\\]test_\w+\.py",
    r"toolchain\.py\s+(?:build|typecheck|types)\b",
    r"npm\s+run\s+(?:build|typecheck|types)\b",
))
# Wrapping a compound command would change its semantics, so leave it be.
COMPOUND = ("|", ">", "<", "&&", "||", ";", "\n")
# ...except a single leading `cd <path> && `, which Claude Code emits
# constantly and which would otherwise slip through unfiltered on the very
# commands this hook exists for. It is peeled off, the rest goes through
# the same checks, and the cd goes back in front of a BRACED envelope so a
# failing cd still short-circuits the way it did before the rewrite.
# A second `cd a && cd b && ...` leaves `&&` in the remainder, which
# COMPOUND then rejects: chains fall back to untouched, which is safe.
CD_PREFIX = re.compile(
    r"""^\s*(cd\s+(?:"[^"]*"|'[^']*'|[^\s&|;<>]+)\s*&&\s*)(\S.*)$""", re.S)
KEEP = r"(FAIL|ERROR|error:|Traceback|AssertionError|passed|failed|OK)"


def wrap(cmd):
    # `(exit $rc)` in a subshell, never a bare `exit`: Claude Code reuses a
    # persistent shell between Bash calls, and a bare exit at the end of a
    # rewritten command kills it. The symptom would be "the session stops
    # running anything", with nothing pointing back at this hook.
    return (
        'f=$(mktemp); { ' + cmd + '; } > "$f" 2>&1; rc=$?; '
        "grep -nE '" + KEEP + "' \"$f\" | head -60; "
        'echo "--- 20 dernieres lignes ---"; tail -20 "$f"; '
        'rm -f "$f"; (exit $rc)'
    )


def rewrite(cmd):
    """Return the rewritten command, or None to leave it untouched."""
    prefix = ""
    m = CD_PREFIX.match(cmd)
    if m:
        prefix, cmd = m.group(1), m.group(2)
    if any(c in cmd for c in COMPOUND):
        return None
    if not any(t.search(cmd) for t in TRIGGERS):
        return None
    if prefix:
        return prefix + "{ " + wrap(cmd) + "; }"
    return wrap(cmd)


def main():
    payload = json.load(sys.stdin)
    new = rewrite(payload["tool_input"]["command"])
    if new is None:
        return {}
    return {"hookSpecificOutput": {
        "hookEventName": "PreToolUse",
        # Auto-allow, kept deliberately (2026-09-07): dropping it would
        # turn 8 of the 45 permissions.allow entries back into a prompt on
        # every run -- all eight of them test launchers. What bounds it is
        # TRIGGERS + COMPOUND above, nothing else. Widen either one and you
        # widen what runs without asking.
        "permissionDecision": "allow",
        "updatedInput": dict(payload["tool_input"], command=new),
    }}


if __name__ == "__main__":
    try:
        out = main()
    except Exception:
        out = {}
    print(json.dumps(out))
```

Le `json.dumps` final est le correctif du défaut 2 : plus aucune
interpolation de chaîne. Le `try/except` nu est délibéré — la
documentation dit qu'un code de sortie autre que 2 ne bloque pas, mais
affiche un `hook error` dans le transcript ; sortir 0 avec `{}` ne laisse
même pas cette trace. Il ne couvre volontairement pas la compilation des
motifs, pour la raison dite plus haut.

### Ce que le garde `COMPOUND` laisse encore passer, dit noir sur blanc

Le préfixe `cd <chemin> && ` est traité. Le reste ne l'est pas, et c'est
délibéré :

| Forme | Traitement | Pourquoi |
|---|---|---|
| `cd X && pytest tests` | **enveloppée**, `cd` remis devant `{ … }` | forme courante ; la sémantique du `&&` est préservée par les accolades |
| `cd a && cd b && pytest` | **laissée intacte** | un seul préfixe est dépilé ; le reste contient `&&`, `COMPOUND` refuse |
| `pytest … \| head -5` | **laissée intacte** | l'auteur a déjà choisi son filtre, l'envelopper le doublerait |
| `pytest … > log.txt` | **laissée intacte** | la redirection est le but de la commande |
| `A=1 pytest tests` | **enveloppée** | pas de caractère composé ; l'affectation reste dans les accolades, sémantique inchangée |
| `pytest tests &` | **enveloppée** | limite connue et non traitée : `&` n'est pas dans `COMPOUND`, et l'enveloppe le mettrait en arrière-plan avec un `rc` faux. Aucune commande du dépôt ne prend cette forme (0 occurrence dans `permissions.allow`), et l'ajouter à `COMPOUND` casserait `&&` par sous-chaîne. **Signalé, pas corrigé** — si la forme apparaît, la traiter par un test de fin de chaîne, pas par `COMPOUND`. |

## Vérification

Sept commandes : les cinq du critère 4, plus la forme `cd X && …`
ajoutée par cette révision, plus une septième qui porte des guillemets et
doit rester **inchangée**. Deux contrôles négatifs suivent.

```
for c in \
  '"H:/ComfyUI/ComfyUI_windows_portable/python_embeded/python.exe" AUTOMATION/tests/test_serveur_http.py' \
  'pytest AUTOMATION/tests' \
  'python AUTOMATION/wf_check.py WORKFLOWS/platform/upscale_ui.json --essai' \
  'python AUTOMATION/tests/run_browser_tests.py' \
  'python AUTOMATION/tools/toolchain.py build' \
  'cd AUTOMATION && pytest tests' \
  '"H:/ComfyUI/python_embeded/python.exe" -c "import sys; print(1)"' \
  'cd a && cd b && pytest tests' \
  'pytest AUTOMATION/tests | head -5' ; do
  printf '%s' "$c" \
    | python -c "import json,sys; print(json.dumps({'tool_input':{'command':sys.stdin.read()}}))" \
    | python .claude/hooks/filter-verbose-output.py \
    | python -c "import json,sys; d=json.load(sys.stdin); print('FILTRE' if d else 'INCHANGE', '| JSON VALIDE')"
done
```

Sortie attendue — **mesurée**, pas prévue, sur l'implémentation ci-dessus :

```
FILTRE   | JSON VALIDE      <- test_serveur_http.py
FILTRE   | JSON VALIDE      <- pytest
FILTRE   | JSON VALIDE      <- wf_check.py --essai
FILTRE   | JSON VALIDE      <- run_browser_tests.py
FILTRE   | JSON VALIDE      <- toolchain.py build
FILTRE   | JSON VALIDE      <- cd AUTOMATION && pytest tests
INCHANGE | JSON VALIDE      <- python -c "..." : pas une commande de test
INCHANGE | JSON VALIDE      <- chaine de cd : COMPOUND refuse le reste
INCHANGE | JSON VALIDE      <- pipe deja present
```

Les six premières couvrent le critère 4 élargi. La septième démontre que
le JSON reste valide en présence de guillemets — c'est exactement
l'entrée qui cassait avant. Les deux dernières sont les contrôles
négatifs du garde `COMPOUND`.

Puis l'exécution réelle de l'enveloppe, qui est le seul contrôle que la
liste ci-dessus ne fait pas — elle vérifie la réécriture, pas ce que la
réécriture produit une fois lancée :

```
cd AUTOMATION && { f=$(mktemp); { sh -c "echo 12 passed; exit 4"; } > "$f" 2>&1; rc=$?; \
  grep -nE '(FAIL|ERROR|error:|Traceback|AssertionError|passed|failed|OK)' "$f" | head -60; \
  echo "--- 20 dernieres lignes ---"; tail -20 "$f"; rm -f "$f"; (exit $rc); }
echo "rc final : $?"
```

Sortie attendue — **mesurée** :

```
1:12 passed
--- 20 dernieres lignes ---
12 passed
rc final : 4
```

Trois choses y sont prouvées d'un coup : la ligne de résumé survit, le
code de sortie du programme d'origine est propagé à travers le
sous-shell `(exit $rc)`, et le `cd` a bien été remis devant l'enveloppe.
Vérifié aussi qu'un `cd` vers un répertoire inexistant fait court-circuit
— le corps ne tourne pas et le `rc` vaut 1 — ce que la forme « `cd`
devant une enveloppe non accolée » ne donnerait pas.

Enfin, en session réelle et sur un run **qui passe** : la sortie doit
contenir la ligne de résumé et le vrai code de sortie. Une sortie vide
est un échec du chantier, pas un succès.

## Ordre

Indépendant. Placé en troisième parce qu'il ne gagne aucun token au
démarrage : son gain est en cours de session, sur les runs de tests
verbeux. Inversé avec 1, 2, 3, 5 ou 6 : rien ne casse.

---

# Chantier 5 — Générés hors dépôt : à ne pas faire

## Ce qui a été vérifié

**La régénération est complète et déterministe.** Les deux fichiers ont
été régénérés dans un répertoire de travail et comparés aux versions
committées :

```
diff openapi.json <(regénéré par dump_openapi.py)     -> 0 ligne
diff schema.d.ts  <(regénéré par openapi-typescript)  -> 0 ligne
```

53 chemins, 114 schémas, identiques à l'octet près, et le résultat est le
même avec les trois interpréteurs du poste (`.venv`, `python_embeded`,
`python` du PATH). `api.main` n'entraîne que `fastapi`, `pydantic`,
`starlette` et `PIL` — tous dans `requirements.txt`, aucun `torch`.

**Mais un clone neuf casse.** `toolchain.py build` exécute
`npm run build`, soit `tsc -b && vite build`. Il **n'appelle jamais**
`regenerate_types()`. Et `AUTOMATION/web/ui/src/api/client.ts:15` fait
`import type { components } from './schema'`. Sans `schema.d.ts` sur le
disque, `tsc -b` échoue à la première ligne. Le critère 5 — « un clone
neuf qui lance `toolchain.py install && build` obtient un typecheck vert
sans eux » — est donc **inatteignable** sans faire dépendre le build
frontend d'un environnement Python complet.

Ce découplage est une décision écrite, dans la docstring de
`regenerate_types()` :

> Both outputs are COMMITTED — they are the API contract as of that
> revision, so a change to a Pydantic model shows up as a diff in the
> frontend instead of as a runtime surprise, and a fresh clone can build
> without a Python round-trip.

Le renverser est une décision d'architecture : ADR, pas chantier
d'outillage.

## Et surtout : `.gitignore` ne résout pas le problème posé

Le problème du cadrage est « 456 Ko, soit ~110 k tokens exposés à un seul
Grep large ». `.gitignore` n'a **aucun effet** là-dessus : un fichier non
suivi reste sur le disque, reste lisible par Read, reste trouvé par Glob,
reste balayé par Grep. Le seul mécanisme qui adresse le problème est
`permissions.deny` — qui les couvre déjà, chantier 1 :

```
"Read(openapi.json)",
"Read(schema.d.ts)",
```

Et cela fonctionne que les fichiers soient suivis ou non. Le chantier 5
est un non-remède à son propre problème.

## Ce qui est proposé à la place

**Rien à faire.** Le chantier 5 est absorbé par le chantier 1 et ne donne
pas lieu à un commit. Les deux fichiers restent versionnés.

Le critère de sortie 5 a été **reformulé dans le cadrage le
2026-09-07**, en gardant sa formulation d'origine visible et la raison
datée : « `openapi.json` et `schema.d.ts` inatteignables par Read, Grep
et Glob, vérifié en session neuve, et régénération prouvée identique à
l'octet près. Les deux fichiers restent versionnés. » L'amendement note
aussi que **le renversement demanderait une ADR** — faire dépendre le
build frontend d'un environnement Python n'est pas une décision
d'outillage.

## Vérification (celle qui garde sa valeur : la non-dérive)

```
python AUTOMATION/tools/toolchain.py types
git diff --stat AUTOMATION/web/ui/src/api/
```

Sortie attendue : **aucune ligne**. Une diff non vide signifie que les
fichiers committés ne correspondent plus au code Python — c'est le seul
risque réel que porte ce couple de fichiers, et il est mesurable en dix
secondes. En faire un test automatique est un ajout de portée : signalé,
pas fait ici.

## Ordre

Sans objet — aucune modification. À condition que le chantier 1 soit
livré, sans quoi le problème reste entier.

---

# Chantier 6 — Skills allégés

## Préalable qui change la lecture du chantier

Le corps d'un `SKILL.md` **n'entre pas dans le démarrage nominal** : seul
son frontmatter (`name` + `description`) est injecté, soit 2 243 octets /
603 tokens pour les sept skills réunis. Le chantier 6 ne contribue donc en
rien au critère 1. Son gain est réel mais ailleurs : sur le coût
d'**invocation** d'un skill en cours de session, donc sur la fréquence de
compaction pendant un chantier long. C'est une raison de le faire, et une
raison de le faire en dernier.

État de départ des sept corps :

```
audit-ux-ui           5 665 o   ✔ sous 6 Ko
image-realism-check   6 048 o   ~ 48 o au-dessus
nouveau-personnage    7 190 o
comfyui-custom-nodes  8 111 o
nouvel-pack           8 177 o
nouvel-outil         10 233 o   <-- traité ici
workflow-comfyui     10 560 o   <-- traité ici
```

Le cadrage ne retient que les deux plus gros. Les quatre du milieu restent
au-dessus de 6 Ko après ce chantier : le critère 7 dans sa formulation
d'origine (« aucun corps au-dessus de 6 Ko ») n'était **pas** atteignable
en ne traitant que deux skills. Le cadrage a été **amendé le 2026-09-07**
pour se borner aux deux skills traités et noter les quatre autres comme
chantier séparé possible. Ce chantier-ci ne les touche pas.

## 6a — `nouvel-outil` : 10 233 → ~5 445 o

Fichier neuf :
`.claude/skills/nouvel-outil/references/gabarit-ecran-studio.md`
(le skill n'a aujourd'hui aucune `references/`).

Sections déplacées **verbatim**, dans leur ordre d'origine :

| Lignes | Section | Octets |
|---|---|---:|
| 90–100 | `### Repérer avant d'écrire` | 634 |
| 101–111 | `### Découpage de l'écran (frontend.md, rappelé ici car central au gabarit)` | 606 |
| 118–144 | `### Construction en étapes séparées, jamais un big-bang` | 1 725 |
| 145–154 | `### Audit UX/UI systématique en fin de chantier` | 571 |
| 155–163 | `### Documentation` | 432 |
| 164–182 | `### Checklist (patron 2)` | 951 |
| | **total** | **4 919** |

Restent dans le corps : `## Deux patrons, pas un seul`, tout le patron 1
(`### Décider la portée`, `### Contrat`, `### Enregistrement`,
`### Checklist (patron 1)`), `### Mode Plan avant tout code
multi-fichier` (l. 112–117) et `## Isolation des données`.

La ligne de partage : le corps garde **la décision** — quel patron, quelle
couche, quel `scope` — et les deux règles que `CLAUDE.md` cite nommément
(mode Plan, isolation `character_id`) ; la référence prend **la
procédure** du patron 2, qu'on lit une fois qu'on sait qu'on fait un
patron 2. `### Mode Plan` reste au corps bien qu'il soit au milieu des
sections déplacées : la référence est alors non contiguë dans le fichier
d'origine, ce qui est sans conséquence — elle se lit d'un bloc.

Seul contenu **ajouté**, aucune reformulation : sous le titre
`## Patron 2 — Écran/module de studio (gabarit standard)`, après
`### Mode Plan…`, une ligne de renvoi :

```
Le gabarit complet — repérage de l'existant, découpage de l'écran,
construction en étapes, audit UX/UI, documentation, checklist — est dans
`references/gabarit-ecran-studio.md`. Le lire avant d'écrire la première
ligne de l'étape 1.
```

Le fichier de référence s'ouvre sur un titre
`# Gabarit d'un écran ou module de studio (patron 2)` et une ligne disant
d'où viennent ces sections ; le reste est la concaténation verbatim.

## 6b — `workflow-comfyui` : 10 560 → ~6 220 o

Sections déplacées **verbatim** :

| Lignes | Section | Octets | Destination |
|---|---|---:|---|
| 30–40 | `## Format : deux formats JSON coexistent` | 504 | `references/format-ui-mecanique.md` (existant) |
| 94–111 | `## Garde-fou identité — annoncer le chiffre avant d'appliquer` | 920 | `references/protocole-identite.md` (existant) |
| 112–127 | `## Activer/désactiver une partie du graphe sans dupliquer le fichier` | 966 | `references/format-ui-mecanique.md` (existant) |
| 128–153 | `## Appels API répétés : le cache d'exécution de ComfyUI` | 1 572 | `references/orchestration-et-donnees.md` (**neuf**) |
| 154–163 | `## Données sensibles qui transitent par un workflow` | 530 | `references/orchestration-et-donnees.md` (**neuf**) |
| | **total** | **4 492** | |

`orchestration-et-donnees.md` regroupe les deux sections qui parlent du
**code qui appelle un workflow**, pas du fichier de graphe : le cache
d'exécution et le sort d'une photo de tiers en transit. Thème cohérent, et
c'est ce que la description du skill appelle « touché par du code
d'orchestration ».

Restent au corps : `## Le contrat qui prime sur tout le reste`,
`## Règles d'édition de graphe`, `## Validation obligatoire après toute
édition`, `## Format de réponse attendu sur ce genre de tâche`,
`## Pour aller plus loin`. La ligne de partage : le corps garde ce qu'on
n'a **pas le droit de violer** — les quatre couches, les huit règles
d'édition, les deux niveaux de `wf_check` — les références prennent le
savoir-faire.

Ajouts au corps, aucune reformulation :

1. Dans `## Règles d'édition de graphe`, item 1, la phrase « Vérifier le
   format (§ ci-dessus) avant de faire quoi que ce soit avec un ID. »
   devient « Vérifier le format (`references/format-ui-mecanique.md`)
   avant de faire quoi que ce soit avec un ID. » — **seule** correction de
   renvoi du chantier, rendue nécessaire par le déplacement de la section
   « Format ».
2. Une puce neuve dans `## Pour aller plus loin` :

   ```
   - `references/orchestration-et-donnees.md` — cache d'exécution de
     ComfyUI (un même graphe soumis deux fois ne se ré-exécute pas) et
     sort des données sensibles qui transitent par un workflow
   ```

## L'écart de 220 octets, et pourquoi ne pas le combler

`workflow-comfyui` atterrit à ~6 220 o : 220 o au-dessus du critère 7,
soit 3,7 %. Les deux façons de descendre sous 6 Ko, et leur coût :

- Déplacer `## Format de réponse attendu sur ce genre de tâche` (512 o)
  → 5 710 o. **Déconseillé** : c'est une consigne sur *la façon de
  répondre*, appliquée depuis le corps chargé ; en `references/` elle
  n'est lue que si on ouvre la référence, donc jamais au moment où elle
  sert.
- Déplacer un morceau de `## Règles d'édition de graphe` (1 895 o).
  **Refusé** : c'est le cœur du skill, et un déplacement partiel de
  section obligerait à résumer, ce que le hors-périmètre du cadrage
  interdit explicitement.

Recommandation : accepter 6 220 o, réduction de 41 %. Le critère 7 amendé
demande « aucun contenu résumé ni reformulé » avant de demander un
chiffre — à 6 220 o le chantier le satisfait, avec un dépassement de
3,7 % motivé plutôt qu'un résumé. Un skill qui perd du sens en
maigrissant n'a pas été allégé.

## Vérification

```
# 1 — tailles des corps
wc -c .claude/skills/*/SKILL.md

# 2 — rien n'a été résumé : chaque section déplacée se retrouve mot pour
#     mot dans sa référence
for s in "Repérer avant d'écrire" "Découpage de l'écran" \
         "Construction en étapes séparées" "Audit UX/UI systématique" \
         "Checklist (patron 2)"; do
  grep -qF "$s" .claude/skills/nouvel-outil/references/gabarit-ecran-studio.md \
    && echo "OK    $s" || echo "PERDU $s"
done

# 3 — aucun octet perdu : on compare le REPERTOIRE ENTIER des deux
#     cotes, pas SKILL.md avant contre SKILL.md + refs apres
for k in nouvel-outil workflow-comfyui; do
  a=$(git archive HEAD~1 .claude/skills/$k | tar -xO | wc -c)
  b=$(git archive HEAD   .claude/skills/$k | tar -xO | wc -c)
  echo "$k : avant $a, apres $b, ecart $(( b - a ))"
done
```

Sorties attendues :

1. `nouvel-outil ≈ 5 445`, `workflow-comfyui ≈ 6 220`, les cinq autres
   inchangés.
2. Cinq `OK`, aucun `PERDU`.
3. Pour chaque skill, un `ecart` **positif et petit** — de l'ordre de
   quelques centaines d'octets, correspondant aux seuls ajouts nommés
   plus haut : la ligne de renvoi, les titres des fichiers de référence
   neufs, la puce de « Pour aller plus loin ». Un `ecart` négatif
   signifie qu'un contenu a été supprimé : échec du chantier.

   **Ce contrôle a été refait.** La version précédente comparait
   `SKILL.md` avant à `SKILL.md` + *toutes* les références après. Pour
   `workflow-comfyui`, l'après incluait 24 Ko de références
   préexistantes (`format-ui-mecanique.md`, `modeles-par-pack.md`,
   `pieges-noeuds-custom.md`, `protocole-identite.md`) : le total après
   dépassait celui d'avant de 24 Ko, et le test serait passé même en
   ayant supprimé la moitié du corps au lieu de la déplacer. Il ne
   vérifiait rien.

   `git archive … | tar -xO` est ce qui rend la comparaison honnête : les
   deux côtés passent par le même chemin de conversion, donc le même
   traitement des fins de ligne. **Vérifié avant d'être écrit ici** — sur
   `HEAD~1` contre `HEAD` avec les deux skills intacts, l'écart est
   exactement 0 des deux côtés. Ne pas comparer un `git archive` à un
   `cat` du disque : sur ce dépôt les deux diffèrent d'un octet par
   ligne, `git archive` appliquant la conversion CRLF du répertoire de
   travail que les fichiers sur disque, eux, ne portent pas.

Vérification finale, non automatisable : relire les deux corps allégés
d'un bout à l'autre. Un skill qu'on ne peut plus suivre sans ouvrir une
référence pour comprendre *quoi faire* — et pas *comment le faire* — a été
cassé, pas allégé.

## Ordre

**Dernier.** Aucun effet sur le démarrage nominal, aucune dépendance, et
c'est le seul chantier dont le résultat se juge à la relecture plutôt qu'à
une commande. Inversé avec n'importe quel autre : rien ne casse.

---

# Récapitulatif des points tranchés

| # | Décision | Motif court |
|---|---|---|
| 2 | Phase 3 **reste** dans la roadmap vivante | deux cases non cochées ; 1,3 % du gain |
| 1 | `CHARACTERS/`, `DOCS/cadrage/`, `WORKFLOWS/`, `fixtures/`, `PROD/` **hors** du deny | un deny Read bloque aussi l'écriture → Règle 3 et invariants 1, 3, 4 |
| 1 | `.claude/worktrees/**` **ajouté** au deny | 9,2 Mo de copie du dépôt, absente de `.claudeignore` |
| 1 | `DOCS/handoffs/` **hors** du deny — *tranché par Pierre* | même raison que `DOCS/cadrage/` : un deny Read bloque l'écriture, donc le retour de la pratique |
| 1 | La phrase du cadrage sur `cat` est fausse et n'est pas recopiée | vérifié : le deny bloque `head` en Bash |
| 2 | Archive en `DOCS/archives/2026-09-05-roadmap-v1-et-phase-2.md` | convention datée déjà en place ; hors deny, dans la règle écrite |
| 2 | Écart de lignes **calculé**, plus de « exactement 10 » | le nombre magique dépendait de deux longueurs que le contrôle ne comptait pas |
| 2 | Re-mesure « après » = dernière étape du commit 1 | une mesure publiée plus tard ne se rattache plus à l'état qu'elle décrit |
| 3 | JSON + gabarit, **pas** de parseur de `ROADMAP.md` | ~40 % de la vue n'a aucune source dans les markdowns |
| 3 | Identité vérifiée sur les **données**, pas les octets | `json.dumps` ne reproduit pas un littéral JS mis en forme à la main |
| 3 | Le `--check` entre dans `.githooks/pre-commit` | une sortie de build committée à côté de sa source a besoin d'un garde mécanique (`frontend.md:47-48`) |
| 4 | Python, **pas** `jq` | `jq` absent du poste ; l'ajouter contredit la portabilité revendiquée |
| 4 | `(exit $rc)` en sous-shell, jamais un `exit` nu | Claude Code réutilise un shell persistant ; un `exit` nu le tue, et le symptôme ne pointe pas vers le hook |
| 4 | Le préfixe `cd <chemin> && ` est dépilé, enveloppé, remis devant `{ … }` | forme très fréquente qui passait non filtrée — le problème même que le chantier répare |
| 4 | Motifs compilés au chargement, hors du `try/except` | un motif malformé désactivait tout le hook en silence |
| 4 | `permissionDecision: "allow"` **gardé** — *tranché par Pierre* | le retirer rendait inopérantes 8 des 45 entrées d'`allow` ; `TRIGGERS` + `COMPOUND` bornent l'auto-autorisation, et le hook le dit |
| 6 | `workflow-comfyui` s'arrête à 6 220 o | descendre plus bas obligerait à résumer |
| 6 | Comparaison du **répertoire entier** par `git archive` | l'ancien contrôle passait même en supprimant la moitié du corps |
| 5 | **Ne pas** git-ignorer ; pas de commit | `.gitignore` n'a aucun effet sur le coût de contexte ; le clone neuf casserait |

# Ce qui déborde du cadrage, signalé et non fait

Les trois premiers points ont donné lieu à un **amendement du cadrage**
le 2026-09-07 : les critères 5, 6 et 7 y portent désormais leur
formulation d'origine, la raison datée, et la version tenable. Ils sont
rappelés ici pour mémoire, pas rouverts.

1. **Critère 5** — sortir `openapi.json` / `schema.d.ts` du versionné
   demande que `toolchain.py build` régénère les types, donc que le build
   frontend dépende d'un environnement Python : l'inverse de ce que la
   docstring de `regenerate_types()` acte. **ADR requise** pour le
   renverser. Critère reformulé en « inatteignables par Read/Grep/Glob,
   vérifié en session neuve, et régénération prouvée identique à l'octet
   près ».
2. **Critère 7** — `comfyui-custom-nodes` (8 111 o), `nouvel-pack`
   (8 177 o), `nouveau-personnage` (7 190 o) et `image-realism-check`
   (6 048 o) restent au-dessus de 6 Ko. Critère reformulé pour se borner
   aux deux skills traités ; les quatre autres sont notés comme
   **chantier séparé possible**.
3. **Critère 6** — identité octet pour octet impossible, remplacée par
   l'identité des données rendues, vérifiée par commande.
4. **Deux worktrees git résiduels** au commit `932728b`
   (`git worktree list`). Le deny les rend invisibles ;
   `git worktree prune` les supprimerait pour de bon. Décision de Pierre,
   pas de ce chantier.
5. **Garde anti-dérive sur `openapi.json` / `schema.d.ts`** : la commande
   de vérification du chantier 5 mériterait d'être un test. En ajouter un
   est un élargissement de portée, refusé ici — « aucun test existant ne
   change de comportement » n'autorise pas pour autant à en inventer un
   dans un chantier d'outillage.
6. **`DOCS/CHECKLIST-finition-studio.md` l. 24 et 130 et
   `DOCS/handoffs/README.md`** portent la consigne d'écrire un handoff,
   qui n'est plus relayée par `CLAUDE.md`, `PROJET.md` ni aucun skill.
   La décision 1 (handoffs hors du deny) rend leur retrait **non
   requis** : la consigne reste faisable, elle n'est simplement plus
   rappelée à l'ouverture de session. Rien à faire ; noté pour ne pas le
   redécouvrir.
7. **La forme `commande &`** échappe au garde `COMPOUND` du hook
   (chantier 4). Aucune occurrence dans le dépôt ; la traiter demanderait
   un test de fin de chaîne, pas un ajout à `COMPOUND` qui casserait
   `&&` par sous-chaîne. Signalée, non corrigée.

# Décisions de Pierre — spécification figée le 2026-09-07

Les deux points laissés ouverts par la révision ont été tranchés. La
spécification est complète : **l'exécution peut partir.**

**Décision 1 — `DOCS/handoffs/` reste hors du `permissions.deny`**
(option B). Le deny compte 19 règles. `DOCS/handoffs/` figure dans la
liste écrite « Ne pas ouvrir sans raison explicite » de `CLAUDE.md` et
dans son énumération des répertoires volontairement épargnés par le deny,
avec la même raison que `DOCS/cadrage/` et `DOCS/archives/` : un deny
Read y bloquerait l'écriture. Aucune consigne à retirer ailleurs.
→ chantier 1, commit 2.

**Décision 2 — `permissionDecision: "allow"` est gardé** dans le hook.
Les 8 entrées de `permissions.allow` concernées (#17, 22, 23, 24, 42,
43, 44, 45) restent opérantes. Contrepartie appliquée : le hook porte en
clair, à l'endroit du champ, que `TRIGGERS` et `COMPOUND` sont ce qui
borne l'auto-autorisation — pour que l'élargir plus tard soit un geste
conscient. → chantier 4, commit 3.

## Ce que l'exécution attend encore, et qui n'est pas une décision

Trois choses ne peuvent pas être écrites d'avance et se produisent
pendant l'exécution. Elles sont nommées ici pour qu'aucune ne se perde
entre deux commits :

1. **Le chiffre de la re-mesure** (dernière étape du commit 1), à écrire
   dans `DOCS/cadrage/2026-09-07-budget-contexte.md` sous la mesure
   « avant ». Au-delà de 10 % d'écart avec les ~7 040 attendus : le dire,
   ne pas arrondir.
2. **La vérification en session neuve** du chantier 1 : un
   `head -c 16 AUDIT.md` doit être *refusé*, pas exécuté. Le réglage
   n'est pas rechargé à chaud.
3. **Le pre-commit qui bloque pour de vrai** (chantier 3, vérification 3).
   Un hook qu'on n'a pas vu refuser un commit est un hook dont on ignore
   s'il tourne.
