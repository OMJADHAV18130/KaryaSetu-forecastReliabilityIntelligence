"""
Reporting honesty.

This prototype's credibility rests on a page never showing a number that was not
produced. These tests pin that down: missing data must come back marked
unavailable with a reason, reported figures must match the record they came from,
and the two separate evaluations must never be merged into one headline number.
"""

from __future__ import annotations

import pytest

from conftest import assert_no_nan

# Endpoints that have no data source in this deployment. Each must say so rather
# than returning an empty list that reads as "nothing happened".
#
# ``/api/verification`` is listed by the half that is genuinely absent. Its other
# half, ``model_skill``, carries the transcribed September 2019 figures and is
# checked separately below.
UNAVAILABLE_ENDPOINTS = [
    "/api/verification",
    "/api/historical-events",
]


def _absent_half(body: dict, path: str) -> dict:
    """The part of a response that has no data source in this deployment."""
    if path == "/api/verification":
        return body["archive"]
    return body


@pytest.mark.parametrize("path", UNAVAILABLE_ENDPOINTS)
def test_absent_data_is_reported_absent(client, path):
    body = _absent_half(client.get(path).json(), path)

    assert body["available"] is False, f"{path} claimed data is available"
    assert body["message"], f"{path} gave no reason for being unavailable"
    # An empty list on its own would read as a real result of zero events.
    assert body.get("results") == []
    # The reader is told what a record would need, so the gap is actionable.
    assert body.get("expected_record_shape"), f"{path} did not say what it expects"
    assert_no_nan(body, path)


def test_unavailable_messages_are_not_placeholder_numbers(client):
    """The explanation must not smuggle in a figure on its way out."""
    for path in UNAVAILABLE_ENDPOINTS:
        text = client.get(path).text.lower()
        for banned in ("placeholder", "dummy", "sample data", "demo data", "tbd"):
            assert banned not in text, f"{path} message mentions {banned!r}"


def test_verification_serves_real_measured_skill(client, notebook_evaluation):
    """
    ``/api/verification`` must serve evidence that was actually measured.

    The UI renders none of these figures - they are documented in the project
    README instead, so there is one copy rather than two that could drift. That
    makes this the only check on them, so every value is compared against the
    transcribed notebook record: a figure that drifts from what the notebook
    printed fails the build rather than reaching an API consumer.
    """
    skill = client.get("/api/verification").json()["model_skill"]
    record = notebook_evaluation["held_out_test_metrics"]

    assert skill["available"] is True, "no measured skill is being served"
    for field in (
        "roc_auc",
        "pr_auc",
        "mcc",
        "brier_raw",
        "brier_calibrated",
        "n_samples",
        "n_bust",
        "operating_threshold",
    ):
        assert skill[field] == record[field], f"model_skill.{field} was altered"

    for cell, value in record["confusion_matrix"].items():
        assert skill["confusion_matrix"][cell] == value, f"matrix cell {cell} was altered"

    assert skill["threshold_sweep"]["rows"] == notebook_evaluation["threshold_sweep"]["rows"]
    assert_no_nan(skill, "/api/verification model_skill")


def test_reported_precision_and_recall_follow_from_the_confusion_matrix(client):
    """The two derived shares must be arithmetic on the published cells."""
    skill = client.get("/api/verification").json()["model_skill"]
    matrix = skill["confusion_matrix"]
    tn, fp = matrix["true_negatives"], matrix["false_positives"]
    fn, tp = matrix["false_negatives"], matrix["true_positives"]

    assert tn + fp + fn + tp == skill["n_samples"], "matrix does not account for every sample"
    assert fn + tp == skill["n_bust"], "positives do not match the reported bust count"

    # Precision divides by what was predicted a bust, recall by what actually was.
    assert skill["precision_at_threshold"] == pytest.approx(tp / (fp + tp), abs=1e-6)
    assert skill["recall_at_threshold"] == pytest.approx(tp / (fn + tp), abs=1e-6)

    # And they must agree with the rounded figures in the printed report.
    report = skill["classification_report"]
    assert skill["precision_at_threshold"] == pytest.approx(report["precision"], abs=0.01)
    assert skill["recall_at_threshold"] == pytest.approx(report["recall"], abs=0.01)


