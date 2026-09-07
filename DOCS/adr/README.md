# ADR — Architecture Decision Records

**Note (IT-0, 2026-09-07) : `ROADMAP.md` a été retiré, remplacé par le
tableau de bord (`soulglade-tableau-de-bord.data.json` /
`soulglade-tableau-de-bord.html`). Les ADR listés ci-dessous, déjà
acceptés avant ce retrait, ne sont pas réécrits — leurs mentions de
`ROADMAP.md` restent telles quelles, comme repère historique.**

Ce dossier documente le **pourquoi** des décisions d'architecture
difficiles à revenir en arrière, au moment où elles ont été prises. Ce
n'est ni `CLAUDE.md` ni le tableau de bord — les trois ont des rôles
distincts :

- **`CLAUDE.md`** — l'état actuel des règles. Se met à jour en place quand
  une règle change.
- **Le tableau de bord** (`soulglade-tableau-de-bord.data.json`) — le
  séquencement (quoi, quand). Se met à jour en place au fil de
  l'avancement.
- **`DOCS/adr/`** — l'historique des décisions et de leur raisonnement, au
  moment où elles ont été prises. **Ne se modifie jamais après coup** —
  une décision qui change de sens donne lieu à un nouvel ADR qui
  *supersède* l'ancien, pas à une édition de l'ancien.

## Quand écrire un ADR

Une décision structurante, difficile à défaire, avec au moins une
alternative sérieuse qui a été écartée. Pas pour chaque choix — un ADR
qu'on écrit pour tout perd sa valeur. Test simple : si quelqu'un (toi dans
six mois, ou un contributeur si le repo devient public) demandera un jour
« pourquoi c'est fait comme ça et pas autrement », c'est un candidat ADR.

## Format

Un fichier par décision : `NNNN-titre-court.md`, numéroté en séquence.
Voir `0000-template.md`.

## Statuts

- **Proposé** — en discussion, pas encore acté
- **Accepté** — la décision en vigueur
- **Supersédé par ADR-NNNN** — remplacé par une décision plus récente ;
  le fichier reste, seul son statut change
