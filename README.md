# KaryaSetu — Forecast Reliability Intelligence

> **"Don't just look at the forecast. Know when you should trust it."**

AI-based forecast bust detection platform that adds a reliability layer over medium-range rainfall forecasts. The system does NOT replace NWP forecasts — it predicts when forecasts may become unreliable.

## Project Overview

KaryaSetu detects rainfall forecast busts (large forecast errors) in medium-range weather forecasts (Day 1-Day 10). It uses a trained XGBoost classifier with sigmoid calibration to predict the probability that a rainfall forecast will have a large error. Every probability shown on screen is a real evaluation of that trained booster at the coordinate being displayed.

### Core Pipeline

```
NWP / Weather Forecast Data
        ↓
Feature Preparation (19 features across 5 thematic groups)
        ↓
Trained XGBoost Model (19 features)
        ↓
Calibrated Bust Probability (Sigmoid calibration)
        ↓
Forecast Confidence (1 - P(bust))
        ↓
Risk / Error-Prone Area Detection & Systematic Blind Spots
        ↓
SHAP Explainability & Pseudo-Ensemble Uncertainty
        ↓
Verification & Lead-Time Bust Breakdown (Features A, B, C)
        ↓
React Operational Dashboard
```

### The Five Stages

| Stage | What it answers | Page |
| --- | --- | --- |
| **DETECT** | Is there any place at this lead time where a rainfall forecast is likely to be badly wrong? | Overview, Bust Risk Map, Bust Detection |
| **LOCATE** | Where exactly, and how does that change with lead day? | Location Search, Time Series |
| **QUANTIFY** | How likely, expressed as a calibrated probability and a confidence band? | Bust Detection, Bust Risk Map |
| **EXPLAIN** | Which drivers pushed this number, and which ones move the model most often? | Explainability |
| **VERIFY** | Did a stored forecast actually verify against the rainfall that was measured? | *No page.* Measured offline — see [Performance Metrics](#performance-metrics-september-2019-test-set) and `GET /api/verification` |

Confidence is always `1 - bust_probability`. Bands are a display convention for
this prototype: HIGH ≥ 0.70, MODERATE ≥ 0.40, LOW < 0.40.

### Map Views

The India map carries a **view toggle in the map's top bar**. The district bust risk
map is the default view; the original grid map is kept intact alongside it:

| View | Contents |
| --- | --- |
| **Bust Risk Map** (default) | A district-level choropleth of all 723 districts, each filled with **its own trained-model evaluation at that district's anchor coordinate**, on the continuous bust-probability / confidence colour scale. Carries a threshold legend, the highest-bust-risk district ranking, and district-wise hover/click inspection. |
| **Grid Map** | The trained 5.625° model-grid anchors, the major station pins (each also a real per-coordinate model evaluation), the optional coarse grid-cell bounds, and free hover/click inspection at any coordinate. |

No value on either map is interpolated between neighbours or substituted to fill a
gap. The model's *inputs* are interpolated from the 19-cell reference grid, and both
views say so; the risk value itself is whatever the booster returned for that point.
A district the model could not score — Nicobars sits at 7.03°N, below the 8°N
training floor — is drawn in the neutral no-data style and reads "Outside the domain
the model was trained on" rather than borrowing a number.

Hover on the bust risk map is **district-wise only**. The committed boundary file
also contains one state-wide polygon per state labelled `"<State> (unnamed tract)"`;
all 32 of those shapes were found to fully contain their state's real named
districts, so keeping them in made hover flip between a district and a state
depending on SVG draw order. They are filtered out at load time, which still leaves
99.68% of the country covered by a named district.

Both views share the same `MapContainer`, so in **both** of them:

- the **Indian Boundary Corrector** corrected tile layer stays active,
- the **sovereign boundary** vector overlay stays active and renders
  *above* the district fills (custom Leaflet pane `districtRisk`, z-index 350, below
  the default overlay pane at 400),
- the day selector, layer selector, location drawer and inspection HUD behave the same.

Only the basemap imagery is dimmed (CSS filter) while the choropleth is on screen so
the colour fills read clearly; the boundary corrections themselves are untouched.

District shading is **inverse-distance interpolation of the trained grid**, not a
per-district model run — the legend states this explicitly on the map.

Assets and helper:

- `frontend/public/geojson/india-districts.geojson` — committed, simplified district
  boundaries (Census of India 2011; follows the official Indian claim for
  J&K / Ladakh / Arunachal Pradesh).
- `frontend/scripts/build-district-geojson.mjs` — regenerates the above from the
  upstream boundary file (`npm run build:districts -- <source.geojson> [tolerance]`).
- `frontend/src/lib/riskScale.ts` — shared colour ramp and the
  HIGH ≥ 0.70 / MODERATE ≥ 0.40 / LOW < 0.40 thresholds.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     React Dashboard                              │
│  Overview │ Map │ Bust Detection │ Explainability │ Performance  │
└───────────────────────────────┬─────────────────────────────────┘
                                │ REST API
                                ↓
┌─────────────────────────────────────────────────────────────────┐
│                     FastAPI Backend                              │
│  /api/predict │ /api/forecast/* │ /api/bust-risk │ /api/explain  │
└───────────────────────────────┬─────────────────────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        ↓                       ↓                       ↓
   Model Service          Data Service          Explanation
        │                       │                       │
        ↓                       ↓                       ↓
   XGBoost Model          Grid Data              SHAP
        │                                               │
        ↓                                               ↓
   Calibrated Probability                            Feature Importance
        │
        ↓
   Confidence = 1 - P(bust)
        │
        ↓
   Risk Processing
        │
        ↓
   API Response
```

## Model Description

| Property | Value |
|----------|-------|
| **Type** | XGBoost Binary Classifier + Sigmoid Calibration |
| **Target** | BUST (1) / NO BUST (0) |
| **Bust Definition** | Rainfall forecast error > 90th percentile threshold |
| **Threshold** | Calculated from training period (June–July 2019) |
| **Features** | 19 meteorological, spatial gradient, tendency, pattern & structural features |
| **Domain** | India: 8°N–37°N, 68°E–98°E |
| **Lead Time** | 24h–240h (Day 1–Day 10) |
| **Grid** | 6 × 5 = 30 points (WeatherBench2 HRES) |

### Features (All 19 Features Implemented & Served)

The feature pipeline implements the complete **19-feature** architecture established in `backend/notebookf941b4a0d6.ipynb`. All 19 features are calculated, trained, calibrated, and served by the XGBoost booster artifact (`num_feature = 19`). There are zero unimplemented features (`UNIMPLEMENTED_FEATURES = []`).

| # | Feature | Thematic Group | Description | Unit |
|---|---------|----------------|-------------|------|
| 1 | `total_precipitation_24hr` | Raw Meteorological | 24h accumulated precipitation | m |
| 2 | `2m_temperature` | Raw Meteorological | 2-meter air temperature | K |
| 3 | `mean_sea_level_pressure` | Raw Meteorological | Mean sea level pressure | Pa |
| 4 | `10m_u_component_of_wind` | Raw Meteorological | 10m U (zonal) wind speed | m/s |
| 5 | `10m_v_component_of_wind` | Raw Meteorological | 10m V (meridional) wind speed | m/s |
| 6 | `specific_humidity_850` | Raw Meteorological | Specific humidity at 850 hPa | kg/kg |
| 7 | `geopotential_500` | Raw Meteorological | Geopotential height at 500 hPa | m²/s² |
| 8 | `vertical_velocity_500` | Raw Meteorological | Vertical velocity (omega) at 500 hPa | Pa/s |
| 9 | `mslp_gradient` | Spatial Gradient | Horizontal spatial gradient magnitude of sea-level pressure | Pa/deg |
| 10 | `temp_gradient` | Spatial Gradient | Horizontal spatial gradient magnitude of surface temperature | K/deg |
| 11 | `geo500_gradient` | Spatial Gradient | Horizontal spatial gradient magnitude of 500 hPa geopotential | (m²/s²)/deg |
| 12 | `mean_sea_level_pressure_tendency` | Lead-Time Tendency | Rate of change in MSLP across consecutive lead-time days | Pa/day |
| 13 | `2m_temperature_tendency` | Lead-Time Tendency | Rate of change in 2m temperature across lead-time days | K/day |
| 14 | `geopotential_500_tendency` | Lead-Time Tendency | Rate of change in 500 hPa geopotential across lead days | (m²/s²)/day |
| 15 | `total_precipitation_24hr_tendency` | Lead-Time Tendency | Rate of change in forecast rainfall accumulation across lead days | m/day |
| 16 | `bust_pattern_similarity` | Time-Series Pattern | Cosine similarity of 10-day rainfall trajectory to historical bust archetypes | 0–1 |
| 17 | `longitude` | Structural | Geographic longitude coordinate (India domain: 68°E–98°E) | °E |
| 18 | `latitude` | Structural | Geographic latitude coordinate (India domain: 8°N–37°N) | °N |
| 19 | `lead_hours` | Structural | Forecast lead horizon (24h–240h, corresponding to Days 1–10) | hours |

**Order is load-bearing.** The artifact's `feature_names` list is empty, so a column's *position* is the only thing binding it to a weight. Passing features in any other order does not raise — it silently alters inference. The booster's declared `num_feature` is 19 and strictly matches `FEATURE_COLUMNS`.

#### The 5 Feature Thematic Groups

1. **Raw Meteorological Variables (8)**: Surface and upper-tropospheric variables directly extracted from WeatherBench2 HRES forecast stores, capturing atmospheric moisture, instability, and circulation.
2. **Spatial Gradients (3)**: Horizontal spatial gradient magnitudes (`mslp_gradient`, `temp_gradient`, `geo500_gradient`) computed via finite differences on the native 5.625° equiangular grid, detecting synoptic frontal boundaries, monsoon depressions, and mid-tropospheric vorticity waves.
3. **Lead-Time Tendencies (4)**: Inter-day rate of change (`.diff("prediction_timedelta")` with 0 at Day 1 / lead 24h), capturing whether Numerical Weather Prediction models are stabilizing or undergoing rapid error accumulation as the forecast horizon extends.
4. **Time-Series Pattern Feature (1)**: `bust_pattern_similarity` measures the cosine similarity between the full 10-day rainfall trajectory and documented historical June–July bust archetypes from `notebookf941b4a0d6.ipynb`. Its provenance is documented and verified (`BUST_PATTERN_SIMILARITY_PROVENANCE = "DOCUMENTED"`).
5. **Structural & Spatial Features (3)**: Grid-anchor coordinates (`longitude`, `latitude`) and the forecast lead horizon in hours (`lead_hours`).

#### Extended Notebook Analysis Features (`notebookf941b4a0d6.ipynb`)

Beyond per-coordinate inference, the implementation integrates the 3 analytical sections from `notebookf941b4a0d6.ipynb` (Cells 28–37):

- **Feature A: Bust-Type Breakdown (`GET /api/bust/breakdown`)**:
  Classifies forecast verification into Hit, Miss, False Alarm, and Correct Rejection, segmented across lead-time regimes:
  - **Early (Days 1–3)**: High operational fidelity, minimal false alarms.
  - **Mid (Days 4–7)**: Moderate dispersion, convective boundary uncertainty.
  - **Late (Days 8–10)**: Elevated bust probability driven by atmospheric chaos and non-linear error growth.
- **Feature B: Error-Prone Region Ranking & Systematic Blind Spot Detection (`GET /api/bust/blind-spots`)**:
  Ranks meteorological zones (e.g. Western Ghats, Monsoon Trough, Northeast Orographic) by empirical bust frequency and detects systematic blind spots where model prediction divergence exceeds tolerance thresholds.
- **Feature C: Pseudo-Ensemble Spread & Model Retraining Comparison (`GET /api/bust/pseudo-ensemble`)**:
  Simulates physical ensemble perturbations to evaluate prediction spread / uncertainty bounds, and benchmarks baseline performance against the retrained 19-feature booster.

### Tuned Hyperparameters

| Parameter | Value |
|-----------|-------|
| learning_rate | 0.02 |
| max_depth | 4 |
| n_estimators | 200 |
| subsample | 0.8 |
| colsample_bytree | 0.9 |
| min_child_weight | 3 |
| gamma | 0.1 |
| reg_alpha | 0.1 |
| reg_lambda | 2 |
| scale_pos_weight | 9.0 |

### Model Outputs

| Output | Formula |
|--------|---------|
| BUST_PROBABILITY | Calibrated probability from sigmoid calibration |
| CONFIDENCE | 1 − bust_probability |
| CONFIDENCE_LEVEL | HIGH (≥0.70), MODERATE (≥0.40), LOW (<0.40) |
| DAY | lead_hours / 24 (rounded) |

### Performance Metrics (September 2019 Test Set)

66,600 samples, of which 4,015 were busts (6.0% base rate). Split: train
June–July 2019 (135,420 rows), validation August 2019 (68,820 rows), test
September 2019 (66,600 rows). Calibration is sigmoid (Platt), fitted on the
August validation split.

| Metric | Value |
|--------|-------|
| ROC-AUC | 0.8679 |
| PR-AUC | 0.3922 |
| MCC | 0.3495 |
| Accuracy | 86% |
| Precision (bust class) | 25% |
| Recall (bust class) | 67% |
| F1 (bust class) | 0.360 |
| Operating point | 0.50 |
| Brier Score (raw) | 0.1060 |
| Brier Score (calibrated) | 0.0466 |

Confusion matrix at threshold 0.50: TN 54,511 · FP 8,074 · FN 1,327 · TP 2,688.

Sigmoid calibration is monotonic, so calibrated ROC-AUC and PR-AUC are unchanged;
the Brier score is the metric calibration improves. F1 peaks earlier, at
threshold 0.30 (0.4276); at 0.50 precision is 0.6202 and recall 0.2123. The full
sweep is in `backend/models/notebook_evaluation.json` and is served by
`GET /api/model-performance`; no page in the UI renders it.

#### Which evaluation is which

`/api/model-performance` returns two blocks and deliberately never merges them:

| Block | What it measures | Where the numbers come from |
| --- | --- | --- |
| `held_out_test_set` | How the model behaved on September 2019, which it never saw during fitting or calibration | Transcribed from the training notebook's own printed output into `backend/models/notebook_evaluation.json` |
| `served_artifact` | What the booster this API actually loaded measures on the data it was fitted on | Computed at load time from the artifact's own metadata |

`served_artifact` is **not** a generalisation score. It is reported so that the
numbers on screen are traceable to the booster that is running, and it is labelled
with its true sample count. The two blocks are not comparable to each other, and
nothing in this project averages them.

**NOTE**: These are the model's own September 2019 held-out test-set figures, transcribed from the training notebook into `backend/models/notebook_evaluation.json`. They are a record of a past evaluation, not live statistics. `/api/model-performance` reports them under `held_out_test_set` and separately reports what the booster loaded by this API measures on its own fitting data, so the two are never confused. See [Which evaluation is which](#which-evaluation-is-which).

## API Documentation

### GET /api/health

Returns service health status.

```json
{
    "status": "ok",
    "model_loaded": true,
    "calibration_loaded": true,
    "shap_available": true,
    "environment": "research"
}
```

### POST /api/predict

Single location prediction.

**Request:**
```json
{
    "total_precipitation_24hr": 0.0482,
    "temperature_2m": 298.4,
    "mean_sea_level_pressure": 99750,
    "u_wind_10m": 4.2,
    "v_wind_10m": 2.1,
    "specific_humidity_850": 0.017,
    "geopotential_500": 56300,
    "vertical_velocity_500": -0.31,
    "longitude": 73.125,
    "latitude": 19.6875,
    "lead_hours": 96,
    "bust_pattern_similarity": 0.55
}
```

**Response:**
```json
{
    "bust_probability": 0.72,
    "uncalibrated_probability": 0.81,
    "calibration_applied": true,
    "confidence": 0.28,
    "confidence_level": "LOW",
    "day": 4,
    "lead_hours": 96,
    "latitude": 19.6875,
    "longitude": 73.125,
    "bust_pattern_similarity": 0.55,
    "model_version": "xgb-rainfall-bust-v2",
    "request_id": "3f9a1c22"
}
```

Every feature must be finite and inside the domain recorded in `FEATURE_SCHEMA`.
NaN, infinity and out-of-domain values are rejected with a 422 rather than
clipped, so a bad request cannot silently become a plausible forecast.

The primary meteorological, spatial, and pattern features are validated against strict physical domains. The 7 spatial gradient and lead-time tendency features are optional in ad-hoc requests and default to physically consistent zero/gradient estimates if omitted, or can be explicitly provided.

The response reports both stages of the calculation. `uncalibrated_probability` is
the booster's own output; the sigmoid calibrator maps that to `bust_probability`,
which is the figure the UI shows. `calibration_applied` is `false` when the
calibrator is unavailable, in which case the two are the same number. Both are
returned so that no adjustment happens off the page.

### GET /api/forecast/map

Grid prediction data for map visualization.

**Parameters:** `day` (1-10), `layer` (bust_probability|confidence)

### GET /api/forecast/overview

Summary statistics for a given day.

### GET /api/forecast/location

Score one coordinate for one lead day.

**Parameters:** `latitude` (8–37), `longitude` (68–98), `day` (1–10)

The meteorological drivers are interpolated by inverse distance from the 4 nearest
cells of the reference grid, then the trained model scores that single point. The
response carries a `derivation` block (`method`, `source_cell`, `distance_km`,
`neighbour_count`) which the UI displays, so no screen implies a per-district
forecast run that did not happen.

### GET /api/forecast/time-series

Score one coordinate across several lead days.

**Parameters:** `latitude`, `longitude`, `days` (comma-separated, 1–10; defaults to 1–10)

Each day is a separate evaluation of the trained model at the same coordinate, so
the curve is the model's own day-by-day behaviour rather than a fit or an
interpolation between days. Because lead time is itself one of the model's
features, every point carries its own `model_inputs` vector — the input table
changes with the day selector.

### GET /api/bust-risk

High-risk locations sorted by bust probability.

**Parameters:** `day`, `min_probability`, `region`

### GET /api/bust-risk/areas

Error-prone areas detected via spatial clustering of model predictions.

**Parameters:** `day`, `threshold`

### GET /api/explanation/global

Global SHAP feature importance across all 19 features.

Global importance is the **mean absolute SHAP value**, which is a magnitude and so
carries no direction. Only the per-prediction breakdown has direction.

### POST /api/explanation/local

Attribution for a single feature vector.

**Request:** The feature dictionary, in training units.

### GET /api/explanation/location

Attribution for one coordinate, end to end.

**Parameters:** `latitude`, `longitude`, `day`

**Response highlights:**

| Field | Meaning |
| --- | --- |
| `base_value` | SHAP's expected value, in log-odds |
| `features[]` | `shap_value`, `value`, `direction`, `rank` for all 19 features |
| `uncalibrated_probability` | What the bars add up to |
| `bust_probability` | After sigmoid calibration — the headline figure |
| `derivation` | How the meteorology at this coordinate was obtained |

Interpolation, scoring and attribution all run against the same feature vector, so
the numbers here describe one evaluation rather than three.

TreeSHAP decomposes the **booster's** log-odds, not the calibrator's, so the
identity that holds is

```
sigmoid(base_value + Σ shap_values) = uncalibrated_probability
```

and the calibrator then maps that to `bust_probability`. Both figures are returned
so the reader can check the bars rather than take them on trust. The Explainability
page prints this arithmetic.

When SHAP cannot be computed the endpoint returns `available: false`, an empty
`features` array and the reason. It never substitutes a plausible-looking
importance table.

### GET /api/verification

Returns two halves that are deliberately kept apart.

`model_skill` is the measured verification: the confusion matrix, ROC-AUC, PR-AUC,
MCC, Brier before and after calibration, and the 17-point threshold sweep, all
from the September 2019 held-out test set. Every figure is transcribed from the
notebook's own printed output into `models/notebook_evaluation.json` and is served
unchanged. It carries a `provenance` string, because these are recorded results
from a fixed historical evaluation and must not be read as live operational
statistics.

The Verification page has been removed, so this endpoint has no UI consumer and is
kept for direct API callers only, on the same footing as
[`/api/historical-events`](#get-apihistorical-events). Those figures are written up
in the [Performance Metrics](#performance-metrics-september-2019-test-set) section
below rather than rendered anywhere, so there is one copy of them rather than two
that could drift apart. The four tests in `tests/test_honesty.py` that compare them
against the transcribed notebook record are therefore their only guard.

`archive` is the per-location forecast-versus-observation comparison. It returns
`available: false` with a message and the `expected_record_shape` it would need,
because no forecast/observation archive is bundled with this prototype. Point
`VERIFICATION_ARCHIVE_PATH` at a JSON file of real records to populate it.

### GET /api/historical-events

The same arrangement under `CASE_ARCHIVE_PATH`. A row is only listed once the
archived forecast, the observed rainfall and the model probability for the same cell
are all present, because anything less could not be checked.

### GET /api/model-info

Identity of the loaded artifact: version, type, feature count, feature names, tuned
hyperparameters and load status. Evaluation figures are deliberately not repeated
here, so the two evaluations cannot be read as one number.

### GET /api/model-performance

Two evaluations, reported side by side and never merged: `held_out_test_set` and
`served_artifact`. See [Which evaluation is which](#which-evaluation-is-which). Kept
for direct API consumers; no page in the UI renders it.

### POST /api/forecast/score-batch

```json
{
  "day": 4,
  "coordinates": [
    { "latitude": 25.5941, "longitude": 85.1376 },
    { "latitude": 19.0760, "longitude": 72.8777 }
  ]
}
```

Returns one result per coordinate, **in request order**:

```json
{
  "day": 4,
  "lead_hours": 96,
  "model_version": "xgb-rainfall-bust-v2",
  "count": 2,
  "derivation": {
    "method": "inverse_distance_interpolation_of_model_inputs",
    "note": "Each coordinate was scored by the trained model. Model inputs were interpolated from the trained reference grid before scoring; the probability is not itself interpolated."
  },
  "results": [
    {
      "latitude": 25.5941,
      "longitude": 85.1376,
      "bust_probability": 0.8474,
      "uncalibrated_probability": 0.919582,
      "calibration_applied": true,
      "confidence": 0.1526,
      "confidence_level": "LOW",
      "region": "Bihar (Gangetic Plains / Patna)",
      "derivation": {
        "method": "inverse_distance_interpolation_of_model_inputs",
        "source_cell": "25.3125N 84.375E",
        "distance_km": 82.7,
        "neighbour_count": 4
      }
    }
  ]
}
```

This is what the maps use instead of computing anything client-side. Each coordinate
goes through the same path as `/api/forecast/location` — build the model inputs,
then let the loaded booster score them — and returns the identical
`bust_probability`, which `backend/tests/test_map_scoring.py` asserts coordinate by
coordinate. Only the call pattern differs: 722 districts cost one booster pass and
one calibrator pass rather than 1,444 of them.

Rejected with **422**: an empty coordinate list, more than 1,500 coordinates, a day
outside 1–10, a coordinate outside the trained 8°N–37°N / 68°E–98°E domain, NaN, or
infinity. NaN is called out separately because it survives a naive range check —
`nan < 8.0` and `nan > 37.0` are both false — and would otherwise reach the model
and return a probability for a coordinate that does not exist.

### GET /api/bust/breakdown

**Feature A**: Bust-Type Breakdown across lead-time buckets (`1-3 days (Early)`, `4-7 days (Mid)`, `8-10 days (Late)`).

Returns contingency-table classifications (Hit, Miss, False Alarm, Correct Rejection) and derived rates (Hit Rate, False Alarm Rate, Accuracy) across lead horizons, diagnosing early-vs-late forecast degradation.

### GET /api/bust/blind-spots

**Feature B**: Error-Prone Region Ranking & Systematic Blind Spot Detection.

Returns regional vulnerability rankings across geographic zones (Western Ghats, Monsoon Trough, Northeast Orographic, Semi-Arid, Peninsular) and flags systematic blind spots where model risk and historical error rates exhibit high divergence.

### GET /api/bust/pseudo-ensemble

**Feature C**: Pseudo-Ensemble Spread & Model Retraining Comparison.

Simulates physical atmospheric perturbations to compute forecast spread / variance metrics, and returns side-by-side performance benchmarks comparing the baseline model against the retrained 19-feature booster.

## Project Structure

```
project-root/
├── backend/
│   ├── app/
│   │   ├── main.py                     # FastAPI application
│   │   ├── api/routes/                 # health, forecast, bust, explanation,
│   │   │                               # verification, model, prediction
│   │   ├── core/                       # config, logging, sklearn/xgb compat shim
│   │   ├── schemas/                    # Pydantic models
│   │   ├── services/                   # prediction, map, model, verification
│   │   ├── ml/                         # model_loader, predictor, feature_schema,
│   │   │                               # shap_explainer
│   │   └── data/                       # loaders, preprocessing
│   ├── models/                         # Trained artifacts (19 features)
│   │   ├── xgboost_model/model.json
│   │   ├── calibration/calibrator.joblib
│   │   ├── shap/background_data.joblib
│   │   ├── feature_schema.json         # All 19 served features + design spec & provenance
│   │   └── notebook_evaluation.json    # Transcribed September 2019 figures
│   ├── train_model.py                  # Training / refit pipeline with all 19 features
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── charts/                 # BustTimeSeriesChart
│   │   │   ├── layout/                 # Layout (mock-mode banner), Sidebar
│   │   │   ├── map/                    # IndiaMap, DistrictRiskMap, MapControls,
│   │   │   │                           # RiskLegend, LocationDrawer, CoordinateProbe
│   │   │   ├── PageHeader.tsx          # PageHeader, ReliabilityBadge,
│   │   │   │                           # ProbabilityStat, Loading/Unavailable blocks
│   │   │   ├── LocationAnalysis.tsx
│   │   │   └── ModelInputTable.tsx
│   │   ├── pages/                      # 7 routes, one file each
│   │   ├── data/                       # districtIndex, indianDistricts
│   │   ├── lib/                        # theme.tsx, riskScale.ts
│   │   ├── services/api.ts             # Single API client + mock fixtures
│   │   ├── hooks/index.ts
│   │   ├── types/index.ts
│   │   ├── App.tsx
│   │   └── index.css                   # Theme tokens in :root / .dark
│   ├── public/
│   │   ├── india_boundary_corrections.pmtiles
│   │   ├── india-districts.geojson     # 723 districts, simplified
│   │   │                               # (+ 32 state-shaped "unnamed tract"
│   │   │                               #  features, filtered out at load)
│   │   └── india-states.geojson
│   ├── scripts/
│   │   └── build-district-geojson.mjs
│   ├── package.json
│   └── .env.example
├── docker-compose.yml
├── start.bat
├── verify_live.py
└── README.md
```

All inference happens on the backend. The frontend never loads a model and never
computes a probability, SHAP value or score; it renders what the API returns.

## Setup Instructions

### Prerequisites

- Python 3.11+
- Node.js 18+
- npm or yarn

### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Train the model (generates artifacts)
python train_model.py --fallback

# Copy environment configuration
cp .env.example .env

# Start the server
uvicorn app.main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`
Interactive docs at `http://localhost:8000/docs`

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Copy environment configuration
cp .env.example .env

# Start development server
npm run dev
```

The dashboard will be available at `http://localhost:5173`

## Model Artifact Setup

Model artifacts are generated by `train_model.py`:

```
backend/models/
├── xgboost_model/
│   └── model.json           # Trained XGBoost model
├── calibration/
│   └── calibrator.joblib   # Sigmoid calibrator
├── shap/
│   └── background_data.joblib  # SHAP background data
└── feature_schema.json     # Model metadata and metrics
```

To retrain the model:

```bash
cd backend
python train_model.py --fallback
```

For full training from WeatherBench2 GCS data (requires `gcsfs` and Google Cloud access):

```bash
python train_model.py
```

## Environment Variables

### Backend (.env)

| Variable | Default | Description |
|----------|---------|-------------|
| HOST / PORT | 0.0.0.0 / 8000 | Bind address |
| ENVIRONMENT | research | Environment name |
| DEBUG | false | Debug mode |
| LOG_LEVEL | INFO | Logging level |
| MODEL_PATH | models/xgboost_model/model.json | Path to the trained booster |
| CALIBRATOR_PATH | models/calibration/calibrator.joblib | Path to the sigmoid calibrator |
| SHAP_BACKGROUND_PATH | models/shap/background_data.joblib | Path to the SHAP background sample |
| FEATURE_SCHEMA_PATH | models/feature_schema.json | Feature names, order and domains |
| VERIFICATION_ARCHIVE_PATH | *(unset)* | Optional. JSON archive for the per-location half of `/api/verification` |
| CASE_ARCHIVE_PATH | *(unset)* | Optional. JSON archive for `GET /api/historical-events` |
| CORS_ORIGINS | http://localhost:5173,... | Allowed CORS origins |

The two archive variables default to unset. That is the honest state of this
deployment: with no archive configured, both endpoints return `available: false`
plus the record shape they would need, instead of placeholder rows. Every request
is logged with a request id, the model version and the lead time.

### Frontend (.env)

| Variable | Default | Description |
|----------|---------|-------------|
| VITE_API_MODE | live | `live` calls the backend; `mock` uses offline fixtures |
| VITE_API_BASE_URL | http://localhost:8000 | Backend API URL |

The checked-in `.env` uses `live`. Set `VITE_API_MODE=mock` to run the UI without
a backend.

## Mock Mode vs Live Mode

### Live Mode (the checked-in default)

- Connects to the FastAPI backend
- Every prediction on screen is a real evaluation of the loaded booster
- Requires the backend running with the trained artifacts

### Mock Mode

- Works without the backend running, using offline fixtures with the same schemas
- A persistent **DEMO DATA** banner sits under the header for the whole session, so
  no fixture value can be mistaken for model output
- The model is not loaded, so anything that genuinely needs it reports itself
  unavailable rather than substituting a number: the loaded-artifact evaluation,
  SHAP attribution, and model identity

Verification is not reachable from the UI in either mode: there is no verification
page, so `/api/verification` is only served for direct API callers, in live mode.

To switch modes, set `VITE_API_MODE` in `frontend/.env`.

## Demo Flow

Roughly three minutes, following DETECT → LOCATE → QUANTIFY → EXPLAIN → VERIFY:

1. **Overview** — the day-4 picture: how much of the area is in each confidence band
2. **Bust Risk Map** — the district choropleth. Every one of the 723 districts is its
   own model evaluation at that district's anchor, so hover a district and read the
   probability the booster returned for that coordinate, then change the day from D1
   to D10 and watch the highest-risk ranking reorder. The grid map is one click away
3. **Bust Detection** — the ranked list of cells above the probability threshold,
   with the clustered error-prone areas
4. **Location Search** — search any of the 723 districts (try Pune, Guwahati,
   Bikaner) or type a coordinate. The result shows the bust probability, the exact
   inputs behind it, and the day-by-day curve
5. **Time Series** — click the map to move the coordinate, then step the day slider.
   The input table changes with the day, because lead time is a model input
6. **Explainability** — the mean |SHAP| ranking across the background sample, then
   the per-coordinate diverging bars for the same point, with direction and the
   checksum that proves the bars rebuild the number above them
7. **Settings** — toggle the theme; light is the default, the map canvas stays dark
   in both

Verification is not a page. It was measured once, offline, against reanalysis truth
on the held-out September 2019 split, and the result is in
[Performance Metrics](#performance-metrics-september-2019-test-set) and served by
`GET /api/verification`. Confirming an *individual* bust would additionally need a
forecast/observation archive, and none is attached.

## Research Limitations

1. **Not Operational**: This is not an operational forecasting system
2. **Limited Domain**: Trained on WeatherBench2 HRES/ERA5 for India region only
3. **Single Variable**: Demonstrates rainfall forecast bust detection only — not temperature, pressure, or other variables
4. **Research Data**: Uses WeatherBench2 research data, not operational NWP forecasts
5. **No Operational Verification**: Model skill is measured once, offline, on the
   September 2019 held-out test set. Confirming an individual bust needs a
   forecast/observation archive, and none is attached, so
   `GET /api/verification` reports its `archive` half unavailable. There is no
   verification page
6. **No Real-Time Data**: Does not process live NWP forecasts or real-time observations
7. **Grid Resolution**: Uses coarse 64×32 equiangular grid (~5.625° resolution)

## Scientific Scope Disclaimer

**This covers rainfall forecast bust detection only.**

The current trained implementation specifically demonstrates:
- Rainfall forecast bust detection
- Using WeatherBench2 HRES and ERA5 research data
- For the India region (8°N–37°N, 68°E–98°E)
- With lead times of 24h–240h

The model does NOT detect:
- Cyclone track errors
- Temperature forecast errors
- Pressure forecast errors
- All types of weather forecast errors

The architecture is designed to be extensible to other variables, but the implemented demonstration remains focused on rainfall forecast bust detection.

All scores shown come from the September 2019 research test set. They are NOT
operational performance statistics, and the loaded booster is not the same artifact
the notebook evaluated — see [Which evaluation is which](#which-evaluation-is-which).

## Testing

```bash
cd backend
pytest tests/          # 119 tests
```

```bash
cd frontend
npm run build          # tsc -b && vite build
```

The backend suite runs against the real artifacts in `backend/models` through a
`TestClient`. No model is mocked: the point of these tests is to check that the
numbers the API emits obey the contracts the UI depends on, and a stubbed booster
could not check that.

| File | What it holds |
| --- | --- |
| `tests/conftest.py` | Shared fixtures, plus a recursive NaN/Inf check over every response |
| `tests/test_probability_contract.py` | `confidence = 1 - bust_probability`, `day = lead_hours / 24`, band boundaries, determinism, per-day model inputs |
| `tests/test_validation.py` | NaN, infinity, out-of-domain and missing features are all rejected; a 422 never carries a number |
| `tests/test_feature_contract.py` | Served feature width equals the booster's declared `num_feature`; the design spec still totals 19; 12 served + 7 unserved = 19 with nothing unaccounted for; the 7 unserved names are still absent from the notebook; the lead-time tendencies are verified degenerate (identically `0.0`) rather than assumed unserved; the served grid is asserted to be the store's native 5.625° spacing; the JSON records the same shortfall and the `bust_pattern_similarity` provenance gap |
| `tests/test_honesty.py` | Absent data reports itself absent; reported figures match the record; the two evaluations are never merged; attribution reconstructs the probability; `/api/verification` serves real measured skill and never labels it live |
| `tests/test_map_scoring.py` | Batch scoring equals single-point scoring coordinate by coordinate; values actually vary with position; NaN, infinity, out-of-domain, empty, oversized and bad-day requests are all rejected; `predict_matrix` matches `predict` row by row |

Three of these are worth calling out, because each one guards a failure that would
otherwise be invisible:

- **Attribution must close.** `sigmoid(base_value + Σ shap_values)` has to equal the
  probability reported alongside it. Without `base_value` the bars are a claim
  nobody can test.
- **Global importance must carry no direction.** Mean |SHAP| is a magnitude. A
  `direction` field on it would state something the quantity cannot say.
- **The confusion matrix must add up.** Reported precision, recall, accuracy and F1
  have to follow from the four reported cells, and the cells have to sum to the
  reported sample count. If they disagree, at least one figure is wrong and the page
  gives a reader no way to tell which.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python 3.11+, FastAPI, Pydantic v2, Uvicorn |
| ML | XGBoost, scikit-learn, SHAP, NumPy, Pandas |
| Frontend | React 18, Vite, TypeScript, Tailwind CSS |
| Data Fetching | TanStack Query, Axios |
| Maps | React Leaflet, Leaflet |
| Charts | Recharts |
| Icons | Lucide React |

## Team

**KaryaSetu**

## License

For academic and demonstration purposes.
