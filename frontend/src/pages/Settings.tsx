import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Database, Info, Settings as SettingsIcon } from 'lucide-react';
import { getHealth, getModelInfo, getModelPerformance, isMockMode } from '../services/api';
import { useTheme } from '../lib/theme';
import {
  LoadingBlock,
  PageHeader,
  UnavailableBlock,
} from '../components/PageHeader';
import type { HealthStatus, ModelPerformance } from '../types';

const THEME_LABELS: Record<string, string> = {
  light: 'Light',
  dark: 'Dark',
};

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line py-2 last:border-0">
      <span className="text-[12.5px] text-ink-muted">{label}</span>
      <span className="font-mono text-[12.5px] font-semibold text-ink">{value}</span>
    </div>
  );
}

export default function Settings() {
  const { theme } = useTheme();

  const apiMode = import.meta.env.VITE_API_MODE || 'live';
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

  // Read version and feature count from the API rather than restating them here,
  // so this page cannot drift away from the model that is actually loaded.
  const info = useQuery({
    queryKey: ['modelInfo'],
    queryFn: getModelInfo,
    enabled: !isMockMode,
    retry: false,
  });

  const performance = useQuery<ModelPerformance>({
    queryKey: ['modelPerformance'],
    queryFn: getModelPerformance,
    enabled: isMockMode,
    retry: false,
  });

  const health = useQuery<HealthStatus>({
    queryKey: ['health'],
    queryFn: getHealth,
    enabled: !isMockMode,
    retry: false,
  });

  const version = info.data?.model_version;
  const featureCount =
    info.data?.feature_count ?? performance.data?.feature_count ?? null;
  const splits = info.isSuccess ? null : performance.data?.splits;

  return (
    <div className="flex min-h-screen flex-col">
      <PageHeader
        title="Settings"
        description="How this build is configured, and what it is honest about."
      />

      <div className="flex-1 space-y-4 p-4">
        <div className="card">
          <div className="card-header">
            <div className="flex items-center gap-2">
              <SettingsIcon className="h-4 w-4 text-brand" />
              <p className="card-title">Appearance</p>
            </div>
          </div>
          <div className="p-4">
            <Row
              label="Theme"
              value={`${THEME_LABELS[theme] ?? theme} (switch with the toggle in the sidebar)`}
            />
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-brand" />
              <p className="card-title">API connection</p>
            </div>
          </div>
          <div className="p-4">
            <Row label="Mode" value={apiMode === 'mock' ? 'mock (offline demo)' : 'live'} />
            <Row label="Base URL" value={apiBaseUrl} />

            {isMockMode ? (
              <p className="mt-3 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-[12px] leading-relaxed text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
                Offline demo mode. The trained model is not loaded, so pages that
                need it report that they are unavailable rather than showing
                substitute numbers.
              </p>
            ) : (
              <div className="mt-3">
                {health.isPending && <LoadingBlock label="Checking the API…" />}
                {health.isError && (
                  <UnavailableBlock message="The backend could not be reached, so its status is unknown." />
                )}
                {health.data && (
                  <Row
                    label="Backend status"
                    value={health.data.status}
                  />
                )}
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-brand" />
              <p className="card-title">Model</p>
            </div>
          </div>
          <div className="p-4">
            {!isMockMode && info.isPending && <LoadingBlock label="Reading model metadata…" />}
            {!isMockMode && info.isError && (
              <UnavailableBlock message="Model metadata could not be read from the API." />
            )}

            <Row label="Type" value={info.data?.model_type ?? 'XGBoost + sigmoid calibration'} />
            <Row label="Version" value={version ?? (isMockMode ? 'not loaded in mock mode' : '—')} />
            <Row
              label="Features read"
              value={featureCount === null ? '—' : String(featureCount)}
            />
            <Row label="Domain" value="8°N–37°N, 68°E–98°E" />
            <Row label="Lead time" value="24–240 h (Day 1–Day 10)" />

            {splits && (
              <p className="mt-3 text-[11.5px] leading-relaxed text-ink-muted">
                Training {splits.train}; validation {splits.validation}; test {splits.test}.
              </p>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-brand" />
              <p className="card-title">Data sources</p>
            </div>
          </div>
          <div className="space-y-2 p-4">
            <Row label="Training split" value="June–July 2019" />
            <Row label="Validation split" value="August 2019" />
            <Row label="Test split" value="September 2019" />
            <p className="text-[11.5px] leading-relaxed text-ink-muted">
              WeatherBench2 HRES forecasts with ERA5 reanalysis. Research data
              only — no operational forecast feed is connected.
            </p>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-brand" />
              <p className="card-title">About this build</p>
            </div>
          </div>
          <div className="space-y-2 p-4 text-[12.5px] leading-relaxed text-ink-muted">
            <p>
              <span className="font-semibold text-ink">KaryaSetu</span> — Forecast
              Reliability Intelligence. A reliability layer that sits over an
              existing medium-range rainfall forecast and estimates how likely
              that forecast is to be badly wrong.
            </p>
            <p>
              Scope is rainfall forecast busts only. It does not detect cyclones,
              temperature errors, pressure errors or any other forecast variable.
            </p>
            <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
              Research prototype. Not an operational forecasting system. Scores
              are held-out test-set results, not live statistics.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
