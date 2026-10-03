"""
The probability contract.

These are the rules the whole UI leans on. If any of them breaks, a number on
screen stops meaning what its label says, so they are asserted against every
endpoint that emits a probability rather than spot-checked by hand.
"""

from __future__ import annotations

import pytest

from conftest import assert_no_nan

# Coordinates spread across the domain, chosen to hit different reference cells.
SAMPLE_POINTS = [
    (28.6139, 77.2090, "Delhi"),
    (18.5693, 74.0634, "Pune"),
    (25.5941, 85.1376, "Patna"),
    (19.0760, 72.8777, "Mumbai"),
    (22.5697, 88.3500, "Kolkata"),
    (32.1094, 76.3117, "Dharamshala"),
    (8.4375, 73.1250, "domain SW corner"),
    (36.5625, 95.625, "domain NE corner"),
]

DAYS = [1, 4, 10]


def expected_level(confidence: float) -> str:
    """HIGH >= 0.70, MODERATE >= 0.40, LOW < 0.40. Display convention only."""
    if confidence >= 0.70:
        return "HIGH"
    if confidence >= 0.40:
        return "MODERATE"
    return "LOW"


@pytest.mark.parametrize("latitude,longitude,label", SAMPLE_POINTS)
@pytest.mark.parametrize("day", DAYS)
def test_location_probability_is_a_probability(client, latitude, longitude, label, day):
    resp = client.get(
        "/api/forecast/location",
        params={"latitude": latitude, "longitude": longitude, "day": day},
    )
    assert resp.status_code == 200, f"{label} day {day}: {resp.text}"
    body = resp.json()

    assert 0.0 <= body["bust_probability"] <= 1.0
    assert 0.0 <= body["confidence"] <= 1.0
    # confidence is defined as 1 - bust probability, not fitted separately.
    assert body["confidence"] == pytest.approx(1.0 - body["bust_probability"], abs=1e-6)
    assert body["confidence_level"] == expected_level(body["confidence"])
    # day is derived from lead time, never supplied independently.
    assert body["day"] == body["lead_hours"] / 24
    assert_no_nan(body, f"/api/forecast/location {label} day {day}")


def test_map_points_obey_the_same_contract(client):
    body = client.get("/api/forecast/map", params={"day": 4}).json()
    assert body["day"] == 4
    assert body["lead_hours"] == 96
    assert body["points"], "the reference grid produced no points"

    for point in body["points"]:
        assert 0.0 <= point["bust_probability"] <= 1.0, point
        assert point["confidence"] == pytest.approx(
            1.0 - point["bust_probability"], abs=1e-6
        ), point
        assert point["confidence_level"] == expected_level(point["confidence"]), point


def test_time_series_points_obey_the_same_contract(client):
    body = client.get(
        "/api/forecast/time-series",
        params={"latitude": 25.5941, "longitude": 85.1376},
    ).json()

    days = [p["day"] for p in body["series"]]
    assert days == list(range(1, 11)), f"expected all ten lead days, got {days}"

    for point in body["series"]:
        assert point["lead_hours"] == point["day"] * 24, point
        assert point["confidence"] == pytest.approx(
            1.0 - point["bust_probability"], abs=1e-6
        ), point
        assert point["confidence_level"] == expected_level(point["confidence"]), point
        # Lead time is a model input, so each point carries its own vector.
        assert point["model_inputs"]["lead_hours"] == point["lead_hours"], point

    assert_no_nan(body, "/api/forecast/time-series")


def test_time_series_honours_a_day_subset(client):
    body = client.get(
        "/api/forecast/time-series",
        params={"latitude": 25.5941, "longitude": 85.1376, "days": "2,5,9"},
    ).json()
    assert [p["day"] for p in body["series"]] == [2, 5, 9]
    assert [p["model_inputs"]["lead_hours"] for p in body["series"]] == [48.0, 120.0, 216.0]


def test_bust_probability_is_not_constant_across_the_domain(client):
    """A model that returns one number everywhere would pass every test above."""
    values = {
        client.get(
            "/api/forecast/location",
            params={"latitude": lat, "longitude": lon, "day": 4},
        ).json()["bust_probability"]
        for lat, lon, _ in SAMPLE_POINTS
    }
    assert len(values) > 1, f"every sampled point returned {values}"


def test_predict_round_trips_the_probability_contract(client):
    """The direct feature-vector endpoint obeys the same rules."""
    body = client.post(
        "/api/predict",
        json={
            "total_precipitation_24hr": 0.0482,
            "temperature_2m": 298.4,
            "mean_sea_level_pressure": 99750,
            "u_wind_10m": 4.2,
            "v_wind_10m": 2.1,
            "specific_humidity_850": 0.017,
            "geopotential_500": 56300,
            "vertical_velocity_500": -0.31,
            "longitude": 73.125,
            "latitude": 19.6875,
            "lead_hours": 96,
            "bust_pattern_similarity": 0.55,
        },
    ).json()

    assert body["confidence"] == pytest.approx(1.0 - body["bust_probability"], abs=1e-4)
    assert body["day"] == 4
    assert body["lead_hours"] == 96
    assert body["model_version"]
    assert body["request_id"]
    assert_no_nan(body, "/api/predict")


def test_the_same_vector_scores_identically_twice(client):
    """No hidden per-request state leaking into a prediction."""
    payload = {
        "total_precipitation_24hr": 0.0482,
        "temperature_2m": 298.4,
        "mean_sea_level_pressure": 99750,
        "u_wind_10m": 4.2,
        "v_wind_10m": 2.1,
        "specific_humidity_850": 0.017,
        "geopotential_500": 56300,
        "vertical_velocity_500": -0.31,
        "longitude": 73.125,
        "latitude": 19.6875,
        "lead_hours": 96,
        "bust_pattern_similarity": 0.55,
    }
    first = client.post("/api/predict", json=payload).json()
    second = client.post("/api/predict", json=payload).json()

    assert first["bust_probability"] == second["bust_probability"]
    assert first["confidence"] == second["confidence"]
    assert first["confidence_level"] == second["confidence_level"]
