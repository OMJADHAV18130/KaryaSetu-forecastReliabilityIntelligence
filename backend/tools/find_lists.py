"""Find every bracketed list literal in a notebook and report its length.

Used to locate the authoritative feature list(s) and check their sizes.
"""
import ast
import json
import re
import sys

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

path = sys.argv[1]
nb = json.load(open(path, encoding="utf-8"))
cells = nb["cells"]

# Also scan markdown for inline code lists.
sources = []
for i, c in enumerate(cells):
    if c["cell_type"] in ("code", "markdown"):
        sources.append((i, c["cell_type"], "".join(c["source"])))

target = sys.argv[2] if len(sys.argv) > 2 else None

for i, kind, src in sources:
    # Grab candidate bracketed blocks (non-nested, no braces inside).
    for m in re.finditer(r"\[([^\[\]{}]*?)\]", src, re.S):
        block = m.group(1)
        if "," not in block:
            continue
        try:
            parsed = ast.literal_eval("[" + block + "]")
        except Exception:
            continue
        if not isinstance(parsed, list) or not parsed:
            continue
        if not all(isinstance(x, (str, int, float)) for x in parsed):
            continue
        strs = [str(x) for x in parsed]
        if target and not any(target.lower() in s.lower() for s in strs):
            continue
        line_no = src[: m.start()].count("\n") + 1
        print(f"[cell {i:>3} {kind:8s} line {line_no:>3}] n={len(parsed)}")
        print("    " + ", ".join(strs))
