import math
from typing import List, Dict, Any
from .schemas import WeatherFeatures, PredictionResponse, FeatureContribution, FeatureMeta

FEATURE_METADATA: List[FeatureMeta] = [
    FeatureMeta(
        key="precipitation_24h",
        name="24-hour Precipitation",
        category="Moisture & Hydrology",
        unit="mm",
        description="Forecast rainfall amount over a 24-hour accumulation window",
        min_val=0.0,
        max_val=300.0,
        default_val=15.0
    ),
    FeatureMeta(
        key="temperature_2m",
        name="2m Temperature",
        category="Surface Dynamics",
        unit="°C",
        description="Near-surface atmospheric air temperature at 2 meters above ground",
        min_val=-15.0,
        max_val=48.0,
        default_val=28.5
    ),
    FeatureMeta(
        key="mean_sea_level_pressure",
        name="Mean Sea-Level Pressure",
        category="Baric Structure",
        unit="hPa",
        description="Atmospheric surface pressure adjusted to sea-level datum",
        min_val=980.0,
        max_val=1035.0,
        default_val=1008.0
    ),
    FeatureMeta(
        key="u_wind_10m",
        name="10m U-Wind",
        category="Kinematics",
        unit="m/s",
        description="Zonal (east–west) wind velocity component at 10 meters",
        min_val=-40.0,
        max_val=40.0,
        default_val=3.5
    ),
    FeatureMeta(
        key="v_wind_10m",
        name="10m V-Wind",
        category="Kinematics",
        unit="m/s",
        description="Meridional (north–south) wind velocity component at 10 meters",
        min_val=-40.0,
        max_val=40.0,
        default_val=-2.0
    ),
    FeatureMeta(
        key="specific_humidity_850",
        name="Specific Humidity at 850 hPa",
        category="Moisture & Hydrology",
        unit="g/kg",
        description="Mass fraction of water vapor in lower troposphere at 850 hPa",
        min_val=1.0,
        max_val=22.0,
        default_val=11.5
    ),
    FeatureMeta(
        key="geopotential_500",
        name="Geopotential at 500 hPa",
        category="Synoptic Circulation",
        unit="gpm",
        description="Geopotential height / mid-tropospheric large-scale steering flow",
        min_val=5200.0,
        max_val=5950.0,
        default_val=5820.0
    ),
    FeatureMeta(
        key="vertical_velocity_500",
        name="Vertical Velocity at 500 hPa",
        category="Convective Dynamics",
        unit="Pa/s",
        description="Upward (negative omega) or downward (positive) air motion",
        min_val=-2.5,
        max_val=2.5,
        default_val=-0.35
    ),
    FeatureMeta(
        key="latitude",
        name="Latitude",
        category="Geographic Location",
        unit="°N",
        description="Station or grid-point geographic north coordinate",
        min_val=6.5,
        max_val=37.5,
        default_val=22.5
    ),
    FeatureMeta(
        key="longitude",
        name="Longitude",
        category="Geographic Location",
        unit="°E",
        description="Station or grid-point geographic east coordinate",
        min_val=68.0,
        max_val=97.5,
        default_val=78.5
    ),
    FeatureMeta(
        key="lead_time_days",
        name="Lead Time",
        category="Forecast Horizon",
        unit="Days",
        description="How far ahead the forecast is generated (Day 1 to Day 10)",
        min_val=1.0,
        max_val=10.0,
        default_val=5.0
    ),
    FeatureMeta(
        key="ensemble_spread",
        name="Ensemble Spread",
        category="Model Uncertainty",
        unit="Index",
        description="Dispersion/variance across numerical ensemble forecast members",
        min_val=0.5,
        max_val=25.0,
        default_val=5.2
    ),
    FeatureMeta(
        key="cape",
        name="CAPE (Convective Energy)",
        category="Thermodynamic Instability",
        unit="J/kg",
        description="Convective Available Potential Energy for thunderstorm / deep convection potential",
        min_val=0.0,
        max_val=4500.0,
        default_val=1250.0
    ),
]


