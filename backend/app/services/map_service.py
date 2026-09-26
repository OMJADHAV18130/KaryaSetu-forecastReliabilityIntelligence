"""
Map Service — Provides grid data and spatial processing for map visualization.
"""

import logging
from typing import Dict, Any, List, Optional
from collections import deque

import numpy as np

logger = logging.getLogger("karyasetu")

# Real grid data from Untitled9.ipynb Cell 80
GRID_DATA = [
    {"lat": 10.5669, "lon": 72.6420, "confidence": 0.930371, "bust": 0.069629, "region": "Lakshadweep / Arabian Sea"},
    {"lat": 8.5241, "lon": 77.8500, "confidence": 0.940531, "bust": 0.059469, "region": "Tamil Nadu (South / Kanyakumari)"},
    {"lat": 10.2000, "lon": 80.5000, "confidence": 0.921797, "bust": 0.078203, "region": "Tamil Nadu Coast / Palk Bay"},
    {"lat": 10.5000, "lon": 92.5000, "confidence": 0.922537, "bust": 0.077463, "region": "Andaman Sea (South)"},
    {"lat": 7.0000, "lon": 93.8500, "confidence": 0.951882, "bust": 0.048118, "region": "Nicobar Islands (Indira Point)"},
    {"lat": 14.8150, "lon": 74.1300, "confidence": 0.881251, "bust": 0.118749, "region": "Goa / Konkan Coast"},
    {"lat": 14.4670, "lon": 78.8240, "confidence": 0.931380, "bust": 0.068620, "region": "Rayalaseema / South Andhra"},
    {"lat": 15.5000, "lon": 81.5000, "confidence": 0.882672, "bust": 0.117328, "region": "Andhra Coastal Waters"},
    {"lat": 12.5000, "lon": 92.8000, "confidence": 0.852682, "bust": 0.147318, "region": "Middle Andaman"},
    {"lat": 11.6234, "lon": 92.7265, "confidence": 0.818915, "bust": 0.181085, "region": "Andaman Islands (Port Blair)"},
    {"lat": 19.0760, "lon": 73.0000, "confidence": 0.786042, "bust": 0.213958, "region": "Maharashtra / Mumbai MMR"},
    {"lat": 19.6875, "lon": 78.7500, "confidence": 0.822296, "bust": 0.177704, "region": "Telangana / Vidarbha"},
    {"lat": 19.6875, "lon": 85.0000, "confidence": 0.821840, "bust": 0.178160, "region": "Odisha Coastal Plain"},
    {"lat": 20.8000, "lon": 87.5000, "confidence": 0.818190, "bust": 0.181810, "region": "North Bay of Bengal / Digha Coast"},
    {"lat": 23.5000, "lon": 92.8000, "confidence": 0.888221, "bust": 0.111779, "region": "Mizoram / Tripura Frontier"},
    {"lat": 25.3125, "lon": 72.8000, "confidence": 0.935670, "bust": 0.064330, "region": "Rajasthan / Marwar"},
    {"lat": 25.3125, "lon": 78.7500, "confidence": 0.855969, "bust": 0.144031, "region": "Madhya Pradesh (Gwalior / Jhansi)"},
    {"lat": 25.3125, "lon": 84.3750, "confidence": 0.851446, "bust": 0.148554, "region": "Bihar / Gangetic Plains"},
    {"lat": 25.5000, "lon": 91.5000, "confidence": 0.844658, "bust": 0.155342, "region": "Meghalaya / Assam"},
    {"lat": 25.3125, "lon": 94.2000, "confidence": 0.904199, "bust": 0.095801, "region": "Nagaland / Manipur"},
    {"lat": 30.9375, "lon": 75.3412, "confidence": 0.988495, "bust": 0.011505, "region": "Punjab (Ludhiana / Jalandhar)"},
    {"lat": 30.3165, "lon": 78.0322, "confidence": 0.990536, "bust": 0.009464, "region": "Uttarakhand / Himachal (Dehradun)"},
    {"lat": 30.0668, "lon": 80.2000, "confidence": 0.991860, "bust": 0.008140, "region": "Uttarakhand Himalayas (Pithoragarh)"},
    {"lat": 27.5861, "lon": 92.0000, "confidence": 0.991976, "bust": 0.008024, "region": "Arunachal Pradesh (Tawang / Kameng)"},
    {"lat": 28.2180, "lon": 95.3000, "confidence": 0.988674, "bust": 0.011326, "region": "Arunachal Pradesh (Dibang / Siang)"},
    {"lat": 34.5000, "lon": 74.8000, "confidence": 0.992290, "bust": 0.007710, "region": "Jammu & Kashmir (Kashmir Valley / Gurez)"},
    {"lat": 34.1526, "lon": 77.5771, "confidence": 0.992234, "bust": 0.007766, "region": "Ladakh (Leh / Indus Valley)"},
    {"lat": 33.8000, "lon": 78.8000, "confidence": 0.992239, "bust": 0.007761, "region": "Eastern Ladakh (Pangong / Changthang)"},
    {"lat": 27.5330, "lon": 88.5122, "confidence": 0.992216, "bust": 0.007784, "region": "Sikkim (Gangtok / Himalayas)"},
    {"lat": 28.6000, "lon": 96.5000, "confidence": 0.992150, "bust": 0.007850, "region": "Arunachal Pradesh (Lohit / Anjaw)"},
]

