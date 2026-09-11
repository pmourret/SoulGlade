# Séance de cadrage global — 11 septembre 2026

Confrontation de deux documents avec l'état réel du dépôt au 11/09 (git,
tableau de bord, `PACKS/`, `WORLDS/`, `PLATFORM/`, ADR) :

- `cadrage-global-soulglade.md` (v2) — document extérieur, non versionné,
  qui se dit fondé sur `main` au 10/09 ;
- `2026-09-04-architecture-quatre-couches.md` — le cadrage J8.

Huit décisions en sortent, et une itération neuve (IT-8), cadrée en fin de
document selon les trois questions de la règle 3.

## 1. Ce que le cadrage global tenait pour ouvert, et qui était fermé

Le cadrage global lit un dépôt antérieur au 03/09. Sa séquence (§8) et deux
de ses trois priorités (« Par où commencer ») portent sur du travail livré.

| Affirmation | État réel | Preuve |
|---|---|---|
| J8.1 non reflété, `UNIVERS/` encore là | Fait. `PACKS/` existe ; le vocabulaire, lui, n'a pas suivi (`universe.json`, `universe.py`, 400+ occurrences) | `f68c831` (03/09) |
| `WORLDS/` vestige possible | C'est la couche monde, les catalogues y vivent | ADR-0019 |
| J8.3 non fait, un monde acheté arrive vide | Fait. `slow-life` : 17 lieux, 9 intentions, 5 tons | `58b08cd` (03/09) |
| Pas de fichier LICENSE | AGPL-3.0 et clause de cession de droits | ADR-0026 (07/09) |
| J8.4 / J8.5 à venir | Faits | `556ee64`, `a7191f5` (03/09) |
| Le DoD commercial d'un monde manque | Existe à moitié : contrat de pack + `readiness` | cadrage 06/09, ADR-0023 |
| Un monde porte checkpoint et LoRA de style | Faux : le checkpoint vit au pack (`output_styles`), `assets.lora` n'est lu par aucun runner | contrat de pack, C3 |
| Des mains cassées se cuisent dans le LoRA | Répondu pour Pierre : la file écarte sur étiquettes humaines, HandDetailer 96 % → 36 %. Ouvert pour un tiers : une image jamais étiquetée entre, avec l'avertissement « défaut supposé » | `entrainement.py`, décision du 10/09 |

## 2. Ce qu'il disait de juste

- Le chantier produit est resté à zéro pendant que l'ingénierie avançait :
  E11 en veille, aucun chiffre de marché.
- L'économie « coin de table » (cadence × prix × abonnés) n'est écrite nulle
  part.
- Le critère « cohérent du premier coup, sans réglage manuel » manque au
  contrat de pack.
- L'exposition GPL d'Impact Pack reste à vérifier avant la première vente.

Le mot « évolution » (§6.4) n'apparaît ni dans `PROJET.md` ni dans le
README : il vient d'un pitch extérieur, la question ne touche pas le dépôt.

## 3. Ce que la confrontation a révélé

**a) La dérive a changé de nature.** Plus « ingénierie contre business »,
mais « production de Pierre contre parcours d'un tiers ». IT-1 à IT-3e
servent le rendu de Léna et d'Abyssiaelle, personnages jamais livrés ; le
critère le plus éloigné de l'aha moment — une installation sans
intervention — n'avait aucune itération (E10 : « jamais testée hors de ta
machine »).

**b) Le critère V1 sur le tri automatique est ambigu.** « Mesurés et triés,
sous condition de fiabilité démontrée » ne dit pas si un renoncement écrit
ferme la V1 ou la bloque.

**c) Ce qu'un monde vend aujourd'hui est du texte de prompt.** Le travail
non automatisable que J8 désigne comme la valeur vit ailleurs : checkpoint au
pack, seuils au personnage, LoRA de style non câblé. Les plages `expression`
de `slow-life` sont mesurées sur le visage de Léna (réserve d'ADR-0019).

**d) « Deux personnes »** dans le cadrage global contre « Pierre détient
l'intégralité des droits » dans `PROJET.md`.

**e) Le public du test marché.** L'audience d'un personnage vitrine regarde
du contenu ; la cible V1 fabrique du contenu.

## 4. Décisions

1. **Double piste écrite.** Pierre est l'utilisateur zéro : la qualité
   mesurée de sa production est un chantier V1, pas une dérive. La séquence
   porte aussi le parcours d'un tiers ; IT-8 s'intercale avant IT-5. Le test
   de la règle 2 s'applique aux deux pistes. `PROJET.md` (Pour qui, règle 2)
   et `CLAUDE.md` amendés.

2. **Le critère V1 de tri automatique se tranche au verdict d'IT-7.** Rien
   n'est amendé aujourd'hui ; l'ambiguïté (3b) est consignée au tableau
   comme décision ouverte.

