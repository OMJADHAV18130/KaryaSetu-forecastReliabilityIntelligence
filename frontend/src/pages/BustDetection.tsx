import { useState } from 'react';
import { useBustRisk, useRiskAreas } from '../hooks';
import { MapPin, AlertTriangle } from 'lucide-react';

export default function BustDetection() {
  const [selectedDay, setSelectedDay] = useState(4);
  const [minProb, setMinProb] = useState(0.3);

  const { data: riskData, isLoading } = useBustRisk(selectedDay, minProb);
  const { data: areasData } = useRiskAreas(selectedDay, 0.5);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-1">HIGH-RISK FORECAST LOCATIONS</h1>
        <p className="text-sm text-slate-400">Sorted by highest bust probability</p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-6 p-4 bg-surface-800 rounded-lg border border-surface-700">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 uppercase tracking-wider">Day:</span>
          <select
            value={selectedDay}
            onChange={(e) => setSelectedDay(Number(e.target.value))}
            className="bg-surface-700 text-white text-sm rounded px-3 py-1.5 border border-surface-600"
          >
            {Array.from({ length: 10 }, (_, i) => i + 1).map((d) => (
              <option key={d} value={d}>D{d}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 uppercase tracking-wider">Min Probability:</span>
          <select
            value={minProb}
            onChange={(e) => setMinProb(Number(e.target.value))}
            className="bg-surface-700 text-white text-sm rounded px-3 py-1.5 border border-surface-600"
          >
            <option value={0.1}>10%</option>
            <option value={0.2}>20%</option>
            <option value={0.3}>30%</option>
            <option value={0.4}>40%</option>
            <option value={0.5}>50%</option>
          </select>
        </div>
      </div>

      {/* Risk Areas */}
      {areasData && areasData.areas.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-white mb-3">ERROR-PRONE AREAS</h2>
          <div className="grid grid-cols-1 gap-3">
            {areasData.areas.map((area) => (
              <div key={area.area_id} className="bg-surface-800 p-4 rounded-lg border border-surface-700">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-yellow-500" />
                    <span className="text-sm font-semibold text-white">HIGH-RISK AREA</span>
                  </div>
                  <span className="text-xs text-slate-400">{area.cell_count} cells</span>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-slate-400">Average bust probability</p>
                    <p className="text-white font-mono">{(area.average_probability * 100).toFixed(1)}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Lowest confidence</p>
                    <p className="text-white font-mono">{(area.minimum_confidence * 100).toFixed(1)}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Max probability</p>
                    <p className="text-white font-mono">{(area.maximum_probability * 100).toFixed(1)}%</p>
                  </div>
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  Bounding box: {area.bounding_box.min_lat}°N - {area.bounding_box.max_lat}°N, {area.bounding_box.min_lon}°E - {area.bounding_box.max_lon}°E
                </p>
                <p className="text-xs text-slate-500 mt-1 italic">
                  Spatial clustering of model predictions (post-processing, not a separate ML model)
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* High-Risk Locations Table */}
      <div className="bg-surface-800 rounded-lg border border-surface-700 overflow-hidden">
        <div className="p-4 border-b border-surface-700">
          <h2 className="text-lg font-semibold text-white">HIGH-RISK LOCATIONS</h2>
        </div>
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-slate-400">Loading risk data...</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-surface-700">
                <th className="text-left text-xs text-slate-400 uppercase tracking-wider p-3">Location</th>
                <th className="text-left text-xs text-slate-400 uppercase tracking-wider p-3">Day</th>
                <th className="text-left text-xs text-slate-400 uppercase tracking-wider p-3">Lead Time</th>
                <th className="text-left text-xs text-slate-400 uppercase tracking-wider p-3">Bust Probability</th>
                <th className="text-left text-xs text-slate-400 uppercase tracking-wider p-3">Confidence</th>
                <th className="text-left text-xs text-slate-400 uppercase tracking-wider p-3">Risk Level</th>
              </tr>
            </thead>
            <tbody>
              {riskData?.results.map((result, idx) => (
                <tr key={idx} className="border-b border-surface-700/50 hover:bg-surface-700/30">
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-accent" />
                      <div>
                        <p className="text-sm text-white">{result.region || 'Grid Point'}</p>
                        <p className="text-xs text-slate-400">{result.latitude.toFixed(2)}°N, {result.longitude.toFixed(2)}°E</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-3 text-sm text-white">D{result.day}</td>
                  <td className="p-3 text-sm text-white">{result.lead_hours}h</td>
                  <td className="p-3">
                    <span className={`text-sm font-mono font-bold ${
                      result.bust_probability >= 0.7 ? 'text-red-400' :
                      result.bust_probability >= 0.4 ? 'text-yellow-400' : 'text-green-400'
                    }`}>
                      {(result.bust_probability * 100).toFixed(1)}%
                    </span>
                  </td>
                  <td className="p-3">
                    <span className="text-sm font-mono text-white">
                      {(result.confidence * 100).toFixed(1)}%
                    </span>
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 text-xs rounded ${
                      result.confidence_level === 'HIGH' ? 'bg-green-500/20 text-green-400' :
                      result.confidence_level === 'MODERATE' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-red-500/20 text-red-400'
                    }`}>
                      {result.confidence_level}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
