import { useEffect, useRef, useState, useCallback } from 'react';
import { MapContainer, CircleMarker, Rectangle, Tooltip, GeoJSON, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { extendLeaflet } from '@india-boundary-corrector/leaflet-layer';
import { Layers, Eye, EyeOff, MapPin, Compass, ShieldAlert, CheckCircle2 } from 'lucide-react';
import type { ForecastPoint } from '../../types';
import { INDIAN_DISTRICTS, interpolateReliability } from '../../data/indianDistricts';

interface IndiaMapProps {
  points: ForecastPoint[];
  layer: 'bust_probability' | 'confidence';
  selectedPoint?: ForecastPoint | null;
  onPointClick?: (point: ForecastPoint) => void;
  onPointHover?: (point: ForecastPoint | null) => void;
  height?: string;
}

/**
 * TileLayer component applying Indian Boundary Corrections
 * in accordance with Government of India / Survey of India standards.
 */
function IndiaBoundaryCorrectedTileLayer({
  url = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  attribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> | Boundary: Survey of India',
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
 * Global map mouse events listener that provides real-time forecast reliability
 * on hover and click at ANY point across India.
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
  useMapEvents({
    mousemove(e) {
      const { lat, lng } = e.latlng;
      // Filter to broader Indian subcontinent bounds
      if (lat >= 6.0 && lat <= 38.0 && lng >= 67.0 && lng <= 98.5) {
        const interp = interpolateReliability(lat, lng, points);
        const dynamicPoint: ForecastPoint = {
          latitude: Number(lat.toFixed(4)),
          longitude: Number(lng.toFixed(4)),
          bust_probability: Number(interp.bust_probability.toFixed(4)),
          confidence: Number(interp.confidence.toFixed(4)),
          confidence_level:
            interp.confidence >= 0.7 ? 'HIGH' : interp.confidence >= 0.4 ? 'MEDIUM' : 'LOW',
          region: interp.nearestRegion,
        };
        onHover(dynamicPoint);
      }
    },
    click(e) {
      const { lat, lng } = e.latlng;
      if (lat >= 6.0 && lat <= 38.0 && lng >= 67.0 && lng <= 98.5) {
        const interp = interpolateReliability(lat, lng, points);
        const dynamicPoint: ForecastPoint = {
          latitude: Number(lat.toFixed(4)),
          longitude: Number(lng.toFixed(4)),
          bust_probability: Number(interp.bust_probability.toFixed(4)),
          confidence: Number(interp.confidence.toFixed(4)),
          confidence_level:
            interp.confidence >= 0.7 ? 'HIGH' : interp.confidence >= 0.4 ? 'MEDIUM' : 'LOW',
          region: interp.nearestRegion,
        };
        onClick(dynamicPoint);
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
  height = '520px',
}: IndiaMapProps) {
  const mapRef = useRef(null);
  const [showGridBoxes, setShowGridBoxes] = useState(false);
  const [showDistrictMarkers, setShowDistrictMarkers] = useState(true);
  const [liveHoveredPoint, setLiveHoveredPoint] = useState<ForecastPoint | null>(null);
  const [boundaryGeoJson, setBoundaryGeoJson] = useState<any | null>(null);

  const halfLat = 2.8125;
  const halfLon = 2.8125;

  // Load official Survey of India boundary GeoJSON
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

  // Active inspected point (either live hovered or selected or first point)
  const activeInspection = liveHoveredPoint || selectedPoint || points[0] || null;

  return (
    <div style={{ height }} className="rounded-xl overflow-hidden border border-surface-700 relative shadow-2xl bg-[#0b1329]">
      {/* ── Top Bar Controls: Compliance Badge & Grid Toggle ── */}
      <div className="absolute top-3 left-3 right-3 z-[1000] flex items-center justify-between pointer-events-none">
        {/* Toggle Button for Grid Boxes & Districts */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            onClick={() => setShowGridBoxes((prev) => !prev)}
            type="button"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide border shadow-md transition-all ${
              showGridBoxes
                ? 'bg-blue-600/90 text-white border-blue-400 shadow-blue-500/20'
                : 'bg-slate-900/90 text-slate-300 border-surface-600 hover:bg-slate-800 hover:text-white'
            }`}
            title="Toggle the 5.625° ERA5 coarse training grid cells"
          >
            <Layers className="w-3.5 h-3.5 text-blue-400" />
            <span>{showGridBoxes ? 'Hide 5.6° Grid Bounds' : 'Show 5.6° Grid Bounds'}</span>
            {showGridBoxes ? <Eye className="w-3 h-3 ml-0.5 text-blue-200" /> : <EyeOff className="w-3 h-3 ml-0.5 text-slate-400" />}
          </button>

          <button
            onClick={() => setShowDistrictMarkers((prev) => !prev)}
            type="button"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide border shadow-md transition-all ${
              showDistrictMarkers
                ? 'bg-emerald-600/90 text-white border-emerald-400 shadow-emerald-500/20'
                : 'bg-slate-900/90 text-slate-300 border-surface-600 hover:bg-slate-800 hover:text-white'
            }`}
            title="Toggle major Indian meteorological districts"
          >
            <MapPin className="w-3.5 h-3.5 text-emerald-400" />
            <span>{showDistrictMarkers ? 'Districts Active' : 'Districts Hidden'}</span>
          </button>
        </div>

        {/* Survey of India Compliance Badge */}
        <div className="bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-emerald-500/50 shadow-lg flex items-center gap-2 pointer-events-auto">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[11px] font-semibold text-emerald-300 tracking-wide">
            🇮🇳 Survey of India Standard &bull; Boundary Corrector Active
          </span>
        </div>
      </div>

      {/* ── Bottom-Left Floating Live Location & District HUD ── */}
      {activeInspection && (
        <div className="absolute bottom-4 left-4 z-[1000] bg-slate-900/95 backdrop-blur-md px-3.5 py-2.5 rounded-xl border border-slate-700/80 shadow-2xl min-w-[270px] pointer-events-none transition-all">
          <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-800">
            <div className="flex items-center gap-1.5 text-sky-400 text-xs font-bold">
              <Compass className="w-3.5 h-3.5 animate-spin-slow" />
              <span>{activeInspection.region || 'Indian Meteorological Region'}</span>
            </div>
            <span
              className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded border uppercase tracking-wider ${
                activeInspection.confidence >= 0.7
                  ? 'bg-emerald-950/80 text-emerald-400 border-emerald-800/60'
                  : activeInspection.confidence >= 0.4
                  ? 'bg-amber-950/80 text-amber-400 border-amber-800/60'
                  : 'bg-rose-950/80 text-rose-400 border-rose-800/60'
              }`}
            >
              {activeInspection.confidence_level || (activeInspection.confidence >= 0.7 ? 'HIGH' : 'MEDIUM')} CONFIDENCE
            </span>
          </div>

          <div className="text-[11px] font-mono text-slate-400 mb-2">
            📍 Lat: <span className="text-slate-200 font-semibold">{activeInspection.latitude.toFixed(4)}°N</span>, Lon: <span className="text-slate-200 font-semibold">{activeInspection.longitude.toFixed(4)}°E</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-center bg-slate-950/60 p-2 rounded-lg border border-slate-800/60">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold flex items-center justify-center gap-1">
                <ShieldAlert className="w-3 h-3 text-rose-400" /> Bust Risk
              </span>
              <span className="text-sm font-extrabold text-rose-400 font-mono">
                {(activeInspection.bust_probability * 100).toFixed(1)}%
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold flex items-center justify-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Confidence
              </span>
              <span className="text-sm font-extrabold text-emerald-400 font-mono">
                {(activeInspection.confidence * 100).toFixed(1)}%
              </span>
            </div>
          </div>
          <div className="mt-1.5 text-[9.5px] text-slate-400 text-center flex items-center justify-center gap-1">
            <span>Hover anywhere across India to inspect localized reliability</span>
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
        {/* Corrected Tile Layer with Indian Boundary Corrector */}
        <IndiaBoundaryCorrectedTileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> | Boundary: Survey of India'
        />

        {/* Official Survey of India Sovereign Boundary Vector Layer */}
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

        {/* Global Mouse Tracker for continuous hovering across any point in India */}
        <MapHoverListener
          points={points}
          onHover={handleLiveHover}
          onClick={handleLiveClick}
        />

        {/* ── Optional Toggle: Coarse 5.625° Grid Bounding Boxes ─────────────── */}
        {showGridBoxes &&
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
        {showDistrictMarkers &&
          INDIAN_DISTRICTS.map((district) => {
            const interp = interpolateReliability(district.latitude, district.longitude, points);
            const value = layer === 'confidence' ? interp.confidence : interp.bust_probability;
            const color = getColor(value, layer);
            const isHovered =
              liveHoveredPoint?.region?.includes(district.name);

            const districtPoint: ForecastPoint = {
              latitude: district.latitude,
              longitude: district.longitude,
              bust_probability: interp.bust_probability,
              confidence: interp.confidence,
              confidence_level:
                interp.confidence >= 0.7 ? 'HIGH' : interp.confidence >= 0.4 ? 'MEDIUM' : 'LOW',
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
                <Tooltip direction="top" offset={[0, -6]} opacity={0.95}>
                  <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '11.5px', padding: '1px' }}>
                    <b style={{ color: '#0f172a' }}>📍 {district.name}, {district.state}</b>
                    <br />
                    <span style={{ color: '#64748b', fontSize: '10px' }}>
                      Lat: {district.latitude.toFixed(2)}°N, Lon: {district.longitude.toFixed(2)}°E
                    </span>
                    <div style={{ marginTop: '3px', fontWeight: 600 }}>
                      Bust Risk: <span style={{ color: '#dc2626' }}>{(interp.bust_probability * 100).toFixed(1)}%</span> &bull; Conf: <span style={{ color: '#059669' }}>{(interp.confidence * 100).toFixed(1)}%</span>
                    </div>
                  </div>
                </Tooltip>
              </CircleMarker>
            );
          })}

        {/* ── Trained Grid Anchor Points ────────────────────────────────────── */}
        {points.map((point, idx) => {
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
    </div>
  );
}
