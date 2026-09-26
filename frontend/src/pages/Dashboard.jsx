import { useState, useMemo } from 'react';
import { Shield, TrendingDown, Activity, Layers, Info, Sparkles } from 'lucide-react';
import RiskCard from '../components/RiskCard';
import ForecastMap from '../components/ForecastMap';
import ConfidenceLegend from '../components/ConfidenceLegend';
import MvpFeaturePredictor, { FEATURE_INFO } from '../components/MvpFeaturePredictor';
import { useOverview, useForecastMap } from '../hooks/useForecast';
import { MOCK_REGIONS_FULL } from '../data/mockRegions';
import { CardSkeleton } from '../components/LoadingState';
import clsx from 'clsx';

const DAYS = ['D1','D2','D3','D4','D5','D6','D7','D8','D9','D10'];

export default function Dashboard() {
  const [selectedDay, setSelectedDay] = useState('D5');
  const [selectedRegionId, setSelectedRegionId] = useState('odisha');
  const [layer, setLayer] = useState('Bust Probability');

  const { data: overview, isLoading: ovLoading } = useOverview();
  const { data: mapData, isLoading: mapLoading } = useForecastMap({ day: selectedDay, layer });

  const selectedRegion = useMemo(() => {
    return MOCK_REGIONS_FULL.find(r => r.id === selectedRegionId) || MOCK_REGIONS_FULL[0];
  }, [selectedRegionId]);

  return (
    <div className="flex flex-col gap-4 animate-fade-in text-slate-800">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 uppercase tracking-wide">
              Operational Decision Support MVP
            </span>
            <span className="text-xs text-slate-400">·</span>
            <span className="text-xs font-semibold text-slate-600">
              NCMRWF Numerical Weather Prediction
            </span>
          </div>
          <h1 className="text-slate-900 font-bold text-xl mt-1 tracking-tight">
            AI-Based Forecast Bust Detection Dashboard
          </h1>
          <p className="text-slate-500 text-xs mt-0.5">
            Evaluates 13 meteorological and numerical features to predict forecast reliability and spatial bust risk.
          </p>
        </div>

        {/* Lead Day Selector */}
        <div className="flex items-center gap-1.5 self-start md:self-auto bg-slate-100 p-1 rounded-lg border border-slate-200">
          <span className="text-[11px] font-bold text-slate-500 px-2 uppercase tracking-wider">Lead:</span>
          {DAYS.map(d => (
            <button
              key={d}
              onClick={() => setSelectedDay(d)}
              className={clsx(
                'px-2.5 py-1 rounded text-xs font-mono font-semibold transition-all cursor-pointer',
                selectedDay === d
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              )}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {ovLoading ? (
          Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)
        ) : (
          <>
            <RiskCard
              title="Forecast Confidence"
              value={overview?.forecastConfidence ?? 68}
              unit="%"
              colorScheme="confidence"
              icon={Shield}
              subtitle={`National average at ${selectedDay}`}
            />
            <RiskCard
              title="Average Bust Risk"
              value={overview?.bustRisk ?? 34}
              unit="%"
              colorScheme="risk"
              icon={TrendingDown}
              subtitle="Probability of forecast failure"
            />
            <RiskCard
              title="High-Risk States"
              value={overview?.highRiskRegions ?? 6}
              unit=""
              colorScheme="risk"
              icon={Activity}
              subtitle="Bust risk ≥ 50% threshold"
            />
            <RiskCard
              title="Features Ingested"
              value="13"
              unit="Parameters"
              colorScheme="neutral"
              icon={Layers}
              subtitle="Meteorological & NWP features"
            />
          </>
        )}
      </div>

      {/* Main Interactive MVP Row: Map on Left (55%), 13-Feature Predictor on Right (45%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4" style={{ minHeight: '520px' }}>
        {/* Left: Map Area (7 cols on lg) */}
        <div className="lg:col-span-7 flex flex-col gap-2">
          {/* Map Header with Layer Switcher */}
          <div className="flex items-center justify-between bg-white px-3 py-2 rounded-lg border border-slate-200 shadow-2xs">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-600" />
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                India Reliability & Bust Map
              </span>
              <span className="text-[11px] text-slate-400">
                (Click any state to load features)
              </span>
            </div>

            {/* Layer Toggle */}
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-md border border-slate-200">
              {['Bust Probability', 'Confidence'].map(l => (
                <button
                  key={l}
                  onClick={() => setLayer(l)}
                  className={clsx(
                    'px-2.5 py-1 rounded text-xs font-semibold transition-all cursor-pointer',
                    layer === l
                      ? 'bg-white text-blue-600 shadow-xs border border-slate-200'
                      : 'text-slate-500 hover:text-slate-800'
                  )}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          {/* Leaflet Map with Official Indian Boundary */}
          <div className="relative flex-1 rounded-xl overflow-hidden min-h-[460px]">
            <ForecastMap
              mapData={mapData || []}
              layer={layer}
              onRegionClick={setSelectedRegionId}
              selectedRegion={selectedRegionId}
              className="h-full w-full"
            />
            {/* Floating Legend */}
            <div className="absolute bottom-4 left-3 z-[400]">
              <ConfidenceLegend mode={layer === 'Confidence' ? 'confidence' : 'bust'} />
            </div>

            {/* Selected State Toast/Pill */}
            {selectedRegion && (
              <div className="absolute top-3 right-3 z-[400] bg-white/95 backdrop-blur-xs border border-slate-200 shadow-sm px-3 py-1.5 rounded-lg flex items-center gap-2">
                <span className="text-xs text-slate-500 font-medium">Selected State:</span>
                <span className="text-xs font-bold text-blue-700">{selectedRegion.name}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 font-mono font-semibold">
                  {selectedRegion.code}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Right: 13-Feature AI Predictor Panel (5 cols on lg) */}
        <div className="lg:col-span-5 flex flex-col min-h-[460px]">
          <MvpFeaturePredictor
            selectedRegionData={selectedRegion}
            selectedDay={selectedDay}
          />
        </div>
      </div>

      {/* 13 Features Reference Guide (Table explaining what our MVP uses) */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Info size={16} className="text-blue-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              The 13 Meteorological & Forecast Features Fueling the Model
            </h3>
          </div>
          <span className="text-xs text-slate-500">
            Official NCMRWF parameters ingested into FastAPI inference engine
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {FEATURE_INFO.map((item, idx) => (
            <div
              key={item.key}
              className="p-2.5 rounded-lg border border-slate-100 bg-slate-50/60 flex items-start gap-2.5"
            >
              <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-mono text-[10px] font-bold flex-shrink-0 mt-0.5">
                {idx + 1}
              </div>
              <div className="min-w-0">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xs font-semibold text-slate-800">{item.label}</span>
                  <span className="text-[10px] font-mono text-slate-400">({item.unit})</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                  {item.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
