"""
KaryaSetu — Forecast Reliability Intelligence API

AI-based forecast bust detection for medium-range rainfall forecasts.
Research prototype using XGBoost with sigmoid calibration.

This is NOT an operational NCMRWF system. All metrics are research test-set results.
"""

import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .core.config import (
    API_TITLE,
    API_VERSION,
    API_DESCRIPTION,
    CORS_ORIGIN_LIST,
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
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGIN_LIST,
    allow_credentials=CORS_ALLOW_CREDENTIALS,
    allow_methods=CORS_ALLOW_METHODS_LIST,
    allow_headers=CORS_ALLOW_HEADERS_LIST,
)

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
        "scope": "Research prototype — Rainfall forecast bust detection",
        "disclaimer": "This is a research prototype. Not an operational NCMRWF system.",
    }
