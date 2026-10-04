import { useMemo } from 'react';
import { BookOpen, Database, HelpCircle } from 'lucide-react';
import { useVerification } from '../hooks';
import { LoadingBlock, PageHeader, UnavailableBlock } from '../components/PageHeader';

/**
 * Why this page carries no numbers.
 *
 * The measured skill figures exist and are real: they are transcribed from the
 * training notebook into `backend/models/notebook_evaluation.json` and served by
 * `GET /api/verification` under `model_skill`. They are written up in the project
 * README instead of rendered here, so there is one copy of them rather than two
 * that could drift apart. This page therefore states what was verified and how,
 * and leaves the figures to the document that owns them.
 */
export default function Verification() {
  const { data, isLoading } = useVerification();

  const skill = data?.model_skill;
  const archive = data?.archive;

  const recordShape = useMemo(
    () => Object.entries(archive?.expected_record_shape ?? {}),
    [archive?.expected_record_shape]
  );

  /** True when the notebook figures exist but this build was told not to serve them. */
  const figuresDeferred = !isLoading && skill !== undefined && !skill.available;

  return (
    <div className="flex min-h-screen flex-col">
      <PageHeader
        title="Verification"
        description="Whether a bust was forecast correctly, and what it would take to prove it for a single location."
      />

      <div className="flex-1 space-y-4 p-4">
        {isLoading && (
          <div className="card">
            <LoadingBlock label="Checking what verification data is attached…" />
          </div>
        )}

        {/* ---------- What verification means ---------- */}
        <div className="card">
          <div className="card-header">
            <div className="flex items-center gap-2">
              <HelpCircle className="h-3.5 w-3.5 text-ink-muted" />
              <p className="card-title">Two different questions</p>
            </div>
          </div>
          <div className="space-y-3 p-4 text-[12.5px] leading-relaxed text-ink-muted">
            <p>
              <span className="font-medium text-ink">
                Does this model flag busts well?
              </span>{' '}
              Answered once, offline. The tuned model was evaluated against
              reanalysis truth on a held-out September 2019 split that it was
              neither fitted nor tuned on, and scored on every forecast in it: how
              many busts it caught, how many it invented, how well its probabilities
              were calibrated, and how those trade-offs move as the decision
              threshold changes.
            </p>
            <p>
              <span className="font-medium text-ink">
                Did this specific forecast actually bust?
              </span>{' '}
              Not answered here, and not answerable from a forecast alone. It takes a
              stored medium-range forecast paired with the rainfall that was actually
              measured at the same place and time. This model estimates the probability
              of a bust from forecast meteorology; it never observes the outcome, so
              it cannot confirm one.
            </p>
            <p>
              The first question is settled and its full result — confusion matrix,
              discrimination scores, calibration effect, threshold sweep — is written
              up in the project README. It is not repeated on this page, so that there
              is a single copy of those figures rather than two that could drift apart.
            </p>
          </div>
        </div>

        {/* ---------- Status of each ---------- */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="card">
            <div className="card-header">
              <div className="flex items-center gap-2">
                <BookOpen className="h-3.5 w-3.5 text-ink-muted" />
                <p className="card-title">Model skill</p>
              </div>
            </div>
            <div className="space-y-2 p-4 text-[12.5px] leading-relaxed text-ink-muted">
              {isLoading ? (
                <LoadingBlock label="Checking…" />
              ) : figuresDeferred ? (
                <p>
                  {skill?.message ??
                    'The transcribed evaluation record is not being served by this build.'}
                </p>
              ) : (
                <>
                  <p>
                    Verified once against reanalysis truth on a held-out September 2019
                    split, offline, with the fitted model neither trained nor tuned on
                    it. The figures are a fixed record of that run: they are not
                    operational statistics, they do not update as new forecasts verify,
                    and that split is not present in this deployment to re-score.
                  </p>
                  <p className="text-ink-muted">
                    Published in the project README under the model&apos;s evaluation
                    section.
                  </p>
                </>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div className="flex items-center gap-2">
                <Database className="h-3.5 w-3.5 text-ink-muted" />
                <p className="card-title">Per-location verification</p>
              </div>
            </div>
            <div className="space-y-2 p-4 text-[12.5px] leading-relaxed text-ink-muted">
              {isLoading ? (
                <LoadingBlock label="Checking…" />
              ) : archive?.available ? (
                <p>
                  An archive is attached, so individual forecasts can be compared
                  against the rainfall measured at the same place and time.
                </p>
              ) : (
                <UnavailableBlock
                  message={
                    archive?.message ??
                    'No verification archive is attached, so no individual bust can be confirmed here.'
                  }
                />
              )}
            </div>
          </div>
        </div>

        {/* ---------- What an archive would need ---------- */}
        {!isLoading && archive && !archive.available && recordShape.length > 0 && (
          <div className="card">
            <div className="card-header">
              <p className="card-title">How per-location verification is fed</p>
            </div>
            <div className="p-4">
              <p className="text-[12.5px] leading-relaxed text-ink-muted">
                The backend reads a forecast/observation archive from disk when one is
                configured at <span className="font-mono text-ink">VERIFICATION_ARCHIVE_PATH</span>.
                Each row must carry all of these fields; without them a comparison could
                not be reproduced, so partial rows are not served.
              </p>
              <div className="table-wrap mt-3">
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

        {/* ---------- Archive rows, when one is attached ---------- */}
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