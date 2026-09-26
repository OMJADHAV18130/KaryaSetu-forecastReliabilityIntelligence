"""
Bust detection endpoints — High-risk locations and error-prone areas.
"""

import logging
from typing import Optional
from fastapi import APIRouter, Query, HTTPException
from ...services.prediction_service import prediction_service
from ...services.map_service import map_service

logger = logging.getLogger("karyasetu")
router = APIRouter()


@router.get("/api/bust-risk")
async def get_bust_risk(
    day: int = Query(4, ge=1, le=10, description="Forecast day (1-10)"),
    min_probability: float = Query(0.3, ge=0.0, le=1.0, description="Minimum bust probability"),
    region: Optional[str] = Query(None, description="Filter by region name"),
):
    """
    Return sorted high-risk prediction cells.
    Sorted by highest bust probability first.
    """
    try:
        # Get predictions for all grid points at the specified day
        met_data = map_service.get_all_meteorology_profiles()
        predictions = prediction_service.predict_grid(day, met_data)

        # Filter by probability threshold
        high_risk = [p for p in predictions if p["bust_probability"] >= min_probability]

        # Filter by region if specified
        if region:
            high_risk = [p for p in high_risk if region.lower() in p.get("region", "").lower()]

        # Sort by highest bust probability
        high_risk.sort(key=lambda x: x["bust_probability"], reverse=True)

        return {
            "results": high_risk,
            "total": len(high_risk),
            "day": day,
            "lead_hours": day * 24,
            "threshold": min_probability,
        }
    except Exception as e:
        logger.error(f"Bust risk detection failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/bust-risk/areas")
async def get_bust_risk_areas(
    day: int = Query(4, ge=1, le=10, description="Forecast day (1-10)"),
    threshold: float = Query(0.5, ge=0.0, le=1.0, description="Probability threshold for high-risk cells"),
):
    """
    Detect error-prone areas from high-risk prediction cells.
    Uses spatial clustering as post-processing of model predictions.
    """
    try:
        met_data = map_service.get_all_meteorology_profiles()
        predictions = prediction_service.predict_grid(day, met_data)
        areas = map_service.detect_risk_areas(predictions, threshold=threshold)

        return {
            "areas": areas,
            "total_areas": len(areas),
            "day": day,
            "lead_hours": day * 24,
            "threshold": threshold,
            "method": "spatial_clustering_post_processing",
            "note": "Areas are derived from model predictions using spatial clustering. This is NOT a separate ML model.",
        }
    except Exception as e:
        logger.error(f"Risk area detection failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
