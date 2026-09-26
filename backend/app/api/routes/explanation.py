"""
SHAP explanation endpoints — Global and local feature importance.
"""

from fastapi import APIRouter, HTTPException
from ...ml.shap_explainer import shap_explainer
from ...ml.feature_schema import FEATURE_COLUMNS

router = APIRouter()


@router.get("/api/explanation/global")
async def get_global_explanation():
    """Return global SHAP feature importance."""
    try:
        features = shap_explainer.explain_global()
        return {
            "features": features,
            "model_version": shap_explainer.model_version if hasattr(shap_explainer, 'model_version') else "xgb-rainfall-bust-v1",
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"SHAP explanation failed: {str(e)}")


@router.post("/api/explanation/local")
async def get_local_explanation(features: dict):
    """
    Return local SHAP explanation for a single prediction.

    Input: Dictionary with all 11 model features.
    """
    try:
        # Validate required features
        missing = [f for f in FEATURE_COLUMNS if f not in features]
        if missing:
            raise HTTPException(status_code=400, detail=f"Missing features: {missing}")

        contributions = shap_explainer.explain_local(features)
        return {
            "features": contributions,
            "bust_probability": 0.0,  # Will be populated by predictor if needed
            "confidence": 0.0,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Explanation failed: {str(e)}")
