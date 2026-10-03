"""
Verification Service — Forecast vs reference comparison, and historical case records.

Scope note
----------
This prototype has no operational verification archive. The trained model scores
a *bust probability* from forecast meteorology alone; confirming a bust actually
occurred needs an archive of medium-range forecasts paired with gauge or
reanalysis observations.

No such archive is bundled here, so both endpoints below report
``available = False`` and an empty result set. They deliberately do NOT return
sample or illustrative rows: a forecast/observation pair that was never measured
would be indistinguishable from a real one once it reached the screen, and the
prototype's published skill figures come from the September 2019 held-out test
set instead (see ``/api/model-performance``).

To make these endpoints real, drop a verification archive in and point
``VERIFICATION_ARCHIVE_PATH`` at it — see :meth:`load_archive` for the record
shape that is expected.
"""

import logging
import os
from typing import Any, Dict, List, Optional

logger = logging.getLogger("karyasetu")

VERIFICATION_ARCHIVE_PATH = os.getenv("VERIFICATION_ARCHIVE_PATH", "")
CASE_ARCHIVE_PATH = os.getenv("CASE_ARCHIVE_PATH", "")

NOT_CONNECTED_MESSAGE = (
    "This prototype has no verification archive attached. A bust can only be "
    "confirmed by comparing a stored medium-range forecast against the rainfall "
    "that was actually measured at the same place and time. No such forecast or "
    "observation archive is bundled here, so no comparison rows can be shown."
)

NO_CASES_MESSAGE = (
    "No case archive is attached to this prototype. Adding one would require a "
    "curated record of past bust events, each with the archived forecast, the "
    "observed rainfall, and the model probability for the same cell — none of "
    "which is available in this deployment."
)

# Field documentation for an archive record, surfaced by the API so an operator
# knows exactly what to supply.
VERIFICATION_RECORD_SHAPE = {
    "latitude": "float, degrees north",
    "longitude": "float, degrees east",
    "valid_time": "ISO-8601 timestamp of the forecast target period",
    "issue_time": "ISO-8601 timestamp the forecast was issued",
    "lead_hours": "float, forecast lead time in hours",
    "forecast_rainfall": "float, accumulated precipitation in mm",
    "reference_rainfall": "float, observed or reanalysis precipitation in mm",
    "reference_source": "string naming the observation product",
}

CASE_RECORD_SHAPE = {
    "event_id": "stable identifier",
    "name": "short event title",
    "date": "period the event occurred",
    "latitude": "float, degrees north",
    "longitude": "float, degrees east",
    "state": "string",
    "forecast_rainfall_mm": "float, from the archived forecast",
    "observed_rainfall_mm": "float, from the observation record",
    "lead_days": "int, forecast lead time in days",
    "model_bust_probability": "float, produced by running this model on the archived inputs",
    "synoptic_cause": "string",
}


class VerificationService:
    """Verification and case-archive lookups.

    Every method returns the same envelope whether or not an archive is attached,
    so the frontend can render one consistent "data not available" state.
    """

    def __init__(self) -> None:
        self._verification: Optional[List[Dict[str, Any]]] = None
        self._cases: Optional[List[Dict[str, Any]]] = None

    @staticmethod
    def load_archive(path: str, label: str) -> Optional[List[Dict[str, Any]]]:
        """Read a JSON array of records from ``path``, or return None."""
        if not path or not os.path.isfile(path):
            return None
        try:
            import json

            with open(path, "r", encoding="utf-8") as handle:
                data = json.load(handle)
            if not isinstance(data, list):
                raise ValueError("archive must be a JSON array of records")
            logger.info("Loaded %d %s records from %s", len(data), label, path)
            return data
        except Exception as exc:  # pragma: no cover - operational path
            logger.error("Could not read %s archive at %s: %s", label, path, exc)
            return None

    def _verification_records(self) -> Optional[List[Dict[str, Any]]]:
        if self._verification is None:
            self._verification = self.load_archive(
                VERIFICATION_ARCHIVE_PATH, "verification"
            )
        return self._verification

    def _case_records(self) -> Optional[List[Dict[str, Any]]]:
        if self._cases is None:
            self._cases = self.load_archive(CASE_ARCHIVE_PATH, "case")
        return self._cases

    def get_verification(self) -> Dict[str, Any]:
        """Forecast vs reference comparison, if an archive is attached."""
        records = self._verification_records()

        if not records:
            return {
                "available": False,
                "results": [],
                "total_points": 0,
                "bust_count": 0,
                "reliable_count": 0,
                "message": NOT_CONNECTED_MESSAGE,
                "expected_record_shape": VERIFICATION_RECORD_SHAPE,
                "reference_dataset": None,
            }

        for record in records:
            forecast = record.get("forecast_rainfall")
            reference = record.get("reference_rainfall")
            if (
                isinstance(forecast, (int, float))
                and isinstance(reference, (int, float))
                and "absolute_error" not in record
            ):
                record["absolute_error"] = round(abs(forecast - reference), 4)
            if "bust_status" not in record and "bust_threshold" in record:
                record["bust_status"] = record["absolute_error"] > record["bust_threshold"]

        return {
            "available": True,
            "results": records,
            "total_points": len(records),
            "bust_count": sum(1 for r in records if r.get("bust_status")),
            "reliable_count": sum(1 for r in records if not r.get("bust_status")),
            "message": "Forecast versus reference comparison, read from the attached archive.",
            "expected_record_shape": VERIFICATION_RECORD_SHAPE,
            "reference_dataset": records[0].get("reference_source"),
        }

    def get_historical_events(self) -> Dict[str, Any]:
        """Documented bust cases, if a case archive is attached."""
        records = self._case_records()

        if not records:
            return {
                "available": False,
                "results": [],
                "total_events": 0,
                "critical_events": 0,
                "detection_rate": None,
                "source": None,
                "message": NO_CASES_MESSAGE,
                "expected_record_shape": CASE_RECORD_SHAPE,
            }

        return {
            "available": True,
            "results": records,
            "total_events": len(records),
            "critical_events": sum(1 for e in records if e.get("severity") == "CRITICAL"),
            "detection_rate": None,
            "source": records[0].get("source"),
            "message": "Case archive, read from the attached file.",
            "expected_record_shape": CASE_RECORD_SHAPE,
        }


# Singleton instance
verification_service = VerificationService()
