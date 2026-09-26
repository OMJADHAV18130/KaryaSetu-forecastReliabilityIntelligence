import { useState, useMemo } from 'react';
import { ChevronUp, ChevronDown, Map, BrainCircuit, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import StatusBadge from './StatusBadge';
import clsx from 'clsx';

const COLS = [
  { key: 'regionName',     label: 'Region',      sortable: true  },
  { key: 'day',            label: 'Day',          sortable: true  },
  { key: 'bustProbability',label: 'Bust Risk',    sortable: true  },
  { key: 'confidence',     label: 'Confidence',   sortable: true  },
  { key: 'severity',       label: 'Severity',     sortable: true  },
  { key: 'variable',       label: 'Variable',     sortable: false },
  { key: 'actions',        label: 'Actions',      sortable: false },
];

export default function RegionRiskTable({ data = [], compact = false }) {
  const navigate = useNavigate();
  const [sortKey, setSortKey] = useState('bustProbability');
  const [sortDir, setSortDir] = useState('desc');

  const sorted = useMemo(() => {
    return [...data].sort((a, b) => {
      const av = a[sortKey], bv = b[sortKey];
      if (typeof av === 'number') return sortDir === 'desc' ? bv - av : av - bv;
      return sortDir === 'desc' ? String(bv).localeCompare(av) : String(av).localeCompare(bv);
    });
  }, [data, sortKey, sortDir]);

  function handleSort(key) {
    if (key === sortKey) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    else { setSortKey(key); setSortDir('desc'); }
  }

  const rows = compact ? sorted.slice(0, 6) : sorted;

  return (
    <div className="overflow-x-auto">
      <table className="w-full data-table">
        <thead>
          <tr>
            {COLS.map(col => (
              <th
                key={col.key}
                className={clsx(col.sortable && 'cursor-pointer select-none hover:text-white')}
                onClick={() => col.sortable && handleSort(col.key)}
              >
                <div className="flex items-center gap-1">
                  {col.label}
                  {col.sortable && col.key === sortKey && (
                    sortDir === 'desc' ? <ChevronDown size={11} /> : <ChevronUp size={11} />
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={`${row.regionId}-${row.day}-${i}`}>
              <td className="text-white font-medium">{row.regionName}</td>
              <td className="font-mono text-accent-cyan">{row.day}</td>
              <td>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-20 bg-navy-600 rounded-full overflow-hidden">
                    <div
                      className={clsx(
                        'h-full rounded-full',
                        row.bustProbability >= 65 ? 'bg-risk-high' :
                        row.bustProbability >= 40 ? 'bg-amber-400' : 'bg-confidence-very-high'
                      )}
                      style={{ width: `${row.bustProbability}%` }}
                    />
                  </div>
                  <span className={clsx(
                    'font-mono text-sm font-bold',
                    row.bustProbability >= 65 ? 'text-risk-high' :
                    row.bustProbability >= 40 ? 'text-amber-400' : 'text-confidence-very-high'
                  )}>
                    {row.bustProbability}%
                  </span>
                </div>
              </td>
              <td>
                <span className={clsx(
                  'font-mono text-sm',
                  row.confidence <= 30 ? 'text-risk-high' :
                  row.confidence <= 55 ? 'text-amber-400' : 'text-confidence-very-high'
                )}>
                  {row.confidence}%
                </span>
              </td>
              <td><StatusBadge status={row.severity} /></td>
              <td className="text-slate-400">{row.variable}</td>
              <td>
                {!compact && (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => navigate(`/forecast-map?region=${row.regionId}&day=${row.day}`)}
                      className="btn-ghost flex items-center gap-1 py-1 px-2"
                      title="View on Map"
                    >
                      <Map size={11} />
                      <span className="text-[11px]">Map</span>
                    </button>
                    <button
                      onClick={() => navigate(`/ai-explanation?region=${row.regionId}&day=${row.day}`)}
                      className="btn-ghost flex items-center gap-1 py-1 px-2"
                      title="Explain Risk"
                    >
                      <BrainCircuit size={11} />
                      <span className="text-[11px]">Explain</span>
                    </button>
                    <button
                      onClick={() => navigate(`/historical-events?region=${row.regionId}`)}
                      className="btn-ghost flex items-center gap-1 py-1 px-2"
                      title="Historical Cases"
                    >
                      <Clock size={11} />
                      <span className="text-[11px]">History</span>
                    </button>
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
