"""
Predictor — Runs inference using the trained XGBoost model and calibrator.
"""

import logging
import math
import uuid
from typing import Dict, Any, List, Optional

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
            features: Dictionary with all 12 model features

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
        bust_sim = feature_vector[11]

        return {
            "bust_probability": round(calibrated_prob, 4),
            # Both stages are reported, not just the final one. SHAP decomposes the
            # booster's own log-odds, so a reader comparing the attribution against
            # the headline number needs to see what the booster said before the
            # calibrator moved it. Showing only the calibrated figure makes a
            # correct decomposition look wrong.
            "uncalibrated_probability": round(raw_prob, 6),
            "calibration_applied": self.calibration_loaded,
            "confidence": round(confidence, 4),
            "confidence_level": confidence_level,
            "day": day,
            "lead_hours": lead_hours,
            "latitude": feature_vector[9],
            "longitude": feature_vector[8],
            "bust_pattern_similarity": round(bust_sim, 4),
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

    def predict_matrix(self, feature_rows: List[List[float]]) -> List[Dict[str, Any]]:
        """
        Score many feature vectors with two booster calls instead of two per row.

        A choropleth asks for every district at once, and ``predict()`` costs one
        booster call plus one calibrator call per coordinate. This method sends
        the whole block through the booster in a single ``predict_proba``, then
        through the calibrator in a second, and assembles exactly the same result
        dicts ``predict()`` would have produced. Same model, same calibration,
        same rounding — only the number of calls changes.

        Args:
            feature_rows: One already-ordered feature vector per location,
                each following :data:`FEATURE_COLUMNS`.

        Returns:
            One prediction dict per input row, in the same order.

        Raises:
            ValueError: If the model is not loaded or any row has the wrong
                width, or contains a non-finite value.
        """
        if not self.model_loaded:
            raise ValueError("Model is not loaded. Cannot run prediction.")

        if not feature_rows:
            return []

        width = len(FEATURE_COLUMNS)
        for index, row in enumerate(feature_rows):
            if len(row) != width:
                raise ValueError(
                    f"Row {index} has {len(row)} features, expected {width}"
                )
            for value in row:
                if math.isnan(value) or math.isinf(value):
                    raise ValueError(f"Row {index} contains a non-finite value")

        X = np.asarray(feature_rows, dtype=float)
        raw_probs = self.model.predict_proba(X)[:, 1]
        if self.calibration_loaded:
            calibrated_probs = self.calibrator.predict_proba(X)[:, 1]
        else:
            calibrated_probs = raw_probs

        request_id = str(uuid.uuid4())[:8]
        lon_index = FEATURE_COLUMNS.index("longitude")
        lat_index = FEATURE_COLUMNS.index("latitude")
        lead_index = FEATURE_COLUMNS.index("lead_hours")
        similarity_index = FEATURE_COLUMNS.index("bust_pattern_similarity")

        results: List[Dict[str, Any]] = []
        for i, row in enumerate(feature_rows):
            calibrated_prob = float(calibrated_probs[i])
            confidence = 1.0 - calibrated_prob
            results.append(
                {
                    "bust_probability": round(calibrated_prob, 4),
                    "uncalibrated_probability": round(float(raw_probs[i]), 6),
                    "calibration_applied": self.calibration_loaded,
                    "confidence": round(confidence, 4),
                    "confidence_level": self._confidence_level(confidence),
                    "day": lead_hours_to_day(row[lead_index]),
                    "lead_hours": row[lead_index],
                    "latitude": row[lat_index],
                    "longitude": row[lon_index],
                    "bust_pattern_similarity": round(row[similarity_index], 4),
                    "model_version": self.model_version,
                    "request_id": request_id,
                }
            )
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
                # No feature is ever substituted. An assumed value would enter the
                # model as if it had been observed, and the resulting probability
                # would look measured when nothing had been measured.
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
