"""Base SQLite : historique, mesures et embeddings de la production.

CE QUI VA EN BASE, CE QUI RESTE EN FICHIER

  fichier (git)   scenes.json, creative.json, config.json — du contenu redige par
                  un humain. On veut le diff, la relecture et le .bak.
  base            l'historique, les mesures, les embeddings, et la config
                  EFFECTIVE de chaque batch : c'est ca, la reproductibilite.

Le journal CSV continue d'etre ecrit : il reste lisible dans un tableur et hors de
tout outil. Mais la base devient la source de verite pour ce qui se lit.

POURQUOI PAS UN ORM. Une dependance de plus dans un Python embarque, pour cinq
tables et des requetes courtes, ne paie pas. `sqlite3` est dans la bibliotheque
standard et le schema tient dans cette page.

CONCURRENCE. Le batch ecrit pendant que le tableau de bord lit. WAL le permet, a
condition que personne ne garde une transaction ouverte : toutes les fonctions ici
ouvrent, font, commitent.

`ouvrir()` rend une connexion qui se ferme VRAIMENT a la sortie du bloc `with`
(voir _Connexion). Le gestionnaire de contexte de sqlite3, lui, ne gere que la
transaction : il commite ou annule, il ne ferme pas. Le comptage de references
de CPython s'en chargeait des que la variable etait rebindee — donc rien ne
fuyait vraiment — mais une connexion encore REFERENCEE garde la base ouverte, et
sous Windows cela bloque toute operation de fichier dessus.
"""
import json
import sqlite3
import sys
from datetime import datetime
from pathlib import Path

HERE = Path(__file__).resolve().parent
OFM = HERE.parent
FICHIER = OFM / "PROD" / "soulglade.db"

