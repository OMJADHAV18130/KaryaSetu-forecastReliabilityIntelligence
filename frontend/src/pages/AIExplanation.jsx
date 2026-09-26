import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BrainCircuit, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import ExplanationPanel from '../components/ExplanationPanel';
import { useExplanation } from '../hooks/useForecast';
import { INDIAN_REGIONS } from '../data/mockRegions';
import { LoadingState } from '../components/LoadingState';
import clsx from 'clsx';

const DAYS = ['D1','D2','D3','D4','D5','D6','D7','D8','D9','D10'];
const REGION_OPTS = INDIAN_REGIONS.map(r => ({ value: r.id, label: r.name }));

const EVIDENCE_TYPES = {
  ENSEMBLE_METRIC:     { label: 'Ensemble Metric',     color: 'bg-risk-high/15 text-risk-high' },
  HISTORICAL_ANALOG:   { label: 'Historical Analog',   color: 'bg-amber-500/15 text-amber-400' },
  PATTERN_METRIC:      { label: 'Pattern Metric',       color: 'bg-accent-blue/15 text-accent-blue' },
  CLIMATOLOGICAL_STAT: { label: 'Climatological Stat', color: 'bg-accent-cyan/15 text-accent-cyan' },
};

export default function AIExplanation() {
  const [searchParams] = useSearchParams();
  const [regionId, setRegionId] = useState(searchParams.get('region') || 'maharashtra');
  const [day, setDay] = useState(searchParams.get('day') || 'D5');

  const { data: explanation, isLoading } = useExplanation(regionId, day);

  function getReliabilityConfig(rel) {
    if (rel === 'LOW')      return { icon: AlertTriangle, color: 'text-risk-high', bg: 'bg-risk-high/10 border-risk-high/30' };
    if (rel === 'MODERATE') return { icon: Info, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30' };
    return { icon: CheckCircle, color: 'text-confidence-very-high', bg: 'bg-confidence-very-high/10 border-confidence-very-high/30' };
  }

  const relConfig = explanation ? getReliabilityConfig(explanation.reliability) : null;
  const RelIcon = relConfig?.icon || Info;

  return (
    <div className="flex flex-col gap-4 animate-fade-in max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <BrainCircuit className="text-accent-cyan" size={18} />
            <h1 className="text-white font-bold text-xl">AI Reliability Explanation</h1>
          </div>
          <p className="text-slate-400 text-sm">
            Signals are grounded in measurable model features and historical evidence. No LLM-generated causes.
          </p>
        </div>
      </div>

      {/* Selectors */}
      <div className="card flex gap-6">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-slate-500 uppercase tracking-wider">Region</label>
          <select
            value={regionId}
            onChange={e => setRegionId(e.target.value)}
            className="bg-navy-600 border border-border text-slate-200 text-sm rounded-md px-3 py-1.5 focus:outline-none focus:border-accent-cyan"
          >
            {REGION_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-slate-500 uppercase tracking-wider">Forecast Day</label>
          <div className="flex gap-1">
            {DAYS.map(d => (
              <button
                key={d}
                onClick={() => setDay(d)}
                className={clsx(
                  'px-2.5 py-1.5 rounded text-xs font-mono font-semibold transition-colors border',
                  day === d
                    ? 'bg-accent-cyan/20 text-accent-cyan border-accent-cyan/40'
                    : 'text-slate-400 border-border hover:text-white'
                )}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
      </div>

      {isLoading ? (
        <LoadingState rows={6} />
      ) : explanation ? (
        <>
          {/* Risk status banner */}
          <div className={clsx('card border flex items-center gap-4', relConfig?.bg)}>
            <div className={clsx('w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0', `bg-current/10`)}>
              <RelIcon className={relConfig?.color} size={20} />
            </div>
            <div className="flex-1">
              <p className="text-slate-400 text-xs uppercase tracking-wider">{explanation.variable} Forecast</p>
              <p className={clsx('font-bold text-lg', relConfig?.color)}>
                {explanation.reliability} CONFIDENCE
              </p>
              <p className="text-slate-400 text-xs mt-0.5">
                The {day} {explanation.variable} forecast for {explanation.region} shows elevated bust probability.
              </p>
            </div>
            <div className="flex gap-6 text-center">
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider">Bust Probability</p>
                <p className="text-risk-high font-bold font-mono text-2xl">{explanation.bustProbability}%</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider">Confidence</p>
                <p className="text-confidence-very-high font-bold font-mono text-2xl">{explanation.confidence}%</p>
              </div>
            </div>
          </div>

          {/* Contributing signals */}
          <div className="card">
            <p className="section-title">Main Contributing Signals</p>
            <ol className="space-y-4">
              {explanation.signals.map(signal => {
                const ev = EVIDENCE_TYPES[signal.evidenceType];
                return (
                  <li key={signal.id} className="flex gap-4">
                    <span className="text-accent-cyan font-mono font-bold text-lg w-8 flex-shrink-0">
                      {String(signal.rank).padStart(2,'0')}
                    </span>
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className="text-white font-medium text-sm">{signal.label}</p>
                        {ev && (
                          <span className={clsx('text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase tracking-wider flex-shrink-0', ev.color)}>
                            {ev.label}
                          </span>
                        )}
                      </div>
                      <p className="text-slate-400 text-xs leading-relaxed">{signal.detail}</p>
                      <div className="mt-2 flex items-center gap-2">
                        <div className="h-1 flex-1 bg-navy-600 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-accent-cyan to-accent-blue"
                            style={{ width: `${signal.contribution}%` }}
                          />
                        </div>
                        <span className="text-xs font-mono text-white font-bold w-10 text-right">
                          {signal.contribution}%
                        </span>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>

          {/* Feature importance chart */}
          <div className="card">
            <ExplanationPanel
              signals={explanation.signals}
              title="Feature Contribution Bars"
            />
          </div>

          {/* Historical evidence */}
          {explanation.historicalEvidence?.length > 0 && (
            <div className="card">
              <p className="section-title">Historical Evidence</p>
              <div className="space-y-2">
                {explanation.historicalEvidence.map((ev, i) => (
                  <div key={i} className="bg-navy-700 rounded-md p-3 flex items-center justify-between">
                    <div>
                      <p className="text-white text-sm font-medium">{ev.event}</p>
                      <p className="text-slate-400 text-xs">{ev.day} · Similar synoptic pattern</p>
                    </div>
                    <div className="flex gap-6 text-center text-xs">
                      <div>
                        <p className="text-slate-500">Forecast Error</p>
                        <p className="text-risk-high font-mono font-bold">{ev.forecastError}%</p>
                      </div>
                      <div>
                        <p className="text-slate-500">AI Risk</p>
                        <p className="text-amber-400 font-mono font-bold">{ev.aiRisk}%</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <p className="text-[11px] text-slate-500 text-center">
            [DEMO DATA] Explanations are derived from predefined signal logic and mock feature values — not live model outputs.
          </p>
        </>
      ) : null}
    </div>
  );
}
