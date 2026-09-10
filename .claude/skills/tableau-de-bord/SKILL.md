---
name: tableau-de-bord
description: A utiliser des que le tableau de bord de suivi est touche - ouvrir ou fermer une iteration, changer le statut d'un travail, rattacher un travail a une iteration, acter une decision, verser une envie a l'horizon. Couvre le partage entre etat et raisonnement, les plafonds d'ecriture qui gardent la page lisible, et la regeneration obligatoire du HTML. Pas pour changer le RENDU de la page (gabarit), ni pour ecrire un cadrage (DOCS/cadrage/).
---

# Tenir le tableau de bord

`soulglade-tableau-de-bord.data.json` est la source de vérité de **l'état**
du projet. Il se remplit à chaque chantier, et c'est précisément le risque :
un fichier d'état qui accumule du récit cesse d'être lisible, donc cesse
d'être consulté, donc cesse d'être vrai.

La règle qui tient tout le reste : **ce fichier dit ce qui est vrai
maintenant ; il ne raconte pas comment on y est arrivé.**

## Le partage

| Ce qui va dans le tableau | Ce qui va ailleurs |
|---|---|
| Le statut d'un travail (`fait`, `cours`, `faire`, `dette`, `veille`) | Pourquoi ce statut a bougé → `DOCS/retros/`, message de commit |
| Le titre d'une itération, ce qu'elle produit, sa DoD | Son périmètre, ses hors-périmètre, ses étapes → `DOCS/cadrage/` |
| Une décision tranchée, en une phrase, avec son verdict | Le raisonnement, les mesures, les variantes → `DOCS/adr/`, `DOCS/recherche/` |
| Une envie datée versée à l'horizon | Son instruction → un cadrage, le jour où elle est promue |
| Un chiffre qui tranche (`36,4 %`, `0,9125`, `2/3`) | La série, le protocole, le banc → `DOCS/recherche/` |

Le champ `ref` existe pour ça : il pointe vers le document qui porte le
détail. **Une entrée longue avec un `ref` est une entrée qui duplique son
propre document** — c'est le cas à corriger en premier.

## Comment on écrit ici

Quatre règles, dont deux sont vérifiées par le script.

1. **Plafonds de caractères** — le build **refuse** au-delà, en nommant le
   champ et son dépassement :

   | Champ | Plafond | Ce qu'il doit contenir |
   |---|---|---|
   | `iterations[].quoi` | 500 | Pourquoi maintenant, et rien d'autre |
   | `iterations[].dod` | 400 | La condition de fermeture, testable |
   | `epics[].items[].d` | 300 | L'état d'aujourd'hui, pas son historique |
   | `decisions[].d` | 500 | Le verdict et ce qu'il change |
   | `horizon`/`ecartees` `.d` | 500 | L'envie, sa date, sa raison d'attendre |

2. **Un tiret cadratin par champ, pas six** — refusé au build. Le `—`
   sert à poser une incise, pas à enchaîner des relances. Trois de suite
   ne signalent plus rien du tout : c'est le tic qui rend un paragraphe
   plat. Deux-points, point, ou point-virgule.

3. **Pas de capitales de relance.** `LIVRÉ le 10/09`, `MESURÉ SUR LA VRAIE
   BASE`, `POURQUOI AVANT IT-4`, `RESTE À PIERRE` : quand tout est
   important, rien ne l'est. Si un point mérite d'être vu, il mérite
   d'être la première phrase. Les capitales restent pour les sigles
   (`ADR`, `QC`, `NSFW`, `LoRA`).

4. **Présent, pas journal.** Un travail `fait` n'a pas besoin de « LIVRÉ le
   10/09 » : la date vit dans git, le statut vit dans le champ `s`. Écrire
   l'état atteint, pas l'annonce de sa livraison.

## Les gestes

### Changer le statut d'un travail

`epics[].items[].s`, une valeur parmi `fait`, `cours`, `faire`, `dette`,
`veille`. Mettre à jour `d` **en réécrivant l'état**, jamais en empilant un
paragraphe de plus derrière l'ancien.

### Rattacher un travail à une itération

`epics[].items[].it` porte l'identifiant de l'itération qui livre ce travail
(`"it": "IT-3c"`). C'est ce champ, et lui seul, qui produit l'avancement
compté (`3/3`) sur la carte d'itération : il n'y a pas de pourcentage à
déclarer à la main, et il ne faut pas en inventer un.

Un travail sans `it` est un travail qu'aucune itération ne porte
aujourd'hui — c'est licite et fréquent. Ce qui ne l'est pas : laisser un
travail rattaché à une itération close alors que le sujet est reparti
ailleurs. Le déplacer vers l'itération qui le porte réellement.

Une itération sans aucun travail rattaché affiche son état plutôt qu'un
compte (IT-4 en est le cas : son contenu vient de l'usage, pas du
découpage). C'est voulu, ne pas fabriquer des travaux pour remplir la barre.

### L'état d'une itération

`iterations[].state`, quatre valeurs, exclusives :

