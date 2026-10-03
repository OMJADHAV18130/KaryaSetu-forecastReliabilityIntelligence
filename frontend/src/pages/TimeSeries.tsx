import { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, useMapEvents, useMap } from 'react-leaflet';
import { LineChart, MousePointerClick } from 'lucide-react';
import BustTimeSeriesChart from '../components/charts/BustTimeSeriesChart';
import ModelInputTable from '../components/ModelInputTable';
import { LoadingBlock, PageHeader, ProbabilityStat, ReliabilityBadge } from '../components/PageHeader';
import { useForecastMap, useTimeSeries } from '../hooks';
import {
  getRampColor,
  levelFor,
  LEVEL_TONE,
  type ReliabilityLayer,
} from '../lib/riskScale';
import type { ForecastPoint } from '../types';

const BASEMAP_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const BASEMAP_ATTR =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

interface Picked {
  lat: number;
  lon: number;
  label: string;
}

/** Click anywhere inside the domain to move the series to that coordinate. */
function ClickToPick({ onPick }: { onPick: (picked: Picked) => void }) {
  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng;
      if (lat < 8 || lat > 37 || lng < 68 || lng > 98) return;
      onPick({ lat, lon: lng, label: `${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E` });
    },
  });
  return null;
}

function FlyTo({ picked }: { picked: Picked }) {
  const map = useMap();
  useEffect(() => {
    map.setView([picked.lat, picked.lon], 6, { animate: false });
  }, [map, picked.lat, picked.lon]);
  return null;
}

/**
 * Reference-grid cells shaded by the value the model gave them on the selected
 * day. This is the same model output the bust risk map shows, drawn as points
 * rather than interpolated district fills.
 */
function GridDots({ points, layer }: { points: ForecastPoint[]; layer: ReliabilityLayer }) {
  return (
    <>
      {points.map((p) => {
        const value = layer === 'confidence' ? p.confidence : p.bust_probability;
        return (
          <CircleMarker
            key={`${p.latitude}-${p.longitude}`}
            center={[p.latitude, p.longitude]}
            radius={6}
            pathOptions={{
              color: '#0f172a',
              weight: 1,
              fillColor: getRampColor(value, layer),
              fillOpacity: 0.9,
            }}
          />
        );
      })}
    </>
  );
}

