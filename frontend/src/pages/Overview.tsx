import { useState } from 'react';
import { useForecastMap, useForecastOverview } from '../hooks';
import IndiaMap from '../components/map/IndiaMap';
import MapControls from '../components/map/MapControls';
import LocationDrawer from '../components/map/LocationDrawer';
import type { ForecastPoint } from '../types';
import { Crosshair, MapPin } from 'lucide-react';

export default function Overview() {
  const [selectedDay, setSelectedDay] = useState(4);
  const [layer, setLayer] = useState<'bust_probability' | 'confidence'>('confidence');
  const [selectedPoint, setSelectedPoint] = useState<ForecastPoint | null>(null);
  const [hoveredPoint, setHoveredPoint] = useState<ForecastPoint | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const { data: mapData, isLoading: mapLoading } = useForecastMap(selectedDay, layer);
  const { data: overview } = useForecastOverview(selectedDay);

  const handlePointClick = (point: ForecastPoint) => {
    setSelectedPoint(point);
    setDrawerOpen(true);
  };

  // Active point: hovered takes immediate preview precedence; falls back to locked selected point or first point
  const points = mapData?.points || [];
  const activePoint = hoveredPoint || selectedPoint || (points.length > 0 ? points[0] : null);

  const activeConf = activePoint ? (activePoint.confidence * 100).toFixed(1) : (overview ? (overview.average_confidence * 100).toFixed(1) : '—');
  const activeBust = activePoint ? (activePoint.bust_probability * 100).toFixed(1) : (overview ? (overview.highest_bust_probability * 100).toFixed(1) : '—');

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink mb-1">FORECAST RELIABILITY</h1>
          <p className="text-sm text-ink-muted">
            Latitude & Longitude Trained Model Grid · ECMWF ERA5 Calibration (Untitled9.ipynb)
          </p>
        </div>
        <div className="flex items-center gap-2 bg-panel border border-line px-3 py-1.5 rounded-lg text-xs font-mono">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-emerald-400 font-semibold">Trained Model Online (30 Spatial Grid Cells)</span>
        </div>
      </div>

      {/* Controls */}
      <div className="mb-4">
        <MapControls
          selectedDay={selectedDay}
          onDayChange={setSelectedDay}
          layer={layer}
          onLayerChange={setLayer}
        />
      </div>

      {/* Active Area Banner (Updates Dynamically on Hover / Click) */}
      {activePoint && (
        <div className="mb-4 p-3 bg-panel border border-brand/40 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand/20 text-brand flex items-center justify-center font-bold flex-shrink-0">
              <Crosshair size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-raised text-ink">
                  {hoveredPoint ? 'Hover Preview' : 'Selected Area'}
                </span>
                <span className="text-sm font-mono font-bold text-ink">
                  Lat {activePoint.latitude.toFixed(4)}°N, Lon {activePoint.longitude.toFixed(3)}°E
                </span>
                <span className="text-sm font-semibold text-brand">· {activePoint.region || 'Trained Grid Point'}</span>
              </div>
              <p className="text-xs text-ink-muted mt-0.5">
                Evaluated for Day {selectedDay} ({selectedDay * 24}h lead time) · Level: <span className="font-semibold text-ink">{activePoint.confidence_level}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-[10px] uppercase font-bold text-ink-muted">Bust Probability</div>
              <div className="text-lg font-mono font-bold text-red-400">{activeBust}%</div>
            </div>
            <div className="text-right pl-3 border-l border-line">
              <div className="text-[10px] uppercase font-bold text-ink-muted">Confidence</div>
              <div className="text-lg font-mono font-bold text-emerald-400">{activeConf}%</div>
            </div>
          </div>
        </div>
      )}

      {/* Map (Hover over any area to show trained data latitude & longitude wise) */}
      <div className="mb-6">
        {mapLoading ? (
          <div className="h-[680px] bg-panel rounded-lg border border-line flex items-center justify-center">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-ink-muted">Loading trained forecast grid...</p>
            </div>
          </div>
        ) : (
          <IndiaMap
            points={points}
            layer={layer}
            selectedPoint={activePoint}
            onPointHover={setHoveredPoint}
            onPointClick={handlePointClick}
            day={selectedDay}
            height="680px"
          />
        )}
      </div>

      {/* Stats Cards (Dynamically Updated for Active Latitude/Longitude Area) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-panel p-4 rounded-lg border border-line">
          <p className="text-xs text-ink-muted uppercase tracking-wider mb-1">
            {activePoint ? 'Active Point Confidence' : 'Forecast Confidence'}
          </p>
          <p className="text-2xl font-bold text-emerald-400">{activeConf}%</p>
          <p className="text-[11px] text-ink-muted mt-1">
            {activePoint ? `Lat ${activePoint.latitude.toFixed(2)}°N, Lon ${activePoint.longitude.toFixed(2)}°E` : 'National average'}
          </p>
        </div>
        <div className="bg-panel p-4 rounded-lg border border-line">
          <p className="text-xs text-ink-muted uppercase tracking-wider mb-1">
            {activePoint ? 'Active Bust Risk' : 'Bust Probability'}
          </p>
          <p className="text-2xl font-bold text-red-400">{activeBust}%</p>
          <p className="text-[11px] text-ink-muted mt-1">
            {activePoint ? activePoint.region : 'Highest risk cell'}
          </p>
        </div>
        <div className="bg-panel p-4 rounded-lg border border-line">
          <p className="text-xs text-ink-muted uppercase tracking-wider mb-1">Reliability Level</p>
          <p className="text-2xl font-bold text-ink">
            {activePoint ? activePoint.confidence_level : (overview?.high_risk_cells ?? 'MODERATE')}
          </p>
          <p className="text-[11px] text-ink-muted mt-1">
            {overview ? `${overview.high_risk_cells} high-risk cells detected` : 'Sigmoid calibration'}
          </p>
        </div>
        <div className="bg-panel p-4 rounded-lg border border-line">
          <p className="text-xs text-ink-muted uppercase tracking-wider mb-1">Forecast Lead</p>
          <p className="text-2xl font-bold text-brand">D{selectedDay}</p>
          <p className="text-[11px] text-ink-muted mt-1">{selectedDay * 24} hours horizon</p>
        </div>
      </div>

      {/* 10-Day Timeline */}
      <div className="bg-panel p-4 rounded-lg border border-line">
        <p className="text-xs text-ink-muted uppercase tracking-wider mb-3">10-Day Reliability Timeline</p>
        <div className="flex gap-2">
          {Array.from({ length: 10 }, (_, i) => {
            const day = i + 1;
            const isActive = day === selectedDay;
            const leadFactor = 1.0 + (day - 1) * 0.12;
            const bustProb = Math.min(0.95, 0.15 * leadFactor);
            const confidence = 1.0 - bustProb;

            return (
              <button
                key={day}
                onClick={() => setSelectedDay(day)}
                className={`flex-1 p-3 rounded-lg text-center transition-colors cursor-pointer ${
                  isActive ? 'bg-brand/20 border border-brand' : 'bg-raised hover:bg-raised'
                }`}
              >
                <p className="text-xs text-ink-muted font-mono">D{day}</p>
                <p className="text-sm font-bold text-ink">{(bustProb * 100).toFixed(0)}%</p>
                <p className="text-xs text-ink-muted">{(confidence * 100).toFixed(0)}%</p>
              </button>
            );
          })}
        </div>
        <div className="flex justify-between mt-2 text-xs text-ink-muted">
          <span>Bust Probability / Confidence</span>
        </div>
      </div>

      {/* Location Drawer */}
      <LocationDrawer
        point={selectedPoint}
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onExplain={() => {}}
        onVerify={() => {}}
      />
    </div>
  );
}
