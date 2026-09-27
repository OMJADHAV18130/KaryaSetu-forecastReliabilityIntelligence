/**
 * Centralized API client for the KaryaSetu backend.
 * Uses VITE_API_BASE_URL and VITE_API_MODE environment variables for deployment.
 * Supports mock mode for development without backend.
 */

import axios from 'axios';
import type {
  ForecastMapResponse,
  ForecastOverview,
  Prediction,
  BustRiskResponse,
  RiskAreasResponse,
  LocalExplanation,
  GlobalExplanation,
  VerificationResponse,
  ModelPerformance,
  HealthStatus,
  LocationDetail,
  HistoricalEventsResponse,
} from '../types';

const API_MODE = import.meta.env.VITE_API_MODE || 'live';
const rawBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
// Strip trailing slash to prevent double slashes in routes
const API_BASE_URL = rawBaseUrl.replace(/\/+$/, '');

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 75000, // 75s to tolerate Render free-tier cold starts (~50s)
  headers: {
    'Content-Type': 'application/json',
  },
});

// Helpful logging for diagnosing deployment issues
apiClient.interceptors.request.use((config) => {
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const fullUrl = `${error.config?.baseURL || ''}${error.config?.url || ''}`;
    console.error(
      `[KaryaSetu API Error] ${error.config?.method?.toUpperCase()} ${fullUrl}:`,
      error.message,
      error.response?.status ? `(Status: ${error.response.status})` : ''
    );
    return Promise.reject(error);
  }
);

// ── Mock Data (same schemas as FastAPI) ───────────────────────────────────────

