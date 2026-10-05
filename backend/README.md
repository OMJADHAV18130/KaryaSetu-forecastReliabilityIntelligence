# KaryaSetu ML Forecast Reliability Engine (FastAPI)

FastAPI backend serving machine learning inference, spatial bust intelligence, and forecast reliability metrics for Medium-Range Numerical Weather Prediction (Day 1–Day 10).

Trained and calibrated using the complete 19-feature pipeline reproduced from `notebookf941b4a0d6.ipynb` against ECMWF HRES data on the WeatherBench2 5.625° equiangular grid.

---

## The 19 Meteorological & Structural Features

The served XGBoost booster takes all 19 features across 5 thematic groups, in strictly ordered column alignment:

### 1. Raw Meteorological Variables (8)
| # | Feature Column | Meteorological Parameter | Physical Unit | Domain Range | Description |
|---|----------------|--------------------------|---------------|--------------|-------------|
| 1 | `total_precipitation_24hr` | 24-hr Total Precipitation | m | [0.0, 0.5] | 24-hour accumulated forecast precipitation |
| 2 | `2m_temperature` | 2m Air Temperature | K | [250.0, 330.0] | Near-surface ambient atmospheric temperature |
| 3 | `mean_sea_level_pressure` | Mean Sea-Level Pressure | Pa | [95,000, 105,000] | Barometric pressure adjusted to sea level |
| 4 | `10m_u_component_of_wind` | 10m U-Wind Component | m/s | [-50.0, 50.0] | Zonal (east–west) near-surface wind speed |
| 5 | `10m_v_component_of_wind` | 10m V-Wind Component | m/s | [-50.0, 50.0] | Meridional (north–south) wind speed |
| 6 | `specific_humidity_850` | Specific Humidity @ 850 hPa | kg/kg | [0.0, 0.035] | Moisture content in the lower troposphere |
| 7 | `geopotential_500` | Geopotential @ 500 hPa | m²/s² | [45,000, 65,000] | Mid-tropospheric steering flow and heights |
| 8 | `vertical_velocity_500` | Vertical Velocity @ 500 hPa | Pa/s | [-5.0, 5.0] | Large-scale upward/downward vertical motion |

### 2. Spatial Gradients (3)
*Computed via finite differences across neighboring cells on the 5.625° equiangular grid.*
| # | Feature Column | Physical Unit | Description |
|---|----------------|---------------|-------------|
| 9 | `mslp_gradient` | Pa/deg | Horizontal spatial gradient magnitude of sea-level pressure (identifies synoptic fronts & troughs) |
| 10 | `temp_gradient` | K/deg | Horizontal spatial gradient magnitude of surface temperature (identifies thermal boundaries) |
| 11 | `geo500_gradient` | (m²/s²)/deg | Horizontal spatial gradient magnitude of 500 hPa geopotential height (identifies jet streaks & vorticity) |

### 3. Lead-Time Tendencies (4)
*Computed across consecutive forecast horizons (`.diff("prediction_timedelta")`), initialized to 0 at Day 1 (lead 24h).*
| # | Feature Column | Physical Unit | Description |
|---|----------------|---------------|-------------|
| 12 | `mean_sea_level_pressure_tendency` | Pa/day | Rate of change in MSLP across consecutive lead-time days |
| 13 | `2m_temperature_tendency` | K/day | Rate of change in 2m temperature across consecutive lead-time days |
| 14 | `geopotential_500_tendency` | (m²/s²)/day | Rate of change in 500 hPa geopotential across consecutive lead-time days |
| 15 | `total_precipitation_24hr_tendency` | m/day | Rate of change in forecast rainfall accumulation across lead days |

### 4. Time-Series Pattern Feature (1)
| # | Feature Column | Unit | Description |
|---|----------------|------|-------------|
| 16 | `bust_pattern_similarity` | [0.0, 1.0] | Cosine similarity between the 10-day rainfall forecast trajectory and historical June–July bust archetypes from `notebookf941b4a0d6.ipynb` |

