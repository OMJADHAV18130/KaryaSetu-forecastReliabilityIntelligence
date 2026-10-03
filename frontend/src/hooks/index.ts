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

export function useModelPerformance() {
  return useQuery({
    queryKey: ['modelPerformance'],
    queryFn: api.getModelPerformance,
    staleTime: 300000,
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
