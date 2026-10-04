"""
Pydantic schemas for verification data.
"""

from pydantic import BaseModel
from typing import Any, Dict, List, Optional


class VerificationResult(BaseModel):
    """Single verification result comparing forecast vs reference."""
    latitude: float
    longitude: float
    lead_hours: int
    forecast_rainfall: float
    reference_rainfall: float
    absolute_error: float
    bust_threshold: float
    bust_status: bool
    day: int


class VerificationArchive(BaseModel):
    """
    Per-location forecast-versus-observation rows.

    Empty with ``available = False`` when no archive is attached. The record
    shape is still returned so an operator knows what to supply.
    """
    available: bool = False
    results: List[VerificationResult] = []
    total_points: int = 0
    bust_count: int = 0
    reliable_count: int = 0
    message: Optional[str] = None
    expected_record_shape: Dict[str, str] = {}
    reference_dataset: Optional[str] = None


class ThresholdSweepRow(BaseModel):
    """One operating point from the notebook's threshold sweep."""
    threshold: float
    precision: float
    recall: float
    f1: float


class ThresholdSweep(BaseModel):
    """Precision, recall and F1 across candidate decision thresholds."""
    label: Optional[str] = None
    note: Optional[str] = None
    rows: List[ThresholdSweepRow] = []


class ConfusionMatrix(BaseModel):
    """Counts of correct and incorrect bust classifications."""
    true_negatives: Optional[int] = None
    false_positives: Optional[int] = None
    false_negatives: Optional[int] = None
    true_positives: Optional[int] = None


class ModelSkill(BaseModel):
    """
    Measured skill of the tuned model on the September 2019 held-out test set.

    Every figure is transcribed from the training notebook's printed output, so
    this is a record of a past evaluation rather than a live computation. The
    ``provenance`` string carries that distinction onto the screen.
    """
    available: bool = False
    label: Optional[str] = None
    provenance: Optional[str] = None
    n_samples: Optional[int] = None
    n_bust: Optional[int] = None
    operating_threshold: Optional[float] = None
    calibration_method: Optional[str] = None
    confusion_matrix: ConfusionMatrix = ConfusionMatrix()
    classification_report: Dict[str, Any] = {}
    roc_auc: Optional[float] = None
    pr_auc: Optional[float] = None
    mcc: Optional[float] = None
    brier_raw: Optional[float] = None
    brier_calibrated: Optional[float] = None
    precision_at_threshold: Optional[float] = None
    recall_at_threshold: Optional[float] = None
    threshold_sweep: Optional[ThresholdSweep] = None
    source_notebook: Optional[str] = None
    source_cells: Optional[List[Any]] = None
    notes: Optional[List[str]] = None
    message: Optional[str] = None


class VerificationResponse(BaseModel):
    """
    Verification response.

    ``model_skill`` is the measured evidence the prototype can show. ``archive``
    holds the per-location comparison rows and reports ``available = false``
    unless a real archive is attached.
    """
    model_skill: ModelSkill = ModelSkill()
    archive: VerificationArchive = VerificationArchive()