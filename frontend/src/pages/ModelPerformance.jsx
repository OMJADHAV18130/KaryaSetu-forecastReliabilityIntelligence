import { useState } from 'react';
import { BarChart2, AlertCircle } from 'lucide-react';
import FeatureImportanceChart from '../components/FeatureImportanceChart';
import { useModelPerformance } from '../hooks/useForecast';
import { MOCK_MODEL_PERFORMANCE } from '../data/mockModelPerformance';
import { LoadingState } from '../components/LoadingState';
import ReactECharts from 'echarts-for-react';
import clsx from 'clsx';

const MODELS = MOCK_MODEL_PERFORMANCE.models.map(m => ({ value: m.id, label: m.label }));

export default function ModelPerformance() {
  const [modelId, setModelId] = useState('ensemble');
  const { data: perf, isLoading } = useModelPerformance(modelId);

  const calibrationOption = perf ? {
    backgroundColor: 'transparent',
    tooltip: {
      backgroundColor: '#1A2235',
      borderColor: '#243047',
      textStyle: { color: '#e2e8f0', fontSize: 11 },
      formatter: p => `Predicted: ${p.value[0]}<br/>Observed: ${p.value[1]}`,
    },
    grid: { left: 48, right: 24, top: 16, bottom: 40 },
    xAxis: {
      type: 'value', min: 0, max: 1,
      name: 'Predicted Probability',
      nameLocation: 'middle', nameGap: 28,
      axisLine: { lineStyle: { color: '#243047' } },
      axisLabel: { color: '#64748b', fontSize: 10 },
      splitLine: { lineStyle: { color: '#1A2235' } },
    },
    yAxis: {
      type: 'value', min: 0, max: 1,
      name: 'Observed Frequency',
      nameLocation: 'middle', nameGap: 40,
      axisLine: { lineStyle: { color: '#243047' } },
      axisLabel: { color: '#64748b', fontSize: 10 },
      splitLine: { lineStyle: { color: '#1A2235' } },
    },
    series: [
      {
        type: 'line',
        data: [[0,0],[1,1]],
        lineStyle: { color: '#243047', type: 'dashed', width: 1 },
        symbol: 'none',
        name: 'Perfect calibration',
      },
      {
        type: 'scatter',
        data: perf.calibrationData.map(d => [d.predicted, d.observed]),
        itemStyle: { color: '#22d3ee' },
        symbolSize: 8,
        name: perf.label,
      },
    ],
  } : null;

  function renderMatrix(cm) {
    if (!cm) return null;
    const total = cm.tp + cm.fp + cm.fn + cm.tn;
    const cells = [
      { label: 'True Positive', value: cm.tp, color: 'bg-confidence-very-high/20 border-confidence-very-high/40', text: 'text-confidence-very-high' },
      { label: 'False Positive', value: cm.fp, color: 'bg-amber-500/20 border-amber-500/40', text: 'text-amber-400' },
      { label: 'False Negative', value: cm.fn, color: 'bg-risk-high/20 border-risk-high/40', text: 'text-risk-high' },
      { label: 'True Negative', value: cm.tn, color: 'bg-confidence-very-high/20 border-confidence-very-high/40', text: 'text-confidence-very-high' },
    ];
    return (
      <div className="grid grid-cols-2 gap-2 max-w-xs">
        {cells.map(c => (
          <div key={c.label} className={clsx('border rounded-lg p-3 text-center', c.color)}>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">{c.label}</p>
            <p className={clsx('text-2xl font-bold font-mono', c.text)}>{c.value}</p>
            <p className="text-[10px] text-slate-500">{((c.value / total) * 100).toFixed(1)}%</p>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <BarChart2 className="text-accent-blue" size={18} />
            <h1 className="text-white font-bold text-xl">Model Performance</h1>
          </div>
          <p className="text-slate-400 text-sm">Technical validation metrics · For NCMRWF/SIH evaluators</p>
        </div>

        {/* Model selector */}
        <div className="flex gap-1 bg-navy-700 border border-border rounded-lg p-1">
          {MODELS.map(m => (
            <button
              key={m.value}
              onClick={() => setModelId(m.value)}
              className={clsx(
                'px-3 py-1.5 rounded text-xs font-medium transition-colors',
                modelId === m.value
                  ? 'bg-accent-blue/20 text-accent-blue'
                  : 'text-slate-400 hover:text-white'
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Demo disclaimer */}
      <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 rounded-lg px-4 py-2.5 text-sm text-amber-400">
        <AlertCircle size={14} className="flex-shrink-0" />
        <span>
          All metrics below are <strong>[DEMO PLACEHOLDERS]</strong> — not validated on real NCMRWF data.
          Real values must be inserted after temporal cross-validation on hindcast data.
        </span>
      </div>

      {isLoading ? (
        <LoadingState rows={8} />
      ) : perf ? (
        <div className="space-y-4">
          {/* Model info */}
          <div className="card grid grid-cols-2 md:grid-cols-3 gap-4">
            <Info label="Model" value={perf.label} />
            <Info label="Task" value={perf.task} />
            <Info label="Validation Strategy" value={perf.validationStrategy} />
          </div>

          {/* Metrics grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {Object.values(perf.metrics).map(m => (
              <MetricCard key={m.label} label={m.label} value={m.placeholder} />
            ))}
          </div>

          {/* Feature importance + calibration + confusion matrix */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="card lg:col-span-1">
              <FeatureImportanceChart
                features={perf.featureImportance}
                title="Feature Importance"
              />
            </div>

            <div className="card">
              <p className="section-title">Calibration Plot</p>
              <p className="text-[10px] text-slate-500 mb-2">Predicted probability vs. observed bust frequency</p>
              {calibrationOption && (
                <ReactECharts
                  option={calibrationOption}
                  style={{ height: '220px' }}
                  opts={{ renderer: 'canvas' }}
                />
              )}
            </div>

            <div className="card">
              <p className="section-title">Confusion Matrix</p>
              <p className="text-[10px] text-slate-500 mb-3">At threshold = 0.50</p>
              {renderMatrix(perf.confusionMatrix)}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div>
      <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">{label}</p>
      <p className="text-white text-sm font-medium">{value}</p>
    </div>
  );
}

function MetricCard({ label, value }) {
  return (
    <div className="card text-center">
      <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-accent-cyan font-bold font-mono text-xl">{value}</p>
      <p className="text-[10px] text-amber-500/70 mt-1">[DEMO]</p>
    </div>
  );
}
