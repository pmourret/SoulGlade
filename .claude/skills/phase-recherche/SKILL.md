---
name: phase-recherche
description: A utiliser des que le developpeur declare ouvrir une phase de recherche ou de R&D sur un sujet - « on entre en R&D sur X », « phase de recherche sur X », « il faut chercher comment faire X », « on ne sait pas encore comment resoudre X ». Se declenche aussi en plein chantier, quand la declaration arrive apres un blocage constate (une mesure qui ne separe pas, un reglage sans effet, une DoD devenue intenable). Couvre la boucle blocage -> recherche -> reflexion -> plan, trois iterations maximum, la double condition d'adoption (chiffre au banc ET validation a l'oeil) et la fiche de verdict dans DOCS/recherche/. Pas pour la veille d'inspiration sans blocage, pas pour ecrire le cadrage d'une phase (DOCS/cadrage/), pas pour lancer l'implementation une fois la piste adoptee.
---

# Conduire une phase de recherche

Une phase de recherche **ne promet pas un résultat, elle promet un verdict
écrit**. Une piste refermée par écrit est un livrable ; une piste laissée
ouverte n'en est pas un.

## Quand charger ce skill

- Le développeur déclare l'entrée en R&D sur un sujet. C'est le seul
  déclencheur : la phase s'ouvre par une phrase, jamais par déduction.
- La déclaration peut arriver **au milieu d'un chantier** : c'est le cas
  nominal, pas une exception. Une itération qui bute (`hands` v1 en IT-3)
  ouvre une phase de recherche, elle ne s'acharne pas.

Ne pas charger : inspiration sans blocage (note libre dans
`DOCS/recherche/`), écriture d'un cadrage de phase (`DOCS/cadrage/`),
implémentation d'une piste déjà adoptée (le skill du domaine).

## Premier geste — nommer le blocage, avant toute recherche

Écrire trois lignes, dans cet ordre, **avant d'ouvrir une seule source** :

1. **La question**, formulée comme une question et pas comme une envie.
2. **Ce qui a déjà été tenté**, avec le chiffre ou l'observation qui bloque.
3. **Le test du parcours nominal** (règle 2, `PROJET.md`) : un utilisateur
   qui n'a jamais installé Soulglade en a-t-il besoin pour aller jusqu'à sa
   première publication ?

Si la réponse au 3 est non, la phase ne s'ouvre pas : la piste va à
l'horizon du tableau de bord avec sa date, et le chantier en cours
reprend. Le dire une fois, clairement, et ne pas y revenir si le
développeur assume.

## La boucle — trois itérations maximum

Une itération = **recherche → réflexion → plan**. Annoncer le numéro
d'itération à chaque tour ; le compteur est visible, pas implicite.

1. **Recherche.** Sources et grille de qualification :
   `references/ou-chercher.md`. Séparer systématiquement ce qui est
   **vérifié** (page consultée, poids téléchargeables) de ce qui est
   seulement **lu annoncé**.
2. **Réflexion.** Trois candidats retenus au maximum, chacun avec un
   verdict explicite : candidat, à re-vérifier, ou clos. Un candidat sans
   verdict n'existe pas.
3. **Plan d'implémentation**, si et seulement si un candidat passe les
   deux conditions d'adoption ci-dessous. Le plan dit les étapes, le coût
   mesuré et ce qu'on mesurera après.

À la troisième itération sans candidat adoptable : **fermer**. Écrire la
fiche, verser les pistes à la section « écartées » du tableau de bord,
rendre la main au chantier. Rouvrir plus tard est permis ; s'acharner
maintenant ne l'est pas.

## Adoption — deux conditions, jamais une seule

- **Un chiffre**, produit au banc de comparaison (ADR-0021), selon
  `references/protocole-de-mesure.md`. Jamais une impression seule.
- **Une validation à l'œil par le développeur.** Jamais un chiffre seul.
- **En cas de divergence, l'œil tranche** — et la fiche doit expliquer
  *pourquoi la mesure ne voit pas* ce que l'œil voit. C'est le résultat le
  plus utile qu'une phase puisse produire sur un instrument.
- **Le coût par image se mesure, il ne s'estime pas.** Un candidat juste
  mais trop lent ne rentre pas dans la boucle de production.

## Ce qu'une phase de recherche ne fait pas

- **Pas de code de production.** Un banc, un script jetable, une mesure :
  oui. Une branche de fonctionnalité : non, elle vient après le verdict.
- **Pas d'entraînement depuis zéro.** Réutiliser ou adapter.
- **Pas de branchement bloquant** d'un détecteur ou d'un tri sans faux
  positifs *et* faux négatifs comptés sur un corpus (ADR-0025).
- **Pas de sous-système NSFW** parallèle (invariant 9), pas de graphe hors
  plateforme et pack (ADR-0017), pas de réglage par personnage dans une
  capacité de plateforme (invariant 7).
- Un custom node ou un modèle qu'un candidat introduit **se déclare au
  manifeste dans le même commit** (invariant 12), licence vérifiée
  (ADR-0024).

## Sorties — où va quoi

| Résultat | Destination |
|---|---|
| Le verdict de la phase | `DOCS/recherche/AAAA-MM-JJ-<conclusion>.md` — gabarit dans `references/gabarit-fiche.md`, **jamais remis à jour ensuite** |
| Une décision structurante avec alternatives écartées | `DOCS/adr/` |
| Une piste retenue, à explorer plus tard | `DOCS/ideas/` |
| Une piste écartée | section « écartées » du tableau de bord : date, raison, **impact si mise en œuvre en l'état** |
| Le séquencement (quoi, quand) | itérations et EPIC du tableau de bord |

**Le tableau de bord s'édite dans `soulglade-tableau-de-bord.data.json`,
puis se reconstruit** (`python AUTOMATION/tools/build_tableau_de_bord.py`).
Ne jamais éditer le HTML à la main : c'est une sortie de build. La section
« écartées » suit la forme de `horizon` (`note` + `items` de `t`/`d`) ;
si elle n'existe pas encore, l'ajouter au `.data.json`, au template et au
contrôle du script dans le même commit.

## Fin de phase

Le verdict écrit clôt la phase. Si la phase clôturait une itération ou une
phase du tableau de bord, proposer la rétro (`DOCS/retros/`, règle 4) :
livré non prévu, prévu non livré.

## Références

- `references/ou-chercher.md` — sources, ordre, grille de qualification
  d'un candidat externe.
- `references/protocole-de-mesure.md` — produire un chiffre qui vaut
  quelque chose, et reconnaître un instrument qui ment.
- `references/gabarit-fiche.md` — ossature de la fiche de verdict.
