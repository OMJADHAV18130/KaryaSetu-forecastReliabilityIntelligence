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
