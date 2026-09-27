"""
Prediction Service — Orchestrates model inference and prediction processing.
"""

import logging
from typing import Dict, Any, List

from ..ml.predictor import predictor
from ..ml.model_loader import model_loader

logger = logging.getLogger("karyasetu")


class PredictionService:
    """Service for running predictions and processing results."""

    def predict_single(self, features: Dict[str, Any]) -> Dict[str, Any]:
        """
        Run prediction on a single location.

        Args:
            features: Dictionary with all 11 model features

        Returns:
            Prediction result with calibrated probability and confidence
        """
        if not model_loader.is_ready:
            raise RuntimeError("Model or calibrator not loaded")

        result = predictor.predict(features)
        return result

    def predict_grid(self, day: int, meteorology_data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
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

        lead_hours = day * 24.0
        results = []

        for profile in meteorology_data:
            # Convert units to match model training data
            # Temperature: Celsius -> Kelvin
            # Pressure: hPa -> Pa
            # Geopotential: gpm -> m²/s² (multiply by g=9.81)
            features = {
                "total_precipitation_24hr": profile["tp"],
                "2m_temperature": profile["t2m"] + 273.15,
                "mean_sea_level_pressure": profile["mslp"] * 100.0,
                "10m_u_component_of_wind": profile["u10"],
                "10m_v_component_of_wind": profile["v10"],
                "specific_humidity_850": profile["q850"],
                "geopotential_500": profile["z500"] * 9.81,
                "vertical_velocity_500": profile["w500"],
                "longitude": profile["lon"],
                "latitude": profile["lat"],
                "lead_hours": lead_hours,
            }
            if "bust_pattern_similarity" in profile:
                features["bust_pattern_similarity"] = profile["bust_pattern_similarity"]

            result = predictor.predict(features)
            result["region"] = profile.get("region", "")
            result["model_inputs"] = {
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
            results.append(result)

        return results


# Singleton instance
prediction_service = PredictionService()
