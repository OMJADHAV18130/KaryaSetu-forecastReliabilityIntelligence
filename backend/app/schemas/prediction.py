"""
Pydantic schemas for prediction requests and responses.
"""

from pydantic import BaseModel, Field, field_validator
from typing import Optional, List, Literal


class PredictionRequest(BaseModel):
    """Single location prediction request with all 11 model features."""
    total_precipitation_24hr: float = Field(..., ge=0.0, le=0.5, description="24h precipitation (m)")
    temperature_2m: float = Field(..., ge=200.0, le=330.0, description="2m temperature (K)")
    mean_sea_level_pressure: float = Field(..., ge=90000.0, le=106000.0, description="MSLP (Pa)")
    u_wind_10m: float = Field(..., ge=-60.0, le=60.0, description="10m U wind (m/s)")
    v_wind_10m: float = Field(..., ge=-60.0, le=60.0, description="10m V wind (m/s)")
    specific_humidity_850: float = Field(..., ge=0.0001, le=0.03, description="Specific humidity 850hPa (kg/kg)")
    geopotential_500: float = Field(..., ge=48000.0, le=60000.0, description="Geopotential 500hPa (m²/s²)")
    vertical_velocity_500: float = Field(..., ge=-5.0, le=5.0, description="Vertical velocity 500hPa (Pa/s)")
    longitude: float = Field(..., ge=68.0, le=98.0, description="Longitude (°E)")
    latitude: float = Field(..., ge=8.0, le=37.0, description="Latitude (°N)")
    lead_hours: float = Field(..., ge=24.0, le=240.0, description="Lead time (hours)")

    @field_validator("*")
    @classmethod
    def check_finite(cls, v):
        import math
        if isinstance(v, float) and (math.isnan(v) or math.isinf(v)):
            raise ValueError("Value must be finite")
        return v


class PredictionResponse(BaseModel):
    """Prediction response with calibrated probability and confidence."""
    model_config = {"protected_namespaces": ()}

    bust_probability: float = Field(..., description="Calibrated bust probability (0-1)")
    confidence: float = Field(..., description="Forecast confidence (0-1)")
    confidence_level: Literal["HIGH", "MODERATE", "LOW"] = Field(..., description="Confidence level")
    day: int = Field(..., description="Forecast day (1-10)")
    lead_hours: float = Field(..., description="Lead time in hours")
    latitude: float = Field(..., description="Latitude")
    longitude: float = Field(..., description="Longitude")
    model_version: Optional[str] = None
    request_id: Optional[str] = None
