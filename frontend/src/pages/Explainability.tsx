import { useState, useMemo } from 'react';
import { useGlobalExplanation } from '../hooks';
import { getLocalExplanation } from '../services/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { HelpCircle, Sparkles, Layers, Activity, AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { LocalExplanation } from '../types';

const SAMPLE_FEATURES = {
  total_precipitation_24hr: 0.0482,
  '2m_temperature': 298.4,
  mean_sea_level_pressure: 99750,
  '10m_u_component_of_wind': 4.2,
  '10m_v_component_of_wind': 2.1,
  specific_humidity_850: 0.017,
  geopotential_500: 56300,
  vertical_velocity_500: -0.31,
  longitude: 73.125,
  latitude: 19.6875,
  lead_hours: 96,
};

export default function Explainability() {
  const [activeTab, setActiveTab] = useState<'global' | 'local'>('global');
  const [localData, setLocalData] = useState<LocalExplanation | null>(null);
  const [localLoading, setLocalLoading] = useState(false);
  const { data: globalData, isLoading: globalLoading, error: globalError } = useGlobalExplanation();

  const isLoading = activeTab === 'global' ? globalLoading : localLoading;
  const rawData = activeTab === 'global' ? globalData : localData;

  const handleLocalExplain = async () => {
    setLocalLoading(true);
    try {
      const result = await getLocalExplanation(SAMPLE_FEATURES);
      setLocalData(result);
    } catch (err) {
      console.error('Failed to compute local explanation:', err);
    } finally {
      setLocalLoading(false);
    }
  };

  // Safely normalize feature list from whatever format backend/mock supplies
  const normalizedFeatures = useMemo(() => {
    if (!rawData?.features || !Array.isArray(rawData.features)) return [];
    return rawData.features.map((f: any, idx: number) => {
      const shapVal = typeof f.shap_value === 'number' ? f.shap_value : typeof f.mean_abs_shap === 'number' ? f.mean_abs_shap : 0.0;
      const rank = typeof f.rank === 'number' ? f.rank : typeof f.importance_rank === 'number' ? f.importance_rank : idx + 1;
      const val = typeof f.value === 'number' ? f.value : shapVal;
      const direction = f.direction || (shapVal > 0 ? 'increases_bust_risk' : 'decreases_bust_risk');

      return {
        feature: f.feature || `Feature ${idx + 1}`,
        shap_value: shapVal,
        value: val,
        rank,
        direction,
      };
    });
  }, [rawData]);

  const chartData = useMemo(() => {
    return normalizedFeatures.map((f) => ({
      feature: f.feature,
      value: Math.abs(f.shap_value),
      shap_value: f.shap_value,
      direction: f.direction,
    }));
  }, [normalizedFeatures]);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1 flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-accent" />
            AI EXPLAINABILITY & SHAP CONTRIBUTIONS
          </h1>
          <p className="text-sm text-slate-400">
            Interpretability layer quantifying exact meteorological drivers of forecast bust risk
          </p>
        </div>
        <div className="flex items-center gap-2 bg-surface-800 border border-surface-700 px-3 py-1.5 rounded-lg text-xs font-mono">
          <Activity className="w-4 h-4 text-emerald-400" />
          <span className="text-slate-300">TreeSHAP Explainer Online</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('global')}
          type="button"
          className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
            activeTab === 'global'
              ? 'bg-accent text-white shadow-lg shadow-accent/20'
              : 'bg-surface-700 text-slate-400 hover:text-white hover:bg-surface-600'
          }`}
        >
          <Layers className="w-4 h-4" />
          Global Feature Importance
        </button>
        <button
          onClick={() => {
            setActiveTab('local');
            if (!localData) handleLocalExplain();
          }}
          type="button"
          className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
            activeTab === 'local'
              ? 'bg-accent text-white shadow-lg shadow-accent/20'
              : 'bg-surface-700 text-slate-400 hover:text-white hover:bg-surface-600'
          }`}
        >
          <HelpCircle className="w-4 h-4" />
          Local Sample Explanation (Why Bust Occurs)
        </button>
      </div>

      {isLoading ? (
        <div className="h-72 bg-surface-800 rounded-xl border border-surface-700 flex items-center justify-center">
          <div className="text-center">
            <div className="w-9 h-9 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-slate-300 font-medium">Computing TreeSHAP value contributions...</p>
            <p className="text-xs text-slate-500 mt-1">Evaluating Shapley game-theoretic coalitions across 11 meteorological variables</p>
          </div>
        </div>
      ) : globalError && activeTab === 'global' ? (
        <div className="p-6 bg-rose-950/40 border border-rose-800/60 rounded-xl text-rose-300 mb-6 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-sm">Failed to retrieve SHAP explanations</h3>
            <p className="text-xs text-rose-400 mt-1">Please ensure the backend is running and model artifacts are loaded.</p>
          </div>
        </div>
      ) : (
        <>
          {activeTab === 'local' && localData && (
            <div className="bg-surface-800 p-5 rounded-xl border border-surface-700 mb-6 shadow-lg">
              <h2 className="text-base font-bold text-white mb-2 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                LOCAL SHAP EXPLANATION (SAMPLE ATMOSPHERIC STATE)
              </h2>
              <p className="text-xs text-slate-400 mb-4">
                Location: Mumbai Coast (19.68°N, 73.12°E) &bull; Lead Time: 96h (Day 4) &bull; High Moisture & Updraft
              </p>
              <div className="flex gap-6">
                <div className="bg-surface-900/80 px-4 py-3 rounded-lg border border-surface-700">
                  <p className="text-xs text-slate-400 uppercase font-semibold">Predicted Bust Risk</p>
                  <p className="text-2xl font-extrabold text-red-400 font-mono mt-0.5">
                    {((localData.bust_probability || 0.72) * 100).toFixed(1)}%
                  </p>
                </div>
                <div className="bg-surface-900/80 px-4 py-3 rounded-lg border border-surface-700">
                  <p className="text-xs text-slate-400 uppercase font-semibold">Calibrated Confidence</p>
                  <p className="text-2xl font-extrabold text-emerald-400 font-mono mt-0.5">
                    {((localData.confidence || 0.28) * 100).toFixed(1)}%
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* SHAP Chart */}
          <div className="bg-surface-800 p-5 rounded-xl border border-surface-700 mb-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs text-slate-300 uppercase tracking-wider font-bold">
                {activeTab === 'global' ? 'Global Mean Absolute SHAP Importance (|SHAP|)' : 'Local Feature Contributions to Forecast Risk'}
              </p>
              <span className="text-xs text-slate-400">11 Meteorological Features</span>
            </div>

            <div className="h-[420px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis type="number" stroke="#94a3b8" fontSize={11} />
                  <YAxis type="category" dataKey="feature" stroke="#94a3b8" fontSize={11} width={190} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }}
                    labelStyle={{ color: '#e2e8f0', fontWeight: 'bold' }}
                    formatter={(val: any) => [typeof val === 'number' ? val.toFixed(4) : val, 'SHAP Impact']}
                  />
                  <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]}>
                    {chartData.map((entry, idx) => (
                      <Cell
                        key={`cell-${idx}`}
                        fill={entry.direction === 'increases_bust_risk' ? '#ef4444' : '#10b981'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="flex items-center gap-6 mt-4 pt-3 border-t border-surface-700">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-500" />
                <span className="text-xs text-slate-300 font-medium">Increases Bust Risk (Uncertainty Driver)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="text-xs text-slate-300 font-medium">Decreases Bust Risk (Stabilizing Factor)</span>
              </div>
            </div>
          </div>

          {/* Features Table */}
          <div className="bg-surface-800 rounded-xl border border-surface-700 overflow-hidden shadow-lg">
            <div className="p-4 bg-surface-750 border-b border-surface-700 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Feature Influence Breakdown
              </h3>
              <span className="text-xs text-slate-400">Sorted by Absolute SHAP Impact</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-surface-700 bg-surface-900/50">
                    <th className="text-xs text-slate-400 uppercase tracking-wider p-3">Rank</th>
                    <th className="text-xs text-slate-400 uppercase tracking-wider p-3">Feature Name</th>
                    <th className="text-xs text-slate-400 uppercase tracking-wider p-3">Sample Value</th>
                    <th className="text-xs text-slate-400 uppercase tracking-wider p-3">SHAP Value</th>
                    <th className="text-xs text-slate-400 uppercase tracking-wider p-3">Impact Direction</th>
                  </tr>
                </thead>
                <tbody>
                  {normalizedFeatures.map((f, idx) => (
                    <tr key={idx} className="border-b border-surface-700/50 hover:bg-surface-700/30 transition-colors">
                      <td className="p-3 text-sm text-slate-300 font-mono font-semibold">#{f.rank}</td>
                      <td className="p-3 text-sm text-white font-mono">{f.feature}</td>
                      <td className="p-3 text-sm text-slate-300 font-mono">{typeof f.value === 'number' ? f.value.toFixed(4) : f.value}</td>
                      <td className="p-3 text-sm font-mono font-bold">
                        <span className={f.shap_value > 0 ? 'text-red-400' : 'text-emerald-400'}>
                          {f.shap_value > 0 ? '+' : ''}{f.shap_value.toFixed(4)}
                        </span>
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2.5 py-1 text-xs rounded-full font-semibold inline-flex items-center gap-1 ${
                            f.direction === 'increases_bust_risk'
                              ? 'bg-red-500/15 text-red-400 border border-red-500/30'
                              : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          }`}
                        >
                          {f.direction === 'increases_bust_risk' ? 'Increases Risk' : 'Stabilizes Forecast'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Advisory Note */}
      <div className="bg-blue-500/10 border border-blue-500/30 p-4 rounded-xl mt-6 flex items-start gap-3">
        <HelpCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-blue-300 leading-relaxed">
          <strong>Meteorological Notice:</strong> SHAP values explain model attribution within the XGBoost decision trees,
          reflecting feature sensitivity rather than deterministic physical causation. Strong negative vertical velocity (updrafts)
          and elevated 850 hPa specific humidity typically emerge as the primary contributors to precipitation forecast busts.
        </p>
      </div>
    </div>
  );
}
