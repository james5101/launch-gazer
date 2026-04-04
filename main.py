from contextlib import asynccontextmanager
from pathlib import Path
from typing import AsyncGenerator

import httpx
from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from routers import direction, launches

_CLIENT_DIST = Path(__file__).parent / "client" / "dist"


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    async with httpx.AsyncClient(timeout=10.0) as client:
        app.state.http_client = client
        yield


app = FastAPI(
    title="WhereToLook",
    description="Find out where to look in the sky for a rocket launch.",
    version="0.1.0",
    lifespan=lifespan,
)

app.include_router(launches.router)
app.include_router(direction.router)

# Serve the built React app in production (client/dist must exist)
if _CLIENT_DIST.exists():
    app.mount("/assets", StaticFiles(directory=_CLIENT_DIST / "assets"), name="assets")

    @app.get("/favicon.svg", include_in_schema=False)
    async def favicon() -> FileResponse:
        return FileResponse(_CLIENT_DIST / "favicon.svg")

    @app.get("/", include_in_schema=False)
    async def index() -> FileResponse:
        return FileResponse(_CLIENT_DIST / "index.html")
