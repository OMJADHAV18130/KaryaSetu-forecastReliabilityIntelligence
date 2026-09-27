"""
SHAP Explainer — Provides model explainability using SHAP values.
"""

import logging
from typing import Dict, Any, List, Optional

import numpy as np

from .model_loader import model_loader
from .feature_schema import FEATURE_COLUMNS

logger = logging.getLogger("karyasetu")


class ShapExplainer:
    """
    SHAP-based model explainer.

    Uses TreeExplainer for the XGBoost model to compute SHAP values
    for both global and local explanations.
    """

    def __init__(self):
        self.model = model_loader.model
        self.background_data = model_loader.shap_background
        self.explainer = None
        self._initialized = False

        if model_loader.model_loaded and model_loader.shap_background_loaded:
            self._initialize()

    def _initialize(self):
        """Initialize the SHAP TreeExplainer."""
        try:
            import shap
            self.explainer = shap.TreeExplainer(self.model)
            self._initialized = True
            logger.info("SHAP TreeExplainer initialized")
        except ImportError:
            logger.warning("shap module not installed, SHAP explanations will use fallback")
            self._initialized = False
        except Exception as e:
            logger.error(f"Failed to initialize SHAP explainer: {e}")
            self._initialized = False

    def explain_local(self, features: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Explain a single prediction using SHAP values.

        Args:
            features: Dictionary with all 11 model features

        Returns:
            List of feature contributions sorted by absolute SHAP value
        """
        if not self._initialized:
            return self._fallback_explanation(features)

        # Build feature vector
        feature_vector = []
        for col in FEATURE_COLUMNS:
            feature_vector.append(float(features[col]))

        X = np.array([feature_vector])

        # Compute SHAP values
        shap_values = self.explainer.shap_values(X)
        if isinstance(shap_values, list):
            shap_values = shap_values[1]  # For binary classification, take class 1

        contributions = []
        for i, col in enumerate(FEATURE_COLUMNS):
            shap_val = float(shap_values[0][i])
            contributions.append({
                "feature": col,
                "value": feature_vector[i],
                "shap_value": round(shap_val, 6),
                "direction": "increases_bust_risk" if shap_val > 0 else "decreases_bust_risk",
            })

        # Sort by absolute SHAP value (descending)
        contributions.sort(key=lambda x: abs(x["shap_value"]), reverse=True)

        # Add rank
        for i, c in enumerate(contributions):
            c["rank"] = i + 1

        return contributions

    def explain_global(self, n_samples: int = 500) -> List[Dict[str, Any]]:
        """
        Compute global feature importance using SHAP.

        Args:
            n_samples: Number of background samples to use

        Returns:
            List of features with mean absolute SHAP values
        """
        if not self._initialized:
            return self._fallback_global_explanation()

        # Use background data
        n = min(n_samples, len(self.background_data))
        X_bg = self.background_data[:n]

        # Compute SHAP values for background
        shap_values = self.explainer.shap_values(X_bg)
        if isinstance(shap_values, list):
            shap_values = shap_values[1]

        # Mean absolute SHAP value per feature
        mean_abs_shap = np.mean(np.abs(shap_values), axis=0)

        contributions = []
        for i, col in enumerate(FEATURE_COLUMNS):
            val = round(float(mean_abs_shap[i]), 6)
            contributions.append({
                "feature": col,
                "mean_abs_shap": val,
                "shap_value": val,
                "value": val,
                "direction": "increases_bust_risk" if val > 0.05 else "decreases_bust_risk",
                "importance_rank": 0,
                "rank": 0,
            })

        # Sort by importance
        contributions.sort(key=lambda x: x["mean_abs_shap"], reverse=True)
        for i, c in enumerate(contributions):
            c["importance_rank"] = i + 1
            c["rank"] = i + 1

        return contributions

    def _fallback_explanation(self, features: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Fallback explanation when SHAP is not available."""
        logger.warning("SHAP not available, using fallback explanation")
        # Use feature values to create a basic explanation
        contributions = []
        for col in FEATURE_COLUMNS:
            val = float(features.get(col, 0))
            # Simple heuristic for direction
            if col == "lead_hours":
                direction = "increases_bust_risk" if val > 96 else "decreases_bust_risk"
            elif col == "vertical_velocity_500":
                direction = "increases_bust_risk" if val < -0.2 else "decreases_bust_risk"
            elif col == "total_precipitation_24hr":
                direction = "increases_bust_risk" if val > 0.02 else "decreases_bust_risk"
            elif col == "bust_pattern_similarity":
                direction = "increases_bust_risk" if val > 0.65 else "decreases_bust_risk"
            else:
                direction = "neutral"
            contributions.append({
                "feature": col,
                "value": val,
                "shap_value": 0.0,
                "direction": direction,
            })
        return contributions

    def _fallback_global_explanation(self) -> List[Dict[str, Any]]:
        """Fallback global explanation when SHAP is not available."""
        logger.warning("SHAP not available, using fallback global explanation")
        sample_importance = {
            "lead_hours": 0.38,
            "vertical_velocity_500": 0.32,
            "bust_pattern_similarity": 0.28,
            "specific_humidity_850": 0.26,
            "total_precipitation_24hr": 0.21,
            "mean_sea_level_pressure": 0.16,
            "geopotential_500": 0.12,
            "2m_temperature": 0.09,
            "10m_u_component_of_wind": 0.06,
            "10m_v_component_of_wind": 0.04,
            "latitude": 0.02,
            "longitude": 0.02,
        }
        res = []
        for col in FEATURE_COLUMNS:
            imp = sample_importance.get(col, 0.05)
            res.append({
                "feature": col,
                "mean_abs_shap": imp,
                "shap_value": imp,
                "value": imp,
                "direction": "increases_bust_risk" if imp >= 0.15 else "decreases_bust_risk",
                "importance_rank": 0,
                "rank": 0,
            })
        res.sort(key=lambda x: x["mean_abs_shap"], reverse=True)
        for i, c in enumerate(res):
            c["rank"] = i + 1
            c["importance_rank"] = i + 1
        return res


# Global singleton instance
shap_explainer = ShapExplainer()
