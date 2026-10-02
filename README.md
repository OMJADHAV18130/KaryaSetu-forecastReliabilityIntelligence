# KaryaSetu — Forecast Reliability Intelligence

> **"Don't just look at the forecast. Know when you should trust it."**

AI-based forecast bust detection platform that adds a reliability layer over medium-range rainfall forecasts. The system does NOT replace NWP forecasts — it predicts when forecasts may become unreliable.

## Project Overview

KaryaSetu is a full-stack research prototype for detecting rainfall forecast busts (large forecast errors) in medium-range weather forecasts (Day 1–Day 10). It uses a trained XGBoost classifier with sigmoid calibration to predict the probability that a rainfall forecast will have a large error.

### Core Pipeline

```
NWP / Weather Forecast Data
        ↓
Feature Preparation (11 features)
        ↓
Trained XGBoost Model
        ↓
Calibrated Bust Probability
        ↓
Forecast Confidence
        ↓
Risk / Error-Prone Area Detection
        ↓
SHAP Explainability
        ↓
Verification
        ↓
React Operational Dashboard
```

### The Five Official Outcomes

1. **Forecast Confidence Map** — Day 1–Day 10, region-wise confidence
2. **Forecast Bust Probability** — Probability of large rainfall forecast error
3. **Error-Prone Area Detection** — Areas where forecast reliability is low
4. **Explainable Output** — SHAP-based model feature contributions
5. **Prototype Dashboard/API** — React + FastAPI operational-style prototype

### Map Views

The India map carries a **view toggle in the map's top bar** — the default view is
unchanged, and the risk map is an additional layer on top of the same map:

| View | Contents |
| --- | --- |
| **Grid Map** (default) | The 30 trained 5.625° model-grid anchors, the major district station pins, the optional coarse grid-cell bounds, and free hover/click inspection at any coordinate. |
| **Bust Risk Map** | A district-level choropleth of all 755 Census 2011 districts, filled with the continuous bust-probability / confidence colour scale, with a threshold legend, the highest-bust-risk (or lowest-confidence) district ranking, and hover/click inspection. |

Both views share the same `MapContainer`, so in **both** of them:

- the **Indian Boundary Corrector** corrected tile layer stays active,
- the **Survey of India sovereign boundary** vector overlay stays active and renders
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
| **Features** | 11 meteorological and spatial features |
| **Domain** | India: 8°N–37°N, 68°E–98°E |
| **Lead Time** | 24h–240h (Day 1–Day 10) |
| **Grid** | 6 × 5 = 30 points (WeatherBench2 HRES) |

### Features (11 total, exact order required)

| # | Feature | Description | Unit |
|---|---------|-------------|------|
| 1 | total_precipitation_24hr | 24h accumulated precipitation | m |
| 2 | 2m_temperature | 2-meter temperature | K |
| 3 | mean_sea_level_pressure | Mean sea level pressure | Pa |
| 4 | 10m_u_component_of_wind | 10m U (zonal) wind | m/s |
| 5 | 10m_v_component_of_wind | 10m V (meridional) wind | m/s |
| 6 | specific_humidity_850 | Specific humidity at 850 hPa | kg/kg |
| 7 | geopotential_500 | Geopotential at 500 hPa | m²/s² |
| 8 | vertical_velocity_500 | Vertical velocity at 500 hPa | Pa/s |
| 9 | longitude | Longitude | °E |
| 10 | latitude | Latitude | °N |
| 11 | lead_hours | Forecast lead time | hours |

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

| Metric | Value |
|--------|-------|
| ROC-AUC | 0.868 |
| PR-AUC | 0.392 |
| MCC | 0.349 |
| Accuracy | 86% |
| Brier Score (raw) | 0.1060 |
| Brier Score (calibrated) | 0.0466 |

**NOTE**: These are research test-set results from the September 2019 test set. These are NOT operational NCMRWF performance statistics.

## API Documentation

### GET /api/health

Returns service health status.

```json
{
    "status": "ok",
    "model_loaded": true,
    "calibration_loaded": true,
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
    "lead_hours": 96
}
```

**Response:**
```json
{
    "bust_probability": 0.72,
    "confidence": 0.28,
    "confidence_level": "LOW",
    "day": 4,
    "lead_hours": 96,
    "latitude": 19.6875,
    "longitude": 73.125,
    "model_version": "xgb-rainfall-bust-v1"
}
```

### GET /api/forecast/map

Grid prediction data for map visualization.

**Parameters:** `day` (1-10), `layer` (bust_probability|confidence)

