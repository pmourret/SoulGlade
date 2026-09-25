# Rétro IT-9 — Le studio se lit comme un poste de travail

Écrite le 25/09/2026, à la clôture de l'itération ouverte le 23/09
(`33a401c`). Cadrages d'entrée : `DOCS/design-pass/Refonte_UI_UX/`, un
dossier par écran ; cadrages d'étape : `DOCS/design-pass/screen-*.md`.
Charte de sortie : `AUTOMATION/web/ui/src/styles/DESIGN.md`.

## 1. Qu'a-t-on livré qui n'était pas prévu ?

- **Deux étapes de plus que le plan d'ouverture.** IT-9 s'est ouverte sur
  douze étapes ; quatorze cadrages ont été posés en route, dont celui des
  Personnages, arrivé après les autres. Le tableau ne montrait que le
  passé jusqu'à `cb173ce`, qui a mis un travail par écran et laissé
  l'avancement se compter seul.
- **Un bilan graphique en quinzième travail** (`d351673`). La relecture des
  quatorze écrans d'un coup a trouvé ce qu'aucune étape isolée ne voyait :
  le sur-titre de section en 25 exemplaires qui dérivaient sur quatre axes,
  la barre de tête en 44 et en 48 px, la moitié des cartes qui figeaient
  un rayon que le pack a le droit de changer. Elle a aussi rattrapé une
  valeur « documentée dans DESIGN.md » qui n'y figurait pas, propagée à
  cinq endroits. Leçon : réutiliser une valeur documentée, c'est réutiliser
  celle qui est écrite, pas celle qu'on croit y lire.
- **Le balayage des états ouverts** (`test_cadres_ua.js`, `42e07b6`). La
  fumigation des cadres ne voyait que l'état de repos. Elle ouvre
  maintenant les surimpressions : treize écrans, douze états, chacun
  déclarant le marqueur qui prouve qu'il s'est vraiment ouvert. Sans ce
  marqueur, un déclencheur cassé faisait sonder l'écran au repos et rendait
  vert.
- **Une route de la base gelée liée au personnage** (`39cd68a`), sortie de
  la fiche : le portrait est servi sans nom de fichier en paramètre.

## 2. Qu'est-ce qui était prévu et qui n'a pas été livré ?

Rien dans le périmètre : les quatorze étapes et le bilan sont passés,
chacun avec son audit vérifié en vrai.

Un écart assumé, déjà versé à l'horizon le 24/09 : trois panneaux du
composeur (amélioration IA, catalogue de vêtements, templates de lumière)
nomment une capacité sans serveur derrière. L'interface est en place et
l'état non branché se dit à l'écran.

## 3. Ce que l'usage des écrans refaits a fait apparaître

Relevé par Pierre en utilisant le studio refait, avant la clôture. Aucun
de ces points n'est un défaut d'IT-9 : ce sont des manques qu'on ne voyait
pas tant que l'écran ne se lisait pas. Tous vont à l'horizon (règle 5),
sauf le dernier.

- **Un créateur d'intentions.** L'intention n'existe que comme champ d'une
  scène ; aucun atelier ne la crée. Nouvel écran, donc skill `nouvel-outil`.
- **16:9 et format libre dans le composeur.** La liste `4:5, 2:3, 9:16,
  1:1` est figée et recopiée à quatre endroits (composeur, service de
  banque, `compose.py`, CLI), et chaque format correspond à une résolution
  du `config.json` du personnage. Le 16:9 est un ajout borné, qui
  justifie de ramener les quatre listes à une seule. Le format « décidé par
  le modèle » est une autre affaire : c'est la plateforme qui tranche à la
  place de l'utilisateur, le test que `PROJET.md` demande d'appliquer. Il
  demande un cadrage.
- **Une pose, c'est un squelette et un texte.** Le texte se déduit à
  l'extraction, se stocke avec le squelette en base, et se reporte dans le
  composeur à l'ajout de la pose. Reste à trancher ce qui écrit ce texte.
- **L'amélioration des prompts par IA est un gros chantier**, pas une route
  à brancher. L'entrée d'horizon du 24/09 est complétée plutôt que doublée.
- **Ajouter des tons dans l'atelier Tons.**
- **Enregistrer ses préréglages dans l'éditeur avancé.** Les préréglages
  sont aujourd'hui une constante du code (`PRESETS`).
- **Une perte de qualité perçue depuis la migration du frontend.** Ce n'est
  pas une envie : si elle est réelle, c'est une régression, priorité 1.
  Versée en E5 comme travail à faire, pas à l'horizon. Première question :
  la perte est-elle dans le PNG écrit sous `PROD/` (l'écran enverrait
  d'autres paramètres au runner) ou seulement à l'affichage (vignettes JPEG
  de `PROD/.thumbs/` servies à la place de l'original) ?

## 4. Ce qui tient pour la suite

- La charte de `styles/DESIGN.md` et son garde statique : un écran neuf la
  tient, il ne la redécouvre pas.
- Une fumigation qui ne prouve pas qu'elle a ouvert ce qu'elle sonde ne
  prouve rien : chaque nouvel état ouvert déclare son marqueur.
