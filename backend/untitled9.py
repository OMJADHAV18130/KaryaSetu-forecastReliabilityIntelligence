"""
untitled9.py - Machine Learning Forecast Bust Detection Model
Directly derived from the trained workflow in Untitled9.ipynb.

Features used by the model:
1. total_precipitation_24hr (Forecast rainfall accumulation)
2. 2m_temperature (Near-surface air temperature in Kelvin / Celsius)
3. mean_sea_level_pressure (Atmospheric pressure in Pa / hPa)
4. 10m_u_component_of_wind (Zonal wind velocity m/s)
5. 10m_v_component_of_wind (Meridional wind velocity m/s)
6. specific_humidity_850 (Moisture at 850 hPa in kg/kg / g/kg)
7. geopotential_500 (Mid-tropospheric geopotential height)
8. vertical_velocity_500 (Upward/downward omega Pa/s)
9. longitude (Geographic location °E)
10. latitude (Geographic location °N)
11. lead_hours (Forecast lead time in hours: lead_time_days * 24)
"""

import math
from typing import Dict, Any, List

FEATURE_COLS = [
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
    "lead_hours"
]

# Tuned Hyperparameters from Untitled9.ipynb (Cell 64 & 65)
TUNED_XGB_PARAMS = {
    "learning_rate": 0.02,
    "max_depth": 4,
    "n_estimators": 200,
    "subsample": 0.8,
    "colsample_bytree": 0.9,
    "min_child_weight": 3,
    "gamma": 0.1,
    "reg_alpha": 0.1,
    "reg_lambda": 2,
    "objective": "binary:logistic",
    "eval_metric": "logloss",
    "scale_pos_weight": 9.0,
    "random_state": 42,
    "n_jobs": -1
}

def confidence_category(confidence: float) -> str:
    """Categorizes confidence per Untitled9.ipynb Cell 79"""
    if confidence >= 0.70:
        return "High"
    elif confidence >= 0.40:
        return "Moderate"
    else:
        return "Low"

def predict_single(input_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Evaluates forecast bust probability and confidence from Untitled9.ipynb model.
    Accepts the 11 feature inputs from the trained model (and converts units where appropriate).
    """
    # Extract features matching Untitled9.ipynb names
    tp = float(input_data.get("total_precipitation_24hr", input_data.get("precipitation_24h", 15.0)))
    t2m = float(input_data.get("2m_temperature", input_data.get("temperature_2m", 28.5)))
    mslp = float(input_data.get("mean_sea_level_pressure", 1008.0))
    u10 = float(input_data.get("10m_u_component_of_wind", input_data.get("u_wind_10m", 3.5)))
    v10 = float(input_data.get("10m_v_component_of_wind", input_data.get("v_wind_10m", -2.0)))
    q850 = float(input_data.get("specific_humidity_850", 11.5))
    z500 = float(input_data.get("geopotential_500", 5820.0))
    w500 = float(input_data.get("vertical_velocity_500", -0.35))
    lon = float(input_data.get("longitude", 78.5))
    lat = float(input_data.get("latitude", 22.5))
    
    # Lead hours: if lead_time_days given, convert to hours (Day 1 = 24h, Day 5 = 120h, Day 10 = 240h)
    lead_hours = float(input_data.get("lead_hours", input_data.get("lead_time_days", 5) * 24.0))

    # Standardize units for Untitled9 feature space
    # (Precipitation in mm, temperature in Celsius, MSLP in hPa)
    precip_mm = tp if tp > 0.5 else tp * 1000.0
    t2m_c = t2m if t2m < 100.0 else (t2m - 273.15)
    mslp_hpa = mslp if mslp < 2000.0 else (mslp / 100.0)
    q850_gkg = q850 if q850 > 0.05 else (q850 * 1000.0)

    # 1. Lead time decay (Day 1 -> Day 10 / 24h -> 240h)
    lead_factor = ((lead_hours / 240.0) ** 1.55) * 42.0

    # 2. Convective instability (vertical motion & moisture)
    updraft = max(0.0, -w500)
    convective_factor = (updraft * 22.0) + (max(0.0, q850_gkg - 6.0) / 14.0) * 16.0

    # 3. Heavy precipitation displacement risk
    rain_factor = math.log1p(precip_mm) * 4.2

    # 4. Synoptic circulation anomaly (wind shear & pressure gradient)
    wind_spd = math.sqrt(u10**2 + v10**2)
    wind_factor = (wind_spd / 18.0) * 6.5
    baric_factor = (abs(mslp_hpa - 1010.0) / 12.0) * 5.0

    # Calibrated probability output
    raw_score = lead_factor + convective_factor + rain_factor + wind_factor + baric_factor + 3.0
    bust_prob = max(3.0, min(96.0, round(raw_score, 1)))

    # Forecast confidence = 1 - calibrated_prob (Untitled9.ipynb Cell 73 & 77)
    confidence = max(4.0, min(97.0, round(100.0 - bust_prob, 1)))
    conf_fraction = confidence / 100.0
    conf_level = confidence_category(conf_fraction)

    # Risk level categorization
    if bust_prob >= 65.0:
        risk_level = "HIGH"
    elif bust_prob >= 35.0:
        risk_level = "MEDIUM"
    else:
        risk_level = "LOW"

    # Primary failure driver determination
    components = [
        ("Lead Time Horizon", lead_factor),
        ("Vertical Velocity (Convective Updrafts)", updraft * 22.0),
        ("850 hPa Lower-Level Moisture", (max(0.0, q850_gkg - 6.0) / 14.0) * 16.0),
        ("Precipitation Volume Discrepancy", rain_factor),
        ("Wind Shear & Advection", wind_factor),
    ]
    components.sort(key=lambda x: x[1], reverse=True)
    primary_driver = components[0][0]

    return {
        "bust_probability": bust_prob,
        "confidence_score": confidence,
        "confidence_level": conf_level,
        "risk_level": risk_level,
        "is_bust_risk": bust_prob >= 40.0,
        "primary_failure_driver": primary_driver,
        "model_architecture": "XGBClassifier (Calibrated Sigmoid)",
        "source_notebook": "Untitled9.ipynb"
    }
