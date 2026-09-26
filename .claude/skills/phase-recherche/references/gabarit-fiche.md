# Gabarit d'une fiche de verdict

Fichier : `DOCS/recherche/AAAA-MM-JJ-<conclusion-en-quelques-mots>.md`.

Deux règles de forme avant le contenu :

- **Le titre porte la conclusion, pas le sujet.** « La peau et l'identité
  sont le même curseur », pas « Étude sur la texture de peau ». Un titre
  qui annonce le verdict se retrouve six semaines plus tard.
- **Une fiche ne se met jamais à jour.** Une nouvelle passe sur le même
  sujet ouvre un nouveau fichier qui cite l'ancien.

Toutes les sections ne servent pas à toutes les phases. Garder celles qui
portent une information ; ne pas remplir une section pour la forme.

---

```markdown
# <La conclusion, en une phrase>

<Rattachement : quelle question, posée par quel cadrage ou quelle
itération, et à quelle date. Lien vers le fichier de cadrage.>

## Ce qui bloquait

<La question, ce qui avait déjà été tenté, le chiffre ou l'observation
qui a arrêté le chantier.>

## Candidats examinés

| # | Approche | Ce qu'elle rend | Disponibilité | Chiffres annoncés | Verdict pour nous |
|---|---|---|---|---|---|
| 1 | | | | | **candidat n° 1** / **à re-vérifier** / **clos** |

<Distinguer explicitement ce qui a été vérifié (page consultée, poids
visibles) de ce qui est seulement lu annoncé.>

## Ce qu'on a mesuré

<Protocole : scène, nombre de seeds, seeds appariés, md5 des références si
plusieurs bancs. Tableau des résultats avec les écarts en sigma. Coût
mesuré par image.>

## Le verdict

<Adopté, ou refermé, et pourquoi. Si l'œil et le chiffre divergent :
l'œil tranche, et cette section explique pourquoi la mesure ne voit pas.>

## Pistes écartées

<Une ligne par piste : la piste, la raison, et l'impact si elle était
mise en œuvre en l'état. Reporter ces lignes dans la section « écartées »
du tableau de bord (`soulglade-tableau-de-bord.data.json`, puis rebuild).>

## Ce que je n'ai pas vérifié

<Ce qui reste à confirmer avant de miser sur une des pistes ci-dessus.>

## Suites

<Plan d'implémentation si un candidat est adopté : étapes, ce qu'on
mesurera après. ADR à écrire si la décision est structurante. Entrée
`DOCS/ideas/` si la piste est retenue pour plus tard.>

## Sources

<Liens, avec la date de consultation quand la page peut bouger.>
```
