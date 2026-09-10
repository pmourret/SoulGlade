"""Formes echangees par l'ecran du jeu d'entrainement.

Un schema par forme reellement echangee, a la frontiere HTTP
(`.claude/rules/backend.md`) : le coeur metier -- `entrainement.py`,
`base.py` -- ne connait ni HTTP ni Pydantic, et ne les connaitra pas.

`extra="allow"` sur les reponses, pour la raison que la regle donne : ces
corps relaient des donnees que cette couche ne possede pas (les criteres et
les axes de diversite viennent de `entrainement.py`, le releve d'un export
vient de son manifeste). Tronquer une cle inconnue casserait l'ecran loin du
changement qui l'a causee.
"""
from typing import Optional

from pydantic import BaseModel, ConfigDict


class TrainingImage(BaseModel):
    """Une ligne de la file, telle que l'ecran la montre."""
    model_config = ConfigDict(extra="allow")

    fichier: str
    scene: Optional[str] = None
    intention: Optional[str] = None
    ton: Optional[str] = None
    format: Optional[str] = None
    anatomie: Optional[str] = None
    mains_juge: Optional[str] = None
    lora_identite: Optional[str] = None
    # L'embedding survit en base a la disparition du PNG : la file et
    # l'exportable ne sont pas le meme nombre, et le taire serait un mensonge.
    sans_fichier: bool = False
    # Etiquetee par personne : son absence de defaut est supposee, pas connue.
    sans_etiquette: bool = False


class TrainingExcluded(BaseModel):
    """Une ecartee, et l'axe de defaut objectif qui l'a ecartee."""
    fichier: str
    raison: list[str]


class TrainingProposalResponse(BaseModel):
    model_config = ConfigDict(extra="allow")

    ok: bool
    personnage: str
    declencheur: str
    # None quand le personnage n'a pas encore de jeu de reference actif : ce
    # n'est pas une erreur, c'est un etat, et `blocage` le dit en toutes
    # lettres.
    jeu: Optional[dict] = None
    pret: bool
    blocage: str
    compteurs: dict
    file: list[TrainingImage]
    ecartes: list[TrainingExcluded]
    cohesion: Optional[float] = None
    ecart_type: Optional[float] = None
    outliers: list[dict]
    diversite: dict
    criteres: list[dict]
    # Combien de legendes viendront du prompt, combien du legendeur de vision.
    # C'est ce compte qui dit si l'export coute des secondes ou des minutes.
    legendes: dict


class TrainingExportsResponse(BaseModel):
    model_config = ConfigDict(extra="allow")

    ok: bool
    exports: list[dict]


class TrainingExportRequest(BaseModel):
    """Ce que l'ecran envoie pour lancer un export.

    `repetitions` absent laisse le defaut propose par `entrainement.py`. Ce
    n'est pas une borne qu'on ecrete : un nombre de repetitions est un reglage
    d'entrainement, il appartient a l'utilisateur (`PROJET.md`), et une valeur
    absurde se refuse plutot que de se corriger en silence.
    """
    repetitions: Optional[int] = None
    avec_vision: bool = True


class TrainingExportResponse(BaseModel):
    model_config = ConfigDict(extra="allow")

    ok: bool
    dossier: str
    dossier_images: str
    images: int
    ancre_reinjectee: Optional[str] = None
    declencheur: Optional[str] = None
    declencheur_cree: bool = False
    famille: Optional[str] = None
    repetitions: Optional[int] = None
    script: Optional[str] = None
    legendes: dict
