"""
Centralized feature schema for the XGBoost bust detection model.
Exact feature ordering from Untitled9.ipynb Cell 35.
"""

from typing import Dict, List, Any

# ── Exact feature columns from the trained model ──────────────────────────────
FEATURE_COLUMNS: List[str] = [
    "total_precipitation_24hr",
    "2m_temperature",
    "mean_sea_level_pressure",
    "10m_u_component_of_wind",
    "10m_v_component_of_wind",
    "specific_humidity_850",
    "geopotential_500",
    "vertical_velocity_500",
    "longitude",
    "latitude",
    "lead_hours",
    "bust_pattern_similarity",
]

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
    "bust_pattern_similarity": {
        "description": "Cosine similarity of precipitation trajectory to historical bust archetype",
        "unit": "similarity (0–1)",
        "min": 0.0,
        "max": 1.0,
        "default": 0.584,
    },
}

# ── Spatial domain (from Untitled9.ipynb) ─────────────────────────────────────
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
