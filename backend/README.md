# KaryaSetu ML Forecast Reliability Engine (FastAPI)

FastAPI backend serving real-time machine learning predictions for Medium-Range Numerical Weather Forecast Bust Detection.

## The 13 Meteorological & Forecast Features

| # | Feature Key | Meteorological Parameter | Physical Unit | What it represents |
|---|-------------|--------------------------|---------------|-------------------|
| 1 | `precipitation_24h` | 24-hour precipitation | mm | Forecast rainfall accumulation |
| 2 | `temperature_2m` | 2m temperature | °C | Near-surface atmospheric temperature |
| 3 | `mean_sea_level_pressure` | Mean sea-level pressure | hPa | Atmospheric surface pressure |
| 4 | `u_wind_10m` | 10m U-wind | m/s | Zonal (east–west) wind velocity |
| 5 | `v_wind_10m` | 10m V-wind | m/s | Meridional (north–south) wind velocity |
| 6 | `specific_humidity_850` | Specific humidity at 850 hPa | g/kg | Moisture in lower troposphere |
| 7 | `geopotential_500` | Geopotential at 500 hPa | gpm | Mid-tropospheric steering flow / circulation |
| 8 | `vertical_velocity_500` | Vertical velocity at 500 hPa | Pa/s | Upward (negative omega) or downward motion |
| 9 | `latitude` | Latitude | °N | Geographic location coordinate |
| 10 | `longitude` | Longitude | °E | Geographic location coordinate |
| 11 | `lead_time_days` | Lead time | Days | Forecast horizon: Day 1–10 |
| 12 | `ensemble_spread` | Ensemble spread | Index | Dispersion / variance across numerical members |
| 13 | `cape` | CAPE | J/kg | Convective Available Potential Energy / instability |

## API Endpoints

- `GET /` — Service health check & metadata
- `GET /api/features` — Detailed schema & bounds for the 13 features
- `POST /api/predict` — Runs ML inference on the 13 features, returning bust probability %, confidence score, risk level, primary failure driver, and SHAP-like feature contributions
- `GET /api/regions/forecast?lead_day=5` — Regional batch forecasts for all 36 Indian states & union territories
- `GET /api/model/info` — Model architecture, training verification metrics, and validation scores

## How to Plug In Your Own Trained Model File

1. Place your serialized model (`model.joblib` or `model.pkl`) into `backend/`.
2. In `backend/model.py`, uncomment the joblib/pickle loader:
   ```python
   import joblib
   # my_model = joblib.load('backend/model.joblib')
   ```
3. Pass the 13 feature array into `my_model.predict_proba([[...]])`.

## Docker Deployment

### 1. Build and Run with Docker Compose (Recommended)
From the project root:
```bash
# Build and start container
docker compose up -d --build

# View logs
docker compose logs -f backend

# Stop container
docker compose down
```

### 2. Build and Run with Docker CLI
```bash
# Build the image
docker build -t karyasetu-backend:latest ./backend

# Run the container with environment variables
docker run -d \
  --name karyasetu-backend \
  -p 8000:8000 \
  --env-file ./backend/.env \
  karyasetu-backend:latest
```

The API will be available at `http://localhost:8000` (docs at `http://localhost:8000/docs`).
