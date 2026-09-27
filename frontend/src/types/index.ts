/**
 * Shared frontend types for API responses and data structures.
 * These match the FastAPI response schemas exactly.
 */

export interface ForecastPoint {
  latitude: number;
  longitude: number;
  bust_probability: number;
  confidence: number;
  confidence_level: string;
  region?: string;
}

export interface ForecastMapResponse {
  day: number;
  lead_hours: number;
  layer: string;
  points: ForecastPoint[];
}

export interface ForecastOverview {
  selected_day: number;
  lead_hours: number;
  average_confidence: number;
  high_risk_cells: number;
  lowest_confidence: number;
  highest_bust_probability: number;
}

export interface Prediction {
  bust_probability: number;
  confidence: number;
  confidence_level: string;
  day: number;
  lead_hours: number;
  latitude: number;
  longitude: number;
  bust_pattern_similarity?: number;
  model_version?: string;
  request_id?: string;
}

export interface BustRiskResult {
  latitude: number;
  longitude: number;
  day: number;
  lead_hours: number;
  bust_probability: number;
  confidence: number;
  confidence_level: string;
  bust_pattern_similarity?: number;
  region?: string;
  model_inputs?: Record<string, number>;
}

export interface RiskArea {
  area_id: string;
  cell_count: number;
  average_probability: number;
  maximum_probability: number;
  minimum_confidence: number;
  bounding_box: {
    min_lat: number;
    max_lat: number;
    min_lon: number;
    max_lon: number;
  };
}

export interface ShapFeature {
  feature: string;
  value: number;
  shap_value: number;
  direction: string;
  rank: number;
}

export interface LocalExplanation {
  features: ShapFeature[];
  bust_probability: number;
  confidence: number;
}

export interface GlobalExplanation {
  features: ShapFeature[];
  model_version: string;
}

export interface VerificationResult {
  latitude: number;
  longitude: number;
  lead_hours: number;
  forecast_rainfall: number;
  reference_rainfall: number;
  absolute_error: number;
  bust_threshold: number;
  bust_status: boolean;
  day: number;
}

export interface VerificationResponse {
  available: boolean;
  results: VerificationResult[];
  message?: string;
}

export interface ModelPerformance {
  model_name: string;
  model_type: string;
  test_period: string;
  roc_auc: number;
  pr_auc: number;
  mcc: number;
  mcc_optimal?: number;
  optimal_threshold?: number;
  precision?: number;
  recall?: number;
  f1?: number;
  accuracy: number;
  brier_raw: number;
  brier_calibrated: number;
  model_version: string;
  training_period: string;
  validation_period: string;
  features: string[];
  confusion_matrix?: {
    true_negatives: number;
    false_positives: number;
    false_negatives: number;
    true_positives: number;
  };
}

export interface HealthStatus {
  status: string;
  model_loaded: boolean;
  calibration_loaded: boolean;
  environment: string;
}

export interface LocationDetail {
  latitude: number;
  longitude: number;
  day: number;
  lead_hours: number;
  model_inputs: Record<string, number>;
  bust_probability: number;
  confidence: number;
  confidence_level: string;
  region?: string;
}

export interface BustRiskResponse {
  results: BustRiskResult[];
  total: number;
  day: number;
  lead_hours: number;
  threshold: number;
}

export interface RiskAreasResponse {
  areas: RiskArea[];
  total_areas: number;
  day: number;
  lead_hours: number;
  threshold: number;
  method: string;
  note: string;
}

export interface HistoricalEvent {
  event_id: string;
  name: string;
  date: string;
  region: string;
  state: string;
  latitude: number;
  longitude: number;
  forecast_rainfall_mm: number;
  observed_rainfall_mm: number;
  absolute_error_mm: number;
  lead_days: number;
  model_predicted_bust: boolean;
  model_bust_probability: number;
  confidence_level: string;
  severity: 'CRITICAL' | 'HIGH' | 'MODERATE';
  synoptic_cause: string;
  nwp_model: string;
  impact?: string;
}

export interface HistoricalEventsResponse {
  available: boolean;
  results: HistoricalEvent[];
  total_events?: number;
  critical_events?: number;
  detection_rate?: string;
  source?: string;
}
