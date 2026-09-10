# -*- coding: utf-8 -*-
"""Les legendes d'un jeu d'entrainement ne decrivent JAMAIS le visage.

POURQUOI CE TEST EXISTE. Pour un LoRA d'identite, ce qui n'est PAS ecrit dans
la legende est ce que le modele apprend a associer au mot declencheur. Legender
les cheveux ou les yeux lui apprend a dependre des mots plutot que du jeton :
le LoRA marche tant qu'on recopie la description, et rate des qu'on ecrit autre
chose. C'est l'erreur la plus courante du domaine, et elle ne se voit qu'apres
des heures d'entrainement.

Le depot separe deja les deux moities — `scenes.json / anchor` porte l'identite,
et `assert_no_face` (invariant 6) garantit que les fragments de scene n'en
contiennent pas. Ce test verrouille que le legendeur s'appuie bien sur cette
separation, et qu'il ne la contourne dans aucun de ses replis :

  1. la substitution est EXACTE et le declencheur prend la place de l'ancre,
     sans jamais etre double (bug reel du 10/09 : « lenadaab, raw, unedited
     photo of lenadaab, ... ») ;
  2. une legende de vision qui decrit le visage est REFUSEE — mesure du 10/09 :
     sur le portrait de base, Florence-2 decrit les taches de rousseur ET
     invente des yeux bleus la ou Lena les a verts ;
  3. l'ancre reinjectee ne se fait jamais legender par un modele ;
  4. il n'y a JAMAIS de legende vide : un .txt manquant au milieu d'un jeu qui
     en a partout est l'inconstance de forme que la pratique reproche le plus ;
  5. le declencheur est deterministe et ne collide avec aucun mot reel ;
  6. `avec_vision=False` ne touche jamais le reseau.

Aucun GPU, aucun appel reel : la vision est remplacee dans le module.

Lancer :  python AUTOMATION\\tests\\test_legende.py
"""
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
AUTOMATION = HERE.parent
sys.path.insert(0, str(AUTOMATION))

import legende                                                # noqa: E402

KO = 0


def verifie(ok, texte):
    global KO
    print(f"  {'ok   ' if ok else 'ECHEC'} {texte}")
    if not ok:
        KO += 1


ANCRE = ("a 22-year-old French woman, long dark brown hair falling past her "
         "shoulders, green eyes, dense freckles across her nose and cheeks")
PROMPT = (f"raw, unedited photo of {ANCRE}, sitting on the edge of an unmade "
          f"bed, half body, soft morning light from a window on the left")
TRIG = legende.declencheur("lena")

print("=" * 70)
print("Legendes d'entrainement : jamais le visage, jamais vide")
print("=" * 70)

print("\n[1] le declencheur remplace l'ancre, exactement une fois")
b = legende.base(PROMPT, ANCRE, TRIG)
verifie(b is not None and ANCRE not in b, "l'ancre a disparu de la legende")
verifie(b.count(TRIG) == 1,
        f"le declencheur y est UNE fois ({b.count(TRIG)}) — le doubler "
        f"apprendrait au modele qu'il se dit deux fois")
verifie(b.startswith(f"raw, unedited photo of {TRIG},"),
        f"il prend la place du SUJET : « {b[:44]}… »")
verifie(legende.terme_de_visage(b) is None,
        "et il ne reste aucun terme de visage")
verifie(legende.base("un prompt sans ancre", ANCRE, TRIG) is None,
        "ancre absente du prompt -> None, on ne devine pas ou elle s'arrete")

print("\n[2] une vision qui decrit le visage est ELAGUEE, pas jetee")
# Jeter la legende entiere etait le mauvais geste : un meilleur legendeur
# decrit PLUS, donc il heurte PLUS souvent le vocabulaire interdit, et on
# perdait la scene avec le visage (mesure du 10/09 en changeant de modele).
legende.vision = lambda *a, **k: (
    "a woman with long brown hair and freckles, sitting at a wooden table in "
    "an outdoor cafe, wearing a beige cardigan")
texte, source = legende.legender(Path("x.png"), ligne={"scene": "cafe_terrasse"},
                                 anchor=ANCRE, trigger=TRIG)
verifie(source.startswith("vision elaguee"), f"source = {source!r}")
verifie(legende.terme_de_visage(texte) is None,
        "la clause fautive est partie")
verifie("wooden table" in texte and "beige cardigan" in texte,
        f"et la SCENE est restee : « {texte} »")

print("\n[2b] une vision entierement fautive retombe sur les metadonnees")
legende.vision = lambda *a, **k: "her eyes are blue, freckles on her face"
texte, source = legende.legender(Path("x.png"), ligne={"scene": "cuisine_matin",
                                                       "intention": "lifestyle"},
                                 anchor=ANCRE, trigger=TRIG)
