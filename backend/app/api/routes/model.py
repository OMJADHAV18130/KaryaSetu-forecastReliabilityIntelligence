"""
Model metadata and performance endpoints.
"""

from fastapi import APIRouter
from ...services.model_service import model_service

router = APIRouter()


@router.get("/api/model-performance")
async def get_model_performance():
    """Return model performance metrics and metadata."""
    return model_service.get_model_performance()


@router.get("/api/model-info")
async def get_model_info():
    """Return model metadata and version information."""
    return model_service.get_model_metadata()
