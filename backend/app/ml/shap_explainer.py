"""
SHAP Explainer — Model attribution via TreeSHAP.

Both endpoints derive their numbers from the trained booster. When SHAP cannot be
computed the explainer says so instead of substituting a plausible-looking
importance table: an attribution that was never computed is indistinguishable
from a real one once it reaches the screen.

Global importance is the mean absolute SHAP value over the stored background
sample. That quantity is a magnitude, so it carries no direction — direction is
only meaningful for the local per-prediction breakdown.
"""

import logging
from typing import Any, Dict, List, Optional

import numpy as np

from .model_loader import model_loader
from .feature_schema import FEATURE_COLUMNS

logger = logging.getLogger("karyasetu")


class ShapExplainer:
    """
    SHAP-based model explainer.

    Uses TreeExplainer on the trained XGBoost booster for both global
    importance and per-prediction attribution.
    """

    def __init__(self) -> None:
        self.model = model_loader.model
        self.background_data = model_loader.shap_background
        self.explainer = None
        self._initialized = False
        self._unavailable_reason: Optional[str] = None

        if model_loader.model_loaded and model_loader.shap_background_loaded:
            self._initialize()

    def _initialize(self) -> None:
        """Initialise the SHAP TreeExplainer, or record why it could not be."""
        # The loader hands back a numpy array, which has no single truth value,
        # so emptiness has to be tested on its shape.
        if self.background_data is None or len(self.background_data) == 0:
            self._unavailable_reason = (
                "No background sample is stored alongside the model, so "
                "attribution cannot be computed."
            )
            logger.warning(self._unavailable_reason)
            return

        try:
            import shap

            self.explainer = shap.TreeExplainer(self.model)
            self._initialized = True
            logger.info("SHAP TreeExplainer initialised")
        except ImportError:
            self._unavailable_reason = (
                "The 'shap' package is not installed in this environment, so "
                "attribution cannot be computed."
            )
            logger.warning(self._unavailable_reason)
        except Exception as exc:
            self._unavailable_reason = f"SHAP TreeExplainer failed to start: {exc}"
            logger.error(self._unavailable_reason)

    @property
    def available(self) -> bool:
        return self._initialized

    @property
    def unavailable_reason(self) -> Optional[str]:
        return None if self._initialized else self._unavailable_reason

    @property
    def model_version(self) -> str:
        return getattr(self.model, "model_version", "xgb-rainfall-bust-v2")

    @property
    def base_value(self) -> Optional[float]:
        """
        The model's average output in log-odds, i.e. SHAP's ``expected_value``.

        Returned alongside a local breakdown so the attribution can be checked
        rather than trusted: ``sigmoid(base_value + sum(shap_values))`` has to come
        back to the probability shown on screen. Without it, the bars are a claim
        the reader has no way to test.
        """
        if not self._initialized:
            return None
        try:
            value = np.asarray(self.explainer.expected_value).reshape(-1)
            return float(value[-1])
        except Exception as exc:  # pragma: no cover - depends on the SHAP build
            logger.warning(f"Could not read the SHAP base value: {exc}")
            return None

    def _vector(self, features: Dict[str, Any]) -> List[float]:
        """Feature values in training order, as plain floats."""
        return [float(features[col]) for col in FEATURE_COLUMNS]

    def _shap_values(self, X: np.ndarray) -> np.ndarray:
        """SHAP values as a (rows, features) array, normalising SHAP's shapes."""
        values = self.explainer.shap_values(X)
        if isinstance(values, list):
            # Older SHAP releases return one array per class for binary output.
            values = values[-1]
        values = np.asarray(values)
        # SHAP >= 0.45 returns (features, rows) for the new output format.
        if values.ndim == 3:
            values = values[:, :, -1]
        if values.ndim == 2 and values.shape[0] != X.shape[0]:
            values = values.T
        return values

    def explain_local(self, features: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Attribute one prediction.

        Args:
            features: Dictionary with all model features, in training units

        Returns:
            Contributions sorted by absolute SHAP value, descending. Empty when
            SHAP is unavailable — check :attr:`available` first.
        """
        if not self._initialized:
            return []

        vector = self._vector(features)
        values = self._shap_values(np.array([vector]))

        contributions: List[Dict[str, Any]] = []
        for index, column in enumerate(FEATURE_COLUMNS):
            shap_value = float(values[0][index])
            contributions.append(
                {
                    "feature": column,
                    "value": vector[index],
                    "shap_value": round(shap_value, 6),
                    "direction": (
                        "increases_bust_risk"
                        if shap_value > 0
                        else "decreases_bust_risk"
                        if shap_value < 0
                        else "neutral"
                    ),
                }
            )

        contributions.sort(key=lambda c: abs(c["shap_value"]), reverse=True)
        for position, contribution in enumerate(contributions):
            contribution["rank"] = position + 1
        return contributions

    def explain_global(self, n_samples: int = 500) -> List[Dict[str, Any]]:
        """
        Global importance: mean absolute SHAP value per feature.

        Args:
            n_samples: How many background rows to average over

        Returns:
            Features ordered by importance, descending. Empty when SHAP is
            unavailable — check :attr:`available` first.
        """
        if not self._initialized:
            return []

        rows = min(n_samples, len(self.background_data))
        values = self._shap_values(np.asarray(self.background_data[:rows]))
        mean_abs = np.mean(np.abs(values), axis=0)

        contributions: List[Dict[str, Any]] = [
            {
                "feature": column,
                "mean_abs_shap": round(float(mean_abs[index]), 6),
                "rank": 0,
            }
            for index, column in enumerate(FEATURE_COLUMNS)
        ]
        contributions.sort(key=lambda c: c["mean_abs_shap"], reverse=True)
        for position, contribution in enumerate(contributions):
            contribution["rank"] = position + 1
        return contributions


# Global singleton instance
shap_explainer = ShapExplainer()