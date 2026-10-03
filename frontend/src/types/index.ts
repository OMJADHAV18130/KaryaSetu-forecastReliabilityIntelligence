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
  /** The booster's own output before the sigmoid calibrator. */
  uncalibrated_probability: number;
  calibration_applied: boolean;
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

/**
 * Global importance: mean absolute SHAP per feature. This is a magnitude, so it
 * has no direction — unlike the per-prediction breakdown.
 */
export interface GlobalFeatureImportance {
  feature: string;
  mean_abs_shap: number;
  rank: number;
}

export interface GlobalExplanation {
  available: boolean;
  features: GlobalFeatureImportance[];
  model_version: string;
  background_samples?: number;
  /** Set when attribution could not be computed. */
  message?: string;
}

export interface ShapFeature {
  feature: string;
  value: number;
  shap_value: number;
  direction: 'increases_bust_risk' | 'decreases_bust_risk' | 'neutral';
  rank: number;
}

export interface LocalExplanation {
  available: boolean;
  features: ShapFeature[];
  message?: string;
}

/**
 * Attribution for one coordinate. The probability here is the same evaluation
 * the SHAP values decompose, not a separate run.
 */
export interface LocationExplanation {
  available: boolean;
  features: ShapFeature[];
  /**
   * SHAP's expected value, in log-odds. `sigmoid(base_value + sum of the
   * shap_values)` reconstructs `bust_probability`, which is what lets the page
   * show the reader that the bars add up to the number above them.
   */
  base_value?: number | null;
  /**
   * The booster's own probability, before the sigmoid calibrator. TreeSHAP
   * decomposes this stage, not the calibrated figure, so the page has to show
   * both for the arithmetic to add up.
   */
  uncalibrated_probability?: number;
  /** False when the calibrator is unavailable and the raw probability was used as-is. */
  calibration_applied?: boolean;
  latitude: number;
  longitude: number;
  day: number;
  lead_hours: number;
  bust_probability: number;
  confidence: number;
  confidence_level: string;
  region?: string;
  model_version?: string | null;
  model_inputs: Record<string, number>;
  derivation?: InputDerivation;
  message?: string;
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
  /** Field documentation, returned so an operator knows what to supply. */
  expected_record_shape?: Record<string, string>;
  reference_dataset?: string | null;
  total_points?: number;
  bust_count?: number;
  reliable_count?: number;
}

/**
 * Model identity as reported by the loaded artifact. The UI reads this rather
 * than restating the version or feature list, so the two cannot drift apart.
 */
export interface ModelInfo {
  model_version: string;
  model_type: string;
  feature_count: number;
  features: string[];
  is_ready: boolean;
  calibration_loaded: boolean;
  shap_available: boolean;
  environment: string;
}

export interface ConfusionCounts {
  true_negatives: number;
  false_positives: number;
  false_negatives: number;
  true_positives: number;
}

/**
 * Figures from the notebook's own September 2019 held-out test set, served
 * statically from models/notebook_evaluation.json. This split cannot be
 * re-scored in this deployment, so these are records of a past evaluation
 * rather than live statistics.
 */
export interface HeldOutTestMetrics {
  label: string;
  n_samples: number | null;
  n_bust: number | null;
  confusion_matrix: ConfusionCounts | null;
  classification_report: {
    precision: number | null;
    recall: number | null;
    f1_score: number | null;
    accuracy: number | null;
    macro_precision: number | null;
    macro_recall: number | null;
    macro_f1: number | null;
  } | null;
  roc_auc: number | null;
  pr_auc: number | null;
  mcc: number | null;
  brier_raw: number | null;
  brier_calibrated: number | null;
  calibration_method: string | null;
  operating_threshold: number | null;
  source_cells: number[];
  notes: string[];
}

/** What the loaded booster measures on the data it was actually fitted on. */
export interface ServedArtifactMetrics {
  label: string;
  n_samples: number | null;
  roc_auc: number | null;
  pr_auc: number | null;
  mcc: number | null;
  accuracy: number | null;
  brier_raw: number | null;
  brier_calibrated: number | null;
  confusion_matrix: ConfusionCounts | null;
  note: string;
}

export interface ThresholdSweepRow {
  threshold: number;
  precision: number;
  recall: number;
  f1: number;
}

export interface ModelPerformance {
  model_version: string;
  model_type: string;
  feature_count: number;
  features: string[];
  hyperparameters: Record<string, unknown>;

  held_out_test_set: HeldOutTestMetrics | null;
  served_artifact: ServedArtifactMetrics;
  splits: {
    train?: string | null;
    validation?: string | null;
    test?: string | null;
    train_rows?: number | null;
    validation_rows?: number | null;
    test_rows?: number | null;
  } | null;
  threshold_sweep: {
    label: string;
    note?: string | null;
    rows: ThresholdSweepRow[];
  } | null;

  confidence_bands: Record<string, unknown>;
  /** Explicit statement of what the model does and does not cover. */
  scope: string;
  research_only: boolean;
  evaluation_note?: string | null;
}

export interface HealthStatus {
  status: string;
  model_loaded: boolean;
  calibration_loaded: boolean;
  shap_available?: boolean;
  environment: string;
}

/**
 * How a point's meteorological drivers were obtained. The prototype has no
 * live NWP feed, so the drivers are interpolated from the trained reference
 * grid. The UI must state this wherever a value is displayed.
 */
export interface InputDerivation {
  method: string;
  source_cell: string;
  distance_km: number;
  neighbour_count: number;
  note?: string;
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
  model_version?: string | null;
  derivation?: InputDerivation;
}

export interface TimeSeriesPoint {
  day: number;
  lead_hours: number;
  bust_probability: number;
  confidence: number;
  confidence_level: string;
  /**
   * The exact input vector scored for this day. Lead time is one of the
   * model's features, so this genuinely differs between days and the UI shows
   * it per day rather than once for the whole series.
   */
  model_inputs?: Record<string, number>;
}

export interface TimeSeriesResponse {
  latitude: number;
  longitude: number;
  region?: string;
  model_version?: string | null;
  derivation?: InputDerivation;
  series: TimeSeriesPoint[];
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
  detection_rate?: string | null;
  source?: string | null;
  /** Explains why the list is empty when ``available`` is false. */
  message?: string;
  /** Field documentation, returned so an operator knows what to supply. */
  expected_record_shape?: Record<string, string>;
}
