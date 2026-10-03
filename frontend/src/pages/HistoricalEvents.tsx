import { useMemo, useState } from 'react';
import { useHistoricalEvents } from '../hooks';
import { PageHeader, LoadingBlock, UnavailableBlock } from '../components/PageHeader';
import type { HistoricalEvent } from '../types';

type SeverityFilter = 'ALL' | 'CRITICAL' | 'HIGH';

export default function HistoricalEvents() {
  const { data, isLoading } = useHistoricalEvents();
  const [severity, setSeverity] = useState<SeverityFilter>('ALL');

  const events = useMemo<HistoricalEvent[]>(() => data?.results ?? [], [data?.results]);

  const filtered = useMemo(
    () => (severity === 'ALL' ? events : events.filter((e) => e.severity === severity)),
    [events, severity]
  );

  const recordShape = useMemo(
    () => Object.entries(data?.expected_record_shape ?? {}),
    [data?.expected_record_shape]
  );

  return (
    <div className="flex min-h-screen flex-col">
      <PageHeader
        title="Case Archive"
        description="Past forecast bust events, each with the archived forecast, the rainfall that was actually measured, and the probability this model produced for the same cell."
        actions={
          events.length > 0 ? (
            <div className="flex items-center gap-1 rounded-md border border-line bg-raised p-0.5">
              {(['ALL', 'CRITICAL', 'HIGH'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSeverity(s)}
                  className={`rounded px-2.5 py-1 text-[12px] font-medium transition-colors ${
                    severity === s ? 'bg-brand text-white' : 'text-ink-muted hover:text-ink'
                  }`}
                >
                  {s === 'ALL' ? 'All' : s === 'CRITICAL' ? 'Critical' : 'High'}
                </button>
              ))}
            </div>
          ) : null
        }
      />

      <div className="flex-1 space-y-4 p-4">
        {isLoading && (
          <div className="card">
            <LoadingBlock label="Checking for a case archive…" />
          </div>
        )}

        {!isLoading && events.length === 0 && (
          <div className="card">
            <div className="p-4">
              <UnavailableBlock
                message={
                  data?.message ??
                  'No case archive is attached to this prototype, so no historical bust events can be shown.'
                }
              />
            </div>
          </div>
        )}

        {!isLoading && filtered.length > 0 && (
          <div className="grid gap-4 lg:grid-cols-2">
            {filtered.map((event) => (
              <article key={event.event_id} className="card">
                <div className="card-header">
                  <div className="min-w-0">
                    <p className="card-title truncate">{event.name}</p>
                    <p className="text-[11.5px] text-ink-muted">
                      {event.date} · {event.state}
                    </p>
                  </div>
                  <span
                    className={`chip flex-shrink-0 border ${
                      event.severity === 'CRITICAL'
                        ? 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/15 dark:text-rose-300'
                        : 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-300'
                    }`}
                  >
                    {event.severity}
                  </span>
                </div>

                <div className="space-y-3 p-4">
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-md border border-line bg-raised px-2 py-2">
                      <span className="block text-[10px] font-semibold uppercase tracking-wide text-ink-muted">
                        Forecast
                      </span>
                      <span className="font-mono text-sm font-bold tabular-nums text-ink">
                        {event.forecast_rainfall_mm.toFixed(1)}
                      </span>
                      <span className="block text-[10px] text-ink-faint">mm</span>
                    </div>
                    <div className="rounded-md border border-line bg-raised px-2 py-2">
                      <span className="block text-[10px] font-semibold uppercase tracking-wide text-ink-muted">
                        Observed
                      </span>
                      <span className="font-mono text-sm font-bold tabular-nums text-risk-high">
                        {event.observed_rainfall_mm.toFixed(1)}
                      </span>
                      <span className="block text-[10px] text-ink-faint">mm</span>
                    </div>
                    <div className="rounded-md border border-line bg-raised px-2 py-2">
                      <span className="block text-[10px] font-semibold uppercase tracking-wide text-ink-muted">
                        Error
                      </span>
                      <span className="font-mono text-sm font-bold tabular-nums text-ink">
                        {event.absolute_error_mm.toFixed(1)}
                      </span>
                      <span className="block text-[10px] text-ink-faint">mm</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 text-[11.5px] text-ink-muted">
                    <span className="chip border border-line bg-raised">
                      Day {event.lead_days}
                    </span>
                    <span className="chip border border-line bg-raised">
                      {event.model_bust_probability != null
                        ? `Model ${(event.model_bust_probability * 100).toFixed(0)}% bust`
                        : 'Model probability not recorded'}
                    </span>
                    <span className="chip border border-line bg-raised">
                      {event.confidence_level} confidence
                    </span>
                  </div>

                  <p className="text-[12.5px] leading-relaxed text-ink-muted">
                    <span className="font-semibold text-ink">Cause. </span>
                    {event.synoptic_cause}
                  </p>
                  <p className="text-[12.5px] leading-relaxed text-ink-muted">
                    <span className="font-semibold text-ink">Impact. </span>
                    {event.impact}
                  </p>
                </div>
              </article>
            ))}
          </div>
        )}

        {!isLoading && recordShape.length > 0 && (
          <div className="card">
            <div className="card-header">
              <div>
                <p className="card-title">How this page is fed</p>
                <p className="text-[11.5px] text-ink-muted">
                  The backend reads a case archive from disk when one is configured.
                </p>
              </div>
            </div>
            <div className="p-4">
              <p className="mb-2 text-[12.5px] text-ink-muted">
                A row is only listed once the archived forecast, the observed rainfall and
                the model probability for the same cell are all present. Anything less
                could not be checked, so it is not shown.
              </p>
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th scope="col">Field</th>
                      <th scope="col">Meaning</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recordShape.map(([field, meaning]) => (
                      <tr key={field}>
                        <td className="font-mono text-[12.5px]">{field}</td>
                        <td className="text-ink-muted">{meaning}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}