const MOCK_GRID_DATA = [
  { latitude: 8.4375, longitude: 73.125, bust_probability: 0.069629, confidence: 0.930371, confidence_level: 'HIGH', region: 'Lakshadweep Sea / South Arabian Sea' },
  { latitude: 8.4375, longitude: 78.750, bust_probability: 0.059469, confidence: 0.940531, confidence_level: 'HIGH', region: 'Tamil Nadu (Kanyakumari / Gulf of Mannar)' },
  { latitude: 8.4375, longitude: 84.375, bust_probability: 0.078203, confidence: 0.921797, confidence_level: 'HIGH', region: 'South Bay of Bengal (West)' },
  { latitude: 8.4375, longitude: 90.000, bust_probability: 0.077463, confidence: 0.922537, confidence_level: 'HIGH', region: 'South Bay of Bengal (Central)' },
  { latitude: 8.4375, longitude: 95.625, bust_probability: 0.048118, confidence: 0.951882, confidence_level: 'HIGH', region: 'Andaman Sea (Great Nicobar)' },
  { latitude: 14.0625, longitude: 73.125, bust_probability: 0.118749, confidence: 0.881251, confidence_level: 'HIGH', region: 'Goa / Central Arabian Sea' },
  { latitude: 14.0625, longitude: 78.750, bust_probability: 0.068620, confidence: 0.931380, confidence_level: 'HIGH', region: 'Rayalaseema / South Andhra Interior' },
  { latitude: 14.0625, longitude: 84.375, bust_probability: 0.117328, confidence: 0.882672, confidence_level: 'HIGH', region: 'Central Bay of Bengal (West)' },
  { latitude: 14.0625, longitude: 90.000, bust_probability: 0.147318, confidence: 0.852682, confidence_level: 'HIGH', region: 'Central Bay of Bengal (East)' },
  { latitude: 14.0625, longitude: 95.625, bust_probability: 0.181085, confidence: 0.818915, confidence_level: 'HIGH', region: 'Andaman Sea (North)' },
  { latitude: 19.6875, longitude: 73.125, bust_probability: 0.213958, confidence: 0.786042, confidence_level: 'HIGH', region: 'Maharashtra / Mumbai Offshore' },
  { latitude: 19.6875, longitude: 78.750, bust_probability: 0.177704, confidence: 0.822296, confidence_level: 'HIGH', region: 'Telangana / Vidarbha Border' },
  { latitude: 19.6875, longitude: 84.375, bust_probability: 0.178160, confidence: 0.821840, confidence_level: 'HIGH', region: 'Odisha Coastal Waters (Puri / Gopalpur)' },
  { latitude: 19.6875, longitude: 90.000, bust_probability: 0.181810, confidence: 0.818190, confidence_level: 'HIGH', region: 'North Bay of Bengal' },
  { latitude: 19.6875, longitude: 95.625, bust_probability: 0.111779, confidence: 0.888221, confidence_level: 'HIGH', region: 'Arakan / Northeast Bay of Bengal' },
  { latitude: 25.3125, longitude: 73.125, bust_probability: 0.064330, confidence: 0.935670, confidence_level: 'HIGH', region: 'Rajasthan (Marwar / Pali)' },
  { latitude: 25.3125, longitude: 78.750, bust_probability: 0.144031, confidence: 0.855969, confidence_level: 'HIGH', region: 'Madhya Pradesh / Bundelkhand' },
  { latitude: 25.3125, longitude: 84.375, bust_probability: 0.148554, confidence: 0.851446, confidence_level: 'HIGH', region: 'Bihar (Gangetic Plains / Patna)' },
  { latitude: 25.3125, longitude: 90.000, bust_probability: 0.155342, confidence: 0.844658, confidence_level: 'HIGH', region: 'Meghalaya / Garo Hills Frontier' },
  { latitude: 25.3125, longitude: 95.625, bust_probability: 0.095801, confidence: 0.904199, confidence_level: 'HIGH', region: 'Nagaland / Manipur Border' },
  { latitude: 30.9375, longitude: 73.125, bust_probability: 0.011505, confidence: 0.988495, confidence_level: 'HIGH', region: 'Punjab Frontier (Fazilka / Firozpur)' },
  { latitude: 30.9375, longitude: 78.750, bust_probability: 0.009464, confidence: 0.990536, confidence_level: 'HIGH', region: 'Uttarakhand Himalayas (Tehri / Garhwal)' },
  { latitude: 30.9375, longitude: 84.375, bust_probability: 0.008140, confidence: 0.991860, confidence_level: 'HIGH', region: 'Trans-Himalayan Plateau (West)' },
  { latitude: 30.9375, longitude: 90.000, bust_probability: 0.008024, confidence: 0.991976, confidence_level: 'HIGH', region: 'Trans-Himalayan Plateau (Central)' },
  { latitude: 30.9375, longitude: 95.625, bust_probability: 0.011326, confidence: 0.988674, confidence_level: 'HIGH', region: 'Eastern Himalayas / Arunachal Frontier' },
  { latitude: 36.5625, longitude: 73.125, bust_probability: 0.007710, confidence: 0.992290, confidence_level: 'HIGH', region: 'Karakoram (Gilgit-Baltistan)' },
  { latitude: 36.5625, longitude: 78.750, bust_probability: 0.007766, confidence: 0.992234, confidence_level: 'HIGH', region: 'Karakoram / Northern Ladakh' },
  { latitude: 36.5625, longitude: 84.375, bust_probability: 0.007761, confidence: 0.992239, confidence_level: 'HIGH', region: 'Northern Kunlun Range' },
  { latitude: 36.5625, longitude: 90.000, bust_probability: 0.007784, confidence: 0.992216, confidence_level: 'HIGH', region: 'Qaidam Plateau Frontier' },
  { latitude: 36.5625, longitude: 95.625, bust_probability: 0.007850, confidence: 0.992150, confidence_level: 'HIGH', region: 'Northeast Tibetan Highlands' },
];

function getMockMapData(day: number): ForecastMapResponse {
  const leadFactor = 1.0 + (day - 1) * 0.12;
  const points = MOCK_GRID_DATA.map((p) => ({
    ...p,
    bust_probability: Math.min(0.95, p.bust_probability * leadFactor),
    confidence: Math.max(0.05, 1.0 - p.bust_probability * leadFactor),
  }));
  return { day, lead_hours: day * 24, layer: 'bust_probability', points };
}

function getMockOverview(day: number): ForecastOverview {
  const data = getMockMapData(day);
  const confidences = data.points.map((p) => p.confidence);
  const bustProbs = data.points.map((p) => p.bust_probability);
  return {
    selected_day: day,
    lead_hours: day * 24,
    average_confidence: confidences.reduce((a, b) => a + b, 0) / confidences.length,
    high_risk_cells: data.points.filter((p) => p.confidence < 0.4).length,
    lowest_confidence: Math.min(...confidences),
    highest_bust_probability: Math.max(...bustProbs),
  };
}

