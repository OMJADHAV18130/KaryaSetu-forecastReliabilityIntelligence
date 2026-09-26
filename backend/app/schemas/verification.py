"""
Pydantic schemas for verification data.
"""

from pydantic import BaseModel, Field
from typing import Optional, List


class VerificationResult(BaseModel):
    """Single verification result comparing forecast vs reference."""
    latitude: float
    longitude: float
    lead_hours: int
    forecast_rainfall: float
    reference_rainfall: float
    absolute_error: float
    bust_threshold: float
    bust_status: bool
    day: int


class VerificationResponse(BaseModel):
    """Verification response - returns empty when data not available."""
    available: bool = False
    results: List[VerificationResult] = []
    message: Optional[str] = "Verification data unavailable"
