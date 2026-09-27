# Cadrage : le genre du personnage

Décidé par Pierre le 2026-09-27, pendant le design-pass des Tenues
(`DOCS/design-pass/screen-tenues.md`, § S5).

## À quoi ça sert

La silhouette de l'atelier Tenues a trois variantes (Féminine, Masculine,
Neutre), et la spec demande qu'elle parte de ce que dit la fiche du
personnage. La fiche n'en disait rien : aucune clé de sexe, de genre ou de
morphologie dans `character.json` ni dans `config.json`.

On ajoute donc une donnée **déclarée** : `gender` dans `character.json`, qui
vaut `feminine`, `masculine` ou `neutral`, et dont l'absence veut dire « non
dit ». Elle se règle depuis la fiche du personnage. Le wizard de création la
posera plus tard.

## Hors périmètre

- Le wizard de création : il s'en servira, ce chantier ne le touche pas.
- **Tout effet sur la production** : ni le prompt, ni le pack, ni le QC ne
  lisent ce champ. Un mot de prompt tiré du genre serait une décision de la
  plateforme à la place de l'utilisateur (`PROJET.md`, « Le cœur »), et
  demandera son propre cadrage.
- Le gel à la création (invariant 8) : le genre n'est **pas** figé, il se
  corrige depuis la fiche comme l'apparence.

## Comment

Sur le modèle exact de l'apparence (Phase 0b) :
- `services/character.save_gender` : valeur hors des trois refusée, `None`
  retire la clé ;
- `GET /api/character` rend `gender`, `POST /api/character/gender`
  l'écrit ;
- la fiche du personnage porte une ligne « Genre » (Féminin · Masculin ·
  Neutre · Non dit).

## Critère de sortie

- `tests/test_character_gender.py` : écrire le genre de A ne touche pas B,
  une valeur inconnue est refusée, `None` retire la clé, aucune autre clé de
  `character.json` ne bouge.
- La fiche règle et relit le genre, vérifié en vrai.
- La silhouette des Tenues part du genre déclaré.
