import { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, GeoJSON, CircleMarker, useMap } from 'react-leaflet';
import { Search as SearchIcon, Crosshair, X, MapPin, Building2 } from 'lucide-react';
import {
  loadDistrictGeometry,
  loadDistrictIndex,
  searchIndex,
  type DistrictIndex,
  type DistrictRecord,
  type StateRecord,
} from '../data/districtIndex';
import { PageHeader, UnavailableBlock } from '../components/PageHeader';
import LocationAnalysis, { type LocationTarget } from '../components/LocationAnalysis';

/** Plain OSM tiles. The search map is a locator, so no boundary corrections apply. */
const BASEMAP_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const BASEMAP_ATTR =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

/**
 * Moves the map to the chosen place. Animation is skipped when the visitor has
 * asked for reduced motion, and when the browser reports no animation frames.
 */
function FlyTo({ target }: { target: { lat: number; lon: number; zoom: number } | null }) {
  const map = useMap();

  useEffect(() => {
    if (!target) return;
    const reduced =
      typeof window !== 'undefined' &&
      Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);

    if (reduced) {
      map.setView([target.lat, target.lon], target.zoom, { animate: false });
      return;
    }

    map.flyTo([target.lat, target.lon], target.zoom, { duration: 0.8 });
  }, [map, target]);

  return null;
}

interface SelectionOutlineProps {
  /** "state:Name" to outline every district, or "district:Name|State" for one. */
  selection: { kind: 'state'; name: string } | { kind: 'district'; key: string } | null;
}

/**
 * Highlights the boundary of whatever is selected. The geometry is fetched once
 * and cached module-side, so switching between results reuses the same objects.
 */
