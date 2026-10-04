import collections
import io
import json
import sys

sys.stdout.reconfigure(encoding="utf-8")

DOMAIN = {"lat_min": 8.0, "lat_max": 37.0, "lon_min": 68.0, "lon_max": 98.0}

path = r"D:\Practice\TransformIQ\KaryaSetu-forecastReliabilityIntelligence\frontend\public\geojson\india-districts.geojson"
with io.open(path, encoding="utf-8") as fh:
    feats = json.load(fh)["features"]

named = [
    f for f in feats
    if "unnamed tract" not in (f["properties"].get("district") or "").lower()
]

outside = []
lats, lons = [], []
for f in named:
    lon, lat = f["properties"]["anchor"]
    lats.append(lat)
    lons.append(lon)
    if not (DOMAIN["lat_min"] <= lat <= DOMAIN["lat_max"]
            and DOMAIN["lon_min"] <= lon <= DOMAIN["lon_max"]):
        outside.append((f["properties"]["district"], f["properties"]["state"], lat, lon))

print("named districts:", len(named))
print("latitude  range: %.4f .. %.4f" % (min(lats), max(lats)))
print("longitude range: %.4f .. %.4f" % (min(lons), max(lons)))
print("out of domain: %d" % len(outside))
by_state = collections.Counter(o[1] for o in outside)
for state, n in by_state.most_common():
    rows = [o for o in outside if o[1] == state]
    lats_ = sorted(r[2] for r in rows)
    lons_ = sorted(r[3] for r in rows)
    print("  %-24s n=%-3d lat %.3f..%.3f  lon %.3f..%.3f" % (state, n, lats_[0], lats_[-1], lons_[0], lons_[-1]))

print()
print("first 12 offenders:")
for name, state, lat, lon in outside[:12]:
    print("   %-28s %-22s lat=%8.4f lon=%8.4f" % (name, state, lat, lon))