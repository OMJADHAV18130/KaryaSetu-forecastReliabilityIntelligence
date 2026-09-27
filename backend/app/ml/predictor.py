"""
Predictor — Runs inference using the trained XGBoost model and calibrator.
"""

import logging
import math
import uuid
from typing import Dict, Any, Optional

import numpy as np

from .model_loader import model_loader
from .feature_schema import FEATURE_COLUMNS, lead_hours_to_day

logger = logging.getLogger("karyasetu")


class Predictor:
    """
    Prediction engine that uses the calibrated XGBoost model.

    The predictor:
    1. Validates input features
    2. Runs XGBoost inference
    3. Applies sigmoid calibration
    4. Returns calibrated bust probability and confidence
    """

    def __init__(self):
        self.model = model_loader.model
        self.calibrator = model_loader.calibrator
        self.model_loaded = model_loader.model_loaded
        self.calibration_loaded = model_loader.calibration_loaded
        self.model_version = model_loader.model_version

    def predict(self, features: Dict[str, Any]) -> Dict[str, Any]:
        """
        Run prediction on a single set of features.

        Args:
            features: Dictionary with all 11 model features

        Returns:
            Dictionary with bust_probability, confidence, confidence_level, etc.

        Raises:
            ValueError: If model is not loaded or features are invalid
        """
        request_id = str(uuid.uuid4())[:8]

        if not self.model_loaded:
            raise ValueError("Model is not loaded. Cannot run prediction.")

        # Validate and extract features in correct order
        feature_vector = self._extract_features(features)

        # Run XGBoost inference
        X = np.array([feature_vector])
        raw_prob = float(self.model.predict_proba(X)[0, 1])

        # Apply calibration if available
        if self.calibration_loaded:
            calibrated_prob = float(self.calibrator.predict_proba(X)[0, 1])
        else:
            calibrated_prob = raw_prob
            logger.warning("Calibrator not available, using raw probability")

        # Calculate confidence and confidence level
        confidence = 1.0 - calibrated_prob
        confidence_level = self._confidence_level(confidence)

        # Derive day from lead hours
        lead_hours = feature_vector[10]  # lead_hours is the 11th feature
        day = lead_hours_to_day(lead_hours)
        bust_sim = feature_vector[11] if len(feature_vector) > 11 else None

        return {
            "bust_probability": round(calibrated_prob, 4),
            "confidence": round(confidence, 4),
            "confidence_level": confidence_level,
            "day": day,
            "lead_hours": lead_hours,
            "latitude": feature_vector[9],
            "longitude": feature_vector[8],
            "bust_pattern_similarity": round(bust_sim, 4) if bust_sim is not None else None,
            "model_version": self.model_version,
            "request_id": request_id,
        }

    def predict_batch(self, features_list: list) -> list:
        """Run prediction on a batch of feature sets."""
        results = []
        for features in features_list:
            try:
                result = self.predict(features)
                results.append(result)
            except Exception as e:
                logger.error(f"Batch prediction error: {e}")
                results.append({"error": str(e)})
        return results

    # Mapping from API schema names to model feature names
    FEATURE_NAME_MAP = {
        "temperature_2m": "2m_temperature",
        "u_wind_10m": "10m_u_component_of_wind",
        "v_wind_10m": "10m_v_component_of_wind",
        "pattern_similarity": "bust_pattern_similarity",
    }

    def _extract_features(self, features: Dict[str, Any]) -> list:
        """Extract and validate features in the correct order."""
        feature_vector = []
        for col in FEATURE_COLUMNS:
            # Try direct name first, then mapped name
            val = features.get(col)
            if val is None:
                # Check reverse mapping (API name -> model name)
                for api_name, model_name in self.FEATURE_NAME_MAP.items():
                    if model_name == col and api_name in features:
                        val = features[api_name]
                        break
            if val is None:
                if col == "bust_pattern_similarity":
                    # Derive default similarity from precipitation intensity & lead time if omitted
                    tp = float(features.get("total_precipitation_24hr", features.get("precipitation", 0.01)))
                    lead_h = float(features.get("lead_hours", 24.0))
                    val = float(np.clip(0.42 + min(0.40, tp * 12.0) + (lead_h / 240.0) * 0.12, 0.0, 1.0))
                else:
                    raise ValueError(f"Missing feature: {col}")
            val = float(val)
            if math.isnan(val) or math.isinf(val):
                raise ValueError(f"Invalid value for {col}: {val}")
            feature_vector.append(val)
        return feature_vector

    @staticmethod
    def _confidence_level(confidence: float) -> str:
        """Categorize confidence level."""
        if confidence >= 0.70:
            return "HIGH"
        elif confidence >= 0.40:
            return "MODERATE"
        else:
            return "LOW"


# Global instance
predictor = Predictor()
