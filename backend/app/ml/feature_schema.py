"""
Centralized feature schema for the XGBoost bust detection model.

All 19 features designed and implemented in notebookf941b4a0d6.ipynb are active
and served by the model.

``FEATURE_COLUMNS``
    The 19 features the served booster reads, in the exact positional
    order it was fitted with in notebookf941b4a0d6.ipynb Cell 20.

``DESIGNED_FEATURE_SPEC``
    The full 19-feature design specification across all 5 thematic groups:
    - raw meteorological (8)
    - spatial gradient (3)
    - lead-time tendency (4)
    - time-series pattern (1)
    - structural (3)
"""

from typing import Dict, List, Any

# ── Exact feature columns from notebookf941b4a0d6.ipynb Cell 20 ──────────────
FEATURE_COLUMNS: List[str] = [
    "total_precipitation_24hr",
    "2m_temperature",
    "mean_sea_level_pressure",
    "10m_u_component_of_wind",
    "10m_v_component_of_wind",
    "specific_humidity_850",
    "geopotential_500",
    "vertical_velocity_500",
    "mslp_gradient",
    "temp_gradient",
    "geo500_gradient",
    "mean_sea_level_pressure_tendency",
    "2m_temperature_tendency",
    "geopotential_500_tendency",
    "total_precipitation_24hr_tendency",
    "bust_pattern_similarity",
    "longitude",
    "latitude",
    "lead_hours",
]

# ── Provenance of bust_pattern_similarity ─────────────────────────────────────
# Fully documented and implemented in notebookf941b4a0d6.ipynb Cells 17-19:
# Cosine similarity between each forecast's 10-day rainfall trajectory across lead times
# and the historical bust archetype computed from June-July 2019 training busts.
BUST_PATTERN_SIMILARITY_PROVENANCE = "DOCUMENTED"

# ── The 19-feature design contract ───────────────────────────────────────────
DESIGNED_FEATURE_SPEC: Dict[str, Dict[str, Any]] = {
    "raw_meteorological": {
        "description": "Forecast meteorological variables",
        "features": {
            "total_precipitation_24hr": "Forecast rainfall amount",
            "2m_temperature": "Surface temperature",
            "mean_sea_level_pressure": "Surface pressure - synoptic driver",
            "10m_u_component_of_wind": "Zonal (east-west) wind",
            "10m_v_component_of_wind": "Meridional (north-south) wind",
            "specific_humidity_850": "Low-level moisture (850 hPa)",
            "geopotential_500": "Mid-level steering flow (500 hPa)",
            "vertical_velocity_500": "Convective instability proxy (500 hPa)",
        },
    },
    "spatial_gradient": {
        "description": "Spatial gradients: sqrt((d/dlat)^2 + (d/dlon)^2)",
        "features": {
            "mslp_gradient": "Pressure gradient - dynamically active regions",
            "temp_gradient": "Temperature gradient - frontal boundaries",
            "geo500_gradient": "Mid-level flow gradient - steering-flow intensity",
        },
    },
    "lead_time_tendency": {
        "description": "Lead-time forecast evolution tendencies across forecast lead times",
        "features": {
            "mean_sea_level_pressure_tendency": "Pressure evolution rate forecast-to-forecast",
            "2m_temperature_tendency": "Temperature evolution rate",
            "geopotential_500_tendency": "Steering-flow evolution rate",
            "total_precipitation_24hr_tendency": "Rainfall forecast evolution rate",
        },
    },
    "time_series_pattern": {
        "description": "Time-series pattern features",
        "features": {
            "bust_pattern_similarity": "Cosine similarity of the full Day 1-10 trajectory to historical bust archetypes",
        },
    },
    "structural": {
        "description": "Location and lead time",
        "features": {
            "latitude": "Location",
            "longitude": "Location",
            "lead_hours": "Forecast lead time (24-240h)",
        },
    },
}

#: Flattened design list, in the design's own order. 19 entries.
DESIGNED_FEATURES: List[str] = [
    name
    for group in DESIGNED_FEATURE_SPEC.values()
    for name in group["features"]
]

# In notebookf941b4a0d6.ipynb, all 19 features are implemented and served!
UNIMPLEMENTED_FEATURES: List[Dict[str, str]] = []

