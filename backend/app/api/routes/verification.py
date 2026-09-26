"""
Verification and historical events endpoints.
"""

from fastapi import APIRouter
from ...services.verification_service import verification_service

router = APIRouter()


@router.get("/api/verification")
async def get_verification():
    """
    Return verification data comparing forecast vs reference.
    Currently returns not available since reference data is not connected.
    """
    return verification_service.get_verification()


@router.get("/api/historical-events")
async def get_historical_events():
    """
    Return historical verification events.
    Currently returns empty since historical data is not available.
    """
    return verification_service.get_historical_events()
