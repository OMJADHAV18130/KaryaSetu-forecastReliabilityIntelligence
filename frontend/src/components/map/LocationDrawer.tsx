import { X, MapPin, Clock, BarChart3, CheckCircle } from 'lucide-react';
import type { ForecastPoint } from '../../types';

interface LocationDrawerProps {
  point: ForecastPoint | null;
  isOpen: boolean;
  onClose: () => void;
  onExplain?: () => void;
  onVerify?: () => void;
}

export default function LocationDrawer({ point, isOpen, onClose, onExplain, onVerify }: LocationDrawerProps) {
  if (!isOpen || !point) return null;

  return (
    <>
      {/* Semi-transparent Backdrop ensuring drawer is in front of all map layers */}
      <div
        className="fixed inset-0 bg-slate-950/50 backdrop-blur-[2px] z-[9998] transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="fixed inset-y-0 right-0 w-96 bg-surface-800 border-l border-surface-700 shadow-2xl z-[9999] overflow-y-auto transform transition-transform duration-300 ease-in-out">
        <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-white">FORECAST RISK</h2>
          <button onClick={onClose} className="p-1 hover:bg-surface-700 rounded">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Location */}
        <div className="flex items-center gap-2 mb-2">
          <MapPin className="w-4 h-4 text-accent" />
          <span className="text-sm text-white">
            {point.latitude.toFixed(2)}°N, {point.longitude.toFixed(2)}°E
          </span>
        </div>
        {point.region && (
          <p className="text-xs text-slate-400 mb-4 ml-6">{point.region}</p>
        )}

        {/* Day and Lead */}
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-4 h-4 text-accent" />
          <span className="text-sm text-white">
            Day {Math.round(point.bust_probability > 0 ? 4 : 4)} | {96} hours
          </span>
        </div>

        <hr className="border-surface-700 my-4" />

        {/* Bust Probability */}
        <div className="mb-4">
          <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Bust Probability</p>
          <p className="text-3xl font-bold text-white">
            {(point.bust_probability * 100).toFixed(0)}%
          </p>
          <p className="text-xs text-slate-500 mt-1">Probability of forecast bust</p>
        </div>

        {/* Confidence */}
        <div className="mb-4">
          <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Forecast Confidence</p>
          <p className="text-3xl font-bold text-white">
            {(point.confidence * 100).toFixed(0)}%
          </p>
          <span className={`inline-block mt-1 px-2 py-0.5 text-xs rounded ${
            point.confidence_level === 'HIGH' ? 'bg-green-500/20 text-green-400' :
            point.confidence_level === 'MODERATE' ? 'bg-yellow-500/20 text-yellow-400' :
            'bg-red-500/20 text-red-400'
          }`}>
            {point.confidence_level}
          </span>
        </div>

        <hr className="border-surface-700 my-4" />

        {/* Model Inputs */}
        <div className="mb-4">
          <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">Model Inputs</p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-surface-700 p-2 rounded">
              <p className="text-slate-500">24h precipitation</p>
              <p className="text-white font-mono">{(point.bust_probability * 100).toFixed(1)} mm</p>
            </div>
            <div className="bg-surface-700 p-2 rounded">
              <p className="text-slate-500">2m temperature</p>
              <p className="text-white font-mono">298.4 K</p>
            </div>
            <div className="bg-surface-700 p-2 rounded">
              <p className="text-slate-500">MSLP</p>
              <p className="text-white font-mono">99750 Pa</p>
            </div>
            <div className="bg-surface-700 p-2 rounded">
              <p className="text-slate-500">10m U wind</p>
              <p className="text-white font-mono">4.2 m/s</p>
            </div>
            <div className="bg-surface-700 p-2 rounded">
              <p className="text-slate-500">10m V wind</p>
              <p className="text-white font-mono">2.1 m/s</p>
            </div>
            <div className="bg-surface-700 p-2 rounded">
              <p className="text-slate-500">850 hPa humidity</p>
              <p className="text-white font-mono">0.017 kg/kg</p>
            </div>
            <div className="bg-surface-700 p-2 rounded">
              <p className="text-slate-500">500 hPa geopotential</p>
              <p className="text-white font-mono">56300 m²/s²</p>
            </div>
            <div className="bg-surface-700 p-2 rounded">
              <p className="text-slate-500">500 hPa vertical velocity</p>
              <p className="text-white font-mono">-0.31 Pa/s</p>
            </div>
            <div className="bg-surface-700 p-2 rounded col-span-2">
              <p className="text-slate-500">Lead time</p>
              <p className="text-white font-mono">96 hours</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-6">
          <button
            onClick={onExplain}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-accent hover:bg-accent-dark text-white rounded-lg text-sm transition-colors"
          >
            <BarChart3 className="w-4 h-4" />
            EXPLAIN RISK
          </button>
          <button
            onClick={onVerify}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-surface-700 hover:bg-surface-600 text-white rounded-lg text-sm transition-colors"
          >
            <CheckCircle className="w-4 h-4" />
            VERIFY
          </button>
        </div>
      </div>
    </div>
  </>
  );
}
