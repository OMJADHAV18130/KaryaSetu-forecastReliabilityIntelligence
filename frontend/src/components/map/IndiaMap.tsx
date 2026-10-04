import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { MapContainer, CircleMarker, Rectangle, Tooltip, GeoJSON, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { extendLeaflet } from '@india-boundary-corrector/leaflet-layer';
import {
  Layers,
  Eye,
  EyeOff,
  MapPin,
  Compass,
  ShieldAlert,
  CheckCircle2,
  MapPinned,
  Flame,
  Tag,
} from 'lucide-react';
import type { ForecastPoint, ScoredCoordinate } from '../../types';
import { INDIAN_DISTRICTS } from '../../data/indianDistricts';
import DistrictRiskMap, { DISTRICT_PANE, type DistrictRisk } from './DistrictRiskMap';
import RiskLegend from './RiskLegend';
import CoordinateProbe from './CoordinateProbe';
import { levelFor, percent, LEVEL_TONE, type ReliabilityLayer } from '../../lib/riskScale';
import { useCoordinateScores } from '../../hooks';

export type MapView = 'risk' | 'markers';

interface IndiaMapProps {
  points: ForecastPoint[];
  layer: ReliabilityLayer;
  selectedPoint?: ForecastPoint | null;
  onPointClick?: (point: ForecastPoint) => void;
  onPointHover?: (point: ForecastPoint | null) => void;
  /** Optional controlled view. Defaults to the bust risk choropleth. */
  view?: MapView;
  onViewChange?: (view: MapView) => void;
  /** Lead day (1-10). Drives the legend and the on-map point prediction. */
  day?: number;
  /** Turn the click-to-predict probe on or off (risk view only). */
  probeEnabled?: boolean;
  height?: string;
}

/**
 * TileLayer component applying Indian Boundary Corrections
 * in accordance with the published sovereign-boundary standard.
 */
function IndiaBoundaryCorrectedTileLayer({
  url = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  attribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> | Boundaries: Open Government Data (OGD) India, ISC licence',
}: {
  url?: string;
  attribution?: string;
}) {
  const map = useMap();

  useEffect(() => {
    let layer: L.TileLayer | null = null;
    try {
      extendLeaflet(L);
      if (typeof (L.tileLayer as any).indiaBoundaryCorrected === 'function') {
        const pmtilesUrl = `${window.location.origin}/india_boundary_corrections.pmtiles`;
        layer = (L.tileLayer as any).indiaBoundaryCorrected(url, {
          attribution,
          pmtilesUrl,
          fallbackOnCorrectionFailure: true,
          crossOrigin: 'anonymous',
          maxZoom: 19,
        });
      }
    } catch (err) {
      console.warn('India Boundary Corrector notice:', err);
    }

    if (!layer) {
      layer = L.tileLayer(url, { attribution, maxZoom: 19 });
    }

    layer.addTo(map);

    return () => {
      if (layer) {
        map.removeLayer(layer);
      }
    };
  }, [map, url, attribution]);

  return null;
}

/**
 * Map-level pane registry. Panes belong to the map (not to the toggled layer),
 * so the district-fill pane is created once and outlives every view toggle.
 */
function MapPanes() {
  const map = useMap();

  useEffect(() => {
    if (!map.getPane(DISTRICT_PANE)) {
      map.createPane(DISTRICT_PANE);
      const pane = map.getPane(DISTRICT_PANE);
      if (pane) {
        // 350 sits between the tile pane (200) and the default overlay pane (400),
        // so the sovereign boundary layer stays on top of the fills.
        pane.style.zIndex = '350';
        pane.style.pointerEvents = 'auto';
      }
    }
  }, [map]);

  return null;
}

/**
 * Dims the basemap imagery when the district choropleth is on top of it. The
 * Indian Boundary Corrector corrections themselves stay fully active.
 */
function BasemapDimmer({ dim }: { dim: boolean }) {
  const map = useMap();

  useEffect(() => {
    const container = map.getContainer();
    container.classList.toggle('map-risk-view', dim);
    return () => {
      container.classList.remove('map-risk-view');
    };
  }, [map, dim]);

  return null;
}

/**
 * Global map mouse events listener, used only on the trained-grid view.
 *
 * Hovering never calls the model. It snaps to the nearest trained grid cell and
 * reports that cell's own value, which the backend computed once for the whole
 * grid. The HUD therefore shows a real model output and names the cell it came
 * from, instead of blending neighbouring probabilities into an estimate that
 * looks measured but is not. Clicking is what triggers a real evaluation at the
 * exact coordinate, via the probe.
 */
function MapHoverListener({
  points,
  onHover,
  onClick,
}: {
  points: ForecastPoint[];
  onHover: (point: ForecastPoint) => void;
  onClick: (point: ForecastPoint) => void;
}) {
  const nearestCell = (lat: number, lng: number): ForecastPoint | null => {
    if (!points.length) return null;
    let best = points[0];
    let bestDistance = Infinity;
    for (const p of points) {
      const d = (lat - p.latitude) ** 2 + (lng - p.longitude) ** 2;
      if (d < bestDistance) {
        bestDistance = d;
        best = p;
      }
    }
    return best;
  };

  useMapEvents({
    mousemove(e) {
      const cell = nearestCell(e.latlng.lat, e.latlng.lng);
      if (cell) onHover(cell);
    },
    click(e) {
      // The click keeps the pointer's own coordinates; the value attached to it
      // is filled in by the coordinate probe's real backend call.
      const cell = nearestCell(e.latlng.lat, e.latlng.lng);
      if (cell) {
        onClick({
          ...cell,
          latitude: Number(e.latlng.lat.toFixed(4)),
          longitude: Number(e.latlng.lng.toFixed(4)),
          region: cell.region,
        });
      }
    },
  });

  return null;
}

function MapController({ points }: { points: ForecastPoint[] }) {
  const map = useMap();

  useEffect(() => {
    if (points.length > 0) {
      const lats = points.map((p) => p.latitude);
      const lons = points.map((p) => p.longitude);
      const bounds: [[number, number], [number, number]] = [
        [Math.min(7.0, ...lats) - 0.5, Math.min(68.5, ...lons) - 0.5],
        [Math.max(36.0, ...lats) + 0.8, Math.max(97.0, ...lons) + 0.5],
      ];
      map.fitBounds(bounds, { padding: [12, 12] });
    }
  }, [points, map]);

  // Handle dynamic container resize (e.g. sidebar toggle or window resize)
  useEffect(() => {
    const container = map.getContainer();
    if (!container) return;

    let resizeTimer: any;
    const observer = new ResizeObserver(() => {
      map.invalidateSize();
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        map.invalidateSize();
      }, 320);
    });

    observer.observe(container);

    return () => {
      observer.disconnect();
      clearTimeout(resizeTimer);
    };
  }, [map]);

  return null;
}

