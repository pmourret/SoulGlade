# Rétro — Phase R&D : le rendu d'abord, le juge ensuite (IT-3b)

Écrite à chaud le 09/09/2026, à la clôture de la phase ouverte la veille.
Cadrage : `DOCS/cadrage/2026-09-08-phase-rd-juge-generaliste.md`, amendé
deux fois pendant la phase — les deux fois avant la ligne de code
correspondante.

## 1. Qu'a-t-on livré qui n'était pas prévu ?

- **Un étage de rendu, là où le cadrage n'annonçait qu'une ligne.**
  « Les mains en dernier, côté rendu » était la totalité du texte. Ce
  qui en est sorti : `HANDDETAILER` câblé, mesuré à 96,4 % → 36,4 % de
  mains ratées, et devenu un interrupteur du panneau de production. Les
  deux étapes précédentes s'étaient fermées sur un renoncement et un
  demi-gain ; personne n'attendait que la troisième soit la bonne.

- **Une frontière écrite qui manquait au dépôt.** Le hors-périmètre
  disait « HandRefiner et consorts viendront après un détecteur
  fiable » — lu à la lettre, il interdisait aussi un `HANDDETAILER`,
  alors que `FACEDETAILER` est dans le graphe depuis toujours. La
  distinction qui manquait, maintenant écrite : **inconditionnel =
  rendu, conditionné à une mesure = correcteur.**

- **Trois corrections d'instrument, toutes déclenchées par un incident,
  aucune prévue.**
  - `verdict_bench` n'appariait pas par seed et laissait un genre
    sous-échantillonné confisquer le verdict global (dette E5 d'IT-1).
    Payée le matin, elle a servi le soir même : la référence a fini à
    29 seeds contre 30, et n'a été comparable que grâce à ça.
  - Un banc interrompu se reprend (`run_bench(bench_id=...)`). Presque
    tout était déjà là — les deux écritures de base étaient idempotentes
    depuis le début, personne ne s'en était servi.
  - La planche prend sa liste d'images dans la base et non dans le
    dossier, après qu'une double génération y a laissé 60 fichiers pour
    30 seeds.

- **Une seconde démonstration que `hands` v1 est aveugle**, gratuite et
  plus forte que la première : sur un cas où la vérité est connue, le
  genre `mains` rend 1.000 des deux côtés, delta +0.000, verdict
  « stable », pendant que l'œil compte 96 contre 36. Les 25 % de rappel
  du corpus du 08/09 ne tenaient pas au corpus.

- **Un instrument de jugement réutilisable** (`tools/planche_mains.py`)
  et la géométrie qui va avec (`qc_mains.boite_main`), corrigée après
  un essai réel — pas après une relecture.

## 2. Qu'est-ce qui était prévu et qui n'a pas été livré ?

- **Le front 2 en entier — le juge généraliste.** Jamais ouvert. Sorti
  de la phase le 09/09 et transformé en IT-7, avec ses deux conditions
  de sortie reprises mot pour mot. La raison est réelle et pas un
  habillage : la phase s'était ouverte sur « à 75 %, trier ne protège
  plus rien » ; à 36 % et sur demande, cette prémisse est tombée. Le
  critère de sortie V1 sur le tri automatique, lui, reste debout et non
  amendé.

- **Le denoise du `HANDDETAILER`, jamais mesuré.** 0.5 est une valeur
  posée à la main. L'axe de banc existe et la question est écrite dans
  la note ; ne pas la poser, ce serait juger un étage sur son seul
  réglage livré — la faute d'IT-2, celle-là même qui avait motivé
  d'ouvrir les axes continus.

- **La peau n'est pas réparée.** `sharpen` 0.30 → 0.55 rattrape du
  micro-contraste sur une peau lissée en amont ; la cause reste
  entière, et sa sortie connue est ailleurs (LoRA d'identité par
  personnage, inscrit en E2 le 08/09).

- **Le fond n'a pas de levier.** Fermé par renoncement écrit : il ne
  répond pas au prompt. Le sujet reste ouvert sans piste.

- **L'adoption de l'étage n'a pas été tranchée en config**, et c'est
  volontaire : elle est devenue un interrupteur de génération, éteint
  par défaut. Temps contre qualité n'a pas de bonne réponse objective
  (`PROJET.md`) — la plateforme ne choisit pas à la place de
  l'utilisateur.

## 3. Ce que la phase a appris sur la méthode

Trois fois sur trois, ce qui a fait avancer n'est pas la relecture mais
l'essai réel : la planche de crops corrigée après avoir regardé 8 images
(la moitié des tuiles étaient des zooms sur de la peau), la double
génération découverte en comptant les fichiers, la reprise de banc écrite
après une mise en veille. Le cadrage l'avait pressenti pour la peau
(« soit un indicateur qui sépare, soit accepter de juger à l'œil et le
dire ») ; la phase l'a vérifié partout ailleurs.

Corollaire pour la suite, déjà appliqué : un banc de plus d'une heure est
exposé, et un instrument doit être essayé sur des données réelles avant
d'être cru — même quand il est vert.