SCHEMA = """
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS batch (
  id           TEXT PRIMARY KEY,
  character_id TEXT NOT NULL,
  debut        TEXT,
  fin          TEXT,
  params_json  TEXT,          -- config EFFECTIVE, figee au lancement
  backend      TEXT DEFAULT 'local'
);

-- character_id : axe personnage (J2), obligatoire, plus aucun defaut
-- (2026-09-01). Distinct de `espace`, qui reste l'axe SFW/NSFW — celui-ci
-- garde 'lena' comme valeur historique de sa branche SFW (vocabulaire de la
-- base, pas un personnage), a ne pas confondre pour autant (voir ADR a venir).
CREATE TABLE IF NOT EXISTS image (
  id           INTEGER PRIMARY KEY,
  character_id TEXT NOT NULL,
  fichier      TEXT NOT NULL,
  batch_id     TEXT,
  espace       TEXT DEFAULT 'lena',   -- lena | nsfw
  bucket       TEXT,
  scene        TEXT,
  intention    TEXT,
  ton          TEXT,
  intensite    INTEGER,
  format       TEXT,
  seed         INTEGER,
  variante     TEXT,
  prompt       TEXT,
  cree_le      TEXT,
  duree_s      REAL,
  export       TEXT,
  source       TEXT,          -- image dont celle-ci derive (branche NSFW)
  role         TEXT,                   -- 'reference' pour le corpus de realisme
  lora_identite TEXT                   -- LoRA d'identite applique : DERIVED si non nul
);
-- Remplace l'ancien UNIQUE(fichier) : deux personnages peuvent produire un
-- fichier de meme nom sans collision.
CREATE UNIQUE INDEX IF NOT EXISTS idx_image_unique ON image(character_id, fichier);
CREATE INDEX IF NOT EXISTS idx_image_scene  ON image(scene);
CREATE INDEX IF NOT EXISTS idx_image_bucket ON image(bucket);

CREATE TABLE IF NOT EXISTS score (
  image_id  INTEGER NOT NULL REFERENCES image(id) ON DELETE CASCADE,
  genre     TEXT NOT NULL,            -- identite | nettete | texture_visage | ...
  valeur    REAL,
  mesure_le TEXT,
  PRIMARY KEY (image_id, genre)
);

-- Jugements humains. TROIS AXES INDEPENDANTS, jamais fondus : `flag` est le
-- GOUT (« convaincante comme photographie »), `anatomie` et `mains_juge` sont
-- des DEFAUTS OBJECTIFS (PROJET.md, amendement du 07/09). Une image peut etre
-- convaincante ET avoir une main a six doigts ; les melanger fausserait la
-- bande de realisme, qui s'etalonne sur flag == 'ok', et la file
-- d'entrainement, qui ecarte le defaut objectif sans jamais arbitrer le gout.
CREATE TABLE IF NOT EXISTS jugement (
  image_id   INTEGER PRIMARY KEY REFERENCES image(id) ON DELETE CASCADE,
  flag       TEXT,                    -- ok | ia          (gout)
  juge_le    TEXT,
  anatomie   TEXT,                    -- ok | ko | na     (defaut objectif)
  mains_juge TEXT                     -- ok | ko | na     (defaut objectif)
);

CREATE TABLE IF NOT EXISTS embedding (
  image_id INTEGER PRIMARY KEY REFERENCES image(id) ON DELETE CASCADE,
  modele   TEXT,
  dim      INTEGER,
  vec      BLOB                       -- float32 empaquete
);

-- Jeux de reference d'identite, versionnes : on peut revenir en arriere, et on
-- sait toujours contre quoi une image a ete mesuree.
CREATE TABLE IF NOT EXISTS reference_set (
  id           INTEGER PRIMARY KEY,
  character_id TEXT NOT NULL,
  libelle      TEXT,
  cree_le      TEXT,
  actif        INTEGER DEFAULT 0,
  sante        REAL,                  -- RAPPORT : voir construire_jeu
  sante_abs    REAL,                  -- cos(centroide, base gelee), brut
  cohesion     REAL,                  -- cos(centroide, membres) : coherence interne
  modele       TEXT                   -- modele d'embedding des membres, jamais melange
);
CREATE TABLE IF NOT EXISTS reference_member (
  set_id   INTEGER NOT NULL REFERENCES reference_set(id) ON DELETE CASCADE,
  image_id INTEGER NOT NULL REFERENCES image(id) ON DELETE CASCADE,
  PRIMARY KEY (set_id, image_id)
);

-- Banc de comparaison de variantes (J8.5, capacite de plateforme, ADR-0021).
-- TROIS TABLES SEPAREES de image/score/batch, jamais une reutilisation taguee :
-- un banc ne doit rien risquer pour ce qui lit image/score en supposant que
-- ca ne contient QUE de la vraie production (test_coherence_base.py,
-- reference_set/reference_member). La mesure elle-meme (checker.mesure,
-- qc_realisme.mesure) reste la MEME fonction ; seule la persistance change
-- de table quand `execute_jobs` recoit un `sink` (AUTOMATION/runner/sortie.py).
CREATE TABLE IF NOT EXISTS bench_run (
  id           TEXT PRIMARY KEY,
  character_id TEXT NOT NULL,
  axis         TEXT NOT NULL,
  scene        TEXT,
  cree_le      TEXT,
  seeds_json   TEXT              -- liste des seeds, fixee a la creation du banc
);

CREATE TABLE IF NOT EXISTS bench_variant (
  id            INTEGER PRIMARY KEY,
  bench_run_id  TEXT NOT NULL REFERENCES bench_run(id) ON DELETE CASCADE,
  label         TEXT NOT NULL,
  batch_id      TEXT,            -- le batch_id passe a execute_jobs pour cette variante
  override_json TEXT,            -- {"axis": ..., "value": ...} — un seul axe (bench.py)
  est_reference INTEGER DEFAULT 0
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_bench_variant_unique
  ON bench_variant(bench_run_id, label);

CREATE TABLE IF NOT EXISTS bench_score (
  variant_id INTEGER NOT NULL REFERENCES bench_variant(id) ON DELETE CASCADE,
  seed       INTEGER NOT NULL,
  genre      TEXT NOT NULL,      -- identite | nettete | texture_visage | ... (comme score.genre)
  valeur     REAL,
  fichier    TEXT,
  PRIMARY KEY (variant_id, seed, genre)
);
"""

# Seuil de sante du centroide, en RAPPORT et non en valeur absolue.
#
# Correction du 24/08/2026. La spec fixait « cos(centroide, base gelee) >= 0.95 ».
# Mesure faite : les membres eligibles sont a 0.764 de la base en moyenne, et leur
# centroide a 0.815. Un centroide d'images situees a 0.76 ne PEUT PAS etre a 0.95
# d'elle — le seuil etait arithmetiquement inatteignable, il gelait le jeu quoi
# qu'il arrive.
#
# Le bon test est relatif : le centroide s'eloigne-t-il PLUS que ses membres ? Non,
# normalement il s'en rapproche, la moyenne annulant le bruit propre a chaque image
# (ici 0.815 contre 0.764, rapport 1.07). Un rapport qui passe SOUS 1 veut dire que
# les membres derivent dans une direction COMMUNE — c'est ca, la derive du
# thermometre, et c'est ca qu'on veut attraper.
SANTE_MINI = 0.98

