import httpx
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import HTMLResponse

from dependencies import get_http_client
from models import LaunchSummary
from services.launches import get_launch_by_id, get_upcoming_launches
from template import render_launch_html

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


@router.get("/{launch_id}", response_model=None)
async def get_or_render_launch(
    launch_id: str,
    request: Request,
    client: httpx.AsyncClient = Depends(get_http_client),
) -> LaunchSummary | HTMLResponse:
    """
    Returns JSON (LaunchSummary) for API calls, or HTML with launch-specific
    meta tags for browser/crawler navigation. Differentiated by Accept header:
    explicit 'application/json' → JSON; anything else → HTML.
    """
    try:
        launch = await get_launch_by_id(launch_id, client)
    except httpx.HTTPStatusError as exc:
        raise HTTPException(status_code=502, detail="Failed to fetch launch data") from exc
    except httpx.RequestError as exc:
        raise HTTPException(status_code=503, detail="Launch data service unavailable") from exc

    if launch is None:
        raise HTTPException(status_code=404, detail="Launch not found")

    # Frontend API calls explicitly set Accept: application/json → return JSON
    if "application/json" in request.headers.get("accept", ""):
        return launch

    # Browser / social crawler navigation → return HTML with launch-specific meta tags
    page_html = render_launch_html(launch)
    if not page_html:
        # dist not built yet (dev without dist) — fall back to JSON
        return launch
    return HTMLResponse(content=page_html)
