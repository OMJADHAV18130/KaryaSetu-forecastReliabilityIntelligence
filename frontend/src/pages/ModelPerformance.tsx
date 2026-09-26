import { useModelPerformance, useGlobalExplanation } from '../hooks';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function ModelPerformance() {
  const { data: performance, isLoading } = useModelPerformance();
  const { data: globalExpl } = useGlobalExplanation();

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="h-64 bg-surface-800 rounded-lg border border-surface-700 flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-slate-400">Loading performance data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!performance) return null;

  const metrics = [
    { label: 'ROC-AUC', value: performance.roc_auc, color: 'text-blue-400' },
    { label: 'PR-AUC', value: performance.pr_auc, color: 'text-purple-400' },
    { label: 'MCC', value: performance.mcc, color: 'text-cyan-400' },
    { label: 'Accuracy', value: performance.accuracy, color: 'text-green-400' },
  ];

  const shapData = globalExpl?.features.map((f) => ({
    feature: f.feature,
    importance: Math.abs(f.shap_value),
  })) || [];

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-1">MODEL PERFORMANCE</h1>
        <p className="text-sm text-slate-400">{performance.model_type}</p>
      </div>

      {/* Model Info */}
      <div className="bg-surface-800 p-4 rounded-lg border border-surface-700 mb-6">
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-xs text-slate-400">Model</p>
            <p className="text-white font-medium">{performance.model_name}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Test Period</p>
            <p className="text-white font-medium">{performance.test_period}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Model Version</p>
            <p className="text-white font-medium">{performance.model_version}</p>
          </div>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {metrics.map((m) => (
          <div key={m.label} className="bg-surface-800 p-4 rounded-lg border border-surface-700">
            <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">{m.label}</p>
            <p className={`text-3xl font-bold ${m.color}`}>{m.value.toFixed(3)}</p>
          </div>
        ))}
      </div>

      {/* Brier Score */}
      <div className="bg-surface-800 p-4 rounded-lg border border-surface-700 mb-6">
        <p className="text-xs text-slate-400 uppercase tracking-wider mb-3">Brier Score (Calibration)</p>
        <div className="flex items-center gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-red-400">{performance.brier_raw.toFixed(4)}</p>
            <p className="text-xs text-slate-400">Before Calibration</p>
          </div>
          <div className="text-2xl text-slate-400">→</div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-400">{performance.brier_calibrated.toFixed(4)}</p>
            <p className="text-xs text-slate-400">After Calibration</p>
          </div>
          <div className="ml-auto">
            <p className="text-sm text-green-400">
              Improvement: {((1 - performance.brier_calibrated / performance.brier_raw) * 100).toFixed(1)}%
            </p>
          </div>
        </div>
      </div>

      {/* Confusion Matrix */}
      {performance.confusion_matrix && (
        <div className="bg-surface-800 p-4 rounded-lg border border-surface-700 mb-6">
          <p className="text-xs text-slate-400 uppercase tracking-wider mb-3">Confusion Matrix</p>
          <div className="grid grid-cols-2 gap-2 max-w-xs">
            <div className="bg-green-500/10 p-3 rounded text-center">
              <p className="text-xs text-slate-400">True Negative</p>
              <p className="text-xl font-bold text-green-400">{performance.confusion_matrix.true_negatives.toLocaleString()}</p>
            </div>
            <div className="bg-red-500/10 p-3 rounded text-center">
              <p className="text-xs text-slate-400">False Positive</p>
              <p className="text-xl font-bold text-red-400">{performance.confusion_matrix.false_positives.toLocaleString()}</p>
            </div>
            <div className="bg-orange-500/10 p-3 rounded text-center">
              <p className="text-xs text-slate-400">False Negative</p>
              <p className="text-xl font-bold text-orange-400">{performance.confusion_matrix.false_negatives.toLocaleString()}</p>
            </div>
            <div className="bg-blue-500/10 p-3 rounded text-center">
              <p className="text-xs text-slate-400">True Positive</p>
              <p className="text-xl font-bold text-blue-400">{performance.confusion_matrix.true_positives.toLocaleString()}</p>
            </div>
          </div>
        </div>
      )}

      {/* SHAP Feature Importance */}
      {shapData.length > 0 && (
        <div className="bg-surface-800 p-4 rounded-lg border border-surface-700 mb-6">
          <p className="text-xs text-slate-400 uppercase tracking-wider mb-3">SHAP Feature Importance</p>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={shapData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis type="number" stroke="#94a3b8" fontSize={12} />
              <YAxis type="category" dataKey="feature" stroke="#94a3b8" fontSize={11} width={180} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}
                labelStyle={{ color: '#e2e8f0' }}
              />
              <Bar dataKey="importance" fill="#3b82f6">
                {shapData.map((_, idx) => (
                  <Cell key={idx} fill={idx < 3 ? '#ef4444' : idx < 6 ? '#f59e0b' : '#3b82f6'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Disclaimer */}
      <div className="bg-yellow-500/10 border border-yellow-500/30 p-4 rounded-lg">
        <p className="text-sm text-yellow-400">
          <strong>Scientific Disclaimer:</strong> Research prototype evaluation using the September 2019 test set.
          These are not operational NCMRWF performance statistics. The model demonstrates rainfall forecast bust
          detection using WeatherBench2 HRES and ERA5 research data.
        </p>
      </div>
    </div>
  );
}
