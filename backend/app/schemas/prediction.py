"""
Pydantic schemas for prediction requests and responses.
Supports all 19 model features from notebookf941b4a0d6.ipynb.
"""

from pydantic import BaseModel, Field, field_validator
from typing import Optional, List, Literal


class PredictionRequest(BaseModel):
    """Single location prediction request with all model features."""
    model_config = {"populate_by_name": True, "protected_namespaces": ()}

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
    bust_pattern_similarity: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description=(
            "Cosine similarity to the bust archetype (0-1). Required: the booster "
            "reads it as a feature, so there is no defensible value to assume when "
            "it is omitted, and a substituted one would put an invented number in "
            "front of the model."
        ),
    )

    # 7 Extended features from notebookf941b4a0d6.ipynb
    mslp_gradient: Optional[float] = Field(None, ge=0.0, le=1000.0, description="MSLP spatial gradient (Pa/deg)")
    temp_gradient: Optional[float] = Field(None, ge=0.0, le=50.0, description="Temperature spatial gradient (K/deg)")
    geo500_gradient: Optional[float] = Field(None, ge=0.0, le=2000.0, description="Geopotential 500 gradient (m²/s²/deg)")
    mean_sea_level_pressure_tendency: Optional[float] = Field(None, ge=-5000.0, le=5000.0, description="MSLP tendency (Pa/24h)")
    temperature_2m_tendency: Optional[float] = Field(None, alias="2m_temperature_tendency", ge=-30.0, le=30.0, description="2m temperature tendency (K/24h)")
    geopotential_500_tendency: Optional[float] = Field(None, ge=-2000.0, le=2000.0, description="Geopotential 500 tendency (m²/s²/24h)")
    total_precipitation_24hr_tendency: Optional[float] = Field(None, ge=-2.0, le=2.0, description="Rainfall tendency (m/24h)")

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
    uncalibrated_probability: float = Field(
        ...,
        description="Raw booster probability before calibration (0-1)",
    )
    calibration_applied: bool = Field(
        ...,
        description="False when the calibrator is unavailable and the raw probability was reported unchanged",
    )
    confidence: float = Field(..., description="Forecast confidence (0-1)")
    confidence_level: Literal["HIGH", "MODERATE", "LOW"] = Field(..., description="Confidence level")
    day: int = Field(..., description="Forecast day (1-10)")
    lead_hours: float = Field(..., description="Lead time in hours")
    latitude: float = Field(..., description="Latitude")
    longitude: float = Field(..., description="Longitude")
    bust_pattern_similarity: float = Field(..., description="Bust pattern similarity score (0-1)")
    model_version: Optional[str] = None
    request_id: Optional[str] = None