# Modele d'embedding par defaut : celui que qc_identity produit (InsightFace
# antelopev2, 512d). Nomme ici parce qu'un jeu de reference ne melange jamais
# deux modeles — deux espaces vectoriels differents ne se comparent pas — et que
# la valeur doit donc etre la MEME a l'ecriture (enregistrer_embedding) et a la
# lecture (construire_jeu). Le jour ou un pack apporte une autre mesure, c'est
# ce parametre qui change, pas un litteral disperse.
MODELE_EMBEDDING = "antelopev2"


class _Connexion(sqlite3.Connection):
    """Connexion qui se ferme a la sortie du bloc `with`.

    sqlite3 ne le fait pas : son `__exit__` termine la transaction et s'arrete
    la. Tous les appelants du depot ecrivent `with base.ouvrir() as cx:` et ne
    se servent pas de `cx` apres le bloc — verifie le 25/08/2026.
    """

    def __exit__(self, *args):
        try:
            return super().__exit__(*args)
        finally:
            self.close()


# Colonnes ajoutees APRES coup, sur une base qui existe deja.
#
# `CREATE TABLE IF NOT EXISTS` ne fait rien sur une table presente : il ne voit
# pas qu'une colonne manque. Tant que la base se reconstruisait (migrer_base.py,
# J1), le probleme ne se posait pas ; depuis qu'elle EST la source de verite, une
# colonne neuve ne peut arriver que par un ALTER. Idempotent, appele a chaque
# ouverture : le cout est une lecture de PRAGMA, et la base se repare seule.
COLONNES_AJOUTEES = (
    # LoRA d'identite REELLEMENT applique a cette image, NULL sinon. C'est la
    # provenance du mecanisme d'identite (2026-09-10) : une image DERIVED est
    # exactement une image dont cette colonne n'est pas nulle. Sans elle, rien
    # en base ne dit qu'une image sort d'un modele derive -- et une sortie de
    # LoRA v1 pouvait redevenir en silence une donnee d'origine pour v2.
    ("image", "lora_identite", "TEXT"),
    # Modele d'embedding des membres du jeu. Un cosinus entre deux espaces ne
    # veut rien dire : un jeu ne melange jamais deux modeles, comme il ne
    # melange jamais deux personnages.
    ("reference_set", "modele", "TEXT"),
    # Etiquettes de corpus (mesures.ETIQUETTES, P4.5.1), montees en base le
    # 2026-09-10. Elles ne vivaient que dans mesures.json, et poser_etiquette
    # disait pourquoi : « la table jugement est mono-colonne [...] migrer le
    # jour ou une SECONDE LECTURE le demande ». La file d'entrainement est
    # cette seconde lecture. Faire decider une admission depuis un store JSON
    # pendant que le reste du mecanisme est en SQL, c'est reinstaller « deux
    # stores, une verite » -- la faute qui a coute deux corrections cette
    # semaine.
    ("jugement", "anatomie", "TEXT"),
    ("jugement", "mains_juge", "TEXT"),
)


def _ajouter_colonnes(cx):
    for table, nom, decl in COLONNES_AJOUTEES:
        presentes = {d[1] for d in cx.execute(f"PRAGMA table_info({table})")}
        if nom not in presentes:
            cx.execute(f"ALTER TABLE {table} ADD COLUMN {nom} {decl}")


def ouvrir():
    FICHIER.parent.mkdir(parents=True, exist_ok=True)
    cx = sqlite3.connect(FICHIER, timeout=10, factory=_Connexion)
    cx.row_factory = sqlite3.Row
    cx.executescript(SCHEMA)
    _ajouter_colonnes(cx)
    return cx


# ------------------------------------------------------------------- ecriture
def enregistrer_image(cx, fichier, character_id, **champs):
    """Insere ou met a jour une image par (character_id, fichier). Retourne son id.

    `character_id` fait partie de l'identite de la ligne (cle composite avec
    `fichier`, voir idx_image_unique) — ce n'est pas un champ modifiable comme
    les autres, d'ou un parametre a part plutot qu'une entree de `colonnes`.
    Obligatoire, plus de defaut (2026-09-01) — tout appelant le passe.
    """
    colonnes = ("batch_id", "espace", "bucket", "scene", "intention", "ton",
                "intensite", "format", "seed", "variante", "prompt", "cree_le",
                "duree_s", "export", "source", "role", "lora_identite")
    vals = {k: champs.get(k) for k in colonnes}
    cx.execute("INSERT INTO image (character_id, fichier) VALUES (?, ?) "
               "ON CONFLICT(character_id, fichier) DO NOTHING",
               (character_id, fichier))
    sets = ", ".join(f"{k} = COALESCE(?, {k})" for k in colonnes)
    cx.execute(f"UPDATE image SET {sets} WHERE character_id = ? AND fichier = ?",
               [vals[k] for k in colonnes] + [character_id, fichier])
    return cx.execute("SELECT id FROM image WHERE character_id = ? AND fichier = ?",
                      (character_id, fichier)).fetchone()[0]


