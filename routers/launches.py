import httpx
from fastapi import APIRouter, Depends, HTTPException

from dependencies import get_http_client
from models import LaunchSummary
from services.launches import get_upcoming_launches

router = APIRouter(prefix="/launches", tags=["launches"])


@router.get("/upcoming", response_model=list[LaunchSummary])
async def upcoming_launches(
    client: httpx.AsyncClient = Depends(get_http_client),
) -> list[LaunchSummary]:
    try:
        return await get_upcoming_launches(client)
    except httpx.HTTPStatusError as exc:
        raise HTTPException(status_code=502, detail="Failed to fetch launch data") from exc
    except httpx.RequestError as exc:
        raise HTTPException(status_code=503, detail="Launch data service unavailable") from exc
