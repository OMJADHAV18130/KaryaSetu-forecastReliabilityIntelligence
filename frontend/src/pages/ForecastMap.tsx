import { useState } from 'react';
import { useForecastMap } from '../hooks';
import IndiaMap from '../components/map/IndiaMap';
import MapControls from '../components/map/MapControls';
import LocationDrawer from '../components/map/LocationDrawer';
import type { ForecastPoint } from '../types';

export default function ForecastMap() {
  const [selectedDay, setSelectedDay] = useState(4);
  const [layer, setLayer] = useState<'bust_probability' | 'confidence'>('bust_probability');
  const [selectedPoint, setSelectedPoint] = useState<ForecastPoint | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const { data, isLoading } = useForecastMap(selectedDay, layer);

  const handlePointClick = (point: ForecastPoint) => {
    setSelectedPoint(point);
    setDrawerOpen(true);
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-1">FORECAST MAP</h1>
        <p className="text-sm text-slate-400">
          {layer === 'bust_probability' ? 'Probability of forecast bust' : 'Forecast confidence'}
        </p>
      </div>

      <div className="mb-4">
        <MapControls
          selectedDay={selectedDay}
          onDayChange={setSelectedDay}
          layer={layer}
          onLayerChange={setLayer}
        />
      </div>

      {isLoading ? (
        <div className="h-[calc(100vh-230px)] min-h-[700px] bg-surface-800 rounded-lg border border-surface-700 flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-slate-400">Loading forecast data...</p>
          </div>
        </div>
      ) : (
        <IndiaMap
          points={data?.points || []}
          layer={layer}
          selectedPoint={selectedPoint}
          onPointClick={handlePointClick}
          day={selectedDay}
          height="calc(100vh - 230px)"
        />
      )}

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
