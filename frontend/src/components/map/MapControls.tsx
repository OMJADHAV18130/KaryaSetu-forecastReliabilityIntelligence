import { Layers } from 'lucide-react';

interface MapControlsProps {
  selectedDay: number;
  onDayChange: (day: number) => void;
  layer: 'bust_probability' | 'confidence';
  onLayerChange: (layer: 'bust_probability' | 'confidence') => void;
}

const DAYS = Array.from({ length: 10 }, (_, i) => i + 1);

export default function MapControls({ selectedDay, onDayChange, layer, onLayerChange }: MapControlsProps) {
  return (
    <div className="flex flex-wrap items-center gap-4 p-4 bg-surface-800 rounded-lg border border-surface-700">
      {/* Day selector */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-400 uppercase tracking-wider">Day:</span>
        <div className="flex gap-1">
          {DAYS.map((day) => (
            <button
              key={day}
              onClick={() => onDayChange(day)}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                selectedDay === day
                  ? 'bg-accent text-white'
                  : 'bg-surface-700 text-slate-400 hover:bg-surface-600 hover:text-white'
              }`}
            >
              D{day}
            </button>
          ))}
        </div>
      </div>

      {/* Layer selector */}
      <div className="flex items-center gap-2">
        <Layers className="w-4 h-4 text-slate-400" />
        <span className="text-xs text-slate-400 uppercase tracking-wider">Layer:</span>
        <div className="flex gap-1">
          <button
            onClick={() => onLayerChange('confidence')}
            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
              layer === 'confidence'
                ? 'bg-accent text-white'
                : 'bg-surface-700 text-slate-400 hover:bg-surface-600 hover:text-white'
            }`}
          >
            Confidence
          </button>
          <button
            onClick={() => onLayerChange('bust_probability')}
            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
              layer === 'bust_probability'
                ? 'bg-accent text-white'
                : 'bg-surface-700 text-slate-400 hover:bg-surface-600 hover:text-white'
            }`}
          >
            Bust Probability
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 ml-auto">
        {layer === 'confidence' ? (
          <>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-xs text-slate-400">HIGH (&ge;70%)</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-yellow-500" />
              <span className="text-xs text-slate-400">MODERATE (40-69%)</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-red-500" />
              <span className="text-xs text-slate-400">LOW (&lt;40%)</span>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-red-500" />
              <span className="text-xs text-slate-400">HIGH (&ge;70%)</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-yellow-500" />
              <span className="text-xs text-slate-400">MODERATE (40-69%)</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-xs text-slate-400">LOW (&lt;40%)</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