verifie("irrecuperable" in source, f"source = {source!r}")
verifie(legende.terme_de_visage(texte) is None and texte.startswith(TRIG),
        f"et la legende retenue est propre : « {texte} »")

print("\n[2c] l'elagage repare le moignon, et ne touche pas une legende propre")
cas = [
    ("photo of a young woman with long, straight, brown hair and freckles, "
     "standing in a dimly lit room",
     "photo of a young woman, standing in a dimly lit room"),
    ("a woman standing in a kitchen, wearing a white shirt and blue jeans",
     "a woman standing in a kitchen, wearing a white shirt and blue jeans"),
]
for avant, attendu in cas:
    obtenu = legende.sans_clause_de_visage(avant)
    verifie(obtenu == attendu, f"« {obtenu} »")
verifie(legende.sans_clause_de_visage("her eyes are blue, freckles on her face") == "",
        "tout fautif -> rien, et l'appelant retombe ailleurs")

print("\n[3] une vision propre est gardee")
legende.vision = lambda *a, **k: "a woman standing in a kitchen, grey top, daylight"
texte, source = legende.legender(Path("x.png"), ligne={"scene": "cuisine_matin"},
                                 anchor=ANCRE, trigger=TRIG)
verifie(source == "vision" and "kitchen" in texte, f"[{source}] {texte}")

print("\n[4] l'ancre reinjectee ne passe jamais par un modele")
appels = []
legende.vision = lambda *a, **k: appels.append(1) or "peu importe"
texte, source = legende.legender(Path("base.png"), ligne={}, anchor=ANCRE,
                                 trigger=TRIG, est_ancre=True)
verifie(source == "ancre" and not appels,
        f"[{source}] aucun appel de vision ({len(appels)})")
verifie(texte.startswith(TRIG) and legende.terme_de_visage(texte) is None,
        f"et sa legende est neutre : « {texte} »")

print("\n[5] jamais de legende vide")
legende.vision = lambda *a, **k: ""
texte, source = legende.legender(Path("x.png"), ligne={}, anchor=ANCRE,
                                 trigger=TRIG)
verifie(texte == TRIG and "declencheur seul" in source,
        f"sans prompt, sans vision, sans metadonnees -> « {texte} » ({source})")
texte2, source2 = legende.legender(Path("x.png"),
                                   ligne={"scene": "ruelle_ville", "ton": "doux"},
                                   anchor=ANCRE, trigger=TRIG)
verifie("metadonnees" in source2 and "ruelle ville" in texte2,
        f"avec des metadonnees -> « {texte2} »")

print("\n[6] avec_vision=False ne touche jamais le reseau")
appels.clear()
legende.vision = lambda *a, **k: appels.append(1) or "ne devrait pas etre appele"
texte, source = legende.legender(Path("x.png"), ligne={"prompt": PROMPT},
                                 anchor=ANCRE, trigger=TRIG, avec_vision=False)
verifie(source == "prompt" and not appels,
        "un prompt disponible n'appelle jamais la vision")
texte, source = legende.legender(Path("x.png"), ligne={"scene": "sport_tapis"},
                                 anchor=ANCRE, trigger=TRIG, avec_vision=False)
verifie(not appels and "desactivee" in source,
        f"et sans prompt non plus : [{source}] {texte}")

print("\n[7] le declencheur est deterministe et propre a chaque personnage")
verifie(legende.declencheur("lena") == legende.declencheur("lena"),
        "deux appels rendent le meme jeton")
verifie(legende.declencheur("lena") != legende.declencheur("abyssiaelle"),
        "deux personnages n'ont jamais le meme")
verifie(legende.declencheur("lena") not in ("lena", "Lena"),
        f"il ne vaut pas le prenom seul ({legende.declencheur('lena')}) — un "
        f"mot reel porterait du sens qu'on ne veut pas")
verifie(legende.declencheur("Léna 42!").isalnum(),
        "et il reste alphanumerique quel que soit le nom donne")

print("\n[8] la narration de Florence-2 devient des descripteurs")
brut = ("In this image we can see a woman standing. She is wearing a grey top. "
        "On the backside we can see a white color wall.")
propre = legende._propre(legende._sans_narration(brut))
verifie("in this image" not in propre and "we can see" not in propre,
        f"« {propre} »")
verifie("grey top" in propre and "white wall" in propre,
        "l'information est gardee, seule la tournure part")

print("\n" + "=" * 70)
print("tout est vert" if not KO else f"{KO} ECHEC(S)")
sys.exit(1 if KO else 0)
