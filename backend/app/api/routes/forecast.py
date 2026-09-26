"""
Forecast endpoints — Grid predictions, overview, and location details.
"""

import logging
from typing import Optional
from fastapi import APIRouter, Query, HTTPException
from ...services.prediction_service import prediction_service
from ...services.map_service import map_service

logger = logging.getLogger("karyasetu")
router = APIRouter()


@router.get("/api/forecast/map")
async def get_forecast_map(
    day: int = Query(4, ge=1, le=10, description="Forecast day (1-10)"),
    layer: str = Query("bust_probability", description="Layer to display: bust_probability or confidence"),
):
    """
    Return prediction grid for map visualization.
    The frontend does NOT need to understand NetCDF/GRIB.
    """
    try:
        met_data = map_service.get_all_meteorology_profiles()
        predictions = prediction_service.predict_grid(day, met_data)

        points = []
        for p in predictions:
            points.append({
                "latitude": p["latitude"],
                "longitude": p["longitude"],
                "bust_probability": p["bust_probability"],
                "confidence": p["confidence"],
                "confidence_level": p["confidence_level"],
                "region": p.get("region", ""),
            })

        return {
            "day": day,
            "lead_hours": day * 24,
            "layer": layer,
            "points": points,
        }
    except Exception as e:
        logger.error(f"Forecast map failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/forecast/overview")
async def get_forecast_overview(
    day: int = Query(4, ge=1, le=10, description="Forecast day (1-10)"),
):
    """
    Return summary statistics for the selected day.
    All values are calculated from prediction data — not hard-coded.
    """
    try:
        met_data = map_service.get_all_meteorology_profiles()
        predictions = prediction_service.predict_grid(day, met_data)

        if not predictions:
            raise HTTPException(status_code=500, detail="No predictions available")

        confidences = [p["confidence"] for p in predictions]
        bust_probs = [p["bust_probability"] for p in predictions]

        return {
            "selected_day": day,
            "lead_hours": day * 24,
            "average_confidence": round(sum(confidences) / len(confidences), 4),
            "high_risk_cells": sum(1 for p in predictions if p["confidence"] < 0.40),
            "lowest_confidence": round(min(confidences), 4),
            "highest_bust_probability": round(max(bust_probs), 4),
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Forecast overview failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/forecast/location")
async def get_location_detail(
    latitude: float = Query(..., ge=8.0, le=37.0, description="Latitude"),
    longitude: float = Query(..., ge=68.0, le=98.0, description="Longitude"),
    day: int = Query(4, ge=1, le=10, description="Forecast day (1-10)"),
):
    """
    Return detailed forecast information for a specific location.
    """
    try:
        # Find nearest grid point
        met_data = map_service.get_all_meteorology_profiles()
        nearest = None
        min_dist = float("inf")

        for profile in met_data:
            dist = ((profile["lat"] - latitude) ** 2 + (profile["lon"] - longitude) ** 2) ** 0.5
            if dist < min_dist:
                min_dist = dist
                nearest = profile

        if nearest is None:
            raise HTTPException(status_code=404, detail="No grid point found for this location")

        # Run prediction for this location
        predictions = prediction_service.predict_grid(day, [nearest])
        if not predictions:
            raise HTTPException(status_code=500, detail="Prediction failed")

        pred = predictions[0]

        return {
            "latitude": pred["latitude"],
            "longitude": pred["longitude"],
            "day": pred["day"],
            "lead_hours": pred["lead_hours"],
            "model_inputs": pred.get("model_inputs", {}),
            "bust_probability": pred["bust_probability"],
            "confidence": pred["confidence"],
            "confidence_level": pred["confidence_level"],
            "region": pred.get("region", ""),
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Location detail failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