| `state` | Tag | Ce que ça dit |
|---|---|---|
| `now` | en cours | Ouverte et travaillée. **Une seule à la fois**, le build refuse la seconde |
| `next` | suivant | Prévue dans la séquence, rien ne la retient d'autre que son rang |
| `pause` | en pause | Arrêtée volontairement. Sort de la file : jamais tête de file |
| `done` | clôturé | DoD atteinte, ou refermée par un renoncement écrit |

Le vocabulaire vit dans le bloc `etats` du `.data.json`, avec son libellé et
sa couleur, exactement comme `statuts` pour les travaux. **Un état absent de
ce bloc est refusé au build** : en ajouter un, c'est ajouter une entrée à
`etats`, jamais inventer une chaîne dans une itération.

La **tête de file** est celle en cours, sinon la première qui n'est ni
clôturée ni en pause. C'est la seule carte dépliée d'office, et son tag est
affiché en plein plutôt qu'en contour.

### Ouvrir une itération

`"state": "now"`. Une itération de plus d'une étape a son cadrage dans
`DOCS/cadrage/` **avant** la première ligne de code (règle 3 de `PROJET.md`),
et `ref` le pointe.

### Mettre une itération en pause

`"state": "pause"`, pour un arrêt volontaire dû à une cause extérieure :
attente d'un tiers, de matériel, d'une décision non prise. Ce n'est **pas**
une itération qui attend son tour, qui reste `suivant`, ni une itération qui
attend une autre itération, qui est une dépendance. Écrire dans `quoi` ce qui
la redémarrerait.

### Déclarer une dépendance

`"dep": "IT-3d"`, plusieurs séparées par des virgules. Ce n'est pas un état :
une itération peut être `suivant` et attendre en même temps. Le tag « dépend
de IT-3d » s'affiche en jaune tant que la cible n'est pas clôturée, en gris
ensuite — la dépendance se garde après coup, parce qu'elle dit pourquoi
l'ordre est celui-là.

Le build refuse une cible inexistante et l'auto-dépendance. Ne pas doubler
l'information en prose dans `quoi` : le champ la porte, la phrase la répète.

### Fermer une itération

`"state": "done"` (tag « clôturé »), les travaux rattachés passent à leur statut réel — y
compris `faire` si l'itération se ferme en laissant un point ouvert. La
carte affichera `2/3`, et c'est une information, pas une erreur à masquer.

Réécrire `quoi` et `dod` au passé de l'état atteint, dans le plafond. Le
récit de ce qui s'est passé va dans la rétro (`DOCS/retros/`, règle 4).

### Ajouter une sous-phase

Un identifiant `IT-<n><lettre>` (`IT-3b`) se rend automatiquement comme une
branche sous `IT-<n>`. La phase mère doit exister, le script le vérifie.
Une branche, c'est une itération qui **sort d'une autre en cours de route** ;
une suite qui était prévue est une itération de plein droit.

### Acter une décision

`decisions[]`, `e` vaut `tranche` ou `ouvert`. Les ouvertes sont dépliées à
l'écran, les tranchées repliées. Une décision tranchée qui touche au cadrage
se répercute dans `PROJET.md` ou dans un ADR — le tableau n'est jamais le
seul endroit où elle vit.

### Verser une envie à l'horizon

`horizon.items[]`, avec la date (règle 5 de `PROJET.md`). Jamais directement
en itération. Une piste refermée descend dans `ecartees`, avec ce qui l'a
fermée.

## Régénérer, toujours

    python AUTOMATION/tools/build_tableau_de_bord.py

Le HTML est une **sortie de build**, jamais édité à la main. Le hook
pre-commit refuse un commit du `.data.json` sans son HTML régénéré.

Le build refuse les fautes qu'une édition à la main commet réellement :
statut inconnu, EPIC vide, `it` vers une itération inexistante, sous-phase
orpheline, deux itérations `now`, et tout champ au-dessus de son plafond ou
à plus d'un tiret cadratin. Un refus de plafond ne se contourne pas : il se
paie en raccourcissant, et ce qui ne rentre pas va dans le document que
`ref` pointe. La passe du 10/09 a ramené les 65 champs en faute à zéro,
c'est cet état-là que le refus protège.

Avant de committer :

    python AUTOMATION/tests/test_tableau_de_bord.py

Il vérifie le contrat de données, puis exécute le script de rendu de la page
contre un document bouchon. C'est le seul garde-fou contre le mode d'échec
réel du gabarit : une page blanche que rien ne signale.

## Ce que ce skill ne couvre pas

Le **rendu** de la page vit dans `AUTOMATION/tools/templates/tableau-de-bord.html`.
Ne jamais y toucher pour refléter un changement de contenu ; si le rendu doit
changer, le signaler plutôt que le faire sans demande explicite
(`CLAUDE.md`, section Tableau de bord).

## Checklist

- [ ] L'entrée dit l'état d'aujourd'hui, pas son historique
- [ ] Sous le plafond de son champ, un tiret cadratin au plus
- [ ] Aucune capitale de relance
- [ ] Le détail est dans le document que `ref` pointe, pas recopié ici
- [ ] Travail rattaché à l'itération qui le porte **réellement**
- [ ] Une seule itération `now`, un état pris dans `etats`
- [ ] Un prérequis déclaré en `dep`, jamais seulement raconté dans `quoi`
- [ ] HTML régénéré, `test_tableau_de_bord.py` vert
