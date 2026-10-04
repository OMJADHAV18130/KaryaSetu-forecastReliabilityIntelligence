/**
 * Shared colour scale for the forecast-reliability layers.
 *
 * Thresholds follow the project specification exactly:
 *   confidence        : HIGH >= 0.70 | MODERATE >= 0.40 | LOW < 0.40
 *   bust_probability  : HIGH >= 0.70 | MODERATE >= 0.40 | LOW < 0.40
 *   confidence        = 1 - bust_probability
 */

export type ReliabilityLayer = 'bust_probability' | 'confidence';
export type ReliabilityLevel = 'HIGH' | 'MODERATE' | 'LOW';

export interface RampStop {
  at: number;
  color: string;
}

/** Low bust risk (green) -> high bust risk (dark red). */
export const BUST_RAMP: RampStop[] = [
  { at: 0.0, color: '#065f46' },
  { at: 0.18, color: '#10b981' },
  { at: 0.4, color: '#a3e635' },
  { at: 0.55, color: '#fbbf24' },
  { at: 0.7, color: '#ef4444' },
  { at: 0.85, color: '#dc2626' },
  { at: 1.0, color: '#7f1d1d' },
];

/** Low confidence (red) -> high confidence (dark green). */
export const CONFIDENCE_RAMP: RampStop[] = [
  { at: 0.0, color: '#7f1d1d' },
  { at: 0.15, color: '#dc2626' },
  { at: 0.3, color: '#ef4444' },
  { at: 0.4, color: '#fbbf24' },
  { at: 0.6, color: '#a3e635' },
  { at: 0.7, color: '#10b981' },
  { at: 0.82, color: '#059669' },
  { at: 1.0, color: '#065f46' },
];

export const RAMP_FOR_LAYER: Record<ReliabilityLayer, RampStop[]> = {
  bust_probability: BUST_RAMP,
  confidence: CONFIDENCE_RAMP,
};

function hexToRgb(hex: string): [number, number, number] {
  const value = hex.replace('#', '');
  return [
    parseInt(value.slice(0, 2), 16),
    parseInt(value.slice(2, 4), 16),
    parseInt(value.slice(4, 6), 16),
  ];
}

/** Continuous interpolation between two #rrggbb colours. */
export function mixHex(from: string, to: string, t: number): string {
  const a = hexToRgb(from);
  const b = hexToRgb(to);
  const channel = (i: number) => Math.round(a[i] + (b[i] - a[i]) * t);
  return `#${[0, 1, 2]
    .map((i) => channel(i).toString(16).padStart(2, '0'))
    .join('')}`;
}

/** Colour for a probability/confidence value on the given layer. */
export function getRampColor(value: number, layer: ReliabilityLayer): string {
  const ramp = RAMP_FOR_LAYER[layer];
  const v = Math.min(1, Math.max(0, value));
  for (let i = 0; i < ramp.length - 1; i += 1) {
    const lower = ramp[i];
    const upper = ramp[i + 1];
    if (v >= lower.at && v <= upper.at) {
      const span = upper.at - lower.at || 1;
      return mixHex(lower.color, upper.color, (v - lower.at) / span);
    }
  }
  return ramp[ramp.length - 1].color;
}

/** CSS linear-gradient for the map legend bar. */
export function rampGradient(layer: ReliabilityLayer, direction: 'to top' | 'to bottom' = 'to top'): string {
  const ramp = RAMP_FOR_LAYER[layer];
  const stops = ramp
    .map((stop) => `${stop.color} ${(stop.at * 100).toFixed(0)}%`)
    .join(', ');
  return `linear-gradient(${direction}, ${stops})`;
}

/** HIGH >= 0.70, MODERATE >= 0.40, LOW < 0.40 (identical cut-offs for both layers). */
export function levelFor(value: number): ReliabilityLevel {
  if (value >= 0.7) return 'HIGH';
  if (value >= 0.4) return 'MODERATE';
  return 'LOW';
}

/**
 * Tone classes for the three reliability levels.
 *
 * Each entry carries a light-theme and a dark-theme variant: the map overlays
 * and the panels behind them are dark in one theme and light in the other, so
 * a single fixed colour cannot stay legible in both.
 */
export const LEVEL_TONE: Record<
  ReliabilityLevel,
  { text: string; chip: string; solid: string }
> = {
  HIGH: {
    text: 'text-emerald-700 dark:text-emerald-300',
    chip:
      'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/40',
    solid: '#059669',
  },
  MODERATE: {
    text: 'text-amber-700 dark:text-amber-300',
    chip:
      'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/40',
    solid: '#d97706',
  },
  LOW: {
    text: 'text-rose-700 dark:text-rose-300',
    chip:
      'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-500/40',
    solid: '#dc2626',
  },
};

export function percent(value: number): string {
  return `${(Math.min(1, Math.max(0, value)) * 100).toFixed(1)}%`;
}

/**
 * The trained model's spatial domain, mirrored from the backend's
 * `feature_schema.DOMAIN` (8N-37N, 68E-98E).
 *
 * This exists so the client can tell "outside what the model was trained on"
 * apart from "the model declined to answer". Nicobars sits at 7.03N, south of
 * the floor, so it has no value the model can produce; the map says exactly
 * that instead of leaving a district silently blank.
 */
export const MODEL_DOMAIN = {
  lat_min: 8.0,
  lat_max: 37.0,
  lon_min: 68.0,
  lon_max: 98.0,
} as const;

export function inModelDomain(latitude: number, longitude: number): boolean {
  return (
    latitude >= MODEL_DOMAIN.lat_min &&
    latitude <= MODEL_DOMAIN.lat_max &&
    longitude >= MODEL_DOMAIN.lon_min &&
    longitude <= MODEL_DOMAIN.lon_max
  );
}