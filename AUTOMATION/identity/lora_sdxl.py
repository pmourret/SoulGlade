"""Verrou d'identite IPAdapter FaceID (+ LoRA de personnage optionnel) —
univers rpg-personnage (famille SDXL/Pony).

Mecanisme retenu a l'onboarding d'Abyssiaelle (J6, premier personnage de cet
univers) : IPAdapter FaceID par defaut, meme logique que PuLID-Flux pour Lena
— image de reference gelee, aucun entrainement necessaire.

MESURE REELLE (J6 etape 6, Abyssiaelle) : ce plan de depart ne tient pas.
Sweep sur weight/weight_faceidv2 (0.3 a 2.0, meme seed/prompt/LoRA) : le score
d'identite InsightFace BAISSE quand le poids IPAdapter MONTE (0.40 a w=0.7,
0.24 a w=2.0), et IPAdapter seul (sans LoRA, w=1.5) s'effondre a 0.09 — pire
que deux visages differents. Le LoRA de personnage seul (w=0, lora=1.0) fait
mieux que toute combinaison avec IPAdapter actif (0.51-0.63 sur 6 seeds, cadre
neutre). Pour CE personnage, IPAdapter FaceID ne verrouille pas l'identite,
il la degrade — le LoRA entraine porte seul l'identite reelle. Reglage retenu :
weight/weight_faceidv2 a 0.0 (role garde actif dans le graphe pour ne pas
toucher a l'univers, poids neutralise par la mesure -- CHARACTERS/abyssiaelle/
config.json). Un futur personnage du meme univers peut mesurer autre chose :
ce n'est pas une regle de l'univers, c'est une mesure PAR personnage (comme
partout ailleurs dans ce fichier). Noeuds confirmes
installes sur le ComfyUI de ce poste (object_info reel) : IPAdapterFaceID,
IPAdapterUnifiedLoaderFaceID, IPAdapterInsightFaceLoader
(ComfyUI_IPAdapter_plus). Seul le noeud d'application (IPAdapterFaceID) et
l'image de reference sont des roles : les loaders (unified loader,
InsightFace) sont des choix structurels baked dans le graphe, pas des
reglages par personnage — meme partage des responsabilites que pulid_flux.py,
qui ne touche pas non plus a PulidFluxModelLoader/EvaClipLoader/InsightFaceLoader.

Un LoRA de personnage reste importable et activable EN PLUS du verrou
IPAdapter (pas a sa place) : le graphe peut porter un LoraLoaderModelOnly
bypasse par defaut, meme convention que le « LoRA realisme (bypass) / futur
LoRA Lena » deja present dans le workflow de Lena. Il ne s'active que si
config.json / identity / lora est renseigne ET que le role existe dans le
graphe — aucune chaine d'ENTRAINEMENT LoRA n'existe dans ce depot (un LoRA se
forme hors plateforme, ici via kohya_ss) ; ce role reste inerte tant que le
resultat n'est pas branche a la main. Abyssiaelle : `abyss1a_v1.safetensors`,
entraine le 20/07/2026 sur 53 images (mot declencheur `abyss1a`), branche J6
etape 6.

Injecte dans le graphe converti, depuis WorkflowRunner.api_for :
  - weight / weight_faceidv2 / start_at / end_at   <- config.json, cle `identity`
  - image de reference                              <- config.json, cle `base_gelee`
  - (optionnel) lora_name / strength / trigger_word <- config.json, cle
    `identity.lora`, seulement si presente
"""

from . import ROLE_LORA, injecter_lora, verifier_roles   # noqa: E402

REQUIRED_ROLES = {
    "ipadapter_apply": ("IPAdapterFaceID", "IPAdapter FaceID - verrou identite"),
    "ipadapter_ref": ("LoadImage", "BASE GELEE - reference d'identite"),
    # role optionnel (identity.ROLES_OPTIONNELS) : exige seulement si
    # config.json / identity / lora est renseigne. Resolu de facon tolerante
    # par comfy.py._roles() -> None si le graphe ne le porte pas.
    # Cherchait par TYPE SEUL jusqu'au 2026-09-10 : ca tenait parce que le
    # graphe d'Abyssiaelle ne porte qu'un LoraLoaderModelOnly, et ca serait
    # tombe en silence (find_node leve sur l'ambigu, le role retombe a None)
    # le jour ou il en porterait un second. Le titre est desormais attendu,
    # partage avec pulid_flux, et celui de son noeud le contient deja.
    "character_lora": ROLE_LORA,
}

# Points de depart generiques de l'ecosysteme IPAdapter FaceID SDXL — remplaces
# par la mesure reelle d'Abyssiaelle (J6 etape 6, CHARACTERS/abyssiaelle/
# config.json / identity) des qu'elle existe ; ne restent DEFAULTS que pour un
# personnage rpg-personnage pas encore mesure.
DEFAULTS = {"weight": 0.7, "weight_faceidv2": 1.0, "start_at": 0.0, "end_at": 1.0}


def apply(api, roles, character_config, job):
    verifier_roles(roles, REQUIRED_ROLES, "IPAdapter FaceID")

    idc = {**DEFAULTS, **(character_config.get("identity") or {})}
    knobs = api[str(roles["ipadapter_apply"]["id"])]["inputs"]
    knobs["weight"] = float(idc["weight"])
    knobs["weight_faceidv2"] = float(idc["weight_faceidv2"])
    knobs["start_at"] = float(idc["start_at"])
    knobs["end_at"] = float(idc["end_at"])

    ref = character_config.get("base_gelee")
    if not ref:
        raise RuntimeError("verrou IPAdapter FaceID : config.json sans `base_gelee`")
    api[str(roles["ipadapter_ref"]["id"])]["inputs"]["image"] = ref

    # Le bloc d'injection vit maintenant dans identity/__init__.py : il ne
    # dependait que des roles `character_lora` et `positive` et de
    # `identity.lora`, donc il etait deja agnostique de la famille de modele --
    # il lui manquait juste d'etre a un endroit ou PuLID-Flux pouvait l'appeler
    # aussi (2026-09-10).
    injecter_lora(api, roles, character_config, "IPAdapter FaceID")