def renommer(cx, ancien, nouveau, character_id):
    """Suit un fichier renomme. Le tri renomme en cas de collision d'homonymes
    (voir runner.nom_libre) : sans ca la ligne reste sur l'ancien nom, et la
    suivante en cree une seconde pour la meme image."""
    if ancien == nouveau:
        return
    cx.execute("UPDATE image SET fichier = ? WHERE character_id = ? AND fichier = ?",
               (nouveau, character_id, ancien))


def enregistrer_score(cx, image_id, genre, valeur, mesure_le=None):
    if valeur is None:
        return
    cx.execute("INSERT INTO score (image_id, genre, valeur, mesure_le) VALUES (?,?,?,?) "
               "ON CONFLICT(image_id, genre) DO UPDATE SET valeur=excluded.valeur, "
               "mesure_le=excluded.mesure_le",
               (image_id, genre, float(valeur),
                mesure_le or datetime.now().isoformat(timespec="seconds")))


def enregistrer_jugement(cx, image_id, flag, juge_le=None):
    """Le GOUT de l'utilisateur. Retirer un flag n'efface pas les etiquettes.

    Cette fonction supprimait la ligne entiere quand `flag` etait None. C'etait
    sans consequence tant que la ligne ne portait que le flag ; depuis que les
    etiquettes objectives partagent la table (10/09), effacer la ligne
    emporterait un jugement d'anatomie que personne n'a demande a retirer. On
    ne vide donc que la colonne, et la ligne ne part que si elle ne dit plus
    rien du tout.
    """
    if flag is None:
        cx.execute("UPDATE jugement SET flag = NULL, juge_le = NULL "
                   "WHERE image_id = ?", (image_id,))
        cx.execute("DELETE FROM jugement WHERE image_id = ? AND flag IS NULL "
                   "AND anatomie IS NULL AND mains_juge IS NULL", (image_id,))
        return
    cx.execute("INSERT INTO jugement (image_id, flag, juge_le) VALUES (?,?,?) "
               "ON CONFLICT(image_id) DO UPDATE SET flag=excluded.flag, "
               "juge_le=excluded.juge_le",
               (image_id, flag, juge_le or datetime.now().isoformat(timespec="seconds")))


# Axes de defaut OBJECTIF portes par la table `jugement`, avec leur vocabulaire.
# La liste est ici parce que c'est la base qui la contraint ; `mesures.ETIQUETTES`
# reste la definition cote store, et les deux doivent rester d'accord (verrouille
# par test_etiquettes_corpus.py).
ETIQUETTES_BASE = {"anatomie": ("ok", "ko", "na"),
                   "mains_juge": ("ok", "ko", "na")}


def enregistrer_etiquette(cx, image_id, champ, valeur):
    """Etiquette de defaut objectif. `valeur=None` retire l'etiquette.

    Colonne en liste blanche : le nom entre dans le SQL, il ne vient jamais
    d'un appelant sans controle.
    """
    if champ not in ETIQUETTES_BASE:
        raise ValueError(f"axe d'etiquette inconnu en base : {champ!r}")
    if valeur is not None and valeur not in ETIQUETTES_BASE[champ]:
        raise ValueError(f"etiquette {champ} inconnue : {valeur!r}")
    cx.execute(f"INSERT INTO jugement (image_id, {champ}) VALUES (?,?) "
               f"ON CONFLICT(image_id) DO UPDATE SET {champ}=excluded.{champ}",
               (image_id, valeur))
    cx.execute("DELETE FROM jugement WHERE image_id = ? AND flag IS NULL "
               "AND anatomie IS NULL AND mains_juge IS NULL", (image_id,))


# ------------------------------------------------------ banc (J8.5, ADR-0021)
def bench_creer_run(cx, run_id, character_id, axis, scene, seeds):
    """Idempotent (ON CONFLICT DO NOTHING) : rejouer le meme run_id ne
    duplique rien, les seeds restent celles de la premiere creation."""
    cx.execute(
        "INSERT INTO bench_run (id, character_id, axis, scene, cree_le, seeds_json) "
        "VALUES (?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING",
        (run_id, character_id, axis, scene,
         datetime.now().isoformat(timespec="seconds"), json.dumps(list(seeds))))


