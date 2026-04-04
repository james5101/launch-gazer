import math

from config import settings
from models import ViewingLikelihood

_EARTH_RADIUS_KM = 6371.0

_COMPASS_LABELS = [
    "North", "Northeast", "East", "Southeast",
    "South", "Southwest", "West", "Northwest",
]


def haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Great-circle distance in km between two lat/lon points."""
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    d_phi = math.radians(lat2 - lat1)
    d_lam = math.radians(lon2 - lon1)

    a = math.sin(d_phi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(d_lam / 2) ** 2
    return _EARTH_RADIUS_KM * 2 * math.asin(math.sqrt(a))


def bearing(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Initial compass bearing (0–360°) from point 1 to point 2."""
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    d_lam = math.radians(lon2 - lon1)

    y = math.sin(d_lam) * math.cos(phi2)
    x = math.cos(phi1) * math.sin(phi2) - math.sin(phi1) * math.cos(phi2) * math.cos(d_lam)
    return (math.degrees(math.atan2(y, x)) + 360) % 360


def bearing_label(deg: float) -> str:
    """Map a bearing in degrees to an 8-point compass label."""
    index = round(deg / 45) % 8
    return _COMPASS_LABELS[index]


def viewing_likelihood(
    cloud_cover_pct: float,
    visibility_km: float,
    precipitation_probability_pct: float,
) -> ViewingLikelihood:
    """Score the likelihood of seeing a launch based on weather conditions at the viewer's location.

    Scoring weights:
      - Cloud cover:    70 pts  (clear sky = full points, overcast = 0)
      - Precipitation:  20 pts  (0% chance = full points, 100% = 0)
      - Visibility:     10 pts  (≥10 km = full, scales linearly to 0 at 1 km)
    """
    cloud_score = (1 - cloud_cover_pct / 100) * 70
    precip_score = (1 - precipitation_probability_pct / 100) * 20
    vis_score = max(0.0, min(1.0, (visibility_km - 1) / 9)) * 10  # 1–10 km range
    score = int(round(cloud_score + precip_score + vis_score))

    if score >= 80:
        label, summary = "Excellent", "Clear skies — great viewing conditions."
    elif score >= 60:
        label, summary = "Good", "Mostly clear — you should have a good view."
    elif score >= 40:
        label, summary = "Fair", "Partial cloud cover — viewing may be interrupted."
    elif score >= 20:
        label, summary = "Poor", "Heavy cloud cover or precipitation likely."
    else:
        label, summary = "Very Poor", "Overcast or stormy — launch unlikely to be visible."

    return ViewingLikelihood(score=score, label=label, summary=summary)


def visibility_note(distance_km: float) -> str:
    if distance_km <= settings.visibility_great_km:
        return f"At {distance_km:.0f} km, the launch should be clearly visible to the naked eye."
    if distance_km <= settings.visibility_good_km:
        return f"At {distance_km:.0f} km, the launch may be visible as a bright moving light."
    return (
        f"At {distance_km:.0f} km, the launch is unlikely to be visible to the naked eye, "
        "but you may see the exhaust plume in twilight conditions."
    )
