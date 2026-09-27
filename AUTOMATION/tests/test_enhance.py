# -*- coding: utf-8 -*-
"""L'amelioration des prompts par IA (IT-10 chantier 8).

Ce que ce test verrouille, SANS ComfyUI (le modele local est remplace par un
bouchon qui note chaque consigne recue et rend une reponse fixe) :
  1. la detection de langue, sans appel au modele ;
  2. « son/sa/ses » neutralises AVANT le modele, sans toucher « sans », « sable » ;
  3. anglais : un seul appel (amelioration) ; francais : traduction puis
     amelioration ; consigne d'edition : traduite, jamais amelioree ;
  3b. un mot de l'entree perdu : UNE relance qui le nomme, puis ce qui manque
     encore est rendu dans `lost`, jamais tu ;
  4. reponse illisible, champ vide, type inconnu : refuses, jamais avales ;
  5. la route n'accepte AUCUNE cle de plus — ni personnage ni ancre ne peut
     atteindre le modele (invariant 3), et le refus arrive avant tout appel ;
  6. le modele vient de PLATFORM/llm.json, et d'un seul endroit ;
  7. LE DIALECTE suit la famille du pack du personnage : deux personnages de
     packs differents (Flux, SDXL) recoivent chacun le leur, une famille sans
     dialecte recoit le generique ; le modele n'apprend du personnage QUE sa
     famille ;
  8. LA SCENE (panneau IA) : un appel par fragment, chacun sur son seul texte
     (mesure du 27/09 : avec le contexte, la lumiere debordait dans la pose) ;
     `only` ne reecrit que le fragment vise ; un fragment vide le reste, sans
     appel ; `vary` monte la temperature ; la consigne passe EN PRIORITE ;
     avec une consigne, une perte est signalee sans relance (« plus court »
     peut la demander) ; sans, une relance ;
  9. LE MOTEUR llama-server (etape 3 bis), devant un faux serveur : sa reponse
     est rendue sans passer par ComfyUI ; chaque requete coupe la reflexion ;
     un port qui repond deja ne lance rien, deux appels concurrents ne lancent
     jamais deux serveurs a la fois ; absent ou en erreur, l'appel repart par
     ComfyUI ; le manifeste declare l'executable et le modele avec leur url.

Le VRAI llama-server est coupe des l'en-tete (executable absent, port ferme) :
sur un poste ou il est installe, aucun test ne le lance.

Les personnages de sonde n'ont qu'un character.json, crees puis retires :
aucun test ne suppose CHARACTERS/ peuple.

Lancer :  python AUTOMATION/tests/test_enhance.py
"""
import json
import shutil
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
AUTOMATION = HERE.parent
sys.path.insert(0, str(AUTOMATION / "web"))
sys.path.insert(0, str(AUTOMATION))

import compose                                # noqa: E402
import enhance                                # noqa: E402
import llm_local                              # noqa: E402
import llm_server                             # noqa: E402
import shared_state as ss                     # noqa: E402
from api.main import app                      # noqa: E402
from fastapi.testclient import TestClient     # noqa: E402

KO = 0
CLIENT = TestClient(app, base_url="http://127.0.0.1")


def verifie(ok, texte):
    global KO
    print(f"  {'ok   ' if ok else 'ECHEC'} {texte}")
    if not ok:
        KO += 1


APPELS = []
TEMPERATURES = []
REPONSE = {"brut": '{"text": "standing, holding a \\"mug\\""}'}


def bouchon(prompt, temperature=None, **_):
    APPELS.append(prompt)
    TEMPERATURES.append(temperature)
    brut = REPONSE["brut"]
    return brut.pop(0) if isinstance(brut, list) else brut


llm_local.texte = bouchon


def port_libre():
    import socket
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        return sock.getsockname()[1]


llm_server.EXE = Path("absent") / "llama-server.exe"
llm_server.PORT = port_libre()


async def vivant():
    return True


ss.comfy_alive = vivant


def appels(fn):
    APPELS.clear()
    try:
        return fn(), list(APPELS)
    except Exception as e:                    # noqa: BLE001
        return e, list(APPELS)


