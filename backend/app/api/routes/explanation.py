"""
SHAP explanation endpoints — global importance and per-prediction attribution.

Both report ``available = false`` with a reason when attribution cannot be
computed, rather than returning an invented importance table.
"""

from fastapi import APIRouter, HTTPException, Query
from ...ml.shap_explainer import shap_explainer
from ...ml.feature_schema import FEATURE_COLUMNS
from ...services.map_service import map_service
from ...services.prediction_service import prediction_service

router = APIRouter()


@router.get("/api/explanation/global")
async def get_global_explanation():
    """
    Mean absolute SHAP value per feature over the stored background sample.

    Mean absolute SHAP is a magnitude: it says how much a feature moves the
    prediction, not which direction, so no ``direction`` field is returned.
    """
    if not shap_explainer.available:
        return {
            "available": False,
            "features": [],
            "model_version": shap_explainer.model_version,
            "message": shap_explainer.unavailable_reason
            or "Attribution is unavailable in this deployment.",
        }

    try:
        return {
            "available": True,
            "features": shap_explainer.explain_global(),
            "model_version": shap_explainer.model_version,
            "background_samples": min(500, len(shap_explainer.background_data)),
        }
    except Exception as exc:
        logger_msg = f"Global SHAP explanation failed: {exc}"
        raise HTTPException(status_code=500, detail=logger_msg)


@router.post("/api/explanation/local")
async def get_local_explanation(features: dict):
    """
    Attribute a single prediction.

    Input: dictionary with every model feature, in the units used for training.
    """
    if not shap_explainer.available:
        return {
            "available": False,
            "features": [],
            "message": shap_explainer.unavailable_reason
            or "Attribution is unavailable in this deployment.",
        }

    missing = [f for f in FEATURE_COLUMNS if f not in features]
    if missing:
        raise HTTPException(status_code=400, detail=f"Missing features: {missing}")

    try:
        contributions = shap_explainer.explain_local(features)
    except (TypeError, ValueError) as exc:
        raise HTTPException(status_code=422, detail=f"Invalid feature values: {exc}")
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Explanation failed: {exc}")

    if not contributions:
        return {
            "available": False,
            "features": [],
            "message": "Attribution returned no contributions for this prediction.",
        }

    return {"available": True, "features": contributions}


@router.get("/api/explanation/location")
async def explain_location(
    latitude: float = Query(..., ge=8.0, le=37.0, description="Latitude"),
    longitude: float = Query(..., ge=68.0, le=98.0, description="Longitude"),
    day: int = Query(4, ge=1, le=10, description="Forecast day (1-10)"),
):
    """
    Attribute one coordinate, end to end.

    Interpolation, scoring and attribution all happen against the same feature
    vector, so the bust probability reported here is exactly the one the SHAP
    values decompose. Doing it in one place is what keeps the explanation from
    describing a different prediction than the one on screen.
    """
    profile = map_service.get_profile_at(latitude, longitude)
    prediction = prediction_service.predict_profile(profile, day)

    if not shap_explainer.available:
        return {
            "available": False,
            "features": [],
            "latitude": prediction["latitude"],
            "longitude": prediction["longitude"],
            "day": prediction["day"],
            "lead_hours": prediction["lead_hours"],
            "bust_probability": prediction["bust_probability"],
            "confidence": prediction["confidence"],
            "confidence_level": prediction["confidence_level"],
            "uncalibrated_probability": prediction["uncalibrated_probability"],
            "calibration_applied": prediction["calibration_applied"],
            "region": prediction.get("region", ""),
            "model_version": prediction.get("model_version"),
            "model_inputs": prediction.get("model_inputs", {}),
            "derivation": {
                "method": profile["method"],
                "source_cell": profile["source_cell"],
                "distance_km": profile["distance_km"],
                "neighbour_count": profile["neighbour_count"],
            },
            "message": shap_explainer.unavailable_reason
            or "Attribution is unavailable in this deployment.",
        }

    # predict_profile already converted to training units; reuse that exact
    # vector so the attribution describes this prediction and no other.
    training_inputs = prediction_service.build_model_inputs(
        profile, float(day) * 24.0
    )

    try:
        contributions = shap_explainer.explain_local(training_inputs)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Explanation failed: {exc}")

    return {
        "available": True,
        "features": contributions,
        # SHAP's expected value in log-odds. sigmoid(base_value + sum of the
        # shap_values below) returns uncalibrated_probability, which the calibrator
        # then maps to bust_probability. Both are returned so the reader can check
        # the bars against the number instead of taking them on trust.
        "base_value": shap_explainer.base_value,
        "latitude": prediction["latitude"],
        "longitude": prediction["longitude"],
        "day": prediction["day"],
        "lead_hours": prediction["lead_hours"],
        "bust_probability": prediction["bust_probability"],
        "uncalibrated_probability": prediction["uncalibrated_probability"],
        "calibration_applied": prediction["calibration_applied"],
        "confidence": prediction["confidence"],
        "confidence_level": prediction["confidence_level"],
        "region": prediction.get("region", ""),
        "model_version": prediction.get("model_version"),
        "model_inputs": prediction.get("model_inputs", {}),
        "derivation": {
            "method": profile["method"],
            "source_cell": profile["source_cell"],
            "distance_km": profile["distance_km"],
            "neighbour_count": profile["neighbour_count"],
        },
    }