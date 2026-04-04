from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class PadInfo(BaseModel):
    model_config = ConfigDict(frozen=True)

    name: str
    location: str
    lat: float
    lon: float


class LaunchSummary(BaseModel):
    model_config = ConfigDict(frozen=True)

    id: str
    name: str
    provider: str
    rocket: str
    scheduled_at: datetime | None
    status: str
    pad: PadInfo


class WeatherConditions(BaseModel):
    model_config = ConfigDict(frozen=True)

    cloud_cover_pct: float = Field(..., ge=0, le=100)
    visibility_km: float = Field(..., ge=0)
    precipitation_probability_pct: float = Field(..., ge=0, le=100)
    description: str


class ViewingLikelihood(BaseModel):
    model_config = ConfigDict(frozen=True)

    score: int = Field(..., ge=0, le=100)
    label: str   # "Excellent" | "Good" | "Fair" | "Poor" | "Very Poor"
    summary: str


class DirectionResponse(BaseModel):
    model_config = ConfigDict(frozen=True)

    launch_id: str
    launch_name: str
    bearing_deg: float = Field(..., ge=0, lt=360)
    bearing_label: str
    distance_km: float = Field(..., ge=0)
    elevation_deg: float = Field(default=0.0)
    elevation_label: str
    visibility_note: str
    countdown_seconds: int | None
    weather: WeatherConditions | None = None
    likelihood: ViewingLikelihood | None = None
