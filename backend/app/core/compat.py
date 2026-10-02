"""
Compatibility shims for OS environments (such as Windows WDAC / Application Control)
where specific unsigned native binaries in site-packages may be restricted.
"""

import sys
import types


def apply_sklearn_compatibility_shims():
    """
    Ensure sklearn and xgboost can import even if _dist_metrics.pyd is blocked
    by Windows Application Control / Smart App Control policies.
    """
    try:
        from sklearn.metrics import _dist_metrics
    except Exception:
        # Provide lightweight mock for _dist_metrics if blocked by OS policy
        d_dist = types.ModuleType("sklearn.metrics._dist_metrics")
        d_dist.DistanceMetric = type("DistanceMetric", (), {})
        d_dist.BOOL_METRICS = []
        d_dist.METRIC_MAPPING64 = {}
        sys.modules["sklearn.metrics._dist_metrics"] = d_dist

        d_pdr = types.ModuleType("sklearn.metrics._pairwise_distances_reduction")

        class DummyArgKmin:
            @classmethod
            def valid_metrics(cls):
                return []

        class DummyRadiusNeighbors:
            @classmethod
            def valid_metrics(cls):
                return []

        d_pdr.ArgKmin = DummyArgKmin
        d_pdr.RadiusNeighbors = DummyRadiusNeighbors
        sys.modules["sklearn.metrics._pairwise_distances_reduction"] = d_pdr
        sys.modules["sklearn.metrics._pairwise_distances_reduction._dispatcher"] = (
            types.ModuleType("sklearn.metrics._pairwise_distances_reduction._dispatcher")
        )


apply_sklearn_compatibility_shims()
