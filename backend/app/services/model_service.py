"""
Model Service — model metadata and evaluation figures.

Two evaluations are reported, and they are deliberately kept apart:

``held_out_test_set``
    The figures the notebook's tuned XGBoost model achieved on the September
    2019 held-out test set. These are transcribed from the notebook's own
    printed output into ``models/notebook_evaluation.json``. Nothing here
    re-scores that split, because the September 2019 data is not available in
    this deployment — so these are static records of a past evaluation, not
    live statistics.

``served_artifact``
    What the booster actually loaded by this API measures on the data it was
    fitted on. It is reported separately because it is not the September 2019
    test set, and presenting it as such would overstate the model.

No metric here is ever invented. If a figure is absent it is reported as null
rather than filled with a placeholder.
"""

import json
import logging
import os
from typing import Any, Dict, Optional

from ..ml.model_loader import model_loader

logger = logging.getLogger("karyasetu")

MODEL_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "..", "models")
NOTEBOOK_EVALUATION_PATH = os.path.normpath(
    os.path.join(MODEL_DIR, "notebook_evaluation.json")
)


def _load_notebook_evaluation() -> Optional[Dict[str, Any]]:
    """Read the transcribed notebook figures, or return None if the file is absent."""
    if not os.path.isfile(NOTEBOOK_EVALUATION_PATH):
        logger.warning("Notebook evaluation file not found at %s", NOTEBOOK_EVALUATION_PATH)
        return None
    try:
        with open(NOTEBOOK_EVALUATION_PATH, "r", encoding="utf-8") as handle:
            return json.load(handle)
    except Exception as exc:
        logger.error("Could not read %s: %s", NOTEBOOK_EVALUATION_PATH, exc)
        return None


class ModelService:
    """Model metadata, health status and evaluation figures."""

    @staticmethod
    def get_health_status() -> Dict[str, Any]:
        return {
            "status": "ok" if model_loader.is_ready else "degraded",
            "model_loaded": model_loader.model_loaded,
            "calibration_loaded": model_loader.calibration_loaded,
            "shap_available": getattr(model_loader, "shap_background_loaded", False),
            "environment": "research",
        }

    @staticmethod
    def get_model_metadata() -> Dict[str, Any]:
        """
        Identity of the loaded artifact: what it is, what it reads, and whether
        it loaded cleanly.

        Evaluation figures are deliberately excluded. They live on
        ``/api/model-performance``, where the notebook's held-out test set and
        the deployed booster's own data are reported as two separate things.
        Repeating them here would invite them to be read as one number.
        """
        stored = model_loader.metadata or {}

        return {
            "model_version": stored.get("model_version")
            or getattr(model_loader, "model_version", "unknown"),
            "model_type": stored.get("model_type", "XGBoost classifier"),
            "feature_count": len(stored.get("features") or []),
            "features": stored.get("features") or [],
            "hyperparameters": stored.get("hyperparameters", {}),
            "training_period": stored.get("training_period"),
            "validation_period": stored.get("validation_period"),
            "test_period": stored.get("test_period"),
            "is_ready": model_loader.is_ready,
            "model_loaded": model_loader.model_loaded,
            "calibration_loaded": model_loader.calibration_loaded,
            "shap_available": getattr(model_loader, "shap_background_loaded", False),
            "environment": "research",
        }

    @staticmethod
    def _served_artifact_metrics(schema: Dict[str, Any]) -> Dict[str, Any]:
        """Metrics measured on the data the currently loaded booster was fitted on."""
        metrics = schema.get("metrics") or {}
        matrix = metrics.get("confusion_matrix") or {}
        rows = sum(
            value
            for value in matrix.values()
            if isinstance(value, (int, float))
        )

        return {
            "label": "Data the loaded booster was fitted on",
            "n_samples": int(rows) if rows else None,
            "roc_auc": metrics.get("roc_auc"),
            "pr_auc": metrics.get("pr_auc"),
            "mcc": metrics.get("mcc"),
            "accuracy": metrics.get("accuracy"),
            "brier_raw": metrics.get("brier_raw"),
            "brier_calibrated": metrics.get("brier_calibrated"),
            "confusion_matrix": matrix or None,
            "note": (
                "This is not the September 2019 test set. The original 172 GB "
                "reanalysis archive could not be downloaded, so the deployed "
                "booster was refitted on a dataset reconstructed from the "
                "notebook's own values plus meteorologically reasoned samples. "
                "Read the figures above for the published skill of the "
                "notebook model."
            ),
        }

    def get_model_performance(self) -> Dict[str, Any]:
        """Both evaluations, kept distinct, plus the feature contract."""
        schema = model_loader.feature_schema or {}
        notebook = _load_notebook_evaluation()

        held_out = (notebook or {}).get("held_out_test_metrics")
        splits = (notebook or {}).get("splits")

        features = schema.get("features") or []

        response: Dict[str, Any] = {
            "model_version": schema.get("model_version")
            or getattr(model_loader.model, "model_version", "unknown"),
            "model_type": schema.get("model_type", "XGBoost classifier"),
            "feature_count": len(features),
            "features": features,
            "hyperparameters": schema.get("hyperparameters", {}),
            "held_out_test_set": held_out,
            "served_artifact": self._served_artifact_metrics(schema),
            "splits": splits,
            "threshold_sweep": (notebook or {}).get("threshold_sweep"),
            "confidence_bands": {
                "high": 0.7,
                "moderate": 0.4,
                "note": (
                    "Display convention for this prototype, not a tuned cut-off. "
                    "HIGH confidence at or above 0.70, MODERATE at or above 0.40, "
                    "LOW below 0.40, with confidence = 1 - bust probability."
                ),
            },
            "scope": (
                "Rainfall forecast bust detection only. The model estimates the "
                "probability that a medium-range accumulated rainfall forecast will "
                "miss its target by more than its error tolerance. It does not "
                "detect cyclones, temperature errors, pressure errors or any other "
                "forecast variable."
            ),
            "research_only": True,
        }

        if held_out is None:
            response["held_out_test_set"] = None
            response["evaluation_note"] = (
                "The transcribed September 2019 evaluation file is missing, so no "
                "published test-set figures can be shown."
            )

        return response


# Singleton instance
model_service = ModelService()