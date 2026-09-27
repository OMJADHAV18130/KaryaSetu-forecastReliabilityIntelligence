"""
ModelLoader — Loads the trained XGBoost model, calibrator, and SHAP background data.
Loads once at startup. Does NOT retrain on every request.
"""

import json
import logging
import os
from pathlib import Path
from typing import Optional, Dict, Any

import joblib
import numpy as np
import xgboost as xgb

from ..core.config import (
    MODEL_PATH,
    CALIBRATOR_PATH,
    SHAP_BACKGROUND_PATH,
    FEATURE_SCHEMA_PATH,
)

# Ensure scikit-learn 1.6+ compatibility with XGBoost
if not hasattr(xgb.XGBClassifier, "_estimator_type"):
    xgb.XGBClassifier._estimator_type = "classifier"

logger = logging.getLogger("karyasetu")


class ModelLoader:
    """
    Singleton model loader that loads all ML artifacts once at startup.

    Attributes:
        model: Trained XGBClassifier
        calibrator: CalibratedClassifierCV with sigmoid calibration
        shap_background: Background data for SHAP explainer
        feature_schema: Model metadata and metrics
        model_loaded: Whether the model was loaded successfully
        calibration_loaded: Whether the calibrator was loaded successfully
    """

    _instance: Optional["ModelLoader"] = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return

        self.model: Optional[xgb.XGBClassifier] = None
        self.calibrator = None
        self.shap_background: Optional[np.ndarray] = None
        self.feature_schema: Optional[Dict[str, Any]] = None
        self.model_loaded: bool = False
        self.calibration_loaded: bool = False
        self.shap_background_loaded: bool = False
        self.model_version: str = "unknown"

        self._load_all()
        self._initialized = True

    def _load_all(self):
        """Load all model artifacts."""
        self._load_model()
        self._load_calibrator()
        self._load_shap_background()
        self._load_feature_schema()

    def _load_model(self):
        """Load the XGBoost model from JSON."""
        try:
            if os.path.exists(MODEL_PATH):
                self.model = xgb.XGBClassifier()
                self.model.load_model(MODEL_PATH)
                if not hasattr(self.model, "n_classes_") or self.model.n_classes_ is None:
                    self.model.n_classes_ = 2
                self.model_loaded = True
                logger.info(f"Model loaded from {MODEL_PATH}")
            else:
                logger.warning(f"Model file not found: {MODEL_PATH}")
                self.model_loaded = False
        except Exception as e:
            logger.error(f"Failed to load model: {e}")
            self.model_loaded = False

    def _load_calibrator(self):
        """Load the sigmoid calibrator."""
        try:
            if os.path.exists(CALIBRATOR_PATH):
                self.calibrator = joblib.load(CALIBRATOR_PATH)
                self.calibration_loaded = True
                logger.info(f"Calibrator loaded from {CALIBRATOR_PATH}")
            else:
                logger.warning(f"Calibrator file not found: {CALIBRATOR_PATH}")
                self.calibration_loaded = False
        except Exception as e:
            logger.error(f"Failed to load calibrator: {e}")
            self.calibration_loaded = False

    def _load_shap_background(self):
        """Load SHAP background data."""
        try:
            if os.path.exists(SHAP_BACKGROUND_PATH):
                self.shap_background = joblib.load(SHAP_BACKGROUND_PATH)
                self.shap_background_loaded = True
                logger.info(f"SHAP background loaded from {SHAP_BACKGROUND_PATH}")
            else:
                logger.warning(f"SHAP background not found: {SHAP_BACKGROUND_PATH}")
                self.shap_background_loaded = False
        except Exception as e:
            logger.error(f"Failed to load SHAP background: {e}")
            self.shap_background_loaded = False

    def _load_feature_schema(self):
        """Load feature schema and model metadata."""
        try:
            if os.path.exists(FEATURE_SCHEMA_PATH):
                with open(FEATURE_SCHEMA_PATH, "r") as f:
                    self.feature_schema = json.load(f)
                self.model_version = self.feature_schema.get("model_version", "unknown")
                logger.info(f"Feature schema loaded (version: {self.model_version})")
            else:
                logger.warning(f"Feature schema not found: {FEATURE_SCHEMA_PATH}")
                self.feature_schema = None
        except Exception as e:
            logger.error(f"Failed to load feature schema: {e}")
            self.feature_schema = None

    @property
    def is_ready(self) -> bool:
        """Check if model and calibrator are loaded."""
        return self.model_loaded and self.calibration_loaded

    @property
    def metadata(self) -> Dict[str, Any]:
        """Return model metadata."""
        if self.feature_schema:
            return self.feature_schema
        return {
            "model_version": "unavailable",
            "model_type": "XGBoost + Sigmoid Calibration",
            "training_period": "June-July 2019",
            "validation_period": "August 2019",
            "test_period": "September 2019",
        }


# Global instance
model_loader = ModelLoader()
