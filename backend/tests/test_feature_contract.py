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
from typing import Dict

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
    notebook = _notebook_text()
    if notebook is None:
        pytest.skip("training notebook not present")

    for feature in UNIMPLEMENTED_FEATURES:
        assert feature["name"] not in notebook, (
            f"{feature['name']} now appears in the notebook; the recorded "
            f"shortfall may be out of date"
        )


def _notebook_text():
    path = Path(__file__).resolve().parents[1] / "Untitled9_original_backup.ipynb"
    if not path.is_file():
        return None
    return path.read_text(encoding="utf-8")


# ── Why the two unserved groups are blocked, verified not assumed ────────────

def test_tendencies_are_degenerate_in_the_served_app():
    """A lead-time tendency would be identically zero here, not merely unknown.

    A tendency is a difference between two forecast cycles. A meteorology
    profile holds one scalar per variable per cell and does not vary with lead
    day, so differencing across days returns 0.0 for every variable at every
    coordinate. XGBoost never splits on a constant, so this is not a feature
    awaiting a value - it is a column that could only ever be dead weight while
    reading as a plausible name in the schema.

    This is asserted rather than documented because it is the difference between
    "we chose not to compute these" and "these cannot be computed from what is
    held". Only the second justifies leaving them out.
    """
    from app.services.map_service import map_service
    from app.services.prediction_service import PredictionService

    lat, lon = 25.3125, 84.375
    profile = map_service.get_profile_at(lat, lon)

    for day in range(1, 11):
        inputs = PredictionService.build_model_inputs(profile, float(day) * 24.0)
        varying = {k: v for k, v in inputs.items() if k != "lead_hours"}
        if day == 1:
            first = varying
        else:
            assert varying == first, (
                "profile now varies with lead day; the tendency features may "
                "have become computable and this suite needs revisiting"
            )

    # And the tendencies themselves, evaluated the way they would have to be.
    def series(field):
        return [
            PredictionService.build_model_inputs(
                map_service.get_profile_at(lat, lon), float(day) * 24.0
            )[field]
            for day in range(1, 11)
        ]

    for field in (
        "mean_sea_level_pressure",
        "2m_temperature",
        "geopotential_500",
        "total_precipitation_24hr",
    ):
        values = series(field)
        deltas = {values[i + 1] - values[i] for i in range(len(values) - 1)}
        assert deltas == {0.0}, f"{field} tendency is not degenerate: {deltas}"


def test_only_the_tendencies_are_marked_unreachable_by_a_refit():
    """Gradients are computable; tendencies are not reachable from the data.

    They need separating because they imply different follow-up work. The
    gradients can be differenced across neighbouring cells of a grid the served
    app already holds, at the store's native spacing. The tendencies cannot be
    reached at all: the only store the notebook opens pins init_time to 0012 UTC
    - one forecast cycle per day - so there is never a second forecast to
    difference against.
    """
    by_group: Dict[str, set] = {}
    for feature in UNIMPLEMENTED_FEATURES:
        by_group.setdefault(feature["group"], set()).add(feature["refit_would_clear"])

    assert by_group["spatial_gradient"] == {
        "yes - computable at the store's native 5.625 deg spacing"
    }
    assert by_group["lead_time_tendency"] == {"no - unreachable from a single-cycle dataset"}


def test_served_grid_is_the_store_native_spacing_not_a_coarsening():
    """The gradients' coarse appearance is the dataset's, not the app's.

    An earlier draft of this file claimed the served 5.625 deg grid was a 4x
    coarsening of the store and that a refit would recover ~156 km resolution.
    That was wrong, and the assertion below is what caught it: the store name
    encodes its own grid, "64x32", and 360/64 and 180/32 are both exactly
    5.625. The India domain then spans about 5x5 cells, which is exactly the
    grid held in map_service.

    So there is no finer resolution on offer. If the served spacing ever changes
    away from the native one, the recorded rationale needs rechecking; if the
    store is ever swapped for a finer dataset, this is where it shows up.
    """
    from app.services.map_service import GRID_DATA

    lats = sorted({point["lat"] for point in GRID_DATA})
    lons = sorted({point["lon"] for point in GRID_DATA})

    lat_step = round(lats[1] - lats[0], 6)
    lon_step = round(lons[1] - lons[0], 6)

    # WeatherBench2 hres/2016-2022-0012-64x32_equiangular_conservative
    assert lat_step == round(180 / 32, 6) == 5.625
    assert lon_step == round(360 / 64, 6) == 5.625

    # And the India domain at that spacing yields the grid actually served.
    assert (37 - 8) / lat_step < 6
    assert (98 - 68) / lon_step < 6
    assert len(lats) == 5 and len(lons) == 5


def test_bust_pattern_similarity_provenance_is_flagged_undocumented():
    """The served model's 2nd-most-influential input has no recorded derivation.

    This is a standing honesty gap. It is flagged rather than fixed because
    fixing it means establishing where the value actually came from, which is not
    something the code can answer. If the notebook ever gains a cosine-similarity
    computation, or the scalar's origin is documented elsewhere, this should fail
    and be revisited rather than left passing.
    """
    assert BUST_PATTERN_SIMILARITY_PROVENANCE == "UNDOCUMENTED"

    notebook = _notebook_text()
    if notebook is None:
        pytest.skip("training notebook not present")

    assert "bust_pattern_similarity" not in notebook, (
        "the notebook now computes bust_pattern_similarity; the provenance gap "
        "is resolved and this flag should be removed"
    )
    for token in ("cosine", "similarity"):
        assert token not in notebook.lower(), (
            f"the notebook now contains '{token}'; the provenance gap may be closed"
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
    # The two groups are blocked differently, and the record has to say which.
    assert "init_time" in note
    assert "0012" in note


def test_schema_json_keeps_the_group_split(schema_json: dict):
    cleared = schema_json["unimplemented_features"]["cleared_by_refit"]
    assert cleared["spatial_gradient"].startswith("yes")
    assert cleared["lead_time_tendency"].startswith("no")


def test_schema_json_records_the_provenance_gap(schema_json: dict):
    """An input the model actively uses must not have its origin quietly dropped.

    Separate from the unimplemented seven: those are absent features, this is a
    served feature whose derivation nobody has recorded. It outranks them because
    it reaches predictions.
    """
    gaps = schema_json["provenance_gaps"]
    entry = gaps["bust_pattern_similarity"]

    assert entry["status"] == "UNDOCUMENTED"
    assert entry["in_notebook_feature_cols"] is False
    assert entry["notebook_contains_cosine_or_similarity"] is False
    assert entry["flag"] == "BUST_PATTERN_SIMILARITY_PROVENANCE"
    assert "second most influential" in entry["note"]


def test_module_and_json_agree_on_the_provenance_flag():
    assert BUST_PATTERN_SIMILARITY_PROVENANCE == "UNDOCUMENTED"