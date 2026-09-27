"""
Pydantic schemas for model metadata and performance.
"""

from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List


class ModelPerformance(BaseModel):
    """Model performance metrics."""
    model_config = {"protected_namespaces": ()}

    model_name: str = "Forecast Bust Detector"
    model_type: str = "XGBoost + Sigmoid Calibration"
    test_period: str = "September 2019"
    roc_auc: float = 0.8912
    pr_auc: float = 0.4428
    mcc: float = 0.4285
    mcc_optimal: float = 0.4682
    optimal_threshold: float = 0.70
    precision: float = 0.3174
    recall: float = 0.7148
    f1: float = 0.4396
    accuracy: float = 0.8901
    brier_raw: float = 0.1060
    brier_calibrated: float = 0.0466
    model_version: str = "xgb-rainfall-bust-v2"
    training_period: str = "June-July 2019"
    validation_period: str = "August 2019"
    features: List[str] = [
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
    ]
    confusion_matrix: Optional[Dict[str, int]] = {
        "true_negatives": 56412,
        "false_positives": 6173,
        "false_negatives": 1145,
        "true_positives": 2870,
    }


class HealthStatus(BaseModel):
    """Health check response."""
    status: str = "ok"
    model_loaded: bool
    calibration_loaded: bool
    environment: str = "research"
