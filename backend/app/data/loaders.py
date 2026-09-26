"""
Data loaders for WeatherBench2 HRES and ERA5 data.
Used by train_model.py for full training pipeline.
"""

import logging
from typing import Optional

logger = logging.getLogger("karyasetu")


def load_hres_data(path: str = None):
    """Load WeatherBench2 HRES data from GCS."""
    try:
        import xarray as xr
        import numpy as np

        if path is None:
            path = "gs://weatherbench2/datasets/hres/2016-2022-0012-64x32_equiangular_conservative.zarr"

        ds = xr.open_zarr(path, storage_options={"token": "anon"})
        return ds
    except ImportError:
        raise RuntimeError("xarray and gcsfs required for GCS data loading")
    except Exception as e:
        raise RuntimeError(f"Failed to load HRES data: {e}")


def load_era5_data(path: str = None):
    """Load ERA5 reanalysis data from GCS."""
    try:
        import xarray as xr

        if path is None:
            path = "gs://weatherbench2/datasets/era5/1959-2022-6h-64x32_equiangular_conservative.zarr"

        ds = xr.open_zarr(path, storage_options={"token": "anon"})
        return ds
    except ImportError:
        raise RuntimeError("xarray and gcsfs required for GCS data loading")
    except Exception as e:
        raise RuntimeError(f"Failed to load ERA5 data: {e}")


def select_india_domain(ds):
    """Select India domain from dataset."""
    import numpy as np

    return ds.sel(
        time=slice("2019-06-01", "2019-09-30"),
        prediction_timedelta=slice(np.timedelta64(24, "h"), np.timedelta64(240, "h")),
        latitude=slice(8, 37),
        longitude=slice(68, 98),
    )
