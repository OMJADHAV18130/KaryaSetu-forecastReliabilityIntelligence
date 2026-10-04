import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../lib/theme';

const THEME_LABELS: Record<string, string> = {
  light: 'Light',
  dark: 'Dark',
};

const THEME_NOTES: Record<string, string> = {
  light: 'Light is the default. The map, the panels and the district tooltips all use the light palette until you switch.',
  dark: 'Dark is active. Every panel, table and chart on the site follows this setting.',
};

export default function Settings() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="flex min-h-screen flex-col">
      <div className="border-b border-line bg-panel px-5 py-4">
        <h1 className="text-[17px] font-bold tracking-tight text-ink">Settings</h1>
        <p className="mt-0.5 text-[12.5px] text-ink-muted">Appearance</p>
      </div>

      <div className="flex-1 p-4">
        <div className="card max-w-md">
          <div className="card-header">
            <p className="card-title">Theme</p>
          </div>

          <div className="space-y-4 p-4">
            <div className="flex items-center justify-between gap-4">
              <span className="text-[12.5px] text-ink-muted">Current theme</span>
              <span className="font-mono text-[12.5px] font-semibold text-ink">
                {THEME_LABELS[theme] ?? theme}
              </span>
            </div>

            <button
              type="button"
              onClick={toggleTheme}
              className="flex w-full items-center justify-center gap-2 rounded-md border border-line bg-raised px-3 py-2.5 text-[12.5px] font-semibold text-ink transition-colors hover:border-line-strong"
              title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            >
              {theme === 'dark' ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
              <span>Switch to {theme === 'dark' ? 'Light' : 'Dark'} Mode</span>
            </button>

            <p className="text-[11.5px] leading-relaxed text-ink-muted">
              {THEME_NOTES[theme] ?? ''}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}