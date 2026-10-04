/**
 * Custom React hooks for data fetching with TanStack Query.
 */

import { useQuery } from '@tanstack/react-query';
import * as api from '../services/api';

export function useHealth() {
  return useQuery({
    queryKey: ['health'],
    queryFn: api.getHealth,
    staleTime: 30000,
  });
}

export function useForecastMap(day: number, layer: string = 'bust_probability') {
  return useQuery({
    queryKey: ['forecastMap', day, layer],
    queryFn: () => api.getForecastMap(day, layer),
    staleTime: 60000,
  });
}

export function useForecastOverview(day: number) {
  return useQuery({
    queryKey: ['forecastOverview', day],
    queryFn: () => api.getForecastOverview(day),
    staleTime: 60000,
  });
}

export function useBustRisk(day: number, minProb: number = 0.3) {
  return useQuery({
    queryKey: ['bustRisk', day, minProb],
    queryFn: () => api.getBustRisk(day, minProb),
    staleTime: 60000,
  });
}

export function useRiskAreas(day: number, threshold: number = 0.5) {
  return useQuery({
    queryKey: ['riskAreas', day, threshold],
    queryFn: () => api.getRiskAreas(day, threshold),
    staleTime: 60000,
  });
}

export function useVerification() {
  return useQuery({
    queryKey: ['verification'],
    queryFn: api.getVerification,
    staleTime: 60000,
  });
}

export function useHistoricalEvents() {
  return useQuery({
    queryKey: ['historicalEvents'],
    queryFn: api.getHistoricalEvents,
    staleTime: 300000,
  });
}

export function useGlobalExplanation() {
  return useQuery({
    queryKey: ['globalExplanation'],
    queryFn: api.getGlobalExplanation,
    staleTime: 300000,
  });
}

/**
 * Model evaluation for a single coordinate. `point` is null until the user
 * clicks the map or picks a place, which keeps the query disabled by default.
 */
export function useCoordinatePrediction(point: { lat: number; lon: number } | null, day: number) {
  return useQuery({
    queryKey: ['coordinatePrediction', point?.lat, point?.lon, day],
    queryFn: () => api.getLocationDetail(point!.lat, point!.lon, day),
    enabled: point !== null,
    staleTime: 60000,
  });
}

/**
 * Compact, stable key for a coordinate list. Callers rebuild these arrays on
 * every render (GeoJSON anchors, station tables), and React Query needs a
 * primitive it can compare, so the list is folded into one number. djb2 over
 * the rounded coordinates: any change in the set changes the key.
 */
function coordinateSignature(
  coordinates: { latitude: number; longitude: number }[]
): string {
  let hash = 5381;
  for (const c of coordinates) {
    const pair = `${c.latitude.toFixed(4)},${c.longitude.toFixed(4)};`;
    for (let i = 0; i < pair.length; i += 1) {
      hash = ((hash << 5) + hash + pair.charCodeAt(i)) >>> 0;
    }
  }
  return `${coordinates.length}:${hash.toString(36)}`;
}

/**
 * Real trained-model scores for a set of coordinates at one lead day.
 *
 * This is how every map value gets onto the screen. The backend runs the loaded
 * booster once per coordinate, so a choropleth cell, a station pin and a hover
 * card all carry a number the model actually produced. Nothing here is
 * interpolated client-side and no coordinate is filled in from a neighbour.
 *
 * The query stays disabled while the list is empty, which is what a map does
 * before its boundary file has loaded.
 */
export function useCoordinateScores(
  day: number,
  coordinates: { latitude: number; longitude: number }[],
  enabled: boolean = true
) {
  return useQuery({
    queryKey: ['coordinateScores', day, coordinateSignature(coordinates)],
    queryFn: () => api.scoreCoordinates(day, coordinates),
    enabled: enabled && coordinates.length > 0,
    staleTime: 300000,
  });
}

/**
 * Attribution for one coordinate. The probability in the response is the same
 * model evaluation the SHAP values decompose.
 */
export function useLocationExplanation(
  point: { lat: number; lon: number } | null,
  day: number
) {
  return useQuery({
    queryKey: ['locationExplanation', point?.lat, point?.lon, day],
    queryFn: () => api.getLocationExplanation(point!.lat, point!.lon, day),
    enabled: point !== null,
    staleTime: 300000,
  });
}

/**
 * The model's own day-by-day curve for one coordinate: every day is a separate
 * evaluation, not a fit or an interpolation.
 */
export function useTimeSeries(point: { lat: number; lon: number } | null, days?: number[]) {
  return useQuery({
    queryKey: ['timeSeries', point?.lat, point?.lon, days?.join(',') ?? 'all'],
    queryFn: () => api.getTimeSeries(point!.lat, point!.lon, days),
    enabled: point !== null,
    staleTime: 60000,
  });
}
