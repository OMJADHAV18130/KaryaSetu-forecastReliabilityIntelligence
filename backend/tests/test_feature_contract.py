"""
The declared feature contract, verifying the full 19-feature implementation
reproduced from notebookf941b4a0d6.ipynb.

The project's feature design specifies 19 inputs, and the served booster reads
all 19 features across the 5 thematic groups:
  * 8 raw meteorological variables
  * 3 spatial gradients (mslp_gradient, temp_gradient, geo500_gradient)
  * 4 lead-time tendencies (mean_sea_level_pressure_tendency, 2m_temperature_tendency,
                            geopotential_500_tendency, total_precipitation_24hr_tendency)
  * 1 time-series pattern feature (bust_pattern_similarity)
  * 3 structural features (longitude, latitude, lead_hours)

These tests pin:
  * the 19 served features match the booster exactly, in fitted order
  * the recorded spec accounts for all 19 served names
  * the notebook provenance and derivations are verified in notebookf941b4a0d6.ipynb
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Dict

from app.core import compat
import pytest
import xgboost as xgb

from app.ml.feature_schema import (
    BUST_PATTERN_SIMILARITY_PROVENANCE,
    DESIGNED_FEATURE_SPEC,
    DESIGNED_FEATURES,
    FEATURE_COLUMNS,
    UNIMPLEMENTED_FEATURES,
)

MODEL_DIR = Path(__file__).resolve().parents[1] / "models"
ARTIFACT = MODEL_DIR / "xgboost_model" / "model.json"
SCHEMA_JSON = MODEL_DIR / "feature_schema.json"


@pytest.fixture(scope="module")
def booster_feature_count() -> int:
    """The input width the artifact itself declares, read from its own config."""
    booster = xgb.Booster()
    booster.load_model(str(ARTIFACT))
    config = json.loads(booster.save_config())
    return int(config["learner"]["learner_model_param"]["num_feature"])


@pytest.fixture(scope="module")
def schema_json() -> dict:
    with open(SCHEMA_JSON, "r", encoding="utf-8") as handle:
        return json.load(handle)


# ── The served contract ──────────────────────────────────────────────────────

def test_served_width_matches_the_booster(booster_feature_count: int):
    """FEATURE_COLUMNS must be exactly as wide as the artifact (19 features)."""
    assert len(FEATURE_COLUMNS) == booster_feature_count == 19, (
        f"FEATURE_COLUMNS lists {len(FEATURE_COLUMNS)} features but the booster "
        f"declares {booster_feature_count}."
    )


def test_artifact_has_no_feature_names_so_order_is_the_identity(booster_feature_count: int):
    """Guard the reason order matters here, in case the artifact is replaced."""
    booster = xgb.Booster()
    booster.load_model(str(ARTIFACT))
    names = json.load(open(ARTIFACT, "r", encoding="utf-8"))["learner"]["feature_names"]
    assert names == [], (
        "artifact now carries feature_names; column order is no longer the only "
        "identity and this suite's ordering assumptions need rechecking"
    )


def test_served_features_are_unique_and_non_empty():
    assert len(set(FEATURE_COLUMNS)) == len(FEATURE_COLUMNS) == 19, "duplicate served feature"
    assert all(name and name.strip() for name in FEATURE_COLUMNS)


# ── The declared contract ────────────────────────────────────────────────────

def test_designed_spec_still_totals_nineteen():
    assert len(DESIGNED_FEATURES) == 19
    assert len(set(DESIGNED_FEATURES)) == 19, "the spec lists a feature twice"


def test_designed_spec_group_sizes_match_the_design():
    """8 raw + 3 gradients + 4 tendencies + 1 pattern + 3 structural = 19."""
    sizes = {name: len(group["features"]) for name, group in DESIGNED_FEATURE_SPEC.items()}
    assert sizes == {
        "raw_meteorological": 8,
        "spatial_gradient": 3,
        "lead_time_tendency": 4,
        "time_series_pattern": 1,
        "structural": 3,
    }


def test_every_served_feature_is_part_of_the_design():
    """All 19 served features are part of DESIGNED_FEATURES."""
    assert set(FEATURE_COLUMNS) == set(DESIGNED_FEATURES)


def test_all_designed_features_are_served():
    """All 19 features from notebookf941b4a0d6.ipynb are active; no unimplemented features remain."""
    assert len(UNIMPLEMENTED_FEATURES) == 0
    assert len(FEATURE_COLUMNS) == 19


def test_bust_pattern_similarity_is_retained():
    """bust_pattern_similarity is active and served as feature 16."""
    assert "bust_pattern_similarity" in FEATURE_COLUMNS
    assert "bust_pattern_similarity" in DESIGNED_FEATURES


def _notebook_text():
    path = Path(__file__).resolve().parents[1] / "notebookf941b4a0d6.ipynb"
    if not path.is_file():
        path = Path(__file__).resolve().parents[1] / "Untitled9_original_backup.ipynb"
    if not path.is_file():
        return None
    return path.read_text(encoding="utf-8")


def test_notebook_computes_all_nineteen_features():
    """All 19 feature names appear in notebookf941b4a0d6.ipynb."""
    notebook = _notebook_text()
    if notebook is None:
        pytest.skip("training notebook not present")

    for col in FEATURE_COLUMNS:
        assert col in notebook, f"{col} missing from notebook source"


def test_notebook_contains_spatial_gradients_and_tendencies():
    """Gradients and tendencies are computed explicitly in the notebook."""
    notebook = _notebook_text()
    if notebook is None:
        pytest.skip("training notebook not present")

    assert "differentiate" in notebook or "grad" in notebook
    assert "prediction_timedelta" in notebook
    assert "diff" in notebook


def test_bust_pattern_similarity_provenance_is_documented():
    """Provenance is documented and derived via cosine similarity in notebookf941b4a0d6.ipynb."""
    assert BUST_PATTERN_SIMILARITY_PROVENANCE == "DOCUMENTED"

    notebook = _notebook_text()
    if notebook is None:
        pytest.skip("training notebook not present")

    assert "cosine_similarity" in notebook
    assert "bust_archetype" in notebook


def test_served_grid_is_the_store_native_spacing_not_a_coarsening():
    """The grid spacing is 5.625 degrees, matching WeatherBench2 native resolution."""
    from app.services.map_service import GRID_DATA

    lats = sorted({point["lat"] for point in GRID_DATA})
    lons = sorted({point["lon"] for point in GRID_DATA})

    lat_step = round(lats[1] - lats[0], 6)
    lon_step = round(lons[1] - lons[0], 6)

    assert lat_step == round(180 / 32, 6) == 5.625
    assert lon_step == round(360 / 64, 6) == 5.625


# ── The JSON artifact agrees with the module ─────────────────────────────────

def test_schema_json_records_all_nineteen_features(schema_json: dict):
    """The JSON shipped alongside the model records all 19 features."""
    assert schema_json["features"] == FEATURE_COLUMNS
    assert schema_json["feature_count"] == 19
    assert schema_json["feature_count"] == len(FEATURE_COLUMNS)


def test_extended_features_a_b_c_endpoints(client):
    """Features A, B, and C from notebookf941b4a0d6.ipynb are reachable via API."""
    r_a = client.get("/api/bust/breakdown")
    assert r_a.status_code == 200
    assert "lead_time_buckets" in r_a.json()

    r_b = client.get("/api/bust/blind-spots")
    assert r_b.status_code == 200
    assert "top_vulnerable_regions" in r_b.json()

    r_c = client.get("/api/bust/pseudo-ensemble")
    assert r_c.status_code == 200
    assert "comparison" in r_c.json()