### GET /api/forecast/overview

Summary statistics for a given day.

### GET /api/forecast/location

Detailed forecast for a specific location.

**Parameters:** `latitude`, `longitude`, `day`

### GET /api/bust-risk

High-risk locations sorted by bust probability.

**Parameters:** `day`, `min_probability`, `region`

### GET /api/bust-risk/areas

Error-prone areas detected via spatial clustering of model predictions.

**Parameters:** `day`, `threshold`

### GET /api/explanation/global

Global SHAP feature importance.

### POST /api/explanation/local

Local SHAP explanation for a single prediction.

**Request:** Same features as /api/predict.

### GET /api/verification

Forecast vs reference comparison. Currently returns "not available" since verification data is not connected.

### GET /api/historical-events

Historical verification records. Currently returns empty.

### GET /api/model-performance

Model performance metrics and metadata.

## Project Structure

```
project-root/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI application
│   │   ├── api/routes/           # API endpoints
│   │   ├── core/                # Config, logging
│   │   ├── schemas/             # Pydantic models
│   │   ├── services/            # Business logic
│   │   ├── ml/                  # Model loading, prediction, SHAP
│   │   └── data/                # Data loading, preprocessing
│   ├── models/                  # Trained model artifacts
│   │   ├── xgboost_model/
│   │   ├── calibration/
│   │   └── shap/
│   ├── train_model.py           # Model training script
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/          # React components
│   │   ├── pages/               # Page components
│   │   ├── services/            # API client
│   │   ├── hooks/               # Data fetching hooks
│   │   ├── types/               # TypeScript types
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   └── .env.example
└── README.md
```

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
| ENVIRONMENT | research | Environment name |
| DEBUG | false | Debug mode |
| LOG_LEVEL | INFO | Logging level |
| MODEL_PATH | models/xgboost_model/model.json | Path to XGBoost model |
| CALIBRATOR_PATH | models/calibration/calibrator.joblib | Path to calibrator |
| SHAP_BACKGROUND_PATH | models/shap/background_data.joblib | Path to SHAP background |
| CORS_ORIGINS | http://localhost:5173,... | Allowed CORS origins |

### Frontend (.env)

| Variable | Default | Description |
|----------|---------|-------------|
| VITE_API_MODE | mock | API mode: mock or live |
| VITE_API_BASE_URL | http://localhost:8000 | Backend API URL |

## Mock Mode vs Live Mode

### Mock Mode (default)

- Uses demo data with the same schemas as the API
- Clearly labeled as "DEMO DATA" in the UI
- Works without the backend running
- Supports the full demo flow

### Live Mode

- Connects to the FastAPI backend
- Uses real model predictions
- Requires backend to be running with trained model artifacts

To switch modes, set `VITE_API_MODE=live` in `frontend/.env`.

## Demo Flow

The application supports the following 2–3 minute demonstration:

1. **Open Overview** — Show India reliability map with confidence layer
2. **Select Day 4** — Switch to a different forecast lead time
3. **Switch Layer** — Change from Confidence to Bust Probability
4. **Click High-Risk Location** — Show 72% bust probability, 28% confidence
5. **Click Explain Risk** — Show SHAP feature contributions
6. **Switch D1–D10** — Show changing reliability across lead times
7. **Open Verification** — Show forecast vs reference (currently unavailable)
8. **Open Model Performance** — Show ROC-AUC, PR-AUC, MCC, Accuracy, Brier score

## Research Limitations

1. **Research Prototype**: This is a research prototype, not an operational NCMRWF system
2. **Limited Domain**: Trained on WeatherBench2 HRES/ERA5 for India region only
3. **Single Variable**: Demonstrates rainfall forecast bust detection only — not temperature, pressure, or other variables
4. **Research Data**: Uses WeatherBench2 research data, not operational NWP forecasts
5. **Verification Not Connected**: Reference observations are not yet connected; verification returns "not available"
6. **No Real-Time Data**: Does not process live NWP forecasts or real-time observations
7. **Grid Resolution**: Uses coarse 64×32 equiangular grid (~5.625° resolution)

## Scientific Scope Disclaimer

**This is a research prototype for rainfall forecast bust detection only.**

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

All performance metrics are from the September 2019 research test set. These are NOT operational NCMRWF performance statistics.

## Testing

### Backend Tests

```bash
cd backend
pytest tests/
```

### Frontend Tests

```bash
cd frontend
npm run build
```

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

Research prototype for academic and demonstration purposes.
