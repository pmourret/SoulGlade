# IT-11, chantier 2 : le personnage reprend une scène du monde, et la copie quand il la modifie

Cadrage d'IT-11 : `2026-09-26-it11-monde-lieux-intentions-scenes.md`.
Décision : ADR-0027 §5.

## Pourquoi

Aujourd'hui (héritage vivant d'ADR-0015), une scène de personnage liée au
monde a son cadre (intention, prompt, lumière, pose de base) verrouillé dans
le composeur. La seule façon de le changer est l'onglet « Monde » de la
Banque, qui écrit dans `WORLDS/` pour tous les personnages du monde. Deux
défauts :

- un personnage ne peut pas s'écarter d'une scène du monde, alors que c'est
  là que les ateliers doivent agir ;
- une correction du monde n'atteint `build_jobs` qu'après une sauvegarde de
  la Banque : le cadre n'est rafraîchi qu'au chargement et à la sauvegarde
  de `/api/scenes`, et `build_jobs` lit `scenes.json` tel quel.

## Tranché avec Pierre le 26/09

- **La copie se fait par un geste explicite**, « Modifier pour ce
  personnage », jamais à la première frappe : rien ne se décroche du monde
  par accident.
- **L'onglet Monde de la Banque disparaît**, au profit d'un lien vers
  Référentiel › Mondes. Un écran de personnage n'écrit jamais le monde.

## Le modèle, dans `scenes.json` du personnage

| `origin` | Ce que c'est | Cadre (label, intention, prompt) |
|---|---|---|
| `world` + `world_ref` | la scène du monde, reprise telle quelle | relu du monde au chargement, à la sauvegarde et au lancement |
| `copy` + `world_ref` | la copie du personnage ; `world_ref` garde la provenance | stocké, jamais rafraîchi |
| `manual` / `compose` | propre au personnage | stocké |

Les clés d'overlay (tenue, pose, format, compte, tons, tags, intensité,
guidance) restent au personnage dans les trois cas (ADR-0014). « Revenir à
la scène du monde » repasse `origin` à `world` : la sauvegarde suivante relit
le cadre du monde, et la copie disparaît.

## Ce qui change

**Backend.** Le rafraîchissement des scènes reprises descend de
`services/bank` dans `worlds.refresh_scene_bank`, pour que le runner puisse
l'appeler (routers → services → runner). `build_jobs` lit la banque par
`load_scene_bank`, qui rafraîchit avant l'assemblage : aucune ligne
d'assemblage ne change, et le verrou à l'octet près reste vert tel quel. Tous
les appelants passent par là (CLI, web, lot, MCP, banc, déclinaisons).
`copy` devient une origine connue ; une copie sans `world_ref` est refusée.

**Banque.** L'onglet Monde et son inspecteur de lieu partent. L'en-tête de
scène dit la provenance : « Scène du monde » avec un lien vers Mondes, ou
« Copie de … » avec « Revenir à la scène du monde » (confirmé). La note des
champs verrouillés porte « Modifier pour ce personnage », qui passe le
brouillon en copie et déverrouille ; la copie s'écrit à l'enregistrement
habituel.

## Critère de sortie

Deux personnages du même monde. L'un copie une scène et change son prompt ;
on corrige la scène dans le monde. Au lancement, sans passer par la Banque,
l'autre porte la correction et le premier garde sa copie. Il revient à la
scène du monde et porte la correction. `WORLDS/` est identique à l'octet
après chaque sauvegarde de personnage. `test_build_jobs.py` passe sans
modification. Audit `audit-ux-ui` vérifié en vrai sur la Banque.
