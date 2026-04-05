import time
from typing import Any

import httpx

from config import settings
from models import LaunchSummary, PadInfo, StreamURL

_cache: dict[str, Any] = {"data": None, "fetched_at": 0.0}


def _parse_stream(raw_vid: Any) -> StreamURL | None:
    """Parse a single vidURL entry from Launch Library 2. Returns None on any error."""
    try:
        return StreamURL(
            url=raw_vid["url"],
            title=raw_vid.get("title") or "",
            description=raw_vid.get("description") or "",
            feature_image=raw_vid.get("feature_image") or None,
            type_name=raw_vid.get("type", {}).get("name") or "Stream",
        )
    except (KeyError, ValueError, TypeError):
        return None


def _parse_launch(raw: dict[str, Any]) -> LaunchSummary | None:
    try:
        pad_raw = raw["pad"]
        pad = PadInfo(
            name=pad_raw.get("name", "Unknown pad"),
            location=pad_raw.get("location", {}).get("name", "Unknown location"),
            lat=float(pad_raw["latitude"]),
            lon=float(pad_raw["longitude"]),
        )
        raw_vids = raw.get("vidURLs") or []
        streams = [s for v in raw_vids if (s := _parse_stream(v)) is not None]
        webcast_live = bool(raw.get("webcastLive", False))

        return LaunchSummary(
            id=raw["id"],
            name=raw.get("name", "Unknown launch"),
            provider=raw.get("launch_service_provider", {}).get("name", "Unknown provider"),
            rocket=raw.get("rocket", {}).get("configuration", {}).get("name", "Unknown rocket"),
            scheduled_at=raw.get("net"),
            status=raw.get("status", {}).get("name", "Unknown"),
            pad=pad,
            streams=streams,
            webcast_live=webcast_live,
        )
    except (KeyError, ValueError, TypeError):
        return None


async def get_upcoming_launches(client: httpx.AsyncClient) -> list[LaunchSummary]:
    now = time.monotonic()
    if _cache["data"] is not None and now - _cache["fetched_at"] < settings.launch_cache_ttl_seconds:
        return _cache["data"]

    response = await client.get(
        f"{settings.launch_library_base_url}/launch/upcoming/",
        params={"limit": 10, "mode": "detailed"},
    )
    response.raise_for_status()

    results: list[LaunchSummary] = []
    for raw in response.json().get("results", []):
        launch = _parse_launch(raw)
        if launch is not None:
            results.append(launch)

    _cache["data"] = results
    _cache["fetched_at"] = now
    return results


async def get_launch_by_id(launch_id: str, client: httpx.AsyncClient) -> LaunchSummary | None:
    launches = await get_upcoming_launches(client)
    for launch in launches:
        if launch.id == launch_id:
            return launch

    # Not in upcoming cache — fetch directly
    response = await client.get(f"{settings.launch_library_base_url}/launch/{launch_id}/")
    if response.status_code == 404:
        return None
    response.raise_for_status()
    return _parse_launch(response.json())
