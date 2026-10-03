"""Dump a Jupyter notebook cell's source AND its stored outputs as text."""
import json
import sys

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

path = sys.argv[1]
which = sys.argv[2]  # "cell:<i>" or "range:<a>-<b>" or "all-outputs"

nb = json.load(open(path, encoding="utf-8"))
cells = nb["cells"]


def render_outputs(cell, limit=4000):
    out = []
    for o in cell.get("outputs", []):
        if o.get("output_type") == "stream":
            out.append("".join(o.get("text", [])))
        elif o.get("output_type") == "execute_result":
            out.append("".join(o.get("data", {}).get("text/plain", [])))
        elif o.get("output_type") == "error":
            out.append("ERROR: " + "\n".join(o.get("traceback", [])))
        elif o.get("output_type") == "display_data":
            txt = o.get("data", {}).get("text/plain")
            if txt:
                out.append("".join(txt))
            else:
                out.append("[non-text display: " + ",".join(o.get("data", {}).keys()) + "]")
    text = "\n".join(out)
    if len(text) > limit:
        text = text[:limit] + f"\n... [truncated, {len(text)} chars total]"
    return text


if which.startswith("cell:"):
    idx = int(which.split(":")[1])
    cell = cells[idx]
    print(f"===== CELL {idx} ({cell['cell_type']}) SOURCE =====")
    print("".join(cell["source"]))
    if cell["cell_type"] == "code":
        print(f"----- CELL {idx} OUTPUT -----")
        print(render_outputs(cell, 20000))
elif which == "all-outputs":
    for i, c in enumerate(cells):
        if c["cell_type"] != "code":
            continue
        txt = render_outputs(c, 1200)
        if not txt.strip():
            continue
        src = "".join(c["source"]).strip().splitlines()
        head = src[0][:90] if src else ""
        print(f"\n===== [{i}] {head}")
        print(txt)
elif which.startswith("range:"):
    a, b = which.split(":")[1].split("-")
    for i in range(int(a), int(b) + 1):
        cell = cells[i]
        print(f"\n===== CELL {i} ({cell['cell_type']}) SOURCE =====")
        print("".join(cell["source"]))
        if cell["cell_type"] == "code":
            print(f"----- CELL {i} OUTPUT -----")
            print(render_outputs(cell, 12000))
