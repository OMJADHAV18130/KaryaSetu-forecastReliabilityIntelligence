import { useQuery } from '@tanstack/react-query';
import {
  getOverview,
  getForecastMap,
  getRegionDetail,
  getBustRisk,
  getVerification,
  getHistoricalEvents,
  getExplanation,
  getModelPerformance,
  getApiHealth,
} from '../services/api';

export function useOverview() {
  return useQuery({
    queryKey: ['overview'],
    queryFn: getOverview,
    staleTime: 5 * 60 * 1000,
  });
}

export function useForecastMap({ variable, day, layer } = {}) {
  return useQuery({
    queryKey: ['forecastMap', variable, day, layer],
    queryFn: () => getForecastMap({ variable, day, layer }),
    staleTime: 5 * 60 * 1000,
  });
}

export function useRegionDetail(regionId, day) {
  return useQuery({
    queryKey: ['regionDetail', regionId, day],
    queryFn: () => getRegionDetail(regionId, day),
    enabled: !!regionId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useBustRisk(filters = {}) {
  return useQuery({
    queryKey: ['bustRisk', filters],
    queryFn: () => getBustRisk(filters),
    staleTime: 5 * 60 * 1000,
  });
}

export function useVerification(eventId) {
  return useQuery({
    queryKey: ['verification', eventId],
    queryFn: () => getVerification(eventId),
    staleTime: 10 * 60 * 1000,
  });
}

export function useHistoricalEvents(type) {
  return useQuery({
    queryKey: ['historicalEvents', type],
    queryFn: () => getHistoricalEvents(type),
    staleTime: 10 * 60 * 1000,
  });
}

export function useExplanation(regionId, day) {
  return useQuery({
    queryKey: ['explanation', regionId, day],
    queryFn: () => getExplanation(regionId, day),
    enabled: !!regionId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useModelPerformance(modelId) {
  return useQuery({
    queryKey: ['modelPerformance', modelId],
    queryFn: () => getModelPerformance(modelId),
    staleTime: 10 * 60 * 1000,
  });
}

export function useApiHealth() {
  return useQuery({
    queryKey: ['apiHealth'],
    queryFn: getApiHealth,
    refetchInterval: 60 * 1000,
  });
}
