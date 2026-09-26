"""
Health endpoint — Reports model and service status.
"""

from fastapi import APIRouter
from ...services.model_service import model_service

router = APIRouter()


@router.get("/api/health")
async def health_check():
    """Health check endpoint."""
    return model_service.get_health_status()
