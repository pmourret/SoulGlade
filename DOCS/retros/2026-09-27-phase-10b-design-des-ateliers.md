# Rétro IT-10b : les ateliers passent au design

Écrite le 27/09/2026 et rangée après coup. La passe est sortie de la rétro
d'IT-10 (« Pierre prévoit une passe de design, avec Claude Design, sur les
ateliers créés ou remaniés ici »), et elle a été livrée l'après-midi même,
de `d460271` à `c1af46b`, sans itération au tableau pour la porter. Elle y
est rangée par la séance du jour
(`DOCS/cadrage/2026-09-27-point-d-etape-semaine-test.md`, arbitrage 2).

Six écrans, chacun sur une maquette validée et sa spec dans
`DOCS/design-pass/` :

| Écran | Spec | Commit |
|---|---|---|
| 15 Ateliers, Lumières | `screen-lumieres.md` (15a) | `d460271` |
| 16 Ateliers, Tenues | `screen-tenues.md` (16e) | `8a88697`, `1182a0f` |
| 17 Ateliers, Assets | `screen-assets.md` (17a) | `84a4ae8` |
| 18 Améliorer et panneau IA | `screen-ameliorer.md` (18b) | `c898f76`, `0ad3c92` |
| 19 Référentiel, Mondes | `screen-19-mondes-livret.md` (19d) | `1019022` |
| 20 Produire, Réglages | `screen-20-reglages.md` (20b) | `c1af46b` |

## 1. Qu'a-t-on livré qui n'était pas prévu ?

- **Le genre du personnage** (`05f3ffd`), cadré le jour même
  (`2026-09-27-genre-du-personnage.md`) : la silhouette des Tenues devait
  partir de la fiche, qui n'en disait rien. C'est une donnée déclarée, que
  ni le prompt, ni le pack, ni le QC ne lisent.
- **L'emplacement d'une pièce de tenue** (`8a88697`), seule dépendance
  serveur de la passe.
- **Les écrans 19 et 20**, qui ne sont pas des ateliers : le livret du
  monde, qui remplace la structure de l'écran 11 après IT-11, et les
  réglages de Produire.
- **Le déchargement de la mémoire depuis les sondes RAM et VRAM** de
  l'en-tête (`2be237a`).
- **Une dette relevée en route** (`c144b17`) : un réglage sans valeur de
  référence ment sur sa valeur, jusqu'à envoyer `NaN` au lancement. Elle
  part dans IT-12.

## 2. Qu'est-ce qui était prévu et qui n'a pas été livré ?

- **Trois ateliers nommés par la rétro d'IT-10** n'ont pas eu leur passe :
  les tons, les formats et la pose.
- **L'audit vérifié en vrai** que chaque spec inscrit à son critère de
  sortie (captures à 1440 et 1024, DOM mesuré) n'est tracé dans aucun des
  corps de commit. C'est peut-être seulement la trace qui manque : la rétro
  d'IT-10 a déjà montré qu'une lecture des seuls titres se trompait. À
  confirmer, écran par écran, avant d'affirmer l'un ou l'autre.

## 3. Ce qui reprend

IT-12, cadrée le même jour : ce qui doit être vrai avant le jour 1 de la
semaine test.