function SelectionOutline({ selection }: SelectionOutlineProps) {
  const [outline, setOutline] = useState<GeoJSON.FeatureCollection | null>(null);

  const kind = selection?.kind ?? null;
  const matcher = selection
    ? selection.kind === 'state'
      ? (p: { district?: string; state?: string }) => p.state === selection.name
      : (p: { district?: string; state?: string }) =>
          `${p.district}|${p.state}` === selection.key
    : null;

  useEffect(() => {
    if (!matcher) {
      setOutline(null);
      return;
    }
    let cancelled = false;
    loadDistrictGeometry()
      .then((geo) => {
        if (cancelled) return;
        const features = (geo.features ?? []).filter((f) => {
          const p = f.properties ?? {};
          if (!p.district || !p.state) return false;
          return matcher(p);
        });
        setOutline({ type: 'FeatureCollection', features: features as GeoJSON.Feature[] });
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
    // `matcher` is rebuilt on every render, so key the effect on the identity
    // of the selection instead of the closure.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, selection?.kind === 'state' ? selection?.name : selection?.key]);

  if (!outline || outline.features.length === 0) return null;

  return (
    <GeoJSON
      data={outline}
      interactive={false}
      style={{
        color: '#1d4ed8',
        weight: 2.5,
        opacity: 0.95,
        fillColor: '#1d4ed8',
        fillOpacity: 0.08,
      }}
    />
  );
}

export default function Search() {
  const [query, setQuery] = useState('');
  const [index, setIndex] = useState<DistrictIndex | null>(null);
  const [indexError, setIndexError] = useState<string | null>(null);
  const [district, setDistrict] = useState<DistrictRecord | null>(null);
  const [state, setState] = useState<StateRecord | null>(null);
  const [day, setDay] = useState(4);
  const [coord, setCoord] = useState<{ lat: string; lon: string }>({ lat: '', lon: '' });

  useEffect(() => {
    let cancelled = false;
    loadDistrictIndex()
      .then((idx) => {
        if (!cancelled) setIndex(idx);
      })
      .catch((err) => {
        if (!cancelled) setIndexError(String(err));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const results = useMemo(
    () => (index ? searchIndex(index, query) : { districts: [], states: [] }),
    [index, query]
  );

  const target: LocationTarget | null = useMemo(() => {
    if (district) {
      return {
        lat: district.latitude,
        lon: district.longitude,
        label: `${district.district} District, ${district.state}`,
        note: district.code ? `Census district code ${district.code}` : undefined,
      };
    }
    if (state) {
      return {
        lat: state.latitude,
        lon: state.longitude,
        label: `${state.name} — state centroid`,
        note: `Mean of ${state.districtCount} district anchor points`,
      };
    }
    return null;
  }, [district, state]);

  const coordTarget: LocationTarget | null = useMemo(() => {
    if (!coord.lat.trim() || !coord.lon.trim()) return null;
    const lat = Number(coord.lat);
    const lon = Number(coord.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
    if (lat < 8 || lat > 37 || lon < 68 || lon > 98) return null;
    return { lat, lon, label: `${lat.toFixed(4)}°N, ${lon.toFixed(4)}°E` };
  }, [coord.lat, coord.lon]);

  const active = target ?? coordTarget;

  const flyTarget = useMemo(() => {
    if (coordTarget) return { lat: coordTarget.lat, lon: coordTarget.lon, zoom: 7 };
    if (district) return { lat: district.latitude, lon: district.longitude, zoom: 7 };
    if (state) return { lat: state.latitude, lon: state.longitude, zoom: 5 };
    return null;
  }, [coordTarget, district, state]);

  const outlineSelection = useMemo(() => {
    if (district) {
      return { kind: 'district', key: `${district.district}|${district.state}` } as const;
    }
    if (state) return { kind: 'state', name: state.name } as const;
    return null;
  }, [district, state]);

  const stateDistricts = useMemo(() => {
    if (!index || !state) return [];
    return index.districts.filter((d) => d.state === state.name);
  }, [index, state]);

  return (
    <div className="flex min-h-screen flex-col">
      <PageHeader
        title="Location Search"
        description="Look up any district or state in the boundary index, then read the trained model's bust-risk output for that place. Results come from the same boundary file that draws the bust risk map."
      />

      <div className="grid flex-1 items-start gap-4 p-4 xl:grid-cols-[340px_minmax(0,1fr)_400px]">
        {/* ── Search column ── */}
        <div className="space-y-4">
          <div className="card">
            <div className="card-header">
              <p className="card-title">Find a place</p>
              {index && (
                <span className="text-[11px] text-ink-muted">
                  {index.districts.length} districts · {index.states.length} states
                </span>
              )}
            </div>
            <div className="space-y-3 p-4">
              <div className="relative">
                <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="District or state name"
                  aria-label="Search for a district or state"
                  className="field-input pl-9"
                />
              </div>

              {indexError && (
                <UnavailableBlock message="The district boundary index could not be loaded, so search is unavailable." />
              )}

              {index && query.trim().length >= 2 && (
                <div className="space-y-3">
                  {results.states.length > 0 && (
                    <div>
                      <p className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-wide text-ink-faint">
                        States / Union Territories
                      </p>
                      <ul className="space-y-1">
                        {results.states.map((s) => (
                          <li key={s.name}>
                            <button
                              type="button"
                              onClick={() => {
                                setState(s);
                                setDistrict(null);
                              }}
                              className={`flex w-full items-center gap-2 rounded-md border px-2.5 py-2 text-left text-[13px] transition-colors ${
                                state?.name === s.name
                                  ? 'border-brand bg-brand-soft text-brand-ink'
                                  : 'border-line bg-panel hover:bg-raised'
                              }`}
                            >
                              <Building2 className="h-3.5 w-3.5 flex-shrink-0" />
                              <span className="min-w-0 flex-1 truncate font-medium">{s.name}</span>
                              <span className="shrink-0 text-[11px] text-ink-muted">
                                {s.districtCount}
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {results.districts.length > 0 && (
                    <div>
                      <p className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-wide text-ink-faint">
                        Districts
                      </p>
                      <ul className="max-h-80 space-y-1 overflow-y-auto pr-1">
                        {results.districts.map((d) => (
                          <li key={`${d.district}-${d.state}-${d.code ?? 'x'}`}>
                            <button
                              type="button"
                              onClick={() => {
                                setDistrict(d);
                                setState(null);
                              }}
                              className={`flex w-full items-center gap-2 rounded-md border px-2.5 py-1.5 text-left text-[13px] transition-colors ${
                                district?.district === d.district &&
                                district?.state === d.state
                                  ? 'border-brand bg-brand-soft text-brand-ink'
                                  : 'border-line bg-panel hover:bg-raised'
                              }`}
                            >
                              <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                              <span className="min-w-0 flex-1 truncate">
                                <span className="font-medium">{d.district}</span>
                                <span className="text-ink-muted"> · {d.state}</span>
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {results.districts.length === 0 && results.states.length === 0 && (
                    <p className="py-4 text-center text-[13px] text-ink-muted">
                      No district or state matches “{query.trim()}”.
                    </p>
                  )}
                </div>
              )}

              {index && query.trim().length < 2 && (
                <p className="py-2 text-[12.5px] leading-relaxed text-ink-muted">
                  Type at least two characters. Matching runs against the district and state
                  names in the boundary index, so every district is listed — not only the
                  major stations.
                </p>
              )}
            </div>
          </div>

          {/* Direct coordinate entry — the same predictor a map click uses. */}
          <div className="card">
            <div className="card-header">
              <p className="card-title">Or enter coordinates</p>
            </div>
            <div className="space-y-3 p-4">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="field-label" htmlFor="coord-lat">
                    Latitude °N
                  </label>
                  <input
                    id="coord-lat"
                    type="number"
                    step="0.0001"
                    min={8}
                    max={37}
                    value={coord.lat}
                    onChange={(e) => {
                      setCoord((c) => ({ ...c, lat: e.target.value }));
                      setDistrict(null);
                      setState(null);
                    }}
                    placeholder="8 – 37"
                    className="field-input font-mono"
                  />
                </div>
                <div>
                  <label className="field-label" htmlFor="coord-lon">
                    Longitude °E
                  </label>
                  <input
                    id="coord-lon"
                    type="number"
                    step="0.0001"
                    min={68}
                    max={98}
                    value={coord.lon}
                    onChange={(e) => {
                      setCoord((c) => ({ ...c, lon: e.target.value }));
                      setDistrict(null);
                      setState(null);
                    }}
                    placeholder="68 – 98"
                    className="field-input font-mono"
                  />
                </div>
              </div>
              {coord.lat.trim() !== '' && coord.lon.trim() !== '' && !coordTarget && (
                <p className="text-[11.5px] text-risk-high">
                  Coordinates must sit inside the model domain: latitude 8–37°N,
                  longitude 68–98°E.
                </p>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <p className="card-title">Forecast day</p>
              <span className="font-mono text-[11px] text-ink-muted">+{day * 24} h</span>
            </div>
            <div className="p-4">
              <input
                type="range"
                min={1}
                max={10}
                step={1}
                value={day}
                onChange={(e) => setDay(Number(e.target.value))}
                aria-label="Forecast day"
                className="w-full accent-brand"
              />
              <div className="mt-1 flex justify-between text-[11px] text-ink-faint">
                <span>D1</span>
                <span className="font-semibold text-brand">Day {day}</span>
                <span>D10</span>
              </div>
            </div>
          </div>

          {active && (
            <button
              type="button"
              onClick={() => {
                setDistrict(null);
                setState(null);
                setCoord({ lat: '', lon: '' });
              }}
              className="btn-secondary w-full"
            >
              <X className="h-3.5 w-3.5" />
              Clear selection
            </button>
          )}
        </div>

        {/* ── Map column ── */}
        <div className="card overflow-hidden">
          <div className="card-header">
            <p className="card-title">Location map</p>
            <span className="flex items-center gap-1.5 text-[11px] text-ink-muted">
              <Crosshair className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">{active ? active.label : 'No place selected'}</span>
            </span>
          </div>
          <div className="h-[560px] w-full">
            <MapContainer
              center={[22.5, 82.5]}
              zoom={5}
              style={{ height: '100%', width: '100%' }}
              scrollWheelZoom
            >
              <TileLayer url={BASEMAP_URL} attribution={BASEMAP_ATTR} maxZoom={19} />
              <FlyTo target={flyTarget} />
              <SelectionOutline selection={outlineSelection} />

              {active && (
                <CircleMarker
                  center={[active.lat, active.lon]}
                  radius={7}
                  pathOptions={{
                    color: '#ffffff',
                    weight: 2.5,
                    fillColor: district || state ? '#dc2626' : '#1d4ed8',
                    fillOpacity: 0.95,
                  }}
                />
              )}
            </MapContainer>
          </div>
        </div>

        {/* ── Result column ── */}
        <div>
          {state && (
            <div className="card mb-4">
              <div className="card-header">
                <p className="card-title">{state.name}</p>
                <span className="text-[11px] text-ink-muted">
                  {state.districtCount} districts
                </span>
              </div>
              <div className="p-4">
                <p className="text-[12.5px] leading-relaxed text-ink-muted">
                  The outline on the map covers every district in {state.name}. The figures
                  below are the model evaluated at the state centroid — the mean of those
                  district anchor points — not an average of per-district forecasts.
                </p>
                <ul className="mt-3 grid max-h-48 grid-cols-1 gap-1 overflow-y-auto pr-1 sm:grid-cols-2">
                  {stateDistricts.slice(0, 80).map((d) => (
                    <li key={`${d.district}-${d.code ?? 'x'}`}>
                      <button
                        type="button"
                        onClick={() => setDistrict(d)}
                        className="w-full truncate rounded border border-line bg-panel px-2 py-1 text-left text-[12px] hover:bg-raised"
                      >
                        {d.district}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {!active ? (
            <div className="card">
              <p className="px-4 py-10 text-center text-[13px] leading-relaxed text-ink-muted">
                Search for a district or state, or type a coordinate, to see the trained
                model's bust probability, the inputs behind it, and how the risk changes
                with lead day.
              </p>
            </div>
          ) : (
            <LocationAnalysis target={active} day={day} />
          )}
        </div>
      </div>
    </div>
  );
}
