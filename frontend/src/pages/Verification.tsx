import { useMemo } from 'react';
import { useVerification } from '../hooks';
import { PageHeader, LoadingBlock, UnavailableBlock } from '../components/PageHeader';

export default function Verification() {
  const { data, isLoading } = useVerification();

  /** Field documentation the backend returns when no archive is attached. */
  const recordShape = useMemo(
    () => Object.entries(data?.expected_record_shape ?? {}),
    [data?.expected_record_shape]
  );

  return (
    <div className="flex min-h-screen flex-col">
      <PageHeader
        title="Verification"
        description="Comparing a stored medium-range forecast against the rainfall that was actually measured at the same place and time is what turns a predicted bust into a confirmed one."
      />

      <div className="flex-1 space-y-4 p-4">
        {isLoading && (
          <div className="card">
            <LoadingBlock label="Checking for a verification archive…" />
          </div>
        )}

        {!isLoading && !data?.available && (
          <div className="card">
            <div className="p-4">
              <UnavailableBlock
                message={
                  data?.message ??
                  'No verification archive is attached to this prototype, so no forecast-versus-observation comparison can be shown.'
                }
              />
            </div>
          </div>
        )}

        {!isLoading && data?.available && (
          <>
            <div className="card">
              <div className="card-header">
                <p className="card-title">Comparison rows</p>
                <span className="text-[11px] text-ink-muted">
                  {data.results.length} points
                  {data.reference_dataset ? ` · ${data.reference_dataset}` : ''}
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
                    {data.results.map((r, idx) => (
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

            <p className="text-[11.5px] leading-relaxed text-ink-muted">
              A cell is flagged as a bust when the absolute error exceeds the tolerance for
              that cell. Tolerances depend on the lead time and the expected rainfall, so
              they are carried in the archive alongside each comparison.
            </p>
          </>
        )}

        {!isLoading && recordShape.length > 0 && (
          <div className="card">
            <div className="card-header">
              <div>
                <p className="card-title">How this page is fed</p>
                <p className="text-[11.5px] text-ink-muted">
                  The backend reads a verification archive from disk when one is configured.
                </p>
              </div>
            </div>
            <div className="p-4">
              <p className="mb-2 text-[12.5px] text-ink-muted">
                Each row must carry these fields. Without them a comparison cannot be
                reproduced, so partial rows are not served.
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
