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
  Activity,
} from 'lucide-react';
import { useHealth } from '../../hooks';

const navItems = [
  { path: '/', label: 'Overview', icon: LayoutDashboard },
  { path: '/map', label: 'Forecast Map', icon: Map },
  { path: '/bust-detection', label: 'Bust Detection', icon: AlertTriangle },
  { path: '/verification', label: 'Verification', icon: CheckCircle },
  { path: '/historical', label: 'Historical Events', icon: History },
  { path: '/explainability', label: 'Explainability', icon: BarChart3 },
  { path: '/model-performance', label: 'Model Performance', icon: Activity },
  { path: '/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar() {
  const { data: health } = useHealth();

  return (
    <aside className="w-64 bg-surface-900 border-r border-surface-700 flex flex-col h-screen sticky top-0">
      {/* Brand */}
      <div className="p-5 border-b border-surface-700">
        <div className="flex items-center gap-3">
          <Shield className="w-8 h-8 text-accent" />
          <div>
            <h1 className="text-lg font-bold text-white tracking-wide">KARYASETU</h1>
            <p className="text-xs text-slate-400 leading-tight">Forecast Reliability<br />Intelligence</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-5 py-3 text-sm transition-colors ${
                  isActive
                    ? 'bg-accent/10 text-accent border-r-2 border-accent'
                    : 'text-slate-400 hover:bg-surface-800 hover:text-white'
                }`
              }
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      {/* Status */}
      <div className="p-4 border-t border-surface-700">
        <div className="flex items-center gap-2 mb-2">
          <span className={`w-2 h-2 rounded-full ${health?.model_loaded ? 'bg-green-500' : 'bg-red-500'} animate-pulse`} />
          <span className="text-xs text-slate-400">
            {health?.model_loaded ? 'Model Online' : 'Model Offline'}
          </span>
        </div>
        <p className="text-xs text-slate-500 text-center tracking-wider">RESEARCH PROTOTYPE</p>
      </div>
    </aside>
  );
}