function getMockPrediction(features: Record<string, number>): Prediction {
  const leadHours = features.lead_hours || 96;
  const day = Math.round(leadHours / 24);
  const w500 = features.vertical_velocity_500 || -0.3;
  const q850 = features.specific_humidity_850 || 0.017;
  const tp = features.total_precipitation_24hr || 0.01;

  const bustProb = Math.min(0.95, Math.max(0.05,
    0.15 + (day - 1) * 0.08 + Math.abs(w500) * 0.15 + q850 * 2 + tp * 5
  ));

  return {
    bust_probability: bustProb,
    confidence: 1.0 - bustProb,
    confidence_level: bustProb > 0.7 ? 'LOW' : bustProb > 0.4 ? 'MODERATE' : 'HIGH',
    day,
    lead_hours: leadHours,
    latitude: features.latitude,
    longitude: features.longitude,
    model_version: 'xgb-rainfall-bust-v1',
  };
}

// ── API Functions ─────────────────────────────────────────────────────────────

export async function getHealth(): Promise<HealthStatus> {
  if (API_MODE === 'mock') {
    return { status: 'ok', model_loaded: true, calibration_loaded: true, environment: 'research' };
  }
  const { data } = await apiClient.get('/api/health');
  return data;
}

export async function predict(features: Record<string, number>): Promise<Prediction> {
  if (API_MODE === 'mock') {
    return getMockPrediction(features);
  }
  const { data } = await apiClient.post('/api/predict', features);
  return data;
}

export async function getForecastMap(day: number, layer: string = 'bust_probability'): Promise<ForecastMapResponse> {
  if (API_MODE === 'mock') {
    return getMockMapData(day);
  }
  const { data } = await apiClient.get(`/api/forecast/map?day=${day}&layer=${layer}`);
  return data;
}

export async function getForecastOverview(day: number): Promise<ForecastOverview> {
  if (API_MODE === 'mock') {
    return getMockOverview(day);
  }
  const { data } = await apiClient.get(`/api/forecast/overview?day=${day}`);
  return data;
}

export async function getLocationDetail(lat: number, lon: number, day: number): Promise<LocationDetail> {
  if (API_MODE === 'mock') {
    const pred = getMockPrediction({ latitude: lat, longitude: lon, lead_hours: day * 24 });
    return {
      latitude: lat,
      longitude: lon,
      day,
      lead_hours: day * 24,
      model_inputs: { total_precipitation_24hr: 0.01, '2m_temperature': 298, mean_sea_level_pressure: 100500, '10m_u_component_of_wind': 4.0, '10m_v_component_of_wind': -1.5, specific_humidity_850: 0.014, geopotential_500: 57500, vertical_velocity_500: -0.2 },
      bust_probability: pred.bust_probability,
      confidence: pred.confidence,
      confidence_level: pred.confidence_level,
    };
  }
  const { data } = await apiClient.get(`/api/forecast/location?latitude=${lat}&longitude=${lon}&day=${day}`);
  return data;
}

export async function getBustRisk(day: number, minProb: number = 0.3, region?: string): Promise<BustRiskResponse> {
  if (API_MODE === 'mock') {
    const data = getMockMapData(day);
    let results = data.points.map((p) => ({
      latitude: p.latitude,
      longitude: p.longitude,
      day,
      lead_hours: day * 24,
      bust_probability: p.bust_probability,
      confidence: p.confidence,
      confidence_level: p.confidence_level,
      region: p.region,
    }));
    results = results.filter((r) => r.bust_probability >= minProb);
    if (region) {
      results = results.filter((r) => r.region?.toLowerCase().includes(region.toLowerCase()));
    }
    results.sort((a, b) => b.bust_probability - a.bust_probability);
    return { results, total: results.length, day, lead_hours: day * 24, threshold: minProb };
  }
  const { data } = await apiClient.get(`/api/bust-risk?day=${day}&min_probability=${minProb}${region ? `&region=${region}` : ''}`);
  return data;
}

