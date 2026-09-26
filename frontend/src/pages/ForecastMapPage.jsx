import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import ForecastMap from '../components/ForecastMap';
import ConfidenceLegend from '../components/ConfidenceLegend';
import RegionDrawer from '../components/RegionDrawer';
import { useForecastMap } from '../hooks/useForecast';
import { MOCK_REGIONS_FULL } from '../data/mockRegions';
import { Layers, Sliders, MapPin } from 'lucide-react';
import clsx from 'clsx';

const VARIABLES = ['Precipitation', 'Temperature', 'Wind', 'Pressure'];
const DAYS = ['D1','D2','D3','D4','D5','D6','D7','D8','D9','D10'];
const LAYERS = ['Bust Probability', 'Confidence', 'Forecast', 'Error'];

export default function ForecastMapPage() {
  const [searchParams] = useSearchParams();

  const [variable, setVariable] = useState('Precipitation');
  const [day, setDay] = useState(searchParams.get('day') || 'D5');
  const [layer, setLayer] = useState('Bust Probability');
  const [threshold, setThreshold] = useState(50);
  const [selectedRegionId, setSelectedRegionId] = useState(searchParams.get('region') || null);

  const { data: mapData, isLoading } = useForecastMap({ variable, day, layer });

  const selectedRegion = selectedRegionId
    ? MOCK_REGIONS_FULL.find(r => r.id === selectedRegionId)
    : null;

  return (
    <div className="flex flex-col h-full gap-3 animate-fade-in text-slate-800">
      {/* Page title */}
      <div className="flex items-center justify-between bg-white px-4 py-3 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 uppercase tracking-wide">
              Official Geospatial Layer
            </span>
          </div>
          <h1 className="text-slate-900 font-bold text-lg mt-0.5 tracking-tight">
            National Forecast Reliability & Bust Map
          </h1>
          <p className="text-slate-500 text-xs">
            Interactive visualization of numerical weather prediction confidence and failure risk across India
          </p>
        </div>

        {/* Selected Region Quick Tag */}
        {selectedRegion && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold">
            <MapPin size={13} />
            <span>{selectedRegion.name} ({selectedRegion.code})</span>
          </div>
        )}
      </div>

      {/* Controls Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs flex flex-wrap items-center justify-between gap-4">
        {/* Variable */}
        <ControlGroup label="Variable">
          {VARIABLES.map(v => (
            <ToggleBtn key={v} active={variable === v} onClick={() => setVariable(v)}>{v}</ToggleBtn>
          ))}
        </ControlGroup>

        {/* Lead time */}
        <ControlGroup label="Lead Time">
          <div className="flex gap-1">
            {DAYS.map(d => (
              <button
                key={d}
                onClick={() => setDay(d)}
                className={clsx(
                  'px-2 py-1 rounded text-xs font-mono font-medium transition-colors cursor-pointer',
                  day === d ? 'bg-blue-600 text-white font-bold' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                )}
              >
                {d}
              </button>
            ))}
          </div>
        </ControlGroup>

        {/* Layer */}
        <ControlGroup label="Layer">
          {LAYERS.map(l => (
            <ToggleBtn key={l} active={layer === l} onClick={() => setLayer(l)}>{l}</ToggleBtn>
          ))}
        </ControlGroup>

        {/* Threshold slider */}
        {layer === 'Bust Probability' && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Bust Threshold:</span>
            <input
              type="range"
              min={10}
              max={80}
              step={5}
              value={threshold}
              onChange={e => setThreshold(Number(e.target.value))}
              className="w-24 accent-blue-600 cursor-pointer"
            />
            <span className="font-mono text-xs text-blue-600 font-bold w-9 text-right">{threshold}%</span>
          </div>
        )}
      </div>

      {/* Map Canvas */}
      <div className="relative flex-1 min-h-[460px] rounded-xl overflow-hidden border border-slate-200 bg-slate-50 shadow-2xs">
        <ForecastMap
          mapData={mapData || []}
          layer={layer}
          onRegionClick={setSelectedRegionId}
          selectedRegion={selectedRegionId}
          className="h-full w-full"
        />

        {/* Confidence Legend */}
        <div className="absolute bottom-4 left-3 z-[400]">
          <ConfidenceLegend mode={layer === 'Confidence' ? 'confidence' : 'bust'} />
        </div>
      </div>

      {/* Region Drawer */}
      {selectedRegion && (
        <RegionDrawer
          region={selectedRegion}
          day={day}
          onClose={() => setSelectedRegionId(null)}
        />
      )}
    </div>
  );
}

function ControlGroup({ label, children }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{label}:</span>
      <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
        {children}
      </div>
    </div>
  );
}

function ToggleBtn({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'px-2.5 py-1 rounded text-xs font-semibold transition-all cursor-pointer whitespace-nowrap',
        active
          ? 'bg-white text-blue-600 shadow-xs border border-slate-200'
          : 'text-slate-600 hover:text-slate-900'
      )}
    >
      {children}
    </button>
  );
}
