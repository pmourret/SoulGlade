# Point d'étape : ce qui sépare le studio de la semaine test

Séance du 2026-09-27, ouverte par la demande « un point complet sur
l'application : où on en est, ce qui reste avant une semaine test de
production, et les points du parcours qui peuvent faire grincer des
dents », avec la relecture de l'horizon du tableau de bord et son
intégration dans la séquence, « quitte à rouvrir des itérations ».

Ce fichier capture la séance. Il ne remplace pas le cadrage de la semaine
du 20/09 (`2026-09-20-semaine-de-production.md`), qu'il amende sur un
point, et il porte le cadrage d'IT-12.

## 1. Où on en est

Dix itérations sont closes, jusqu'à IT-10 (les ateliers) ce midi. IT-3e
(NSFW) est en pause. Aucune n'était déclarée en cours, alors que six passes
de design (écrans 15 à 20) ont été livrées l'après-midi même, hors tableau :
elles sont rangées en IT-10b, close.

Les critères de sortie V1 de `PROJET.md`, un par un :

| Critère | État |
|---|---|
| Parcours nominal de bout en bout par un utilisateur cible | IT-8, non commencée : aucun installeur |
| Aucun crash silencieux, toute erreur actionnable | **Non tenu** : l'export raté (§ 3) |
| Retour temps réel pendant la génération | Tenu (tick d'état, 1,5 s) |
| Défauts objectifs mesurés et triés, sous fiabilité démontrée | IT-7, décision ouverte |
| Identité mesurée et affichée, arbitrage à l'utilisateur | Tenu, sur un étalon périmé chez Léna (§ 2) |
| Suite de non-régression verte | 71 tests Python, 31 fumigations ; non relancée pendant la séance, faute de `CHARACTERS/` et de ComfyUI dans l'environnement |
| Audit UX/UI vérifié en vrai sur chaque écran du parcours | Tenu en IT-9 ; non tracé dans les commits des passes d'IT-10b |

## 2. Ce qui bloque la semaine

1. **Le préalable « reposer l'ancre de Léna » n'a aucun geste dans le
   studio.** `POST /api/characters/base/freeze` refuse un personnage qui
   existe (`web/api/routers/state.py`, `freeze_identity_base`) et la fiche
   n'offre aucune action sur sa base. Le préalable se ferait donc à la main
   (copie de fichier, `config.json`, script de rescore), et les seuils
   d'identité, calibrés contre l'ancre de juillet, deviendraient faux le jour
   même. Pour un tiers, c'est pire : une base ratée à la création ne se
   corrige pas. La règle 2 amendée le 25/09 appelle ça un outil cassé.
2. **Un réglage absent du `config.json` part en `NaN` au lancement**
   (relevé au design-pass 20 : `hdenoise` chez Léna, `rdenoise` chez
   Abyssiaelle).
3. **Le tableau se contredisait.** La décision du 20/09 annonçait « un seul
   préalable », l'ancre ; le critère de sortie du cadrage de la semaine
   exigeait aussi le verdict de la mesure du corps, portée par une IT-3e en
   pause. Tranché ci-dessous (arbitrage 1).
4. **Les rejets de la semaine ne se relisent pas tels quels.** Un
   « anatomie ko » mélange buste étroit, épaule fondue, poitrine
   asymétrique et mains fusionnées ; le 23/09 a montré qu'aucune mesure ne
   se calibre sur une étiquette pareille. Deux entrées d'horizon (« Justifier
   un rejet », « La Revue nomme le défaut ») répondent exactement à ça, et la
   semaine est le seul moment où ce corpus passe.

## 3. Ce qui grince dans le parcours

Lu dans le code pendant la séance, **pas vérifié en vrai** : chaque point
se confirme par un test qui échoue d'abord, avant correctif (règle 6).

- **Un export raté se tait.** `POST /api/action` (valider) renvoie
  `ok: true` avec `export: ""` quand `export_image` échoue ; l'échec ne va
  qu'au log serveur (`services/journal.py`), et `useSortActions` ne lit pas
  le champ. L'écran dit « validée », le fichier prêt à poster n'existe pas.
- **Une retouche NSFW sort déformée.** `export_image` cherche le format de
  l'image dans le journal SFW seul (`ss.journal_index`) ; une retouche est
  inscrite dans `journal_nsfw.csv`, sans colonne de format. Elle prend donc
  le 4:5 par défaut, et `im.resize` ne recadre pas : une source 9:16
  (la retouche garde le cadrage de sa source, `nsfw_batch`) ressort écrasée.