3. **Un monde porte un LoRA de style, jamais un checkpoint.** Le checkpoint
   reste au pack : en changer périme les mesures d'identité (cadrage du
   08/09, P3). La « peau » du J8 §4, qui portait un checkpoint, est
   dépassée. Aucun ADR n'est contredit (ADR-0017 et ADR-0023 ne placent le
   checkpoint nulle part). IT-5 câble `assets.lora` et écrit son ADR à
   l'ouverture.

4. **Pierre seul sur le code.** `PROJET.md` tient ; la mention « deux
   personnes » du cadrage global est fausse.

5. **Le NSFW entre dans les packs vendus, sur Patreon.** Position de
   Pierre : Patreon accueille des créations NSFW, et SoulGlade n'est pas
   centré dessus — c'est une branche utilisable dans un pack vendu (exemple
   donné : un pack centré sur un personnage de contenu adulte). Le modèle le
   porte déjà : `slow-life` a une intention `boudoir` masquée sous
   l'intensité 2. Deux points à préciser au cadrage du premier pack
   concerné :
   - « un pack centré sur un personnage » est un **monde** (lore, catalogues,
     style) dans lequel l'acheteur crée son personnage ; vendre un
     personnage prêt, c'est « personnages templates fournis », hors V1 ;
   - une branche NSFW vendue exige la capacité d'édition au pack technique,
     que `rpg-personnage` n'a pas.

   Vigilance, du même ordre que la GPL : relire les conditions écrites de
   Patreon sur le contenu adulte généré par IA avant la première vente.

6. **Pas de test de marché isolé.** Une chaîne dédiée, un Instagram et un
   Discord SoulGlade s'ouvrent et s'alimentent quand quelques packs de base
   sont disponibles. Conséquence assumée : aucun chiffre de marché avant que
   deux ou trois mondes soient construits. Proposition, non tranchée :
   écrire avant l'ouverture des canaux le chiffre qui vaudra un « oui ».

7. **On vend un abonnement.** Un monde est une donnée copiable ; l'abonnement
   paie la cadence, la curation et le canal officiel. `PROJET.md`
   (Monétisation) amendé.

8. **L'installation V1 est un installeur maison.** Il assemble ce que le
   dépôt porte déjà plutôt que de faire du produit l'invité d'un runtime
   tiers. Pinokio reste une note de recherche
   (`DOCS/recherche/2026-09-10-pinokio-distribution.md`).

## 5. Ce qui devient caduc, ce qui reste ouvert

Caduc dans le cadrage global : §3 (question `WORLDS/`), §5, §6.1, §6.3
(tranché par la décision 5), §6.4, §7 (remplacé par la décision 6), §8,
deux des trois priorités finales, la mention « deux personnes ».

Caduc dans le cadrage J8 : §4 sur le checkpoint porté par la peau ; §9 et §10
(prompts de chantiers livrés).

Reste ouvert, sans itération :
- les trois à cinq chiffres du chantier produit (cadrage global §2) ;
- le calcul cadence × prix × abonnés (§4) ;
- le critère « cohérent du premier coup » au contrat de pack (§9) ;
- le rituel qu'une pression commerciale sacrifierait en premier (§10) ;
- le vocabulaire « univers » dans le code, versé à l'horizon.

---

## 6. IT-8 — Un tiers installe SoulGlade sans aide

### À quoi ça sert

L'aha moment commence par « installation » et la V1 se ferme quand le
parcours tient « sans intervention extérieure ». Aujourd'hui, installer
SoulGlade demande, dans cet ordre et à la main :

1. Node.js 20+ (prérequis de `AUTOMATION/tools/toolchain.py`) ;
2. l'environnement Python du studio — `requirements.txt`, que la section
   « Démarrer » du README ne mentionne pas ;
3. un ComfyUI portable posé par la personne (`comfy_provision.py` le
   laisse volontairement en prérequis, commit `518d37b`) ;
4. un `.env` renseigné (`COMFYUI_ROOT`, ADR-0008) ;
5. le provisioning des custom nodes et modèles depuis le manifeste
   (ADR-0022), automatique sauf les entrées à `provenance` seule ;
6. `toolchain.py install`, `build`, puis `web/app.py`.

Rien de cette chaîne n'a tourné hors de la machine de Pierre.

### Hors périmètre

- kohya_ss et l'atelier d'entraînement (horizon).
- Pinokio ou tout runtime tiers (décision 8).
- La production sur GPU distant (horizon).
- Les mondes livrés d'origine : l'installeur pose la plateforme, pas du
  contenu.
- Contourner une entrée à `provenance` seule : l'installeur la demande par
  un message actionnable, il ne la télécharge pas.
- Le support d'un autre OS que Windows : à trancher en mode Plan à
  l'ouverture, pas présumé ici.

### Critère de sortie

Sur une machine qui n'est pas celle de Pierre, une personne de la cible V1
part du dépôt cloné, lance l'installeur et va jusqu'à une image exportée
sans aide. Chaque blocage relevé pendant l'essai est corrigé, ou versé au
tableau de bord avec sa raison.

### Séquence

Après IT-4, avant IT-5. Mode Plan avant tout code multi-fichier ; le plan
tranche l'unique point d'entrée et ce que chaque étape vérifie avant de
passer à la suivante.