# ── Feature metadata for validation and documentation ─────────────────────────
FEATURE_SCHEMA: Dict[str, Dict[str, Any]] = {
    "total_precipitation_24hr": {
        "description": "24-hour accumulated precipitation",
        "unit": "m",
        "min": 0.0,
        "max": 0.5,
        "default": 0.01,
    },
    "2m_temperature": {
        "description": "2-meter temperature",
        "unit": "K",
        "min": 200.0,
        "max": 330.0,
        "default": 298.0,
    },
    "mean_sea_level_pressure": {
        "description": "Mean sea level pressure",
        "unit": "Pa",
        "min": 90000.0,
        "max": 106000.0,
        "default": 100800.0,
    },
    "10m_u_component_of_wind": {
        "description": "10-meter U (zonal) wind component",
        "unit": "m/s",
        "min": -60.0,
        "max": 60.0,
        "default": 3.5,
    },
    "10m_v_component_of_wind": {
        "description": "10-meter V (meridional) wind component",
        "unit": "m/s",
        "min": -60.0,
        "max": 60.0,
        "default": -2.0,
    },
    "specific_humidity_850": {
        "description": "Specific humidity at 850 hPa",
        "unit": "kg/kg",
        "min": 0.0001,
        "max": 0.03,
        "default": 0.012,
    },
    "geopotential_500": {
        "description": "Geopotential at 500 hPa",
        "unit": "m^2/s^2",
        "min": 48000.0,
        "max": 60000.0,
        "default": 57500.0,
    },
    "vertical_velocity_500": {
        "description": "Vertical velocity at 500 hPa",
        "unit": "Pa/s",
        "min": -5.0,
        "max": 5.0,
        "default": -0.15,
    },
    "mslp_gradient": {
        "description": "Mean sea level pressure spatial gradient",
        "unit": "Pa/deg",
        "min": 0.0,
        "max": 500.0,
        "default": 45.0,
    },
    "temp_gradient": {
        "description": "2m temperature spatial gradient",
        "unit": "K/deg",
        "min": 0.0,
        "max": 20.0,
        "default": 1.2,
    },
    "geo500_gradient": {
        "description": "Geopotential 500 hPa spatial gradient",
        "unit": "m^2/s^2/deg",
        "min": 0.0,
        "max": 1000.0,
        "default": 65.0,
    },
    "mean_sea_level_pressure_tendency": {
        "description": "Pressure difference across lead times",
        "unit": "Pa/24h",
        "min": -3000.0,
        "max": 3000.0,
        "default": 0.0,
    },
    "2m_temperature_tendency": {
        "description": "Temperature difference across lead times",
        "unit": "K/24h",
        "min": -15.0,
        "max": 15.0,
        "default": 0.0,
    },
    "geopotential_500_tendency": {
        "description": "Geopotential difference across lead times",
        "unit": "m^2/s^2/24h",
        "min": -500.0,
        "max": 500.0,
        "default": 0.0,
    },
    "total_precipitation_24hr_tendency": {
        "description": "24h rainfall difference across lead times",
        "unit": "m/24h",
        "min": -0.5,
        "max": 0.5,
        "default": 0.0,
    },
    "bust_pattern_similarity": {
        "description": "Cosine similarity of precipitation trajectory to historical bust archetype",
        "unit": "similarity (0–1)",
        "min": 0.0,
        "max": 1.0,
        "default": 0.584,
    },
    "longitude": {
        "description": "Longitude",
        "unit": "degrees",
        "min": 68.0,
        "max": 98.0,
        "default": 78.5,
    },
    "latitude": {
        "description": "Latitude",
        "unit": "degrees",
        "min": 8.0,
        "max": 37.0,
        "default": 22.5,
    },
    "lead_hours": {
        "description": "Forecast lead time in hours",
        "unit": "hours",
        "min": 24.0,
        "max": 240.0,
        "default": 24.0,
    },
}

# ── Spatial domain ────────────────────────────────────────────────────────────
DOMAIN = {
    "lat_min": 8.0,
    "lat_max": 37.0,
    "lon_min": 68.0,
    "lon_max": 98.0,
}

# ── Lead time mapping ─────────────────────────────────────────────────────────
LEAD_HOURS_TO_DAY = {day * 24: day for day in range(1, 11)}
DAY_TO_LEAD_HOURS = {day: day * 24 for day in range(1, 11)}


def lead_hours_to_day(lead_hours: float) -> int:
    """Convert lead hours to day number (24h -> 1, 48h -> 2, ..., 240h -> 10)."""
    day = int(round(lead_hours / 24.0))
    return max(1, min(10, day))


def day_to_lead_hours(day: int) -> int:
    """Convert day number to lead hours (1 -> 24, 2 -> 48, ..., 10 -> 240)."""
    return day * 24
