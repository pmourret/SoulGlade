# Logs structurés, classification des exceptions, rotation

Cadrage ouvert le 2026-09-09. Chantier T1 (« Ingénierie »), item
« Logs structurés plutôt que prints épars », au statut `cours` depuis
IT-0 sans jamais avoir été ouvert. Trois questions comme tout cadrage
(règle 3, `PROJET.md`).

## L'état réel du dépôt, relu dans le code le 09/09

Six faits vérifiés, pas des souvenirs de doc.

1. **`logging` n'est utilisé nulle part.** Aucun `import logging`, aucun
   `getLogger` dans `AUTOMATION/`. Rien n'écrit sur disque : tout ce que
   la production raconte meurt avec la fenêtre console.
2. **732 `print` au total, dont ~80 hors `tests/`.** Les gros porteurs :
   `universe.py` (16), `env_config.py` (13), `worlds.py` (12),
   `web/app.py` (12), `tools/planche_mains.py` (12), `wf_check.py` (7).
   Tous ne se valent pas : voir la frontière posée plus bas.
3. **Il existe déjà deux points de passage uniques.**
   `runner.log()` (`runner/__init__.py`) — un `print` horodaté, 39 appels
   dans le runner ; et `shared_state.push_log()` — un anneau de 200
   lignes affiché à l'écran, 64 appels dans le web. **Changer le corps de
   ces deux fonctions structure 103 messages sans toucher un seul appel.**
4. **La classification des erreurs existe déjà — implicite.** Le dépôt a
   18 exceptions maison et respecte une convention nulle part écrite :
   les sous-classes de `ValueError` sont des **refus de requête**
   (`FaceInPromptError`, `UnknownWorldError`, `BaseImageError`…), rendues
   en 400 par `api/errors.py` ; les sous-classes de `RuntimeError` sont
   des **opérations impossibles** (`ProvisionError`, `MissingConfigError`,
   `RenderError`, `ExtractionError`), qui tombent aujourd'hui dans le
   fourre-tout 500.
5. **Une trace de bug ne survit à rien.** `_unhandled` dans
   `api/errors.py` pousse une ligne dans l'anneau d'écran ; la pile
   complète part sur la console d'uvicorn, qui n'écrit pas sur disque.
   Fermer la fenêtre efface la seule copie.
6. **Le lot continue mais la cause s'évapore.** Depuis le 09/09
   (`execute_jobs`, `sortie.py`), un job qui lève ne tue plus le lot :
   il devient verdict `ERREUR` avec `type — message`. La pile, elle,
   n'est écrite nulle part. Une image perdue à la 12e d'un lot de 40 est
   donc constatée, jamais diagnosticable après coup.

## À quoi ça sert, et pour qui

**Pour Pierre, cette semaine.** IT-4 est une semaine de production réelle
dont la DoD exige un journal de frictions écrit *au moment* où la
friction arrive. Une friction qu'on ne peut pas relire après coup — un
lot qui a perdu trois images mardi — n'entre pas dans ce journal avec sa
cause, seulement avec son symptôme. Le fichier de log est ce qui rend une
ligne du journal exploitable le vendredi.

**Pour l'utilisateur cible ensuite.** Critère de sortie V1 :
« aucun crash silencieux ; toute erreur remontée à l'interface est
actionnable ». Aujourd'hui l'écran reçoit `KeyError — 'preset'` et le
support s'arrête là : il n'y a rien à demander à l'utilisateur, pas de
fichier à faire suivre. C'est le chaînon manquant du critère, pas un
confort de développeur.

**Ce n'est pas un chantier hors parcours nominal** (règle 2) : il ne pose
aucun écran neuf, il rend actionnable un critère de sortie déjà voté.

## La classification retenue

Trois familles, et **elles décident du niveau de log et de la pile, pas
du code HTTP.** Ne pas toucher aux statuts est délibéré : le front est
verrouillé dessus par ses tests, et changer un 500 en 503 n'apprend rien
à personne ici.

| Famille | Ce que c'est | Niveau | Pile | Écran |
|---|---|---|---|---|
| **Refus** | `ValueError` et filles, `BadRequest` — la demande est mauvaise | `WARNING` | non | message français, 400 |
| **Environnement** | `RuntimeError` et filles, `OSError`, réseau — ComfyUI absent, modèle manquant, disque | `ERROR` | non | message français, 500 |
| **Bug** | tout le reste — imprévu par construction | `ERROR` + `exc_info` | **oui** | `<Type> : <msg>`, 500 |
| **Best-effort** | export, écriture en base, vignette : conçus non bloquants | `WARNING` | non | rien |

Une pile sur « ComfyUI est éteint » est du bruit ; son absence sur un
`KeyError` inattendu est une enquête perdue. C'est toute la différence
que cette table achète.

## Le périmètre, en cinq étapes

1. **`AUTOMATION/logs.py`** — un module, `logging` de la bibliothèque
   standard, aucune dépendance ajoutée. `setup()` idempotent :
   `RotatingFileHandler` vers `PROD/_logs/soulglade.log` (1 Mo × 5,
   déjà couvert par `/PROD/` au `.gitignore`) + un handler console.
   Niveau lu depuis `SOULGLADE_LOG_LEVEL` via `env_config` (défaut
   `INFO`). Et `report(logger, exc, contexte)` : la table ci-dessus, en
   une fonction.