print("1. detection de langue")
verifie(enhance.looks_french("elle lit un livre assise sur le rebord de la fenêtre"), "francais reconnu")
verifie(enhance.looks_french("néon rose, sol mouillé"), "francais court, par ses accents")
verifie(not enhance.looks_french("standing holding a mug, soft window light from the left"), "anglais reconnu")
verifie(not enhance.looks_french("   "), "vide : pas francais")

print("2. possessifs neutralises")
verifie(enhance.neutral_possessives("déboutonne sa chemise, son épaule, ses cheveux")
        == "déboutonne la chemise, le épaule, les cheveux", "son/sa/ses -> le/la/les")
verifie(enhance.neutral_possessives("sans sable, en saison") == "sans sable, en saison",
        "mots qui les contiennent intacts")

print("3. les etapes")
r, a = appels(lambda: enhance.enhance("scene", "standing holding a mug"))
verifie(len(a) == 1 and "OLD: standing holding a mug" in a[0], "anglais : une amelioration seule")
verifie(enhance.KINDS["scene"] in a[0], "la consigne porte le type du fragment")
verifie(r == {"text": 'standing, holding a "mug"', "translated": False, "lost": []}, "reponse JSON relue, guillemets echappes")
r, a = appels(lambda: enhance.enhance("pose", "debout, sa main sur la hanche"))
verifie(len(a) == 2 and "TEXT: debout, la main sur la hanche" in a[0], "francais : traduit, possessif neutre")
verifie("OLD: standing" in a[1] and r["translated"], "puis ameliore depuis la traduction")
r, a = appels(lambda: enhance.enhance("edit", "remove the bra"))
verifie(a == [] and r == {"text": "remove the bra", "translated": False, "lost": []},
        "consigne d'edition anglaise : rendue telle quelle, sans appel")
r, a = appels(lambda: enhance.enhance("edit", "déboutonne sa chemise"))
verifie(len(a) == 1 and "TEXT:" in a[0], "consigne d'edition francaise : traduite, jamais amelioree")

print("3b. les idees perdues")
verifie(enhance.lost_words("topless, lying naked, sensual", "lying topless, soft light") == ["naked", "sensual"],
        "les mots disparus, dans l'ordre")
verifie(enhance.lost_words("soft light illuminates her", "light softly illuminating the room") == [],
        "meme racine, mot outil, pronom : pas une perte")
REPONSE["brut"] = ['{"text": "lying on the bed"}', '{"text": "lying naked on the bed"}']
r, a = appels(lambda: enhance.enhance("scene", "lying naked on the bed"))
verifie(len(a) == 2 and "dropped these words of OLD: naked" in a[1], "perte : une relance qui nomme le mot")
verifie(r["text"] == "lying naked on the bed" and r["lost"] == [], "rendu par la relance : plus rien de perdu")
REPONSE["brut"] = ['{"text": "lying on the bed"}', '{"text": "lying on a bed"}']
r, a = appels(lambda: enhance.enhance("scene", "lying naked on the bed"))
verifie(len(a) == 2 and r["lost"] == ["naked"], "toujours perdu : une seule relance, et le mot signale")
REPONSE["brut"] = '{"text": "standing, holding a mug"}'

print("4. refus")
r, a = appels(lambda: enhance.enhance("scene", "  "))
verifie(isinstance(r, ValueError) and a == [], "champ vide refuse avant le modele")
r, a = appels(lambda: enhance.enhance("anchor", "a woman"))
verifie(isinstance(r, ValueError) and a == [], "type inconnu refuse avant le modele")
REPONSE["brut"] = "user\n"
r, a = appels(lambda: enhance.enhance("scene", "standing"))
verifie(isinstance(r, llm_local.LLMError) and "illisible" in str(r), "reponse illisible : erreur, jamais le texte brut")
REPONSE["brut"] = '{"text": "standing, holding a mug"}'

