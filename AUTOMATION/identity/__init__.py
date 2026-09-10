"""Verrou d'identite cote GENERATION, choisi par l'univers (CLAUDE.md §4).

L'univers decide du mecanisme (PACKS/<id>/universe.json, cle `identity`) ;
tous ses personnages partagent la meme implementation, seuls les reglages
mesures (config.json, cle `identity`) et les assets de reference (`base_gelee`)
changent par personnage.

Ce paquet ne MESURE pas l'identite : le scoring InsightFace vit dans
AUTOMATION/qc_identity.py et reste commun a tous les univers, independamment
de la methode qui a genere le visage.

Contrat d'une implementation (voir pulid_flux.py pour la reference) :

    REQUIRED_ROLES : dict[str, tuple[str, str | None]]
        role -> (type de noeud ComfyUI, titre attendu ou None). Le runner les
        resout via ui_to_api.find_node et les ajoute a sa table de roles.

    apply(api, roles, character_config, job) -> None
        Modifie le graphe CONVERTI (format API) EN PLACE : injecte les poids du
        verrou et l'asset de reference du personnage. Meme mecanisme que
        WorkflowRunner.api_for pour guidance/seed. `job` fait partie du contrat
        pour une variation par job eventuelle ; pulid_flux ne s'en sert pas.
"""

# ---------------------------------------------------------------------------
# CE QUI SUIT EST DEFINI AVANT L'IMPORT DES IMPLEMENTATIONS, ET CE N'EST PAS
# UN DETAIL DE STYLE : pulid_flux et lora_sdxl importent ces noms depuis ce
# paquet. Les declarer apres `from . import ...` fait lever un ImportError de
# module partiellement initialise, au chargement du runner -- donc partout.
# ---------------------------------------------------------------------------

# Role du LoRA d'identite, COMMUN AUX DEUX MECANISMES. Le fragment de titre
# n'est pas un detail : `ui_to_api.find_node` refuse un type ambigu, et le
# graphe de Lena porte DEUX LoraLoaderModelOnly (le LoRA de realisme et le
# Lightning de la branche Qwen). Sans titre attendu, le role retombait sur None
# et `apply` levait sur un personnage qui a pourtant tout ce qu'il faut.
# « LoRA personnage » est deja le titre du noeud d'Abyssiaelle : le fragment a
# ete choisi pour qu'aucun graphe existant n'ait a etre renomme.
ROLE_LORA = ("LoraLoaderModelOnly", "LoRA personnage")

# Roles qu'un graphe a le droit de ne pas porter. `apply` ne les exige que si
# le personnage les demande vraiment (config.json / identity / lora).
ROLES_OPTIONNELS = ("character_lora",)


def verifier_roles(roles, required, mecanisme):
    """Leve si un role OBLIGATOIRE manque au graphe. Les optionnels passent."""
    for role, (typ, titre) in required.items():
        if role in ROLES_OPTIONNELS or roles.get(role):
            continue
        raise RuntimeError(
            f"verrou {mecanisme} : role « {role} » introuvable dans le "
            f"workflow ({typ} / {titre!r}) — le graphe de ce personnage doit "
            f"porter le groupe d'identite")


def injecter_lora(api, roles, character_config, mecanisme):
    """Branche le LoRA d'identite du personnage, si son config.json en nomme un.

    PARTAGE PAR LES DEUX MECANISMES, et c'est tout l'objet de cette fonction.
    Ce bloc ne dependait que des roles `character_lora` et `positive` et de
    `config.json / identity / lora` : il etait deja agnostique de la famille de
    modele, mais il vivait dans lora_sdxl.py, donc PuLID-Flux ne l'avait pas.
    Le manque cote Lena etait dans le module d'identite, pas dans le graphe.

    Rien si le personnage ne nomme aucun LoRA : c'est le cas nominal, un
    personnage qui debute n'en a pas. En revanche, s'il en nomme un et que le
    graphe n'a pas de role pour le recevoir, on LEVE — le silence produirait
    des images sans le verrou que le personnage croit avoir.
    """
    lora = ((character_config.get("identity") or {}).get("lora")) or {}
    if not lora.get("name"):
        return
    role = roles.get("character_lora")
    if not role:
        typ, titre = ROLE_LORA
        raise RuntimeError(
            f"verrou {mecanisme} : config.json / identity / lora demande le "
            f"LoRA « {lora['name']} », mais ce workflow n'a pas le role "
            f"« character_lora » ({typ} dont le titre contient {titre!r}) "
            f"pour le recevoir")
    knobs = api[str(role["id"])]["inputs"]
    knobs["lora_name"] = lora["name"]
    knobs["strength_model"] = float(lora.get("strength", 1.0))
    trigger = (lora.get("trigger_word") or "").strip()
    if trigger:
        positive = roles.get("positive")
        if positive:
            pknobs = api[str(positive["id"])]["inputs"]
            pknobs["text"] = f"{trigger}, {pknobs['text']}"


def lora_actif(roles, character_config):
    """Nom du LoRA d'identite REELLEMENT applique, ou None.

    UNE SEULE VERITE, DEUX LECTEURS. La condition est double — le graphe doit
    porter le role `character_lora`, ET le personnage doit nommer un LoRA — et
    elle etait jusqu'ici ecrite en dur dans `runner/comfy.py` seulement, la ou
    elle sert a forcer le noeud actif. Le jour ou la base a eu besoin de savoir
    si une image sortait d'un modele derive, la reecrire ailleurs aurait recree
    le defaut du 09/09/2026 : deux endroits pour une meme verite, qui divergent
    en silence. Un LoRA nomme mais sans role dans le graphe n'est PAS applique,
    et cette fonction le dit.

    Rendu tel quel a `image.lora_identite` : non nul = image DERIVED au sens du
    mecanisme d'identite (cadrage du 09/09), donc jamais une ancre.
    """
    if not roles or not roles.get("character_lora"):
        return None
    return ((character_config or {}).get("identity") or {}).get("lora", {}).get("name") or None


from . import pulid_flux, lora_sdxl          # noqa: E402

_IMPLS = {
    "pulid_flux": pulid_flux,
    "lora_sdxl": lora_sdxl,
}


def get(name):
    """Implementation d'identite par nom (valeur de universe.json / `identity`)."""
    try:
        return _IMPLS[name]
    except KeyError:
        raise ValueError(
            f"mecanisme d'identite inconnu : {name!r} — connus : "
            f"{', '.join(sorted(_IMPLS))}")


def for_universe(universe_id):
    """Implementation d'identite de l'univers (universe.json, cle `identity`)."""
    import universe
    return get(universe.load_universe(universe_id)["identity"])