def bench_fichiers(cx, bench_run_id):
    """(label, seed, fichier) des images d'un banc, une par (variante, seed).
    C'est la base qui dit ce qui APPARTIENT au banc, pas le contenu du dossier :
    une reprise, ou deux processus lances sur le meme banc, y laissent des
    images de plus qui ne sont citees par aucun score."""
    return cx.execute(
        "SELECT DISTINCT v.label, s.seed, s.fichier "
        "FROM bench_variant v JOIN bench_score s ON s.variant_id = v.id "
        "WHERE v.bench_run_id = ? AND s.fichier IS NOT NULL "
        "ORDER BY v.est_reference DESC, v.label, s.seed",
        (bench_run_id,)).fetchall()


def bench_run_seeds(cx, bench_run_id):
    """Les seeds enregistrees a la creation d'un banc, ou None si ce banc
    n'existe pas. Sert a la reprise : c'est le run qui fait foi, jamais
    l'appelant (voir bench.run_bench)."""
    r = cx.execute("SELECT seeds_json FROM bench_run WHERE id = ?",
                   (bench_run_id,)).fetchone()
    return json.loads(r["seeds_json"]) if r else None


def bench_enregistrer_variante(cx, bench_run_id, label, batch_id, override,
                               est_reference=False):
    """Insere ou met a jour une variante par (bench_run_id, label). Retourne
    son id."""
    cx.execute(
        "INSERT INTO bench_variant (bench_run_id, label, batch_id, override_json, "
        "est_reference) VALUES (?,?,?,?,?) "
        "ON CONFLICT(bench_run_id, label) DO UPDATE SET batch_id=excluded.batch_id, "
        "override_json=excluded.override_json, est_reference=excluded.est_reference",
        (bench_run_id, label, batch_id, json.dumps(override), int(bool(est_reference))))
    return cx.execute(
        "SELECT id FROM bench_variant WHERE bench_run_id = ? AND label = ?",
        (bench_run_id, label)).fetchone()[0]


def bench_enregistrer_score(cx, variant_id, seed, genre, valeur, fichier=None):
    if valeur is None:
        return
    cx.execute(
        "INSERT INTO bench_score (variant_id, seed, genre, valeur, fichier) "
        "VALUES (?,?,?,?,?) ON CONFLICT(variant_id, seed, genre) "
        "DO UPDATE SET valeur=excluded.valeur, fichier=excluded.fichier",
        (variant_id, seed, genre, float(valeur), fichier))


def bench_scores(cx, bench_run_id):
    """Toutes les lignes (label, est_reference, seed, genre, valeur) d'un
    banc — prete a agreger cote appelant (AUTOMATION/bench.py), cette
    fonction ne calcule aucune moyenne elle-meme."""
    return cx.execute(
        "SELECT v.label, v.est_reference, s.seed, s.genre, s.valeur "
        "FROM bench_variant v JOIN bench_score s ON s.variant_id = v.id "
        "WHERE v.bench_run_id = ? ORDER BY v.est_reference DESC, v.label, s.genre, s.seed",
        (bench_run_id,)).fetchall()


def enregistrer_embedding(cx, image_id, vecteur, modele=MODELE_EMBEDDING):
    """vecteur : numpy float32. Stocke tel quel, pour re-scorer sans relire le PNG."""
    if vecteur is None:
        return
    import numpy as np
    v = np.asarray(vecteur, dtype=np.float32)
    cx.execute("INSERT INTO embedding (image_id, modele, dim, vec) VALUES (?,?,?,?) "
               "ON CONFLICT(image_id) DO UPDATE SET modele=excluded.modele, "
               "dim=excluded.dim, vec=excluded.vec",
               (image_id, modele, int(v.size), v.tobytes()))


def lire_embedding(cx, image_id):
    import numpy as np
    r = cx.execute("SELECT vec FROM embedding WHERE image_id = ?", (image_id,)).fetchone()
    return np.frombuffer(r["vec"], dtype=np.float32) if r else None


