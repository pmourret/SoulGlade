---
paths:
  - "AUTOMATION/**/*.py"
---

# Conventions backend de la plateforme

## Stack — et ce qu'on n'utilise volontairement pas

FastAPI + uvicorn (migration du 30/08/2026 ; c'était aiohttp avant, et
ce fichier annonçait Flask — voir AUDIT §0 et §7.6). SQLite en accès
direct (AUTOMATION/base.py). Pas d'ORM (SQLAlchemy ou autre), requêtes
SQL paramétrées à la main, pas de query builder.

Pydantic **est** utilisé, et seulement là où il a un sens : un schéma
par forme de payload réellement échangée, à la frontière HTTP. Pas de
schéma fourre-tout, et rien de déclaratif dans le cœur métier —
`AUTOMATION/runner/`, `identity/`, `base.py` ne connaissent ni HTTP ni
Pydantic. Deux règles qui ne se devinent pas :

- une réponse qui relaie un fichier que cette couche ne possède pas
  (`config.json`, une ligne de journal, un palier de `creative.json`)
  se déclare `extra="allow"` ou sans `response_model` : tronquer une
  clé inconnue casserait le front loin du changement ;
- une borne serveur qui **écrête** (`count`, `limit`, `lot`) ne devient
  jamais une contrainte `ge`/`le`. `count=9999` doit continuer à rendre
  200 avec un plan de 24 images, pas un refus.

**Un seul worker uvicorn.** `STATE`, `UNDO` et le QC d'identité en
cache sont des globales de process (`web/shared_state.py`). Le lanceur
passe l'objet application à `uvicorn.run`, ce qui rend `--workers > 1`
techniquement indisponible : un seul GPU, un seul batch.

**Mais le QC d'identité est en cache PAR PERSONNAGE**, et ça ne se
devine pas (09/09/2026). Il porte la base gelée *et* les seuils de son
personnage : un cache global unique mesurait tout le monde contre le
premier chargé — une image de Léna scorée 0,232 contre l'ancre
d'Abyssiaelle, soit la bande d'un visage étranger, et rangée en REJET.
`ss.checker_partage(configuration)` est le **seul** point d'accès : ne
jamais relire la globale `ss.CHECKER`, un contrôle d'ancre qui se
contourne ne sert à rien (`test_checker_par_personnage.py` verrouille
les deux). Même famille que le mélange de données entre personnages, et
la même parade : un test qui l'aurait détecté.

## Frontière des modules

AUTOMATION/ : un module = une responsabilité. Ne jamais y mettre de
logique métier de graphe ComfyUI — les réglages vivent dans
CHARACTERS/<nom>/config.json, les scènes dans scenes.json, jamais en dur
dans le code (invariant CLAUDE.md §8.4).

Découpage du backend web (ROADMAP.md, J2 ; routers inchangés par la
migration FastAPI) — une nouvelle route rejoint le router qui correspond
à sa responsabilité :
- api/routers/state — état du système, registres, fiche, journal
- api/routers/app — cycle de vie de ce serveur et de ComfyUI
- api/routers/bank — banque de scènes, taxonomie, composeur
- api/routers/images — images, miniatures, poses
- api/routers/production — lancement de génération, file de jobs
- api/routers/review — QC, revue, jugements, export
- api/routers/worlds — registre des mondes, scènes et tons d'un monde (ADR-0016, ADR-0027)
- api/routers/expression — aperçu non-destructif d'expression, plage d'un ton
- api/routers/photo_editor — persistance des calques de l'éditeur photo
  avancé (le compositing lui-même reste côté client, Canvas2D)
- api/routers/training — jeu d'entraînement d'un personnage : proposition,
  exports passés, export d'un dossier daté. N'entraîne jamais rien

**Une règle de dépendance, une seule** (31/08/2026) :

    routers  ->  services  ->  runner / base / shared_state

et jamais l'inverse. Un router lit la requête, appelle un service, et
traduit ce qu'il reçoit en code de statut. Un service ne connaît pas
`fastapi` : il refuse par `ss.bad_request()` et rend du Python nu. Un
modèle Pydantic peut le traverser (c'est la forme du payload, pas un
transport) ; une `JSONResponse` non — une fonction qui doit choisir un
403 reste dans le router.

- api/services/creative — règles des paliers d'intensité
- api/services/batch — superviseur de lot (un seul chemin de lancement)
- api/services/bank — validation de banque, backup, stats des cartes
- api/services/journal — ligne en base, export, journal NSFW du tri
- api/services/preview — aperçu de prompt et échos entre fragments
- api/services/worlds — validation des scènes et des tons d'un monde
- api/services/expression — résolution de photo, rendu d'aperçu, écriture
  de la plage d'un ton dans creative.json
