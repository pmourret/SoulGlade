# La garde de l'espace : signaler un corps exposé en Revue

Cadrage écrit le 2026-09-23, avant la première ligne de code (règle 3).
Recherche préalable :
`DOCS/recherche/2026-09-21-mesurer-le-corps-ce-qui-est-possible.md`.

## Pour qui, et pourquoi maintenant

Pour l'utilisateur qui publie. Depuis le 21/09 la production a deux branches
et deux arbres d'export : `PROD/EXPORT` part vers une plateforme qui refuse la
nudité, `PROD/EXPORT_NSFW` n'y va jamais. Ce qui décide de la branche est le
**cran demandé**, donc une intention — et la sonde du 21/09 a montré que
l'intention ne dit pas ce que l'image montre : sur 26 images du cran
d'édition, 9 ne sont pas nues. La réciproque n'a jamais été vérifiée par un
instrument, et c'est elle qui coûte cher : une image exposée qui part dans
l'arbre SFW est un compte fermé.

Ce chantier est dans le parcours nominal : il tient la dernière dette
d'IT-3e (« le corps n'est mesuré nulle part », E9) et il est le seul candidat
dont la vérité existe déjà en base.

## Ce qui est décidé

1. **Elle signale, elle ne bloque pas** (Pierre, 23/09). L'image est produite,
   rangée et exportable comme avant ; la Revue porte un avertissement. Une
   garde qui bloque sur un détecteur jamais calibré sur notre production
   fabriquerait des refus que personne ne peut lever.
2. **Aucun sous-système** (invariant 9). C'est une mesure de plus dans la
   chaîne existante, au même endroit et de la même forme que le réalisme et
   les mains : un genre de score, enregistré par image, best-effort, qui ne
   fait jamais échouer un lot.
3. **Le seuil n'est pas en dur** (invariant 4). Il se lit dans
   `CHARACTERS/<id>/config.json`, section `qc`. Valeur de départ 0,4 — mesurée
   le 21/09 : elle laisse passer le seul faux positif du corpus (un gilet
   beige à 0,38) et garde les 17 vraies détections.
4. **`role = reference` est hors garde.** Le corpus de réalisme
   (`INPUTS/REALISME/`) contient une référence de corps, nue et dans son droit
   (confirmée par Pierre le 23/09) : elle n'appartient à aucun personnage,
   n'entre pas en Revue et ne s'exporte pas.

## Étapes

**1. La mesure.** Un module `AUTOMATION/qc_exposition.py` : il rend le score
maximum des classes « exposed » de NudeNet et la classe qui l'a porté, ou
`None` s'il n'y a rien. Un `mesurer_exposition(path)` dans `runner/sortie.py`,
jumelé à `mesurer_realisme` — même discipline défensive, même passage par
`reel` — donc un score de genre `exposition` dans la table `score`. 0,04 s par
image, à comparer aux secondes du QC des mains.

**2. Le signal en Revue.** Là où la Revue affiche déjà ses mesures, une image
dont l'espace est `sfw` et dont l'exposition dépasse le seuil porte un
avertissement qui dit quoi faire : ce que le détecteur a vu, et que l'export
SFW la publierait telle quelle. Jamais par la couleur seule, jamais un blocage
(`frontend.md`, statut ≠ couleur).

**3. Les images déjà produites.** Un passage de rattrapage qui mesure les
images en base sans score d'exposition, sur le modèle de `base.rescorer`. Sans
lui, la garde ne connaît que la production à venir et la Revue affiche un
blanc là où l'utilisateur attend un verdict.

**4. Le test qui aurait vu la fuite.** Deux images de personnages différents,
une exposée en espace SFW, une non : le signal se lève sur la bonne, et
l'autre personnage n'en voit rien (règle des routes généralisées). Plus le cas
`role = reference`, exclu.

## Hors périmètre

- **Bloquer un export**, ou retirer une image d'un dossier. Décidé au point 1.
- **Juger la qualité du corps** (peau, proportions, membres). C'est l'autre
  moitié de la recherche du 21/09, elle attend du corpus, pas du code.
- **Classer le cran d'une image** (« celle-ci est suggestive, celle-là
  native »). Les classes « covered » le permettraient ; rien ne le demande.
- **Une garde côté production**, qui refuserait de générer. Le cran décide de
  ce qu'on demande ; la garde ne juge que ce qui est sorti.

## Condition de sortie

Une image nue rangée en espace SFW est signalée en Revue, avec la phrase qui
dit pourquoi ; les faux positifs sont comptés sur les images déjà en base
(79 SFW au 21/09, une seule au-dessus de 0,3 et sous 0,4), et le chiffre est
écrit. Un personnage n'en voit jamais une autre que la sienne.

## Ce qui reste à trancher

- **Où vit le seuil, exactement** : `qc.exposition` par personnage comme les
  mains, ou une valeur de plateforme ? La règle dit config.json ; mais le
  risque, lui, est le même pour tous les personnages. À confirmer à l'étape 1.
