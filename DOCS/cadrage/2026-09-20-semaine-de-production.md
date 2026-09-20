# La semaine de production — ce qu'elle exige avant de commencer

Cadrage ouvert le 2026-09-20, à la demande de Pierre : « produire une
semaine est intéressant, mais définir les besoins réels d'une semaine
consacrée à la production est très important ».

Ce fichier ne remplace pas `2026-09-09-it4-frictions.md`, il le précède.
Le journal des frictions dit **comment noter ce qui freine** pendant la
semaine ; ce cadrage dit **ce qui doit être vrai avant le jour 1** pour
que ce journal mesure la production et non le bruit. La distinction est
la seule chose qui empêche IT-4 de se faire pré-remplir depuis le code,
ce que son propre cadrage interdit.

## À quoi ça sert

Trois constats sortis de la relecture du tableau de bord, des EPIC
ouvertes et des dix-sept entrées d'horizon.

### 1. « Une semaine » n'était définie nulle part

IT-4 s'appelle « Produire une semaine sans être ralenti ». Le dépôt sait
noter ce qui freine et ne sait rien compter de ce qui sort : pas de
cible, pas de compteur, pas de destination. Conséquence directe, « sans
être ralenti » n'a aucun étalon — ralenti par rapport à quoi ?

Et le calcul laissé ouvert le 11/09, « cadence × prix × abonnés », n'a
pas d'autre instrument que celui-là. Une semaine de production réelle
**est** la mesure de la cadence. Si elle tourne sans compter, la question
reste ouverte après et il faut refaire la semaine.

### 2. Le tri de la semaine s'appuierait sur un étalon périmé

La décision du 20/09 acte que l'ancre gelée de Léna date du 24/07 et ne
montre plus le visage qu'elle produit, et la range en dette assumée,
« pas un chantier de la séquence en cours ».

C'était juste ce jour-là et ça ne l'est plus, parce que la séquence a
changé : la semaine qui vient est une semaine de **tri**, et le score
d'identité affiché est le nombre sur lequel Pierre arbitre image par
image, cinq jours durant. Trier une semaine entière contre un étalon
déclaré non représentatif produit une semaine de décisions qu'on ne
pourra pas relire.

Ce n'est pas une dérive au sens de la règle 2 : ça sert directement la
qualité mesurée de la production de l'utilisateur zéro (`PROJET.md`,
amendement du 11/09).

### 3. Les rejets de la semaine sont un corpus qui ne repassera pas

Pierre va rejeter des dizaines d'images. `mesures.ETIQUETTES` porte déjà
`anatomie` et `mains_juge` sur des axes séparés du flag, et le corpus du
08/09 s'arrête à 53 mains jugeables — exactement ce qui manque à IT-7
pour chiffrer un candidat détecteur. Le tas complet (vocabulaire de
rejet, écran dédié) reste à l'horizon et hors parcours nominal ; poser
les deux étiquettes qui existent déjà au moment du rejet ne coûte rien et
ne se rattrape pas après coup.

## Les décisions du 20/09

1. **La semaine produit du NSFW, sans le publier.** Elle en produit pour
   alimenter l'identité et le corpus, pas pour sortir des fichiers. Le
   refus d'export en dur (`api/services/journal.py`, `export_image`)
   n'est donc **pas** levé, et la part « plateformes tierces » du point 1
   du cadrage NSFW reste ouverte. Ce qui reste exigé d'IT-3e avant le
   jour 1 est la mesure du corps (son point 2) et l'alignement du filtre
   `espace = 'lena'` de `construire_jeu` (la part identité de son
   point 1).

2. **Pas de cible écrite à l'avance.** La semaine ne se fixe pas un
   nombre d'images publiables ni un calendrier de publication : on compte
   après coup. Assumé : moins d'étalon pour « sans être ralenti », en
   échange d'aucun risque de forcer la semaine pour tenir un chiffre.

3. **Le comptage est deux colonnes, pas un chantier.** Le journal des
   frictions gagne *images produites / images publiables* et *temps de
   bout en bout par image publiable*. Tenu à la main, aucun code, aucun
   écran. C'est le minimum qui rend la cadence lisible après coup.

4. **Un seul préalable avant le jour 1 : reposer l'ancre de Léna.**
   Geler un portrait frontal du visage de septembre et rescorer
   l'historique. Tout le reste attend la semaine.

5. **Étiqueter les rejets, pendant.** Discipline de la semaine, sur les
   deux axes qui existent, sans rien construire.

## Ce qui a été examiné et écarté du chemin critique

- **File d'attente côté serveur** (E4, candidat nommé par IT-4). Pas
  construite avant. La vraie question — « puis-je lancer une nuit de
  production et aller me coucher » — se chiffre en heures de GPU inactif,
  un nombre que la semaine rend gratuitement. La construire d'abord
  reproduirait le flou de fond : livré, mesuré le lendemain, reverté.

- **Créateur de lumière** (E3, candidat nommé par IT-4). Porte déjà son
  garde-fou hérité d'IT-3b, mesurer le levier avant de construire
  l'écran. La semaine dira d'abord si la lumière est seulement une
  friction.

- **Gestionnaire de vêtements** (E3). IT-4 note « garde-robe en dur dans
  le front » ; l'inventaire dit autre chose.
  `screens/bank/composer/wardrobeCatalog.ts` est une liste de 24
  fragments pour des puces de saisie rapide, et son propre commentaire
  dit que ce n'est pas un catalogue. Le besoin d'une semaine n'est pas un
  catalogue illustré, c'est **une tenue définie une fois et réutilisée
  d'une scène à l'autre** — une série tient sur la continuité
  vestimentaire.

  Dissymétrie relevée au passage, à vérifier par la semaine avant d'en
  faire quoi que ce soit : `slow-life.json` porte 17 lieux, 9 intentions
  et 5 tons, hérités vers le personnage avec surcharge locale
  (ADR-0019) ; **la garde-robe est le seul axe créatif sans catalogue
  héritable**, elle vit en texte libre par scène. Si la semaine confirme
  la friction, la piste la moins chère est un axe de plus dans un
  mécanisme qui existe, pas un écran neuf.

## Hors périmètre

- **Le contenu d'IT-4.** Il vient de l'usage, pas de ce fichier. Les
  décisions ci-dessus sont des conditions de mesure, jamais une liste de
  chantiers à faire pendant la semaine.
- **L'export NSFW** et la destination « plateformes tierces »
  (décision 1).
- **La voie NSFW native** (point 6 du cadrage du 10/09) : la semaine
  produit par la voie d'édition, qui existe. La question du modèle reste
  dans IT-3e, hors du chemin critique de la semaine.
- **Tout écran neuf**, quel qu'il soit, avant le jour 1.
- **Le périmètre d'IT-3e lui-même** : son critère de sortie à quatre
  points n'est pas amendé ici. Ce cadrage décide seulement lesquels de
  ces points bloquent la semaine, donc l'ordre à l'intérieur.

## Critère de sortie

Ce cadrage se ferme au jour 1 de la semaine, quand les trois conditions
sont vraies :

- l'ancre de Léna est reposée sur le visage de septembre et l'historique
  rescoré ;
- le journal des frictions porte ses deux colonnes de comptage ;
- la mesure du corps d'IT-3e a rendu son verdict — une mesure chiffrée
  sur corpus étiqueté, ou un renoncement écrit — et le filtre
  `espace = 'lena'` est aligné dessus.
