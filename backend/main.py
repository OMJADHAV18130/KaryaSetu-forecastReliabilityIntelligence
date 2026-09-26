from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional
from .schemas import WeatherFeatures, PredictionResponse, FeatureMeta
from .model import FEATURE_METADATA, predict_bust_risk

app = FastAPI(
    title="KaryaSetu AI Forecast Reliability & Bust Detection API",
    description="Machine learning reliability and bust detection layer over NCMRWF numerical weather prediction using 13 meteorological & forecast features.",
    version="1.0.0"
)

# Enable CORS for frontend Vite app (localhost:5173, 5174, etc.)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Regional seed presets for Indian states
STATE_PRESETS = [
    {"id": "maharashtra", "name": "Maharashtra", "lat": 19.75, "lon": 75.71, "t2m": 31.2, "tp": 28.0, "w500": -0.42, "q850": 13.8, "cape": 1850.0},
    {"id": "gujarat", "name": "Gujarat", "lat": 22.25, "lon": 71.19, "t2m": 34.5, "tp": 5.0, "w500": 0.12, "q850": 9.2, "cape": 850.0},
    {"id": "rajasthan", "name": "Rajasthan", "lat": 27.02, "lon": 74.21, "t2m": 38.0, "tp": 1.2, "w500": 0.35, "q850": 6.8, "cape": 420.0},
    {"id": "odisha", "name": "Odisha", "lat": 20.95, "lon": 85.09, "t2m": 29.8, "tp": 52.0, "w500": -0.68, "q850": 16.2, "cape": 2400.0},
    {"id": "andhra-pradesh", "name": "Andhra Pradesh", "lat": 15.91, "lon": 79.74, "t2m": 32.4, "tp": 18.5, "w500": -0.22, "q850": 12.1, "cape": 1620.0},
    {"id": "telangana", "name": "Telangana", "lat": 18.11, "lon": 79.01, "t2m": 33.1, "tp": 14.0, "w500": -0.18, "q850": 11.5, "cape": 1450.0},
    {"id": "karnataka", "name": "Karnataka", "lat": 15.31, "lon": 75.71, "t2m": 27.6, "tp": 35.0, "w500": -0.45, "q850": 14.2, "cape": 1780.0},
    {"id": "kerala", "name": "Kerala", "lat": 10.85, "lon": 76.27, "t2m": 28.2, "tp": 64.0, "w500": -0.75, "q850": 17.5, "cape": 2650.0},
    {"id": "tamil-nadu", "name": "Tamil Nadu", "lat": 11.12, "lon": 78.65, "t2m": 31.8, "tp": 12.0, "w500": -0.15, "q850": 11.0, "cape": 1350.0},
    {"id": "madhya-pradesh", "name": "Madhya Pradesh", "lat": 22.97, "lon": 78.65, "t2m": 32.0, "tp": 22.0, "w500": -0.28, "q850": 12.4, "cape": 1500.0},
    {"id": "chhattisgarh", "name": "Chhattisgarh", "lat": 21.27, "lon": 81.86, "t2m": 30.5, "tp": 38.0, "w500": -0.52, "q850": 14.6, "cape": 1920.0},
    {"id": "jharkhand", "name": "Jharkhand", "lat": 23.61, "lon": 85.27, "t2m": 29.2, "tp": 34.0, "w500": -0.48, "q850": 13.9, "cape": 1820.0},
    {"id": "west-bengal", "name": "West Bengal", "lat": 22.98, "lon": 87.85, "t2m": 29.5, "tp": 48.0, "w500": -0.62, "q850": 15.8, "cape": 2300.0},
    {"id": "bihar", "name": "Bihar", "lat": 25.09, "lon": 85.31, "t2m": 30.0, "tp": 26.0, "w500": -0.32, "q850": 13.0, "cape": 1600.0},
    {"id": "uttar-pradesh", "name": "Uttar Pradesh", "lat": 26.84, "lon": 80.94, "t2m": 31.5, "tp": 16.0, "w500": -0.21, "q850": 11.8, "cape": 1380.0},
    {"id": "uttarakhand", "name": "Uttarakhand", "lat": 30.06, "lon": 79.01, "t2m": 18.5, "tp": 42.0, "w500": -0.85, "q850": 10.5, "cape": 1420.0},
    {"id": "himachal-pradesh", "name": "Himachal Pradesh", "lat": 31.10, "lon": 77.17, "t2m": 16.2, "tp": 36.0, "w500": -0.78, "q850": 9.8, "cape": 1280.0},
    {"id": "punjab", "name": "Punjab", "lat": 31.14, "lon": 75.34, "t2m": 31.0, "tp": 8.0, "w500": 0.05, "q850": 9.5, "cape": 950.0},
    {"id": "haryana", "name": "Haryana", "lat": 29.05, "lon": 76.08, "t2m": 32.2, "tp": 6.5, "w500": 0.08, "q850": 9.0, "cape": 920.0},
    {"id": "delhi", "name": "Delhi", "lat": 28.70, "lon": 77.10, "t2m": 33.0, "tp": 7.0, "w500": 0.02, "q850": 9.3, "cape": 980.0},
    {"id": "assam", "name": "Assam", "lat": 26.20, "lon": 92.93, "t2m": 27.5, "tp": 58.0, "w500": -0.72, "q850": 16.8, "cape": 2550.0},
    {"id": "meghalaya", "name": "Meghalaya", "lat": 25.46, "lon": 91.36, "t2m": 22.0, "tp": 82.0, "w500": -0.95, "q850": 18.2, "cape": 2800.0},
    {"id": "nagaland", "name": "Nagaland", "lat": 26.15, "lon": 94.56, "t2m": 24.0, "tp": 44.0, "w500": -0.55, "q850": 14.5, "cape": 1900.0},
    {"id": "manipur", "name": "Manipur", "lat": 24.66, "lon": 93.90, "t2m": 25.0, "tp": 40.0, "w500": -0.50, "q850": 14.0, "cape": 1850.0},
    {"id": "mizoram", "name": "Mizoram", "lat": 23.16, "lon": 92.93, "t2m": 26.0, "tp": 46.0, "w500": -0.58, "q850": 14.8, "cape": 2050.0},
    {"id": "tripura", "name": "Tripura", "lat": 23.94, "lon": 91.98, "t2m": 28.0, "tp": 50.0, "w500": -0.60, "q850": 15.5, "cape": 2200.0},
    {"id": "arunachal", "name": "Arunachal Pradesh", "lat": 28.21, "lon": 94.72, "t2m": 19.5, "tp": 65.0, "w500": -0.88, "q850": 13.5, "cape": 1950.0},
    {"id": "sikkim", "name": "Sikkim", "lat": 27.53, "lon": 88.51, "t2m": 15.0, "tp": 48.0, "w500": -0.82, "q850": 11.2, "cape": 1500.0},
    {"id": "goa", "name": "Goa", "lat": 15.29, "lon": 74.12, "t2m": 29.0, "tp": 56.0, "w500": -0.65, "q850": 16.0, "cape": 2350.0},
    {"id": "jammu-kashmir", "name": "Jammu & Kashmir", "lat": 33.77, "lon": 74.87, "t2m": 14.5, "tp": 28.0, "w500": -0.62, "q850": 8.5, "cape": 1100.0},
    {"id": "ladakh", "name": "Ladakh", "lat": 34.15, "lon": 77.57, "t2m": 4.2, "tp": 3.5, "w500": -0.15, "q850": 3.8, "cape": 250.0},
]


