import { useEffect, useState } from 'react';
import { CircleMarker, useMapEvents } from 'react-leaflet';
import { Crosshair, Loader2, X } from 'lucide-react';
import { useCoordinatePrediction } from '../../hooks';
import { levelFor } from '../../lib/riskScale';
import type { ForecastPoint } from '../../types';

interface Picked {
  lat: number;
  lon: number;
}

interface CoordinateProbeProps {
  day: number;
  /** Reported once the model returns, so the page can open its detail drawer. */
  onResult?: (point: ForecastPoint) => void;
}

/**
 * Latitude/longitude prediction inside the bust risk map.
 *
 * A click inside the model domain sends that coordinate to the backend, which
 * interpolates the nine meteorological drivers from the reference grid and
 * scores them once with the trained model. The result is pinned on the map and
 * shown in the panel — no inference happens in the browser.
 */
export default function CoordinateProbe({ day, onResult }: CoordinateProbeProps) {
  const [picked, setPicked] = useState<Picked | null>(null);

  const query = useCoordinatePrediction(
    picked ? { lat: picked.lat, lon: picked.lon } : null,
    day
  );
  const result = query.data;

  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng;
      if (lat < 8 || lat > 37 || lng < 68 || lng > 98) return;
      setPicked({ lat: Number(lat.toFixed(4)), lon: Number(lng.toFixed(4)) });
    },
  });

  // Keep the parent page's selection in step with the probe.
  useEffect(() => {
    if (!result || !onResult) return;
    onResult({
      latitude: result.latitude,
      longitude: result.longitude,
      bust_probability: result.bust_probability,
      confidence: result.confidence,
      confidence_level: result.confidence_level,
      region: result.region,
    });
  }, [result, onResult]);

  const level = result ? levelFor(result.confidence) : null;

  return (
    <>
      {result && (
        <CircleMarker
          center={[result.latitude, result.longitude]}
          radius={9}
          pathOptions={{
            pane: 'markerPane',
            color: '#ffffff',
            weight: 3,
            fillColor: level === 'HIGH' ? '#059669' : level === 'MODERATE' ? '#d97706' : '#dc2626',
            fillOpacity: 1,
          }}
        />
      )}

      <div className="absolute bottom-4 right-4 z-[1000] w-64 pointer-events-auto">
        <div className="rounded-lg border border-line bg-panel/95 shadow-lift backdrop-blur-md">
          <div className="flex items-center justify-between gap-2 border-b border-line px-3 py-2">
            <span className="flex items-center gap-1.5 text-[11.5px] font-semibold text-ink">
              <Crosshair className="h-3.5 w-3.5 text-brand" />
              Point prediction
            </span>
            {picked && (
              <button
                type="button"
                onClick={() => setPicked(null)}
                title="Clear the pinned coordinate"
                aria-label="Clear the pinned coordinate"
                className="rounded p-0.5 text-ink-muted hover:bg-raised hover:text-ink"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="px-3 py-2.5">
            {!picked && (
              <p className="text-[11.5px] leading-relaxed text-ink-muted">
                Click anywhere on the map to run the trained model on that latitude and
                longitude for day {day}.
              </p>
            )}

            {picked && (
              <>
                <p className="font-mono text-[11px] text-ink-muted">
                  {picked.lat.toFixed(4)}°N, {picked.lon.toFixed(4)}°E · +{day * 24} h
                </p>

                {query.isPending && (
                  <p className="mt-2 flex items-center gap-1.5 text-[11.5px] text-ink-muted">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Scoring with the trained model…
                  </p>
                )}

                {query.isError && (
                  <p className="mt-2 rounded border border-rose-200 bg-rose-50 px-2 py-1.5 text-[11px] text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-300">
                    The model could not be reached, so no value is shown.
                  </p>
                )}

                {result && (
                  <div className="mt-2 space-y-1.5">
                    <div className="flex items-baseline justify-between">
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-ink-muted">
                        Bust risk
                      </span>
                      <span className="font-mono text-base font-bold tabular-nums text-risk-high">
                        {(result.bust_probability * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between">
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-ink-muted">
                        Confidence
                      </span>
                      <span className="font-mono text-base font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                        {(result.confidence * 100).toFixed(1)}%
                      </span>
                    </div>
                    <p className="pt-1 text-[10px] leading-relaxed text-ink-faint">
                      {level} confidence. Model inputs interpolated from the nearest
                      reference cells.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
