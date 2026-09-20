# Les mesures d'une image appartiennent à un personnage

Cadrage (règle 3). Ouvert le 20/09 à la suite de l'audit d'agnosticisme
du corpus de réalisme, demandé par Pierre avant le commit du jour. Deux
des trois défauts relevés ce jour-là sont corrigés dans le même commit ;
celui-ci ne l'est pas, parce qu'il touche la clé d'un fichier de données
et tous ses lecteurs.

## Le constat

`PROD/mesures.json` est indexé par **nom de fichier nu**, sans champ
personnage. 117 entrées aujourd'hui, tous personnages confondus.

Or deux personnages peuvent légitimement produire le même nom de
fichier. Le nom de sortie est `categorie_scene_AAAAMMJJ_NN.png`
(`runner/sortie.py`, `sort_and_export`) et ne porte aucun jeton de
personnage ; `nom_libre` ne cherche un nom libre que dans les dossiers
de **ce** personnage, ce qui est cohérent avec le reste du dépôt :

- la base l'a explicitement acté — `CREATE UNIQUE INDEX
  idx_image_unique ON image(character_id, fichier)`, avec le commentaire
  « deux personnages peuvent produire un fichier de même nom sans
  collision » ;
- `shared_state.journal_index` filtre déjà le CSV par personnage, et sa
  docstring dit pourquoi.

Deux personnages d'un même monde héritent du même catalogue de scènes
(ADR-0019) : la collision n'est pas une hypothèse d'école, c'est une
question de date. Aujourd'hui elle ne s'est pas produite (97 fichiers
Léna, 9 Abyssiaelle, aucun nom commun).

Quand elle se produira, dans `mesures.json` : une seule entrée pour deux
images. La dernière mesure écrase l'autre, et le jugement porté sur
l'une s'affiche sur l'autre. Silencieusement. C'est exactement ce que le
script `tests/reparer_collisions.py` a déjà eu à réparer le 24/08, un
cran plus bas (deux dossiers d'un même personnage).

La Revue lit ce fichier, pas la base : `m = store.get(f.name, {})` pour
chaque vignette. Alors que `mesures.py` annonce depuis le 24/08 que « la
base est la source de vérité en lecture » et que ce store « reste écrit,
il est lisible sans outil et sert de repli ». La bascule a été faite à
l'écriture, jamais à la lecture.

## À quoi ça sert

Qu'aucune mesure ni aucun jugement d'un personnage ne puisse écraser ni
illustrer ceux d'un autre, et que la Revue lise enfin la source de
vérité annoncée. C'est la dernière pièce connue du bug d'isolation du
29/08, dont `bucket_dir`, `journal_index`, le checker par personnage et
les bandes d'étalonnage (20/09) sont les pièces déjà posées.

Pour qui : un utilisateur qui a **deux personnages**. Donc pour la cible
V1 dès sa deuxième création, et pour Pierre aujourd'hui, dont les deux
personnages ne se croisent que par chance de nommage.

## Hors périmètre

- **Renommer les fichiers de sortie ou changer `nom_libre`.** Rendre le
  nom unique entre personnages contredirait le choix acté dans le schéma
  de la base, et ne réparerait pas les données existantes.
- **Migrer la valeur `espace = 'lena'`** (vocabulaire SFW historique) :
  c'est la DoD d'IT-3e, pas celle-ci.
- **`mcp_server.mesures()`**, qui mélange lui aussi tous les personnages :
  le serveur MCP est entièrement codé sur « lena » par décision, et son
  ouverture est une entrée d'horizon.
- **Supprimer `mesures.json`.** Il reste écrit : c'est un repli lisible
  sans outil, et c'est le seul endroit où vit le corpus de réalisme, qui
  n'appartient à aucun personnage.
- Le contenu du corpus de réalisme lui-même (six images, dont quatre de
  Léna) : c'est une donnée de la machine de Pierre, pas du produit.

## Les étapes

1. La Revue lit les mesures d'une image depuis la base
   (`base.mesures_par_fichier(cx, character_id)` existe déjà et rend la
   forme du store), et retombe sur `mesures.json` seulement pour ce que
   la base n'a pas encore.
2. Le corpus de réalisme garde sa lecture depuis le store, par `role`,
   sans personnage : c'est sa nature.
3. Les écritures (`poser_flag`, `poser_etiquette`, `mesurer`) écrivent
   déjà les deux ; vérifier qu'aucune ne dépend de la clé nue pour
   retrouver une image, et sinon passer par `(character_id, fichier)`.
4. Décider du sort des 117 entrées existantes : migration vers une clé
   composée, ou statu quo assumé si plus rien ne les lit.

## Critère de sortie

Un test qui aurait détecté le mélange : deux personnages, **le même nom
de fichier**, deux mesures et deux jugements différents, et la Revue de
chacun qui affiche les siens. Aujourd'hui un tel test échoue.

Et : plus aucune lecture de mesure d'image par nom nu dans
`api/routers/`, hors corpus de réalisme.

## Ce qui est déjà fait, le 20/09

Dans le même audit, corrigé sans attendre ce cadrage parce que borné à
une expression et à une fonction :

- les **bandes d'étalonnage** de la Revue ne se calculent plus sur tout
  le store mais sur les fichiers du personnage plus le corpus
  (`shared_state.fichiers_du_personnage`, `test_bandes_isolation.py`) ;
- le **corpus de réalisme n'est plus scoré en identité** contre l'ancre
  du personnage qui lance la mesure en premier : il ne reçoit plus qu'une
  bbox, dont `qc_realisme` a besoin pour la texture
  (`mesures._bbox_sans_ancre`).

## Réalisation, le 20/09

Les quatre étapes sont faites, le critère de sortie est tenu par
`AUTOMATION/tests/test_mesures_isolation.py` — vérifié en remettant
l'ancien code : les deux personnages y lisaient la même entrée, 42.0 des
deux côtés.

1. `mesures.par_personnage(character_id)` lit la base
   (`base.mesures_par_fichier`) et ne retombe sur le store que pour les
   noms que la base ne connaît **à personne** (`base.fichiers_connus`).
   Un nom que la base connaît pour quelqu'un d'autre n'est jamais replié.
   La Revue l'appelle à ses trois points de lecture ; plus aucune lecture
   par nom nu ne subsiste dans `api/routers/`.
2. `mesures.corpus()` sert le corpus de réalisme depuis le store, par
   `role`, sans personnage.
3. Deux écritures ne suivaient pas. `base.mesures_par_fichier` ne rendait
   que `flag` : `anatomie` et `mains_juge` seraient sortis de l'écran dès
   que la Revue lirait la base. Et `mesures.demesurer` ne nettoyait que le
   store, donc une mesure périmée par un écrasement de pixels aurait
   survécu en base et continué de s'afficher ; elle prend maintenant le
   personnage et efface aussi les scores de pixels
   (`base.oublier_scores`).
4. **Les 117 entrées existantes restent en place, sans migration.** Plus
   rien ne les lit par personnage : la base est la source, et le repli ne
   les touche que pour les noms qu'elle ignore, c'est-à-dire les images
   antérieures au 24/08 qui n'ont par construction pas d'homonyme récent.
   Leur migrer une clé composée coûterait un script et un risque pour un
   gain nul.

Une conséquence connue et laissée dehors : l'**embedding** d'une image
dont les pixels changent reste lui aussi périmé, et `demesurer` ne le
touche pas. Il n'est pas affiché, mais il nourrit le gabarit. Le
supprimer déplacerait le jeu de référence d'identité, ce qui est un autre
sujet que celui-ci.
