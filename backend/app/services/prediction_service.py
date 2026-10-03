"""
Prediction Service — Orchestrates model inference and prediction processing.
"""

import logging
from typing import Dict, Any, List

from ..ml.predictor import predictor
from ..ml.model_loader import model_loader

logger = logging.getLogger("karyasetu")

# Model input names, in the same order the schema documents them, together with
# the key they are read from in an internal meteorology profile.
PROFILE_FIELD_MAP = {
    "total_precipitation_24hr": ("tp", 1.0),
    "2m_temperature": ("t2m", 1.0),
    "mean_sea_level_pressure": ("mslp", 1.0),
    "10m_u_component_of_wind": ("u10", 1.0),
    "10m_v_component_of_wind": ("v10", 1.0),
    "specific_humidity_850": ("q850", 1.0),
    "geopotential_500": ("z500", 1.0),
    "vertical_velocity_500": ("w500", 1.0),
    "bust_pattern_similarity": ("bust_pattern_similarity", 1.0),
}


class PredictionService:
    """Service for running predictions and processing results."""

    def predict_single(self, features: Dict[str, Any]) -> Dict[str, Any]:
        """
        Run prediction on a single location.

        Args:
            features: Dictionary with all model features, in training units
                (Kelvin, Pa, m²/s², ...)

        Returns:
            Prediction result with calibrated probability and confidence
        """
        if not model_loader.is_ready:
            raise RuntimeError("Model or calibrator not loaded")

        result = predictor.predict(features)
        return result

    @staticmethod
    def build_model_inputs(profile: Dict[str, Any], lead_hours: float) -> Dict[str, Any]:
        """
        Convert an internal meteorology profile into model inputs.

        The reference grid is stored in the units a human would read off a
        sounding (°C, hPa, geopotential metres). The trained booster expects
        Kelvin, Pa and m²/s², so the conversions happen here — once — for every
        consumer of a profile.
        """
        return {
            "total_precipitation_24hr": profile["tp"],
            # Celsius -> Kelvin
            "2m_temperature": profile["t2m"] + 273.15,
            # hPa -> Pa
            "mean_sea_level_pressure": profile["mslp"] * 100.0,
            "10m_u_component_of_wind": profile["u10"],
            "10m_v_component_of_wind": profile["v10"],
            "specific_humidity_850": profile["q850"],
            # geopotential metres -> m²/s²
            "geopotential_500": profile["z500"] * 9.81,
            "vertical_velocity_500": profile["w500"],
            "bust_pattern_similarity": profile.get("bust_pattern_similarity", 0.35),
            "latitude": profile["lat"],
            "longitude": profile["lon"],
            "lead_hours": lead_hours,
        }

    @staticmethod
    def build_display_inputs(profile: Dict[str, Any], lead_hours: float) -> Dict[str, Any]:
        """Profile values in human-readable units, for the feature tables in the UI."""
        return {
            "total_precipitation_24hr": profile["tp"],
            "2m_temperature": profile["t2m"],
            "mean_sea_level_pressure": profile["mslp"],
            "10m_u_component_of_wind": profile["u10"],
            "10m_v_component_of_wind": profile["v10"],
            "specific_humidity_850": profile["q850"],
            "geopotential_500": profile["z500"],
            "vertical_velocity_500": profile["w500"],
            "bust_pattern_similarity": profile.get("bust_pattern_similarity", 0.35),
            "lead_hours": lead_hours,
        }

    def predict_profile(
        self, profile: Dict[str, Any], day: int
    ) -> Dict[str, Any]:
        """
        Score one meteorology profile for one lead day.

        Args:
            profile: Internal meteorology profile from :mod:`map_service`
            day: Forecast day (1-10)

        Returns:
            Prediction result, annotated with the inputs that produced it.
        """
        if not model_loader.is_ready:
            raise RuntimeError("Model or calibrator not loaded")

        lead_hours = float(day) * 24.0
        features = self.build_model_inputs(profile, lead_hours)

        result = predictor.predict(features)
        result["region"] = profile.get("region", "")
        result["model_inputs"] = self.build_display_inputs(profile, lead_hours)
        return result

    def predict_grid(
        self, day: int, meteorology_data: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Run predictions for all grid points at a given day.

        Args:
            day: Forecast day (1-10)
            meteorology_data: List of meteorological profiles for grid points

        Returns:
            List of predictions for each grid point
        """
        if not model_loader.is_ready:
            raise RuntimeError("Model or calibrator not loaded")

        return [self.predict_profile(profile, day) for profile in meteorology_data]

    def predict_time_series(
        self, profile: Dict[str, Any], days: List[int]
    ) -> List[Dict[str, Any]]:
        """
        Score one coordinate across several lead days.

        Each day is a separate model call at the same location, so the resulting
        curve is the model's own day-by-day behaviour rather than a fit.

        Args:
            profile: Meteorology profile for the location
            days: Forecast days to score, e.g. ``[1, 2, 3, 4]``

        Returns:
            One prediction dict per lead day, in ascending day order.
        """
        return [self.predict_profile(profile, day) for day in sorted(days)]


# Singleton instance
prediction_service = PredictionService()
