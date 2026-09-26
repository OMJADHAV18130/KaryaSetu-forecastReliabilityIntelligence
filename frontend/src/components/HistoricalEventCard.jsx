import { Calendar, MapPin, TrendingUp, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import StatusBadge from './StatusBadge';
import clsx from 'clsx';

const TYPE_COLORS = {
  'Monsoon Depression': 'border-blue-500/30 hover:border-blue-500/50',
  'Cyclone':            'border-risk-high/30 hover:border-risk-high/50',
  'Western Disturbance':'border-purple-500/30 hover:border-purple-500/50',
  'Heat Wave':          'border-amber-500/30 hover:border-amber-500/50',
  'Heavy Rainfall':     'border-accent-cyan/30 hover:border-accent-cyan/50',
  'Active Monsoon':     'border-confidence-very-high/30 hover:border-confidence-very-high/50',
  'Break Monsoon':      'border-slate-500/30 hover:border-slate-500/50',
};

const TYPE_BADGE_COLORS = {
  'Monsoon Depression': 'bg-blue-500/15 text-blue-400',
  'Cyclone':            'bg-risk-high/15 text-risk-high',
  'Western Disturbance':'bg-purple-500/15 text-purple-400',
  'Heat Wave':          'bg-amber-500/15 text-amber-400',
  'Heavy Rainfall':     'bg-accent-cyan/15 text-accent-cyan',
  'Active Monsoon':     'bg-confidence-very-high/15 text-confidence-very-high',
  'Break Monsoon':      'bg-slate-600/50 text-slate-300',
};

export default function HistoricalEventCard({ event, onClick }) {
  const borderCls = TYPE_COLORS[event.type] || 'border-border hover:border-slate-500';
  const badgeCls  = TYPE_BADGE_COLORS[event.type] || 'bg-slate-600/50 text-slate-300';

  // Find peak error day
  const peakDay = event.errorProgression?.reduce(
    (max, d) => d.forecastError > max.forecastError ? d : max,
    event.errorProgression[0]
  );

  return (
    <div
      className={clsx(
        'bg-panel border rounded-lg p-4 cursor-pointer transition-all hover:bg-navy-600/30',
        borderCls
      )}
      onClick={() => onClick?.(event)}
    >
      {/* Type + status row */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <span className={clsx('text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded', badgeCls)}>
          {event.type}
        </span>
        <StatusBadge status={event.verificationStatus} />
      </div>

      {/* Name */}
      <h3 className="text-white font-semibold text-sm mb-2 leading-snug">{event.name}</h3>

      {/* Meta */}
      <div className="space-y-1 mb-3">
        <MetaRow icon={Calendar} label={event.date} />
        <MetaRow icon={MapPin}   label={event.region} />
        <MetaRow icon={Clock}    label={event.leadTime} />
      </div>

      {/* Key finding */}
      <div className="bg-navy-700 rounded p-2.5 text-xs space-y-1">
        <div className="flex justify-between text-slate-400">
          <span>AI flagged high risk</span>
          <span className="font-mono text-amber-400 font-semibold">{event.aiSignalDay}</span>
        </div>
        <div className="flex justify-between text-slate-400">
          <span>Observed degradation</span>
          <span className="font-mono text-risk-high font-semibold">{event.observedDegradationDay}</span>
        </div>
        {peakDay && (
          <div className="flex justify-between text-slate-400">
            <span>Peak forecast error</span>
            <span className="font-mono text-white font-semibold">{peakDay.forecastError}%</span>
          </div>
        )}
      </div>
    </div>
  );
}

function MetaRow({ icon: Icon, label }) {
  return (
    <div className="flex items-center gap-1.5 text-xs text-slate-400">
      <Icon size={10} className="flex-shrink-0" />
      {label}
    </div>
  );
}