def predict_bust_risk(feat: WeatherFeatures, threshold: float = 40.0) -> PredictionResponse:
    """
    ML Bust-Risk & Reliability Inference Engine for Medium-Range Forecasts.
    Evaluates non-linear atmospheric instability, ensemble spread, and lead time decay.
    """
    # 1. Lead time decay: error growth follows non-linear atmospheric chaos dynamics
    # Day 1: base risk ~5%, Day 5: ~35%, Day 10: ~70%
    lead_effect = 4.0 + (feat.lead_time_days ** 1.6) * 1.8

    # 2. Convective / Vertical velocity & moisture coupling
    # Strong updraft (negative vertical velocity Pa/s) combined with high lower-tropospheric moisture
    updraft_intensity = max(0.0, -feat.vertical_velocity_500)  # Pa/s upward
    moisture_factor = max(0.0, feat.specific_humidity_850 - 6.0) / 10.0
    convective_risk = (updraft_intensity * 14.0) + (moisture_factor * 10.0)

    # 3. High precipitation bust propensity (heavy rainfall exhibits highest NWP displacement errors)
    precip_risk = math.log1p(feat.precipitation_24h) * 3.5

    # 4. CAPE thermodynamic instability
    cape_risk = (feat.cape / 1000.0) * 4.5

    # 5. Ensemble spread divergence
    spread_risk = feat.ensemble_spread * 2.8

    # 6. Synoptic anomalies (pressure & wind shear)
    wind_speed = math.sqrt(feat.u_wind_10m**2 + feat.v_wind_10m**2)
    wind_risk = (wind_speed / 15.0) * 3.0
    
    mslp_anomaly = abs(feat.mean_sea_level_pressure - 1012.0)
    synoptic_risk = (mslp_anomaly / 10.0) * 3.2

    # Total raw bust risk score
    raw_bust = lead_effect + convective_risk + precip_risk + cape_risk + spread_risk + wind_risk + synoptic_risk
    bust_prob = max(3.0, min(97.0, round(raw_bust, 1)))

    # Overall reliability / confidence is inverse to bust probability with lead time damping
    confidence = max(5.0, min(98.0, round(100.0 - (bust_prob * 0.92) - (feat.lead_time_days * 1.5), 1)))

    # Determine risk level
    if bust_prob >= 70.0:
        risk_level = "CRITICAL"
    elif bust_prob >= 50.0:
        risk_level = "HIGH"
    elif bust_prob >= 30.0:
        risk_level = "MEDIUM"
    else:
        risk_level = "LOW"

    # Identify primary failure driver
    drivers = [
        ("Lead Time Horizon (Day " + str(feat.lead_time_days) + ")", lead_effect),
        ("Vertical Velocity & Convective Updrafts", updraft_intensity * 14.0),
        ("850 hPa Moisture Saturation", moisture_factor * 10.0),
        ("Ensemble Member Spread", spread_risk),
        ("Precipitation Volume Discrepancy", precip_risk),
        ("Thermodynamic Instability (CAPE)", cape_risk),
    ]
    drivers.sort(key=lambda x: x[1], reverse=True)
    primary_driver = drivers[0][0]

    # Attribution breakdown for the 13 features
    contributions: List[FeatureContribution] = [
        FeatureContribution(
            feature_name="lead_time_days",
            feature_label="Lead Time",
            feature_value=float(feat.lead_time_days),
            unit="Days",
            impact_score=round(min(1.0, lead_effect / 35.0), 2),
            description=f"Day {feat.lead_time_days} forecast horizon introduces intrinsic chaotic error growth."
        ),
        FeatureContribution(
            feature_name="vertical_velocity_500",
            feature_label="Vertical Velocity (500 hPa)",
            feature_value=feat.vertical_velocity_500,
            unit="Pa/s",
            impact_score=round(min(1.0, (updraft_intensity * 14.0) / 20.0), 2),
            description="Upward vertical motion indicates strong mesoscale convection prone to location busts."
        ),
        FeatureContribution(
            feature_name="specific_humidity_850",
            feature_label="Specific Humidity (850 hPa)",
            feature_value=feat.specific_humidity_850,
            unit="g/kg",
            impact_score=round(min(1.0, (moisture_factor * 10.0) / 15.0), 2),
            description="High boundary layer moisture content accelerates condensation uncertainty."
        ),
        FeatureContribution(
            feature_name="precipitation_24h",
            feature_label="24h Precipitation",
            feature_value=feat.precipitation_24h,
            unit="mm",
            impact_score=round(min(1.0, precip_risk / 18.0), 2),
            description="High accumulation forecasts frequently suffer from sub-grid parameterization bias."
        ),
        FeatureContribution(
            feature_name="ensemble_spread",
            feature_label="Ensemble Spread",
            feature_value=feat.ensemble_spread,
            unit="Index",
            impact_score=round(min(1.0, spread_risk / 20.0), 2),
            description="Divergence among ensemble members points to multiple bifurcated atmospheric states."
        ),
        FeatureContribution(
            feature_name="cape",
            feature_label="CAPE (Instability)",
            feature_value=feat.cape,
            unit="J/kg",
            impact_score=round(min(1.0, cape_risk / 15.0), 2),
            description="Elevated CAPE elevates localized storm triggering that deterministic NWP misses."
        ),
        FeatureContribution(
            feature_name="mean_sea_level_pressure",
            feature_label="MSLP",
            feature_value=feat.mean_sea_level_pressure,
            unit="hPa",
            impact_score=round(min(1.0, synoptic_risk / 12.0), 2),
            description="Baric depression gradient indicates active low pressure / synoptic troughing."
        ),
        FeatureContribution(
            feature_name="u_wind_10m",
            feature_label="10m U-Wind",
            feature_value=feat.u_wind_10m,
            unit="m/s",
            impact_score=round(min(1.0, abs(feat.u_wind_10m) / 30.0), 2),
            description="Zonal wind shear component influencing advection trajectory."
        ),
        FeatureContribution(
            feature_name="v_wind_10m",
            feature_label="10m V-Wind",
            feature_value=feat.v_wind_10m,
            unit="m/s",
            impact_score=round(min(1.0, abs(feat.v_wind_10m) / 30.0), 2),
            description="Meridional wind component driving moisture transport from Arabian Sea/Bay of Bengal."
        ),
        FeatureContribution(
            feature_name="temperature_2m",
            feature_label="2m Temperature",
            feature_value=feat.temperature_2m,
            unit="°C",
            impact_score=round(min(1.0, abs(feat.temperature_2m - 25.0) / 25.0), 2),
            description="Near-surface thermal forcing affecting boundary-layer mixing."
        ),
        FeatureContribution(
            feature_name="geopotential_500",
            feature_label="Geopotential (500 hPa)",
            feature_value=feat.geopotential_500,
            unit="gpm",
            impact_score=round(min(1.0, abs(feat.geopotential_500 - 5820.0) / 300.0), 2),
            description="Mid-troposphere steering flow height dictating synoptic disturbance tracks."
        ),
        FeatureContribution(
            feature_name="latitude",
            feature_label="Latitude",
            feature_value=feat.latitude,
            unit="°N",
            impact_score=0.1,
            description="Subtropical vs tropical zone dynamics across the Indian subcontinent."
        ),
        FeatureContribution(
            feature_name="longitude",
            feature_label="Longitude",
            feature_value=feat.longitude,
            unit="°E",
            impact_score=0.1,
            description="Maritime (coastal peninsular) vs continental interior sensitivity."
        ),
    ]

    # Generate meteorological explanation text
    if bust_prob >= 60.0:
        explanation = (
            f"HIGH BUST RISK ({bust_prob}%): Model reliability deteriorates primarily due to "
            f"{primary_driver.lower()} at Day {feat.lead_time_days} lead time. "
            f"Forecasted rainfall of {feat.precipitation_24h} mm coupled with vertical motion of "
            f"{feat.vertical_velocity_500} Pa/s and specific humidity {feat.specific_humidity_850} g/kg "
            f"indicates strong sub-grid convection where numerical NWP is prone to spatial displacement."
        )
    elif bust_prob >= 35.0:
        explanation = (
            f"MODERATE BUST RISK ({bust_prob}%): Moderate forecast reliability. Lead time of {feat.lead_time_days} days "
            f"shows normal error accumulation. Key watch factor is {primary_driver.lower()}."
        )
    else:
        explanation = (
            f"LOW BUST RISK ({bust_prob}%): High model confidence ({confidence}%). Synoptic circulation "
            f"is stable with low ensemble spread ({feat.ensemble_spread}) and manageable convective forcing."
        )

    return PredictionResponse(
        bust_probability=bust_prob,
        confidence_score=confidence,
        risk_level=risk_level,
        is_bust_risk=bust_prob >= threshold,
        primary_failure_driver=primary_driver,
        summary_explanation=explanation,
        feature_contributions=contributions,
    )