export async function getRiskAreas(day: number, threshold: number = 0.5): Promise<RiskAreasResponse> {
  if (API_MODE === 'mock') {
    return {
      areas: [
        {
          area_id: 'area_1',
          cell_count: 14,
          average_probability: 0.35,
          maximum_probability: 0.72,
          minimum_confidence: 0.28,
          bounding_box: { min_lat: 14.0, max_lat: 25.0, min_lon: 73.0, max_lon: 96.0 },
        },
      ],
      total_areas: 1,
      day,
      lead_hours: day * 24,
      threshold,
      method: 'spatial_clustering_post_processing',
      note: 'Areas are derived from model predictions using spatial clustering.',
    };
  }
  const { data } = await apiClient.get(`/api/bust-risk/areas?day=${day}&threshold=${threshold}`);
  return data;
}

export async function getLocalExplanation(features: Record<string, number>): Promise<LocalExplanation> {
  if (API_MODE === 'mock') {
    const featureContribs = [
      { feature: 'vertical_velocity_500', value: features.vertical_velocity_500 || 0, shap_value: 0.42, direction: 'increases_bust_risk', rank: 1 },
      { feature: 'lead_hours', value: features.lead_hours || 96, shap_value: 0.35, direction: 'increases_bust_risk', rank: 2 },
      { feature: 'specific_humidity_850', value: features.specific_humidity_850 || 0, shap_value: 0.28, direction: 'increases_bust_risk', rank: 3 },
      { feature: 'total_precipitation_24hr', value: features.total_precipitation_24hr || 0, shap_value: 0.15, direction: 'increases_bust_risk', rank: 4 },
      { feature: 'mean_sea_level_pressure', value: features.mean_sea_level_pressure || 0, shap_value: -0.12, direction: 'decreases_bust_risk', rank: 5 },
      { feature: 'geopotential_500', value: features.geopotential_500 || 0, shap_value: 0.08, direction: 'increases_bust_risk', rank: 6 },
      { feature: '2m_temperature', value: features['2m_temperature'] || 0, shap_value: -0.05, direction: 'decreases_bust_risk', rank: 7 },
      { feature: '10m_u_component_of_wind', value: features['10m_u_component_of_wind'] || 0, shap_value: 0.03, direction: 'increases_bust_risk', rank: 8 },
      { feature: '10m_v_component_of_wind', value: features['10m_v_component_of_wind'] || 0, shap_value: -0.02, direction: 'decreases_bust_risk', rank: 9 },
      { feature: 'longitude', value: features.longitude || 0, shap_value: 0.01, direction: 'increases_bust_risk', rank: 10 },
      { feature: 'latitude', value: features.latitude || 0, shap_value: -0.01, direction: 'decreases_bust_risk', rank: 11 },
    ];
    return { features: featureContribs, bust_probability: 0.72, confidence: 0.28 };
  }
  const { data } = await apiClient.post('/api/explanation/local', features);
  return data;
}

export async function getGlobalExplanation(): Promise<GlobalExplanation> {
  if (API_MODE === 'mock') {
    return {
      features: [
        { feature: 'vertical_velocity_500', value: 0, shap_value: 0.35, direction: 'increases_bust_risk', rank: 1 },
        { feature: 'lead_hours', value: 0, shap_value: 0.30, direction: 'increases_bust_risk', rank: 2 },
        { feature: 'specific_humidity_850', value: 0, shap_value: 0.25, direction: 'increases_bust_risk', rank: 3 },
        { feature: 'total_precipitation_24hr', value: 0, shap_value: 0.20, direction: 'increases_bust_risk', rank: 4 },
        { feature: 'mean_sea_level_pressure', value: 0, shap_value: 0.15, direction: 'decreases_bust_risk', rank: 5 },
        { feature: 'geopotential_500', value: 0, shap_value: 0.10, direction: 'increases_bust_risk', rank: 6 },
        { feature: '2m_temperature', value: 0, shap_value: 0.08, direction: 'decreases_bust_risk', rank: 7 },
        { feature: '10m_u_component_of_wind', value: 0, shap_value: 0.05, direction: 'increases_bust_risk', rank: 8 },
        { feature: '10m_v_component_of_wind', value: 0, shap_value: 0.04, direction: 'decreases_bust_risk', rank: 9 },
        { feature: 'longitude', value: 0, shap_value: 0.03, direction: 'increases_bust_risk', rank: 10 },
        { feature: 'latitude', value: 0, shap_value: 0.02, direction: 'decreases_bust_risk', rank: 11 },
      ],
      model_version: 'xgb-rainfall-bust-v1',
    };
  }
  const { data } = await apiClient.get('/api/explanation/global');
  return data;
}

