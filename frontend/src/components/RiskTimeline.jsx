import ReactECharts from 'echarts-for-react';

export default function RiskTimeline({ data = [], compact = false }) {
  // data: [{ day, confidence, bustRisk }]
  const days = data.map(d => d.day);
  const confidence = data.map(d => d.confidence);
  const bustRisk = data.map(d => d.bustRisk);

  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#1A2235',
      borderColor: '#243047',
      textStyle: { color: '#e2e8f0', fontSize: 12 },
      formatter: params => {
        const day = params[0].axisValue;
        const conf = params.find(p => p.seriesName === 'Confidence')?.value;
        const risk = params.find(p => p.seriesName === 'Bust Risk')?.value;
        return `
          <div style="font-family:Inter,sans-serif">
            <div style="font-weight:600;margin-bottom:4px">${day}</div>
            <div style="color:#22d3ee">Confidence: <b>${conf}%</b></div>
            <div style="color:#ef4444">Bust Risk: <b>${risk}%</b></div>
          </div>`;
      },
    },
    legend: {
      data: ['Confidence', 'Bust Risk'],
      textStyle: { color: '#94a3b8', fontSize: 11 },
      top: 4,
      right: 12,
      itemWidth: 12,
      itemHeight: 2,
    },
    grid: {
      left: compact ? 32 : 40,
      right: 16,
      top: compact ? 28 : 36,
      bottom: compact ? 24 : 28,
    },
    xAxis: {
      type: 'category',
      data: days,
      axisLine: { lineStyle: { color: '#243047' } },
      axisLabel: { color: '#64748b', fontSize: 11 },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      min: 0,
      max: 100,
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: '#1A2235' } },
      axisLabel: {
        color: '#64748b',
        fontSize: 10,
        formatter: v => `${v}%`,
      },
    },
    series: [
      {
        name: 'Confidence',
        type: 'line',
        data: confidence,
        smooth: true,
        lineStyle: { color: '#22d3ee', width: 2 },
        itemStyle: { color: '#22d3ee' },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(34,211,238,0.18)' },
              { offset: 1, color: 'rgba(34,211,238,0.01)' },
            ],
          },
        },
        symbol: 'circle',
        symbolSize: 5,
        markLine: {
          silent: true,
          lineStyle: { color: '#fbbf24', type: 'dashed', width: 1 },
          data: [{ yAxis: 50, name: 'Threshold' }],
          label: { formatter: 'Threshold', color: '#fbbf24', fontSize: 10 },
        },
      },
      {
        name: 'Bust Risk',
        type: 'line',
        data: bustRisk,
        smooth: true,
        lineStyle: { color: '#ef4444', width: 2 },
        itemStyle: { color: '#ef4444' },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(239,68,68,0.20)' },
              { offset: 1, color: 'rgba(239,68,68,0.01)' },
            ],
          },
        },
        symbol: 'circle',
        symbolSize: 5,
      },
    ],
  };

  return (
    <ReactECharts
      option={option}
      style={{ height: compact ? '140px' : '220px', width: '100%' }}
      opts={{ renderer: 'canvas' }}
    />
  );
}