2. **Les deux seams.** `runner.log()` et `push_log()` passent au logger
   sans changer leur signature ni leurs 103 appels. `push_log` garde
   l'anneau d'écran — c'est le journal de l'utilisateur, il ne se
   confond pas avec celui du développeur. **Le format console reste
   `[HH:MM:SS] message`, à l'identique :** aucune régression visuelle
   dans la fenêtre de production. Le fichier, lui, porte le format
   complet (date, niveau, module).
3. **Les points d'entrée** appellent `setup()` : `web/app.py`,
   `runner/cli.py`. Uvicorn reçoit `log_config=None` — ses propres
   loggers remontent alors dans les nôtres au lieu d'écrire à côté.
4. **La classification câblée** aux quatre endroits qui attrapent large :
   les handlers d'`api/errors.py`, le `except` de job perdu dans
   `execute_jobs`, le `_launch` de `services/batch.py`, et les `except`
   best-effort (export, `ecrire_en_base`).
5. **Les `print` de bibliothèque** deviennent des logs : `universe.py`,
   `worlds.py`, `comfy_server.py`, `comfy_provision.py`, `grain.py`,
   `qc_*.py`, `compose.py`, `base.py`.

**La frontière, écrite une fois pour toutes : un outil en ligne de
commande imprime, une bibliothèque logge.** `wf_check.py`,
`env_config --diagnostic`, `tools/*`, le plan de `--dry-run`, la
bannière d'URL de `web/app.py` et tout `tests/` gardent leurs `print` —
c'est leur sortie, pas un événement d'exécution. Convertir ça serait du
churn qui casse des scripts pour zéro gain.

## Hors périmètre

- **JSON lines / log structuré machine.** Personne n'agrège ces logs :
  un poste, un utilisateur, un fichier relu à l'œil. À rouvrir le jour
  où quelque chose les lit.
- **Toute dépendance** (`structlog`, `loguru`, `rich`) — `logging` et
  `logging.handlers` couvrent les trois demandes.
- **Identifiant de corrélation par requête**, envoi distant, télémétrie.
- **Refonte des codes HTTP** et de la forme `{ok, erreur}` : intouchés.
- **Logs du frontend** — autre chantier, autre runtime.
- **Réécriture des `print` de CLI et de tests** (voir la frontière).

## Critère de sortie

- Un lot lancé depuis le studio laisse dans `PROD/_logs/soulglade.log`
  la trace de son démarrage, de chaque image et de sa fin ; la fenêtre
  console dit exactement ce qu'elle disait avant.
- Une exception non prévue dans une route laisse **sa pile complète**
  dans le fichier, et un refus de requête n'en laisse pas.
- `SOULGLADE_LOG_LEVEL=DEBUG` change ce qui est écrit, sans changer une
  ligne de code.
- Le fichier tourne : au-delà de la taille fixée, un `.1` apparaît et le
  courant repart de zéro.
- `AUTOMATION/tests/test_logs.py` couvre l'idempotence de `setup()`, le
  niveau lu depuis l'environnement et les quatre lignes de la table de
  classification. Les tests des modules touchés (`test_serveur_http.py`,
  `test_execute_jobs_*.py`) restent verts.
- `.claude/rules/backend.md` § « Erreurs et logs » cesse d'énoncer une
  intention et décrit ce qui existe ; `.env.example` porte la variable.

## Note d'implémentation, le même jour

Trois écarts entre le périmètre écrit ci-dessus et ce qui a été livré,
constatés en ouvrant les fichiers.

1. **L'étape 5 était plus petite que prévu.** Les 16 `print` d'
   `universe.py` et les 12 de `worlds.py` vivent tous dans leur
   `_diagnostic()` — un outil en ligne de commande, donc du côté « un
   outil imprime » de la frontière. Idem pour `grain`, `qc_*`, `compose`,
   `base` : tous leurs `print` sont sous `if __name__ == "__main__"`. Il
   ne restait que deux vrais `print` de bibliothèque, les `_say()` de
   `comfy_server.py` et `comfy_provision.py`, tous deux injectables par
   `log=` et déjà uniques dans leur module. Ils sont convertis ; le reste
   est resté, et la frontière est désormais écrite dans
   `.claude/rules/backend.md`.
2. **Un trou trouvé en route, non prévu au cadrage :
   `ss.bad_request()`** — le chemin de refus le plus emprunté du serveur
   — n'écrivait strictement nulle part. L'écran disait « non » et il ne
   restait rien pour savoir à quelle requête. Il journalise maintenant en
   `WARNING`, sans rien changer au corps rendu. La fumigation HTTP le
   montre : six refus nommés là où le fichier était vide.
3. **La console du serveur web parle un peu plus qu'avant.** Le journal
   de l'utilisateur (`push_log`) y apparaît désormais, alors qu'il ne
   sortait que dans la page. La fenêtre de production CLI, elle, est
   identique au caractère près. C'est un choix : un lot qui casse ne doit
   pas obliger à avoir l'écran ouvert pour savoir ce qui s'est passé.