# Meteorological profiles per grid point
GRID_METEOROLOGY = {
    (10.5669, 72.6420): {"tp": 0.0085, "t2m": 28.5, "mslp": 1010.5, "u10": 4.8, "v10": 2.5, "q850": 0.0152, "z500": 5850.0, "w500": -0.15},
    (8.5241, 77.8500): {"tp": 0.0068, "t2m": 29.0, "mslp": 1009.6, "u10": 4.8, "v10": 3.0, "q850": 0.0124, "z500": 5745.0, "w500": -0.11},
    (10.2000, 80.5000): {"tp": 0.0120, "t2m": 28.2, "mslp": 1009.2, "u10": 5.2, "v10": -2.0, "q850": 0.0160, "z500": 5835.0, "w500": -0.20},
    (10.5000, 92.5000): {"tp": 0.0145, "t2m": 28.0, "mslp": 1009.0, "u10": 4.5, "v10": -1.8, "q850": 0.0165, "z500": 5830.0, "w500": -0.22},
    (7.0000, 93.8500): {"tp": 0.0052, "t2m": 28.6, "mslp": 1010.2, "u10": 3.5, "v10": -1.2, "q850": 0.0148, "z500": 5840.0, "w500": -0.10},
    (14.8150, 74.1300): {"tp": 0.0227, "t2m": 24.9, "mslp": 1007.8, "u10": 6.5, "v10": 1.7, "q850": 0.0136, "z500": 5728.1, "w500": -0.22},
    (14.4670, 78.8240): {"tp": 0.0092, "t2m": 31.5, "mslp": 1008.5, "u10": 4.0, "v10": -2.5, "q850": 0.0118, "z500": 5820.0, "w500": -0.16},
    (15.5000, 81.5000): {"tp": 0.0180, "t2m": 28.8, "mslp": 1006.5, "u10": 6.8, "v10": -3.5, "q850": 0.0155, "z500": 5790.0, "w500": -0.35},
    (12.5000, 92.8000): {"tp": 0.0240, "t2m": 28.1, "mslp": 1005.8, "u10": 7.2, "v10": -4.0, "q850": 0.0168, "z500": 5775.0, "w500": -0.45},
    (11.6234, 92.7265): {"tp": 0.0285, "t2m": 27.8, "mslp": 1005.0, "u10": 7.8, "v10": -4.5, "q850": 0.0172, "z500": 5760.0, "w500": -0.52},
    (19.0760, 73.0000): {"tp": 0.0105, "t2m": 24.7, "mslp": 1004.3, "u10": 3.8, "v10": 2.3, "q850": 0.0136, "z500": 5726.0, "w500": 0.07},
    (19.6875, 78.7500): {"tp": 0.0184, "t2m": 26.2, "mslp": 1005.1, "u10": 4.1, "v10": -1.8, "q850": 0.0142, "z500": 5755.0, "w500": -0.38},
    (19.6875, 85.0000): {"tp": 0.0382, "t2m": 27.5, "mslp": 998.4, "u10": 8.5, "v10": -4.2, "q850": 0.0171, "z500": 5712.0, "w500": -0.58},
    (20.8000, 87.5000): {"tp": 0.0350, "t2m": 27.9, "mslp": 999.5, "u10": 8.1, "v10": -4.0, "q850": 0.0175, "z500": 5720.0, "w500": -0.55},
    (23.5000, 92.8000): {"tp": 0.0150, "t2m": 27.0, "mslp": 1006.2, "u10": 4.2, "v10": -2.2, "q850": 0.0140, "z500": 5800.0, "w500": -0.25},
    (25.3125, 72.8000): {"tp": 0.0015, "t2m": 38.5, "mslp": 1004.8, "u10": 5.2, "v10": -1.2, "q850": 0.0065, "z500": 5860.0, "w500": 0.25},
    (25.3125, 78.7500): {"tp": 0.0160, "t2m": 32.0, "mslp": 1004.2, "u10": 3.5, "v10": -2.0, "q850": 0.0128, "z500": 5820.0, "w500": -0.28},
    (25.3125, 84.3750): {"tp": 0.0240, "t2m": 30.2, "mslp": 1003.5, "u10": 2.8, "v10": -2.1, "q850": 0.0145, "z500": 5810.0, "w500": -0.32},
    (25.5000, 91.5000): {"tp": 0.0650, "t2m": 24.0, "mslp": 1002.0, "u10": 3.5, "v10": -3.8, "q850": 0.0178, "z500": 5780.0, "w500": -0.75},
    (25.3125, 94.2000): {"tp": 0.0260, "t2m": 24.5, "mslp": 1005.5, "u10": 2.5, "v10": -2.0, "q850": 0.0145, "z500": 5810.0, "w500": -0.35},
    (30.9375, 75.3412): {"tp": 0.0042, "t2m": 32.5, "mslp": 1007.2, "u10": 4.0, "v10": -0.5, "q850": 0.0085, "z500": 5840.0, "w500": 0.05},
    (30.3165, 78.0322): {"tp": 0.0320, "t2m": 16.5, "mslp": 1008.0, "u10": 2.1, "v10": 1.5, "q850": 0.0095, "z500": 5760.0, "w500": -0.65},
    (30.0668, 80.2000): {"tp": 0.0120, "t2m": 12.0, "mslp": 1012.0, "u10": 3.5, "v10": 1.0, "q850": 0.0068, "z500": 5720.0, "w500": -0.40},
    (27.5861, 92.0000): {"tp": 0.0180, "t2m": 10.5, "mslp": 1014.0, "u10": 3.2, "v10": 0.8, "q850": 0.0062, "z500": 5700.0, "w500": -0.45},
    (28.2180, 95.3000): {"tp": 0.0220, "t2m": 14.0, "mslp": 1011.0, "u10": 2.8, "v10": -1.2, "q850": 0.0085, "z500": 5740.0, "w500": -0.50},
    (34.5000, 74.8000): {"tp": 0.0035, "t2m": 6.0, "mslp": 1016.0, "u10": 5.5, "v10": 1.8, "q850": 0.0045, "z500": 5680.0, "w500": -0.12},
    (34.1526, 77.5771): {"tp": 0.0020, "t2m": 2.5, "mslp": 1018.0, "u10": 7.2, "v10": 2.1, "q850": 0.0032, "z500": 5650.0, "w500": -0.08},
    (33.8000, 78.8000): {"tp": 0.0018, "t2m": 1.0, "mslp": 1019.0, "u10": 6.8, "v10": 1.5, "q850": 0.0028, "z500": 5630.0, "w500": -0.06},
    (27.5330, 88.5122): {"tp": 0.0015, "t2m": 0.5, "mslp": 1020.0, "u10": 6.2, "v10": 1.2, "q850": 0.0025, "z500": 5620.0, "w500": -0.05},
    (28.6000, 96.5000): {"tp": 0.0022, "t2m": 3.0, "mslp": 1017.5, "u10": 5.8, "v10": 1.0, "q850": 0.0030, "z500": 5640.0, "w500": -0.08},
}