- api/services/photo_editor — résolution de photo, lecture/écriture du
  sidecar `<nom>.layers.json`
- api/services/training — mise en forme de la proposition d'entraînement
  pour le fil, lecture des manifestes d'export, lancement de l'export

Le test d'une règle vise le service, jamais le router : c'est ce qui a
motivé la couche (`test_valider_banque.py` importait `api.routers.bank`
pour tester une fonction pure).

Ce qui met en forme un fragment de réponse pour UNE route reste dans le
router — descendre trois lectures en service serait de la cérémonie.

`web/app.py` ne fait que le démarrage ; l'assemblage vit dans
`api/main.py`, les gardes dans `api/security.py` et `api/errors.py`.

Même logique côté runner batch : prompt / comfy / sortie / cli.

## Accès base de données

Une seule base, schéma commun, character_id en clé (CLAUDE.md §7) —
jamais de connexion ou de fichier de base séparé par personnage. Toute
requête qui touche des données de personnage prend character_id en
paramètre explicite.

**Une colonne neuve passe par `base.COLONNES_AJOUTEES`** (10/09/2026).
`CREATE TABLE IF NOT EXISTS` ne voit pas qu'une colonne manque à une
table existante : tant que la base se reconstruisait, ça ne se voyait
pas ; depuis qu'elle **est** la source de vérité, seul un `ALTER` peut
l'ajouter. La liste est rejouée à chaque `ouvrir()`, la base se répare
seule.

**Un jeu de référence d'identité ne mélange jamais deux modèles
d'embedding**, comme il ne mélange jamais deux personnages. Un cosinus
entre deux espaces vectoriels ne veut rien dire — même famille de faute,
en beaucoup moins visible. `base.MODELE_EMBEDDING` nomme le modèle une
fois, à l'écriture comme à la lecture.

**Trois axes de jugement humain, jamais fondus** (10/09/2026). `flag`
(`ok`/`ia`) est le **goût** — « convaincante comme photographie » ;
`anatomie` et `mains_juge` (`ok`/`ko`/`na`) sont des **défauts
objectifs** (`PROJET.md`, amendement du 07/09). Les trois vivent dans la
table `jugement`, et dans `mesures.json` : `poser_flag` et
`poser_etiquette` écrivent les deux, la base étant la source de lecture.
Conséquence non évidente : retirer un `flag` ne supprime plus la ligne,
sinon il emporterait une étiquette que personne n'a demandé à retirer.

**Le goût ne ferme aucune porte automatique.** `AUTOMATION/entrainement.py`
écarte le défaut objectif et **jamais** `flag == 'ia'` : trier le réalisme
est un jugement que l'utilisateur final fait lui-même. Mesuré le 10/09,
c'est aussi sans conséquence — 0,1 σ d'écart d'identité entre les images
« ok » et « ia ». Le gabarit, lui, n'écarte même pas le défaut objectif :
une main cassée ne déforme pas un visage, et l'instrument de mesure veut
couvrir toute la production. **Gabarit et file d'entraînement sont deux
objets** ; les confondre ferait apprendre des mains cassées à un LoRA.

**Le gabarit ne filtre plus l'espace** (21/09). `construire_jeu` écartait
les images de la branche adulte (`i.espace = 'sfw'`) : elles montrent le même
visage et passent la même chaîne de mesures depuis le 20/09, les écarter
retirait de l'instrument une part de la production qu'il doit couvrir. Ce qui
filtre reste le portillon, le rôle, le modèle d'embedding et le personnage.
Même ouverture pour `stats_par_scene` et `derive_par_scene`, et le manifeste
d'un jeu exporté déclare donc l'espace de chaque image
(`DOCS/cadrage/2026-09-21-flux-nsfw.md`, arbitrage 2).

**L'ancre n'est pas le gabarit.** L'ancre (base gelée) dit *qui est* le
personnage : elle ne bouge jamais et reste le juge de la santé du jeu.
Le gabarit (centroïde du jeu actif) dit *contre quoi* on mesure : il est
versionné, et c'est lui que le portillon de `construire_jeu` interroge
dès qu'un `qc.threshold_gabarit` est configuré — sinon amorçage contre
l'ancre. Jamais de valeur par défaut pour ce seuil dans le code : il se
mesure par personnage (`AUTOMATION/tests/calibrer_gabarit.py`), un seuil
calibré contre l'ancre (~0,74) n'a aucun sens contre un gabarit (~0,93).
Détail dans `DOCS/cadrage/2026-09-09-lora-identite-par-personnage.md`.

## Configuration

Aucun seuil ni réglage en dur dans le code. Tout se lit depuis
CHARACTERS/<nom>/config.json via l'API (CLAUDE.md §8.4).

## Erreurs et logs

