/**
 * Build script: distils a raw 2011 Census district boundary GeoJSON into a
 * compact file for the frontend district bust-risk choropleth.
 *
 * Source (Census of India 2011 administrative boundaries, follows the official
 * Indian claim for J&K / Ladakh / Arunachal Pradesh):
 *   https://raw.githubusercontent.com/udit-001/india-maps-data/main/geojson/india.geojson
 *
 * - Douglas-Peucker simplification (tolerance in degrees)
 * - coordinate rounding to 3 decimals
 * - merges MultiPolygon parts, drops interior rings and sub-pixel slivers
 * - attaches a pre-computed label centroid per district
 *
 * The output is committed at public/geojson/india-districts.geojson, so this
 * script only needs re-running if the upstream boundaries change.
 *
 * Usage:
 *   npm run build:districts -- <source.geojson> [tolerance]
 */
import fs from 'node:fs';
import path from 'node:path';

const SOURCE_URL =
  'https://raw.githubusercontent.com/udit-001/india-maps-data/main/geojson/india.geojson';

const [, , sourcePath, outPath, tolArg] = process.argv;
if (!sourcePath || !outPath) {
  console.error('Usage: node scripts/build-district-geojson.mjs <source> <out> [tolerance]');
  console.error(`Upstream source: ${SOURCE_URL}`);
  process.exit(1);
}
const TOLERANCE = Number(tolArg ?? 0.02);
const ROUND = 1000; // 3 decimals

/** Perpendicular distance from p to segment ab (in degree space). */
function perpDistance(p, a, b) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  if (dx === 0 && dy === 0) {
    return Math.hypot(p[0] - a[0], p[1] - a[1]);
  }
  const t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy);
  const clamped = Math.max(0, Math.min(1, t));
  return Math.hypot(p[0] - (a[0] + clamped * dx), p[1] - (a[1] + clamped * dy));
}

/** Iterative Douglas-Peucker to avoid deep recursion on long rings. */
function simplify(points, tolerance) {
  if (points.length <= 4) return points;
  const keep = new Uint8Array(points.length);
  keep[0] = 1;
  keep[points.length - 1] = 1;
  const stack = [[0, points.length - 1]];
  while (stack.length) {
    const [first, last] = stack.pop();
    let maxDist = 0;
    let index = -1;
    for (let i = first + 1; i < last; i += 1) {
      const d = perpDistance(points[i], points[first], points[last]);
      if (d > maxDist) {
        maxDist = d;
        index = i;
      }
    }
    if (maxDist > tolerance && index !== -1) {
      keep[index] = 1;
      stack.push([first, index], [index, last]);
    }
  }
  return points.filter((_, i) => keep[i] === 1);
}

function ringArea(ring) {
  let area = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    area += (ring[j][0] * ring[i][1]) - (ring[i][0] * ring[j][1]);
  }
  return Math.abs(area / 2);
}

/** Area-weighted centroid of a polygon ring (falls back to vertex mean). */
function ringCentroid(ring) {
  let area = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const cross = (ring[j][0] * ring[i][1]) - (ring[i][0] * ring[j][1]);
    area += cross;
    cx += (ring[j][0] + ring[i][0]) * cross;
    cy += (ring[j][1] + ring[i][1]) * cross;
  }
  area /= 2;
  if (Math.abs(area) < 1e-9) {
    const n = ring.length - 1;
    let sx = 0;
    let sy = 0;
    for (let i = 0; i < n; i += 1) {
      sx += ring[i][0];
      sy += ring[i][1];
    }
    return [sx / n, sy / n];
  }
  return [cx / (6 * area), cy / (6 * area)];
}

const raw = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
const features = [];
const droppedNames = [];

/** Total outer-ring area of a geometry in square degrees. */
function geometryArea(geometry) {
  const rings = geometry.type === 'Polygon' ? [geometry.coordinates[0]] : geometry.coordinates.map((p) => p[0]);
  return rings.reduce((sum, ring) => sum + ringArea(ring), 0);
}

for (const feature of raw.features) {
  const geometry = feature.geometry;
  const props = feature.properties || {};
  const label = props.district || `${props.st_nm || 'India'} (unnamed tract)`;
  if (!geometry) {
    droppedNames.push(label);
    continue;
  }
  // Source has unnamed sub-territories (offshore islets etc). Keep only
  // sizeable ones so the choropleth never shows meaningless slivers.
  if (!props.district && geometryArea(geometry) < 0.05) {
    droppedNames.push(label);
    continue;
  }

  const sourceRings =
    geometry.type === 'Polygon'
      ? [geometry.coordinates[0]]
      : geometry.coordinates.map((poly) => poly[0]);

  const rings = [];
  for (const ring of sourceRings) {
    const rounded = [];
    for (const [lon, lat] of ring) {
      const point = [
        Math.round(lon * ROUND) / ROUND,
        Math.round(lat * ROUND) / ROUND,
      ];
      const prev = rounded[rounded.length - 1];
      if (!prev || prev[0] !== point[0] || prev[1] !== point[1]) rounded.push(point);
    }
    if (rounded.length > 2) {
      const first = rounded[0];
      const last = rounded[rounded.length - 1];
      if (first[0] !== last[0] || first[1] !== last[1]) rounded.push([first[0], first[1]]);
    }
    if (rounded.length < 4) continue;

    const simplified = simplify(rounded, TOLERANCE);
    if (simplified.length < 4) continue;
    if (ringArea(simplified) < 0.0004) continue; // drop sub-pixel slivers
    rings.push(simplified);
  }

  if (!rings.length) {
    droppedNames.push(label);
    continue;
  }

  rings.sort((a, b) => ringArea(b) - ringArea(a));

  // Label anchor: centroid of the largest ring.
  const anchor = ringCentroid(rings[0]);

  features.push({
    type: 'Feature',
    properties: {
      district: props.district || `${props.st_nm || 'India'} (unnamed tract)`,
      state: props.st_nm || 'India',
      code: props.dt_code ?? null,
      stateCode: props.st_code ?? null,
      year: props.year || '2011 Census',
      anchor: [Number(anchor[0].toFixed(4)), Number(anchor[1].toFixed(4))],
    },
    geometry: {
      type: 'Polygon',
      coordinates: rings,
    },
  });
}

features.sort((a, b) => a.properties.district.localeCompare(b.properties.district));

const out = { type: 'FeatureCollection', features };
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(out));

const stats = fs.statSync(outPath);
console.log(`source features : ${raw.features.length}`);
console.log(`kept features   : ${features.length}`);
console.log(`dropped         : ${droppedNames.length}`);
console.log(`tolerance       : ${TOLERANCE} deg`);
console.log(`output          : ${outPath}`);
console.log(`output size     : ${(stats.size / 1024).toFixed(0)} kB`);