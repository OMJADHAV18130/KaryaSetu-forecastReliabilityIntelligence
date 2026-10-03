import { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Info, Layers, MapPin } from 'lucide-react';
import { useGlobalExplanation, useLocationExplanation } from '../hooks';
import { useTheme } from '../lib/theme';
import {
  LoadingBlock,
  PageHeader,
  ProbabilityStat,
  ReliabilityBadge,
  UnavailableBlock,
} from '../components/PageHeader';
import ModelInputTable from '../components/ModelInputTable';
import type { ShapFeature } from '../types';

/** A reference-grid cell with a genuinely high and a low bust probability. */
const PRESET_POINTS = [
  { label: 'Central Bay of Bengal', lat: 19.6875, lon: 85.0 },
  { label: 'Delhi', lat: 28.6139, lon: 77.209 },
  { label: 'Tamil Nadu coast', lat: 13.0827, lon: 80.2707 },
  { label: 'Gangetic plain', lat: 25.5941, lon: 85.1376 },
];

type Tab = 'global' | 'location';

/** Human-readable names for the feature keys the model reads. */
const FEATURE_LABELS: Record<string, string> = {
  total_precipitation_24hr: '24h precipitation',
  '2m_temperature': '2 m temperature',
  mean_sea_level_pressure: 'Sea-level pressure',
  '10m_u_component_of_wind': '10 m U wind',
  '10m_v_component_of_wind': '10 m V wind',
  specific_humidity_850: 'Humidity at 850 hPa',
  geopotential_500: 'Geopotential at 500 hPa',
  vertical_velocity_500: 'Vertical velocity at 500 hPa',
  bust_pattern_similarity: 'Bust pattern similarity',
  longitude: 'Longitude',
  latitude: 'Latitude',
  lead_hours: 'Lead time',
};

function featureLabel(key: string): string {
  return FEATURE_LABELS[key] ?? key;
}

