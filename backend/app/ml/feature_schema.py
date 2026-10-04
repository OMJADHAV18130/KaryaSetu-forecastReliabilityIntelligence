"""
Centralized feature schema for the XGBoost bust detection model.

Two distinct things live here, and they must not be confused.

``FEATURE_COLUMNS``
    The 12 features the served booster actually reads, in the exact positional
    order it was fitted with. The artifact's ``feature_names`` list is empty, so
    position *is* the identity: reordering these silently corrupts every
    prediction instead of raising. Nothing here may reorder or extend this list
    without a matching retrained artifact.

``DESIGNED_FEATURE_SPEC``
    The full 19-feature design contract, recorded for reference. Seven of those
    features have no weight in the booster and are not served; see
    ``UNIMPLEMENTED_FEATURES`` for which and why. It is documentation, not an
    input contract.
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

# ── The 19-feature design contract ───────────────────────────────────────────
# Recorded as specified. Groups are listed in the design's own order, which is
# NOT the served order: it puts longitude before latitude and places
# bust_pattern_similarity ahead of the structural features.
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
        "description": "Spatial gradients. NOT served - see UNIMPLEMENTED_FEATURES",
        "features": {
            "mslp_gradient": "Pressure gradient - dynamically active regions",
            "temp_gradient": "Temperature gradient - frontal boundaries",
            "geo500_gradient": "Mid-level flow gradient - steering-flow intensity",
        },
    },
    "lead_time_tendency": {
        "description": "Forecast-to-forecast tendencies. NOT served - see UNIMPLEMENTED_FEATURES",
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

# ── Features specified in the design but absent from the served booster ──────
# These 7 have no weight in the 200-tree artifact, were never computed, and
# appear nowhere in the training notebook. They are named here so the shortfall
# stays visible instead of being silently forgotten.
#
# Two independent reasons they cannot simply be switched on:
#   1. The booster declares num_feature = 12 and raises on a 19-column input.
#   2. Their definitions are unspecified - a gradient needs a spatial
#      neighbourhood and a tendency needs a forecast-to-forecast step, and
#      neither is recorded anywhere. Computing them would mean guessing at
#      7 of the 19 model inputs.
#
# Serving them requires a refit on the WeatherBench2 splits, after which the
# transcribed September 2019 figures must be re-derived because they describe
# the earlier 11-feature notebook run.
UNIMPLEMENTED_FEATURES: List[Dict[str, str]] = [
    {
        "name": name,
        "group": group_name,
        "purpose": spec["features"][name],
    }
    for group_name, spec in DESIGNED_FEATURE_SPEC.items()
    if group_name in ("spatial_gradient", "lead_time_tendency")
    for name in spec["features"]
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
