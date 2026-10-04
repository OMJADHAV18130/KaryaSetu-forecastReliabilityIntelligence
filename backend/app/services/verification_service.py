"""
Verification Service — model skill against observed truth, plus forecast vs
reference comparison rows and historical case records.

Two different things live here, and the response keeps them apart.

``model_skill``
    Verification the prototype can actually show: the tuned model's confusion
    matrix, discrimination scores, calibration effect and threshold sweep on the
    September 2019 held-out test set, transcribed from the notebook's own printed
    output into ``models/notebook_evaluation.json``. Every count and score on it
    was produced by running the notebook against reanalysis truth the model never
    saw. This is a fixed historical evaluation, not a running tally — nothing here
    updates as forecasts verify, and it must never be presented as a live
    operational statistic.

``archive``
    Per-location forecast-versus-observation rows. This prototype has no
    operational archive: confirming an individual bust needs stored medium-range
    forecasts paired with gauge or reanalysis observations, and no such archive is
    bundled. So this half reports ``available = False`` and returns no rows. It
    deliberately does NOT return sample or illustrative rows: a
    forecast/observation pair that was never measured would be indistinguishable
    from a real one once it reached the screen.

To make the archive half real, drop one in and point ``VERIFICATION_ARCHIVE_PATH``
at it — see :meth:`load_archive` for the record shape that is expected.
"""

import logging
import os
from typing import Any, Dict, List, Optional

from .model_service import _load_notebook_evaluation

logger = logging.getLogger("karyasetu")

VERIFICATION_ARCHIVE_PATH = os.getenv("VERIFICATION_ARCHIVE_PATH", "")
CASE_ARCHIVE_PATH = os.getenv("CASE_ARCHIVE_PATH", "")

NOT_CONNECTED_MESSAGE = (
    "This prototype has no verification archive attached. A bust can only be "
    "confirmed for an individual location by comparing a stored medium-range "
    "forecast against the rainfall that was actually measured at the same place "
    "and time. No such forecast or observation archive is bundled here, so no "
    "per-location comparison rows can be shown."
)

MODEL_SKILL_UNAVAILABLE_MESSAGE = (
    "The transcribed September 2019 evaluation file is missing, so no measured "
    "skill figures can be shown."
)

# Stated on every response carrying these figures, so a fixed historical
# evaluation cannot be misread as a live operational statistic.
MODEL_SKILL_PROVENANCE = (
    "September 2019 Test Set. Offline evaluation of the tuned model against "
    "reanalysis truth, on a fixed historical split the model was not fitted or "
    "tuned on. These are recorded results from that evaluation, not live "
    "operational statistics: nothing on this page updates as new forecasts "
    "verify, and the September 2019 split is not available in this deployment to "
    "re-score."
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

    def get_model_skill(self) -> Dict[str, Any]:
        """Measured skill of the tuned model on the September 2019 held-out set.

        Transcribed from the notebook's printed output, so nothing is recomputed
        here and nothing is invented. Returns ``available = False`` with a reason
        if the record is absent, rather than a plausible-looking table.
        """
        notebook = _load_notebook_evaluation() or {}
        record = notebook.get("held_out_test_metrics")
        sweep = notebook.get("threshold_sweep")

        if not record:
            return {
                "available": False,
                "label": None,
                "message": MODEL_SKILL_UNAVAILABLE_MESSAGE,
                "provenance": None,
            }

        matrix = record.get("confusion_matrix") or {}
        report = record.get("classification_report") or {}

        def _count(key: str) -> Optional[float]:
            value = matrix.get(key)
            return float(value) if isinstance(value, (int, float)) else None

        def _rate(numerator: Optional[float], denominator: Optional[float]) -> Optional[float]:
            """A share, or None when either side is missing or the base is zero."""
            if numerator is None or not denominator:
                return None
            return round(numerator / denominator, 6)

        tp = _count("true_positives")
        fp = _count("false_positives")
        fn = _count("false_negatives")

        # Restated from the published cells at full precision, because the
        # classification report rounds them to two decimals and the confusion
        # matrix is the thing a reader can check by hand. Null rather than filled
        # in when a count is absent, so a partial matrix cannot read as complete.
        precision_at_threshold = _rate(tp, None if tp is None or fp is None else tp + fp)
        recall_at_threshold = _rate(tp, None if tp is None or fn is None else tp + fn)

        return {
            "available": True,
            "label": record.get("label"),
            "provenance": MODEL_SKILL_PROVENANCE,
            "n_samples": record.get("n_samples"),
            "n_bust": record.get("n_bust"),
            "operating_threshold": record.get("operating_threshold"),
            "calibration_method": record.get("calibration_method"),
            "confusion_matrix": matrix,
            "classification_report": report,
            "roc_auc": record.get("roc_auc"),
            "pr_auc": record.get("pr_auc"),
            "mcc": record.get("mcc"),
            "brier_raw": record.get("brier_raw"),
            "brier_calibrated": record.get("brier_calibrated"),
            "precision_at_threshold": precision_at_threshold,
            "recall_at_threshold": recall_at_threshold,
            "threshold_sweep": sweep,
            "source_notebook": notebook.get("source_notebook"),
            "source_cells": record.get("source_cells"),
            "notes": record.get("notes"),
            "message": None,
        }

    def get_verification(self) -> Dict[str, Any]:
        """Measured model skill, plus the per-location archive when one is attached."""
        archive = self._verification_archive()

        return {
            "model_skill": self.get_model_skill(),
            "archive": archive,
        }

    def _verification_archive(self) -> Dict[str, Any]:
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