# ------------------------------------------------------------------- lecture
def stats_par_scene(cx, character_id):
    """n, ok et moyenne d'identite par scene. Remplace le parcours du CSV.

    `ok` compte le TRI HUMAIN, pas le verdict du QC : `image.bucket` est ecrit a
    la generation puis mis a jour a chaque action de tri (web.app.noter_bucket).
    Avant le 25/08/2026 il n'etait ecrit qu'a la generation, et le badge
    « n produites · ok » des cartes de scene affichait donc un chiffre que le tri
    ne pouvait plus corriger : une image rejetee a la main y comptait encore
    comme validee.

    `character_id` obligatoire (J2, CLAUDE.md §11) : sans lui, deux personnages
    partageant une scene de meme id verraient leurs stats melangees.
    """
    q = """
      SELECT i.scene AS scene, COUNT(*) AS n,
             SUM(CASE WHEN i.bucket = 'OK' THEN 1 ELSE 0 END) AS ok,
             AVG(s.valeur) AS avg
      FROM image i
      LEFT JOIN score s ON s.image_id = i.id AND s.genre = 'identite'
      WHERE i.character_id = ? AND i.scene IS NOT NULL AND i.role IS NULL
            AND i.espace = 'lena'
      GROUP BY i.scene
    """
    return {r["scene"]: {"n": r["n"], "ok": r["ok"] or 0,
                         "avg": round(r["avg"], 3) if r["avg"] is not None else None}
            for r in cx.execute(q, (character_id,))}


def mesures_par_fichier(cx, character_id, role=None):
    """{fichier: {identite, nettete, ..., flag, anatomie, mains_juge, role}}
    — forme du store JSON, pour UN personnage.

    LES TROIS AXES DE JUGEMENT, pas seulement le flag. Cette fonction ne
    rendait que `flag` : tant qu'elle ne servait qu'aux tests, l'absence
    d'`anatomie` et de `mains_juge` ne se voyait pas. Depuis que la Revue lit
    ses mesures ici (20/09), les taire ferait disparaitre de l'ecran deux
    colonnes que l'utilisateur a saisies a la main.
    """
    where = "i.character_id = ? AND i.role IS ?" if role is None else \
        "i.character_id = ? AND i.role = ?"
    out = {}
    for r in cx.execute(f"SELECT id, fichier, role FROM image i WHERE {where}",
                        (character_id, role)):
        e = {"role": r["role"]} if r["role"] else {}
        for s in cx.execute("SELECT genre, valeur FROM score WHERE image_id = ?", (r["id"],)):
            e[s["genre"]] = s["valeur"]
        j = cx.execute("SELECT flag, anatomie, mains_juge FROM jugement "
                       "WHERE image_id = ?", (r["id"],)).fetchone()
        for champ in ("flag", "anatomie", "mains_juge"):
            if j and j[champ]:
                e[champ] = j[champ]
        out[r["fichier"]] = e
    return out


def fichiers_connus(cx):
    """Tous les noms de fichiers que la base connait, quel que soit le
    personnage.

    Sert a distinguer « la base ignore cette image » de « cette image est
    celle d'un AUTRE personnage ». Le store JSON, lui, est indexe par nom nu :
    sans cette distinction, le repli sur le store rendrait les mesures du
    voisin des que deux personnages produisent le meme nom
    (DOCS/cadrage/2026-09-20-mesures-par-personnage.md).
    """
    return {r["fichier"] for r in cx.execute("SELECT DISTINCT fichier FROM image")}


def oublier_scores(cx, character_id, fichier, genres):
    """Efface des scores d'UNE image, sans toucher au jugement humain.

    Pendant en base de `mesures.demesurer` : ecraser les pixels d'une image
    perime ses mesures, et un badge qui ment est un bug. Tant que la Revue
    lisait le store JSON, l'effacer la-bas suffisait ; depuis qu'elle lit la
    base, une mesure laissee ici survivrait a l'ecrasement.
    """
    ligne = cx.execute("SELECT id FROM image WHERE character_id = ? AND fichier = ?",
                       (character_id, fichier)).fetchone()
    if not ligne:
        return 0
    marques = ",".join("?" * len(genres))
    cur = cx.execute(f"DELETE FROM score WHERE image_id = ? AND genre IN ({marques})",
                     [ligne["id"], *genres])
    return cur.rowcount


def derive_par_scene(cx, character_id, genre="identite", mini=3):
    """Moyenne d'identite par scene, du plus ancien au plus recent.

    C'est ce que la base rend possible et que le CSV ne rendait pas : suivre la
    derive lente d'une scene dans le temps sans relire une seule image.
    """
    q = """
      SELECT i.scene AS scene, i.cree_le AS date, s.valeur AS v
      FROM image i JOIN score s ON s.image_id = i.id AND s.genre = ?
      WHERE i.character_id = ? AND i.scene IS NOT NULL AND i.role IS NULL
            AND i.espace = 'lena'
      ORDER BY i.scene, i.cree_le
    """
    par = {}
    for r in cx.execute(q, (genre, character_id)):
        par.setdefault(r["scene"], []).append((r["date"], r["v"]))
    return {k: v for k, v in par.items() if len(v) >= mini}