def test_threshold_sweep_f1_peak_is_where_the_notebook_says(client, notebook_evaluation):
    """The sweep's best F1 must be a real interior maximum, not a tidy-looking one."""
    skill = client.get("/api/verification").json()["model_skill"]
    rows = skill["threshold_sweep"]["rows"]

    best = max(rows, key=lambda r: r["f1"])
    expected = max(notebook_evaluation["threshold_sweep"]["rows"], key=lambda r: r["f1"])

    assert best["threshold"] == expected["threshold"], "the F1 peak moved"
    assert best["f1"] == expected["f1"], "the peak F1 was altered"
    # And it is a genuine interior peak, not the first or last row.
    assert 0 < rows.index(best) < len(rows) - 1, "the peak sits at an end of the sweep"


def test_measured_skill_is_never_labelled_as_live(client):
    """
    A fixed historical evaluation must not read as a running total.

    The figures are real, so the failure mode here is not fabrication but
    mislabelling: a reader taking them for live operational statistics.
    """
    skill = client.get("/api/verification").json()["model_skill"]

    assert skill["label"], "the evaluation is not named"
    assert "September 2019" in skill["label"], skill["label"]
    assert skill["provenance"], "no provenance statement is attached to the figures"

    provenance = skill["provenance"].lower()
    assert "september 2019 test set" in provenance
    assert "not live operational statistics" in provenance

    # The label itself must not carry a live-sounding word.
    label = skill["label"].lower()
    for banned in ("live", "real-time", "realtime", "current", "ongoing", "today"):
        assert banned not in label, f"label {skill['label']!r} reads as live"


def test_held_out_figures_match_the_notebook_record(client, notebook_evaluation):
    """Whatever the API serves must be exactly what the notebook printed."""
    body = client.get("/api/model-performance").json()
    held_out = body["held_out_test_set"]
    record = notebook_evaluation["held_out_test_metrics"]

    assert held_out is not None, "the notebook evaluation is missing from the response"
    for field in (
        "roc_auc",
        "pr_auc",
        "mcc",
        "brier_raw",
        "brier_calibrated",
        "n_samples",
    ):
        assert held_out[field] == record[field], f"held_out_test_set.{field} was altered"

    served_matrix = held_out["confusion_matrix"]
    for cell in ("true_negatives", "false_positives", "false_negatives", "true_positives"):
        assert served_matrix[cell] == record["confusion_matrix"][cell], cell

    # The four cells must account for every reported sample.
    total = sum(served_matrix.values())
    assert total == held_out["n_samples"], f"matrix sums to {total}, n is {held_out['n_samples']}"


def test_confusion_matrix_is_self_consistent(client):
    """The reported rates must follow from the reported cells.

    These are the four counts a reader can add up by hand. If precision or recall
    is quoted next to them and does not follow, at least one of the two is wrong,
    and there is no way to tell which from the page.
    """
    body = client.get("/api/model-performance").json()
    for block in ("held_out_test_set", "served_artifact"):
        block_body = body[block]
        if block_body is None or block_body.get("confusion_matrix") is None:
            continue
        matrix = block_body["confusion_matrix"]
        tn, fp = matrix["true_negatives"], matrix["false_positives"]
        fn, tp = matrix["false_negatives"], matrix["true_positives"]

        actual_positives = fn + tp
        actual_negatives = tn + fp
        predicted_positives = fp + tp

        report = block_body.get("classification_report") or {}
        # Precision divides by what was predicted positive; recall divides by what
        # actually was. Conflating the two is the classic way a report becomes
        # internally inconsistent without anybody noticing.
        if report.get("precision") is not None:
            expected = tp / predicted_positives
            assert report["precision"] == pytest.approx(expected, abs=0.01), (
                f"{block}: precision {report['precision']} does not follow from the "
                f"confusion matrix ({expected:.4f})"
            )
        if report.get("recall") is not None:
            expected = tp / actual_positives
            assert report["recall"] == pytest.approx(expected, abs=0.01), (
                f"{block}: recall {report['recall']} does not follow from the "
                f"confusion matrix ({expected:.4f})"
            )
        if report.get("accuracy") is not None:
            expected = (tn + tp) / (actual_positives + actual_negatives)
            assert report["accuracy"] == pytest.approx(expected, abs=0.01), block
        if report.get("f1_score") is not None:
            precision = tp / predicted_positives
            recall = tp / actual_positives
            expected = 2 * precision * recall / (precision + recall)
            assert report["f1_score"] == pytest.approx(expected, abs=0.02), block

        assert actual_positives + actual_negatives == block_body.get("n_samples"), block


