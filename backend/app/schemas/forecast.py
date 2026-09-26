"""
Pydantic schemas for forecast/map data.
"""

from pydantic import BaseModel, Field
from typing import List, Optional, Literal


class ForecastPoint(BaseModel):
    """Single grid point prediction."""
    latitude: float
    longitude: float
    bust_probability: float
    confidence: float
    confidence_level: str
    region: Optional[str] = None


class ForecastMapResponse(BaseModel):
    """Response for the forecast map endpoint."""
    day: int
    lead_hours: int
    layer: Literal["bust_probability", "confidence"]
    points: List[ForecastPoint]


class ForecastOverview(BaseModel):
    """Overview statistics for a given day."""
    selected_day: int
    lead_hours: int
    average_confidence: float
    high_risk_cells: int
    lowest_confidence: float
    highest_bust_probability: float


class LocationDetail(BaseModel):
    """Detailed forecast information for a specific location."""
    latitude: float
    longitude: float
    day: int
    lead_hours: int
    model_inputs: dict
    bust_probability: float
    confidence: float
    confidence_level: str
    region: Optional[str] = None
