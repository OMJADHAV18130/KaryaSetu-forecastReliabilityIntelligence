from app.ml.model_loader import model_loader
from app.ml.predictor import predictor

# Test with grid profile (8.4375, 73.125)
features = {
    "total_precipitation_24hr": 0.0085,
    "2m_temperature": 28.5 + 273.15,
    "mean_sea_level_pressure": 1010.5 * 100.0,
    "10m_u_component_of_wind": 4.8,
    "10m_v_component_of_wind": 2.5,
    "specific_humidity_850": 0.0152,
    "geopotential_500": 5850.0 * 9.81,
    "vertical_velocity_500": -0.15,
    "longitude": 73.125,
    "latitude": 8.4375,
    "lead_hours": 96.0,
}
result = predictor.predict(features)
print(f"Grid point (8.4N, 73.1E): bust={result['bust_probability']:.4f}, conf={result['confidence']:.4f}")

# Test high-risk point (25.3125, 90.0) with high precipitation
features["total_precipitation_24hr"] = 0.065
features["vertical_velocity_500"] = -0.75
features["latitude"] = 25.3125
features["longitude"] = 90.0
features["specific_humidity_850"] = 0.0178
result2 = predictor.predict(features)
print(f"High-risk point (25.3N, 90.0E): bust={result2['bust_probability']:.4f}, conf={result2['confidence']:.4f}")

# Test the spec example
features["total_precipitation_24hr"] = 0.0482
features["vertical_velocity_500"] = -0.31
features["latitude"] = 19.6875
features["longitude"] = 73.125
features["specific_humidity_850"] = 0.017
features["2m_temperature"] = 298.4
features["mean_sea_level_pressure"] = 99750
features["geopotential_500"] = 56300
result3 = predictor.predict(features)
print(f"Spec example (19.7N, 73.1E): bust={result3['bust_probability']:.4f}, conf={result3['confidence']:.4f}")