`AUTOMATION/logs.py` est le seul endroit où le logging se configure
(09/09/2026, `DOCS/cadrage/2026-09-09-logs-structures.md`). `logging` de
la bibliothèque standard, rien d'autre : un `RotatingFileHandler` vers
`LOGS/soulglade.log` (1 Mo × 5) et une console au format inchangé
`[HH:MM:SS] message`. Niveau lu depuis `SOULGLADE_LOG_LEVEL` (défaut
`INFO`). Un point d'entrée appelle `logs.setup()` ; sans lui un module
qui logge est muet, et c'est voulu — jamais de `LOGS/` créé parce qu'un
test a importé `runner`.

**Un outil imprime, une bibliothèque logge.** `wf_check.py`, `tools/*`,
`env_config --diagnostic`, les `_diagnostic()` de `universe`/`worlds`, le
plan de `--dry-run` et tout `tests/` gardent leurs `print` : cette sortie
EST leur résultat, pas un événement d'exécution.

**Deux journaux, deux publics.** `ss.push_log()` est celui de
l'utilisateur (anneau de 200 lignes, affiché à l'écran) ; il alimente
aussi le fichier. `runner.log()` est celui de la production. Ce sont les
deux seuls points de passage : les modifier structure 103 messages sans
toucher un appel.

**La classification décide du niveau et de la pile, jamais du code
HTTP** (`logs.report(logger, exc, contexte)`) :

| Famille | Ce que c'est | Niveau | Pile |
|---|---|---|---|
| Refus | `ValueError` et filles, `BadRequest` | `WARNING` | non |
| Environnement | `RuntimeError` et filles, `OSError` | `ERROR` | non |
| Bug | tout le reste, y compris `KeyError`/`TypeError` | `ERROR` | **oui** |
| Best-effort | export, base, vignette — non bloquants par conception | `WARNING` | non |

Une pile sur « ComfyUI est éteint » est du bruit ; son absence sur un
`KeyError` inattendu est une enquête perdue. Une erreur déjà passée par
`report()` se pousse à l'écran avec `push_log(msg, journal=False)` —
sinon elle s'écrit deux fois dans le fichier.

Une erreur remontée au frontend explicitement plutôt qu'un échec
silencieux ou un code 500 nu.

Toute réponse porte un corps JSON, succès comme échec — le front lit du
JSON sur chaque réponse quel que soit le statut. Une erreur a la forme
`{"ok": false, "erreur": "<texte français destiné à l'écran>"}` ;
`ss.bad_request()` est le point de passage. Les messages d'erreur restent
en français (ils s'affichent tels quels), le code reste en anglais.

## `run_in_executor` : attraper large, dans la route qui l'attend

Un appel bloquant (urllib vers ComfyUI, un import lourd type InsightFace)
tourne dans un executor (`await asyncio.get_running_loop().run_in_executor
(None, fonction, ...)`, voir `/api/pose/extract` et `/api/expression/
preview`) — jamais en direct dans un handler async, ça gèlerait tout le
serveur. Mais l'inverse compte tout autant : **la route qui l'attend doit
attraper elle-même toute exception possible**, pas seulement celle qu'elle
anticipe.

Incident réel (2026-09-03, `/api/expression/preview`) : une exception
imprévue (`ModuleNotFoundError` sur `cv2` absent) remontait non attrapée
jusqu'au handler générique de `api/errors.py` — et **la réponse
n'arrivait jamais**, ni son corps ni son statut, sous
`LocalOriginGuardMiddleware` (`BaseHTTPMiddleware` de Starlette a un défaut
documenté avec une exception d'exécuteur qui s'échappe de la route qui
l'attend). Confirmé en isolant : la requête SUIVANTE sur ce même serveur
restait bloquée aussi. `/api/pose/extract` n'a jamais eu ce problème parce
qu'il attrape déjà `pose_tools.ExtractionError` localement, sans jamais
laisser une exception de l'executor s'échapper de la route.

La règle : tout appel à `run_in_executor` se termine par un `except
Exception` large **dans la route**, en plus de l'exception précise
attendue, qui répond en JSON propre (`{"ok": false, "erreur": ...}`,
`ss.push_log` pour la trace) — jamais laissé retomber sur le handler
générique. Un test qui vérifie l'isolation entre deux personnages doit
aussi couvrir ce chemin d'erreur si la route en a un
(`test_expression_isolation.py` en donne l'exemple).

## Tests

- Toute route/fonction généralisée est accompagnée d'un test qui aurait
  détecté un mélange de données entre deux personnages
- L'assembleur de prompt d'un personnage est verrouillé par un test à
  l'octet près dès sa création (CLAUDE.md §8.3)
- Pas de commit sans lancer les tests du module touché

## Si le fichier touche un workflow ComfyUI

Voir le skill workflow-comfyui — le backend lit les workflows, ne les
réécrit jamais.