FLUX, SDXL = "probe-enhance-flux", "probe-enhance-sdxl"
SONDES = {FLUX: "instagram-influenceur", SDXL: "rpg-personnage"}
OFM = AUTOMATION.parent
for cid, pack in SONDES.items():
    d = OFM / "CHARACTERS" / cid
    shutil.rmtree(d, ignore_errors=True)
    d.mkdir(parents=True)
    (d / "character.json").write_text(json.dumps({
        "id": cid, "name": cid, "universe": pack, "type": pack, "output_style": "realiste",
        "content_types": {"image": True}, "nsfw": False}), encoding="utf-8")


def poste(route, corps, cid=FLUX):
    return CLIENT.post(f"{route}?character={cid}", json=corps)


try:
    print("5. la route")
    APPELS.clear()
    rep = poste("/api/enhance", {"kind": "scene", "text": "standing", "anchor": "a woman in her thirties"})
    verifie(rep.status_code == 400 and APPELS == [], "une ancre dans le payload : refusee, modele jamais appele")
    rep = poste("/api/enhance", {"kind": "scene", "text": "standing", "character": "lena"})
    verifie(rep.status_code == 400 and APPELS == [], "un personnage dans le payload : refuse")
    rep = poste("/api/enhance", {"kind": "scene", "text": "standing"})
    verifie(rep.status_code == 200 and rep.json() == {"ok": True, "text": "standing, holding a mug",
                                                      "translated": False, "lost": []},
            "proposition rendue")
    rep = poste("/api/enhance", {"kind": "scene", "text": ""})
    verifie(rep.status_code == 400 and rep.json()["ok"] is False and rep.json()["erreur"],
            "champ vide : 400 avec une cause lisible")
    REPONSE["brut"] = "rien"
    rep = poste("/api/enhance", {"kind": "scene", "text": "standing"})
    verifie(rep.status_code == 400 and "illisible" in rep.json()["erreur"], "echec du modele : 400 avec sa cause")
    REPONSE["brut"] = '{"text": "standing, holding a mug"}'

    print("6. le modele, regle a la plateforme")
    reglage = json.loads(llm_local.SETTINGS_PATH.read_text(encoding="utf-8"))
    graphe = llm_local.graphe_texte("x")
    verifie(graphe["1"]["inputs"]["clip_name"] == reglage["model"]
            and graphe["1"]["inputs"]["type"] == reglage["loader_type"],
            "le graphe charge le modele de PLATFORM/llm.json")
    verifie(not hasattr(compose, "CLIP_MODEL"), "compose ne porte plus sa propre copie du nom")

    print("7. le dialecte suit la famille du pack")
    dialectes = reglage["dialects"]
    APPELS.clear()
    poste("/api/enhance", {"kind": "scene", "text": "standing"}, FLUX)
    poste("/api/enhance", {"kind": "scene", "text": "standing"}, SDXL)
    verifie(len(APPELS) == 2 and dialectes["flux"][0] in APPELS[0] and dialectes["sdxl"][0] not in APPELS[0],
            "personnage Flux : le dialecte Flux, et lui seul")
    verifie(dialectes["sdxl"][0] in APPELS[1] and dialectes["flux"][0] not in APPELS[1],
            "personnage SDXL : le dialecte SDXL, et lui seul")
    verifie(enhance.dialect("famille-inconnue") == enhance.dialect("generic") != "",
            "famille sans dialecte : le generique")
    verifie(all(cid not in p for p in APPELS for cid in SONDES), "le modele ne recoit jamais l'id du personnage")

    print("8. la scene")
    scene = {"base": "reading a book", "light": "window light", "pose": "sitting"}

    def reponses(*textes):
        return [json.dumps({"text": t}) for t in textes]

    REPONSE["brut"] = reponses("reading a thick book", "soft window light", "sitting cross-legged")
    r, a = appels(lambda: enhance.enhance_scene(scene, family="flux"))
    verifie(len(a) == 3 and all(f"OLD: {v}" in p for v, p in zip(scene.values(), a)),
            "un appel par fragment, chacun sur son seul texte")
    verifie("window light" not in a[0] and "window light" not in a[2] and "reading a book" not in a[1],
            "aucun fragment ne voit les autres (pas de debordement de role)")
    verifie((r["base"], r["light"], r["pose"]) == ("reading a thick book", "soft window light", "sitting cross-legged")
            and r["lost"] == {"base": [], "light": [], "pose": []}, "trois fragments rendus, aucune perte")
    verifie(enhance.KINDS["light"] in a[1] and enhance.KINDS["pose"] in a[2], "chaque fragment porte son role")
    verifie(TEMPERATURES[-1] == 0.2, "temperature fidele par defaut")
    REPONSE["brut"] = reponses("soft window light")
    r, a = appels(lambda: enhance.enhance_scene(scene, only="light"))
    verifie(len(a) == 1 and (r["base"], r["light"], r["pose"]) == ("reading a book", "soft window light", "sitting"),
            "only=light : un appel, les deux autres a l'identique")
    REPONSE["brut"] = reponses("reading a thick book", "soft window light", "sitting cross-legged")
    r, a = appels(lambda: enhance.enhance_scene(scene, vary=True))
    verifie(set(TEMPERATURES[-3:]) == {0.7}, "vary : temperature plus libre")
    REPONSE["brut"] = reponses("reading a thick book")
    r, a = appels(lambda: enhance.enhance_scene({"base": "reading a book", "light": "", "pose": ""}))
    verifie(len(a) == 1 and r["light"] == "" and r["pose"] == "", "un fragment vide reste vide, sans appel")
    REPONSE["brut"] = reponses("a book")
    r, a = appels(lambda: enhance.enhance_scene({"base": "reading a book"}, instruction="plus court"))
    verifie(len(a) == 1 and "higher priority" in a[0] and "plus court" in a[0]
            and r["lost"]["base"] == ["reading"], "avec consigne : en priorite, perte signalee sans relance")
    REPONSE["brut"] = reponses("a book", "reading a thick book")
    r, a = appels(lambda: enhance.enhance_scene({"base": "reading a book"}))
    verifie(len(a) == 2 and "dropped these words of OLD: reading" in a[1] and r["lost"]["base"] == [],
            "sans consigne : une relance qui nomme le mot")
    REPONSE["brut"] = "user"
    r, a = appels(lambda: enhance.enhance_scene(scene))
    verifie(isinstance(r, llm_local.LLMError), "reponse illisible : erreur")
    r, a = appels(lambda: enhance.enhance_scene({"base": "", "light": "", "pose": ""}))
    verifie(isinstance(r, ValueError) and a == [], "scene vide : refusee avant le modele")
    r, a = appels(lambda: enhance.enhance_scene(scene, only="anchor"))
    verifie(isinstance(r, ValueError) and a == [], "fragment inconnu : refuse avant le modele")
    APPELS.clear()
    rep = poste("/api/enhance/scene", {**scene, "anchor": "a woman"})
    verifie(rep.status_code == 400 and APPELS == [], "route scene : une ancre dans le payload, refusee")
    REPONSE["brut"] = reponses("soft window light")
    rep = poste("/api/enhance/scene", {**scene, "only": "light", "instruction": "plus doux"}, SDXL)
    verifie(rep.status_code == 200 and rep.json()["base"] == "reading a book"
            and rep.json()["light"] == "soft window light" and dialectes["sdxl"][0] in APPELS[-1]
            and "plus doux" in APPELS[-1], "route scene : only, consigne, dialecte du personnage")

    async def eteint():
        return False

    ss.comfy_alive = eteint
    rep = poste("/api/enhance", {"kind": "scene", "text": "standing"})
    verifie(rep.status_code == 503 and rep.json()["erreur"] == "ComfyUI hors ligne", "ComfyUI eteint : 503")
    rep = poste("/api/enhance/scene", scene)
    verifie(rep.status_code == 503, "ComfyUI eteint : 503 sur la scene aussi")
