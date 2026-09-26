import { useState } from 'react';
import { Settings as SettingsIcon, Save, RefreshCw } from 'lucide-react';
import { useApiHealth } from '../hooks/useForecast';
import StatusBadge from '../components/StatusBadge';
import clsx from 'clsx';

const DEFAULT_SETTINGS = {
  model: 'GFS + NCMRWF-UMD',
  cycle: '00 UTC',
  variable: 'Precipitation',
  leadTime: 'D5',
  region: 'India',
  riskThreshold: 50,
  mapLayer: 'Bust Probability',
  apiUrl: 'http://localhost:8000',
};

const MODELS = ['GFS + NCMRWF-UMD', 'ECMWF', 'NCUM', 'CFS'];
const CYCLES = ['00 UTC', '06 UTC', '12 UTC', '18 UTC'];
const VARIABLES = ['Precipitation', 'Temperature', 'Wind', 'Pressure'];
const DAYS = ['D1','D2','D3','D4','D5','D6','D7','D8','D9','D10'];
const REGIONS = ['India', 'North India', 'South India', 'East India', 'West India', 'Northeast India'];
const LAYERS = ['Bust Probability', 'Confidence', 'Forecast', 'Error'];

export default function Settings() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [saved, setSaved] = useState(false);
  const { data: apiStatus, refetch: recheckApi } = useApiHealth();

  function update(key, value) {
    setSettings(s => ({ ...s, [key]: value }));
    setSaved(false);
  }

  function handleSave() {
    // In real app: persist to localStorage / API
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="flex flex-col gap-4 max-w-2xl animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-2">
        <SettingsIcon className="text-slate-400" size={18} />
        <h1 className="text-white font-bold text-xl">Settings</h1>
      </div>

      {/* Forecast config */}
      <Section title="Forecast Configuration">
        <SettingRow label="Forecast Model" desc="NWP model source for reliability analysis">
          <Select value={settings.model} options={MODELS} onChange={v => update('model', v)} />
        </SettingRow>
        <SettingRow label="Forecast Cycle" desc="Analysis initialization time">
          <Select value={settings.cycle} options={CYCLES} onChange={v => update('cycle', v)} />
        </SettingRow>
        <SettingRow label="Default Variable" desc="Variable shown on first load">
          <Select value={settings.variable} options={VARIABLES} onChange={v => update('variable', v)} />
        </SettingRow>
        <SettingRow label="Default Lead Time" desc="Default forecast day for maps and tables">
          <Select value={settings.leadTime} options={DAYS} onChange={v => update('leadTime', v)} />
        </SettingRow>
      </Section>

      {/* Display config */}
      <Section title="Display Configuration">
        <SettingRow label="Default Region" desc="Geographic focus area">
          <Select value={settings.region} options={REGIONS} onChange={v => update('region', v)} />
        </SettingRow>
        <SettingRow label="Default Map Layer" desc="Layer displayed on Overview and Forecast Map">
          <Select value={settings.mapLayer} options={LAYERS} onChange={v => update('mapLayer', v)} />
        </SettingRow>
        <SettingRow label="Risk Threshold (%)" desc="Minimum bust probability shown on maps and tables">
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={10} max={90} step={5}
              value={settings.riskThreshold}
              onChange={e => update('riskThreshold', Number(e.target.value))}
              className="w-32 accent-accent-cyan"
            />
            <span className="text-white font-mono w-12">{settings.riskThreshold}%</span>
          </div>
        </SettingRow>
      </Section>

      {/* API config */}
      <Section title="API Configuration">
        <SettingRow label="Backend API URL" desc="FastAPI base URL (set USE_MOCK=false in api.js to activate)">
          <input
            type="text"
            value={settings.apiUrl}
            onChange={e => update('apiUrl', e.target.value)}
            className="bg-navy-600 border border-border text-slate-200 text-sm rounded-md px-3 py-1.5 focus:outline-none focus:border-accent-cyan w-60 font-mono"
            placeholder="http://localhost:8000"
          />
        </SettingRow>
        <SettingRow label="API Status" desc="Current connection status">
          <div className="flex items-center gap-3">
            {apiStatus && <StatusBadge status={apiStatus.status} />}
            <button
              onClick={() => recheckApi()}
              className="btn-ghost flex items-center gap-1.5 py-1"
            >
              <RefreshCw size={11} />
              <span className="text-xs">Re-check</span>
            </button>
          </div>
        </SettingRow>
        {apiStatus?.message && (
          <p className="text-xs text-slate-500 mt-1 pl-44">{apiStatus.message}</p>
        )}
      </Section>

      {/* Save */}
      <div className="flex items-center gap-3">
        <button onClick={handleSave} className={clsx('btn-primary flex items-center gap-2', saved && 'bg-confidence-very-high text-white')}>
          <Save size={13} />
          {saved ? 'Saved!' : 'Save Settings'}
        </button>
        <button onClick={() => setSettings(DEFAULT_SETTINGS)} className="btn-ghost">
          Reset to defaults
        </button>
      </div>

      <p className="text-[11px] text-slate-500">
        Settings are stored locally and applied to the current session. Backend API connection requires setting USE_MOCK=false in src/services/api.js.
      </p>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="card space-y-4">
      <p className="section-title mb-0">{title}</p>
      {children}
    </div>
  );
}

function SettingRow({ label, desc, children }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2 border-b border-navy-700 last:border-b-0">
      <div className="min-w-0">
        <p className="text-white text-sm font-medium">{label}</p>
        <p className="text-slate-500 text-xs">{desc}</p>
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}

function Select({ value, options, onChange }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="bg-navy-600 border border-border text-slate-200 text-sm rounded-md px-3 py-1.5 focus:outline-none focus:border-accent-cyan"
    >
      {options.map(o => (
        <option key={o} value={o}>{o}</option>
      ))}
    </select>
  );
}
