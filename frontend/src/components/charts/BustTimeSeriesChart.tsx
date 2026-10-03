import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useTheme } from '../../lib/theme';
import type { TimeSeriesPoint } from '../../types';

interface BustTimeSeriesChartProps {
  series: TimeSeriesPoint[];
  /** Lead day to highlight, e.g. when the page's day selector is at Day 4. */
  activeDay?: number;
  height?: number;
}

/**
 * Bust probability and confidence against forecast day.
 *
 * Confidence is not an independent series: it is `1 - bust_probability`, so the
 * two lines are mirror images. Both are drawn because the reader cares about
 * either framing, and the shaded band between the two level thresholds makes
 * the "moderate" zone obvious at a glance.
 */
export default function BustTimeSeriesChart({
  series,
  activeDay,
  height = 260,
}: BustTimeSeriesChartProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const gridColor = isDark ? '#334155' : '#e2e8f0';
  const axisColor = isDark ? '#94a3b8' : '#475569';

  const data = series.map((p) => ({
    day: p.day,
    label: `D${p.day}`,
    lead: `${p.lead_hours} h`,
    bust: p.bust_probability,
    confidence: p.confidence,
    level: p.confidence_level,
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: -12 }}>
        <defs>
          <linearGradient id="bustFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#dc2626" stopOpacity={0.28} />
            <stop offset="100%" stopColor="#dc2626" stopOpacity={0.02} />
          </linearGradient>
          <linearGradient id="confidenceFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0891b2" stopOpacity={0.22} />
            <stop offset="100%" stopColor="#0891b2" stopOpacity={0.02} />
          </linearGradient>
        </defs>

        <CartesianGrid stroke={gridColor} strokeDasharray="3 3" vertical={false} />

        <XAxis
          dataKey="label"
          tick={{ fill: axisColor, fontSize: 11 }}
          axisLine={{ stroke: gridColor }}
          tickLine={false}
        />
        <YAxis
          domain={[0, 1]}
          ticks={[0, 0.25, 0.4, 0.6, 0.7, 1]}
          tick={{ fill: axisColor, fontSize: 11 }}
          axisLine={{ stroke: gridColor }}
          tickLine={false}
          tickFormatter={(v: number) => `${Math.round(v * 100)}%`}
          width={52}
        />

        {/* Thresholds: bust risk >= 0.70 is the HIGH risk boundary, >= 0.40 MODERATE. */}
        <ReferenceLine y={0.7} stroke="#dc2626" strokeDasharray="4 4" strokeOpacity={0.5} />
        <ReferenceLine y={0.4} stroke="#d97706" strokeDasharray="4 4" strokeOpacity={0.5} />
        {activeDay !== undefined && (
          <ReferenceLine
            x={`D${activeDay}`}
            stroke={isDark ? '#64748b' : '#94a3b8'}
            strokeWidth={1.5}
            label={{
              value: `Day ${activeDay}`,
              position: 'top',
              fill: axisColor,
              fontSize: 10,
            }}
          />
        )}

        <Tooltip
          contentStyle={{
            background: isDark ? '#111827' : '#ffffff',
            border: `1px solid ${gridColor}`,
            borderRadius: 8,
            fontSize: 12,
            color: isDark ? '#f1f5f9' : '#0f172a',
          }}
          labelFormatter={(label: string, payload: any[]) =>
            payload?.[0]?.payload?.lead
              ? `${label} — lead time ${payload[0].payload.lead}`
              : label
          }
          formatter={(value: number, name: string) => [
            `${(value * 100).toFixed(1)}%`,
            name === 'bust' ? 'Bust probability' : 'Confidence',
          ]}
        />

        <Legend
          verticalAlign="top"
          height={28}
          formatter={(value: string) =>
            value === 'bust' ? 'Bust probability' : 'Confidence (1 − bust)'
          }
          wrapperStyle={{ fontSize: 11.5, color: axisColor }}
        />

        <Area
          type="monotone"
          dataKey="confidence"
          stroke="#0891b2"
          strokeWidth={2}
          fill="url(#confidenceFill)"
          dot={{ r: 2.5, strokeWidth: 0 }}
          activeDot={{ r: 4 }}
        />
        <Area
          type="monotone"
          dataKey="bust"
          stroke="#dc2626"
          strokeWidth={2}
          fill="url(#bustFill)"
          dot={{ r: 2.5, strokeWidth: 0 }}
          activeDot={{ r: 4 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
