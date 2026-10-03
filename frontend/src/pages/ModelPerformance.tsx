import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { AlertTriangle, Info } from 'lucide-react';
import { useModelPerformance, useGlobalExplanation } from '../hooks';
import { useTheme } from '../lib/theme';
import {
  LoadingBlock,
  PageHeader,
  UnavailableBlock,
} from '../components/PageHeader';

/** Format a metric that may legitimately be absent, without inventing a value. */
function num(value: number | null | undefined, digits = 3): string {
  return typeof value === 'number' && Number.isFinite(value) ? value.toFixed(digits) : '—';
}

function pct(value: number | null | undefined): string {
  return typeof value === 'number' && Number.isFinite(value)
    ? `${(value * 100).toFixed(1)}%`
    : '—';
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-md border border-line bg-raised px-3 py-2.5">
      <p className="text-[10.5px] font-semibold uppercase tracking-wide text-ink-muted">
        {label}
      </p>
      <p className="mt-0.5 font-mono text-xl font-bold tabular-nums text-ink">{value}</p>
      {hint && <p className="mt-0.5 text-[11px] text-ink-muted">{hint}</p>}
    </div>
  );
}

export default function ModelPerformance() {
  const { data, isLoading, isError } = useModelPerformance();
  const { data: importance } = useGlobalExplanation();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const gridColor = isDark ? '#334155' : '#e2e8f0';
  const axisColor = isDark ? '#94a3b8' : '#475569';
  const tooltipStyle = {
    background: isDark ? '#111827' : '#ffffff',
    border: `1px solid ${gridColor}`,
    borderRadius: 8,
    fontSize: 12,
  };

  const importanceRows = useMemo(
    () =>
      (importance?.features ?? []).map((f) => ({
        feature: f.feature,
        importance: f.mean_abs_shap,
      })),
    [importance]
  );

  if (isLoading) {
    return (
      <div className="p-4">
        <div className="card">
          <LoadingBlock label="Loading evaluation figures…" />
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="p-4">
        <PageHeader
          title="Model Scores"
          description="Held-out evaluation of the trained bust detection model."
        />
        <div className="card">
          <div className="p-4">
            <UnavailableBlock message="The backend could not be reached, so no evaluation figures can be shown." />
          </div>
        </div>
      </div>
    );
  }

  const heldOut = data.held_out_test_set;
  const artifact = data.served_artifact;
  const report = heldOut?.classification_report;

  return (
    <div className="flex min-h-screen flex-col">
      <PageHeader
        title="Model Scores"
        description="Evaluation of the trained bust detection model, and the exact feature contract it reads."
      />

      <div className="flex-1 space-y-4 p-4">
        {/* ── Research-use notice ── */}
        <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-3.5 py-2.5 text-[12.5px] leading-relaxed text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <div>
            <p className="font-semibold">Research prototype — not operational statistics.</p>
            <p className="mt-0.5">{data.scope}</p>
          </div>
        </div>

        {/* ── Feature contract ── */}
        <div className="card">
          <div className="card-header">
            <p className="card-title">Model and feature contract</p>
            <span className="font-mono text-[11px] text-ink-faint">{data.model_version}</span>
          </div>
          <div className="p-4">
            <div className="grid gap-3 sm:grid-cols-4">
              <Stat label="Model type" value={data.model_type.split(' ')[0]} hint={data.model_type} />
              <Stat label="Features read" value={String(data.feature_count)} />
              <Stat
                label="Training split"
                value={data.splits?.train ?? '—'}
                hint={data.splits?.train_rows ? `${data.splits.train_rows.toLocaleString()} rows` : undefined}
              />
              <Stat
                label="Test split"
                value={data.splits?.test ?? '—'}
                hint={data.splits?.test_rows ? `${data.splits.test_rows.toLocaleString()} rows` : undefined}
              />
            </div>

            <details className="mt-3">
              <summary className="cursor-pointer text-[12.5px] font-semibold text-brand">
                Show the {data.feature_count} feature names and tuned hyperparameters
              </summary>
              <div className="mt-2 grid gap-3 sm:grid-cols-2">
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th scope="col">#</th>
                        <th scope="col">Feature</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.features.map((f, i) => (
                        <tr key={f}>
                          <td className="font-mono text-ink-muted">{i + 1}</td>
                          <td className="font-mono text-[12.5px]">{f}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th scope="col">Hyperparameter</th>
                        <th scope="col" className="text-right">Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(data.hyperparameters).map(([key, value]) => (
                        <tr key={key}>
                          <td className="font-mono text-[12.5px]">{key}</td>
                          <td className="text-right font-mono tabular-nums">{String(value)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </details>
          </div>
        </div>

        {/* ── Held-out test set ── */}
        {heldOut ? (
          <>
            <div className="card">
              <div className="card-header">
                <div>
                  <p className="card-title">{heldOut.label}</p>
                  <p className="text-[11.5px] text-ink-muted">
                    {heldOut.n_samples?.toLocaleString()} samples, of which{' '}
                    {heldOut.n_bust?.toLocaleString()} were busts (
                    {pct((heldOut.n_bust ?? 0) / (heldOut.n_samples || 1))} base rate)
                  </p>
                </div>
              </div>

              <div className="space-y-4 p-4">
                <div className="grid gap-3 sm:grid-cols-4">
                  <Stat label="ROC-AUC" value={num(heldOut.roc_auc, 4)} hint="Ranking quality" />
                  <Stat label="PR-AUC" value={num(heldOut.pr_auc, 4)} hint="Precision-recall area" />
                  <Stat label="MCC" value={num(heldOut.mcc, 4)} hint="Balanced agreement" />
                  <Stat label="Accuracy" value={pct(report?.accuracy)} />
                </div>

                <div className="grid gap-3 sm:grid-cols-4">
                  <Stat label="Precision" value={pct(report?.precision)} hint="Bust class" />
                  <Stat label="Recall" value={pct(report?.recall)} hint="Bust class" />
                  <Stat label="F1" value={num(report?.f1_score)} hint="Bust class" />
                  <Stat
                    label="Operating point"
                    value={num(heldOut.operating_threshold, 2)}
                    hint="Threshold used for the report above"
                  />
                </div>

                {heldOut.confusion_matrix && (
                  <div>
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
                      Confusion matrix
                    </p>
                    <div className="grid max-w-md grid-cols-2 gap-2">
                      {(
                        [
                          ['True negative', heldOut.confusion_matrix.true_negatives, 'border-emerald-200 bg-emerald-50 dark:border-emerald-500/40 dark:bg-emerald-500/10'],
                          ['False positive', heldOut.confusion_matrix.false_positives, 'border-amber-200 bg-amber-50 dark:border-amber-500/40 dark:bg-amber-500/10'],
                          ['False negative', heldOut.confusion_matrix.false_negatives, 'border-orange-200 bg-orange-50 dark:border-orange-500/40 dark:bg-orange-500/10'],
                          ['True positive', heldOut.confusion_matrix.true_positives, 'border-sky-200 bg-sky-50 dark:border-sky-500/40 dark:bg-sky-500/10'],
                        ] as const
                      ).map(([label, value, tone]) => (
                        <div key={label} className={`rounded-md border px-3 py-2 ${tone}`}>
                          <p className="text-[10.5px] font-semibold uppercase tracking-wide text-ink-muted">
                            {label}
                          </p>
                          <p className="font-mono text-lg font-bold tabular-nums text-ink">
                            {value.toLocaleString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {heldOut.brier_raw !== null && heldOut.brier_calibrated !== null && (
                  <div>
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
                      Brier score — the metric calibration improves
                    </p>
                    <div className="flex flex-wrap items-center gap-4">
                      <div>
                        <p className="font-mono text-xl font-bold tabular-nums text-ink">
                          {num(heldOut.brier_raw, 4)}
                        </p>
                        <p className="text-[11px] text-ink-muted">Before calibration</p>
                      </div>
                      <span className="text-ink-faint">→</span>
                      <div>
                        <p className="font-mono text-xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                          {num(heldOut.brier_calibrated, 4)}
                        </p>
                        <p className="text-[11px] text-ink-muted">After calibration</p>
                      </div>
                      <p className="text-[12.5px] font-semibold text-emerald-600 dark:text-emerald-400">
                        {pct(
                          1 - (heldOut.brier_calibrated ?? 0) / (heldOut.brier_raw || 1)
                        )}{' '}
                        reduction
                      </p>
                    </div>
                    {heldOut.calibration_method && (
                      <p className="mt-2 text-[11px] text-ink-muted">
                        Method: {heldOut.calibration_method}
                      </p>
                    )}
                  </div>
                )}

                {heldOut.notes.length > 0 && (
                  <ul className="space-y-1">
                    {heldOut.notes.map((note) => (
                      <li
                        key={note}
                        className="flex items-start gap-1.5 text-[11.5px] leading-relaxed text-ink-muted"
                      >
                        <Info className="mt-0.5 h-3 w-3 flex-shrink-0" />
                        <span>{note}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {data.threshold_sweep && data.threshold_sweep.rows.length > 0 && (
              <div className="card">
                <div className="card-header">
                  <div>
                    <p className="card-title">Precision and recall against the cut-off</p>
                    <p className="text-[11.5px] text-ink-muted">{data.threshold_sweep.note}</p>
                  </div>
                </div>
                <div className="p-4">
                  <div className="h-[280px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={data.threshold_sweep.rows}
                        margin={{ top: 8, right: 16, bottom: 4, left: -8 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                        <XAxis
                          dataKey="threshold"
                          stroke={axisColor}
                          fontSize={11}
                          tick={{ fill: axisColor, fontSize: 11 }}
                          tickFormatter={(v: number) => v.toFixed(2)}
                          label={{
                            value: 'Probability cut-off',
                            position: 'insideBottom',
                            offset: -2,
                            fill: axisColor,
                            fontSize: 11,
                          }}
                        />
                        <YAxis
                          domain={[0, 1]}
                          stroke={axisColor}
                          fontSize={11}
                          tick={{ fill: axisColor, fontSize: 11 }}
                          tickFormatter={(v: number) => `${Math.round(v * 100)}%`}
                          width={52}
                        />
                        <Tooltip
                          contentStyle={tooltipStyle}
                          formatter={(value: number, name: string) => [
                            pct(value),
                            name.charAt(0).toUpperCase() + name.slice(1),
                          ]}
                        />
                        <Legend wrapperStyle={{ fontSize: 11.5, color: axisColor }} />
                        <ReferenceLine
                          x={heldOut.operating_threshold ?? 0.5}
                          stroke={axisColor}
                          strokeDasharray="4 4"
                        />
                        <Line
                          type="monotone"
                          dataKey="precision"
                          stroke="#0891b2"
                          strokeWidth={2}
                          dot={{ r: 2 }}
                        />
                        <Line
                          type="monotone"
                          dataKey="recall"
                          stroke="#dc2626"
                          strokeWidth={2}
                          dot={{ r: 2 }}
                        />
                        <Line
                          type="monotone"
                          dataKey="f1"
                          stroke="#a855f7"
                          strokeWidth={2}
                          strokeDasharray="5 3"
                          dot={{ r: 2 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="mt-3 table-wrap">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th scope="col" className="text-right">Cut-off</th>
                          <th scope="col" className="text-right">Precision</th>
                          <th scope="col" className="text-right">Recall</th>
                          <th scope="col" className="text-right">F1</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.threshold_sweep.rows.map((row) => (
                          <tr
                            key={row.threshold}
                            className={
                              row.threshold === heldOut.operating_threshold
                                ? 'bg-brand-soft/60'
                                : undefined
                            }
                          >
                            <td className="text-right font-mono tabular-nums">
                              {row.threshold.toFixed(2)}
                            </td>
                            <td className="text-right font-mono tabular-nums">
                              {pct(row.precision)}
                            </td>
                            <td className="text-right font-mono tabular-nums">
                              {pct(row.recall)}
                            </td>
                            <td className="text-right font-mono tabular-nums">
                              {num(row.f1)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="card">
            <div className="p-4">
              <UnavailableBlock
                message={
                  data.evaluation_note ??
                  'No transcribed held-out evaluation is available for this model.'
                }
              />
            </div>
          </div>
        )}

        {/* ── What the deployed booster actually measures ── */}
        <div className="card">
          <div className="card-header">
            <div>
              <p className="card-title">{artifact.label}</p>
              <p className="text-[11.5px] text-ink-muted">
                {artifact.n_samples
                  ? `${artifact.n_samples.toLocaleString()} samples`
                  : 'Sample count not recorded'}
              </p>
            </div>
          </div>
          <div className="space-y-3 p-4">
            <div className="grid gap-3 sm:grid-cols-4">
              <Stat label="ROC-AUC" value={num(artifact.roc_auc, 4)} />
              <Stat label="PR-AUC" value={num(artifact.pr_auc, 4)} />
              <Stat label="MCC" value={num(artifact.mcc, 4)} />
              <Stat label="Accuracy" value={pct(artifact.accuracy)} />
            </div>
            <p className="flex items-start gap-1.5 text-[11.5px] leading-relaxed text-ink-muted">
              <Info className="mt-0.5 h-3 w-3 flex-shrink-0" />
              <span>{artifact.note}</span>
            </p>
          </div>
        </div>

        {/* ── Feature importance ── */}
        {importanceRows.length > 0 && (
          <div className="card">
            <div className="card-header">
              <div>
                <p className="card-title">Feature importance</p>
                <p className="text-[11.5px] text-ink-muted">
                  Mean absolute SHAP value over the stored background sample.
                </p>
              </div>
            </div>
            <div className="p-4">
              <div className="h-[360px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={importanceRows}
                    layout="vertical"
                    margin={{ top: 4, right: 48, bottom: 4, left: 8 }}
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
                      width={200}
                      tick={{ fill: axisColor, fontSize: 11 }}
                    />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={(value: number) => [num(value, 4), 'Mean |SHAP|']}
                    />
                    <Bar dataKey="importance" fill="#0891b2" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* ── Confidence bands ── */}
        {typeof data.confidence_bands?.high === 'number' && (
          <div className="card">
            <div className="card-header">
              <p className="card-title">Confidence bands used by this interface</p>
            </div>
            <div className="p-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <Stat label="HIGH" value={`≥ ${data.confidence_bands.high}`} hint="confidence" />
                <Stat label="MODERATE" value={`≥ ${data.confidence_bands.moderate}`} hint="confidence" />
                <Stat label="LOW" value={`< ${data.confidence_bands.moderate}`} hint="confidence" />
              </div>
              <p className="mt-3 text-[11.5px] leading-relaxed text-ink-muted">
                {String(data.confidence_bands.note)}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}