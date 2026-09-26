import ReactECharts from 'echarts-for-react';

export default function ForecastComparison({ eventData }) {
  if (!eventData) return null;

  // Lead-time error trend chart
  const errorOption = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#1A2235',
      borderColor: '#243047',
      textStyle: { color: '#e2e8f0', fontSize: 12 },
      formatter: params => {
        return params.map(p => `${p.seriesName}: <b>${p.value}</b>`).join('<br/>');
      },
    },
    legend: {
      data: ['RMSE', 'MAE'],
      textStyle: { color: '#94a3b8', fontSize: 11 },
      top: 4, right: 8,
    },
    grid: { left: 40, right: 16, top: 32, bottom: 24 },
    xAxis: {
      type: 'category',
      data: eventData.errorByDay.map(d => d.day),
      axisLine: { lineStyle: { color: '#243047' } },
      axisLabel: { color: '#64748b', fontSize: 11 },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: '#1A2235' } },
      axisLabel: { color: '#64748b', fontSize: 10 },
    },
    series: [
      {
        name: 'RMSE',
        type: 'line',
        data: eventData.errorByDay.map(d => d.rmse.toFixed(1)),
        smooth: true,
        lineStyle: { color: '#ef4444', width: 2 },
        itemStyle: { color: '#ef4444' },
        areaStyle: {
          color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(239,68,68,0.20)' },
              { offset: 1, color: 'rgba(239,68,68,0.01)' },
            ],
          },
        },
        symbol: 'circle', symbolSize: 5,
      },
      {
        name: 'MAE',
        type: 'line',
        data: eventData.errorByDay.map(d => d.mae.toFixed(1)),
        smooth: true,
        lineStyle: { color: '#f97316', width: 2, type: 'dashed' },
        itemStyle: { color: '#f97316' },
        symbol: 'circle', symbolSize: 4,
      },
    ],
  };

  const { forecastIntensity: fi, observedIntensity: oi } = eventData;

  // Simulated spatial intensity bars for the mock maps
  function IntensityBar({ label, data }) {
    const bands = [
      { level: 'High',   value: data.high, color: '#ef4444' },
      { level: 'Medium', value: data.mid,  color: '#f97316' },
      { level: 'Low',    value: data.low,  color: '#22d3ee' },
    ];
    return (
      <div className="bg-navy-700 rounded-lg p-4">
        <p className="text-xs font-semibold text-slate-300 mb-3 text-center">{label}</p>
        <div className="space-y-2">
          {bands.map(b => (
            <div key={b.level}>
              <div className="flex justify-between text-xs mb-1 text-slate-400">
                <span>{b.level}</span>
                <span className="font-mono">{b.value} mm</span>
              </div>
              <div className="h-1.5 bg-navy-600 rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${Math.min(100, b.value / 2)}%`, background: b.color }} />
              </div>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-slate-500 text-center mt-3">[DEMO — schematic representation]</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Side-by-side maps */}
      <div className="grid grid-cols-2 gap-4">
        <IntensityBar label="Forecast (NWP)" data={fi} />
        <IntensityBar label="Observation / Analysis" data={oi} />
      </div>

      {/* Error map schematic */}
      <div className="bg-navy-700 rounded-lg p-4">
        <p className="text-xs font-semibold text-slate-300 mb-3">Error Map (Forecast − Observation)</p>
        <div className="flex items-center gap-3 text-xs text-slate-400 mb-3">
          <span>Low Error</span>
          <div className="flex-1 h-3 rounded" style={{
            background: 'linear-gradient(to right, #22d3ee, #fbbf24, #ef4444)'
          }} />
          <span>High Error</span>
        </div>
        <p className="text-[10px] text-slate-500">[DEMO — real error maps computed from NWP minus analysis fields]</p>
      </div>

      {/* Error trend chart */}
      <div className="card">
        <p className="section-title">Lead-Time Error Trend — {eventData.name}</p>
        <ReactECharts option={errorOption} style={{ height: '200px' }} opts={{ renderer: 'canvas' }} />
      </div>
    </div>
  );
}
