import { useVerification } from '../hooks';
import { CheckCircle, XCircle } from 'lucide-react';

export default function Verification() {
  const { data, isLoading } = useVerification();

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="h-64 bg-surface-800 rounded-lg border border-surface-700 flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-slate-400">Loading verification data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!data?.available) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white mb-1">VERIFICATION</h1>
          <p className="text-sm text-slate-400">Forecast vs Reference Comparison</p>
        </div>

        <div className="bg-surface-800 border border-surface-700 rounded-lg p-12 text-center">
          <XCircle className="w-16 h-16 text-slate-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">NO VERIFICATION DATA</h2>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            {data?.message || 'Reference observations have not been connected for this forecast.'}
          </p>
          <p className="text-xs text-slate-500 mt-4">
            Verification compares model forecasts against ERA5 reference rainfall to determine bust status.
            This data source is not yet connected to the research prototype.
          </p>
        </div>

        {/* Expected structure */}
        <div className="mt-6 bg-surface-800 border border-surface-700 rounded-lg p-6">
          <p className="text-xs text-slate-400 uppercase tracking-wider mb-3">Expected Verification Structure</p>
          <div className="grid grid-cols-5 gap-4 text-sm">
            <div>
              <p className="text-slate-400 text-xs mb-1">Forecast Rainfall</p>
              <p className="text-white font-mono">mm</p>
            </div>
            <div>
              <p className="text-slate-400 text-xs mb-1">Reference Rainfall</p>
              <p className="text-white font-mono">mm</p>
            </div>
            <div>
              <p className="text-slate-400 text-xs mb-1">Absolute Error</p>
              <p className="text-white font-mono">mm</p>
            </div>
            <div>
              <p className="text-slate-400 text-xs mb-1">Bust Threshold</p>
              <p className="text-white font-mono">mm</p>
            </div>
            <div>
              <p className="text-slate-400 text-xs mb-1">Bust Status</p>
              <p className="text-white font-mono">Yes/No</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-1">VERIFICATION</h1>
        <p className="text-sm text-slate-400">Forecast vs Reference Comparison</p>
      </div>

      <div className="bg-surface-800 rounded-lg border border-surface-700 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-surface-700">
              <th className="text-left text-xs text-slate-400 uppercase tracking-wider p-3">Location</th>
              <th className="text-left text-xs text-slate-400 uppercase tracking-wider p-3">Day</th>
              <th className="text-left text-xs text-slate-400 uppercase tracking-wider p-3">Forecast</th>
              <th className="text-left text-xs text-slate-400 uppercase tracking-wider p-3">Reference</th>
              <th className="text-left text-xs text-slate-400 uppercase tracking-wider p-3">Error</th>
              <th className="text-left text-xs text-slate-400 uppercase tracking-wider p-3">Threshold</th>
              <th className="text-left text-xs text-slate-400 uppercase tracking-wider p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {data.results.map((r, idx) => (
              <tr key={idx} className="border-b border-surface-700/50">
                <td className="p-3 text-sm text-white">{r.latitude.toFixed(2)}°N, {r.longitude.toFixed(2)}°E</td>
                <td className="p-3 text-sm text-white">D{r.day}</td>
                <td className="p-3 text-sm text-white font-mono">{r.forecast_rainfall.toFixed(2)} mm</td>
                <td className="p-3 text-sm text-white font-mono">{r.reference_rainfall.toFixed(2)} mm</td>
                <td className="p-3 text-sm text-white font-mono">{r.absolute_error.toFixed(2)} mm</td>
                <td className="p-3 text-sm text-white font-mono">{r.bust_threshold.toFixed(2)} mm</td>
                <td className="p-3">
                  {r.bust_status ? (
                    <span className="px-2 py-0.5 text-xs rounded bg-red-500/20 text-red-400">BUST</span>
                  ) : (
                    <span className="px-2 py-0.5 text-xs rounded bg-green-500/20 text-green-400">OK</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
