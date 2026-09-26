import clsx from 'clsx';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export default function RiskCard({ title, value, unit = '', trend, trendLabel, colorScheme = 'neutral', subtitle, icon: Icon }) {
  function getValueColor(scheme, val) {
    if (scheme === 'confidence') {
      if (val >= 70) return 'text-emerald-600';
      if (val >= 50) return 'text-amber-600';
      return 'text-red-600';
    }
    if (scheme === 'risk') {
      if (val >= 65) return 'text-red-600';
      if (val >= 40) return 'text-amber-600';
      return 'text-emerald-600';
    }
    return 'text-slate-900';
  }

  function getCardBorder(scheme, val) {
    if (scheme === 'confidence') {
      if (val >= 70) return 'border-emerald-200 bg-emerald-50/20';
      if (val >= 50) return 'border-amber-200 bg-amber-50/20';
      return 'border-red-200 bg-red-50/20';
    }
    if (scheme === 'risk') {
      if (val >= 65) return 'border-red-200 bg-red-50/20';
      if (val >= 40) return 'border-amber-200 bg-amber-50/20';
      return 'border-emerald-200 bg-emerald-50/20';
    }
    return 'border-slate-200 bg-white';
  }

  const numVal = typeof value === 'number' ? value : parseFloat(value);

  return (
    <div className={clsx(
      'rounded-xl border p-4 flex flex-col gap-2 shadow-xs transition-all bg-white',
      getCardBorder(colorScheme, numVal)
    )}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">{title}</span>
        {Icon && <Icon size={16} className="text-slate-400" />}
      </div>

      <div className="flex items-baseline gap-1">
        <span className={clsx('text-3xl font-bold font-mono tracking-tight', getValueColor(colorScheme, numVal))}>
          {value}
        </span>
        {unit && <span className="text-slate-500 text-sm font-medium">{unit}</span>}
      </div>

      {(trend !== undefined || subtitle) && (
        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
          {trend > 0 && <TrendingUp size={13} className="text-red-600" />}
          {trend < 0 && <TrendingDown size={13} className="text-emerald-600" />}
          {trend === 0 && <Minus size={13} className="text-slate-400" />}
          <span>{trendLabel || subtitle}</span>
        </div>
      )}
    </div>
  );
}