- **L'interface dit encore le NSFW « jamais exporté »**, en quatre
  endroits : les filtres d'espace de la Revue et de la Galerie, la section
  Contenu adulte de l'Application, et le bandeau NSFW de la Revue, qui
  l'écrit à côté du chemin `PROD/EXPORT_NSFW/` où le fichier sort depuis le
  21/09.
- **Pas de file d'attente**, et le toast « lot terminé » n'existe que si
  l'on est resté sur Produire (`QueueRail` est monté là). Laissé à la
  semaine, comme le décidait le cadrage du 20/09 : elle chiffrera les
  heures de GPU inactif.
- **« Base gelée introuvable »** s'affiche en rouge sur la fiche, sans
  rien qui mène à la réparer. Le geste de l'étape 4 d'IT-12 en est le remède.
- **L'éditeur photo affiche ce qu'il ne fait pas** : le panneau Retouche IA
  porte « bientôt » (F5.2), et la détection automatique de masque est
  inerte.
- **Une scène reprise du monde garde sa lumière dans son texte** : une
  lumière du catalogue posée sur sa copie s'ajoute au lieu de remplacer.
  Et le selfie, retiré des intentions par IT-11, n'a pas encore l'outil de
  cadrage qui devait le reprendre.
- **Les flèches du clavier dans les sélecteurs segmentés** : le mécanisme
  existe (`chrome/useRovingChoice.ts`, déjà utilisé par Produire, le wizard
  et la Revue) ; ce sont les groupes qui ne l'emploient pas.
- **`antelopev2` n'est pas au manifeste.** Le modèle d'InsightFace porte
  le contrôle d'identité (`base.MODELE_EMBEDDING`) et PuLID, et sa licence
  réserve les modèles à la recherche non commerciale. L'installeur d'un
  tiers doit savoir d'où il vient et s'il a le droit de le télécharger.

## 4. Les arbitrages

1. **La mesure du corps passe avant la semaine.** Le critère de sortie du
   cadrage du 20/09 tient tel qu'il était écrit ; c'est la décision « un
   seul préalable » qui se corrige. IT-3e sort de pause, derrière IT-12 :
   elle se chiffre sur le corpus NSFW réétiqueté avec les défauts nommés.
   La voie d'édition, le modèle de la scène native, la destination et les
   filtres d'espace de sa définition de fin sont tenus ; la décision ouverte
   sur l'usage d'une image NSFW attend, elle aussi, la mesure du corps.
2. **La passe de design des ateliers est rangée en IT-10b, close.**
3. **Après la semaine, les outils livrés passent d'abord** (règle 2
   amendée) : la scène du monde, puis les outils qui affichent ce qu'ils ne
   font pas ; ensuite le juge d'IT-7, puis le parcours d'un tiers.
4. **Trois entrées d'horizon liées au LoRA d'identité sont refermées** :
   le renoncement du 20/09 leur a retiré leur objet.

Correction faite en passant (règle 6, un diagnostic faux se corrige
partout) : la décision ouverte sur l'usage d'une image NSFW et celle du
20/09 disaient encore l'export NSFW « refusé en dur ». Il existe depuis le
21/09, vers `PROD/EXPORT_NSFW/` ; la semaine ne publie pas pour autant.

## 5. La séquence regroupée

| Rang | Itération | Ce qu'elle regroupe |
|---|---|---|
| — | IT-10b, close | Écrans 15 à 20, le genre du personnage |
| 1 | **IT-12** La semaine peut commencer | § 6 ci-dessous |
| 2 | IT-3e, reprise | La mesure du corps, sur les défauts nommés |
| 3 | IT-4 La semaine | Dépend d'IT-12 et d'IT-3e |
| 4 | IT-13 La scène du monde, jusqu'au bout | Horizon : lumière hors du texte des scènes, outil de cadrage, choix des scènes à la création, minimum qui suit le monde |
| 5 | IT-14 Les outils livrés tiennent ce qu'ils affichent | Éditeur photo : préréglages, verrou de calque, Retouche IA et masque automatique branchés ou retirés ; horizon : les flèches du clavier |
| 6 | IT-7 Le juge | Inchangée ; le corpus de la semaine s'y ajoute |
| 7 | IT-15 Le produit ne suppose plus Léna | Noms de Léna aux points d'entrée et replis de compatibilité, graphe renommé, repli legacy des mesures, étalon de réalisme ; horizon : cohorte d'imposteurs |
| 8 | IT-8 Un tiers installe | Plus le health-check de plateforme ; horizon : licence et manifeste d'InsightFace |
| 9 | IT-16 Le code parle anglais et dit « pack » | Horizon : les deux entrées « code en anglais » (doublon fusionné) et « univers » devenu « pack » |
| 10 | IT-3f, IT-5, IT-6 | Capacités neuves ; horizon : « le style est un cran » rejoint IT-5 |