finally:
    for cid in SONDES:
        shutil.rmtree(OFM / "CHARACTERS" / cid, ignore_errors=True)

print("9. le moteur llama-server")
import http.server                            # noqa: E402
import subprocess                             # noqa: E402
import threading                              # noqa: E402
import time                                   # noqa: E402

RECUES = []
STATUT = {"code": 200}


class FauxServeur(http.server.BaseHTTPRequestHandler):
    def log_message(self, *_):
        pass

    def _rend(self, code, corps):
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps(corps).encode())

    def do_GET(self):
        self._rend(200, {"status": "ok"})

    def do_POST(self):
        RECUES.append(json.loads(self.rfile.read(int(self.headers["Content-Length"]))))
        self._rend(STATUT["code"], {"choices": [{"message": {"content": '{"text": "from llama"}'}}]})


faux = http.server.ThreadingHTTPServer(("127.0.0.1", 0), FauxServeur)
threading.Thread(target=faux.serve_forever, daemon=True).start()
LANCES, MOMENTS = [], []
popen_reel = subprocess.Popen
subprocess.Popen = lambda cmd, **_: (LANCES.append(cmd), MOMENTS.append(time.time()))
port_ferme = llm_server.PORT
try:
    llm_server.PORT = faux.server_address[1]
    APPELS.clear()
    r = enhance.enhance("light", "from llama")
    verifie(r["text"] == "from llama" and APPELS == [], "la reponse vient de llama-server, pas de ComfyUI")
    verifie(RECUES and all(b["chat_template_kwargs"] == {"enable_thinking": False} for b in RECUES),
            "chaque requete coupe la reflexion")
    verifie(RECUES[-1]["temperature"] == 0.2, "la temperature demandee est transmise")
    verifie(LANCES == [], "le port repond deja : aucun serveur lance")

    STATUT["code"] = 500
    REPONSE["brut"] = '{"text": "from comfy"}'
    r = enhance.enhance("light", "from comfy")
    verifie(r["text"] == "from comfy" and APPELS, "serveur en erreur : repli sur ComfyUI")
    STATUT["code"] = 200

    llm_server.PORT = port_ferme
    APPELS.clear()
    r = enhance.enhance("light", "from comfy")
    verifie(r["text"] == "from comfy" and APPELS and LANCES == [],
            "non installe, port ferme : repli sur ComfyUI, rien de lance")

    # Installed but never answering: each ensure() launches under the lock,
    # so two concurrent calls never launch two servers at the same time.
    exe, modele = llm_server.EXE, llm_server.MODEL
    llm_server.EXE = llm_server.MODEL = Path(__file__)
    delai = llm_server.SETTINGS["start_timeout_seconds"]
    llm_server.SETTINGS["start_timeout_seconds"] = 1
    erreurs = []

    def demarre():
        try:
            llm_server.ensure()
        except llm_server.Unavailable as e:
            erreurs.append(e)

    fils = [threading.Thread(target=demarre) for _ in range(2)]
    for f in fils:
        f.start()
    for f in fils:
        f.join()
    llm_server.SETTINGS["start_timeout_seconds"] = delai
    llm_server.EXE, llm_server.MODEL = exe, modele
    verifie(len(erreurs) == 2, "installe mais muet : Unavailable, jamais un blocage")
    verifie(len(LANCES) == 2 and MOMENTS[1] - MOMENTS[0] >= 0.9,
            "deux appels concurrents : le second lance apres l'attente du premier (verrou)")
    verifie("--sleep-idle-seconds" in LANCES[0] and "--jinja" in LANCES[0],
            "lance avec la veille et le gabarit de chat")
finally:
    subprocess.Popen = popen_reel
    faux.shutdown()

manifeste = json.loads((AUTOMATION / "comfyui_manifest.json").read_text(encoding="utf-8"))["llm_server"]
verifie(all(a.get("url") for a in manifeste["archives"]) and bool(manifeste["model"].get("url"))
        and manifeste["model"]["filename"] == llm_server.SETTINGS["model_file"],
        "manifeste : executable et modele declares avec leur url, le modele du reglage")

print(f"\n{'OK' if not KO else f'{KO} ECHEC(S)'}")
sys.exit(1 if KO else 0)
