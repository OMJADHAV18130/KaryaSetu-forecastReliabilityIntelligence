import { useEffect, useMemo } from 'react';
import { MapPin } from 'lucide-react';
import BustTimeSeriesChart from './charts/BustTimeSeriesChart';
import ModelInputTable from './ModelInputTable';
import { LoadingBlock, ProbabilityStat, ReliabilityBadge } from './PageHeader';
import { useCoordinatePrediction, useTimeSeries } from '../hooks';
import type { ForecastPoint } from '../types';

export interface LocationTarget {
  lat: number;
  lon: number;
  /** Human label, e.g. "Mumbai District, Maharashtra". */
  label: string;
  /** Shown under the heading, e.g. "Interpolated from 4 reference cells". */
  note?: string;
}

interface LocationAnalysisProps {
  target: LocationTarget;
  day: number;
  /** Fired so the parent map can drop a pin on the same coordinate. */
  onPointResolved?: (point: ForecastPoint) => void;
  showChart?: boolean;
}

/**
 * Model output for one coordinate: bust probability, the inputs that produced
 * it, and the model's own curve across lead days.
 *
 * Every number here comes from the backend. Nothing is computed in the browser.
 */
export default function LocationAnalysis({
  target,
  day,
  onPointResolved,
  showChart = true,
}: LocationAnalysisProps) {
  const point = useMemo(() => ({ lat: target.lat, lon: target.lon }), [target.lat, target.lon]);
  const prediction = useCoordinatePrediction(point, day);
  const series = useTimeSeries(point);

  const detail = prediction.data;
  const levels = new Set((series.data?.series ?? []).map((p) => p.confidence_level));

  // Fallback source for the input table when the single-day detail request has
  // not landed. Matched on day number, since lead time is itself a model input
  // and therefore differs between days.
  const seriesPoint = useMemo(
    () => series.data?.series.find((p) => p.day === day) ?? null,
    [series.data, day]
  );

  // Keeps the parent map in step with this panel without a second request.
  useEffect(() => {
    if (!detail || !onPointResolved) return;
    onPointResolved({
      latitude: detail.latitude,
      longitude: detail.longitude,
      bust_probability: detail.bust_probability,
      confidence: detail.confidence,
      confidence_level: detail.confidence_level,
      region: target.label,
    });
  }, [detail, onPointResolved, target.label]);

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="card-header">
          <div className="flex min-w-0 items-center gap-2">
            <MapPin className="h-4 w-4 flex-shrink-0 text-brand" />
            <div className="min-w-0">
              <p className="card-title truncate">{target.label}</p>
              <p className="font-mono text-[11px] text-ink-muted">
                {target.lat.toFixed(4)}°N, {target.lon.toFixed(4)}°E · Day {day} (+
                {day * 24} h)
              </p>
            </div>
          </div>
          {detail && <ReliabilityBadge value={detail.confidence} />}
        </div>

        <div className="p-4">
          {prediction.isPending && <LoadingBlock label="Scoring with the trained model…" />}

          {prediction.isError && (
            <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-[12.5px] text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-300">
              The model could not be reached, so no reliability value is shown for this
              coordinate.
            </p>
          )}

          {detail && (
            <div className="space-y-3">
              <ProbabilityStat
                bustProbability={detail.bust_probability}
                confidence={detail.confidence}
              />
              {detail.region ? (
                <p className="text-[11.5px] text-ink-muted">
                  Nearest reference sector:{' '}
                  <span className="text-ink">{detail.region}</span>
                </p>
              ) : null}
            </div>
          )}
        </div>
      </div>

      {showChart && (
        <div className="card">
          <div className="card-header">
            <div>
              <p className="card-title">Bust risk across lead days</p>
              <p className="text-[11.5px] text-ink-muted">
                One trained-model evaluation per day, same coordinate.
              </p>
            </div>
            {levels.size > 0 && (
              <span className="text-[11px] text-ink-muted">
                Level: {[...levels].join(' → ')}
              </span>
            )}
          </div>
          <div className="p-4">
            {series.isPending && <LoadingBlock label="Scoring days 1 to 10…" />}
            {series.isError && (
              <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-[12.5px] text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-300">
                The day-by-day curve could not be loaded.
              </p>
            )}
            {series.data && series.data.series.length > 0 && (
              <>
                <BustTimeSeriesChart series={series.data.series} activeDay={day} height={250} />
                <div className="mt-3 table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th scope="col">Day</th>
                        <th scope="col" className="text-right">Lead (h)</th>
                        <th scope="col" className="text-right">Bust risk</th>
                        <th scope="col" className="text-right">Confidence</th>
                        <th scope="col">Level</th>
                      </tr>
                    </thead>
                    <tbody>
                      {series.data.series.map((p) => (
                        <tr key={p.day} className={p.day === day ? 'bg-brand-soft/60' : undefined}>
                          <td className="font-semibold">D{p.day}</td>
                          <td className="text-right font-mono tabular-nums">{p.lead_hours}</td>
                          <td className="text-right font-mono tabular-nums text-risk-high">
                            {(p.bust_probability * 100).toFixed(1)}%
                          </td>
                          <td className="text-right font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
                            {(p.confidence * 100).toFixed(1)}%
                          </td>
                          <td>
                            <ReliabilityBadge value={p.confidence} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <div>
            <p className="card-title">Model inputs at this point</p>
            <p className="text-[11.5px] text-ink-muted">
              The driver values the trained booster read for day {day}.
            </p>
          </div>
        </div>
        <div className="p-4">
          {detail ? (
            <ModelInputTable inputs={detail.model_inputs} derivation={detail.derivation} />
          ) : seriesPoint?.model_inputs ? (
            <ModelInputTable
              inputs={seriesPoint.model_inputs}
              derivation={series.data?.derivation}
            />
          ) : (
            <LoadingBlock label="Reading the reference grid…" />
          )}
        </div>
      </div>

      {/* Keeps the parent map in step with the panel without duplicating the fetch. */}
    </div>
  );
}
