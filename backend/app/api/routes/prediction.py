"""
Prediction endpoint — Single location prediction.
"""

import logging
import time
import uuid
from fastapi import APIRouter, HTTPException
from ...schemas.prediction import PredictionRequest, PredictionResponse
from ...services.prediction_service import prediction_service
from ...ml.model_loader import model_loader

logger = logging.getLogger("karyasetu")
router = APIRouter()


@router.post("/api/predict", response_model=PredictionResponse)
async def predict(request: PredictionRequest):
    """
    Run prediction on a single location.

    Accepts all 11 model features and returns calibrated bust probability,
    confidence, and confidence level.
    """
    request_id = str(uuid.uuid4())[:8]
    start_time = time.time()

    try:
        if not model_loader.is_ready:
            raise HTTPException(
                status_code=503,
                detail="Model unavailable. The forecast model is currently unavailable.",
            )

        features = request.model_dump()
        result = prediction_service.predict_single(features)

        # Log prediction
        elapsed = time.time() - start_time
        logger.info(
            f"request_id={request_id} | endpoint=/api/predict | "
            f"model_version={result.get('model_version', 'unknown')} | "
            f"lead_hours={result['lead_hours']} | "
            f"bust_probability={result['bust_probability']:.4f} | "
            f"status=SUCCESS | elapsed={elapsed:.3f}s"
        )

        return PredictionResponse(**result)

    except HTTPException:
        raise
    except ValueError as e:
        logger.warning(f"Validation error: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Prediction failed: {e}")
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")
