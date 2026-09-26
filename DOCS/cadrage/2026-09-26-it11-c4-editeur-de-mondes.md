# IT-11, chantier 4 : l'éditeur de mondes parle lieux, intentions, scènes et tons

Cadrage d'IT-11 : `2026-09-26-it11-monde-lieux-intentions-scenes.md`.
Décision : ADR-0027.

## Pourquoi

Les chantiers 1 à 3 ont rangé le monde en lieux (décors), intentions, scènes
et tons. Référentiel › Mondes ne sait encore éditer que les scènes, sous
l'ancien nom « Ordinaire / Adulte », avec une intention en texte libre et
aucun décor, et les tons. Un monde neuf ne reçoit ni lieu ni intention sans
ouvrir un JSON, ce que le critère de sortie d'IT-11 exclut.

**Pour qui.** Le créateur qui monte un monde après l'installation, et celui
qui corrige un monde livré.

## Ce qui change

**Quatre onglets** : Lieux, Intentions, Scènes, Tons, chacun avec son
compte. Cinq ne tiennent pas dans la colonne à 340 px : la branche adulte vit
dans l'onglet Scènes, derrière un sélecteur « Ordinaires | Adultes ». Elle
reste annoncée par son compte et jamais imposée (arbitrage du 21/09), avec son
bandeau et le nom de son fichier.

**Un éditeur pour trois catalogues.** Lieux, intentions et scènes partagent
les mêmes gestes (ouvrir, créer, enregistrer par le bandeau, retirer, garde de
sortie) ; seuls leurs champs changent. Un inspecteur décrit par une liste de
champs remplace l'inspecteur de lieu. Les tons gardent leur éditeur, livré et
audité le 25/09.

- **Lieu** : nom, décor (où l'on est ; ni action, ni lumière, ni tenue).
- **Intention** : nom, icône, fragment de prompt, ton proposé parmi ceux du
  monde.
- **Scène** : nom, intention et lieu choisis dans les listes du monde, ce qui
  s'y passe, niveau minimum facultatif, et l'aperçu du prompt composé.

Les identifiants se proposent depuis le nom et se figent à la création : ils
sont écrits dans les scènes, les banques des personnages et les dossiers
d'export.

**Retirer.** Un lieu ou une intention qu'une scène utilise (ordinaire ou
adulte) ne se retire pas : le serveur refuse et dit lesquelles. Une scène
retirée laisse aux personnages qui la reprennent leur dernière version, qui ne
suit plus le monde.

**États vides.** Chaque onglet dit ce qu'est son objet et propose de créer le
premier. L'onglet Scènes d'un monde sans lieu ni intention renvoie vers eux.
Un monde qui vient d'être créé s'ouvre sur Lieux, en création.

**Backend.** Routes `places` et `intentions` au patron des tons, validation
dans `services/worlds.py`, compte d'intentions au registre.

## Hors périmètre

- La Banque, le composeur et Produire (chantier 5).
- `readiness` (horizon).

## Critère de sortie

Depuis l'écran, sans ouvrir de JSON, un monde neuf reçoit un lieu, une
intention, une scène qui les choisit dans les listes, et un ton ; un
personnage neuf de ce monde naît avec la scène. Retirer un lieu utilisé est
refusé avec un message. Audit `audit-ux-ui` vérifié en vrai, à 1440 et
1024 px.
