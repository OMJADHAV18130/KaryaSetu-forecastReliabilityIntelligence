import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Map, AlertTriangle, CheckCircle,
  BrainCircuit, Clock, BarChart2, Settings, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { useState } from 'react';
import clsx from 'clsx';

const NAV_ITEMS = [
  { to: '/overview',           icon: LayoutDashboard, label: 'Overview'         },
  { to: '/forecast-map',       icon: Map,             label: 'Forecast Map'     },
  { to: '/bust-detection',     icon: AlertTriangle,   label: 'Bust Detection'   },
  { to: '/verification',       icon: CheckCircle,     label: 'Verification'     },
  { to: '/ai-explanation',     icon: BrainCircuit,    label: 'AI Explanation'   },
  { to: '/historical-events',  icon: Clock,           label: 'Historical Events'},
  { to: '/model-performance',  icon: BarChart2,       label: 'Model Performance'},
  { to: '/settings',           icon: Settings,        label: 'Settings'         },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={clsx(
        'fixed left-0 top-14 bottom-0 z-40 bg-white border-r border-slate-200 flex flex-col transition-all duration-200 shadow-2xs',
        collapsed ? 'w-14' : 'w-52'
      )}
    >
      <nav className="flex-1 py-3 overflow-y-auto">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-3 py-2.5 mx-2 rounded-lg text-sm transition-colors group relative',
                isActive
                  ? 'bg-blue-50 text-blue-700 font-semibold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
              )
            }
            title={collapsed ? label : undefined}
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-blue-600 rounded-r" />
                )}
                <Icon size={16} className={clsx('flex-shrink-0', isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600')} />
                {!collapsed && <span className="truncate">{label}</span>}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(c => !c)}
        className="flex items-center justify-center h-10 border-t border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors"
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>
    </aside>
  );
}
