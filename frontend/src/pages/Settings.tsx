import { Settings as SettingsIcon, Database, Code, Info } from 'lucide-react';

export default function Settings() {
  const apiMode = import.meta.env.VITE_API_MODE || 'mock';
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-1">SETTINGS</h1>
        <p className="text-sm text-slate-400">Application configuration</p>
      </div>

      <div className="space-y-4">
        {/* API Configuration */}
        <div className="bg-surface-800 p-6 rounded-lg border border-surface-700">
          <div className="flex items-center gap-2 mb-4">
            <Database className="w-5 h-5 text-accent" />
            <h2 className="text-lg font-semibold text-white">API Configuration</h2>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-slate-400 mb-1">API Mode</p>
              <p className="text-sm text-white font-mono">{apiMode}</p>
              <p className="text-xs text-slate-500 mt-1">
                {apiMode === 'mock' ? 'Using demo data (labeled as DEMO DATA)' : 'Connected to live API'}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-1">API Base URL</p>
              <p className="text-sm text-white font-mono">{apiBaseUrl}</p>
            </div>
          </div>
        </div>

        {/* Model Information */}
        <div className="bg-surface-800 p-6 rounded-lg border border-surface-700">
          <div className="flex items-center gap-2 mb-4">
            <Code className="w-5 h-5 text-accent" />
            <h2 className="text-lg font-semibold text-white">Model Information</h2>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-slate-400">Model Type</p>
              <p className="text-white">XGBoost + Sigmoid Calibration</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Model Version</p>
              <p className="text-white">xgb-rainfall-bust-v1</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Features</p>
              <p className="text-white">11 meteorological features</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Domain</p>
              <p className="text-white">8°N–37°N, 68°E–98°E</p>
            </div>
          </div>
        </div>

        {/* About */}
        <div className="bg-surface-800 p-6 rounded-lg border border-surface-700">
          <div className="flex items-center gap-2 mb-4">
            <SettingsIcon className="w-5 h-5 text-accent" />
            <h2 className="text-lg font-semibold text-white">About</h2>
          </div>
          <div className="text-sm text-slate-400 space-y-2">
            <p>
              <strong className="text-white">KaryaSetu</strong> — Forecast Reliability Intelligence
            </p>
            <p>
              AI-based forecast bust detection for medium-range rainfall forecasts.
              This system adds a reliability layer over existing NWP forecasts.
            </p>
            <p className="text-yellow-400">
              Research prototype. Not an operational NCMRWF system.
            </p>
          </div>
        </div>

        {/* Data Sources */}
        <div className="bg-surface-800 p-6 rounded-lg border border-surface-700">
          <div className="flex items-center gap-2 mb-4">
            <Info className="w-5 h-5 text-accent" />
            <h2 className="text-lg font-semibold text-white">Data Sources</h2>
          </div>
          <div className="text-sm text-slate-400 space-y-1">
            <p>Training: WeatherBench2 HRES + ERA5 (June–July 2019)</p>
            <p>Validation: August 2019</p>
            <p>Testing: September 2019</p>
            <p className="text-xs text-slate-500 mt-2">
              Research training data. Not operational NCMRWF forecasts.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
