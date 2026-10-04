"""
Verification and historical case endpoints.

``/api/verification`` returns two clearly separated halves: ``model_skill``, the
measured September 2019 held-out test-set figures transcribed from the training
notebook, and ``archive``, the per-location forecast-versus-observation rows,
which report ``available = false`` unless an archive file is attached. See
:mod:`app.services.verification_service` for both record shapes.
"""

from fastapi import APIRouter
from ...services.verification_service import verification_service

router = APIRouter()


@router.get("/api/verification")
async def get_verification():
    """
    Measured model skill, plus the forecast/observation archive when attached.

    ``model_skill`` reports the tuned model's confusion matrix, discrimination
    scores, calibration effect and threshold sweep on the September 2019 held-out
    test set — a fixed historical evaluation, not live operational statistics.
    ``archive`` returns an empty result set with ``available = false`` when no
    verification archive is attached.
    """
    return verification_service.get_verification()


@router.get("/api/historical-events")
async def get_historical_events():
    """
    Return documented forecast bust cases.

    Returns an empty result set with ``available = false`` when no case archive
    is attached.
    """
    return verification_service.get_historical_events()
