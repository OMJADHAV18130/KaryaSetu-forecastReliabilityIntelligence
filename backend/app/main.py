"""
KaryaSetu — Forecast Reliability Intelligence API

AI-based forecast bust detection for medium-range rainfall forecasts.
XGBoost with sigmoid calibration.

Rainfall forecast busts only. Scores are model evaluations, not live statistics.
"""

from .core import compat
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .core.config import (
    API_TITLE,
    API_VERSION,
    API_DESCRIPTION,
    CORS_ORIGIN_LIST,
    CORS_ORIGIN_REGEX,
    CORS_ALLOW_CREDENTIALS,
    CORS_ALLOW_METHODS_LIST,
    CORS_ALLOW_HEADERS_LIST,
    ENVIRONMENT,
    DEBUG,
    LOG_LEVEL,
)
from .core.logging import setup_logging
from .api.routes import health, forecast, bust, explanation, verification, model, prediction

# Setup logging
logger = setup_logging(LOG_LEVEL)
logger.info(f"Starting {API_TITLE} v{API_VERSION}")
logger.info(f"Environment: {ENVIRONMENT}")
logger.info(f"Debug: {DEBUG}")

# Create FastAPI app
app = FastAPI(
    title=API_TITLE,
    version=API_VERSION,
    description=API_DESCRIPTION,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS configuration from environment
cors_kwargs = {
    "allow_origins": CORS_ORIGIN_LIST,
    "allow_credentials": CORS_ALLOW_CREDENTIALS,
    "allow_methods": CORS_ALLOW_METHODS_LIST,
    "allow_headers": CORS_ALLOW_HEADERS_LIST,
}
if CORS_ORIGIN_REGEX:
    cors_kwargs["allow_origin_regex"] = CORS_ORIGIN_REGEX

app.add_middleware(CORSMiddleware, **cors_kwargs)

# Include routers
app.include_router(health.router)
app.include_router(forecast.router)
app.include_router(bust.router)
app.include_router(explanation.router)
app.include_router(verification.router)
app.include_router(model.router)
app.include_router(prediction.router)


@app.on_event("startup")
async def startup_event():
    """Load model at startup."""
    from .ml.model_loader import model_loader
    logger.info(f"Model loaded: {model_loader.model_loaded}")
    logger.info(f"Calibration loaded: {model_loader.calibration_loaded}")
    logger.info(f"Model version: {model_loader.model_version}")


@app.get("/")
@app.get("/health")
async def root():
    """Root endpoint with API information."""
    return {
        "service": API_TITLE,
        "version": API_VERSION,
        "environment": ENVIRONMENT,
        "documentation": "/docs",
        "scope": "Rainfall forecast bust detection",
        "disclaimer": (
            "Evaluations of a trained model on a fixed 2019 training split. "
            "No live forecast or observation feed is connected."
        ),
    }
