import { Flame, AlertTriangle, ShieldCheck } from 'lucide-react';
import { LEVEL_TONE, rampGradient, type ReliabilityLayer } from '../../lib/riskScale';
import type { DistrictRisk } from './DistrictRiskMap';

interface RiskLegendProps {
  layer: ReliabilityLayer;
  day: number;
  ranking: DistrictRisk[];
  onSelect?: (risk: DistrictRisk) => void;
}

const BANDS = [
  { key: 'HIGH' as const, range: '≥ 70%', from: 70, to: 100 },
  { key: 'MODERATE' as const, range: '40 – 69%', from: 40, to: 70 },
  { key: 'LOW' as const, range: '< 40%', from: 0, to: 40 },
];

export default function RiskLegend({ layer, day, ranking, onSelect }: RiskLegendProps) {
  const isConfidence = layer === 'confidence';
  const title = isConfidence ? 'FORECAST CONFIDENCE' : 'BUST PROBABILITY';
  const lead = day * 24;

  return (
    <div className="absolute right-3 top-16 bottom-3 z-[1000] w-[186px] hidden md:flex flex-col pointer-events-none">
      {/* Colour scale */}
      <div className="bg-slate-900/92 backdrop-blur-md border border-surface-600 rounded-xl shadow-2xl px-3 py-2.5 pointer-events-auto">
        <p className="text-[9.5px] font-bold tracking-[0.13em] text-slate-300 uppercase">{title}</p>
        <p className="text-[9px] text-slate-500 mt-0.5 mb-2">Day {day} · {lead}h lead time</p>

        <div className="flex gap-2.5">
          {/* Gradient bar */}
          <div className="relative w-3.5 rounded-full overflow-hidden border border-surface-600 shrink-0">
            <div className="absolute inset-0" style={{ background: rampGradient(layer, 'to top') }} />
          </div>

          {/* Threshold brackets */}
          <div className="flex-1 flex flex-col-reverse gap-1">
            {BANDS.map((band) => (
              <div
                key={band.key}
                className="flex items-center justify-between rounded-md px-1.5 py-1 border border-surface-700/70 bg-slate-950/50"
                style={{ height: `${((band.to - band.from) / 10) * 4}%`, minHeight: 20 }}
              >
                <span className={`text-[9px] font-bold tracking-wide ${LEVEL_TONE[band.key].text}`}>
                  {band.key}
                </span>
                <span className="text-[8.5px] text-slate-400 font-mono">{band.range}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-between mt-1.5 text-[8.5px] font-mono text-slate-500">
          <span>0%</span>
          <span>50%</span>
          <span>100%</span>
        </div>
      </div>

      {/* Extreme districts */}
      <div className="mt-2 bg-slate-900/92 backdrop-blur-md border border-surface-600 rounded-xl shadow-2xl px-3 py-2.5 pointer-events-auto flex flex-col min-h-0">
        <p className="text-[9.5px] font-bold tracking-[0.13em] text-slate-300 uppercase flex items-center gap-1.5">
          {isConfidence ? <ShieldCheck className="w-3 h-3 text-rose-400" /> : <Flame className="w-3 h-3 text-rose-400" />}
          {isConfidence ? 'Lowest confidence' : 'Highest bust risk'}
        </p>

        <div className="mt-1.5 space-y-1 overflow-y-auto">
          {ranking.length === 0 && (
            <p className="text-[9.5px] text-slate-500 py-2">Loading district boundaries…</p>
          )}
          {ranking.slice(0, 10).map((risk, index) => {
            const tone = LEVEL_TONE[risk.level as keyof typeof LEVEL_TONE] ?? LEVEL_TONE.MODERATE;
            return (
              <button
                key={`${risk.district}-${risk.state}`}
                type="button"
                onClick={() => onSelect?.(risk)}
                className="w-full text-left flex items-center gap-2 rounded-md px-1.5 py-1 hover:bg-surface-700/60 transition-colors"
              >
                <span className="text-[9px] font-mono text-slate-500 w-3 shrink-0">{index + 1}</span>
                <span className="flex-1 min-w-0">
                  <span className="block text-[10px] font-semibold text-slate-200 truncate leading-tight">
                    {risk.district}
                  </span>
                  <span className="block text-[8.5px] text-slate-500 truncate leading-tight">{risk.state}</span>
                </span>
                <span
                  className={`text-[10px] font-mono font-bold shrink-0 ${
                    isConfidence ? 'text-emerald-300' : 'text-rose-300'
                  }`}
                >
                  {(risk.value * 100).toFixed(0)}%
                </span>
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${tone.chip.split(' ')[1]}`} />
              </button>
            );
          })}
        </div>

        <p className="text-[8.5px] text-slate-500 leading-snug mt-2 pt-2 border-t border-surface-700 flex items-start gap-1">
          <AlertTriangle className="w-2.5 h-2.5 mt-px shrink-0 text-slate-600" />
          <span>
            District shading is inverse-distance interpolation of the trained 5.625° grid, not a
            per-district model run.
          </span>
        </p>
      </div>
    </div>
  );
}