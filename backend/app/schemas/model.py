"""
Pydantic schemas for model metadata and evaluation figures.
"""

from typing import Any, Dict, List, Optional

from pydantic import BaseModel


class ConfusionMatrix(BaseModel):
    true_negatives: int
    false_positives: int
    false_negatives: int
    true_positives: int


class ClassificationReport(BaseModel):
    precision: Optional[float] = None
    recall: Optional[float] = None
    f1_score: Optional[float] = None
    accuracy: Optional[float] = None
    macro_precision: Optional[float] = None
    macro_recall: Optional[float] = None
    macro_f1: Optional[float] = None


class HeldOutTestMetrics(BaseModel):
    """Figures from the notebook's own September 2019 evaluation run."""

    label: str
    n_samples: Optional[int] = None
    n_bust: Optional[int] = None
    confusion_matrix: Optional[ConfusionMatrix] = None
    classification_report: Optional[ClassificationReport] = None
    roc_auc: Optional[float] = None
    pr_auc: Optional[float] = None
    mcc: Optional[float] = None
    brier_raw: Optional[float] = None
    brier_calibrated: Optional[float] = None
    calibration_method: Optional[str] = None
    operating_threshold: Optional[float] = None
    source_cells: List[int] = []
    notes: List[str] = []


class ServedArtifactMetrics(BaseModel):
    """What the currently loaded booster measures on its own fitting data."""

    label: str
    n_samples: Optional[int] = None
    roc_auc: Optional[float] = None
    pr_auc: Optional[float] = None
    mcc: Optional[float] = None
    accuracy: Optional[float] = None
    brier_raw: Optional[float] = None
    brier_calibrated: Optional[float] = None
    confusion_matrix: Optional[ConfusionMatrix] = None
    note: str


class ThresholdSweepRow(BaseModel):
    threshold: float
    precision: float
    recall: float
    f1: float


class ThresholdSweep(BaseModel):
    label: str
    note: Optional[str] = None
    rows: List[ThresholdSweepRow]


class ModelSplits(BaseModel):
    train: Optional[str] = None
    validation: Optional[str] = None
    test: Optional[str] = None
    train_rows: Optional[int] = None
    validation_rows: Optional[int] = None
    test_rows: Optional[int] = None


class ModelPerformanceResponse(BaseModel):
    model_version: str
    model_type: str
    feature_count: int
    features: List[str]
    hyperparameters: Dict[str, Any] = {}

    held_out_test_set: Optional[HeldOutTestMetrics] = None
    served_artifact: ServedArtifactMetrics
    splits: Optional[ModelSplits] = None
    threshold_sweep: Optional[ThresholdSweep] = None

    confidence_bands: Dict[str, Any] = {}
    scope: str
    research_only: bool = True
    evaluation_note: Optional[str] = None


class ModelInfoResponse(BaseModel):
    """Identity of the loaded artifact.

    Evaluation figures are deliberately absent. They belong on
    ``/api/model-performance``, where the notebook's held-out test set and the
    deployed booster's own data are reported as two separate things; repeating
    them here would invite them to be read as one number.
    """

    model_version: str
    model_type: str
    feature_count: int
    features: List[str]
    hyperparameters: Dict[str, Any] = {}
    is_ready: bool
    model_loaded: bool = False
    calibration_loaded: bool
    shap_available: bool
    environment: str
    training_period: Optional[str] = None
    validation_period: Optional[str] = None
    test_period: Optional[str] = None