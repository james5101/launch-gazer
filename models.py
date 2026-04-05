from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class PadInfo(BaseModel):
    model_config = ConfigDict(frozen=True)

    name: str
    location: str
    lat: float
    lon: float


class StreamURL(BaseModel):
    model_config = ConfigDict(frozen=True)

    url: str
    title: str
    description: str
    feature_image: str | None   # thumbnail URL; empty string normalised to None
    type_name: str              # flattened from vidURL["type"]["name"]


class LaunchSummary(BaseModel):
    model_config = ConfigDict(frozen=True)

    id: str
    name: str
    provider: str
    rocket: str
    scheduled_at: datetime | None
    status: str
    pad: PadInfo
    streams: list[StreamURL] = Field(default_factory=list)
    webcast_live: bool = False


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


class TwilightPlumeInfo(BaseModel):
    model_config = ConfigDict(frozen=True)

    sun_altitude_deg: float          # sun's altitude at launch time; negative = below horizon
    shadow_altitude_km: float | None # altitude (km) where plume first enters direct sunlight
    quality: str                     # "Excellent" | "Good" | "Possible" | "No effect"
    headline: str
    description: str
    best_window_start_sec: int | None  # T+ seconds when plume becomes illuminated
    best_window_end_sec: int | None    # T+ seconds when rocket typically leaves easy view


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
    twilight: TwilightPlumeInfo | None = None
