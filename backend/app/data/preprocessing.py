"""
Data preprocessing pipeline.
Reproduces the exact preprocessing from Untitled9.ipynb.
"""

import numpy as np
import pandas as pd
from typing import Tuple, Dict, Any


def compute_bust_labels(
    forecast_rainfall: np.ndarray,
    reference_rainfall: np.ndarray,
    train_mask: np.ndarray,
) -> np.ndarray:
    """
    Compute BUST/NO-BUST labels based on 90th percentile error threshold.

    The threshold is calculated ONLY from the training period (June-July 2019).

    Args:
        forecast_rainfall: HRES forecast rainfall (mm)
        reference_rainfall: ERA5 reference rainfall (mm)
        train_mask: Boolean mask for training period

    Returns:
        Boolean array: True = BUST, False = NO BUST
    """
    # Absolute error
    error = np.abs(forecast_rainfall - reference_rainfall)

    # Compute P90 threshold from training data only
    train_error = error[train_mask]
    p90_threshold = np.percentile(train_error, 90)

    # Label: error > P90 threshold
    bust_labels = error > p90_threshold

    return bust_labels


def create_features_from_xarray(ds) -> pd.DataFrame:
    """
    Convert xarray Dataset to flat feature DataFrame.

    Selects the 11 model features in the exact order required by the model.
    """
    feature_cols = [
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
    ]

    df = ds[feature_cols].to_dataframe().reset_index()
    return df


def normalize_units(df: pd.DataFrame) -> pd.DataFrame:
    """
    Normalize units to match model training data.
    - Precipitation: m (from meters)
    - Pressure: Pa (from Pa)
    - Temperature: K (from Kelvin)
    """
    df = df.copy()
    # Precipitation is already in meters in WeatherBench2
    # Pressure is already in Pa in WeatherBench2
    # Temperature is already in K in WeatherBench2
    return df
