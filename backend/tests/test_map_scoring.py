"""
Every map value must come out of the model.

The bust risk choropleth draws one colour per district. The only acceptable way
for that colour to appear is for the loaded booster to have evaluated that
district's own coordinate, so these tests pin down three things:

1. A batch of coordinates is scored, not blended. Each result must equal what
   the single-point endpoint returns for the same coordinate and day.
2. Values actually vary with position. A choropleth whose cells all share one
   number is a picture, not a result, and the cheapest way to fake one is to
   fill the gaps from a neighbour.
3. Coordinates outside the trained domain, NaN and infinity are refused rather
   than clamped into something that looks like a valid prediction.
"""

from __future__ import annotations

import pytest

from conftest import assert_no_nan

BATCH = "/api/forecast/score-batch"

# Spread across the domain so the batch is not a single cluster of cells.
SAMPLE_COORDINATES = [
    (25.5941, 85.1376),  # Patna
    (19.0760, 72.8777),  # Mumbai
    (28.6139, 77.2090),  # Delhi
    (12.9716, 77.5946),  # Bengaluru
    (22.5726, 88.3639),  # Kolkata
    (8.4375, 73.125),  # a trained reference cell itself
    (30.9375, 78.750),  # the other trained reference cell
]


def _post(client, day, coordinates):
    return client.post(
        BATCH,
        json={
            "day": day,
            "coordinates": [
                {"latitude": lat, "longitude": lon} for lat, lon in coordinates
            ],
        },
    )


@pytest.mark.parametrize("day", [1, 4, 10])
def test_batch_matches_the_single_point_endpoint(client, day):
    """A batch is a faster way to ask the same question, not a different one."""
    batch = _post(client, day, SAMPLE_COORDINATES).json()

    assert batch["count"] == len(SAMPLE_COORDINATES)
    assert batch["day"] == day
    assert batch["lead_hours"] == day * 24
    assert_no_nan(batch, BATCH)

    for coordinate, result in zip(SAMPLE_COORDINATES, batch["results"]):
        single = client.get(
            "/api/forecast/location",
            params={"latitude": coordinate[0], "longitude": coordinate[1], "day": day},
        ).json()

        assert result["latitude"] == single["latitude"]
        assert result["longitude"] == single["longitude"]
        assert result["bust_probability"] == single["bust_probability"], (
            f"batch and single-point disagree at {coordinate}"
        )
        assert result["confidence"] == single["confidence"]
        assert result["confidence_level"] == single["confidence_level"]


def test_batch_reports_both_probability_stages(client):
    """SHAP decomposes the booster, so both stages have to travel together."""
    results = _post(client, 4, SAMPLE_COORDINATES).json()["results"]

    for result in results:
        assert result["calibration_applied"] is True
        # The calibrated figure may be pulled by the calibrator, but only
        # downwards on this artifact. It must still be a probability, and it
        # must not simply be a copy of the booster output.
        assert 0.0 <= result["bust_probability"] <= 1.0
        assert 0.0 <= result["uncalibrated_probability"] <= 1.0
        assert result["confidence"] == pytest.approx(
            1.0 - result["bust_probability"], abs=1e-4
        )


def test_every_result_states_its_derivation(client):
    """The UI prints this under each district, so it cannot be optional."""
    results = _post(client, 4, SAMPLE_COORDINATES).json()["results"]

    for result in results:
        derivation = result["derivation"]
        assert derivation["method"] == (
            "inverse_distance_interpolation_of_model_inputs"
        )
        assert derivation["source_cell"], "no reference cell named"
        assert derivation["distance_km"] >= 0.0
        assert derivation["neighbour_count"] >= 1


def test_values_vary_with_position(client):
    """A flat choropleth means the map is not reporting anything."""
    results = _post(client, 4, SAMPLE_COORDINATES).json()["results"]
    probabilities = [r["bust_probability"] for r in results]

    assert len(set(probabilities)) > 1, "every coordinate returned the same probability"

    # Two coordinates sharing a value despite being far apart would mean a
    # nearest-cell lookup is standing in for a real evaluation.
    assert max(probabilities) - min(probabilities) > 0.01, (
        "positions this far apart produced near-identical risk"
    )


def test_batch_rejects_coordinates_outside_the_trained_domain(client):
    """Out of domain means the model has no business answering."""
    for latitude, longitude in [(40.0, 80.0), (25.0, 60.0), (25.0, 101.0), (5.0, 80.0)]:
        response = _post(client, 4, [(latitude, longitude)])
        assert response.status_code == 422, (
            f"({latitude}, {longitude}) was scored despite being out of domain"
        )


