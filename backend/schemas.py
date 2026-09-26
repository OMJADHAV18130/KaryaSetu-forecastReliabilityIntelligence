from typing import Dict, List, Optional
from pydantic import BaseModel, Field

class WeatherFeatures(BaseModel):
    # 1. 24-hour precipitation (Forecast rainfall amount in mm)
    precipitation_24h: float = Field(
        default=12.5,
        ge=0.0,
        le=500.0,
        description="24-hour precipitation: Forecast rainfall amount (mm)"
    )
    # 2. 2m temperature (Near-surface temperature in °C)
    temperature_2m: float = Field(
        default=28.4,
        ge=-40.0,
        le=55.0,
        description="2m temperature: Near-surface temperature (°C)"
    )
    # 3. Mean sea-level pressure (Atmospheric pressure in hPa)
    mean_sea_level_pressure: float = Field(
        default=1008.2,
        ge=900.0,
        le=1060.0,
        description="Mean sea-level pressure: Atmospheric pressure (hPa)"
    )
    # 4. 10m U-wind (East–west wind component in m/s)
    u_wind_10m: float = Field(
        default=3.2,
        ge=-60.0,
        le=60.0,
        description="10m U-wind: East–west wind component (m/s)"
    )
    # 5. 10m V-wind (North–south wind component in m/s)
    v_wind_10m: float = Field(
        default=-1.8,
        ge=-60.0,
        le=60.0,
        description="10m V-wind: North–south wind component (m/s)"
    )
    # 6. Specific humidity at 850 hPa (Moisture in lower atmosphere in g/kg)
    specific_humidity_850: float = Field(
        default=11.4,
        ge=0.1,
        le=30.0,
        description="Specific humidity at 850 hPa: Moisture in the lower atmosphere (g/kg)"
    )
    # 7. Geopotential at 500 hPa (Atmospheric pressure-level height / circulation in gpm)
    geopotential_500: float = Field(
        default=5820.0,
        ge=4800.0,
        le=6000.0,
        description="Geopotential at 500 hPa: Atmospheric pressure-level height / large-scale circulation (gpm)"
    )
    # 8. Vertical velocity at 500 hPa (Upward/downward air motion in Pa/s)
    vertical_velocity_500: float = Field(
        default=-0.25,
        ge=-5.0,
        le=5.0,
        description="Vertical velocity at 500 hPa: Upward (negative) or downward (positive) air motion (Pa/s)"
    )
    # 9. Latitude (Geographic location)
    latitude: float = Field(
        default=19.75,
        ge=6.0,
        le=38.0,
        description="Latitude: Geographic location (°N)"
    )
    # 10. Longitude (Geographic location)
    longitude: float = Field(
        default=75.71,
        ge=68.0,
        le=98.0,
        description="Longitude: Geographic location (°E)"
    )
    # 11. Lead time (How far ahead the forecast is: Day 1–10)
    lead_time_days: int = Field(
        default=5,
        ge=1,
        le=10,
        description="Lead time: How far ahead the forecast is: Day 1–10"
    )
    # 12. Ensemble spread (NWP model dispersion / uncertainty metric)
    ensemble_spread: float = Field(
        default=4.8,
        ge=0.0,
        le=50.0,
        description="Ensemble spread: Standard deviation / dispersion among ensemble members"
    )
    # 13. Convective Available Potential Energy (CAPE) / Instability
    cape: float = Field(
        default=1420.0,
        ge=0.0,
        le=6000.0,
        description="CAPE: Convective Available Potential Energy (J/kg)"
    )


class FeatureContribution(BaseModel):
    feature_name: str
    feature_label: str
    feature_value: float
    unit: str
    impact_score: float  # -1.0 to +1.0 (positive pushes bust risk higher)
    description: str


class PredictionResponse(BaseModel):
    bust_probability: float = Field(..., description="Forecast bust probability percentage (0-100%)")
    confidence_score: float = Field(..., description="Overall model confidence percentage (0-100%)")
    risk_level: str = Field(..., description="'LOW', 'MEDIUM', 'HIGH', or 'CRITICAL'")
    is_bust_risk: bool = Field(..., description="True if bust_probability >= threshold (default 40%)")
    primary_failure_driver: str = Field(..., description="Dominant meteorological feature causing instability/bust risk")
    summary_explanation: str = Field(..., description="Meteorological rationale explaining why the forecast may bust")
    feature_contributions: List[FeatureContribution] = Field(..., description="Attribution breakdown for the 13 input features")
    model_version: str = "KaryaSetu-NWP-Bust-v1.4"


class FeatureMeta(BaseModel):
    key: str
    name: str
    category: str
    unit: str
    description: str
    min_val: float
    max_val: float
    default_val: float
