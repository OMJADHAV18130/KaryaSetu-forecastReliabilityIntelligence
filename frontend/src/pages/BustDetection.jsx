import { useState, useMemo } from 'react';
import { AlertTriangle, Download } from 'lucide-react';
import RegionRiskTable from '../components/RegionRiskTable';
import FilterBar from '../components/FilterBar';
import { useBustRisk } from '../hooks/useForecast';
import { INDIAN_REGIONS } from '../data/mockRegions';
import { LoadingState } from '../components/LoadingState';

const VARIABLES = ['All', 'Precipitation', 'Temperature', 'Wind', 'Pressure'];
const DAYS = ['All', 'D1','D2','D3','D4','D5','D6','D7','D8','D9','D10'];
const SEVERITIES = ['All', 'HIGH', 'MEDIUM', 'LOW'];
const REGIONS_OPT = [{ value: 'All', label: 'All Regions' },
  ...INDIAN_REGIONS.map(r => ({ value: r.id, label: r.name }))];
const THRESHOLDS = [
  { value: '0', label: 'Any Risk' },
  { value: '40', label: '≥ 40% (Moderate+)' },
  { value: '65', label: '≥ 65% (High+)' },
  { value: '75', label: '≥ 75% (Very High)' },
];

export default function BustDetection() {
  const [filters, setFilters] = useState({
    region: 'All', variable: 'All', day: 'All',
    severity: 'All', threshold: '40',
  });

  const { data: rawData, isLoading, refetch } = useBustRisk({ threshold: filters.threshold });

  function handleFilterChange(id, value) {
    setFilters(f => ({ ...f, [id]: value }));
  }

  const filtered = useMemo(() => {
    if (!rawData) return [];
    return rawData.filter(row => {
      if (filters.region !== 'All' && row.regionId !== filters.region) return false;
      if (filters.variable !== 'All' && row.variable !== filters.variable) return false;
      if (filters.day !== 'All' && row.day !== filters.day) return false;
      if (filters.severity !== 'All' && row.severity !== filters.severity) return false;
      return true;
    });
  }, [rawData, filters]);

  const filterConfig = [
    {
      id: 'region', label: 'Region',
      value: filters.region,
      options: REGIONS_OPT,
    },
    {
      id: 'variable', label: 'Variable',
      value: filters.variable,
      options: VARIABLES.map(v => ({ value: v, label: v })),
    },
    {
      id: 'day', label: 'Lead Time',
      value: filters.day,
      options: DAYS.map(d => ({ value: d, label: d })),
    },
    {
      id: 'severity', label: 'Severity',
      value: filters.severity,
      options: SEVERITIES.map(s => ({ value: s, label: s })),
    },
    {
      id: 'threshold', label: 'Risk Threshold',
      value: filters.threshold,
      options: THRESHOLDS,
    },
  ];

  return (
    <div className="flex flex-col gap-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <AlertTriangle className="text-risk-high" size={18} />
            <h1 className="text-white font-bold text-xl">Bust Detection</h1>
          </div>
          <p className="text-slate-400 text-sm">
            Ranked forecast bust risks across all regions and lead times
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">{filtered.length} results</span>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <p className="section-title mb-2">Filters</p>
        <FilterBar filters={filterConfig} onChange={handleFilterChange} />
      </div>

      {/* Table */}
      <div className="card">
        {isLoading ? (
          <LoadingState rows={8} />
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            No regions match the selected filters.
          </div>
        ) : (
          <RegionRiskTable data={filtered} />
        )}
      </div>

      <p className="text-[11px] text-slate-500 text-center">
        [DEMO DATA] Bust probabilities are computed from simulated ensemble metrics. Not real NCMRWF output.
      </p>
    </div>
  );
}
