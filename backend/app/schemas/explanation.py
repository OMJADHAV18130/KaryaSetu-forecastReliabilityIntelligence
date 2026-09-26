"""
Pydantic schemas for SHAP explanations.
"""

from pydantic import BaseModel, Field
from typing import List, Literal


class ShapFeature(BaseModel):
    """Single feature's SHAP contribution."""
    feature: str
    value: float
    shap_value: float
    direction: Literal["increases_bust_risk", "decreases_bust_risk"]
    rank: int = 0


class LocalExplanationResponse(BaseModel):
    """Response for local (single prediction) explanation."""
    features: List[ShapFeature]
    bust_probability: float
    confidence: float


class GlobalExplanationResponse(BaseModel):
    """Response for global feature importance."""
    features: List[ShapFeature]
    model_version: str
