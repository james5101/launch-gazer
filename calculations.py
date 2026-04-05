import math
from datetime import datetime, timezone

from config import settings
from models import TwilightPlumeInfo, ViewingLikelihood

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


# ── Twilight plume predictor ───────────────────────────────────────────────────

def sun_altitude_deg(lat_deg: float, lon_deg: float, dt: datetime) -> float:
    """Solar altitude above the horizon in degrees (NOAA Solar Calculator algorithm).

    Returns positive values when the sun is above the horizon, negative below.
    Accuracy: ≈ ±0.01° — more than sufficient for twilight window classification.
    Pure math, no external dependencies.
    """
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)

    # Julian date
    jd = dt.timestamp() / 86400.0 + 2440587.5

    # Julian centuries from J2000.0
    jc = (jd - 2451545.0) / 36525.0

    # Geometric mean longitude of the sun (degrees)
    l0 = (280.46646 + jc * (36000.76983 + jc * 0.0003032)) % 360.0

    # Geometric mean anomaly of the sun (degrees)
    m = 357.52911 + jc * (35999.05029 - 0.0001537 * jc)
    m_r = math.radians(m)

    # Sun's equation of center
    c = (
        (1.914602 - jc * (0.004817 + 0.000014 * jc)) * math.sin(m_r)
        + (0.019993 - 0.000101 * jc) * math.sin(2 * m_r)
        + 0.000289 * math.sin(3 * m_r)
    )

    # Sun's true longitude → apparent longitude
    omega = 125.04 - 1934.136 * jc
    app_lon_r = math.radians((l0 + c) - 0.00569 - 0.00478 * math.sin(math.radians(omega)))

    # Mean obliquity of the ecliptic (degrees) + nutation correction
    obliq = (
        23.0
        + (26.0 + (21.448 - jc * (46.815 + jc * (0.00059 - jc * 0.001813))) / 60.0) / 60.0
        + 0.00256 * math.cos(math.radians(omega))
    )
    obliq_r = math.radians(obliq)

    # Sun's declination
    dec_r = math.asin(math.sin(obliq_r) * math.sin(app_lon_r))

    # Equation of time (minutes)
    l0_r = math.radians(l0)
    ecc = 0.016708634 - jc * (0.000042037 + 0.0000001267 * jc)
    y = math.tan(obliq_r / 2.0) ** 2
    eqt = 4.0 * math.degrees(
        y * math.sin(2 * l0_r)
        - 2 * ecc * math.sin(m_r)
        + 4 * ecc * y * math.sin(m_r) * math.cos(2 * l0_r)
        - 0.5 * y ** 2 * math.sin(4 * l0_r)
        - 1.25 * ecc ** 2 * math.sin(2 * m_r)
    )

    # True solar time (minutes, 0–1440)
    utc_min = dt.hour * 60.0 + dt.minute + dt.second / 60.0 + dt.microsecond / 60_000_000.0
    tst = (utc_min + eqt + 4.0 * lon_deg) % 1440.0

    # Solar hour angle (degrees) → solar zenith → altitude
    ha_r = math.radians(tst / 4.0 - 180.0)
    lat_r = math.radians(lat_deg)
    cos_z = max(-1.0, min(1.0,
        math.sin(lat_r) * math.sin(dec_r)
        + math.cos(lat_r) * math.cos(dec_r) * math.cos(ha_r)
    ))
    altitude = 90.0 - math.degrees(math.acos(cos_z))

    # Atmospheric refraction (degrees) — only meaningful near the horizon
    if altitude > 5.0:
        refr = (58.1 / math.tan(math.radians(altitude))
                - 0.07 / math.tan(math.radians(altitude)) ** 3) / 3600.0
    elif altitude > -0.575:
        refr = (1735.0 + altitude * (-518.2 + altitude * (103.4 + altitude * (-12.79 + altitude * 0.711)))) / 3600.0
    else:
        refr = 0.0

    return altitude + refr


def _shadow_altitude_km(sun_depression_deg: float) -> float:
    """Altitude (km) at which Earth's geometric shadow terminates.

    At this altitude, an object transitions from Earth's shadow into direct sunlight.
    Formula: h = R_earth × (1/cos(θ) - 1), where θ is the sun's depression angle.

    Examples:
      1° depression → ~1 km   (very early twilight, shadow almost at ground)
      3° depression → ~9 km   (shadow line in the stratosphere)
      6° depression → ~35 km  (end of civil twilight)
     10° depression → ~97 km  (mid nautical twilight)
    """
    dep_r = math.radians(abs(sun_depression_deg))
    return _EARTH_RADIUS_KM * (1.0 / math.cos(dep_r) - 1.0)


def _rocket_altitude_km(t_sec: float) -> float:
    """Approximate altitude (km) for a typical orbital launch vehicle at T+ seconds.

    Piecewise-linear fit to a representative LEO trajectory (Falcon 9-style).
    Used only to estimate when the rocket exits the shadow line — precision isn't critical.
    """
    if t_sec <= 0:
        return 0.0
    profile = [(0, 0), (60, 20), (120, 55), (180, 105), (300, 180), (480, 300)]
    for i in range(len(profile) - 1):
        t0, h0 = profile[i]
        t1, h1 = profile[i + 1]
        if t_sec <= t1:
            return h0 + (h1 - h0) * (t_sec - t0) / (t1 - t0)
    return profile[-1][1] + (t_sec - profile[-1][0]) * 0.5