export default function Explainability() {
  const [tab, setTab] = useState<Tab>('global');
  const [day, setDay] = useState(4);
  const [point, setPoint] = useState({ lat: 25.5941, lon: 85.1376 });
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const global = useGlobalExplanation();
  const local = useLocationExplanation(point, day);

  const axisColor = isDark ? '#94a3b8' : '#475569';
  const gridColor = isDark ? '#334155' : '#e2e8f0';

  const globalRows = useMemo(
    () =>
      (global.data?.features ?? []).map((f) => ({
        feature: featureLabel(f.feature),
        key: f.feature,
        importance: f.mean_abs_shap,
      })),
    [global.data]
  );

  const localRows = useMemo(
    () =>
      (local.data?.features ?? []).map((f: ShapFeature) => ({
        feature: featureLabel(f.feature),
        key: f.feature,
        shap: f.shap_value,
        value: f.value,
        direction: f.direction,
        rank: f.rank,
      })),
    [local.data]
  );

  /**
   * Rebuilds the prediction from the SHAP values, so the page can show its own
   * arithmetic instead of asking to be believed.
   *
   * TreeSHAP decomposes the booster's log-odds, so `sigmoid(base_value + sum)`
   * returns the booster's own probability, not the calibrated figure at the top of
   * the page. Both stages are therefore shown: the decomposition is exact against
   * the first, and the gap to the second is the calibrator, named as such rather
   * than left for the reader to puzzle over.
   */
  const checksum = useMemo(() => {
    const baseValue = local.data?.base_value;
    const uncalibrated = local.data?.uncalibrated_probability;
    const reported = local.data?.bust_probability;
    if (
      baseValue == null ||
      uncalibrated == null ||
      reported == null ||
      localRows.length === 0
    ) {
      return null;
    }

    const shapSum = localRows.reduce((total, row) => total + row.shap, 0);
    const reconstructed = 1 / (1 + Math.exp(-(baseValue + shapSum)));
    const closesExactly = Math.abs(reconstructed - uncalibrated) <= 5e-4;

    const explanation = !local.data?.calibration_applied
      ? 'The calibrator is unavailable in this deployment, so the reported figure is the booster output itself and the two rows agree.'
      : closesExactly
        ? 'The bars rebuild the booster output exactly. The sigmoid calibrator then moved it to the reported figure, which is why the last two rows differ.'
        : `The bars rebuild the booster output to within ${Math.abs(
            reconstructed - uncalibrated
          ).toFixed(4)}. The remaining gap to the reported figure is the sigmoid calibrator, which TreeSHAP does not decompose.`;

    return {
      baseValue,
      shapSum,
      reconstructed,
      uncalibrated,
      reported,
      closesExactly,
      explanation,
    };
  }, [local.data, localRows]);

  return (
    <div className="flex min-h-screen flex-col">
      <PageHeader
        title="Explainability"
        description="Attribution from the trained booster: which inputs moved this particular prediction, and which inputs matter most across the stored background sample."
      />

      <div className="flex-1 space-y-4 p-4">
        {/* ── Tabs ── */}
        <div
          role="tablist"
          aria-label="Attribution view"
          className="flex flex-wrap gap-1 rounded-md border border-line bg-panel p-1"
        >
          {(
            [
              { id: 'global' as const, label: 'Across all cells', icon: Layers },
              { id: 'location' as const, label: 'At one coordinate', icon: MapPin },
            ] satisfies { id: Tab; label: string; icon: typeof Layers }[]
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={tab === item.id}
              onClick={() => setTab(item.id)}
              className={`flex items-center gap-1.5 rounded px-3 py-1.5 text-[13px] font-semibold transition-colors ${
                tab === item.id
                  ? 'bg-brand text-white'
                  : 'text-ink-muted hover:bg-raised hover:text-ink'
              }`}
            >
              <item.icon className="h-3.5 w-3.5" />
              {item.label}
            </button>
          ))}
        </div>

        {/* ── Global importance ── */}
        {tab === 'global' && (
          <div className="card">
            <div className="card-header">
              <div>
                <p className="card-title">Mean absolute SHAP value</p>
                <p className="text-[11.5px] text-ink-muted">
                  {global.data?.background_samples
                    ? `Averaged over ${global.data.background_samples} stored background samples.`
                    : 'Averaged over the stored background samples.'}
                </p>
              </div>
              {global.data?.model_version && (
                <span className="font-mono text-[11px] text-ink-faint">
                  {global.data.model_version}
                </span>
              )}
            </div>

            <div className="p-4">
              {global.isPending && <LoadingBlock label="Computing TreeSHAP values…" />}

              {global.isError && (
                <UnavailableBlock message="The backend could not be reached, so global importance is unavailable." />
              )}

              {global.data && !global.data.available && (
                <UnavailableBlock
                  message={
                    global.data.message ??
                    'Attribution could not be computed in this deployment.'
                  }
                />
              )}

              {global.data?.available && globalRows.length > 0 && (
                <>
                  <div className="h-[380px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={globalRows}
                        layout="vertical"
                        margin={{ top: 4, right: 44, bottom: 4, left: 8 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} />
                        <XAxis
                          type="number"
                          stroke={axisColor}
                          fontSize={11}
                          tick={{ fill: axisColor, fontSize: 11 }}
                        />
                        <YAxis
                          type="category"
                          dataKey="feature"
                          stroke={axisColor}
                          fontSize={11}
                          width={168}
                          tick={{ fill: axisColor, fontSize: 11 }}
                        />
                        <Tooltip
                          contentStyle={{
                            background: isDark ? '#111827' : '#ffffff',
                            border: `1px solid ${gridColor}`,
                            borderRadius: 8,
                            fontSize: 12,
                          }}
                          formatter={(value: number) => [value.toFixed(4), 'Mean |SHAP|']}
                        />
                        <Bar dataKey="importance" fill="#0891b2" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <p className="mt-3 flex items-start gap-1.5 text-[11px] leading-relaxed text-ink-muted">
                    <Info className="mt-0.5 h-3 w-3 flex-shrink-0" />
                    <span>
                      Mean absolute SHAP measures how far a feature moves the model output
                      on average. It is a magnitude, so it carries no direction — the
                      per-prediction view below is where direction comes from.
                    </span>
                  </p>
                </>
              )}
            </div>
          </div>
        )}

        {/* ── Per-coordinate attribution ── */}
        {tab === 'location' && (
          <>
            <div className="card">
              <div className="card-header">
                <p className="card-title">Coordinate</p>
                <span className="font-mono text-[12px] font-semibold text-brand">
                  Day {day} · +{day * 24} h
                </span>
              </div>
              <div className="space-y-3 p-4">
                <div className="flex flex-wrap gap-1.5">
                  {PRESET_POINTS.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => setPoint({ lat: preset.lat, lon: preset.lon })}
                      className={`chip border transition-colors ${
                        point.lat === preset.lat && point.lon === preset.lon
                          ? 'border-brand bg-brand-soft text-brand-ink'
                          : 'border-line bg-raised text-ink-muted hover:text-ink'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                <div className="grid items-end gap-3 sm:grid-cols-2">
                  <div>
                    <label className="field-label" htmlFor="exp-lat">
                      Latitude °N
                    </label>
                    <input
                      id="exp-lat"
                      type="number"
                      step="0.0001"
                      min={8}
                      max={37}
                      value={point.lat}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        if (Number.isFinite(v) && v >= 8 && v <= 37) {
                          setPoint((p) => ({ ...p, lat: v }));
                        }
                      }}
                      className="field-input font-mono"
                    />
                  </div>
                  <div>
                    <label className="field-label" htmlFor="exp-lon">
                      Longitude °E
                    </label>
                    <input
                      id="exp-lon"
                      type="number"
                      step="0.0001"
                      min={68}
                      max={98}
                      value={point.lon}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        if (Number.isFinite(v) && v >= 68 && v <= 98) {
                          setPoint((p) => ({ ...p, lon: v }));
                        }
                      }}
                      className="field-input font-mono"
                    />
                  </div>
                </div>

                <div>
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
                    <span className="font-semibold text-brand">Day {day}</span>
                    <span>D10</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <div className="min-w-0">
                  <p className="card-title truncate">
                    {point.lat.toFixed(4)}°N, {point.lon.toFixed(4)}°E
                  </p>
                  <p className="text-[11.5px] text-ink-muted">
                    {local.data?.region ? `Nearest reference sector: ${local.data.region}` : 'Indian domain'}
                  </p>
                </div>
                {local.data?.available && (
                  <ReliabilityBadge value={local.data.confidence} />
                )}
              </div>

              <div className="space-y-4 p-4">
                {local.isPending && <LoadingBlock label="Scoring and attributing…" />}

                {local.isError && (
                  <UnavailableBlock message="The backend could not be reached, so no attribution is shown." />
                )}

                {local.data && !local.data.available && (
                  <UnavailableBlock
                    message={
                      local.data.message ??
                      'Attribution could not be computed in this deployment.'
                    }
                  />
                )}

                {local.data?.available && (
                  <>
                    <ProbabilityStat
                      bustProbability={local.data.bust_probability}
                      confidence={local.data.confidence}
                    />

                    <p className="text-[11px] leading-relaxed text-ink-muted">
                      A positive contribution pushed the prediction towards a bust, a
                      negative one away from it. These bars decompose the booster's own
                      output; the sigmoid calibrator then adjusts that output, and both
                      stages are shown below the table so the arithmetic can be checked.
                    </p>

                    <div className="h-[340px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={localRows}
                          layout="vertical"
                          margin={{ top: 4, right: 44, bottom: 4, left: 8 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} />
                          <XAxis
                            type="number"
                            stroke={axisColor}
                            fontSize={11}
                            tick={{ fill: axisColor, fontSize: 11 }}
                          />
                          <YAxis
                            type="category"
                            dataKey="feature"
                            stroke={axisColor}
                            fontSize={11}
                            width={168}
                            tick={{ fill: axisColor, fontSize: 11 }}
                          />
                          <ReferenceLine
                            x={0}
                            stroke={axisColor}
                            strokeWidth={1.5}
                          />
                          <Tooltip
                            contentStyle={{
                              background: isDark ? '#111827' : '#ffffff',
                              border: `1px solid ${gridColor}`,
                              borderRadius: 8,
                              fontSize: 12,
                            }}
                            formatter={(value: number) => [
                              value.toFixed(4),
                              'SHAP value',
                            ]}
                          />
                          <Bar dataKey="shap" radius={[3, 3, 3, 3]}>
                            {localRows.map((entry) => (
                              <Cell
                                key={entry.key}
                                fill={
                                  entry.shap > 0
                                    ? '#dc2626'
                                    : entry.shap < 0
                                    ? '#059669'
                                    : '#64748b'
                                }
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="flex flex-wrap items-center gap-4">
                      <span className="flex items-center gap-1.5 text-[11.5px] text-ink-muted">
                        <span className="h-2.5 w-2.5 rounded-sm bg-risk-high" />
                        Raises bust probability
                      </span>
                      <span className="flex items-center gap-1.5 text-[11.5px] text-ink-muted">
                        <span className="h-2.5 w-2.5 rounded-sm bg-emerald-600 dark:bg-emerald-400" />
                        Lowers bust probability
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {local.data?.available && localRows.length > 0 && (
              <div className="card">
                <div className="card-header">
                  <p className="card-title">Contribution detail</p>
                  <span className="text-[11px] text-ink-muted">By absolute SHAP value</span>
                </div>
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th scope="col">Rank</th>
                        <th scope="col">Input</th>
                        <th scope="col" className="text-right">Value</th>
                        <th scope="col" className="text-right">SHAP value</th>
                        <th scope="col">Effect</th>
                      </tr>
                    </thead>
                    <tbody>
                      {localRows.map((row) => (
                        <tr key={row.key}>
                          <td className="font-mono font-semibold">#{row.rank}</td>
                          <td>{row.feature}</td>
                          <td className="text-right font-mono tabular-nums">
                            {row.value.toFixed(3)}
                          </td>
                          <td
                            className={`text-right font-mono font-semibold tabular-nums ${
                              row.shap > 0 ? 'text-risk-high' : 'text-emerald-600 dark:text-emerald-400'
                            }`}
                          >
                            {row.shap > 0 ? '+' : ''}
                            {row.shap.toFixed(4)}
                          </td>
                          <td>
                            <span
                              className={`chip border ${
                                row.shap > 0
                                  ? 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/15 dark:text-rose-300'
                                  : row.shap < 0
                                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-300'
                                  : 'border-line bg-raised text-ink-muted'
                              }`}
                            >
                              {row.shap > 0
                                ? 'Raises risk'
                                : row.shap < 0
                                ? 'Lowers risk'
                                : 'No effect'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {checksum && (
                  <div className="border-t border-line px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
                      Does it add up?
                    </p>
                    <dl className="mt-2 space-y-1 font-mono text-[11.5px] tabular-nums text-ink-muted">
                      <div className="flex justify-between gap-4">
                        <dt>Model base rate (log-odds)</dt>
                        <dd className="text-ink">{checksum.baseValue.toFixed(4)}</dd>
                      </div>
                      <div className="flex justify-between gap-4">
                        <dt>Sum of the {localRows.length} SHAP values</dt>
                        <dd className="text-ink">{checksum.shapSum.toFixed(4)}</dd>
                      </div>
                      <div className="flex justify-between gap-4 border-t border-line pt-1">
                        <dt>Booster probability, rebuilt from the bars</dt>
                        <dd className="text-ink">{checksum.reconstructed.toFixed(6)}</dd>
                      </div>
                      <div className="flex justify-between gap-4">
                        <dt>Booster probability, reported by the model</dt>
                        <dd className="text-ink">{checksum.uncalibrated.toFixed(6)}</dd>
                      </div>
                      <div className="flex justify-between gap-4 border-t border-line pt-1">
                        <dt>After sigmoid calibration &mdash; the figure above</dt>
                        <dd className="text-ink">{checksum.reported.toFixed(4)}</dd>
                      </div>
                    </dl>
                    <p className="mt-2 text-[11px] leading-relaxed text-ink-muted">
                      {checksum.explanation}
                    </p>
                  </div>
                )}
              </div>
            )}

            {local.data?.model_inputs && Object.keys(local.data.model_inputs).length > 0 && (
              <div className="card">
                <div className="card-header">
                  <div>
                    <p className="card-title">Inputs behind this attribution</p>
                    <p className="text-[11.5px] text-ink-muted">
                      The values the booster actually read.
                    </p>
                  </div>
                </div>
                <div className="p-4">
                  <ModelInputTable
                    inputs={local.data.model_inputs}
                    derivation={local.data.derivation}
                  />
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}