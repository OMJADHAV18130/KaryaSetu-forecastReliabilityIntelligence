"""
Shared fixtures.

The suite runs against the real artifacts in ``backend/models``. There is no
mocked booster anywhere in these tests: the point of them is to check that the
numbers the API produces obey the contracts the UI relies on, and a mocked
model could not check that.
"""

from __future__ import annotations

import json
import math
from pathlib import Path
import sys

# Ensure sklearn compatibility shims are active before any test or dependency imports xgboost
try:
    from app.core import compat
except ImportError:
    pass

import pytest

BACKEND_DIR = Path(__file__).resolve().parents[1]
MODELS_DIR = BACKEND_DIR / "models"


@pytest.fixture(scope="session")
def notebook_evaluation() -> dict:
    """The transcribed September 2019 figures, straight off disk."""
    with (MODELS_DIR / "notebook_evaluation.json").open(encoding="utf-8") as fh:
        return json.load(fh)


@pytest.fixture(scope="session")
def feature_schema() -> dict:
    """The loaded artifact's own contract: names, order, domains."""
    with (MODELS_DIR / "feature_schema.json").open(encoding="utf-8") as fh:
        return json.load(fh)


@pytest.fixture(scope="session")
def client():
    """A TestClient with the model already loaded, as at server startup."""
    from fastapi.testclient import TestClient

    from app.main import app

    with TestClient(app) as test_client:
        yield test_client


def walk(node, path="$"):
    """Yield ``(json_path, value)`` for every leaf in a nested structure."""
    if isinstance(node, dict):
        for key, value in node.items():
            yield from walk(value, f"{path}.{key}")
    elif isinstance(node, list):
        for index, value in enumerate(node):
            yield from walk(value, f"{path}[{index}]")
    else:
        yield path, node


def assert_no_nan(payload, where: str = "response") -> None:
    """Fail on any NaN or infinity anywhere in a JSON payload.

    A NaN is not a number the UI can render, and `json.loads` would silently turn
    one into a bare ``NaN`` token that no browser accepts. It can only get there
    by an arithmetic slip, so it is worth catching in tests rather than on screen.
    """
    offenders = []
    for path, value in walk(payload):
        if isinstance(value, float) and (math.isnan(value) or math.isinf(value)):
            offenders.append(f"{path} = {value}")
    assert not offenders, f"{where} contains non-finite values: {offenders}"
