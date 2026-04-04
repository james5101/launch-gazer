from datetime import datetime, timezone

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query

from calculations import bearing, bearing_label, haversine, viewing_likelihood, visibility_note
from dependencies import get_http_client
from models import DirectionResponse
from services.launches import get_launch_by_id
from services.weather import get_weather_at_launch

router = APIRouter(prefix="/launches", tags=["direction"])


@router.get("/{launch_id}/direction", response_model=DirectionResponse)
async def launch_direction(
    launch_id: str,
    lat: float = Query(..., ge=-90, le=90, description="User latitude"),
    lon: float = Query(..., ge=-180, le=180, description="User longitude"),
    client: httpx.AsyncClient = Depends(get_http_client),
) -> DirectionResponse:
    try:
        launch = await get_launch_by_id(launch_id, client)
    except httpx.HTTPStatusError as exc:
        raise HTTPException(status_code=502, detail="Failed to fetch launch data") from exc
    except httpx.RequestError as exc:
        raise HTTPException(status_code=503, detail="Launch data service unavailable") from exc

    if launch is None:
        raise HTTPException(status_code=404, detail=f"Launch '{launch_id}' not found")

    pad = launch.pad
    bear = bearing(lat, lon, pad.lat, pad.lon)
    dist = haversine(lat, lon, pad.lat, pad.lon)

    countdown: int | None = None
    if launch.scheduled_at is not None:
        now = datetime.now(tz=timezone.utc)
        delta = (launch.scheduled_at - now).total_seconds()
        countdown = max(0, int(delta))

    # Weather is non-fatal — failure yields None fields rather than an error
    weather = await get_weather_at_launch(lat, lon, launch.scheduled_at, client)
    likelihood = (
        viewing_likelihood(
            cloud_cover_pct=weather.cloud_cover_pct,
            visibility_km=weather.visibility_km,
            precipitation_probability_pct=weather.precipitation_probability_pct,
        )
        if weather is not None
        else None
    )

    return DirectionResponse(
        launch_id=launch.id,
        launch_name=launch.name,
        bearing_deg=round(bear, 1),
        bearing_label=bearing_label(bear),
        distance_km=round(dist, 1),
        elevation_deg=0.0,
        elevation_label="Look toward the horizon",
        visibility_note=visibility_note(dist),
        countdown_seconds=countdown,
        weather=weather,
        likelihood=likelihood,
    )