class MapService:
    """Service for map data, grid predictions, and risk area detection."""

    def get_grid_data(self) -> List[Dict[str, Any]]:
        """Return the 30-point grid with metadata."""
        return GRID_DATA

    def get_meteorology_profile(self, lat: float, lon: float) -> Optional[Dict[str, Any]]:
        """Get meteorology profile for a grid point."""
        return GRID_METEOROLOGY.get((lat, lon))

    def get_all_meteorology_profiles(self) -> List[Dict[str, Any]]:
        """Get all meteorology profiles with coordinates."""
        profiles = []
        for point in GRID_DATA:
            key = (point["lat"], point["lon"])
            prof = GRID_METEOROLOGY.get(key)
            if prof:
                profiles.append({
                    "lat": point["lat"],
                    "lon": point["lon"],
                    "region": point["region"],
                    **prof,
                })
        return profiles

    def detect_risk_areas(self, predictions: List[Dict[str, Any]], threshold: float = 0.5) -> List[Dict[str, Any]]:
        """
        Detect high-risk areas from grid predictions using spatial clustering.
        This is post-processing of model predictions, NOT a separate ML model.

        Args:
            predictions: List of prediction results with lat/lon/bust_probability
            threshold: Probability threshold for high-risk cells

        Returns:
            List of risk areas with bounding boxes and statistics
        """
        # Filter high-risk cells
        high_risk = [p for p in predictions if p["bust_probability"] >= threshold]

        if not high_risk:
            return []

        # Simple spatial clustering using grid adjacency
        areas = []
        visited = set()

        for i, cell in enumerate(high_risk):
            if i in visited:
                continue

            # BFS to find connected high-risk cells
            cluster = []
            queue = deque([i])
            visited.add(i)

            while queue:
                idx = queue.popleft()
                cluster.append(high_risk[idx])

                # Find neighbors (adjacent grid cells)
                for j, other in enumerate(high_risk):
                    if j in visited:
                        continue
                    dist = np.sqrt(
                        (high_risk[idx]["latitude"] - other["latitude"]) ** 2 +
                        (high_risk[idx]["longitude"] - other["longitude"]) ** 2
                    )
                    if dist < 6.0:  # Grid spacing is ~5.625 degrees
                        visited.add(j)
                        queue.append(j)

            # Compute area statistics
            if cluster:
                bust_probs = [c["bust_probability"] for c in cluster]
                confidences = [c["confidence"] for c in cluster]
                lats = [c["latitude"] for c in cluster]
                lons = [c["longitude"] for c in cluster]

                area = {
                    "area_id": f"area_{len(areas) + 1}",
                    "cell_count": len(cluster),
                    "average_probability": round(np.mean(bust_probs), 4),
                    "maximum_probability": round(max(bust_probs), 4),
                    "minimum_confidence": round(min(confidences), 4),
                    "bounding_box": {
                        "min_lat": round(min(lats), 4),
                        "max_lat": round(max(lats), 4),
                        "min_lon": round(min(lons), 4),
                        "max_lon": round(max(lons), 4),
                    },
                    "method": "spatial_clustering_post_processing",
                }
                areas.append(area)

        return areas


# Singleton instance
map_service = MapService()
