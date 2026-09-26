import urllib.request
import json

try:
    with urllib.request.urlopen("http://localhost:5173/", timeout=5) as resp:
        print(f"Frontend Status: {resp.status} (Vite React UI is running)")
except Exception as e:
    print("Frontend error:", e)

try:
    with urllib.request.urlopen("http://localhost:8000/api/model-info") as resp:
        info = json.loads(resp.read().decode("utf-8"))
        print(f"Backend Status: {resp.status} | Model: {info.get('model_type')} ({info.get('model_version')})")
except Exception as e:
    print("Backend error:", e)

try:
    with urllib.request.urlopen("http://localhost:8000/api/historical-events") as resp:
        data = json.loads(resp.read().decode("utf-8"))
        cases = data.get("results", [])
        print(f"Historical Events Count: {len(cases)}")
        for c in cases[:5]:
            print(f"  * {c.get('event_id')} -> {c.get('name')} | P(Bust): {c.get('model_bust_probability', 0)*100:.1f}% | Predicted Bust: {c.get('model_predicted_bust')}")
except Exception as e:
    print("Backend events error:", e)

try:
    with urllib.request.urlopen("http://localhost:8000/api/model-performance") as resp:
        m = json.loads(resp.read().decode("utf-8"))
        print(f"Metrics -> ROC-AUC: {m.get('roc_auc')} | Calibrated Brier Score: {m.get('brier_calibrated')}")
except Exception as e:
    print("Metrics error:", e)
