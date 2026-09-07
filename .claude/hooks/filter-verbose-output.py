# -*- coding: utf-8 -*-
"""Trim noisy test/validation output before it enters the context.

Rewrites the Bash command so its output is captured, then replayed as
(a) the lines that matter and (b) the tail. The tail is what keeps the
summary line and the real exit code: a run that prints nothing gets
re-run without the filter, which costs twice instead of nothing.

Never blocks. Any failure -- bad stdin, missing key, unexpected shape --
prints "{}" and exits 0, and the command runs untouched.
"""
import json
import re
import sys

# Compiled at import, on purpose and OUTSIDE the catch-all in __main__: a
# malformed pattern raises on the FIRST search, so every later pattern is
# skipped too and the whole hook dies silently as "{}" -- the exact
# failure of the shell version this replaces. Compiling here turns that
# into a loud load-time error instead.
#
# TRIGGERS and COMPOUND together are also what bounds the
# permissionDecision below: six test-launcher shapes, and nothing
# composed. Widening either one widens what gets auto-allowed.
TRIGGERS = tuple(re.compile(p) for p in (
    r"\bpytest\b",
    r"wf_check\.py",
    r"run_browser_tests\.py",
    r"tests[/\\]test_\w+\.py",
    r"toolchain\.py\s+(?:build|typecheck|types)\b",
    r"npm\s+run\s+(?:build|typecheck|types)\b",
))
# Wrapping a compound command would change its semantics, so leave it be.
COMPOUND = ("|", ">", "<", "&&", "||", ";", "\n")
# ...except a single leading `cd <path> && `, which Claude Code emits
# constantly and which would otherwise slip through unfiltered on the very
# commands this hook exists for. It is peeled off, the rest goes through
# the same checks, and the cd goes back in front of a BRACED envelope so a
# failing cd still short-circuits the way it did before the rewrite.
# A second `cd a && cd b && ...` leaves `&&` in the remainder, which
# COMPOUND then rejects: chains fall back to untouched, which is safe.
CD_PREFIX = re.compile(
    r"""^\s*(cd\s+(?:"[^"]*"|'[^']*'|[^\s&|;<>]+)\s*&&\s*)(\S.*)$""", re.S)
KEEP = r"(FAIL|ERROR|error:|Traceback|AssertionError|passed|failed|OK)"


def wrap(cmd):
    # `(exit $rc)` in a subshell, never a bare `exit`: Claude Code reuses a
    # persistent shell between Bash calls, and a bare exit at the end of a
    # rewritten command kills it. The symptom would be "the session stops
    # running anything", with nothing pointing back at this hook.
    return (
        'f=$(mktemp); { ' + cmd + '; } > "$f" 2>&1; rc=$?; '
        "grep -nE '" + KEEP + "' \"$f\" | head -60; "
        'echo "--- 20 dernieres lignes ---"; tail -20 "$f"; '
        'rm -f "$f"; (exit $rc)'
    )


def rewrite(cmd):
    """Return the rewritten command, or None to leave it untouched."""
    prefix = ""
    m = CD_PREFIX.match(cmd)
    if m:
        prefix, cmd = m.group(1), m.group(2)
    if any(c in cmd for c in COMPOUND):
        return None
    if not any(t.search(cmd) for t in TRIGGERS):
        return None
    if prefix:
        return prefix + "{ " + wrap(cmd) + "; }"
    return wrap(cmd)


def main():
    payload = json.load(sys.stdin)
    new = rewrite(payload["tool_input"]["command"])
    if new is None:
        return {}
    return {"hookSpecificOutput": {
        "hookEventName": "PreToolUse",
        # Auto-allow, kept deliberately (2026-09-07): dropping it would
        # turn 8 of the 45 permissions.allow entries back into a prompt on
        # every run -- all eight of them test launchers. What bounds it is
        # TRIGGERS + COMPOUND above, nothing else. Widen either one and you
        # widen what runs without asking.
        "permissionDecision": "allow",
        "updatedInput": dict(payload["tool_input"], command=new),
    }}


if __name__ == "__main__":
    try:
        out = main()
    except Exception:
        out = {}
    print(json.dumps(out))