### 5. Structural & Spatial Features (3)
| # | Feature Column | Unit | Description |
|---|----------------|------|-------------|
| 17 | `longitude` | °E | Geographic longitude coordinate within the India domain (68°E–98°E) |
| 18 | `latitude` | °N | Geographic latitude coordinate within the India domain (8°N–37°N) |
| 19 | `lead_hours` | hours | Forecast lead horizon in hours (24h–240h, corresponding to Days 1–10) |

---

## Extended Notebook Analysis Endpoints (`notebookf941b4a0d6.ipynb`)

Beyond per-coordinate inference, the backend exposes the 3 core analytical sections introduced in `notebookf941b4a0d6.ipynb`:

1. **Feature A: Bust-Type Breakdown (`GET /api/bust/breakdown`)**:
   - Categorizes forecast verification outcomes into Hit, Miss, False Alarm, and Correct Rejection.
   - Partitions outcomes across lead-time buckets: **Early (Days 1–3)**, **Mid (Days 4–7)**, and **Late (Days 8–10)**.

2. **Feature B: Error-Prone Region Ranking & Systematic Blind Spot Detection (`GET /api/bust/blind-spots`)**:
   - Computes empirical error rates vs. model risk scores across meteorological zones.
   - Detects systematic blind spots where model prediction divergence exceeds tolerance thresholds.

3. **Feature C: Pseudo-Ensemble Spread & Model Retraining Comparison (`GET /api/bust/pseudo-ensemble`)**:
   - Simulates physical ensemble perturbations to assess forecast spread and uncertainty bounds.
   - Benchmarks baseline model performance against the newly retrained 19-feature booster.

---

## Core API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Service liveness, artifact load status, environment mode |
| `GET` | `/api/model-info` | Model metadata, exact 19 feature names, calibrated status |
| `GET` | `/api/model-performance` | Evaluation statistics (September 2019 test set and served artifact) |
| `POST` | `/api/predict` | Single-point 19-feature inference returning calibrated bust probability & confidence |
| `GET` | `/api/forecast/location` | Point evaluation with inverse-distance grid interpolation for any lat/lon coordinate |
| `GET` | `/api/forecast/time-series`| 10-day lead-time trajectory for a given geographic coordinate |
| `GET` | `/api/forecast/map` | Gridded domain evaluations across all 30 WeatherBench2 anchor points |
| `POST` | `/api/forecast/batch` | High-throughput batch scoring for multiple coordinates |
| `GET` | `/api/bust-risk` | Ranked high-risk forecast locations filtered by threshold and region |
| `GET` | `/api/bust-risk/areas` | Spatial clusters of elevated forecast bust risk |
| `GET` | `/api/explanation/global` | Global SHAP feature importance across all 19 features |
| `POST` | `/api/explanation/local` | Per-prediction local SHAP feature attribution |
| `GET` | `/api/bust/breakdown` | **Feature A**: Bust-type breakdown by lead-time buckets |
| `GET` | `/api/bust/blind-spots` | **Feature B**: Error-prone region ranking & blind spot detection |
| `GET` | `/api/bust/pseudo-ensemble`| **Feature C**: Pseudo-ensemble spread & model comparison |
| `GET` | `/api/verification` | Verification archive status and model skill metrics |

---

## Running and Testing

### Run Tests
```bash
python -m pytest backend/tests/
```
All 113+ contract, honesty, validation, map scoring, and feature schema tests pass against the committed 19-feature artifacts.

### Start Backend Locally
```bash
uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
```

---

## Docker Deployment

### 1. Build and Run with Docker Compose
From the project root:
```bash
docker compose up -d --build
docker compose logs -f backend
```

### 2. Build and Run with Docker CLI
```bash
docker build -t karyasetu-backend:latest ./backend
docker run -d --name karyasetu-backend -p 8000:8000 --env-file ./backend/.env karyasetu-backend:latest
```
API Documentation will be available at `http://localhost:8000/docs`.
