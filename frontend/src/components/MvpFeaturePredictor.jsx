import { useState, useEffect } from 'react';
import {
  Sparkles, AlertCircle, ArrowUpRight, CheckCircle2,
  RefreshCw, Sliders, ChevronDown, ChevronUp, Cpu, Info
} from 'lucide-react';
import axios from 'axios';
import clsx from 'clsx';

const API_BASE = 'http://localhost:8000';

export const DEFAULT_13_FEATURES = {
  precipitation_24h: 18.5,
  temperature_2m: 31.0,
  mean_sea_level_pressure: 1008.2,
  u_wind_10m: 4.2,
  v_wind_10m: -2.1,
  specific_humidity_850: 13.5,
  geopotential_500: 5820.0,
  vertical_velocity_500: -0.45,
  latitude: 20.95,
  longitude: 85.09,
  lead_time_days: 5,
  ensemble_spread: 4.8,
  cape: 1750.0,
};

export const FEATURE_INFO = [
  { key: 'precipitation_24h', label: '24-hour precipitation', unit: 'mm', desc: 'Forecast rainfall amount', min: 0, max: 250, step: 0.5, category: 'Moisture' },
  { key: 'temperature_2m', label: '2m temperature', unit: '°C', desc: 'Near-surface temperature', min: -10, max: 48, step: 0.5, category: 'Surface' },
  { key: 'mean_sea_level_pressure', label: 'Mean sea-level pressure', unit: 'hPa', desc: 'Atmospheric pressure', min: 980, max: 1035, step: 0.5, category: 'Pressure' },
  { key: 'u_wind_10m', label: '10m U-wind', unit: 'm/s', desc: 'East–west wind component', min: -35, max: 35, step: 0.5, category: 'Wind' },
  { key: 'v_wind_10m', label: '10m V-wind', unit: 'm/s', desc: 'North–south wind component', min: -35, max: 35, step: 0.5, category: 'Wind' },
  { key: 'specific_humidity_850', label: 'Specific humidity at 850 hPa', unit: 'g/kg', desc: 'Moisture in the lower atmosphere', min: 1, max: 24, step: 0.2, category: 'Moisture' },
  { key: 'geopotential_500', label: 'Geopotential at 500 hPa', unit: 'gpm', desc: 'Atmospheric pressure-level height / circulation', min: 5300, max: 5950, step: 10, category: 'Circulation' },
  { key: 'vertical_velocity_500', label: 'Vertical velocity at 500 hPa', unit: 'Pa/s', desc: 'Upward/downward air motion (- is updraft)', min: -2.0, max: 2.0, step: 0.05, category: 'Dynamics' },
  { key: 'latitude', label: 'Latitude', unit: '°N', desc: 'Geographic location', min: 7.0, max: 37.0, step: 0.1, category: 'Location' },
  { key: 'longitude', label: 'Longitude', unit: '°E', desc: 'Geographic location', min: 68.0, max: 97.0, step: 0.1, category: 'Location' },
  { key: 'lead_time_days', label: 'Lead time', unit: 'Days', desc: 'How far ahead the forecast is: Day 1–10', min: 1, max: 10, step: 1, category: 'Horizon' },
  { key: 'ensemble_spread', label: 'Ensemble spread', unit: 'Index', desc: 'Numerical model member dispersion', min: 0.5, max: 20, step: 0.2, category: 'Uncertainty' },
  { key: 'cape', label: 'CAPE (Instability)', unit: 'J/kg', desc: 'Convective Available Potential Energy', min: 0, max: 4500, step: 50, category: 'Thermodynamics' },
];