# ------------------------------------------- jeu de reference d'identite
def centroide(cx, set_id):
    """Moyenne normalisee des embeddings d'un jeu. None si le jeu est vide."""
    import numpy as np
    vecs = [np.frombuffer(r["vec"], dtype=np.float32) for r in cx.execute(
        "SELECT e.vec FROM embedding e JOIN reference_member m ON m.image_id = e.image_id "
        "WHERE m.set_id = ?", (set_id,))]
    if not vecs:
        return None
    c = np.mean(np.stack(vecs), axis=0)
    n = np.linalg.norm(c)
    return (c / n) if n > 1e-6 else None


def construire_jeu(cx, character_id, base_embedding, seuil_haut, libelle=None,
                   seuil_gabarit=None, modele=MODELE_EMBEDDING):
    """Construit un jeu de reference d'identite et rend son bilan.

    L'ANCRE N'EST PAS LE GABARIT, et c'est le coeur de cette fonction.
    L'ancre (base gelee) dit QUI est le personnage : elle ne bouge jamais et
    reste le juge. Le gabarit dit CONTRE QUOI on mesure : c'est le centroide du
    jeu actif, et il est versionne, pas gele. Verdict de la phase de recherche
    du 2026-09-09 (DOCS/recherche/2026-09-09-l-ancre-n-est-pas-le-gabarit.md) :
    une photographie unique et figee est une reference HORS DISTRIBUTION de la
    production qu'on lui compare. Mesure : les 29 images qui portaient un
    embedding scoraient TOUTES plus haut contre leurs pairs que contre leur
    ancre, et la marge personnage/etranger d'Abyssiaelle passe de +0.05 a
    +0.349.

    LES GARDE-FOUS, tous appliques ici :

    1. la base gelee reste l'ancre absolue, elle n'est jamais remplacee ;
    2. une image ne rejoint le jeu que si elle passe le PORTILLON :
       - contre le GABARIT (cos >= seuil_gabarit) des qu'un jeu actif existe et
         qu'un seuil est configure — c'est la voie normale ;
       - contre l'ANCRE (cos >= seuil_haut) sinon : c'est l'AMORCAGE, ce qui
         tourne au premier jour d'un personnage, quand aucun gabarit n'existe.
       Le portillon ne s'ouvre jamais tout seul : le jeu qu'il alimente est
       juge par l'ancre au garde-fou 3, et desactive s'il derive ;
    3. la sante du jeu, cos(centroide, base gelee) RAPPORTEE a celle de ses
       membres, est calculee et stockee — le test est relatif, jamais absolu
       (correction du 24/08/2026) ;
    4. sous SANTE_MINI le jeu est cree mais laisse INACTIF : on le voit, on ne
       s'en sert pas ;
    5. les jeux sont versionnes — on peut revenir a un etat anterieur ;
    6. `character_id` obligatoire : un jeu de reference est propre a un
       personnage, jamais un melange d'embeddings de plusieurs personnages ;
    7. UN SEUL MODELE d'embedding par jeu. Un cosinus entre deux espaces ne veut
       rien dire : melanger deux modeles est la meme faute que melanger deux
       personnages, en moins visible.

    `seuil_gabarit` se lit dans CHARACTERS/<nom>/config.json (qc.threshold_gabarit,
    invariant 4). ABSENT = amorcage : jamais de valeur par defaut ici, le seuil
    se mesure par personnage (AUTOMATION/tests/calibrer_gabarit.py).
    """
    import numpy as np
    from datetime import datetime as _dt
    base_embedding = np.asarray(base_embedding, dtype=np.float32)

    # Le gabarit : centroide du jeu ACTIF, s'il y en a un et qu'il porte le meme
    # modele d'embedding. Comparer a un gabarit d'un autre espace serait pire que
    # ne pas en avoir.
    actif_avant = jeu_actif(cx, character_id)
    gabarit = None
    if (actif_avant and seuil_gabarit is not None
            and (actif_avant.get("modele") or modele) == modele):
        gabarit = centroide(cx, actif_avant["id"])
    voie = "gabarit" if gabarit is not None else "ancre"
    reference = gabarit if gabarit is not None else base_embedding
    seuil = seuil_gabarit if gabarit is not None else seuil_haut

    eligibles = []
    for r in cx.execute(
            "SELECT i.id AS id, e.vec AS vec FROM image i "
            "JOIN embedding e ON e.image_id = i.id "
            "WHERE i.character_id = ? AND i.espace = 'lena' AND i.role IS NULL "
            "AND e.modele = ?",                                  # garde-fou 7
            (character_id, modele)):
        v = np.frombuffer(r["vec"], dtype=np.float32)
        if float(np.dot(reference, v)) >= seuil:                 # garde-fou 2
            eligibles.append(r["id"])

    cur = cx.execute(
        "INSERT INTO reference_set (character_id, libelle, cree_le, actif, modele) "
        "VALUES (?,?,?,0,?)",
        (character_id, libelle or f"auto {_dt.now():%Y-%m-%d %H:%M}",
         _dt.now().isoformat(timespec="seconds"), modele))
    sid = cur.lastrowid
    cx.executemany("INSERT INTO reference_member (set_id, image_id) VALUES (?,?)",
                   [(sid, i) for i in eligibles])

    c = centroide(cx, sid)
    vecs = [np.frombuffer(r["vec"], dtype=np.float32) for r in cx.execute(
        "SELECT e.vec FROM embedding e JOIN reference_member m ON m.image_id = e.image_id "
        "WHERE m.set_id = ?", (sid,))]
    if c is None or not vecs:
        cx.execute("UPDATE reference_set SET actif = 0 WHERE id = ?", (sid,))
        return {"id": sid, "membres": 0, "sante": None, "sante_abs": None,
                "cohesion": None, "sim_membres": None, "actif": False,
                "seuil": seuil, "voie": voie, "modele": modele, "derives": 0}

    sante_abs = float(np.dot(base_embedding, c))
    sim_membres = float(np.mean([np.dot(base_embedding, v) for v in vecs]))
    cohesion = float(np.mean([np.dot(c, v) for v in vecs]))
    sante = sante_abs / sim_membres if sim_membres > 1e-6 else None   # garde-fou 3
    actif = 1 if (sante is not None and sante >= SANTE_MINI) else 0   # garde-fou 4
    cx.execute("UPDATE reference_set SET sante=?, sante_abs=?, cohesion=?, actif=? "
               "WHERE id = ?", (sante, sante_abs, cohesion, actif, sid))
    if actif:
        # Un seul jeu actif PAR PERSONNAGE : desactiver ceux du meme
        # character_id seulement, jamais ceux d'un autre personnage.
        cx.execute("UPDATE reference_set SET actif = 0 "
                   "WHERE id != ? AND character_id = ?", (sid, character_id))
    # Combien de membres sortent d'un modele derive (regle 6 du mecanisme) : ils
    # ont le droit d'etre la — ils sont dans les conditions de la production —
    # mais l'humain doit voir sur quoi son gabarit est bati.
    derives = cx.execute(
        "SELECT COUNT(*) FROM reference_member m JOIN image i ON i.id = m.image_id "
        "WHERE m.set_id = ? AND i.lora_identite IS NOT NULL", (sid,)).fetchone()[0]
    return {"id": sid, "membres": len(eligibles), "sante": sante,
            "sante_abs": sante_abs, "cohesion": cohesion,
            "sim_membres": sim_membres, "actif": bool(actif), "seuil": seuil,
            "voie": voie, "modele": modele, "derives": derives}


