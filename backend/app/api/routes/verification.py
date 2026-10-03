"""
Verification and historical case endpoints.

Both return ``available = false`` with an explanation unless an archive file is
attached — see :mod:`app.services.verification_service` for the record shapes.
"""

from fastapi import APIRouter
from ...services.verification_service import verification_service

router = APIRouter()


@router.get("/api/verification")
async def get_verification():
    """
    Compare stored medium-range forecasts against measured rainfall.

    Returns an empty result set with ``available = false`` when no verification
    archive is attached. The September 2019 held-out skill figures served by
    ``/api/model-performance`` are unaffected and remain available.
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
