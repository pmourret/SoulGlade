"""Un champ vide du panneau de reglages ne doit JAMAIS effacer config.json.

Bug reel (08/09/2026, Abyssiaelle, scene camp_soir) : le panneau serialise un
champ numerique vide en `NaN`, que JSON transporte en `null`. Fusionne tel quel
dans `configuration["preset"]`, ce `null` remplacait la valeur mesuree — puis
`WorkflowRunner.api_for` faisait `float(None)` sur `grain_strength` /`sharpen`,
d'ou le TypeError remonte a l'interface. Abyssiaelle ne porte aucune de ces
deux cles dans son config.json : tous ses curseurs de cette section partaient
vides.

Lancer :  python AUTOMATION/tests/test_preset_overrides.py
"""
import sys
from pathlib import Path
from types import SimpleNamespace

AUTOMATION = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(AUTOMATION / "web"))
sys.path.insert(0, str(AUTOMATION))

from api.routers.production import preset_overrides    # noqa: E402

payload = SimpleNamespace(preset={"guidance": 6.0, "refiner": False,
                                  "sharpen": None, "grain_strength": None})
kept = preset_overrides(payload)

assert kept == {"guidance": 6.0, "refiner": False}, kept

# ce que la route en fait : la configuration garde ses valeurs mesurees, et
# aucune cle absente de config.json n'apparait a None
configuration = {"preset": {"guidance": 4.0, "steps": 30}}
configuration["preset"].update(kept)
assert configuration["preset"] == {"guidance": 6.0, "steps": 30,
                                   "refiner": False}, configuration
assert all(v is not None for v in configuration["preset"].values())

# le repli du runner redevient atteignable
p = configuration["preset"]
assert float(p.get("grain_strength", 0.0)) == 0.0
assert float(p.get("sharpen", 0.30)) == 0.30

print("OK — les champs vides du panneau n'ecrasent plus config.json")
