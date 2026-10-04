"""
The declared feature contract, and the gap between it and what is served.

The project's feature design specifies 19 inputs. The served booster reads 12.
Seven of the specified features have no weight in the artifact and cannot be
served. That gap is recorded deliberately rather than papered over, so these
tests pin three things:

  * the 12 served features still match the booster exactly, in fitted order
  * the recorded spec still says 19, and still accounts for all 12 served names
  * the 7 unserved names are still named, so the shortfall stays visible

The last one is the point. The dangerous failure here is silent: a booster with
an empty ``feature_names`` list cannot detect a wrong or reordered feature
vector, so a drift in this file would corrupt every prediction rather than
raise.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest
import xgboost as xgb

from app.ml.feature_schema import (
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
    """FEATURE_COLUMNS must be exactly as wide as the artifact, not wider.

    This is the assertion that would have caught declaring 19 features: the
    booster raises on a 19-column input, so a 19-name list here is a runtime
    failure waiting for the first prediction.
    """
    assert len(FEATURE_COLUMNS) == booster_feature_count, (
        f"FEATURE_COLUMNS lists {len(FEATURE_COLUMNS)} features but the booster "
        f"declares {booster_feature_count}. A feature vector built from this "
        f"list would be rejected at inference time."
    )


def test_artifact_has_no_feature_names_so_order_is_the_identity(booster_feature_count: int):
    """Guard the reason order matters here, in case the artifact is replaced.

    The current artifact stores an empty ``feature_names``, so a column's
    position is the only thing binding it to a weight. If a future artifact
    carries real names, order stops being load-bearing and this test should be
    revisited rather than left to pass by accident.
    """
    booster = xgb.Booster()
    booster.load_model(str(ARTIFACT))
    names = json.load(open(ARTIFACT, "r", encoding="utf-8"))["learner"]["feature_names"]
    assert names == [], (
        "artifact now carries feature_names; column order is no longer the only "
        "identity and this suite's ordering assumptions need rechecking"
    )


def test_served_features_are_unique_and_non_empty():
    assert len(set(FEATURE_COLUMNS)) == len(FEATURE_COLUMNS), "duplicate served feature"
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
    """The design is a superset. A served name outside it would mean the
    artifact had been retrained on something the design does not describe."""
    assert set(FEATURE_COLUMNS) <= set(DESIGNED_FEATURES)


def test_bust_pattern_similarity_is_retained():
    """It is specified, and it is the second most influential input by mean
    absolute SHAP, so dropping it to reach the notebook's 11 would remove a
    feature the served model genuinely uses."""
    assert "bust_pattern_similarity" in FEATURE_COLUMNS
    assert "bust_pattern_similarity" in DESIGNED_FEATURES
    assert "bust_pattern_similarity" not in {f["name"] for f in UNIMPLEMENTED_FEATURES}


# ── The gap, kept visible ────────────────────────────────────────────────────

def test_unimplemented_features_are_named_and_account_for_the_whole_gap():
    """12 served + 7 unserved = 19, with no feature unaccounted for.

    Written as an arithmetic identity on purpose. If someone adds a feature to
    the design without deciding whether it is served, or removes one from the
    booster without updating the spec, the two sides stop summing to 19 and
    this fails.
    """
    unserved = {f["name"] for f in UNIMPLEMENTED_FEATURES}
    assert len(unserved) == 7
    assert len(FEATURE_COLUMNS) == 12
    assert len(unserved) + len(FEATURE_COLUMNS) == len(DESIGNED_FEATURES) == 19

    # Exactly the two groups that are not served, and nothing else.
    expected = set(DESIGNED_FEATURE_SPEC["spatial_gradient"]["features"]) | set(
        DESIGNED_FEATURE_SPEC["lead_time_tendency"]["features"]
    )
    assert unserved == expected
    assert not (unserved & set(FEATURE_COLUMNS)), "a feature is both served and unserved"


def test_unserved_features_really_are_absent_from_the_notebook():
    """The 7 names appear nowhere in the training notebook.

    If this ever fails, the notebook has been updated to compute them and the
    refit path is worth revisiting.
    """
    notebook = Path(__file__).resolve().parents[1] / "Untitled9_original_backup.ipynb"
    if not notebook.is_file():
        pytest.skip("training notebook not present")

    raw = notebook.read_text(encoding="utf-8")
    for feature in UNIMPLEMENTED_FEATURES:
        assert feature["name"] not in raw, (
            f"{feature['name']} now appears in the notebook; the recorded "
            f"shortfall may be out of date"
        )


# ── The JSON artifact agrees with the module ─────────────────────────────────

def test_schema_json_records_the_same_shortfall(schema_json: dict):
    """The JSON shipped alongside the model must not understate the gap."""
    assert schema_json["features"] == FEATURE_COLUMNS
    assert schema_json["feature_count"] == len(FEATURE_COLUMNS)

    spec = schema_json["designed_feature_spec"]
    assert spec["total_count"] == 19

    flattened = [
        name
        for group, body in spec.items()
        if isinstance(body, dict) and "features" in body
        for name in body["features"]
    ]
    assert len(flattened) == 19
    assert set(flattened) == set(DESIGNED_FEATURES)

    unimplemented = schema_json["unimplemented_features"]
    assert unimplemented["count"] == 7
    assert set(unimplemented["names"]) == {f["name"] for f in UNIMPLEMENTED_FEATURES}
    assert not (set(unimplemented["names"]) & set(FEATURE_COLUMNS))


def test_schema_json_explains_why_the_gap_exists(schema_json: dict):
    """The reason has to travel with the record, or it reads as an oversight."""
    note = schema_json["unimplemented_features"]["_note"]
    assert "num_feature" in note
    assert "refit" in note