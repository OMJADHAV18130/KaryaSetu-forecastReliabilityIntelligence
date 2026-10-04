import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Map,
  Search,
  AlertTriangle,
  LineChart,
  BarChart3,
  Settings,
  Shield,
  PanelLeftClose,
  PanelLeftOpen,
  Sun,
  Moon,
} from 'lucide-react';
import { useHealth } from '../../hooks';
import { useTheme } from '../../lib/theme';

const navItems = [
  { path: '/', label: 'Overview', icon: LayoutDashboard },
  { path: '/map', label: 'Bust Risk Map', icon: Map },
  { path: '/search', label: 'Location Search', icon: Search },
  { path: '/time-series', label: 'Time Series', icon: LineChart },
  { path: '/bust-detection', label: 'Bust Detection', icon: AlertTriangle },
  { path: '/explainability', label: 'Explainability', icon: BarChart3 },
  { path: '/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar() {
  const { data: health } = useHealth();
  const { theme, toggleTheme } = useTheme();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const online = Boolean(health?.model_loaded);

  return (
    <aside
      className={`${
        isCollapsed ? 'w-16' : 'w-60'
      } bg-panel border-r border-line flex flex-col h-screen sticky top-0 transition-all duration-300 ease-in-out select-none flex-shrink-0 z-30`}
    >
      {/* Brand Header */}
      <div
        className={`border-b border-line ${
          isCollapsed
            ? 'p-3 flex flex-col items-center gap-2'
            : 'p-4 flex items-center justify-between'
        }`}
      >
        <div className="flex items-center gap-2.5 overflow-hidden">
          <span className="w-8 h-8 rounded-md bg-brand text-white flex items-center justify-center flex-shrink-0">
            <Shield className="w-4.5 h-4.5" />
          </span>
          {!isCollapsed && (
            <div className="truncate leading-tight">
              <h1 className="text-[15px] font-bold text-ink tracking-tight">KaryaSetu</h1>
              <p className="text-[10.5px] text-ink-muted">Forecast Reliability</p>
            </div>
          )}
        </div>
        {!isCollapsed && (
          <button
            type="button"
            onClick={() => setIsCollapsed(true)}
            className="p-1.5 rounded-md text-ink-muted hover:text-ink hover:bg-raised transition-colors"
            title="Collapse menu"
            aria-label="Collapse menu"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              title={isCollapsed ? item.label : undefined}
              className={({ isActive }) =>
                `flex items-center ${
                  isCollapsed ? 'justify-center px-2 py-2.5 mx-2 rounded-md' : 'gap-3 px-4 py-2.5'
                } text-[13.5px] transition-colors ${
                  isActive
                    ? isCollapsed
                      ? 'bg-brand-soft text-brand-ink font-semibold'
                      : 'bg-brand-soft text-brand-ink font-semibold border-r-[3px] border-brand'
                    : 'text-ink-muted hover:bg-raised hover:text-ink'
                }`
              }
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {!isCollapsed && <span className="truncate">{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* Theme toggle */}
      <div className="px-3 pb-3">
        <button
          type="button"
          onClick={toggleTheme}
          className={`w-full flex items-center rounded-md border border-line bg-raised text-ink-muted hover:text-ink hover:border-line-strong transition-colors ${
            isCollapsed ? 'justify-center p-2' : 'gap-2 px-3 py-2 text-[12.5px]'
          }`}
          title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          {!isCollapsed && (
            <span className="font-medium">{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
          )}
        </button>
      </div>

      {/* Status Footer */}
      <div
        className={`border-t border-line ${
          isCollapsed ? 'p-3 flex flex-col items-center gap-2' : 'p-4'
        }`}
      >
        {isCollapsed ? (
          <button
            type="button"
            onClick={() => setIsCollapsed(false)}
            className="p-1 rounded-md text-ink-muted hover:bg-raised hover:text-ink"
            title="Expand menu"
            aria-label="Expand menu"
          >
            <PanelLeftOpen className="w-4 h-4" />
          </button>
        ) : null}

        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-2'}`}>
          <span
            className={`w-2 h-2 rounded-full flex-shrink-0 ${
              online ? 'bg-green-500' : 'bg-red-500'
            }`}
          />
          {!isCollapsed && (
            <span className="text-[11.5px] text-ink-muted">
              {online ? 'Model loaded' : 'Model unavailable'}
            </span>
          )}
        </div>
      </div>
    </aside>
  );
}
