/**
 * District and state search index, derived from the committed Census 2011
 * boundary file. The same file drives the bust-risk choropleth, so the search
 * results and the map can never disagree about where a district is.
 *
 * District records keep only what the search list and the detail panel need —
 * the geometry stays in the GeoJSON so it is not duplicated in memory.
 */

export interface DistrictRecord {
  /** Census district code, e.g. "331". Null for a few unnamed divisions. */
  code: string | null;
  district: string;
  state: string;
  stateCode: string | null;
  /** Anchor point in [lon, lat], matching the GeoJSON. */
  anchor: [number, number];
  latitude: number;
  longitude: number;
}

export interface StateRecord {
  name: string;
  code: string | null;
  latitude: number;
  longitude: number;
  districtCount: number;
}

export interface DistrictIndex {
  districts: DistrictRecord[];
  states: StateRecord[];
  /** Lower-cased "district|state" keys, for exact matching. */
  lookup: Map<string, DistrictRecord>;
}

interface RawFeature {
  properties?: {
    district?: string;
    state?: string;
    code?: string | null;
    stateCode?: string | null;
    anchor?: [number, number];
  };
}

interface RawCollection {
  features: RawFeature[];
}

let cached: Promise<DistrictIndex> | null = null;
let geometryCache: Promise<RawCollection> | null = null;

/**
 * The raw boundary collection, for drawing outlines. Kept separate from the
 * index so the search list never carries 470 kB of geometry.
 */
export function loadDistrictGeometry(): Promise<RawCollection> {
  if (!geometryCache) {
    geometryCache = fetch('/geojson/india-districts.geojson')
      .then((res) => {
        if (!res.ok) throw new Error(`District boundary request failed (${res.status})`);
        return res.json();
      })
      .then((data) => data as RawCollection)
      .catch((err) => {
        geometryCache = null;
        throw err;
      });
  }
  return geometryCache;
}

function mean(values: number[]): number {
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function loadDistrictIndex(): Promise<DistrictIndex> {
  if (cached) return cached;

  cached = loadDistrictGeometry()
    .then((data) => {
      const features: RawFeature[] = data.features ?? [];

      const districts: DistrictRecord[] = [];
      const lookup = new Map<string, DistrictRecord>();
      const byState = new Map<string, StateRecord>();
      const stateCentroids = new Map<string, number[]>();

      for (const feature of features) {
        const p = feature.properties ?? {};
        const district = p.district?.trim();
        const state = p.state?.trim();
        const anchor = p.anchor;
        if (!district || !state || !Array.isArray(anchor) || anchor.length < 2) continue;

        const longitude = Number(anchor[0]);
        const latitude = Number(anchor[1]);
        if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) continue;

        const record: DistrictRecord = {
          code: p.code ?? null,
          district,
          state,
          stateCode: p.stateCode ?? null,
          anchor: [longitude, latitude],
          latitude,
          longitude,
        };
        districts.push(record);
        lookup.set(`${district.toLowerCase()}|${state.toLowerCase()}`, record);

        const existing = byState.get(state);
        if (existing) {
          existing.districtCount += 1;
        } else {
          byState.set(state, {
            name: state,
            code: p.stateCode ?? null,
            latitude,
            longitude,
            districtCount: 1,
          });
        }
        const bucket = stateCentroids.get(state) ?? [];
        bucket.push(latitude, longitude);
        stateCentroids.set(state, bucket);
      }

      const states = [...byState.values()]
        .map((s) => {
          const flat = stateCentroids.get(s.name) ?? [];
          return {
            ...s,
            latitude: mean(flat.filter((_, i) => i % 2 === 0)) || s.latitude,
            longitude: mean(flat.filter((_, i) => i % 2 === 1)) || s.longitude,
          };
        })
        .sort((a, b) => a.name.localeCompare(b.name));

      return { districts, states, lookup };
    })
    .catch((err) => {
      console.warn('District index notice:', err);
      cached = null;
      throw err;
    });

  return cached;
}

export interface SearchResults {
  districts: DistrictRecord[];
  states: StateRecord[];
}

/**
 * Rank districts and states against a free-text query.
 *
 * An empty query returns nothing, so the page opens on a prompt rather than
 * dumping all 755 districts.
 */
export function searchIndex(index: DistrictIndex, query: string, limit = 25): SearchResults {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return { districts: [], states: [] };

  const startsWith: DistrictRecord[] = [];
  const contains: DistrictRecord[] = [];

  for (const d of index.districts) {
    const name = d.district.toLowerCase();
    const state = d.state.toLowerCase();
    if (name === q) {
      startsWith.unshift(d);
    } else if (name.startsWith(q)) {
      startsWith.push(d);
    } else if (name.includes(q) || state.startsWith(q)) {
      contains.push(d);
    }
    if (startsWith.length > limit) break;
  }

  const districtStates = new Set<string>();
  for (const d of startsWith) districtStates.add(d.state);

  const states = index.states
    .filter(
      (s) =>
        !districtStates.has(s.name) &&
        (s.name.toLowerCase().startsWith(q) || s.name.toLowerCase().includes(q))
    )
    .slice(0, 6);

  return {
    districts: [...startsWith, ...contains].slice(0, limit),
    states,
  };
}
