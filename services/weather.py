import time
from datetime import datetime, timezone
from typing import Any

import httpx

from config import settings
from models import WeatherConditions

# WMO weather code → human-readable description
# https://open-meteo.com/en/docs#weathervariables
_WMO_DESCRIPTIONS: dict[int, str] = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Foggy",
    48: "Icy fog",
    51: "Light drizzle",
    53: "Moderate drizzle",
    55: "Dense drizzle",
    61: "Slight rain",
    63: "Moderate rain",
    65: "Heavy rain",
    71: "Slight snow",
    73: "Moderate snow",
    75: "Heavy snow",
    80: "Slight showers",
    81: "Moderate showers",
    82: "Violent showers",
    95: "Thunderstorm",
    99: "Thunderstorm with hail",
}

# Simple in-memory cache: key → (data, fetched_at)
_cache: dict[tuple[float, float], tuple[Any, float]] = {}


def _cache_key(lat: float, lon: float) -> tuple[float, float]:
    """Round to ~1 km grid to maximise cache hits for nearby coordinates."""
    return (round(lat, 2), round(lon, 2))


def _pick_hourly_slot(times: list[str], target: datetime) -> int:
    """Return the index of the hourly slot closest to *target* (UTC)."""
    target_ts = target.timestamp()
    best_idx, best_diff = 0, float("inf")
    for i, t in enumerate(times):
        # Open-Meteo returns ISO strings like "2026-04-10T14:00"
        slot_ts = datetime.fromisoformat(t).replace(tzinfo=timezone.utc).timestamp()
        diff = abs(slot_ts - target_ts)
        if diff < best_diff:
            best_diff, best_idx = diff, i
    return best_idx


async def get_weather_at_launch(
    lat: float,
    lon: float,
    launch_time: datetime | None,
    client: httpx.AsyncClient,
) -> WeatherConditions | None:
    """Fetch weather conditions at *lat/lon* for the hour closest to *launch_time*.

    Returns None on any error — weather is non-fatal for the direction endpoint.
    """
    key = _cache_key(lat, lon)
    now = time.monotonic()

    cached = _cache.get(key)
    if cached is not None:
        data, fetched_at = cached
        if now - fetched_at < settings.weather_cache_ttl_seconds:
            return _extract_conditions(data, launch_time)

    try:
        response = await client.get(
            f"{settings.open_meteo_base_url}/forecast",
            params={
                "latitude": lat,
                "longitude": lon,
                "hourly": "cloud_cover,visibility,precipitation_probability,weather_code",
                "forecast_days": 3,
                "timezone": "UTC",
            },
        )
        response.raise_for_status()
    except (httpx.HTTPStatusError, httpx.RequestError):
        return None

    data = response.json()
    _cache[key] = (data, now)
    return _extract_conditions(data, launch_time)


def _extract_conditions(data: dict[str, Any], launch_time: datetime | None) -> WeatherConditions | None:
    try:
        hourly = data["hourly"]
        times: list[str] = hourly["time"]
        target = launch_time if launch_time is not None else datetime.now(tz=timezone.utc)
        idx = _pick_hourly_slot(times, target)

        cloud_cover = float(hourly["cloud_cover"][idx])
        visibility_m = float(hourly["visibility"][idx])
        precip_prob = float(hourly["precipitation_probability"][idx])
        wmo_code = int(hourly["weather_code"][idx])

        description = _WMO_DESCRIPTIONS.get(wmo_code, f"Weather code {wmo_code}")

        return WeatherConditions(
            cloud_cover_pct=cloud_cover,
            visibility_km=round(visibility_m / 1000, 1),
            precipitation_probability_pct=precip_prob,
            description=description,
        )
    except (KeyError, IndexError, ValueError, TypeError):
        return None
