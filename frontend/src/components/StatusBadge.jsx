import clsx from 'clsx';

export default function StatusBadge({ status, size = 'sm' }) {
  const config = {
    HIGH:        { cls: 'severity-high',   label: 'HIGH'        },
    CRITICAL:    { cls: 'severity-high',   label: 'CRITICAL'    },
    MEDIUM:      { cls: 'severity-medium', label: 'MEDIUM'      },
    LOW:         { cls: 'severity-low',    label: 'LOW'         },
    VERIFIED:    { cls: 'severity-low',    label: 'VERIFIED'    },
    PARTIAL:     { cls: 'severity-medium', label: 'PARTIAL'     },
    PENDING:     { cls: 'bg-slate-100 text-slate-700 border border-slate-300', label: 'PENDING' },
    OPERATIONAL: { cls: 'severity-low',    label: 'OPERATIONAL' },
    DEMO_MODE:   { cls: 'bg-amber-50 text-amber-800 border border-amber-300', label: 'DEMO MODE' },
    OFFLINE:     { cls: 'severity-high',   label: 'OFFLINE'     },
  };

  const { cls, label } = config[status] || {
    cls: 'bg-slate-100 text-slate-700 border border-slate-300',
    label: status,
  };

  return (
    <span className={clsx(
      'inline-flex items-center font-semibold rounded px-2 py-0.5 uppercase tracking-wider',
      size === 'sm' ? 'text-[10px]' : 'text-xs',
      cls
    )}>
      {label}
    </span>
  );
}
