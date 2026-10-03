"""Dump a Jupyter notebook's cells with indices so they can be read as text."""
import json
import sys

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

path = sys.argv[1]
mode = sys.argv[2] if len(sys.argv) > 2 else "outline"
start = int(sys.argv[3]) if len(sys.argv) > 3 else 0
end = int(sys.argv[4]) if len(sys.argv) > 4 else 10**9

nb = json.load(open(path, encoding="utf-8"))
cells = nb["cells"]

if mode == "outline":
    for i, c in enumerate(cells):
        src = "".join(c["source"])
        head = src.strip().splitlines()[0] if src.strip() else ""
        kind = c["cell_type"]
        nchars = len(src)
        if start <= i <= end:
            print(f"[{i}] {kind:8s} {nchars:6d}  {head[:110]}")
elif mode == "code":
    for i, c in enumerate(cells):
        if c["cell_type"] != "code":
            continue
        if start <= i <= end:
            print(f"===== CELL {i} =====")
            print("".join(c["source"]))
            print()
elif mode == "text":
    for i, c in enumerate(cells):
        if c["cell_type"] == "markdown":
            if start <= i <= end:
                print(f"===== MARKDOWN {i} =====")
                print("".join(c["source"]))
                print()
