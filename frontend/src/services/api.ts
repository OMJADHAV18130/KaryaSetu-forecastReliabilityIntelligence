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
  LocationExplanation,
  VerificationResponse,
  HealthStatus,
  LocationDetail,
  HistoricalEventsResponse,
  TimeSeriesResponse,
  ScoreBatchResponse,
} from '../types';

const API_MODE = import.meta.env.VITE_API_MODE || 'live';
const rawBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
// Strip trailing slash to prevent double slashes in routes
const API_BASE_URL = rawBaseUrl.replace(/\/+$/, '');

/**
 * True when the app is running on the offline fixtures instead of the backend.
 * The shell shows a persistent banner in that case, so no value on screen can
 * be mistaken for live model output.
 */
export const isMockMode = API_MODE === 'mock';

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
  // Row 1 (8.4375°N)
  { latitude: 8.4375, longitude: 73.125, bust_probability: 0.069629, confidence: 0.930371, confidence_level: 'HIGH', region: 'Lakshadweep Sea / South Arabian Sea' },
  { latitude: 8.4375, longitude: 78.750, bust_probability: 0.059469, confidence: 0.940531, confidence_level: 'HIGH', region: 'Tamil Nadu (Kanyakumari / Gulf of Mannar)' },
  { latitude: 8.4375, longitude: 84.375, bust_probability: 0.078203, confidence: 0.921797, confidence_level: 'HIGH', region: 'South Bay of Bengal (West)' },
  { latitude: 8.4375, longitude: 90.000, bust_probability: 0.077463, confidence: 0.922537, confidence_level: 'HIGH', region: 'South Bay of Bengal (Central)' },
  { latitude: 8.4375, longitude: 95.625, bust_probability: 0.048118, confidence: 0.951882, confidence_level: 'HIGH', region: 'Andaman Sea (Great Nicobar)' },

  // Row 2 (14.0625°N)
  { latitude: 14.0625, longitude: 73.125, bust_probability: 0.118749, confidence: 0.881251, confidence_level: 'HIGH', region: 'Goa / Central Arabian Sea' },
  { latitude: 14.0625, longitude: 78.750, bust_probability: 0.068620, confidence: 0.931380, confidence_level: 'HIGH', region: 'Rayalaseema / South Andhra Interior' },
  { latitude: 14.0625, longitude: 84.375, bust_probability: 0.117328, confidence: 0.882672, confidence_level: 'HIGH', region: 'Central Bay of Bengal (West)' },
  { latitude: 14.0625, longitude: 90.000, bust_probability: 0.147318, confidence: 0.852682, confidence_level: 'HIGH', region: 'Central Bay of Bengal (East)' },
  { latitude: 14.0625, longitude: 95.625, bust_probability: 0.181085, confidence: 0.818915, confidence_level: 'HIGH', region: 'Andaman Sea (North)' },

  // Row 3 (19.6875°N)
  { latitude: 19.6875, longitude: 73.125, bust_probability: 0.213958, confidence: 0.786042, confidence_level: 'HIGH', region: 'Maharashtra / Mumbai Offshore' },
  { latitude: 19.6875, longitude: 78.750, bust_probability: 0.177704, confidence: 0.822296, confidence_level: 'HIGH', region: 'Telangana / Vidarbha Border' },
  { latitude: 19.6875, longitude: 84.375, bust_probability: 0.178160, confidence: 0.821840, confidence_level: 'HIGH', region: 'Odisha Coastal Waters (Puri / Gopalpur)' },
  { latitude: 19.6875, longitude: 90.000, bust_probability: 0.181810, confidence: 0.818190, confidence_level: 'HIGH', region: 'North Bay of Bengal' },

  // Row 4 (25.3125°N)
  { latitude: 25.3125, longitude: 73.125, bust_probability: 0.064330, confidence: 0.935670, confidence_level: 'HIGH', region: 'Rajasthan (Marwar / Pali)' },
  { latitude: 25.3125, longitude: 78.750, bust_probability: 0.144031, confidence: 0.855969, confidence_level: 'HIGH', region: 'Madhya Pradesh / Bundelkhand' },
  { latitude: 25.3125, longitude: 84.375, bust_probability: 0.148554, confidence: 0.851446, confidence_level: 'HIGH', region: 'Bihar (Gangetic Plains / Patna)' },
  { latitude: 25.3125, longitude: 90.000, bust_probability: 0.155342, confidence: 0.844658, confidence_level: 'HIGH', region: 'Meghalaya / Garo Hills Frontier' },

  // Row 5 (30.9375°N)
  { latitude: 30.9375, longitude: 78.750, bust_probability: 0.009464, confidence: 0.990536, confidence_level: 'HIGH', region: 'Uttarakhand Himalayas (Tehri / Garhwal)' },
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
    // No booster runs in mock mode, so there is no calibration step to report.
    // Saying so is the point: the UI can show that the two-stage breakdown is
    // absent rather than presenting one invented stage as if it were real.
    uncalibrated_probability: bustProb,
    calibration_applied: false,
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

/**
 * Placeholder driver values used only when VITE_API_MODE=mock. They exist so
 * the feature tables render in backend-less demos; every mock response that
 * uses them is labelled DEMO DATA in the UI.
 */
