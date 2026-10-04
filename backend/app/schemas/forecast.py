"""
Pydantic schemas for forecast/map data.
"""

from pydantic import BaseModel, Field, field_validator
from typing import List, Optional, Literal

from ..ml.feature_schema import DOMAIN


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


# Upper bound on one batch. A district choropleth sends 723 coordinates, so the
# cap sits above the real workload and stops a malformed client from asking the
# booster to score the whole planet in one request.
MAX_BATCH_COORDINATES = 1500


class Coordinate(BaseModel):
    """One ``[latitude, longitude]`` pair to score."""

    latitude: float
    longitude: float

    @field_validator("latitude", "longitude")
    @classmethod
    def _finite_and_in_domain(cls, value: float) -> float:
        # NaN and infinity are rejected explicitly: they survive a naive
        # ``value < min or value > max`` comparison (both are False for NaN), and
        # a NaN latitude would otherwise reach the model and come back as a
        # probability that looks real.
        if value != value:
            raise ValueError("value must be a real number, not NaN")
        if value in (float("inf"), float("-inf")):
            raise ValueError("value must be finite, not infinity")
        return value

    def in_domain(self) -> bool:
        return (
            DOMAIN["lat_min"] <= self.latitude <= DOMAIN["lat_max"]
            and DOMAIN["lon_min"] <= self.longitude <= DOMAIN["lon_max"]
        )


class ScoreBatchRequest(BaseModel):
    """Score a set of coordinates for one lead day."""

    day: int = Field(4, ge=1, le=10, description="Forecast day (1-10)")
    coordinates: List[Coordinate] = Field(
        ...,
        min_length=1,
        max_length=MAX_BATCH_COORDINATES,
        description="Coordinates to score, in the trained model domain",
    )

    @field_validator("coordinates")
    @classmethod
    def _all_in_domain(cls, value: List[Coordinate]) -> List[Coordinate]:
        outside = [c for c in value if not c.in_domain()]
        if outside:
            first = outside[0]
            raise ValueError(
                f"{len(outside)} coordinate(s) fall outside the trained domain "
                f"{DOMAIN['lat_min']}-{DOMAIN['lat_max']}N, "
                f"{DOMAIN['lon_min']}-{DOMAIN['lon_max']}E "
                f"(first: {first.latitude}, {first.longitude})"
            )
        return value


class ScoredCoordinate(BaseModel):
    """Model output for one coordinate."""

    latitude: float
    longitude: float
    bust_probability: float
    uncalibrated_probability: float
    calibration_applied: bool
    confidence: float
    confidence_level: str
    region: Optional[str] = None
    derivation: dict
