"""
Application configuration loaded from environment variables.
"""

import os
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent.parent

# Explicitly load .env from the backend root directory
load_dotenv(dotenv_path=BASE_DIR / ".env")

# Server Configuration
HOST = os.getenv("HOST", "0.0.0.0")
PORT = int(os.getenv("PORT", "8000"))
API_PREFIX = os.getenv("API_PREFIX", "/api")

# Model and Data Paths
def _artifact_path(env_name: str, *relative: str) -> str:
    """Resolve an artifact path from the environment, anchored to the backend root.

    ``.env`` ships relative values like ``models/xgboost_model/model.json``, which
    only resolve when the process happens to be started from ``backend/``. Started
    from anywhere else the loader logs four "file not found" warnings and every
    endpoint then answers "Model or calibrator not loaded" - a failure that looks
    like a broken model rather than a broken path. Anchoring relative values to
    ``BASE_DIR`` makes the working directory irrelevant.
    """
    configured = os.getenv(env_name, "")
    if configured and not Path(configured).is_absolute():
        configured = str(BASE_DIR / configured)
    return configured or str(BASE_DIR.joinpath(*relative))


MODEL_PATH = _artifact_path("MODEL_PATH", "models", "xgboost_model", "model.json")
CALIBRATOR_PATH = _artifact_path("CALIBRATOR_PATH", "models", "calibration", "calibrator.joblib")
SHAP_BACKGROUND_PATH = _artifact_path("SHAP_BACKGROUND_PATH", "models", "shap", "background_data.joblib")
FEATURE_SCHEMA_PATH = _artifact_path("FEATURE_SCHEMA_PATH", "models", "feature_schema.json")

# CORS Configuration from Environment
CORS_ORIGINS = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:5173,http://localhost:5174,http://localhost:3000,http://127.0.0.1:5173",
)
CORS_ORIGIN_LIST = [o.strip() for o in CORS_ORIGINS.split(",") if o.strip()]
# Allow all Vercel deployments by default, or customize via CORS_ORIGIN_REGEX
CORS_ORIGIN_REGEX = os.getenv("CORS_ORIGIN_REGEX", r"^https:\/\/.*\.vercel\.app$")
# If wildcard is used, Starlette / browser CORS forbids allow_credentials=True
CORS_ALLOW_CREDENTIALS = os.getenv("CORS_ALLOW_CREDENTIALS", "true").lower() in ("true", "1", "yes")
if "*" in CORS_ORIGIN_LIST:
    CORS_ALLOW_CREDENTIALS = False
CORS_ALLOW_METHODS = os.getenv("CORS_ALLOW_METHODS", "*")
CORS_ALLOW_METHODS_LIST = ["*"] if CORS_ALLOW_METHODS.strip() == "*" else [m.strip() for m in CORS_ALLOW_METHODS.split(",") if m.strip()]
CORS_ALLOW_HEADERS = os.getenv("CORS_ALLOW_HEADERS", "*")
CORS_ALLOW_HEADERS_LIST = ["*"] if CORS_ALLOW_HEADERS.strip() == "*" else [h.strip() for h in CORS_ALLOW_HEADERS.split(",") if h.strip()]

ENVIRONMENT = os.getenv("ENVIRONMENT", "research")
DEBUG = os.getenv("DEBUG", "false").lower() == "true"
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")

API_TITLE = "KaryaSetu — Forecast Reliability Intelligence API"
API_VERSION = "1.0.0"
API_DESCRIPTION = """
AI-based forecast bust detection for medium-range rainfall forecasts.

This service adds a reliability layer over NWP forecasts.
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

**NOTE**: Every figure this service returns is a model evaluation. It is not a live operational statistic.
"""