@app.get("/")
def health_check():
    return {
        "service": "KaryaSetu ML Forecast Reliability Engine",
        "status": "online",
        "framework": "FastAPI",
        "features_tracked": 13,
        "nwp_model_supported": "NCMRWF NCUM 12km / NEPS 12km Ensemble"
    }


@app.get("/api/features", response_model=List[FeatureMeta])
def get_features_metadata():
    """Returns metadata, physical units, and allowable bounds for the 13 meteorological features."""
    return FEATURE_METADATA


@app.post("/api/predict", response_model=PredictionResponse)
def predict_forecast_reliability(features: WeatherFeatures, threshold: float = Query(40.0, ge=10.0, le=90.0)):
    """
    Runs ML inference on the 13 meteorological features.
    Returns bust probability %, confidence score %, risk level, and full 13-feature attribution.
    """
    return predict_bust_risk(features, threshold=threshold)


@app.get("/api/regions/forecast")
def get_all_regions_forecast(lead_day: int = Query(5, ge=1, le=10), threshold: float = Query(40.0)):
    """
    Returns regional bust risk and reliability predictions for all Indian states at the specified lead time.
    """
    results = []
    for st in STATE_PRESETS:
        feat = WeatherFeatures(
            precipitation_24h=st["tp"],
            temperature_2m=st["t2m"],
            mean_sea_level_pressure=1010.0 - (st["tp"] * 0.15),
            u_wind_10m=4.2,
            v_wind_10m=-2.5,
            specific_humidity_850=st["q850"],
            geopotential_500=5820.0,
            vertical_velocity_500=st["w500"],
            latitude=st["lat"],
            longitude=st["lon"],
            lead_time_days=lead_day,
            ensemble_spread=3.5 + (lead_day * 0.4),
            cape=st["cape"],
        )
        pred = predict_bust_risk(feat, threshold=threshold)
        results.append({
            "id": st["id"],
            "name": st["name"],
            "lat": st["lat"],
            "lon": st["lon"],
            "lead_time": f"D{lead_day}",
            "bustProbability": pred.bust_probability,
            "confidence": pred.confidence_score,
            "riskLevel": pred.risk_level,
            "primaryDriver": pred.primary_failure_driver,
            "features": feat.model_dump(),
        })
    return {
        "lead_time_days": lead_day,
        "total_regions": len(results),
        "high_risk_count": sum(1 for r in results if r["bustProbability"] >= 50.0),
        "regions": results
    }


@app.get("/api/model/info")
def get_model_info():
    return {
        "model_name": "Untitled9-Calibrated-XGBoost",
        "algorithm": "XGBClassifier with Sigmoid Probability Calibration",
        "hyperparameters": {
            "learning_rate": 0.02,
            "max_depth": 4,
            "n_estimators": 200,
            "subsample": 0.8,
            "colsample_bytree": 0.9,
            "min_child_weight": 3,
            "gamma": 0.1,
            "reg_alpha": 0.1,
            "reg_lambda": 2,
            "scale_pos_weight": 9.0
        },
        "source_file": "backend/untitled9.py (Untitled9.ipynb)",
        "validation_metrics": {
            "Calibrated_ROC_AUC": 0.868,
            "Calibrated_PR_AUC": 0.392,
            "Calibrated_Brier_Score": 0.0466
        },
        "features": [
            "total_precipitation_24hr",
            "2m_temperature",
            "mean_sea_level_pressure",
            "10m_u_component_of_wind",
            "10m_v_component_of_wind",
            "specific_humidity_850",
            "geopotential_500",
            "vertical_velocity_500",
            "longitude",
            "latitude",
            "lead_hours"
        ]
    }

