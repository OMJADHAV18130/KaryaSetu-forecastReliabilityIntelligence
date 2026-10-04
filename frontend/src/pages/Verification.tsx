import { useMemo } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { CheckCircle2, Database, FlaskConical, Info } from 'lucide-react';
import { useVerification } from '../hooks';
import { useTheme } from '../lib/theme';
import { LoadingBlock, PageHeader, UnavailableBlock } from '../components/PageHeader';
import type { ModelSkill, VerificationArchive } from '../types';

/**
 * Rows of the four-cell matrix, in the order a confusion matrix is read:
 * what the model said against what turned out to be true.
 */
const MATRIX_LAYOUT = [
  {
    key: 'predicted_bust',
    rowLabel: 'Model predicted a bust',
    cells: [
      { key: 'true_positives', name: 'True positive', tone: 'rose', hint: 'A bust was forecast and a bust occurred' },
      { key: 'false_positives', name: 'False positive', tone: 'amber', hint: 'A bust was forecast but the forecast held' },
    ],
  },
  {
    key: 'predicted_ok',
    rowLabel: 'Model predicted no bust',
    cells: [
      { key: 'false_negatives', name: 'False negative', tone: 'amber', hint: 'The forecast was trusted and a bust occurred anyway' },
      { key: 'true_negatives', name: 'True negative', tone: 'emerald', hint: 'The forecast was trusted and it held' },
    ],
  },
] as const;

const CELL_TONE: Record<string, string> = {
  rose: 'border-rose-200 bg-rose-50 dark:border-rose-500/40 dark:bg-rose-500/10',
  amber: 'border-amber-200 bg-amber-50 dark:border-amber-500/40 dark:bg-amber-500/10',
  emerald: 'border-emerald-200 bg-emerald-50 dark:border-emerald-500/40 dark:bg-emerald-500/10',
};

function count(value: number | null | undefined): string {
  return typeof value === 'number' ? value.toLocaleString('en-IN') : 'DATA NOT AVAILABLE';
}

function score(value: number | null | undefined, digits = 3): string {
  return typeof value === 'number' ? value.toFixed(digits) : 'DATA NOT AVAILABLE';
}

function pct(value: number | null | undefined): string {
  return typeof value === 'number' ? `${(value * 100).toFixed(1)}%` : 'DATA NOT AVAILABLE';
}

function ScoreCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="card px-4 py-3">
      <p className="text-[11px] uppercase tracking-wide text-ink-muted">{label}</p>
      <p className="mt-1 font-mono text-[19px] font-semibold tabular-nums text-ink">{value}</p>
      <p className="mt-1 text-[11px] leading-snug text-ink-muted">{hint}</p>
    </div>
  );
}

