import { useState } from 'react';
import { CheckCircle } from 'lucide-react';
import ForecastComparison from '../components/ForecastComparison';
import { useVerification } from '../hooks/useForecast';
import { MOCK_VERIFICATION } from '../data/mockVerification';
import { LoadingState } from '../components/LoadingState';

const EVENT_OPTIONS = MOCK_VERIFICATION.events.map(e => ({ value: e.id, label: e.name }));

export default function Verification() {
  const [eventId, setEventId] = useState(MOCK_VERIFICATION.events[0].id);
  const { data: event, isLoading } = useVerification(eventId);

  return (
    <div className="flex flex-col gap-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <CheckCircle className="text-confidence-very-high" size={18} />
            <h1 className="text-white font-bold text-xl">Verification</h1>
          </div>
          <p className="text-slate-400 text-sm">Forecast vs observation · Error analysis</p>
        </div>

        {/* Event selector */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-slate-500 uppercase tracking-wider">Event</label>
          <select
            value={eventId}
            onChange={e => setEventId(e.target.value)}
            className="bg-navy-600 border border-border text-slate-200 text-sm rounded-md px-3 py-1.5 focus:outline-none focus:border-accent-cyan"
          >
            {EVENT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>

      {/* Event summary */}
      {event && (
        <div className="card">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Info label="Event" value={event.name} />
            <Info label="Region" value={event.region} />
            <Info label="Variable" value={event.variable} />
            <Info label="Forecast Date" value={event.forecastDate} />
          </div>
        </div>
      )}

      {/* AI signal summary */}
      {event && (
        <div className="grid grid-cols-3 gap-3">
          <SignalCard
            label="AI Flagged High Risk"
            value={event.aiSignalDay || '—'}
            color="text-amber-400"
            desc="Day AI reliability model exceeded risk threshold"
          />
          <SignalCard
            label="Observed Degradation"
            value={event.observedDegradationDay || '—'}
            color="text-risk-high"
            desc="Day when forecast error exceeded 2× normal"
          />
          <SignalCard
            label="Prediction Lead"
            value={computeLead(event.aiSignalDay, event.observedDegradationDay)}
            color="text-confidence-very-high"
            desc="Days AI flagged risk before observed degradation"
          />
        </div>
      )}

      {/* Comparison */}
      {isLoading ? (
        <LoadingState rows={6} />
      ) : event ? (
        <ForecastComparison eventData={event} />
      ) : null}

      <p className="text-[11px] text-slate-500 text-center">
        [DEMO DATA] Verification data is illustrative. Real verification requires NWP vs analysis comparison.
      </p>
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

function SignalCard({ label, value, color, desc }) {
  return (
    <div className="card text-center">
      <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-3xl font-bold font-mono mb-1 ${color}`}>{value}</p>
      <p className="text-[11px] text-slate-400">{desc}</p>
    </div>
  );
}

function computeLead(aiDay, obsDay) {
  if (!aiDay || !obsDay) return '—';
  const aiNum = parseInt(aiDay.replace('D',''));
  const obsNum = parseInt(obsDay.replace('D',''));
  const diff = obsNum - aiNum;
  if (diff === 0) return 'Same day';
  if (diff > 0) return `${diff} day${diff !== 1 ? 's' : ''} early`;
  return `${Math.abs(diff)} day${Math.abs(diff) !== 1 ? 's' : ''} late`;
}
