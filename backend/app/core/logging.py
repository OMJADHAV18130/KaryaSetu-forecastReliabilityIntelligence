"""
Logging configuration for the FastAPI application.
"""

import logging
import sys
from datetime import datetime


def setup_logging(level: str = "INFO") -> logging.Logger:
    """Configure application logging."""
    logger = logging.getLogger("karyasetu")
    logger.setLevel(getattr(logging, level.upper(), logging.INFO))

    if not logger.handlers:
        handler = logging.StreamHandler(sys.stdout)
        handler.setLevel(getattr(logging, level.upper(), logging.INFO))
        formatter = logging.Formatter(
            "%(asctime)s | %(name)s | %(levelname)s | %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S",
        )
        handler.setFormatter(formatter)
        logger.addHandler(handler)

    return logger


def log_prediction(
    logger: logging.Logger,
    request_id: str,
    endpoint: str,
    model_version: str,
    lead_hours: float,
    success: bool,
    bust_probability: float = None,
):
    """Log prediction request details."""
    status = "SUCCESS" if success else "FAILURE"
    msg = (
        f"request_id={request_id} | endpoint={endpoint} | "
        f"model_version={model_version} | lead_hours={lead_hours} | "
        f"status={status}"
    )
    if bust_probability is not None:
        msg += f" | bust_probability={bust_probability:.4f}"
    logger.info(msg)