def test_the_two_evaluations_are_never_merged(client):
    body = client.get("/api/model-performance").json()

    assert body["held_out_test_set"] is not None
    assert body["served_artifact"] is not None
    # Two distinct blocks, each naming what it measures.
    assert body["held_out_test_set"]["label"]
    assert body["served_artifact"]["label"]
    assert body["held_out_test_set"]["label"] != body["served_artifact"]["label"]

    # The loaded booster's own data is not a held-out set, and must not be
    # labelled as the September 2019 test set.
    served = body["served_artifact"]
    assert served["n_samples"] != body["held_out_test_set"]["n_samples"]
    assert "september" not in served["label"].lower()
    assert served.get("note"), "served_artifact carries no caveat"

    # No single headline metric at the top level that merges the two.
    for leaked in ("roc_auc", "pr_auc", "mcc", "accuracy"):
        assert leaked not in body, f"a merged {leaked} was added at the top level"


def test_unknown_figures_are_null_not_invented(client):
    """A figure that was not measured must be null, not a plausible number."""
    body = client.get("/api/model-performance").json()
    for block in ("held_out_test_set", "served_artifact"):
        for key, value in body[block].items():
            if value is None:
                continue
            if isinstance(value, (int, float)):
                assert not isinstance(value, bool)
                assert value == value, f"{block}.{key} is NaN"
    assert body["research_only"] is True
    assert body["scope"], "the rainfall-only scope statement is missing"
    scope = body["scope"].lower()
    assert "rainfall" in scope
    # The scope statement must rule out the variables this model cannot detect.
    for excluded in ("cyclone", "temperature", "pressure"):
        assert excluded in scope, f"scope does not exclude {excluded}"


def test_model_info_repeats_no_evaluation_figures(client):
    """Identity only. Figures live in one place, or they get read as one number."""
    body = client.get("/api/model-info").json()

    assert "metrics" not in body
    for banned in ("roc_auc", "pr_auc", "mcc", "accuracy", "brier_raw", "brier_calibrated"):
        assert banned not in body, f"model-info leaked {banned}"

    assert body["is_ready"] is True
    assert body["model_loaded"] is True
    assert body["calibration_loaded"] is True
    assert body["feature_count"] == len(body["features"])


def test_feature_contract_is_complete_and_ordered(client, feature_schema):
    """The API must read the features the artifact declares, in that order."""
    body = client.get("/api/model-info").json()
    assert body["features"] == feature_schema["features"], "feature order drifted"
    assert body["feature_count"] == len(body["features"]) == 12

    # Every declared feature must reach the model. Latitude and longitude travel
    # beside model_inputs rather than inside it, so they are checked at top level.
    resp = client.get(
        "/api/forecast/location",
        params={"latitude": 19.0, "longitude": 73.0, "day": 4},
    ).json()
    supplied = set(resp["model_inputs"]) | {"latitude", "longitude"}
    missing = set(body["features"]) - supplied
    assert not missing, f"features declared but never supplied: {sorted(missing)}"
    assert not supplied - set(body["features"]), (
        f"inputs sent that the booster does not read: {sorted(supplied - set(body['features']))}"
    )
    assert resp["latitude"] == pytest.approx(19.0, abs=0.01)
    assert resp["longitude"] == pytest.approx(73.0, abs=0.01)


def test_global_importance_is_a_magnitude_with_no_direction(client):
    """Mean |SHAP| says how much a feature matters, never which way it pushed."""
    body = client.get("/api/explanation/global").json()

    if not body["available"]:
        pytest.skip(f"SHAP unavailable: {body.get('unavailable_reason')}")

    assert body["features"], "an available explanation returned no features"
    for row in body["features"]:
        assert "mean_abs_shap" in row, row
        assert "shap_value" not in row, f"a signed value leaked into global: {row}"
        assert "direction" not in row, f"a direction leaked into global: {row}"
        assert row["mean_abs_shap"] >= 0.0, row
        assert row["rank"] >= 1, row

    ranks = [row["rank"] for row in body["features"]]
    assert ranks == list(range(1, len(ranks) + 1)), f"ranks are not 1..n: {ranks}"
    values = [row["mean_abs_shap"] for row in body["features"]]
    assert values == sorted(values, reverse=True), "not ordered by mean |SHAP|"
    assert_no_nan(body, "/api/explanation/global")