def twilight_plume_prediction(
    lat_deg: float,
    lon_deg: float,
    launch_dt: datetime,
) -> TwilightPlumeInfo:
    """Predict the twilight exhaust plume effect for a launch.

    The effect occurs when the sun is just below the horizon (civil twilight).
    The rocket climbs above the Earth's shadow line and its exhaust plume
    catches direct sunlight, glowing brilliantly against a darkening sky.

    Quality tiers (based on sun depression angle at launch time):
      Daytime   (sun ≥ 0°):          No effect — sky too bright
      Good      (-1° to  0°):        Early twilight — plume lit, sky still bright
      Excellent (-4° to -1°):        Prime window — perfect contrast
      Good      (-6° to -4°):        Later civil twilight — plume lit at altitude
      Possible  (-12° to -6°):       Nautical twilight — high-altitude plume only
      Night     (sun < -12°):        No effect — rocket won't reach sunlit altitude
    """
    sun_alt = sun_altitude_deg(lat_deg, lon_deg, launch_dt)
    depression = -sun_alt  # positive when sun is below horizon

    # ── Daytime — no twilight effect ─────────────────────────────────────────
    if sun_alt >= 0.0:
        return TwilightPlumeInfo(
            sun_altitude_deg=round(sun_alt, 1),
            shadow_altitude_km=None,
            quality="No effect",
            headline="Daytime launch",
            description=(
                f"The sun is {sun_alt:.1f}° above the horizon — full daylight. "
                "The sky is too bright for the exhaust plume to glow visually. "
                "Expect the engine flame to be visible but no dramatic twilight display."
            ),
            best_window_start_sec=None,
            best_window_end_sec=None,
        )

    # ── Deep night — too dark ─────────────────────────────────────────────────
    if sun_alt <= -12.0:
        return TwilightPlumeInfo(
            sun_altitude_deg=round(sun_alt, 1),
            shadow_altitude_km=None,
            quality="No effect",
            headline="Night launch",
            description=(
                f"The sun is {abs(sun_alt):.1f}° below the horizon — full night. "
                "The Earth's shadow extends far beyond any visible altitude; the plume "
                "will not be sunlit. Look for the engine glow and any onboard lights instead."
            ),
            best_window_start_sec=None,
            best_window_end_sec=None,
        )

    # ── Twilight range: compute shadow line and illumination window ────────────
    shadow_alt = _shadow_altitude_km(depression)

    # Find T+ second when rocket first crosses the shadow line
    window_start: int | None = None
    for t in range(0, 600, 5):
        if _rocket_altitude_km(t) >= shadow_alt:
            window_start = t
            break
    window_end: int | None = 480 if window_start is not None else None  # ~8 min visible window

    def _fmt_t(sec: int) -> str:
        return f"T+{sec // 60}m {sec % 60:02d}s"

    # ── Score and describe ────────────────────────────────────────────────────
    if -1.0 < sun_alt <= 0.0:
        quality = "Good"
        headline = "Early twilight — plume will be sunlit"
        description = (
            f"The sun is just {abs(sun_alt):.1f}° below your horizon. "
            f"The shadow line sits at only {shadow_alt:.0f} km — the rocket will be in sunlight "
            f"almost immediately after launch. The sky is still relatively bright, so contrast "
            f"won't be dramatic, but the glowing plume should be clearly visible."
        )
    elif -4.0 < sun_alt <= -1.0:
        quality = "Excellent"
        headline = "Prime twilight window — spectacular plume expected"
        description = (
            f"The sun is {abs(sun_alt):.1f}° below your horizon — the sweet spot for twilight plume displays. "
            f"The Earth's shadow line sits at {shadow_alt:.0f} km. As the rocket climbs above this, "
            f"the exhaust plume will ignite in brilliant blue-white sunlight against the darkening sky. "
            f"Watch for the moment the plume 'lights up' around {_fmt_t(window_start or 60)} — "
            f"it can resemble a slow-moving jellyfish of fire."
        )
    elif -6.0 < sun_alt <= -4.0:
        quality = "Good"
        headline = f"Civil twilight — plume visible above {shadow_alt:.0f} km"
        description = (
            f"The sun is {abs(sun_alt):.1f}° below your horizon — late civil twilight. "
            f"The shadow line is at {shadow_alt:.0f} km; the rocket needs to climb for a couple of minutes "
            f"before the plume catches sunlight. "
            + (f"Look for the illumination to begin around {_fmt_t(window_start)}. " if window_start else "")
            + "The dark sky will provide good contrast for the lit plume."
        )
    else:
        # -12° to -6° — nautical twilight
        quality = "Possible"
        headline = f"Nautical twilight — high-altitude plume may be illuminated"
        description = (
            f"The sun is {abs(sun_alt):.1f}° below your horizon — nautical twilight. "
            f"The shadow line is very high at {shadow_alt:.0f} km. "
            + (
                f"The rocket reaches this altitude around {_fmt_t(window_start)}, so only the later "
                f"portion of the visible flight may show any plume illumination. "
                if window_start and window_start < 480
                else "The rocket may not reach sunlit altitude within the visible window. "
            )
            + "Sky will be dark, and engine glow will be prominent regardless."
        )

    return TwilightPlumeInfo(
        sun_altitude_deg=round(sun_alt, 1),
        shadow_altitude_km=round(shadow_alt, 1),
        quality=quality,
        headline=headline,
        description=description,
        best_window_start_sec=window_start,
        best_window_end_sec=window_end,
    )
