import io
import re
import sys

sys.stdout.reconfigure(encoding="utf-8")

path = r"D:\Practice\TransformIQ\KaryaSetu-forecastReliabilityIntelligence\frontend\src\data\indianDistricts.ts"
with io.open(path, encoding="utf-8") as fh:
    source = fh.read()

pattern = re.compile(
    r"id: '([^']+)', name: '([^']+)', state: '([^']+)', "
    r"latitude: ([0-9.]+), longitude: ([0-9.]+)"
)
rows = pattern.findall(source)

outside = []
for ident, name, state, lat, lon in rows:
    if not (8.0 <= float(lat) <= 37.0 and 68.0 <= float(lon) <= 98.0):
        outside.append((ident, name, state, float(lat), float(lon)))

print("stations parsed:", len(rows))
print("outside the model domain:", len(outside))
for ident, name, state, lat, lon in outside:
    print("   %-16s %-22s %-22s lat=%.4f lon=%.4f" % (ident, name, state, lat, lon))

lats = [float(r[3]) for r in rows]
lons = [float(r[4]) for r in rows]
print("latitude  range: %.4f .. %.4f" % (min(lats), max(lats)))
print("longitude range: %.4f .. %.4f" % (min(lons), max(lons)))