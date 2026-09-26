import { X, Map, BrainCircuit, Clock, AlertTriangle, TrendingDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import StatusBadge from './StatusBadge';
import clsx from 'clsx';

export default function RegionDrawer({ region, day, onClose }) {
  const navigate = useNavigate();

  if (!region) return null;

  const dayData = region.days?.[day] || {};
  const {
    bustProbability = 0,
    confidence = 100,
    severity = 'LOW',
    ensembleSpread = 0,
    historicalError = 0,
    patternSimilarity = 0,
    leadTimeEffect = 0,
  } = dayData;

  const factors = [
    { label: 'Ensemble Spread',  value: ensembleSpread,    color: 'bg-red-500'    },
    { label: 'Historical Error', value: historicalError,   color: 'bg-amber-500'  },
    { label: 'Pattern Similarity', value: patternSimilarity, color: 'bg-blue-500' },
    { label: 'Lead Time Effect', value: leadTimeEffect,    color: 'bg-sky-500'    },
  ];

  const signals = [
    bustProbability > 70 ? 'High ensemble disagreement in the NWP suite' : 'Moderate ensemble disagreement detected',
    'Similar historical patterns produced larger-than-normal displacement errors',
    patternSimilarity > 65 ? 'Rapid change in predicted precipitation pattern' : 'Normal pattern evolution rate',
    `Forecast error historically increases at ${day}`,
  ];

  return (
    <div className="fixed right-0 top-14 bottom-0 w-80 bg-white border-l border-slate-200 z-30 flex flex-col animate-slide-in-right overflow-y-auto shadow-xl">
      {/* Header */}
      <div className="flex items-start justify-between p-4 border-b border-slate-200">
        <div>
          <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold mb-0.5">Region Detail</p>
          <h2 className="text-slate-900 font-bold text-lg leading-tight">{region.name}</h2>
          <p className="text-slate-500 text-xs mt-0.5">{day} • {dayData.variable || 'Precipitation'}</p>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-700 transition-colors p-1 cursor-pointer">
          <X size={18} />
        </button>
      </div>

      {/* Risk summary */}
      <div className="p-4 border-b border-slate-200">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-slate-500">Forecast Reliability</span>
          <StatusBadge status={severity === 'HIGH' ? 'HIGH' : severity === 'MEDIUM' ? 'MEDIUM' : 'LOW'} size="sm" />
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <Metric label="Bust Probability" value={`${bustProbability}%`} danger={bustProbability >= 65} />
          <Metric label="Confidence" value={`${confidence}%`} success={confidence >= 60} />
          <Metric label="Lead Time" value={day} />
          <Metric label="Severity" value={severity} />
        </div>
      </div>

      {/* Failure factors */}
      <div className="p-4 border-b border-slate-200">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Failure Factor Weights</h3>
        <div className="space-y-3">
          {factors.map(f => (
            <div key={f.label}>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-600 font-medium">{f.label}</span>
                <span className="font-mono text-slate-800 font-semibold">{f.value}%</span>
              </div>
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={clsx('h-full rounded-full transition-all duration-300', f.color)}
                  style={{ width: `${f.value}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Operational signals */}
      <div className="p-4 border-b border-slate-200">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Failure Risk Signals</h3>
        <ul className="space-y-2 text-xs text-slate-600">
          {signals.map((s, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-1.5 flex-shrink-0" />
              <span>{s}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Actions */}
      <div className="p-4 mt-auto space-y-2">
        <button
          onClick={() => navigate(`/ai-explanation?region=${region.id}&day=${day}`)}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
        >
          <BrainCircuit size={14} />
          View Full AI Explanation
        </button>
        <button
          onClick={() => navigate(`/bust-detection?region=${region.id}`)}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
        >
          <AlertTriangle size={14} />
          Bust Detection Details
        </button>
      </div>
    </div>
  );
}

function Metric({ label, value, danger, success }) {
  return (
    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
      <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">{label}</div>
      <div className={clsx(
        'text-base font-bold font-mono mt-0.5',
        danger ? 'text-red-600' : success ? 'text-emerald-600' : 'text-slate-800'
      )}>
        {value}
      </div>
    </div>
  );
}
