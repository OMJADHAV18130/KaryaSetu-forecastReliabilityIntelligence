"""
Prediction Service — Orchestrates model inference and prediction processing.
"""

import logging
from typing import Dict, Any, List

from ..ml.predictor import predictor
from ..ml.model_loader import model_loader
from ..ml.feature_schema import FEATURE_COLUMNS

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
            "bust_pattern_similarity": profile["bust_pattern_similarity"],
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
            "bust_pattern_similarity": profile["bust_pattern_similarity"],
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

    def score_coordinates(
        self, coordinates: List[tuple], day: int, profile_builder
    ) -> List[Dict[str, Any]]:
        """
        Score many coordinates at one lead day through a single booster pass.

        A district choropleth needs one value per district boundary, and asking
        the map to invent the gaps between trained grid cells would put numbers on
        screen that the model never produced. Every coordinate is therefore run
        through the same path as :meth:`predict_profile`: build the meteorology
        inputs, then let the trained booster score them.

        Only the call pattern differs. ``predict_profile`` spends one booster call
        and one calibrator call per point; at 700-odd districts that is wasteful,
        so this collects the feature vectors first and sends them through in two
        ``predict_proba`` calls. The arithmetic per row is identical.

        Args:
            coordinates: ``(latitude, longitude)`` pairs to score.
            day: Forecast day (1-10), applied to every coordinate.
            profile_builder: Callable ``(lat, lon) -> profile``, normally
                :meth:`map_service.MapService.get_profile_at`.

        Returns:
            One prediction dict per input coordinate, in the same order, each
            carrying its own ``derivation`` describing how its inputs were built.

        Raises:
            RuntimeError: If the model or calibrator is not loaded.
            ValueError: If any feature value is non-finite.
        """
        if not model_loader.is_ready:
            raise RuntimeError("Model or calibrator not loaded")

        if not coordinates:
            return []

        lead_hours = float(day) * 24.0

        profiles: List[Dict[str, Any]] = []
        rows: List[List[float]] = []
        for lat, lon in coordinates:
            profile = profile_builder(lat, lon)
            features = self.build_model_inputs(profile, lead_hours)
            # Same validation the single-point path applies, applied up front so
            # one bad coordinate cannot poison a whole district batch.
            rows.append([float(features[col]) for col in FEATURE_COLUMNS])
            profiles.append(profile)

        results = predictor.predict_matrix(rows)

        for profile, result in zip(profiles, results):
            result["region"] = profile.get("region", "")
            result["derivation"] = {
                "method": profile["method"],
                "source_cell": profile["source_cell"],
                "distance_km": profile["distance_km"],
                "neighbour_count": profile["neighbour_count"],
            }
        return results


# Singleton instance
prediction_service = PredictionService()
