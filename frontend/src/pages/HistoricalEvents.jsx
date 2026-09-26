import { useState } from 'react';
import { Clock } from 'lucide-react';
import HistoricalEventCard from '../components/HistoricalEventCard';
import { useHistoricalEvents } from '../hooks/useForecast';
import { LoadingState } from '../components/LoadingState';
import ReactECharts from 'echarts-for-react';
import clsx from 'clsx';

const EVENT_TYPES = [
  'All', 'Monsoon Depression', 'Cyclone', 'Western Disturbance',
  'Heat Wave', 'Heavy Rainfall', 'Active Monsoon', 'Break Monsoon',
];

export default function HistoricalEvents() {
  const [typeFilter, setTypeFilter] = useState('All');
  const [selectedEvent, setSelectedEvent] = useState(null);

  const { data: events, isLoading } = useHistoricalEvents(typeFilter);

  const errorChartOption = selectedEvent ? {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#1A2235',
      borderColor: '#243047',
      textStyle: { color: '#e2e8f0', fontSize: 12 },
    },
    legend: {
      data: ['Forecast Error', 'AI Bust Risk'],
      textStyle: { color: '#94a3b8', fontSize: 11 },
      top: 4, right: 8,
    },
    grid: { left: 40, right: 16, top: 36, bottom: 28 },
    xAxis: {
      type: 'category',
      data: selectedEvent.errorProgression.map(d => d.day),
      axisLine: { lineStyle: { color: '#243047' } },
      axisLabel: { color: '#64748b', fontSize: 11 },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      max: 100,
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: '#1A2235' } },
      axisLabel: { color: '#64748b', fontSize: 10, formatter: v => `${v}%` },
    },
    series: [
      {
        name: 'Forecast Error',
        type: 'bar',
        data: selectedEvent.errorProgression.map(d => ({
          value: d.forecastError,
          itemStyle: {
            color: d.forecastError >= 50
              ? '#ef4444'
              : d.forecastError >= 30
              ? '#f97316'
              : '#fbbf24',
          },
        })),
        barWidth: '40%',
      },
      {
        name: 'AI Bust Risk',
        type: 'line',
        data: selectedEvent.errorProgression.map(d => d.aiRisk),
        smooth: true,
        lineStyle: { color: '#22d3ee', width: 2 },
        itemStyle: { color: '#22d3ee' },
        symbol: 'circle',
        symbolSize: 6,
        markLine: {
          silent: true,
          data: [
            { xAxis: selectedEvent.aiSignalDay, name: 'AI Signal' },
          ],
          lineStyle: { color: '#fbbf24', type: 'dashed' },
          label: { color: '#fbbf24', fontSize: 10 },
        },
      },
    ],
  } : null;

  return (
    <div className="flex flex-col gap-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Clock className="text-accent-cyan" size={18} />
        <h1 className="text-white font-bold text-xl">Historical Events</h1>
      </div>
      <p className="text-slate-400 text-sm -mt-2">
        Past weather events and AI reliability signal validation
      </p>

      {/* Type filter tabs */}
      <div className="flex flex-wrap gap-2">
        {EVENT_TYPES.map(t => (
          <button
            key={t}
            onClick={() => setTypeFilter(t)}
            className={clsx(
              'px-3 py-1.5 rounded-full text-xs font-medium transition-colors border',
              typeFilter === t
                ? 'bg-accent-cyan/20 text-accent-cyan border-accent-cyan/40'
                : 'text-slate-400 border-border hover:text-white hover:border-slate-500'
            )}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="flex gap-4">
        {/* Cards grid */}
        <div className="flex-1 min-w-0">
          {isLoading ? (
            <div className="grid grid-cols-2 gap-3">
              {Array.from({length:4}).map((_,i) => (
                <div key={i} className="card h-48 skeleton" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {(events || []).map(event => (
                <HistoricalEventCard
                  key={event.id}
                  event={event}
                  onClick={e => setSelectedEvent(e.id === selectedEvent?.id ? null : e)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Detail panel */}
        {selectedEvent && (
          <div className="w-96 flex-shrink-0 space-y-4 animate-slide-in-right">
            <div className="card">
              <h2 className="text-white font-semibold text-base mb-1">{selectedEvent.name}</h2>
              <p className="text-slate-400 text-xs mb-3">{selectedEvent.description}</p>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <InfoPair label="Region" value={selectedEvent.region} />
                <InfoPair label="Variable" value={selectedEvent.variable} />
                <InfoPair label="AI Signal" value={<span className="text-amber-400 font-mono">{selectedEvent.aiSignalDay}</span>} />
                <InfoPair label="Observed" value={<span className="text-risk-high font-mono">{selectedEvent.observedDegradationDay}</span>} />
              </div>

              {/* Error progression chart */}
              {errorChartOption && (
                <ReactECharts
                  option={errorChartOption}
                  style={{ height: '220px' }}
                  opts={{ renderer: 'canvas' }}
                />
              )}

              <div className="mt-3 bg-navy-700 rounded p-2.5 text-xs space-y-1 text-slate-400">
                <div className="flex justify-between">
                  <span>AI predicted high-risk from</span>
                  <span className="text-amber-400 font-mono font-semibold">{selectedEvent.aiSignalDay}</span>
                </div>
                <div className="flex justify-between">
                  <span>Observed forecast degradation from</span>
                  <span className="text-risk-high font-mono font-semibold">{selectedEvent.observedDegradationDay}</span>
                </div>
                <div className="flex justify-between">
                  <span>Prediction accuracy</span>
                  <span className="text-slate-500 italic">After real validation</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <p className="text-[11px] text-slate-500 text-center">
        [DEMO DATA] Historical event data is illustrative. Validation against actual NCMRWF archive is required.
      </p>
    </div>
  );
}

function InfoPair({ label, value }) {
  return (
    <div>
      <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">{label}</p>
      <div className="text-white text-sm font-medium">{value}</div>
    </div>
  );
}