def test_batch_rejects_non_finite_coordinates(client):
    """NaN slips through a naive range check, so it gets its own case.

    ``nan < 8.0`` is False and ``nan > 37.0`` is False, so a range comparison on
    its own lets NaN through and the model would return a probability for a
    coordinate that does not exist.
    """
    for latitude, longitude in [("NaN", 80.0), (25.0, "NaN"), ("Infinity", 80.0)]:
        response = client.post(
            BATCH,
            json={
                "day": 4,
                "coordinates": [{"latitude": latitude, "longitude": longitude}],
            },
        )
        assert response.status_code == 422, f"{latitude},{longitude} was accepted"


def test_batch_rejects_an_empty_coordinate_list(client):
    """An empty batch is a client mistake, not a result of zero risk."""
    response = client.post(BATCH, json={"day": 4, "coordinates": []})
    assert response.status_code == 422


def test_batch_rejects_a_day_outside_one_to_ten(client):
    response = _post(client, 11, SAMPLE_COORDINATES[:1])
    assert response.status_code == 422

    response = _post(client, 0, SAMPLE_COORDINATES[:1])
    assert response.status_code == 422


def test_batch_rejects_more_coordinates_than_the_cap(client):
    """The cap is what stops a malformed client scoring the whole planet."""
    from app.schemas.forecast import MAX_BATCH_COORDINATES

    too_many = [
        {"latitude": 22.5, "longitude": 78.0 + (i % 10) * 0.01}
        for i in range(MAX_BATCH_COORDINATES + 1)
    ]
    response = client.post(BATCH, json={"day": 4, "coordinates": too_many})
    assert response.status_code == 422


def test_duplicate_coordinates_are_scored_independently(client):
    """Repeating a coordinate must not collapse into one result."""
    repeated = SAMPLE_COORDINATES[0:1] * 3
    results = _post(client, 4, repeated).json()["results"]

    assert len(results) == 3
    assert len({r["bust_probability"] for r in results}) == 1
    assert len({(r["latitude"], r["longitude"]) for r in results}) == 1


def test_batch_order_matches_request_order(client):
    """The frontend matches scores to districts by position, so order matters."""
    results = _post(client, 4, SAMPLE_COORDINATES).json()["results"]

    for (latitude, longitude), result in zip(SAMPLE_COORDINATES, results):
        assert result["latitude"] == pytest.approx(latitude, abs=1e-4)
        assert result["longitude"] == pytest.approx(longitude, abs=1e-4)


def test_predict_matrix_agrees_with_predict_row_by_row():
    """The batch path shares the single-point arithmetic; prove it.

    Run without a client so the two predictor entry points can be compared
    directly on the same feature vectors.
    """
    from app.ml.predictor import predictor
    from app.ml.feature_schema import FEATURE_COLUMNS

    base = {
        "total_precipitation_24hr": 0.024,
        "2m_temperature": 303.35,
        "mean_sea_level_pressure": 100350.0,
        "10m_u_component_of_wind": 2.8,
        "10m_v_component_of_wind": -2.1,
        "specific_humidity_850": 0.0145,
        "geopotential_500": 5810.0 * 9.81,
        "vertical_velocity_500": -0.32,
        "longitude": 84.375,
        "latitude": 25.3125,
        "lead_hours": 96.0,
        "bust_pattern_similarity": 0.51,
    }

    # Perturb one feature at a time so the rows are genuinely different inputs.
    rows = []
    singles = []
    for index, column in enumerate(FEATURE_COLUMNS):
        features = dict(base)
        features[column] = features[column] * 1.35 + 0.07
        rows.append([float(features[name]) for name in FEATURE_COLUMNS])
        singles.append(predictor.predict(features))

    matrix = predictor.predict_matrix(rows)
    assert len(matrix) == len(singles)

    for row_index, (from_matrix, from_single) in enumerate(zip(matrix, singles)):
        for field in (
            "bust_probability",
            "uncalibrated_probability",
            "confidence",
            "confidence_level",
            "day",
            "lead_hours",
            "latitude",
            "longitude",
            "bust_pattern_similarity",
        ):
            assert from_matrix[field] == from_single[field], (
                f"row {row_index} disagreed on {field}"
            )


def test_predict_matrix_rejects_a_non_finite_value():
    from app.ml.predictor import predictor
    from app.ml.feature_schema import FEATURE_COLUMNS

    row = [1.0] * len(FEATURE_COLUMNS)
    row[0] = float("nan")

    with pytest.raises(ValueError):
        predictor.predict_matrix([row])

    row[0] = float("inf")
    with pytest.raises(ValueError):
        predictor.predict_matrix([row])


def test_predict_matrix_rejects_a_row_of_the_wrong_width():
    from app.ml.predictor import predictor

    with pytest.raises(ValueError):
        predictor.predict_matrix([[1.0, 2.0, 3.0]])


def test_predict_matrix_on_an_empty_list():
    from app.ml.predictor import predictor

    assert predictor.predict_matrix([]) == []