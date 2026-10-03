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
    Score one coordinate for one lead day.

    The nine meteorological drivers are interpolated (inverse-distance) from
    the 19-cell reference grid, then the trained model scores that single
    point. The response says so explicitly, so the UI can never imply a
    per-district forecast run that did not happen.
    """
    try:
        profile = map_service.get_profile_at(latitude, longitude)
        pred = prediction_service.predict_profile(profile, day)

        return {
            "latitude": round(profile["lat"], 4),
            "longitude": round(profile["lon"], 4),
            "day": pred["day"],
            "lead_hours": pred["lead_hours"],
            "model_inputs": pred.get("model_inputs", {}),
            "bust_probability": pred["bust_probability"],
            "confidence": pred["confidence"],
            "confidence_level": pred["confidence_level"],
            "region": pred.get("region", ""),
            "model_version": pred.get("model_version"),
            "derivation": {
                "method": profile["method"],
                "source_cell": profile["source_cell"],
                "distance_km": profile["distance_km"],
                "neighbour_count": profile["neighbour_count"],
                "note": (
                    "Model inputs interpolated from the trained reference "
                    "grid; the bust probability is a single trained-model "
                    "evaluation at this coordinate."
                ),
            },
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Location detail failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/forecast/time-series")
async def get_time_series(
    latitude: float = Query(..., ge=8.0, le=37.0, description="Latitude"),
    longitude: float = Query(..., ge=68.0, le=98.0, description="Longitude"),
    days: Optional[str] = Query(
        None,
        description="Comma-separated forecast days (1-10). Defaults to 1-10.",
    ),
):
    """
    Score one coordinate across several lead days.

    Each day is a separate evaluation of the trained model at the same
    coordinate, so the curve is the model's own day-by-day behaviour. Used by
    the time-series page and by the location search result panel.
    """
    try:
        if days:
            try:
                requested = [int(d) for d in days.split(",") if d.strip()]
            except ValueError:
                raise HTTPException(
                    status_code=422, detail="days must be a comma-separated list of integers"
                )
            if not requested:
                requested = list(range(1, 11))
            if any(d < 1 or d > 10 for d in requested):
                raise HTTPException(
                    status_code=422, detail="Each day must be between 1 and 10"
                )
        else:
            requested = list(range(1, 11))

        profile = map_service.get_profile_at(latitude, longitude)
        series = prediction_service.predict_time_series(profile, requested)

        return {
            "latitude": round(profile["lat"], 4),
            "longitude": round(profile["lon"], 4),
            "region": profile.get("region", ""),
            "model_version": series[0].get("model_version") if series else None,
            "derivation": {
                "method": profile["method"],
                "source_cell": profile["source_cell"],
                "distance_km": profile["distance_km"],
                "neighbour_count": profile["neighbour_count"],
            },
            "series": [
                {
                    "day": p["day"],
                    "lead_hours": p["lead_hours"],
                    "bust_probability": p["bust_probability"],
                    "confidence": p["confidence"],
                    "confidence_level": p["confidence_level"],
                    # Lead time is one of the model's inputs, so the input
                    # vector genuinely differs per day. Returning it per point
                    # keeps the "inputs behind this prediction" panel honest
                    # about which day it is describing.
                    "model_inputs": p.get("model_inputs", {}),
                }
                for p in series
            ],
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Time series failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
