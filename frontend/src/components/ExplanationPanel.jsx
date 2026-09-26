import ReactECharts from 'echarts-for-react';

export default function ExplanationPanel({ signals = [], title = 'Feature Contributions' }) {
  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'none' },
      backgroundColor: '#1A2235',
      borderColor: '#243047',
      textStyle: { color: '#e2e8f0', fontSize: 12 },
      formatter: params => `${params[0].name}: <b>${params[0].value}%</b>`,
    },
    grid: { left: 140, right: 48, top: 8, bottom: 8 },
    xAxis: {
      type: 'value',
      max: 100,
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: '#1A2235' } },
      axisLabel: { color: '#64748b', fontSize: 10, formatter: v => `${v}%` },
    },
    yAxis: {
      type: 'category',
      data: signals.map(s => s.label),
      inverse: false,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        color: '#cbd5e1',
        fontSize: 11,
        width: 130,
        overflow: 'truncate',
      },
    },
    series: [
      {
        type: 'bar',
        data: signals.map((s, i) => ({
          value: s.contribution,
          itemStyle: {
            color: ['#ef4444', '#f97316', '#60a5fa', '#22d3ee'][i % 4],
            borderRadius: [0, 3, 3, 0],
          },
        })),
        barWidth: 14,
        label: {
          show: true,
          position: 'right',
          color: '#94a3b8',
          fontSize: 10,
          formatter: p => `${p.value}%`,
        },
      },
    ],
  };

  const height = Math.max(100, signals.length * 36 + 16);

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