export default function Verification() {
  const { data, isLoading } = useVerification();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const axisColor = isDark ? '#94a3b8' : '#475569';
  const gridColor = isDark ? '#334155' : '#e2e8f0';

  const skill: ModelSkill | undefined = data?.model_skill;
  const archive: VerificationArchive | undefined = data?.archive;

  const recordShape = useMemo(
    () => Object.entries(archive?.expected_record_shape ?? {}),
    [archive?.expected_record_shape]
  );

  const sweep = useMemo(() => skill?.threshold_sweep?.rows ?? [], [skill?.threshold_sweep]);
  const peak = useMemo(
    () => (sweep.length ? sweep.reduce((best, r) => (r.f1 > best.f1 ? r : best)) : null),
    [sweep]
  );

  return (
    <div className="flex min-h-screen flex-col">
      <PageHeader
        title="Verification"
        description="Did the model's bust predictions match what actually happened? Measured against reanalysis truth on a held-out test set the model was never fitted or tuned on."
      />

      <div className="flex-1 space-y-4 p-4">
        {isLoading && (
          <div className="card">
            <LoadingBlock label="Loading measured verification figures…" />
          </div>
        )}

        {/* ---------- Measured skill: the real evidence ---------- */}
        {!isLoading && skill && !skill.available && (
          <div className="card">
            <div className="p-4">
              <UnavailableBlock
                message={
                  skill.message ??
                  'The transcribed September 2019 evaluation file is missing, so no measured skill figures can be shown.'
                }
              />
            </div>
          </div>
        )}

        {!isLoading && skill?.available && (
          <>
            {/* Provenance banner. Stated first so no figure below it can be read
                as a live operational statistic. */}
            <div className="card border-l-4 border-l-brand">
              <div className="flex flex-wrap items-start gap-3 p-4">
                <FlaskConical className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand-ink" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="chip border border-brand/30 bg-brand-soft text-brand-ink">
                      {skill.label ?? 'September 2019 Test Set'}
                    </span>
                    <span className="text-[12.5px] text-ink-muted">
                      {count(skill.n_samples)} forecasts evaluated
                      {skill.n_bust ? ` · ${count(skill.n_bust)} confirmed busts` : ''}
                    </span>
                  </div>
                  <p className="mt-2 text-[11.5px] leading-relaxed text-ink-muted">
                    {skill.provenance}
                  </p>
                </div>
              </div>
            </div>

            {/* Skill scores */}
            <div>
              <div className="mb-2 flex items-baseline justify-between gap-3">
                <h2 className="text-[13.5px] font-semibold text-ink">Discrimination and calibration</h2>
                <span className="text-[11px] text-ink-muted">{skill.label}</span>
              </div>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <ScoreCard
                  label="ROC-AUC"
                  value={score(skill.roc_auc, 4)}
                  hint="Ranking quality across every threshold. 0.5 is coin-toss, 1.0 is perfect."
                />
                <ScoreCard
                  label="PR-AUC"
                  value={score(skill.pr_auc, 4)}
                  hint="Precision-recall area. The honest score when busts are rare, which they are: 6% of cases."
                />
                <ScoreCard
                  label="MCC"
                  value={score(skill.mcc, 4)}
                  hint="Single number balancing all four cells. Above 0 is better than chance."
                />
                <ScoreCard
                  label="Brier, calibrated"
                  value={score(skill.brier_calibrated, 4)}
                  hint={`Mean squared error of the probability itself, after ${skill.calibration_method ?? 'calibration'}. Was ${score(skill.brier_raw, 4)} before.`}
                />
              </div>
              <p className="mt-2 flex items-start gap-1.5 text-[11px] leading-relaxed text-ink-muted">
                <Info className="mt-px h-3 w-3 flex-shrink-0" />
                <span>
                  Calibration cut the Brier score from {score(skill.brier_raw, 4)} to{' '}
                  {score(skill.brier_calibrated, 4)}, which is the metric it is meant to
                  improve. It leaves ROC-AUC and PR-AUC unchanged, because sigmoid
                  calibration is monotonic and cannot reorder the model&apos;s ranking.
                </span>
              </p>
            </div>

            {/* Confusion matrix */}
            <div className="card">
              <div className="card-header">
                <div>
                  <p className="card-title">Confusion matrix</p>
                  <p className="text-[11.5px] text-ink-muted">
                    Every one of the {count(skill.n_samples)} test forecasts lands in exactly
                    one cell
                  </p>
                </div>
                <span className="text-[11px] text-ink-muted">
                  threshold {score(skill.operating_threshold, 2)}
                </span>
              </div>
              <div className="p-4">
                <div className="overflow-x-auto">
                  <div className="min-w-[520px]">
                    <div className="grid grid-cols-[130px_1fr_1fr] gap-2">
                      <div />
                      <p className="text-center text-[10.5px] uppercase tracking-wide text-ink-muted">
                        A bust occurred
                      </p>
                      <p className="text-center text-[10.5px] uppercase tracking-wide text-ink-muted">
                        No bust occurred
                      </p>

                      {MATRIX_LAYOUT.map((row) => (
                        <FragmentRow key={row.key} row={row} matrix={skill.confusion_matrix} />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 border-t border-line pt-3 text-[11.5px] text-ink-muted">
                  <span>
                    Caught <span className="font-mono tabular-nums text-ink">{pct(skill.recall_at_threshold)}</span>{' '}
                    of the {count(skill.n_bust)} real busts
                  </span>
                  <span>
                    Of everything flagged a bust,{' '}
                    <span className="font-mono tabular-nums text-ink">
                      {pct(skill.precision_at_threshold)}
                    </span>{' '}
                    really were
                  </span>
                </div>
                <p className="mt-2 flex items-start gap-1.5 text-[11px] leading-relaxed text-ink-muted">
                  <Info className="mt-px h-3 w-3 flex-shrink-0" />
                  <span>
                    The model is built to miss busts rather than invent them, so recall is
                    high and precision is low: it flags far more forecasts than turn out to
                    be busts. That is the right direction for a warning system, and it is
                    why the threshold matters.
                  </span>
                </p>
              </div>
            </div>

            {/* Threshold sweep */}
            {sweep.length > 0 && peak && (
              <div className="card">
                <div className="card-header">
                  <div>
                    <p className="card-title">Threshold sweep</p>
                    <p className="text-[11.5px] text-ink-muted">
                      Where the cut-off is placed decides what the flag is worth
                    </p>
                  </div>
                  <span className="text-[11px] text-ink-muted">
                    {skill.label}
                  </span>
                </div>
                <div className="p-4">
                  <div className="h-[260px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={sweep} margin={{ top: 8, right: 16, bottom: 4, left: -18 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                        <XAxis
                          dataKey="threshold"
                          stroke={axisColor}
                          tick={{ fill: axisColor, fontSize: 11 }}
                          tickFormatter={(v: number) => v.toFixed(2)}
                          label={{
                            value: 'Decision threshold',
                            position: 'insideBottom',
                            offset: -2,
                            fill: axisColor,
                            fontSize: 11,
                          }}
                        />
                        <YAxis
                          domain={[0, 1]}
                          ticks={[0, 0.25, 0.5, 0.75, 1]}
                          stroke={axisColor}
                          tick={{ fill: axisColor, fontSize: 11 }}
                          tickFormatter={(v: number) => v.toFixed(2)}
                        />
                        <Tooltip
                          contentStyle={{
                            background: isDark ? '#1e293b' : '#ffffff',
                            border: `1px solid ${gridColor}`,
                            borderRadius: 6,
                            fontSize: 12,
                          }}
                          formatter={(value: number, name: string) => [
                            value.toFixed(4),
                            name.charAt(0).toUpperCase() + name.slice(1),
                          ]}
                          labelFormatter={(label: number) => `Threshold ${Number(label).toFixed(2)}`}
                        />
                        <Legend
                          wrapperStyle={{ fontSize: 11, color: axisColor, paddingTop: 6 }}
                          formatter={(value: string) =>
                            value.charAt(0).toUpperCase() + value.slice(1)
                          }
                        />
                        <ReferenceDot
                          x={peak.threshold}
                          y={peak.f1}
                          r={5}
                          fill="#0f766e"
                          stroke="none"
                          label={{
                            value: `F1 peak ${peak.f1.toFixed(3)}`,
                            position: 'top',
                            fill: axisColor,
                            fontSize: 10.5,
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="precision"
                          stroke="#0f766e"
                          strokeWidth={2}
                          dot={{ r: 2 }}
                          activeDot={{ r: 4 }}
                        />
                        <Line
                          type="monotone"
                          dataKey="recall"
                          stroke="#b91c1c"
                          strokeWidth={2}
                          dot={{ r: 2 }}
                          activeDot={{ r: 4 }}
                        />
                        <Line
                          type="monotone"
                          dataKey="f1"
                          stroke="#1d4ed8"
                          strokeWidth={2}
                          strokeDasharray="4 3"
                          dot={{ r: 2 }}
                          activeDot={{ r: 4 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="mt-2 text-[11.5px] leading-relaxed text-ink-muted">
                    F1 peaks at threshold{' '}
                    <span className="font-mono tabular-nums text-ink">
                      {peak.threshold.toFixed(2)}
                    </span>{' '}
                    ({score(peak.f1, 3)}), where {pct(peak.precision)} of the flags are real
                    busts and {pct(peak.recall)} of real busts are caught. The{' '}
                    {score(skill.operating_threshold, 2)} operating point quoted above is the
                    scikit-learn default, not a tuned choice: it is far stricter, at{' '}
                    {pct(skill.precision_at_threshold)} precision and{' '}
                    {pct(skill.recall_at_threshold)} recall.
                  </p>
                  {skill.threshold_sweep?.note && (
                    <p className="mt-1 text-[11px] leading-relaxed text-ink-muted">
                      {skill.threshold_sweep.note}
                    </p>
                  )}
                </div>
              </div>
            )}

            {skill.notes && skill.notes.length > 0 && (
              <ul className="card space-y-1.5 p-4">
                {skill.notes.map((note) => (
                  <li
                    key={note}
                    className="flex items-start gap-2 text-[11.5px] leading-relaxed text-ink-muted"
                  >
                    <CheckCircle2 className="mt-px h-3 w-3 flex-shrink-0" />
                    <span>{note}</span>
                  </li>
                ))}
              </ul>
            )}

            {skill.source_notebook && (
              <p className="text-[11px] leading-relaxed text-ink-muted">
                Transcribed from {skill.source_notebook}
                {skill.source_cells?.length
                  ? `, cells ${skill.source_cells.join(', ')}`
                  : ''}
                . These figures are a static record of that notebook run, not a live
                computation: the September 2019 split is not present in this deployment,
                so nothing on this page can be recomputed or updated.
              </p>
            )}
          </>
        )}

        {/* ---------- Per-location archive: genuinely absent ---------- */}
        {!isLoading && archive && !archive.available && (
          <div className="card">
            <div className="card-header">
              <div className="flex items-center gap-2">
                <Database className="h-3.5 w-3.5 text-ink-muted" />
                <div>
                  <p className="card-title">Per-location forecast vs observation</p>
                  <p className="text-[11.5px] text-ink-muted">
                    Confirming an individual bust, rather than the model as a whole
                  </p>
                </div>
              </div>
            </div>
            <div className="p-4">
              <UnavailableBlock
                message={
                  archive.message ??
                  'No verification archive is attached, so no per-location comparison rows can be shown.'
                }
              />
              {recordShape.length > 0 && (
                <>
                  <p className="mt-4 text-[11.5px] leading-relaxed text-ink-muted">
                    This half of the page stays empty until a real archive is attached at{' '}
                    <span className="font-mono text-ink">VERIFICATION_ARCHIVE_PATH</span>.
                    Each row must carry all of these; without them a comparison could not be
                    reproduced, so partial rows are not served.
                  </p>
                  <div className="table-wrap mt-2">
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
                </>
              )}
            </div>
          </div>
        )}

        {/* Archive rows, when one is attached. */}
        {!isLoading && archive?.available && (
          <div className="card">
            <div className="card-header">
              <p className="card-title">Comparison rows</p>
              <span className="text-[11px] text-ink-muted">
                {archive.results.length} points
                {archive.reference_dataset ? ` · ${archive.reference_dataset}` : ''}
              </span>
            </div>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th scope="col">Location</th>
                    <th scope="col">Day</th>
                    <th scope="col" className="text-right">Forecast</th>
                    <th scope="col" className="text-right">Reference</th>
                    <th scope="col" className="text-right">Absolute error</th>
                    <th scope="col" className="text-right">Threshold</th>
                    <th scope="col">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {archive.results.map((r, idx) => (
                    <tr key={`${r.latitude}-${r.longitude}-${idx}`}>
                      <td className="font-mono text-[12.5px]">
                        {r.latitude.toFixed(2)}°N, {r.longitude.toFixed(2)}°E
                      </td>
                      <td>D{r.day}</td>
                      <td className="text-right font-mono tabular-nums">
                        {r.forecast_rainfall.toFixed(2)} mm
                      </td>
                      <td className="text-right font-mono tabular-nums">
                        {r.reference_rainfall.toFixed(2)} mm
                      </td>
                      <td className="text-right font-mono tabular-nums">
                        {r.absolute_error.toFixed(2)} mm
                      </td>
                      <td className="text-right font-mono tabular-nums">
                        {r.bust_threshold.toFixed(2)} mm
                      </td>
                      <td>
                        <span
                          className={`chip border ${
                            r.bust_status
                              ? 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/15 dark:text-rose-300'
                              : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-300'
                          }`}
                        >
                          {r.bust_status ? 'BUST' : 'WITHIN TOLERANCE'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/** One matrix row: a label plus its two cells. */
function FragmentRow({
  row,
  matrix,
}: {
  row: (typeof MATRIX_LAYOUT)[number];
  matrix: ModelSkill['confusion_matrix'];
}) {
  return (
    <>
      <div className="flex items-center pr-2 text-right text-[11.5px] leading-snug text-ink-muted">
        {row.rowLabel}
      </div>
      {row.cells.map((cell) => (
        <div
          key={cell.key}
          className={`rounded-md border px-3 py-2.5 ${CELL_TONE[cell.tone]}`}
        >
          <p className="text-[10.5px] uppercase tracking-wide text-ink-muted">{cell.name}</p>
          <p className="mt-0.5 font-mono text-[17px] font-semibold tabular-nums text-ink">
            {count(matrix?.[cell.key])}
          </p>
          <p className="mt-0.5 text-[10.5px] leading-snug text-ink-muted">{cell.hint}</p>
        </div>
      ))}
    </>
  );
}