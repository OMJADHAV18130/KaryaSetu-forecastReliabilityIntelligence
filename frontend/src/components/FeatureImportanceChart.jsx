import ReactECharts from 'echarts-for-react';

export default function FeatureImportanceChart({ features = [], title = 'Feature Importance' }) {
  const sorted = [...features].sort((a, b) => b.importance - a.importance);

  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'none' },
      backgroundColor: '#1A2235',
      borderColor: '#243047',
      textStyle: { color: '#e2e8f0', fontSize: 12 },
      formatter: params => `${params[0].name}: <b>${(params[0].value * 100).toFixed(1)}%</b>`,
    },
    grid: { left: 140, right: 60, top: 8, bottom: 8 },
    xAxis: {
      type: 'value',
      max: 0.45,
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: '#1E2A40' } },
      axisLabel: {
        color: '#64748b',
        fontSize: 10,
        formatter: v => `${(v * 100).toFixed(0)}%`,
      },
    },
    yAxis: {
      type: 'category',
      data: sorted.map(f => f.feature),
      inverse: false,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: '#cbd5e1', fontSize: 11 },
    },
    series: [
      {
        type: 'bar',
        data: sorted.map((f, i) => ({
          value: f.importance,
          itemStyle: {
            color: ['#22d3ee', '#60a5fa', '#a78bfa', '#34d399', '#fbbf24'][i % 5],
            borderRadius: [0, 4, 4, 0],
          },
        })),
        barWidth: 16,
        label: {
          show: true,
          position: 'right',
          color: '#94a3b8',
          fontSize: 10,
          formatter: p => `${(p.value * 100).toFixed(1)}%`,
        },
      },
    ],
  };

  const height = Math.max(120, sorted.length * 40 + 16);

  return (
    <div>
      <p className="section-title">{title}</p>
      <ReactECharts
        option={option}
        style={{ height: `${height}px`, width: '100%' }}
        opts={{ renderer: 'canvas' }}
      />
    </div>
  );
}