Sortent aussi de l'horizon deux doublons d'un travail d'EPIC : les
préréglages de l'éditeur avancé (E7) et la publication par API (E8).

Restent à l'horizon, parce qu'aucune itération ne les porte encore ou
qu'elles sortent de la V1 : la mise en prose du prompt Flux, le
rééclairage par graphe, le fond importé, l'univers « art pur », les
assets 3D, le maître de jeu, la messagerie, l'exposition MCP, le
multi-personnage, la mesure d'identité non photoréaliste, le GPU distant
et les compteurs réglés par un LLM local.

## 6. Cadrage d'IT-12 : la semaine peut commencer

### À quoi ça sert

À ce que la semaine mesure la production, pas le studio. Chaque point
ci-dessous fausserait la semaine s'il restait en l'état : un tri contre
un étalon périmé, un lancement qui envoie `NaN`, une image « validée » sans
fichier, une retouche déformée, et des rejets qui ne nourrissent ni IT-3e
ni IT-7.

### Étapes

Chacune a son commit et ses tests, et commence par un test qui échoue.

1. **Un export raté se voit.** La validation dit l'échec de l'export à
   l'écran, avec sa cause ; l'image reste validée.
2. **Une retouche NSFW s'exporte à son format.** Le format se lit dans le
   journal de son espace, et un redimensionnement ne déforme jamais :
   hors format connu, la taille de la source est gardée. Les quatre textes
   qui disent « jamais exporté » disent où le fichier sort.
3. **Un réglage sans valeur de référence le dit.** Aucun `NaN` ne part au
   lancement ; un champ absent du `config.json` affiche « non réglé » et
   laisse le serveur à sa valeur. La borne du curseur ne coupe plus une
   valeur mesurée (guidance 6.0 chez Abyssiaelle pour un maximum de 5).
4. **L'ancre d'un personnage existant se change depuis sa fiche.** Geler
   un candidat ou importer une image, avec confirmation qui dit la
   conséquence ; l'ancienne base est archivée, jamais écrasée. Proposé, à
   valider en mode Plan : l'historique se rescore depuis les embeddings
   (`base.rescorer`, aucun PNG relu), le verdict des images déjà triées ne
   bouge pas, et l'ancien score reste lisible sous un genre daté.
5. **Les seuils se recalibrent sur la nouvelle ancre**, mesurés puis écrits
   dans le `config.json` du personnage (invariant 4), jamais recopiés.
6. **Léna reçoit son ancre de septembre**, par le geste de l'étape 4 :
   portrait frontal, rescore, seuils. C'est la vérification en vrai des
   étapes 4 et 5.
7. **Le rejet nomme son défaut.** Un vocabulaire fermé, arrêté avec
   l'utilisateur zéro à partir des noms de son tableur (identité, texture de
   peau, anatomie détaillée en buste, épaule, poitrine, mains), posé dans la
   Revue au moment du rejet, en base à côté des axes existants. Le corpus
   NSFW existant se réétiquette avec, pour IT-3e.

### Hors périmètre

- La mesure du corps elle-même : IT-3e, juste après.
- La file d'attente côté serveur et tout ce que la semaine doit nommer
  (cadrage du 20/09).
- Un écran neuf de corpus : le défaut se pose dans la Revue, là où l'on
  rejette.
- Tout apprentissage tiré des rejets (horizon, « les compteurs
  s'auto-ajustent ») : IT-12 pose l'étiquette, elle n'en tire rien.

### Critère de sortie

- Un export qui échoue le dit à l'écran ; une retouche NSFW 9:16 sort en
  9:16 ; aucun réglage ne part en `NaN`. Chacun tenu par un test qui
  échouait avant. Plus aucun texte ne dit le NSFW « jamais exporté ».
- L'ancre de Léna est le portrait de septembre, posée depuis sa fiche ;
  son historique est rescoré et ses seuils recalibrés, les chiffres écrits
  dans la rétro.
- La Revue pose un défaut nommé au rejet, et le vocabulaire est écrit.
- Audit `audit-ux-ui` vérifié en vrai sur la fiche et la Revue.