export default function TimeSeriesPage() {
  const [day, setDay] = useState(4);
  const [layer, setLayer] = useState<ReliabilityLayer>('bust_probability');
  const [picked, setPicked] = useState<Picked>({
    lat: 25.5941,
    lon: 85.1376,
    label: '25.5941°N, 85.1376°E',
  });

  const grid = useForecastMap(day, layer);
  const series = useTimeSeries({ lat: picked.lat, lon: picked.lon });

  const data = series.data;

  /** Day at which the series crosses into the LOW-confidence band, if ever. */
  const summary = useMemo(() => {
    if (!data?.series.length) return null;
    const first = data.series[0];
    const last = data.series[data.series.length - 1];
    const maxBust = data.series.reduce((a, b) => (b.bust_probability > a.bust_probability ? b : a));
    const crossing = data.series.find((p) => p.confidence < 0.7);
    return {
      day1: first,
      day10: last,
      maxBust,
      crossing,
      change: last.bust_probability - first.bust_probability,
    };
  }, [data]);

  // Look the active day up by its day number rather than by array index, so the
  // panel cannot drift if the caller asks for a subset of days.
  const activePoint = useMemo(
    () => data?.series.find((p) => p.day === day) ?? null,
    [data, day]
  );

  return (
    <div className="flex min-h-screen flex-col">
      <PageHeader
        title="Bust Risk Time Series"
        description="How the trained model's bust probability for one coordinate changes from day 1 to day 10. Each point is an independent evaluation of the model at the same place, not a fit or an interpolation between days."
        actions={
          <>
            <div className="flex items-center gap-1 rounded-md border border-line bg-raised p-0.5">
              {(['bust_probability', 'confidence'] as const).map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setLayer(l)}
                  className={`rounded px-2.5 py-1 text-[12px] font-medium transition-colors ${
                    layer === l ? 'bg-brand text-white' : 'text-ink-muted hover:text-ink'
                  }`}
                >
                  {l === 'bust_probability' ? 'Bust risk' : 'Confidence'}
                </button>
              ))}
            </div>
          </>
        }
      />

      <div className="grid flex-1 items-start gap-4 p-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-4">
          <div className="card">
            <div className="card-header">
              <div>
                <p className="card-title">Lead day</p>
                <p className="text-[11.5px] text-ink-muted">
                  Highlighted on the curve and used for the map dots.
                </p>
              </div>
              <span className="font-mono text-[12px] font-semibold text-brand">
                Day {day} · +{day * 24} h
              </span>
            </div>
            <div className="p-4">
              <input
                type="range"
                min={1}
                max={10}
                step={1}
                value={day}
                onChange={(e) => setDay(Number(e.target.value))}
                aria-label="Forecast day"
                className="w-full accent-brand"
              />
              <div className="mt-1 flex justify-between text-[11px] text-ink-faint">
                <span>D1</span>
                <span>D10</span>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div>
                <p className="card-title flex items-center gap-1.5">
                  <LineChart className="h-4 w-4 text-brand" />
                  {picked.label}
                </p>
                <p className="text-[11.5px] text-ink-muted">
                  {data?.region ? `Nearest reference sector: ${data.region}` : 'Indian domain'}
                </p>
              </div>
            </div>
            <div className="p-4">
              {series.isPending && <LoadingBlock label="Scoring days 1 to 10…" />}
              {series.isError && (
                <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-[12.5px] text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-300">
                  The model could not be reached, so no curve is shown for this coordinate.
                </p>
              )}
              {data && data.series.length > 0 && (
                <>
                  <BustTimeSeriesChart series={data.series} activeDay={day} height={300} />
                  {summary && (
                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                      <div className="rounded-md border border-line bg-raised px-3 py-2.5">
                        <p className="text-[10.5px] font-semibold uppercase tracking-wide text-ink-muted">
                          Day 1 → Day 10
                        </p>
                        <p
                          className={`mt-0.5 font-mono text-lg font-bold tabular-nums ${
                            summary.change > 0 ? 'text-risk-high' : 'text-emerald-600 dark:text-emerald-400'
                          }`}
                        >
                          {summary.change > 0 ? '+' : ''}
                          {(summary.change * 100).toFixed(1)} pp
                        </p>
                        <p className="text-[11px] text-ink-muted">change in bust probability</p>
                      </div>
                      <div className="rounded-md border border-line bg-raised px-3 py-2.5">
                        <p className="text-[10.5px] font-semibold uppercase tracking-wide text-ink-muted">
                          Peak bust risk
                        </p>
                        <p className="mt-0.5 font-mono text-lg font-bold tabular-nums text-risk-high">
                          {(summary.maxBust.bust_probability * 100).toFixed(1)}%
                        </p>
                        <p className="text-[11px] text-ink-muted">on day {summary.maxBust.day}</p>
                      </div>
                      <div className="rounded-md border border-line bg-raised px-3 py-2.5">
                        <p className="text-[10.5px] font-semibold uppercase tracking-wide text-ink-muted">
                          Falls below 70%
                        </p>
                        <p className="mt-0.5 font-mono text-lg font-bold tabular-nums text-ink">
                          {summary.crossing ? `Day ${summary.crossing.day}` : 'Not within 10 days'}
                        </p>
                        <p className="text-[11px] text-ink-muted">
                          {summary.crossing ? 'HIGH → MODERATE confidence' : 'stays HIGH confidence'}
                        </p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {data && data.series.length > 0 && (
            <div className="card">
              <div className="card-header">
                <p className="card-title">Day-by-day values</p>
              </div>
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th scope="col">Day</th>
                      <th scope="col" className="text-right">Lead (h)</th>
                      <th scope="col" className="text-right">Bust risk</th>
                      <th scope="col" className="text-right">Confidence</th>
                      <th scope="col">Level</th>
                      <th scope="col">Trend</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.series.map((p, i, arr) => {
                      const prev = arr[i - 1];
                      const delta = prev ? p.bust_probability - prev.bust_probability : 0;
                      const level = levelFor(p.confidence);
                      return (
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
                            <span className={`chip border ${LEVEL_TONE[level].chip}`}>{level}</span>
                          </td>
                          <td className="font-mono text-[12px]">
                            {i === 0 ? (
                              <span className="text-ink-faint">—</span>
                            ) : (
                              <span className={delta >= 0 ? 'text-risk-high' : 'text-emerald-600 dark:text-emerald-400'}>
                                {delta >= 0 ? '▲' : '▼'}{' '}
                                {Math.abs(delta * 100).toFixed(2)} pp
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* ── Side column ── */}
        <div className="space-y-4">
          <div className="card">
            <div className="card-header">
              <p className="card-title">Pick a coordinate</p>
              <span className="flex items-center gap-1 text-[11px] text-ink-muted">
                <MousePointerClick className="h-3 w-3" />
                click the map
              </span>
            </div>
            <div className="space-y-3 p-4">
              <div>
                <label className="field-label" htmlFor="ts-lat">
                  Latitude °N
                </label>
                <input
                  id="ts-lat"
                  type="number"
                  step="0.0001"
                  value={picked.lat}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    if (Number.isFinite(v) && v >= 8 && v <= 37) {
                      setPicked((p) => ({ ...p, lat: v, label: `${v.toFixed(4)}°N, ${p.lon.toFixed(4)}°E` }));
                    }
                  }}
                  className="field-input font-mono"
                />
              </div>
              <div>
                <label className="field-label" htmlFor="ts-lon">
                  Longitude °E
                </label>
                <input
                  id="ts-lon"
                  type="number"
                  step="0.0001"
                  value={picked.lon}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    if (Number.isFinite(v) && v >= 68 && v <= 98) {
                      setPicked((p) => ({ ...p, lon: v, label: `${p.lat.toFixed(4)}°N, ${v.toFixed(4)}°E` }));
                    }
                  }}
                  className="field-input font-mono"
                />
              </div>
            </div>
          </div>

          {activePoint && (
            <div className="card">
              <div className="card-header">
                <p className="card-title">At day {activePoint.day}</p>
                <ReliabilityBadge value={activePoint.confidence} />
              </div>
              <div className="p-4">
                <ProbabilityStat
                  bustProbability={activePoint.bust_probability}
                  confidence={activePoint.confidence}
                />
              </div>
            </div>
          )}

          {activePoint?.model_inputs && (
            <div className="card">
              <div className="card-header">
                <div>
                  <p className="card-title">Model inputs at day {activePoint.day}</p>
                  <p className="text-[11.5px] text-ink-muted">
                    Lead time is itself one of the inputs, so this table changes
                    with the day selector.
                  </p>
                </div>
              </div>
              <div className="p-4">
                <ModelInputTable
                  inputs={activePoint.model_inputs}
                  derivation={data?.derivation}
                />
              </div>
            </div>
          )}

          <div className="card overflow-hidden">
            <div className="card-header">
              <p className="card-title">Reference grid — day {day}</p>
              <span className="text-[11px] text-ink-muted">
                {grid.data?.points.length ?? 0} cells
              </span>
            </div>
            <div className="h-[380px] w-full">
              <MapContainer
                center={[22.5, 82.5]}
                zoom={5}
                style={{ height: '100%', width: '100%' }}
                scrollWheelZoom
              >
                <TileLayer url={BASEMAP_URL} attribution={BASEMAP_ATTR} maxZoom={19} />
                <ClickToPick onPick={setPicked} />
                <FlyTo picked={picked} />
                {grid.data && <GridDots points={grid.data.points} layer={layer} />}
                <CircleMarker
                  center={[picked.lat, picked.lon]}
                  radius={8}
                  pathOptions={{
                    color: '#ffffff',
                    weight: 2.5,
                    fillColor: '#1d4ed8',
                    fillOpacity: 1,
                  }}
                />
              </MapContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
