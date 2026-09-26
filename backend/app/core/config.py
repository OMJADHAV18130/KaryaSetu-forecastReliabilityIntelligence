"""
Application configuration loaded from environment variables.
"""

import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent

MODEL_PATH = os.getenv("MODEL_PATH", str(BASE_DIR / "models" / "xgboost_model" / "model.json"))
CALIBRATOR_PATH = os.getenv("CALIBRATOR_PATH", str(BASE_DIR / "models" / "calibration" / "calibrator.joblib"))
SHAP_BACKGROUND_PATH = os.getenv("SHAP_BACKGROUND_PATH", str(BASE_DIR / "models" / "shap" / "background_data.joblib"))
FEATURE_SCHEMA_PATH = os.getenv("FEATURE_SCHEMA_PATH", str(BASE_DIR / "models" / "feature_schema.json"))

CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:5174,http://localhost:3000")
CORS_ORIGIN_LIST = [o.strip() for o in CORS_ORIGINS.split(",")]

ENVIRONMENT = os.getenv("ENVIRONMENT", "research")
DEBUG = os.getenv("DEBUG", "false").lower() == "true"
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")

API_TITLE = "KaryaSetu — Forecast Reliability Intelligence API"
API_VERSION = "1.0.0"
API_DESCRIPTION = """
AI-based forecast bust detection for medium-range rainfall forecasts.

This is a **research prototype** that adds a reliability layer over NWP forecasts.
It does NOT replace the NWP forecast — it predicts when the forecast may become unreliable.

## Scope

- **Model**: XGBoost binary classifier with sigmoid calibration
- **Domain**: India region (8°N–37°N, 68°E–98°E)
- **Lead time**: Day 1 to Day 10 (24h–240h)
- **Target**: Rainfall forecast bust detection (error > 90th percentile)

## Data Sources

WeatherBench2 HRES and ERA5 (research training data)

## Training Periods

- Training: June–July 2019
- Validation: August 2019
- Testing: September 2019

**NOTE**: These are research test-set results, NOT operational NCMRWF statistics.
"""
