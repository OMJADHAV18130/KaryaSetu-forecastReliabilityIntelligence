"""
Input validation.

A rejected input must be rejected. The failure this guards against is a bad
request being quietly clipped or filled in, which would return a confident-looking
probability for a state that was never measured.
"""

from __future__ import annotations

import pytest


BASE_FEATURES = {
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


@pytest.mark.parametrize("bad", [float("nan"), float("inf"), float("-inf")])
@pytest.mark.parametrize("field", ["total_precipitation_24hr", "vertical_velocity_500", "lead_hours"])
def test_non_finite_features_are_rejected(field, bad):
    """Checked at the schema boundary.

    The HTTP client refuses to encode a bare NaN token, so a NaN can never arrive
    over this transport. It can still arrive from an internal caller, so the
    guard belongs in the schema rather than in the transport.
    """
    from pydantic import ValidationError

    from app.schemas.prediction import PredictionRequest

    with pytest.raises(ValidationError):
        PredictionRequest(**{**BASE_FEATURES, field: bad})


@pytest.mark.parametrize(
    "field,value",
    [
        ("total_precipitation_24hr", -0.1),      # below the physical minimum
        ("total_precipitation_24hr", 5.0),       # 5 m in a day is not a light error
        ("temperature_2m", 150.0),               # below absolute zero in kelvin
        ("mean_sea_level_pressure", 50000.0),    # half an atmosphere
        ("specific_humidity_850", 0.0),          # below the declared floor
        ("geopotential_500", 20000.0),
        ("longitude", 10.0),                     # outside the trained domain
        ("latitude", 60.0),
        ("lead_hours", 12.0),                    # shorter than day 1
        ("lead_hours", 500.0),                   # beyond day 10
        ("bust_pattern_similarity", 1.5),        # outside 0-1
    ],
)
def test_out_of_domain_feature_is_rejected(client, field, value):
    resp = client.post("/api/predict", json={**BASE_FEATURES, field: value})
    assert resp.status_code == 422, f"{field}={value} was accepted: {resp.text}"


def test_a_missing_feature_is_rejected_not_invented(client):
    """No feature may be substituted for the caller.

    ``bust_pattern_similarity`` in particular used to be filled in with a
    heuristic when omitted, which put a made-up number in front of the model and
    returned a probability that looked measured.
    """
    payload = {k: v for k, v in BASE_FEATURES.items() if k != "bust_pattern_similarity"}
    resp = client.post("/api/predict", json=payload)
    assert resp.status_code == 422, f"a missing feature was filled in: {resp.text}"


@pytest.mark.parametrize(
    "params",
    [
        {"latitude": 5.0, "longitude": 77.0, "day": 4},   # south of the domain
        {"latitude": 40.0, "longitude": 77.0, "day": 4},  # north of the domain
        {"latitude": 28.0, "longitude": 60.0, "day": 4},  # west of the domain
        {"latitude": 28.0, "longitude": 120.0, "day": 4}, # east of the domain
    ],
)
def test_out_of_domain_coordinate_is_rejected(client, params):
    for path in (
        "/api/forecast/location",
        "/api/forecast/time-series",
        "/api/explanation/location",
    ):
        resp = client.get(path, params=params)
        assert resp.status_code == 422, f"{path} accepted {params}: {resp.text}"


@pytest.mark.parametrize("day", [0, -1, 11, 400])
def test_out_of_range_day_is_rejected(client, day):
    for path in ("/api/forecast/location", "/api/explanation/location"):
        resp = client.get(
            path, params={"latitude": 28.0, "longitude": 77.0, "day": day}
        )
        assert resp.status_code == 422, f"{path} accepted day {day}"


@pytest.mark.parametrize("days", ["0", "-3", "11", "1,99", "1,2,3,4,5,6,7,8,9,10,11"])
def test_out_of_range_days_are_rejected(client, days):
    resp = client.get(
        "/api/forecast/time-series",
        params={"latitude": 28.0, "longitude": 77.0, "days": days},
    )
    assert resp.status_code == 422, f"time-series accepted days={days}"


def test_non_numeric_days_are_rejected(client):
    resp = client.get(
        "/api/forecast/time-series",
        params={"latitude": 25.0, "longitude": 85.0, "days": "tomorrow"},
    )
    assert resp.status_code == 422, resp.text


def test_days_outside_one_to_ten_are_rejected(client):
    resp = client.get(
        "/api/forecast/time-series",
        params={"latitude": 25.0, "longitude": 85.0, "days": "1,14"},
    )
    assert resp.status_code == 422, resp.text


def test_validation_never_returns_a_number_alongside_the_error(client):
    """A 422 must not carry a probability, even a stale one."""
    resp = client.get(
        "/api/forecast/location",
        params={"latitude": 60.0, "longitude": 77.0, "day": 4},
    )
    assert resp.status_code == 422
    for leaked in ("bust_probability", "confidence", "confidence_level"):
        assert leaked not in resp.text, f"{leaked} leaked into a 422 body"