export async function getVerification(): Promise<VerificationResponse> {
  if (API_MODE === 'mock') {
    return {
      available: true,
      results: [
        { latitude: 19.0760, longitude: 73.0000, lead_hours: 96, day: 4, forecast_rainfall: 48.2, reference_rainfall: 92.5, absolute_error: 44.3, bust_threshold: 30.0, bust_status: true },
        { latitude: 25.3125, longitude: 84.3750, lead_hours: 96, day: 4, forecast_rainfall: 24.0, reference_rainfall: 68.4, absolute_error: 44.4, bust_threshold: 25.0, bust_status: true },
        { latitude: 19.6875, longitude: 85.0000, lead_hours: 96, day: 4, forecast_rainfall: 38.2, reference_rainfall: 81.0, absolute_error: 42.8, bust_threshold: 25.0, bust_status: true },
        { latitude: 25.5000, longitude: 91.5000, lead_hours: 96, day: 4, forecast_rainfall: 65.0, reference_rainfall: 138.5, absolute_error: 73.5, bust_threshold: 35.0, bust_status: true },
        { latitude: 14.8150, longitude: 74.1300, lead_hours: 96, day: 4, forecast_rainfall: 22.7, reference_rainfall: 58.2, absolute_error: 35.5, bust_threshold: 25.0, bust_status: true },
        { latitude: 30.3165, longitude: 78.0322, lead_hours: 96, day: 4, forecast_rainfall: 32.0, reference_rainfall: 41.5, absolute_error: 9.5, bust_threshold: 25.0, bust_status: false },
        { latitude: 30.9375, longitude: 75.3412, lead_hours: 96, day: 4, forecast_rainfall: 8.4, reference_rainfall: 12.1, absolute_error: 3.7, bust_threshold: 20.0, bust_status: false },
        { latitude: 25.3125, longitude: 72.8000, lead_hours: 96, day: 4, forecast_rainfall: 3.2, reference_rainfall: 4.0, absolute_error: 0.8, bust_threshold: 15.0, bust_status: false },
        { latitude: 14.4670, longitude: 78.8240, lead_hours: 96, day: 4, forecast_rainfall: 9.2, reference_rainfall: 14.5, absolute_error: 5.3, bust_threshold: 20.0, bust_status: false },
        { latitude: 8.5241, longitude: 77.8500, lead_hours: 96, day: 4, forecast_rainfall: 12.8, reference_rainfall: 16.0, absolute_error: 3.2, bust_threshold: 20.0, bust_status: false },
        { latitude: 27.5861, longitude: 92.0000, lead_hours: 96, day: 4, forecast_rainfall: 18.0, reference_rainfall: 24.2, absolute_error: 6.2, bust_threshold: 25.0, bust_status: false },
        { latitude: 34.1526, longitude: 77.5771, lead_hours: 96, day: 4, forecast_rainfall: 2.0, reference_rainfall: 2.8, absolute_error: 0.8, bust_threshold: 15.0, bust_status: false },
      ],
      message: 'Real verification comparison online: Evaluating NCMRWF/ECMWF Medium-Range Forecast vs Ground Truth Observations.',
    };
  }
  const { data } = await apiClient.get('/api/verification');
  return data;
}

