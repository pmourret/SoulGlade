# IT-10, chantier 5 : l'importeur d'assets

**Date** : 2026-09-26 · **Décision** : Pierre, 26/09 (image typée par usage ;
le monde possède, le personnage surcharge ; écran dédié, analyse par le
modèle vision local, dispatch vers le panneau du composeur)

## Pour qui

Pour l'utilisateur qui a déjà l'image de ce qu'il veut — la robe qu'il a
dessinée, le décor qu'il a rendu ailleurs — et qui n'a aujourd'hui **aucun
chemin pour la faire entrer dans le studio**. Il la décrit à la main, en
anglais, dans un champ de texte, et recommence à chaque scène.

Pour le chantier 6 (vêtements illustrés), qui n'existe pas sans ça, et pour
le fond importé, à l'horizon, qui en sera le premier client lourd.

## Ce qui est constaté

Trois chemins d'entrée d'image existent et ne se parlent pas :
`base_portrait.save_uploaded` (base gelée, vers `ComfyUI/input/`),
`/api/pose/extract` (une photo qui n'est jamais conservée), le jeu
d'entraînement. Aucun ne produit un objet réutilisable d'une scène à
l'autre.

Le catalogue de vêtements du composeur (`wardrobeCatalog.ts`) est une liste
de fragments **écrits en dur dans le frontend**, sans image et sans serveur.
Son propre commentaire annonce qu'un vrai catalogue illustré le remplacerait
en entier.

Le mot est déjà pris : `worlds.assets(wid)` rend `{lora, lora_strength,
prompt_add}` — le style d'un monde. Le catalogue de ce chantier ne réutilise
pas cette clé.

`llm_local.texte(prompt, image=...)` parle déjà à Qwen3-VL, servi par
ComfyUI et déclaré au manifeste. Lire une image importée n'ajoute aucune
dépendance : c'est l'appel que `pose_texte.depuis_photo` fait depuis le 26/09.

`/INPUTS/` est hors git, précisément parce qu'il peut porter des photos
réelles de tiers. Une image importée par l'utilisateur relève du même risque.

## Ce qui est tranché

- **Un asset est une image, typée par une classe d'usage.** Trois classes,
  parce que trois destinations existent : `vetement`, `decor`, `reference`.
  Pas de quatrième « au cas où ». Les modèles (LoRA, checkpoint) n'entrent
  pas par là : ils restent au manifeste (ADR-0022, invariant 12).
- **Comme une pose, un asset vit en deux moitiés** : un **fragment de
  prompt**, utilisable tout de suite, et le **fichier image**, gardé pour le
  jour où un graphe saura le greffer. Ce chantier livre la première moitié et
  range la seconde ; il ne câble aucun greffage (voir hors périmètre).
- **Le monde possède, le personnage surcharge** (ADR-0019). Le catalogue est
  une liste d'entrées à `key`, fusionnée par `_merge_fields_by_key` — celle
  des tons : un personnage ajuste le libellé ou le fragment d'un asset du
  monde sans réimporter le fichier. Un monde vendu peut donc livrer ses
  vêtements illustrés, sans que le catalogue du monde soit un second modèle
  de données.
- **La fiche vit dans le catalogue, les octets dans `INPUTS/ASSETS/`.** Le
  monde porte ses fiches dans `WORLDS/<id>.json` (clé `library`), le
  personnage les siennes dans sa config. Les octets restent hors git, comme
  la banque de poses, pour la raison écrite dans `.gitignore`.
- **Le fragment est proposé par le modèle vision local, jamais imposé.**
  Une consigne par classe, réponse JSON, `legende.sans_clause_de_visage`
  avant écriture (invariant 6 : un vêtement photographié porte un visage).
  Un échec du modèle n'annule pas l'import : l'asset naît sans fragment, et
  un bouton « Analyser » réessaie. Le fragment se corrige à la main.
- **Le composeur tire, la bibliothèque ne pousse pas.** Un panneau ouvre un
  sélecteur filtré sur sa classe — le geste du sélecteur de pose. Pousser
  depuis la bibliothèque supposerait une scène ouverte, et c'est une
  deuxième façon de faire la même chose.

## Ce qui entre

Backend, un commit :

1. `assets.py` : `importer(octets, nom, classe, proprietaire)` (validation
   du format par Pillow comme `base_portrait`, écriture dans
   `INPUTS/ASSETS/<key>.<ext>`), `analyser(key)` (consigne de la classe →
   `llm_local`), `bibliotheque(cid)` (fusion monde + personnage, avec la
   couche de chaque entrée), `enregistrer`, `supprimer`.
2. `CLASSES` : une table, une entrée par classe — libellé, consigne du
   modèle, champ de scène visé. C'est elle que lit le sélecteur du
   composeur ; jamais un `if` sur la classe dans un panneau (invariant 7).
3. Routes : `GET /api/assets`, `POST /api/assets/import`,
   `POST /api/assets/analyse`, `POST /api/assets/save`,
   `POST /api/assets/delete`, `GET /img/asset` (sur le modèle de
   `/img/pose`). L'import et l'analyse passent en executor.
4. Tests : une image ronde-trip (import → fiche → octets servis) ; un
   fichier qui n'est pas une image refusé avant écriture ; la fusion monde +
   personnage (héritée, surchargée, propre) ; un import dont le modèle
   échoue produit quand même l'asset ; le fragment passe par
   `sans_clause_de_visage`.

Frontend, un commit :

5. `/bank/assets`, sous-vue de l'Atelier — le gabarit des Tons : une grille
   à gauche filtrée par classe, l'inspecteur à droite (image, classe,
   libellé, fragment, couche). Import par dépôt de fichier, avec le choix du
   propriétaire : ce personnage, ou le monde.
6. Sélecteur « Depuis la bibliothèque » dans les panneaux Vêtements et
   Scène et lieu : le fragment s'ajoute en ligne à la garde-robe, remplit le
   texte de scène **s'il est vide**, jamais par-dessus (précédent de la pose).
7. Tests navigateur : import → fragment visible → repris dans une scène.

## Hors périmètre

- **Greffer l'image dans un graphe** (IP-Adapter d'un vêtement, compositing
  d'un fond). Aucun graphe ne le fait aujourd'hui, et seuls plateforme et
  pack ont le droit d'en porter un (invariant 7). L'asset garde son fichier
  pour ce jour-là ; le chantier qui le câblera se cadrera seul.
- **Le gestionnaire de vêtements** (chantier 6) : catégories, niveaux,
  héritage d'une tenue. Ce chantier ne livre que la matière et le sélecteur.
- **Remplacer `wardrobeCatalog.ts`** : les puces statiques restent tant que
  la bibliothèque d'un personnage neuf est vide. Le chantier 6 tranche.
- **Vendre, exporter ou empaqueter un monde avec ses assets** : le
  packaging d'un monde n'existe pas encore.
- **Les modèles et LoRA** : manifeste, ADR-0022.

## Critère de sortie

Une image déposée dans `/bank/assets` devient un asset classé, avec un
fragment de prompt que personne n'a tapé, corrigeable à la main. Il se
retrouve dans le sélecteur du panneau qui correspond à sa classe, et le
composeur l'utilise sans jamais écraser un champ déjà rempli. Un asset versé
au monde est hérité par un second personnage du même monde, qui peut en
ajuster le fragment sans toucher au monde. Le modèle vision hors ligne ne
fait échouer aucun import. L'audit `audit-ux-ui` est vérifié en vrai :
`/bank/assets` et les deux panneaux, à 1440 et 1024.