const MOCK_MODEL_INPUTS: Record<string, number> = {
  total_precipitation_24hr: 0.01,
  '2m_temperature': 298,
  mean_sea_level_pressure: 100500,
  '10m_u_component_of_wind': 4.0,
  '10m_v_component_of_wind': -1.5,
  specific_humidity_850: 0.014,
  geopotential_500: 57500,
  vertical_velocity_500: -0.2,
  bust_pattern_similarity: 0.35,
};

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

/**
 * Score a set of coordinates for one lead day, in the backend.
 *
 * This is what the maps use instead of inventing values client-side. Each
 * coordinate is a real evaluation of the trained booster at that exact point, so
 * a choropleth can be drawn for every district boundary without a single cell
 * borrowing a neighbour's number.
 *
 * Offline demo mode has no model, so it returns an empty result set. The maps
 * treat that as "no values" and render the unavailable state rather than
 * falling back to substitute numbers.
 */
export async function scoreCoordinates(
  day: number,
  coordinates: { latitude: number; longitude: number }[]
): Promise<ScoreBatchResponse> {
  if (API_MODE === 'mock') {
    return {
      day,
      lead_hours: day * 24,
      model_version: null,
      count: 0,
      derivation: {
        method: 'unavailable',
        note: 'DEMO DATA: the trained model is not loaded in offline demo mode.',
      },
      results: [],
    };
  }
  const { data } = await apiClient.post('/api/forecast/score-batch', {
    day,
    coordinates,
  });
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
      model_inputs: MOCK_MODEL_INPUTS,
      bust_probability: pred.bust_probability,
      confidence: pred.confidence,
      confidence_level: pred.confidence_level,
      derivation: {
        method: 'inverse_distance_interpolation_of_model_inputs',
        source_cell: 'DEMO',
        distance_km: 0,
        neighbour_count: 4,
        note: 'DEMO DATA',
      },
    };
  }
  const { data } = await apiClient.get(`/api/forecast/location?latitude=${lat}&longitude=${lon}&day=${day}`);
  return data;
}

export async function getTimeSeries(
  lat: number,
  lon: number,
  days?: number[]
): Promise<TimeSeriesResponse> {
  const dayParam = days?.length ? `&days=${days.join(',')}` : '';
  if (API_MODE === 'mock') {
    const span = days?.length ? days : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    return {
      latitude: lat,
      longitude: lon,
      region: 'DEMO DATA',
      model_version: 'demo',
      derivation: {
        method: 'inverse_distance_interpolation_of_model_inputs',
        source_cell: 'DEMO',
        distance_km: 0,
        neighbour_count: 4,
        note: 'DEMO DATA',
      },
      series: span.map((day) => {
        const p = getMockPrediction({ latitude: lat, longitude: lon, lead_hours: day * 24 });
        return {
          day,
          lead_hours: day * 24,
          bust_probability: p.bust_probability,
          confidence: p.confidence,
          confidence_level: p.confidence_level,
          // Lead time is a model input, so the vector is built per day to match
          // what the live endpoint returns.
          model_inputs: { ...MOCK_MODEL_INPUTS, lead_hours: day * 24 },
        };
      }),
    };
  }
  const { data } = await apiClient.get(
    `/api/forecast/time-series?latitude=${lat}&longitude=${lon}${dayParam}`
  );
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

export async function getLocationExplanation(
  lat: number,
  lon: number,
  day: number
): Promise<LocationExplanation> {
  if (API_MODE === 'mock') {
    // Attribution requires the trained booster. Offline demo mode has no model,
    // so it reports unavailability rather than an invented breakdown.
    void lat;
    void lon;
    void day;
    return {
      available: false,
      features: [],
      latitude: lat,
      longitude: lon,
      day,
      lead_hours: day * 24,
      bust_probability: 0,
      confidence: 0,
      confidence_level: 'UNKNOWN',
      model_inputs: MOCK_MODEL_INPUTS,
      message: 'Attribution requires the trained model, which is not loaded in offline demo mode.',
    };
  }
  const { data } = await apiClient.get(
    `/api/explanation/location?latitude=${lat}&longitude=${lon}&day=${day}`
  );
  return data;
}

export async function getGlobalExplanation(): Promise<GlobalExplanation> {
  if (API_MODE === 'mock') {
    return {
      available: false,
      features: [],
      model_version: 'unavailable',
      message:
        'Global attribution requires the trained model, which is not loaded in offline demo mode.',
    };
  }
  const { data } = await apiClient.get('/api/explanation/global');
  return data;
}

export async function getVerification(): Promise<VerificationResponse> {
  if (API_MODE === 'mock') {
    // No forecast/observation archive exists for this prototype, so mock mode
    // reports the same unavailable state as the backend rather than inventing
    // measurement pairs.
    return {
      available: false,
      results: [],
      message:
        'No verification archive is attached to this prototype, so no forecast-versus-observation comparison can be shown.',
    };
  }
  const { data } = await apiClient.get('/api/verification');
  return data;
}

export async function getHistoricalEvents(): Promise<HistoricalEventsResponse> {
  if (API_MODE === 'mock') {
    // No curated case archive exists for this prototype. Inventing event rows
    // here would put forecast and observed rainfall figures on screen that were
    // never measured, so mock mode matches the backend and reports nothing.
    return {
      available: false,
      results: [],
      total_events: 0,
      critical_events: 0,
      message:
        'No case archive is attached to this prototype, so no historical bust events can be shown.',
    };
  }
  const { data } = await apiClient.get('/api/historical-events');
  return data;
}