def test_local_attribution_decomposes_the_returned_probability(client):
    """The SHAP values must add up to the probability actually shown.

    This is the check that keeps /api/explanation/location honest: it returns one
    probability and one set of attributions from a single evaluation, so a reader
    can verify the bars against the number at the top of the page.
    """
    body = client.get(
        "/api/explanation/location",
        params={"latitude": 25.5941, "longitude": 85.1376, "day": 4},
    ).json()

    if not body["available"]:
        pytest.skip(f"SHAP unavailable: {body.get('unavailable_reason')}")

    assert body["confidence"] == pytest.approx(1.0 - body["bust_probability"], abs=1e-6)

    # Attribution covers every feature the booster reads, including the two
    # coordinates that travel outside model_inputs.
    contributions = [row["shap_value"] for row in body["features"]]
    assert len(contributions) == 12
    assert {row["feature"] for row in body["features"]} == {
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
    }

    # base_value is SHAP's expected value in log-odds. The decomposition is exact
    # against the *booster's own* probability, which is why the response reports
    # that stage separately: TreeSHAP does not decompose the calibrator, so asking
    # the bars to sum to the calibrated figure would be asking for a false identity.
    assert body["base_value"] is not None, "no base value, so the bars cannot be checked"
    reconstructed = 1.0 / (1.0 + pow(2.718281828459045, -(body["base_value"] + sum(contributions))))
    assert reconstructed == pytest.approx(body["uncalibrated_probability"], abs=1e-4), (
        f"attributions reconstruct {reconstructed:.6f} but the response reports the "
        f"booster's own probability as {body['uncalibrated_probability']}"
    )

    # Calibration is a separate, named step between the two numbers, not a silent
    # adjustment. The calibrated figure must be in [0, 1] and must not be presented
    # as something the SHAP bars explain.
    assert body["calibration_applied"] is True
    assert 0.0 <= body["uncalibrated_probability"] <= 1.0
    assert 0.0 <= body["bust_probability"] <= 1.0
    # With a sigmoid calibrator fitted on August data, the two usually differ. If
    # they ever matched exactly, that would mean calibration silently did nothing,
    # which the Model Scores page would then be misreporting.
    assert body["uncalibrated_probability"] != pytest.approx(
        body["bust_probability"], abs=1e-6
    ), "calibration reported as applied but changed nothing"

    ranks = [row["rank"] for row in body["features"]]
    assert ranks == list(range(1, 13)), f"ranks are not 1..12: {ranks}"
    magnitudes = [abs(row["shap_value"]) for row in body["features"]]
    assert magnitudes == sorted(magnitudes, reverse=True), "not ordered by |SHAP|"

    for row in body["features"]:
        assert row["direction"] in ("increases_bust_risk", "decreases_bust_risk", "neutral"), row
        expected = (
            "increases_bust_risk"
            if row["shap_value"] > 0
            else "decreases_bust_risk"
            if row["shap_value"] < 0
            else "neutral"
        )
        assert row["direction"] == expected, row
        assert isinstance(row["value"], (int, float))

    assert_no_nan(body, "/api/explanation/location")


def test_interpolated_inputs_say_so(client):
    """Any coordinate off the reference grid must carry its derivation."""
    body = client.get(
        "/api/forecast/location",
        params={"latitude": 25.5941, "longitude": 85.1376, "day": 4},
    ).json()

    derivation = body["derivation"]
    assert derivation["method"], "no method named for an interpolated value"
    assert derivation["neighbour_count"] >= 1
    assert derivation["distance_km"] >= 0.0
    assert derivation["source_cell"], "no reference cell named"
    assert_no_nan(derivation, "derivation")


def test_health_reports_shap_availability(client):
    body = client.get("/api/health").json()
    assert body["status"] in ("ok", "degraded")
    assert "shap_available" in body
    if body["status"] == "ok":
        assert body["model_loaded"] is True
        assert body["calibration_loaded"] is True
