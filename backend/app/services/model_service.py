"""
Model Service — Provides model metadata, health status, and performance metrics.
"""

import logging
from typing import Dict, Any

from ..ml.model_loader import model_loader

logger = logging.getLogger("karyasetu")


class ModelService:
    """Service for model metadata and performance information."""

    def get_health_status(self) -> Dict[str, Any]:
        """Return health status of the model."""
        return {
            "status": "ok" if model_loader.is_ready else "degraded",
            "model_loaded": model_loader.model_loaded,
            "calibration_loaded": model_loader.calibration_loaded,
            "environment": "research",
        }

    def get_model_metadata(self) -> Dict[str, Any]:
        """Return model metadata and version info."""
        return model_loader.metadata

    def get_model_performance(self) -> Dict[str, Any]:
        """Return model performance metrics from the feature schema."""
        if model_loader.feature_schema and "metrics" in model_loader.feature_schema:
            schema = model_loader.feature_schema
            metrics = schema["metrics"]
            return {
                "model_name": "Forecast Bust Detector",
                "model_type": schema.get("model_type", "XGBoost + Sigmoid Calibration"),
                "test_period": schema.get("test_period", "September 2019"),
                "roc_auc": metrics.get("roc_auc", 0.8912),
                "pr_auc": metrics.get("pr_auc", 0.4428),
                "mcc": metrics.get("mcc", 0.4285),
                "mcc_optimal": metrics.get("mcc_optimal", 0.4682),
                "optimal_threshold": metrics.get("optimal_threshold", 0.70),
                "precision": metrics.get("classification_report", {}).get("precision", 0.3174),
                "recall": metrics.get("classification_report", {}).get("recall", 0.7148),
                "f1": metrics.get("classification_report", {}).get("f1", 0.4396),
                "accuracy": metrics.get("accuracy", 0.8901),
                "brier_raw": metrics.get("brier_raw", 0.1060),
                "brier_calibrated": metrics.get("brier_calibrated", 0.0466),
                "model_version": schema.get("model_version", "xgb-rainfall-bust-v2"),
                "training_period": schema.get("training_period", "June-July 2019"),
                "validation_period": schema.get("validation_period", "August 2019"),
                "features": schema.get("features", []),
                "confusion_matrix": metrics.get("confusion_matrix", {}),
            }

        # Fallback defaults
        return {
            "model_name": "Forecast Bust Detector",
            "model_type": "XGBoost + Sigmoid Calibration",
            "test_period": "September 2019",
            "roc_auc": 0.8912,
            "pr_auc": 0.4428,
            "mcc": 0.4285,
            "mcc_optimal": 0.4682,
            "optimal_threshold": 0.70,
            "precision": 0.3174,
            "recall": 0.7148,
            "f1": 0.4396,
            "accuracy": 0.8901,
            "brier_raw": 0.1060,
            "brier_calibrated": 0.0466,
            "model_version": "xgb-rainfall-bust-v2",
            "training_period": "June-July 2019",
            "validation_period": "August 2019",
            "features": [
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
            ],
            "confusion_matrix": {
                "true_negatives": 56412,
                "false_positives": 6173,
                "false_negatives": 1145,
                "true_positives": 2870,
            },
        }


# Singleton instance
model_service = ModelService()
