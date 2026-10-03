"""
Model metadata and performance endpoints.
"""

from fastapi import APIRouter
from ...schemas.model import ModelInfoResponse, ModelPerformanceResponse
from ...services.model_service import model_service

router = APIRouter()


@router.get("/api/model-performance", response_model=ModelPerformanceResponse)
async def get_model_performance():
    """
    Evaluation figures for the bust detection model.

    Two evaluations are returned side by side and never merged: the notebook's
    September 2019 held-out test set, and what the currently loaded booster
    measures on its own fitting data. See :mod:`app.services.model_service` for
    why they are kept apart.
    """
    return model_service.get_model_performance()


@router.get("/api/model-info", response_model=ModelInfoResponse)
async def get_model_info():
    """Model metadata, version and artifact load status."""
    return model_service.get_model_metadata()