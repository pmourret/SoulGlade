"""The prompt enhancer's engine: llama-server (llama.cpp) running Gemma 4 E4B.

    python AUTOMATION/llm_server.py --install    download into .toolchain/llama/
    python AUTOMATION/llm_server.py --check      say what is missing

Measured 27/09 (DOCS/cadrage/2026-09-27-it10-c8-amelioration-ia.md, step 3 bis):
5 to 10 times faster than ComfyUI's TextGenerate on the same model, and the
action of a scene kept. ComfyUI stays the fallback: `Unavailable` is the one
signal the caller turns into a ComfyUI call, so a machine without this engine
still enhances, only slower.

Rules, the same as comfy_server.py:
  - never a second instance: the port is probed first, under a lock;
  - never killed automatically. llama-server's own `--sleep-idle-seconds`
    gives its VRAM back when idle (3.2 GB measured) and wakes on the next
    request (2.2 s measured), so there is nothing to stop;
  - installed only on an explicit command, never at startup: 6 GB.

Its settings live in PLATFORM/llm.json (`server`), its downloads in the
manifest (`llm_server`, invariant 12).
"""
import json
import subprocess
import sys
import threading
import time
import urllib.error
import urllib.request
import zipfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

import logs  # noqa: E402

REPO = HERE.parent
ROOT = REPO / ".toolchain" / "llama"
SETTINGS = json.loads((REPO / "PLATFORM" / "llm.json").read_text(encoding="utf-8"))["server"]
EXE = ROOT / "llama-server.exe"
MODEL = ROOT / SETTINGS["model_file"]
PORT = SETTINGS["port"]
LOG_FILE = logs.LOG_DIR / "llama-server.log"

_lock = threading.Lock()


class Unavailable(RuntimeError):
    """The engine cannot answer: not installed, not starting, or failing.
    The caller falls back to ComfyUI."""


def _url(path):
    return f"http://127.0.0.1:{PORT}{path}"


def is_up(timeout=2):
    """True when a llama-server answers on the port (asleep counts as up)."""
    try:
        urllib.request.urlopen(_url("/health"), timeout=timeout).close()
        return True
    except Exception:
        return False


def missing():
    """The files the engine needs and does not have, by name."""
    return [p.name for p in (EXE, MODEL) if not p.exists()]


def ensure():
    """Make sure a server answers, starting one if needed. Raises Unavailable."""
    with _lock:
        if is_up():
            return
        if missing():
            raise Unavailable(f"llama-server non installé ({', '.join(missing())}) — "
                              "python AUTOMATION/llm_server.py --install")
        LOG_FILE.parent.mkdir(parents=True, exist_ok=True)
        cmd = [str(EXE), "-m", str(MODEL), "--port", str(PORT), "--jinja",
               "-ngl", str(SETTINGS["gpu_layers"]), "-c", str(SETTINGS["context"]),
               "--sleep-idle-seconds", str(SETTINGS["sleep_idle_seconds"]),
               "--log-file", str(LOG_FILE)]
        subprocess.Popen(cmd, cwd=str(ROOT), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                         creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0))
        deadline = time.time() + SETTINGS["start_timeout_seconds"]
        while time.time() < deadline:
            if is_up():
                return
            time.sleep(0.5)
        raise Unavailable(f"llama-server ne répond pas après {SETTINGS['start_timeout_seconds']} s "
                          f"— voir {LOG_FILE}")


def chat(prompt, temperature=0.7, max_tokens=200, timeout=120):
    """One answer to one prompt. Thinking is always off: with it Gemma spends
    its whole token budget thinking and answers nothing (measured 27/09)."""
    ensure()
    body = {"messages": [{"role": "user", "content": prompt}], "temperature": temperature,
            "max_tokens": max_tokens, "chat_template_kwargs": {"enable_thinking": False}}
    req = urllib.request.Request(_url("/v1/chat/completions"), data=json.dumps(body).encode(),
                                 headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return json.load(r)["choices"][0]["message"]["content"]
    except (OSError, ValueError, KeyError, IndexError) as e:  # URLError and HTTPError are OSError
        raise Unavailable(f"llama-server en erreur : {e}") from e


def install(log=print):
    """Download what the manifest declares and is not there yet."""
    import comfy_provision
    spec = comfy_provision.load_manifest()["llm_server"]
    ROOT.mkdir(parents=True, exist_ok=True)
    for archive in spec["archives"]:
        marker = ROOT / (archive["filename"] + ".done")
        if marker.exists():
            continue
        target = ROOT / archive["filename"]
        log(f"téléchargement {archive['filename']}…")
        comfy_provision._download(archive["url"], target)
        with zipfile.ZipFile(target) as z:
            z.extractall(ROOT)
        target.unlink()
        marker.touch()
    model = ROOT / spec["model"]["filename"]
    if not model.exists():
        log(f"téléchargement {model.name}…")
        comfy_provision._download(spec["model"]["url"], model)
    log(f"llama-server {spec['version']} installé dans {ROOT}")


def _main(argv):
    if "--install" in argv:
        install()
    gone = missing()
    print(f"manquant : {', '.join(gone)}" if gone else f"installé dans {ROOT}")
    return 1 if gone else 0


if __name__ == "__main__":
    sys.exit(_main(sys.argv[1:]))
