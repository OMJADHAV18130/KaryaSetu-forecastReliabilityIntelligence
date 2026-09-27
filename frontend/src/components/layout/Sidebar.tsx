import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Map,
  AlertTriangle,
  CheckCircle,
  History,
  BarChart3,
  Settings,
  Shield,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { useHealth } from '../../hooks';

const navItems = [
  { path: '/', label: 'Overview', icon: LayoutDashboard },
  { path: '/map', label: 'Forecast Map', icon: Map },
  { path: '/bust-detection', label: 'Bust Detection', icon: AlertTriangle },
  { path: '/verification', label: 'Verification', icon: CheckCircle },
  { path: '/historical', label: 'Historical Events', icon: History },
  { path: '/explainability', label: 'Explainability', icon: BarChart3 },
  { path: '/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar() {
  const { data: health } = useHealth();
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <aside
      className={`${
        isCollapsed ? 'w-16' : 'w-64'
      } bg-surface-900 border-r border-surface-700 flex flex-col h-screen sticky top-0 transition-all duration-300 ease-in-out select-none flex-shrink-0 z-30`}
    >
      {/* Brand Header */}
      <div className={`border-b border-surface-700 ${isCollapsed ? 'p-3 flex flex-col items-center gap-2' : 'p-4 flex items-center justify-between'}`}>
        <div className="flex items-center gap-3 overflow-hidden">
          <Shield className="w-7 h-7 text-accent flex-shrink-0" />
          {!isCollapsed && (
            <div className="truncate">
              <h1 className="text-base font-bold text-white tracking-wide">KARYASETU</h1>
              <p className="text-[10px] text-slate-400 leading-tight">Forecast Reliability Intelligence</p>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-surface-800 transition-colors focus:outline-none"
          title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          aria-label={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {isCollapsed ? <PanelLeftOpen className="w-4 h-4 text-accent" /> : <PanelLeftClose className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 overflow-y-auto space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              title={isCollapsed ? item.label : undefined}
              className={({ isActive }) =>
                `flex items-center ${
                  isCollapsed ? 'justify-center px-2 py-3 mx-2 rounded-lg' : 'gap-3 px-5 py-3'
                } text-sm transition-colors ${
                  isActive
                    ? isCollapsed
                      ? 'bg-accent/20 text-accent font-semibold'
                      : 'bg-accent/10 text-accent border-r-2 border-accent font-medium'
                    : 'text-slate-400 hover:bg-surface-800 hover:text-white'
                }`
              }
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {!isCollapsed && <span className="truncate">{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* Status Footer */}
      <div className={`border-t border-surface-700 ${isCollapsed ? 'p-3 flex justify-center' : 'p-4'}`}>
        {isCollapsed ? (
          <div
            className="flex items-center justify-center p-1 cursor-help"
            title={health?.model_loaded ? 'Model Online (Trained v2 Active)' : 'Model Offline'}
          >
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                health?.model_loaded ? 'bg-green-500 shadow-sm shadow-green-500/50' : 'bg-red-500'
              } animate-pulse`}
            />
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span
                className={`w-2 h-2 rounded-full ${
                  health?.model_loaded ? 'bg-green-500 shadow-sm shadow-green-500/50' : 'bg-red-500'
                } animate-pulse`}
              />
              <span className="text-xs text-slate-400 font-medium">
                {health?.model_loaded ? 'Model Online' : 'Model Offline'}
              </span>
            </div>
            <p className="text-[10px] text-slate-500 text-center tracking-wider uppercase font-semibold">Research Prototype</p>
          </div>
        )}
      </div>
    </aside>
  );
}
