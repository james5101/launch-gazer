from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    launch_library_base_url: str = "https://ll.thespacedevs.com/2.2.0"
    launch_cache_ttl_seconds: int = 300  # 5 minutes — stay within free tier rate limits

    # Visibility distance thresholds (km)
    visibility_great_km: float = 500.0
    visibility_good_km: float = 1500.0

    # Weather — Open-Meteo (free, no API key)
    open_meteo_base_url: str = "https://api.open-meteo.com/v1"
    weather_cache_ttl_seconds: int = 1800  # 30 minutes


settings = Settings()