def jeu_actif(cx, character_id):
    r = cx.execute("SELECT * FROM reference_set WHERE actif = 1 AND character_id = ? "
                   "ORDER BY id DESC LIMIT 1", (character_id,)).fetchone()
    return dict(r) if r else None


def rescorer(cx, character_id, reference, genre="identite_centroide"):
    """Re-score l'historique d'UN personnage contre une reference, sans relire
    un seul PNG.

    C'est ce que les embeddings en base rendent possible : changer de seuil, de
    reference ou de ponderation devient une requete, pas un batch d'une heure.
    Ecrit sous un genre distinct — le score contre la base gelee n'est jamais
    ecrase, c'est lui qui decide du verdict (garde-fou 2).
    """
    import numpy as np
    reference = np.asarray(reference, dtype=np.float32)
    n = 0
    for r in cx.execute(
            "SELECT e.image_id AS image_id, e.vec AS vec FROM embedding e "
            "JOIN image i ON i.id = e.image_id WHERE i.character_id = ?",
            (character_id,)):
        v = np.frombuffer(r["vec"], dtype=np.float32)
        enregistrer_score(cx, r["image_id"], genre, float(np.dot(reference, v)))
        n += 1
    return n


def resume(cx):
    n = lambda t: cx.execute(f"SELECT COUNT(*) FROM {t}").fetchone()[0]
    return {t: n(t) for t in ("batch", "image", "score", "jugement", "embedding",
                              "reference_set")}


if __name__ == "__main__":
    with ouvrir() as cx:
        print(json.dumps(resume(cx), indent=2))
