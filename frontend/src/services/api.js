import axios from 'axios';
import {
  MOCK_OVERVIEW,
  MOCK_REGIONS_FULL,
  MOCK_BUST_DETECTION,
} from '../data/mockRegions';
import { MOCK_HISTORICAL_EVENTS } from '../data/mockHistoricalEvents';
import { MOCK_EXPLANATIONS, getExplanationForRegion } from '../data/mockExplanations';
import { MOCK_MODEL_PERFORMANCE } from '../data/mockModelPerformance';
import { MOCK_VERIFICATION } from '../data/mockVerification';

// ─── Config ─────────────────────────────────────────────────────────────────
const USE_MOCK = true; // Set to false when FastAPI backend is running
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

// ─── Helpers ─────────────────────────────────────────────────────────────────
function delay(ms = 400) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ─── API Functions ────────────────────────────────────────────────────────────
// Each function: mock path + live API path ready for swap

/** GET /api/forecast/overview */
export async function getOverview() {
  if (USE_MOCK) {
    await delay();
    return MOCK_OVERVIEW;
  }
  const { data } = await client.get('/api/forecast/overview');
  return data;
}

/** GET /api/forecast/map?variable=&day=&layer= */
export async function getForecastMap({ variable, day, layer } = {}) {
  if (USE_MOCK) {
    await delay(600);
    return MOCK_REGIONS_FULL.map(r => ({
      id: r.id,
      name: r.name,
      lat: r.lat,
      lon: r.lon,
      code: r.code,
      bustProbability: r.days[day || 'D5']?.bustProbability ?? 50,
      confidence: r.days[day || 'D5']?.confidence ?? 50,
      severity: r.days[day || 'D5']?.severity ?? 'MEDIUM',
      variable: variable || 'Precipitation',
      layer: layer || 'Bust Probability',
    }));
  }
  const { data } = await client.get('/api/forecast/map', {
    params: { variable, day, layer },
  });
  return data;
}

/** GET /api/forecast/:regionId?day= */
export async function getRegionDetail(regionId, day = 'D5') {
  if (USE_MOCK) {
    await delay(300);
    const region = MOCK_REGIONS_FULL.find(r => r.id === regionId);
    if (!region) return null;
    const dayData = region.days[day] || {};
    return {
      ...region,
      selectedDay: day,
      ...dayData,
    };
  }
  const { data } = await client.get(`/api/forecast/${regionId}`, {
    params: { day },
  });
  return data;
}

/** GET /api/bust-risk?region=&variable=&day=&threshold= */
export async function getBustRisk(filters = {}) {
  if (USE_MOCK) {
    await delay(400);
    let results = [...MOCK_BUST_DETECTION];
    if (filters.region) results = results.filter(r => r.regionId === filters.region);
    if (filters.variable) results = results.filter(r => r.variable === filters.variable);
    if (filters.day) results = results.filter(r => r.day === filters.day);
    if (filters.threshold) results = results.filter(r => r.bustProbability >= Number(filters.threshold));
    return results;
  }
  const { data } = await client.get('/api/bust-risk', { params: filters });
  return data;
}

/** GET /api/verification?event= */
export async function getVerification(eventId) {
  if (USE_MOCK) {
    await delay(400);
    if (eventId) {
      return MOCK_VERIFICATION.events.find(e => e.id === eventId) || MOCK_VERIFICATION.events[0];
    }
    return MOCK_VERIFICATION.events;
  }
  const { data } = await client.get('/api/verification', { params: { event: eventId } });
  return data;
}

/** GET /api/historical-events?type= */
export async function getHistoricalEvents(type) {
  if (USE_MOCK) {
    await delay(300);
    if (type && type !== 'All') {
      return MOCK_HISTORICAL_EVENTS.filter(e => e.type === type);
    }
    return MOCK_HISTORICAL_EVENTS;
  }
  const { data } = await client.get('/api/historical-events', { params: { type } });
  return data;
}

/** GET /api/explanations/:regionId?day= */
export async function getExplanation(regionId, day) {
  if (USE_MOCK) {
    await delay(350);
    const region = MOCK_REGIONS_FULL.find(r => r.id === regionId);
    const dayData = region?.days?.[day];
    return getExplanationForRegion(
      regionId,
      day,
      dayData?.bustProbability,
      dayData?.confidence
    );
  }
  const { data } = await client.get(`/api/explanations/${regionId}`, {
    params: { day },
  });
  return data;
}

/** GET /api/model-performance?model= */
export async function getModelPerformance(modelId) {
  if (USE_MOCK) {
    await delay(400);
    if (modelId) {
      return MOCK_MODEL_PERFORMANCE.models.find(m => m.id === modelId)
        || MOCK_MODEL_PERFORMANCE.models[0];
    }
    return MOCK_MODEL_PERFORMANCE;
  }
  const { data } = await client.get('/api/model-performance', { params: { model: modelId } });
  return data;
}

/** GET /api/health — API status check */
export async function getApiHealth() {
  if (USE_MOCK) {
    return { status: 'DEMO_MODE', message: 'Running with mock data' };
  }
  try {
    const { data } = await client.get('/api/health');
    return data;
  } catch {
    return { status: 'OFFLINE', message: 'Backend not reachable' };
  }
}

/** POST /api/predict — Run 13-feature ML bust risk prediction on FastAPI */
export async function predictBustRisk(features) {
  const { data } = await client.post('/api/predict', features);
  return data;
}

/** GET /api/features — Fetch 13-feature metadata from FastAPI */
export async function getFeaturesMetadata() {
  const { data } = await client.get('/api/features');
  return data;
}

export { USE_MOCK };