export async function getModelPerformance(): Promise<ModelPerformance> {
  if (API_MODE === 'mock') {
    return {
      model_name: 'Forecast Bust Detector',
      model_type: 'XGBoost + Sigmoid Calibration',
      test_period: 'September 2019',
      roc_auc: 0.868,
      pr_auc: 0.392,
      mcc: 0.349,
      accuracy: 0.86,
      brier_raw: 0.106,
      brier_calibrated: 0.0466,
      model_version: 'xgb-rainfall-bust-v1',
      training_period: 'June-July 2019',
      validation_period: 'August 2019',
      features: ['total_precipitation_24hr', '2m_temperature', 'mean_sea_level_pressure', '10m_u_component_of_wind', '10m_v_component_of_wind', 'specific_humidity_850', 'geopotential_500', 'vertical_velocity_500', 'longitude', 'latitude', 'lead_hours'],
      confusion_matrix: { true_negatives: 54511, false_positives: 8074, false_negatives: 1327, true_positives: 2688 },
    };
  }
  const { data } = await apiClient.get('/api/model-performance');
  return data;
}

export async function getHistoricalEvents(): Promise<HistoricalEventsResponse> {
  if (API_MODE === 'mock') {
    return {
      available: true,
      total_events: 8,
      critical_events: 6,
      detection_rate: '87.5%',
      source: 'MoES / IMD Monsoon Reports & NCMRWF Case Archive',
      results: [
        {
          event_id: 'EVT-2023-HP',
          name: '2023 Himachal Pradesh Flash Floods',
          date: 'July 9–11, 2023',
          region: 'Kullu, Mandi & Beas Basin',
          state: 'Himachal Pradesh',
          latitude: 31.95,
          longitude: 77.10,
          forecast_rainfall_mm: 78.5,
          observed_rainfall_mm: 224.2,
          absolute_error_mm: 145.7,
          lead_days: 4,
          model_predicted_bust: true,
          model_bust_probability: 0.88,
          confidence_level: 'LOW',
          severity: 'CRITICAL',
          synoptic_cause: 'Active Western Disturbance interacting with vigorous Monsoon Trough causing orographic locking over Beas basin',
          nwp_model: 'NCMRWF Unified Model (NCUM)',
          impact: 'Unprecedented river surges, highway washouts, and flash flooding across Himachal Pradesh',
        },
        {
          event_id: 'EVT-2021-TAUKTAE',
          name: '2021 Cyclone Tauktae Landfall',
          date: 'May 17–18, 2021',
          region: 'Saurashtra Coast & Diu',
          state: 'Gujarat',
          latitude: 20.80,
          longitude: 71.20,
          forecast_rainfall_mm: 65.0,
          observed_rainfall_mm: 215.4,
          absolute_error_mm: 150.4,
          lead_days: 5,
          model_predicted_bust: true,
          model_bust_probability: 0.92,
          confidence_level: 'LOW',
          severity: 'CRITICAL',
          synoptic_cause: 'Rapid intensification over anomalously warm Arabian Sea (SST > 31°C) with gale-force spiraling bands',
          nwp_model: 'ECMWF IFS / GFS',
          impact: 'Extreme coastal gale gusts up to 185 km/h, heavy storm surge, and power grid collapse in Saurashtra',
        },
        {
          event_id: 'EVT-2020-AMPHAN',
          name: '2020 Super Cyclone Amphan',
          date: 'May 20, 2020',
          region: 'Sundarbans & Kolkata',
          state: 'West Bengal',
          latitude: 22.30,
          longitude: 88.30,
          forecast_rainfall_mm: 92.0,
          observed_rainfall_mm: 236.0,
          absolute_error_mm: 144.0,
          lead_days: 4,
          model_predicted_bust: true,
          model_bust_probability: 0.85,
          confidence_level: 'LOW',
          severity: 'CRITICAL',
          synoptic_cause: 'Category 5 Super Cyclone eyewall moisture convergence colliding with southern Gangetic Delta',
          nwp_model: 'NCUM-R / IMD GFS',
          impact: 'Widespread urban inundation across Kolkata, saline embankment breaches in Sundarbans',
        },
        {
          event_id: 'EVT-2019-FANI',
          name: '2019 Cyclone Fani Coastal Strike',
          date: 'May 3, 2019',
          region: 'Puri & Coastal Plain',
          state: 'Odisha',
          latitude: 19.80,
          longitude: 85.80,
          forecast_rainfall_mm: 110.0,
          observed_rainfall_mm: 248.5,
          absolute_error_mm: 138.5,
          lead_days: 3,
          model_predicted_bust: true,
          model_bust_probability: 0.81,
          confidence_level: 'MODERATE',
          severity: 'HIGH',
          synoptic_cause: 'Extremely Severe Cyclonic Storm landfall band with localized mesoscale rainband stagnation',
          nwp_model: 'NCMRWF Global Ensemble (NEPS)',
          impact: 'Extensive structural destruction in Puri, high-velocity squall and localized flash flooding',
        },
        {
          event_id: 'EVT-2018-KERALA',
          name: '2018 Great Kerala Monsoon Deluge',
          date: 'August 8–16, 2018',
          region: 'Idukki & Wayanad Ghats',
          state: 'Kerala',
          latitude: 9.85,
          longitude: 76.95,
          forecast_rainfall_mm: 120.0,
          observed_rainfall_mm: 310.8,
          absolute_error_mm: 190.8,
          lead_days: 5,
          model_predicted_bust: true,
          model_bust_probability: 0.94,
          confidence_level: 'LOW',
          severity: 'CRITICAL',
          synoptic_cause: 'Persistent deep Bay of Bengal depression fueling strong Low-Level Jet into Western Ghats orography',
          nwp_model: 'ECMWF ERA5 / NCUM',
          impact: 'State-wide major reservoir spill, severe landslides, and century\'s worst flood emergency in Kerala',
        },
        {
          event_id: 'EVT-2015-CHENNAI',
          name: '2015 Chennai Record Deluge',
          date: 'December 1–2, 2015',
          region: 'Meenambakkam & Tambaram',
          state: 'Tamil Nadu',
          latitude: 13.00,
          longitude: 80.20,
          forecast_rainfall_mm: 85.0,
          observed_rainfall_mm: 494.0,
          absolute_error_mm: 409.0,
          lead_days: 4,
          model_predicted_bust: true,
          model_bust_probability: 0.96,
          confidence_level: 'LOW',
          severity: 'CRITICAL',
          synoptic_cause: 'Stalled coastal confluence zone driven by strong Northeast Monsoon easterly wave over warm ocean',
          nwp_model: 'IMD Global / Regional NWP',
          impact: 'Submerged Chennai airport runways, Adyar river overtopping, and major humanitarian disaster',
        },
        {
          event_id: 'EVT-2005-MUMBAI',
          name: '2005 Mumbai 944mm Cloudburst',
          date: 'July 26, 2005',
          region: 'Santacruz & Mithi Basin',
          state: 'Maharashtra',
          latitude: 19.08,
          longitude: 72.88,
          forecast_rainfall_mm: 45.0,
          observed_rainfall_mm: 944.2,
          absolute_error_mm: 899.2,
          lead_days: 3,
          model_predicted_bust: true,
          model_bust_probability: 0.98,
          confidence_level: 'LOW',
          severity: 'CRITICAL',
          synoptic_cause: 'Mesoscale offshore vortex trapped between Sahyadri mountains and monsoon Arabian surge',
          nwp_model: 'Global Spectral Model',
          impact: 'Historic 944 mm precipitation in 24 hours bringing India\'s financial capital to a standstill',
        },
        {
          event_id: 'EVT-2023-SIKKIM',
          name: '2023 Sikkim Teesta Flash Flood',
          date: 'October 4, 2023',
          region: 'Chungthang & Lachen Valley',
          state: 'Sikkim',
          latitude: 27.60,
          longitude: 88.65,
          forecast_rainfall_mm: 30.0,
          observed_rainfall_mm: 142.0,
          absolute_error_mm: 112.0,
          lead_days: 2,
          model_predicted_bust: true,
          model_bust_probability: 0.89,
          confidence_level: 'LOW',
          severity: 'HIGH',
          synoptic_cause: 'Sudden localized cloudburst trigger over South Lhonak glacial lake causing catastrophic dam breach',
          nwp_model: 'NCUM Regional',
          impact: 'Chungthang hydro dam breach, extensive infrastructure loss along Teesta river valley',
        },
      ],
    };
  }
  const { data } = await apiClient.get('/api/historical-events');
  return data;
}
