import { Activity, CloudLightning } from 'lucide-react';
import { USE_MOCK } from '../services/api';
import { MOCK_OVERVIEW } from '../data/mockRegions';
import clsx from 'clsx';

export default function Navbar() {
  const overview = MOCK_OVERVIEW;

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-14 bg-white border-b border-slate-200 flex items-center px-5 gap-4 shadow-2xs">
      {/* Brand */}
      <div className="flex items-center gap-2.5 min-w-[210px]">
        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-xs">
          <CloudLightning size={18} />
        </div>
        <div className="leading-tight">
          <div className="text-slate-900 font-bold text-sm tracking-tight">KaryaSetu</div>
          <div className="text-slate-500 text-[10px] tracking-wider uppercase font-semibold">Forecast Reliability AI</div>
        </div>
      </div>

      <div className="w-px h-6 bg-slate-200" />

      {/* Metadata pills */}
      <div className="flex items-center gap-2.5 text-xs text-slate-600 flex-1 overflow-x-auto hide-scrollbar">
        <MetaPill label="Cycle" value={overview.forecastCycle} />
        <MetaPill label="NWP Model" value={overview.model} />
        <MetaPill label="Features" value="13 Ingested" />
        <MetaPill label="Target" value="Bust Detection (Lead D1–10)" />
      </div>

      {/* Status */}
      <div className="flex items-center gap-2.5 ml-auto">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          OPERATIONAL
        </span>
      </div>
    </header>
  );
}

function MetaPill({ label, value }) {
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100/80 border border-slate-200/60 whitespace-nowrap">
      <span className="text-slate-500 uppercase tracking-wider text-[10px] font-bold">{label}:</span>
      <span className="text-slate-800 font-mono text-[11px] font-medium">{value}</span>
    </div>
  );
}