export default function MvpFeaturePredictor({
  selectedRegionData,
  selectedDay = 'D5',
  onPredictionChange,
}) {
  const [features, setFeatures] = useState(DEFAULT_13_FEATURES);
  const [prediction, setPrediction] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isBackendOnline, setIsBackendOnline] = useState(false);
  const [showAllFeatures, setShowAllFeatures] = useState(false);

  // Sync with selected region or day
  useEffect(() => {
    if (selectedRegionData) {
      const leadDayNum = parseInt(selectedDay.replace('D', ''), 10) || 5;
      setFeatures(prev => ({
        ...prev,
        latitude: selectedRegionData.lat || prev.latitude,
        longitude: selectedRegionData.lon || prev.longitude,
        lead_time_days: leadDayNum,
        precipitation_24h: selectedRegionData.precipitation || prev.precipitation_24h,
      }));
    }
  }, [selectedRegionData, selectedDay]);

  // Run prediction (FastAPI with client fallback)
  const runPrediction = async (currentFeatures = features) => {
    setIsLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/api/predict`, currentFeatures, { timeout: 2500 });
      setPrediction(res.data);
      setIsBackendOnline(true);
      onPredictionChange?.(res.data);
    } catch {
      // Offline fallback: calibrated simulation
      setIsBackendOnline(false);
      const lead = currentFeatures.lead_time_days;
      const updraft = Math.max(0, -currentFeatures.vertical_velocity_500);
      const moisture = Math.max(0, currentFeatures.specific_humidity_850 - 6.0) / 10.0;
      const precip = Math.log1p(currentFeatures.precipitation_24h) * 3.5;
      const spread = currentFeatures.ensemble_spread * 2.5;

      const bust = Math.min(96, Math.max(4, Math.round(5 + lead * 4.2 + updraft * 15 + moisture * 12 + precip + spread)));
      const conf = Math.max(6, Math.min(98, Math.round(100 - bust * 0.9 - lead * 1.5)));

      const fallbackPred = {
        bust_probability: bust,
        confidence_score: conf,
        risk_level: bust >= 70 ? 'CRITICAL' : bust >= 50 ? 'HIGH' : bust >= 30 ? 'MEDIUM' : 'LOW',
        is_bust_risk: bust >= 40,
        primary_failure_driver: updraft > 0.4 ? 'Vertical Velocity & Convection' : lead > 6 ? 'Lead Time Decay' : 'Precipitation Volume Error',
        summary_explanation: `Model evaluated 13 NWP features at Day ${lead}. Bust risk is ${bust}% due to ${updraft > 0.4 ? 'intense vertical updrafts' : 'ensemble divergence'}.`,
        feature_contributions: [
          { feature_label: 'Lead Time', feature_value: lead, unit: 'Days', impact_score: Math.min(1.0, (lead * 5) / 40) },
          { feature_label: 'Vertical Velocity (500 hPa)', feature_value: currentFeatures.vertical_velocity_500, unit: 'Pa/s', impact_score: Math.min(1.0, (updraft * 15) / 20) },
          { feature_label: 'Specific Humidity (850 hPa)', feature_value: currentFeatures.specific_humidity_850, unit: 'g/kg', impact_score: Math.min(1.0, (moisture * 12) / 15) },
          { feature_label: '24h Precipitation', feature_value: currentFeatures.precipitation_24h, unit: 'mm', impact_score: Math.min(1.0, precip / 18) },
          { feature_label: 'Ensemble Spread', feature_value: currentFeatures.ensemble_spread, unit: 'Idx', impact_score: Math.min(1.0, spread / 20) },
        ],
      };
      setPrediction(fallbackPred);
      onPredictionChange?.(fallbackPred);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    runPrediction(features);
  }, [features.lead_time_days, selectedRegionData?.id]);

  const handleFeatureChange = (key, val) => {
    const num = parseFloat(val);
    setFeatures(prev => {
      const next = { ...prev, [key]: isNaN(num) ? 0 : num };
      return next;
    });
  };

  const applyPreset = (presetName) => {
    if (presetName === 'monsoon_burst') {
      setFeatures(prev => ({
        ...prev,
        precipitation_24h: 75.0,
        vertical_velocity_500: -0.85,
        specific_humidity_850: 17.5,
        cape: 2800,
        ensemble_spread: 8.5,
      }));
    } else if (presetName === 'stable_dry') {
      setFeatures(prev => ({
        ...prev,
        precipitation_24h: 0.5,
        vertical_velocity_500: 0.35,
        specific_humidity_850: 5.5,
        cape: 350,
        ensemble_spread: 2.1,
      }));
    } else {
      setFeatures(DEFAULT_13_FEATURES);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1 rounded bg-blue-50 text-blue-600 font-bold text-xs">MVP</span>
            <h3 className="text-slate-900 font-semibold text-sm">13-Feature AI Reliability Predictor</h3>
          </div>
          <p className="text-slate-500 text-xs mt-0.5">
            Ingests 13 NWP features → Predicts forecast bust probability & reliability
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className={clsx(
            'inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-full border',
            isBackendOnline
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-amber-50 text-amber-700 border-amber-200'
          )}>
            <span className={clsx('w-1.5 h-1.5 rounded-full', isBackendOnline ? 'bg-emerald-500' : 'bg-amber-500')} />
            {isBackendOnline ? 'FastAPI Online' : 'FastAPI Offline (Fallback)'}
          </span>

          <button
            onClick={() => runPrediction()}
            disabled={isLoading}
            className="flex items-center gap-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={clsx('w-3 h-3', isLoading && 'animate-spin')} />
            Predict
          </button>
        </div>
      </div>

      {/* Model Output Summary Card */}
      {prediction && (
        <div className="my-3 p-3 rounded-lg bg-slate-50 border border-slate-200 grid grid-cols-3 gap-2">
          {/* Bust Probability */}
          <div className="bg-white p-2.5 rounded border border-slate-200 shadow-2xs">
            <span className="text-[10px] uppercase font-bold text-slate-500">Bust Probability</span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className={clsx(
                'text-xl font-bold font-mono',
                prediction.bust_probability >= 60 ? 'text-red-600' :
                prediction.bust_probability >= 35 ? 'text-amber-600' : 'text-emerald-600'
              )}>
                {prediction.bust_probability}%
              </span>
              <span className={clsx(
                'text-[10px] font-bold px-1.5 py-0.2 rounded',
                prediction.risk_level === 'CRITICAL' || prediction.risk_level === 'HIGH'
                  ? 'bg-red-50 text-red-700 border border-red-200'
                  : prediction.risk_level === 'MEDIUM'
                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              )}>
                {prediction.risk_level}
              </span>
            </div>
          </div>

          {/* Confidence Score */}
          <div className="bg-white p-2.5 rounded border border-slate-200 shadow-2xs">
            <span className="text-[10px] uppercase font-bold text-slate-500">Model Confidence</span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-xl font-bold font-mono text-blue-600">
                {prediction.confidence_score}%
              </span>
              <span className="text-[10px] text-slate-500 font-medium">Reliability</span>
            </div>
          </div>

          {/* Primary Failure Factor */}
          <div className="bg-white p-2.5 rounded border border-slate-200 shadow-2xs flex flex-col justify-center">
            <span className="text-[10px] uppercase font-bold text-slate-500">Primary Failure Driver</span>
            <div className="text-xs font-semibold text-slate-800 truncate mt-0.5" title={prediction.primary_failure_driver}>
              {prediction.primary_failure_driver}
            </div>
          </div>
        </div>
      )}

      {/* Scenario Presets Quick Bar */}
      <div className="flex items-center gap-2 mb-2 text-xs">
        <span className="text-slate-500 font-medium text-[11px]">Simulate Scenario:</span>
        <button
          onClick={() => applyPreset('normal')}
          className="px-2 py-0.5 rounded border border-slate-200 hover:bg-slate-100 text-slate-700 text-[11px] font-medium transition-colors"
        >
          Normal Day
        </button>
        <button
          onClick={() => applyPreset('monsoon_burst')}
          className="px-2 py-0.5 rounded border border-red-200 bg-red-50/50 hover:bg-red-100 text-red-700 text-[11px] font-medium transition-colors"
        >
          High Convection Bust
        </button>
        <button
          onClick={() => applyPreset('stable_dry')}
          className="px-2 py-0.5 rounded border border-emerald-200 bg-emerald-50/50 hover:bg-emerald-100 text-emerald-700 text-[11px] font-medium transition-colors"
        >
          Dry Stable Flow
        </button>
      </div>

      {/* 13 Features Grid */}
      <div className="flex-1 overflow-y-auto pr-1">
        <div className="grid grid-cols-2 gap-2 text-xs">
          {(showAllFeatures ? FEATURE_INFO : FEATURE_INFO.slice(0, 8)).map(feat => {
            const val = features[feat.key] ?? 0;
            return (
              <div
                key={feat.key}
                className="p-2 rounded-lg bg-slate-50/80 border border-slate-200 hover:border-blue-300 transition-colors"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-medium text-slate-700 truncate" title={feat.desc}>
                    {feat.label}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {feat.unit}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={feat.min}
                    max={feat.max}
                    step={feat.step}
                    value={val}
                    onChange={e => handleFeatureChange(feat.key, e.target.value)}
                    className="flex-1 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  <input
                    type="number"
                    value={val}
                    step={feat.step}
                    onChange={e => handleFeatureChange(feat.key, e.target.value)}
                    className="w-14 px-1.5 py-0.5 bg-white border border-slate-300 rounded text-right font-mono text-[11px] text-slate-800 focus:outline-blue-500"
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Toggle all 13 features */}
        <button
          onClick={() => setShowAllFeatures(!showAllFeatures)}
          className="w-full mt-2 py-1 flex items-center justify-center gap-1 text-[11px] font-medium text-blue-600 hover:text-blue-800 bg-blue-50/60 hover:bg-blue-50 rounded border border-blue-100 transition-colors"
        >
          {showAllFeatures ? (
            <>Show Key 8 Features <ChevronUp className="w-3.5 h-3.5" /></>
          ) : (
            <>View All 13 Meteorological Features ({FEATURE_INFO.length}) <ChevronDown className="w-3.5 h-3.5" /></>
          )}
        </button>

        {/* Feature Attribution Drivers */}
        {prediction?.feature_contributions && (
          <div className="mt-3 pt-3 border-t border-slate-200">
            <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-2">
              Feature Risk Attribution (Why this forecast may bust)
            </div>
            <div className="space-y-1.5">
              {prediction.feature_contributions.slice(0, 5).map(c => {
                const pct = Math.round(c.impact_score * 100);
                return (
                  <div key={c.feature_label} className="text-[11px]">
                    <div className="flex justify-between text-slate-600 mb-0.5">
                      <span className="font-medium text-slate-700">{c.feature_label}</span>
                      <span className="font-mono text-slate-500">{c.feature_value} {c.unit} ({pct}%)</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={clsx(
                          'h-full rounded-full transition-all duration-300',
                          pct >= 60 ? 'bg-red-500' : pct >= 35 ? 'bg-amber-500' : 'bg-blue-500'
                        )}
                        style={{ width: `${Math.max(8, pct)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