function getColor(value: number, layer: string): string {
  if (layer === 'confidence') {
    if (value >= 0.7) return '#10b981';
    if (value >= 0.4) return '#f59e0b';
    return '#ef4444';
  }
  // bust_probability
  if (value >= 0.7) return '#ef4444';
  if (value >= 0.4) return '#f59e0b';
  return '#10b981';
}

export default function IndiaMap({
  points,
  layer,
  selectedPoint,
  onPointClick,
  onPointHover,
  view: controlledView,
  onViewChange,
  day = 4,
  probeEnabled = true,
  height = '520px',
}: IndiaMapProps) {
  const mapRef = useRef(null);
  // The bust risk choropleth is the primary view; the trained grid map is the
  // secondary one, reachable from the same toggle.
  const [internalView, setInternalView] = useState<MapView>('risk');
  const view = controlledView ?? internalView;
  const isRiskView = view === 'risk';

  const [showGridBoxes, setShowGridBoxes] = useState(false);
  const [showDistrictMarkers, setShowDistrictMarkers] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [riskRanking, setRiskRanking] = useState<DistrictRisk[]>([]);
  const [liveHoveredPoint, setLiveHoveredPoint] = useState<ForecastPoint | null>(null);
  const [probePoint, setProbePoint] = useState<ForecastPoint | null>(null);
  const [boundaryGeoJson, setBoundaryGeoJson] = useState<any | null>(null);

  const halfLat = 2.8125;
  const halfLon = 2.8125;

  // Station coordinates are fixed, so they are asked for once per lead day and
  // keyed by coordinate for lookup while the map renders.
  const stationCoordinates = useMemo(
    () =>
      INDIAN_DISTRICTS.map((d) => ({
        latitude: d.latitude,
        longitude: d.longitude,
      })),
    []
  );

  const stationScoresQuery = useCoordinateScores(day, stationCoordinates);

  const stationScores = useMemo(() => {
    const index = new Map<string, ScoredCoordinate>();
    for (const result of stationScoresQuery.data?.results ?? []) {
      index.set(
        `${result.latitude.toFixed(4)},${result.longitude.toFixed(4)}`,
        result
      );
    }
    return index;
  }, [stationScoresQuery.data]);

  const setView = (next: MapView) => {
    setInternalView(next);
    onViewChange?.(next);
  };

  // Load the sovereign boundary GeoJSON
  useEffect(() => {
    fetch('/geojson/india-states.geojson')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load boundary');
        return res.json();
      })
      .then((data) => setBoundaryGeoJson(data))
      .catch((err) => console.warn('Official India boundary GeoJSON notice:', err));
  }, []);

  const handleLiveHover = useCallback(
    (point: ForecastPoint) => {
      setLiveHoveredPoint(point);
      onPointHover?.(point);
    },
    [onPointHover]
  );

  const handleLiveClick = useCallback(
    (point: ForecastPoint) => {
      onPointClick?.(point);
    },
    [onPointClick]
  );

  // The probe panel reports its own model result; the drawer opens on demand so
  // a click on the choropleth does not steal the selection from the district.
  const handleProbeResult = useCallback((point: ForecastPoint) => {
    setProbePoint(point);
  }, []);

  // Active inspected point: a live hover wins, then the pinned probe result,
  // then the parent's selection, then the first grid cell.
  const activeInspection = liveHoveredPoint ?? probePoint ?? selectedPoint ?? points[0] ?? null;
  const inspectedLevel = activeInspection ? levelFor(activeInspection.confidence) : null;
  const inspectedTone = inspectedLevel ? LEVEL_TONE[inspectedLevel] : null;

  return (
    <div
      style={{ height }}
      className="relative overflow-hidden rounded-lg border border-line bg-mapBase shadow-lift"
    >
      {/* ── Top Bar Controls: View Toggle, Boundary Note & Grid Toggle ── */}
      <div className="absolute left-3 right-3 top-3 z-[1000] flex items-center justify-between gap-2 pointer-events-none">
        {/* View toggle: bust risk choropleth <-> trained grid point map */}
        <div className="pointer-events-auto flex items-center gap-2">
          <div
            role="tablist"
            aria-label="Map view"
            className="flex items-center rounded-lg border border-line bg-panel/95 p-0.5 shadow-lift backdrop-blur-md"
          >
            <button
              type="button"
              role="tab"
              aria-selected={isRiskView}
              onClick={() => setView('risk')}
              title="District-level bust risk choropleth"
              className={`flex items-center gap-1.5 rounded-[7px] px-2.5 py-1.5 text-[11.5px] font-semibold transition-colors ${
                isRiskView
                  ? 'bg-risk-high text-white'
                  : 'text-ink-muted hover:bg-raised hover:text-ink'
              }`}
            >
              <Flame className="h-3.5 w-3.5" />
              <span>Bust Risk Map</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={!isRiskView}
              onClick={() => setView('markers')}
              title="Trained grid cells and district station points"
              className={`flex items-center gap-1.5 rounded-[7px] px-2.5 py-1.5 text-[11.5px] font-semibold transition-colors ${
                !isRiskView
                  ? 'bg-brand text-white'
                  : 'text-ink-muted hover:bg-raised hover:text-ink'
              }`}
            >
              <MapPinned className="h-3.5 w-3.5" />
              <span>Grid Map</span>
            </button>
          </div>

          {isRiskView && (
            <button
              onClick={() => setShowLabels((prev) => !prev)}
              type="button"
              aria-pressed={showLabels}
              className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11.5px] font-semibold shadow-lift backdrop-blur-md transition-colors ${
                showLabels
                  ? 'border-brand bg-brand text-white'
                  : 'border-line bg-panel/95 text-ink-muted hover:bg-raised hover:text-ink'
              }`}
              title="Show district name labels and values"
            >
              <Tag className="h-3.5 w-3.5" />
              <span>Labels {showLabels ? 'On' : 'Off'}</span>
            </button>
          )}
        </div>

        {/* Boundary note */}
        <div className="pointer-events-auto hidden items-center gap-1.5 rounded-lg border border-line bg-panel/95 px-2.5 py-1.5 shadow-lift backdrop-blur-md sm:flex">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          <span className="text-[10.5px] font-medium text-ink-muted">
            Boundary corrector active on both maps
          </span>
        </div>
      </div>

      {/* ── Secondary Controls (trained grid map only) ── */}
      {!isRiskView && (
        <div className="absolute left-3 top-14 z-[1000] flex items-center gap-2 pointer-events-none">
          <div className="pointer-events-auto flex items-center gap-2">
            <button
              onClick={() => setShowGridBoxes((prev) => !prev)}
              type="button"
              aria-pressed={showGridBoxes}
              className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11.5px] font-semibold shadow-lift backdrop-blur-md transition-colors ${
                showGridBoxes
                  ? 'border-brand bg-brand text-white'
                  : 'border-line bg-panel/95 text-ink-muted hover:bg-raised hover:text-ink'
              }`}
              title="Toggle the 5.625° coarse training grid cells"
            >
              <Layers className="h-3.5 w-3.5" />
              <span>5.6° grid bounds</span>
              {showGridBoxes ? <Eye className="ml-0.5 h-3 w-3" /> : <EyeOff className="ml-0.5 h-3 w-3" />}
            </button>

            <button
              onClick={() => setShowDistrictMarkers((prev) => !prev)}
              type="button"
              aria-pressed={showDistrictMarkers}
              className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11.5px] font-semibold shadow-lift backdrop-blur-md transition-colors ${
                showDistrictMarkers
                  ? 'border-brand bg-brand text-white'
                  : 'border-line bg-panel/95 text-ink-muted hover:bg-raised hover:text-ink'
              }`}
              title="Toggle the major district station points"
            >
              <MapPin className="h-3.5 w-3.5" />
              <span>Station points</span>
            </button>
          </div>
        </div>
      )}

      {/* ── Bottom-Left Floating Live Location & District HUD ── */}
      {activeInspection && (
        <div className="absolute bottom-4 left-4 z-[1000] w-[270px] rounded-lg border border-line bg-panel/95 shadow-lift backdrop-blur-md pointer-events-none">
          <div className="flex items-center justify-between gap-2 border-b border-line px-3.5 py-2">
            <span className="flex min-w-0 items-center gap-1.5 text-[11.5px] font-semibold text-ink">
              <Compass className="h-3.5 w-3.5 flex-shrink-0 text-brand" />
              <span className="truncate">
                {activeInspection.region || 'Indian domain'}
              </span>
            </span>
            {inspectedTone && (
              <span className={`chip flex-shrink-0 border ${inspectedTone.chip}`}>
                {inspectedLevel}
              </span>
            )}
          </div>

          <div className="px-3.5 py-2.5">
            <p className="mb-2 font-mono text-[11px] text-ink-muted">
              {activeInspection.latitude.toFixed(4)}°N, {activeInspection.longitude.toFixed(4)}°E
              <span className="text-ink-faint"> · day {day}</span>
            </p>

            <div className="grid grid-cols-2 gap-2 rounded-md border border-line bg-raised p-2 text-center">
              <div>
                <span className="flex items-center justify-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-ink-muted">
                  <ShieldAlert className="h-3 w-3 text-risk-high" /> Bust risk
                </span>
                <span className="font-mono text-sm font-bold tabular-nums text-risk-high">
                  {(activeInspection.bust_probability * 100).toFixed(1)}%
                </span>
              </div>
              <div>
                <span className="flex items-center justify-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-ink-muted">
                  <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />{' '}
                  Confidence
                </span>
                <span className="font-mono text-sm font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                  {(activeInspection.confidence * 100).toFixed(1)}%
                </span>
              </div>
            </div>

            <p className="mt-2 text-center text-[10px] leading-relaxed text-ink-faint">
              {probePoint && !liveHoveredPoint
                ? 'Trained-model evaluation at this coordinate'
                : isRiskView
                ? 'Hover a district to inspect · click to pin a prediction'
                : 'Hover anywhere across India to inspect reliability'}
            </p>
          </div>
        </div>
      )}

      {/* ── Leaflet Map Container ── */}
      <MapContainer
        center={[22.5, 82.5]}
        zoom={5}
        style={{ height: '100%', width: '100%', background: '#0b1329' }}
        ref={mapRef}
        zoomControl={true}
        scrollWheelZoom={true}
      >
        {/* Corrected Tile Layer with Indian Boundary Corrector (active in BOTH views) */}
        <IndiaBoundaryCorrectedTileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> | Boundaries: Open Government Data (OGD) India, ISC licence'
        />

        {/* Pane registry (district fills render below the sovereign boundary) */}
        <MapPanes />

        {/* Dims the imagery only when the district choropleth is on top of it */}
        <BasemapDimmer dim={isRiskView} />

        {/* District-level bust risk choropleth (rendered below the sovereign boundary) */}
        {isRiskView && (
          <DistrictRiskMap
            day={day}
            layer={layer}
            selectedPoint={selectedPoint ?? null}
            showLabels={showLabels}
            onDistrictHover={handleLiveHover}
            onDistrictClick={handleLiveClick}
            onRiskRanking={setRiskRanking}
          />
        )}

        {/* Sovereign boundary vector layer */}
        {boundaryGeoJson && (
          <GeoJSON
            data={boundaryGeoJson}
            interactive={false}
            style={{
              color: '#38bdf8',
              weight: 1.6,
              opacity: 0.85,
              fillColor: 'transparent',
              fillOpacity: 0,
            }}
          />
        )}

        <MapController points={points} />

        {/*
          Latitude/longitude prediction. The probe has its own click handler, so
          it is mounted on its own in the risk view; the interpolated hover HUD
          is left to the district tooltips there.
        */}
        {isRiskView && probeEnabled && <CoordinateProbe day={day} onResult={handleProbeResult} />}

        {/* Global Mouse Tracker for continuous hovering across any point in India */}
        {!isRiskView && (
          <MapHoverListener
            points={points}
            onHover={handleLiveHover}
            onClick={handleLiveClick}
          />
        )}

        {/* ── Optional Toggle: Coarse 5.625° Grid Bounding Boxes ─────────────── */}
        {!isRiskView &&
          showGridBoxes &&
          points.map((point, idx) => {
            const value = layer === 'confidence' ? point.confidence : point.bust_probability;
            const color = getColor(value, layer);
            const isSelected =
              selectedPoint?.latitude === point.latitude &&
              selectedPoint?.longitude === point.longitude;

            const bounds: [[number, number], [number, number]] = [
              [point.latitude - halfLat, point.longitude - halfLon],
              [point.latitude + halfLat, point.longitude + halfLon],
            ];

            return (
              <Rectangle
                key={`box-${point.latitude}-${point.longitude}-${idx}`}
                bounds={bounds}
                pathOptions={{
                  fillColor: color,
                  fillOpacity: isSelected ? 0.35 : 0.15,
                  color: isSelected ? '#38bdf8' : '#94a3b8',
                  weight: isSelected ? 2 : 1,
                  dashArray: '4, 4',
                }}
                eventHandlers={{
                  click: () => onPointClick?.(point),
                }}
              />
            );
          })}

        {/* ── Major Indian Meteorological District / Station Pins ────────────── */}
        {!isRiskView &&
          showDistrictMarkers &&
          INDIAN_DISTRICTS.map((district) => {
            // Every station pin carries the model's own evaluation at that
            // station's coordinates. A station the backend did not return is
            // drawn hollow and says so on hover, rather than taking the
            // probability of whatever grid cell happens to be nearby.
            const score = stationScores.get(
              `${district.latitude.toFixed(4)},${district.longitude.toFixed(4)}`
            );
            if (!score) {
              return (
                <CircleMarker
                  key={`district-${district.id}`}
                  center={[district.latitude, district.longitude]}
                  radius={4}
                  fillColor="#94a3b8"
                  fillOpacity={0.15}
                  stroke
                  color="#64748b"
                  weight={1}
                  dashArray="2,2"
                  eventHandlers={{}}
                >
                  <Tooltip direction="top" offset={[0, -6]} opacity={1}>
                    <div className="district-tip !min-w-0 !p-0">
                      <b>
                        {district.name}, {district.state}
                      </b>
                      <span className="!font-mono">
                        {district.latitude.toFixed(2)}°N, {district.longitude.toFixed(2)}°E
                      </span>
                      <em>DATA NOT AVAILABLE — no model evaluation for this coordinate</em>
                    </div>
                  </Tooltip>
                </CircleMarker>
              );
            }

            const value = layer === 'confidence' ? score.confidence : score.bust_probability;
            const color = getColor(value, layer);
            const isHovered = liveHoveredPoint?.region?.includes(district.name);

            const districtPoint: ForecastPoint = {
              latitude: district.latitude,
              longitude: district.longitude,
              bust_probability: score.bust_probability,
              confidence: score.confidence,
              confidence_level: score.confidence_level,
              region: `${district.name} District, ${district.state}`,
            };

            return (
              <CircleMarker
                key={`district-${district.id}`}
                center={[district.latitude, district.longitude]}
                radius={isHovered ? 7 : 4.5}
                fillColor={color}
                fillOpacity={0.9}
                stroke={true}
                color={isHovered ? '#ffffff' : '#0f172a'}
                weight={isHovered ? 2 : 1}
                eventHandlers={{
                  mouseover: () => handleLiveHover(districtPoint),
                  click: () => handleLiveClick(districtPoint),
                }}
              >
                <Tooltip direction="top" offset={[0, -6]} opacity={1}>
                  <div className="district-tip !min-w-0 !p-0">
                    <b>
                      {district.name}, {district.state}
                    </b>
                    <span className="!font-mono">
                      {district.latitude.toFixed(2)}°N, {district.longitude.toFixed(2)}°E
                    </span>
                    <div className="district-tip-grid">
                      <div>
                        <label>Bust Risk</label>
                        <b className="tip-bust">{percent(score.bust_probability)}</b>
                      </div>
                      <div>
                        <label>Confidence</label>
                        <b className="tip-conf">{percent(score.confidence)}</b>
                      </div>
                      <div>
                        <label>Level</label>
                        <b>{score.confidence_level}</b>
                      </div>
                    </div>
                    <em>
                      Scored by the trained model at this coordinate
                      {score.derivation?.distance_km
                        ? `, ${score.derivation.distance_km}° from the nearest reference cell`
                        : ''}
                    </em>
                  </div>
                </Tooltip>
              </CircleMarker>
            );
          })}

        {/* ── Trained Grid Anchor Points ────────────────────────────────────── */}
        {!isRiskView &&
          points.map((point, idx) => {
          const value = layer === 'confidence' ? point.confidence : point.bust_probability;
          const color = getColor(value, layer);
          const isSelected =
            selectedPoint?.latitude === point.latitude &&
            selectedPoint?.longitude === point.longitude;

          return (
            <CircleMarker
              key={`grid-anchor-${point.latitude}-${point.longitude}-${idx}`}
              center={[point.latitude, point.longitude]}
              radius={isSelected ? 10 : 5}
              fillColor={color}
              fillOpacity={0.85}
              stroke={isSelected}
              color={isSelected ? '#38bdf8' : '#000000'}
              weight={isSelected ? 2.5 : 1}
              eventHandlers={{
                mouseover: () => handleLiveHover(point),
                click: () => handleLiveClick(point),
              }}
            />
          );
        })}
      </MapContainer>

      {/* ── Risk Map Legend & Extreme Districts ── */}
      {isRiskView && (
        <RiskLegend
          layer={layer}
          day={day}
          ranking={riskRanking}
          onSelect={(risk) =>
            handleLiveClick({
              latitude: risk.latitude,
              longitude: risk.longitude,
              bust_probability: risk.bust_probability,
              confidence: risk.confidence,
              confidence_level: risk.level,
              region: `${risk.district} District, ${risk.state}`,
            })
          }
        />
      )}
    </div>
  );
}
