# WhereToLook — Claude Project Memory

## What This Project Does
Web app that tells users where to look in the sky for an upcoming rocket launch. Given the user's GPS coordinates and a launch selection, it returns a compass bearing, distance, and weather-based viewing likelihood.

## How to Run

### Development (two terminals)
```bash
# Terminal 1 — backend
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Terminal 2 — frontend (proxies /launches → :8000)
cd client
npm run dev   # http://localhost:5173
```

### Production
```bash
cd client && npm run build
python -m uvicorn main:app --host 0.0.0.0 --port 8000
# FastAPI now serves client/dist/ at http://localhost:8000/
```

## Install Dependencies
```bash
# Backend
pip install -r requirements.txt

# Frontend
cd client && npm install
```

## Project Structure
```
# Backend (root)
main.py                  FastAPI app, lifespan (shared httpx.AsyncClient), mounts client/dist in prod
                         Also serves /favicon.svg, /robots.txt, /sitemap.xml, SPA catch-all
config.py                pydantic-settings — reads from .env, all defaults provided
dependencies.py          get_http_client() — injects app.state.http_client via Depends()
models.py                All Pydantic v2 models (frozen=True throughout)
calculations.py          Pure math functions — no side effects, no I/O
template.py              SSR HTML rendering — injects launch-specific meta tags into dist/index.html
routers/
  launches.py            GET /launches/upcoming; GET /launches/{id} (JSON or HTML via Accept header)
  direction.py           GET /launches/{id}/direction?lat=&lon=
services/
  launches.py            Launch Library 2 API client + 5-min in-memory cache
  weather.py             Open-Meteo API client + 30-min in-memory cache
requirements.txt         fastapi, uvicorn[standard], httpx, pydantic-settings
Dockerfile               Multi-stage: node:22-slim builds React, python:3.12-slim runs FastAPI
fly.toml                 Fly.io config — app=launch-gazer, region=iad, port=8080
.github/workflows/
  deploy.yml             GitHub Actions → flyctl deploy --remote-only (FLY_API_TOKEN secret)

# Frontend (client/)
client/
  vite.config.ts         Vite 8 + @tailwindcss/vite plugin; three targeted /launches proxies with
                         bypass() so browser navigation to /launches/:id gets SPA, not backend
  src/
    main.tsx             Wraps App in BrowserRouter
    App.tsx              Routes shell: / → LaunchList, /launches/:id → LaunchDetailScreen
    api/
      types.ts           TypeScript mirrors of all Pydantic models
      client.ts          getUpcomingLaunches(), getLaunchById(), getDirection()
                         All requests set Accept: application/json header
    components/
      StarField.tsx      Canvas star background (160 stars, fixed, requestAnimationFrame)
      LaunchList.tsx     Mission select screen
      LaunchCard.tsx     Single mission row; <Link to="/launches/:id" state={{ autoStart: true }}>
      LaunchDetailScreen.tsx  Detail page — info/loading/direction sub-states; autoStart skips info
                              screen when navigating from list; direct URLs show info page first
      SkyView.tsx        Direction screen — SVG compass, bearing, weather + twilight + streams cards
      WeatherCard.tsx    Viewing conditions card with colour-coded likelihood badge
      TwilightCard.tsx   Twilight plume predictor card — SVG geometry diagram, quality badge
      StreamsCard.tsx    Watch Live card — stream links with thumbnails, pulsing LIVE badge,
                         empty state for launches with no streams yet
      Countdown.tsx      Live ticking T-minus / LAUNCHED display
    hooks/
      useLaunches.ts     Fetches on mount, { launches, loading, error }
      useLaunch.ts       Fetches single launch by ID, cancel-on-unmount, { launch, loading, error }
      useDirection.ts    Fetches when launchId + lat + lon all set
      useGeolocation.ts  Wraps navigator.geolocation.getCurrentPosition
    index.css            Tailwind v4 (CSS config) + space theme tokens (pure black, cyan accent)
```

## Frontend Tech Stack
- **React 19 + Vite 8** — `@rolldown/binding-win32-x64-msvc` required on Windows (native binary)
- **Tailwind v4** — CSS-based config (`@import "tailwindcss"`), no `tailwind.config.js`
- **shadcn/ui** — component library; requires Tailwind v4 (incompatible with v3)
- **Design**: SpaceX/Tesla-inspired minimalist — pure black background, Space Grotesk headings, JetBrains Mono for coords/countdown, mission cyan (`#00E5FF`) accent
- **`@` alias** → `client/src/` (configured in `vite.config.ts` and `tsconfig.json`)

## API Endpoints

### `GET /launches/upcoming` → `list[LaunchSummary]`
Fetches next 10 launches from Launch Library 2. Cached 5 min (free tier: ~15 req/hr).

### `GET /launches/{launch_id}` → `LaunchSummary` (JSON) or HTML
Content-negotiated via `Accept` header. `application/json` → JSON for API calls. Anything else (browsers, crawlers) → `HTMLResponse` with launch-specific meta/OG tags injected by `template.py`. Falls back to JSON if `client/dist` not built.

### `GET /launches/{launch_id}/direction?lat=&lon=` → `DirectionResponse`
Returns bearing, distance, countdown, distance-based visibility note, weather conditions at the user's location, and a viewing likelihood score (0–100). Weather is **non-fatal** — if Open-Meteo fails, `weather` and `likelihood` fields are `null` and the endpoint still succeeds.

## Data Sources
| Source | Purpose | Auth | Rate limit |
|---|---|---|---|
| Launch Library 2 (`ll.thespacedevs.com/2.2.0`) | Launch schedule + pad coords | None | ~15 req/hr free |
| Open-Meteo (`api.open-meteo.com/v1`) | Weather at user location | None | Generous free tier |

## Key Models (`models.py`)
- `PadInfo` — launch pad name, location string, lat, lon
- `StreamURL` — url, title, description, feature_image (str|None), type_name (flattened from LL2's `type.name`)
- `LaunchSummary` — id, name, provider, rocket, scheduled_at, status, pad, streams (list[StreamURL], default []), webcast_live (bool, default False)
- `WeatherConditions` — cloud_cover_pct, visibility_km, precipitation_probability_pct, description
- `ViewingLikelihood` — score (0–100), label (Excellent/Good/Fair/Poor/Very Poor), summary
- `TwilightPlumeInfo` — sun_altitude_deg, shadow_altitude_km, quality, headline, description, best_window_start_sec, best_window_end_sec
- `DirectionResponse` — bearing_deg, bearing_label, distance_km, elevation_deg, visibility_note, countdown_seconds, weather, likelihood, twilight

All models use `ConfigDict(frozen=True)`.

## Key Calculations (`calculations.py`)
- `haversine(lat1, lon1, lat2, lon2) -> float` — great-circle distance in km
- `bearing(lat1, lon1, lat2, lon2) -> float` — compass bearing 0–360°
- `bearing_label(deg) -> str` — 8-point compass label
- `visibility_note(distance_km) -> str` — text based on distance thresholds from config
- `viewing_likelihood(cloud_cover_pct, visibility_km, precipitation_probability_pct) -> ViewingLikelihood`
  - Cloud cover: 70 pts weight
  - Precipitation probability: 20 pts weight
  - Visibility (1–10 km range): 10 pts weight
- `sun_altitude_deg(lat, lon, dt) -> float` — NOAA Solar Calculator (pure Python, no deps)
- `twilight_plume_prediction(lat, lon, launch_dt) -> TwilightPlumeInfo` — quality tiers:
  - ≥0°: No effect (daytime)
  - −1° to 0°: Good
  - −4° to −1°: Excellent
  - −6° to −4°: Good
  - −12° to −6°: Possible
  - <−12°: No effect (night)

## Conventions & Patterns
- **All new endpoints** get `response_model=` explicitly set
- **All new services** follow the async pattern: `async def get_x(..., client: httpx.AsyncClient)`
- **Caching**: in-memory dict with `time.monotonic()` TTL check at the service layer. Cache key for weather is `(round(lat, 2), round(lon, 2))` (~1 km grid)
- **Error handling in routers**: `HTTPStatusError` → 502, `RequestError` → 503
- **Config**: add new settings to `config.py` with sensible defaults; they're auto-readable from `.env`
- **Pure functions** go in `calculations.py` — no I/O, no imports from services

## What's Conservative (MVP)
- Elevation is always `0.0` / "Look toward the horizon" — rocket is treated as being at the launch pad
- No trajectory modelling yet

## Deployment
- **Live URL**: https://launchgazer.app/ (Fly.io, app name: `launch-gazer`, region: `iad`)
- **Manual deploy**: `fly deploy` from project root (uses `Dockerfile`, pushes to Fly.io remote builder)
- **GitHub Actions CI** (`deploy.yml`): auto-deploys on push to `main` using `FLY_API_TOKEN` secret — **working** (fixed 2026-04-05)
- **Docker build**:
  - Node stage copies only `client/package.json` (NOT `package*.json`) to exclude Windows-pinned `package-lock.json`, then `npm install` resolves Linux-native bindings
  - Python stage `COPY` line **explicitly names every root-level `.py` file**. Any new module (e.g. `template.py`) must be added to this line or it silently won't exist in the image → `ModuleNotFoundError` → 502 on startup

## Windows-Specific Notes (Vite 8)
Vite 8 uses rolldown + lightningcss which require platform native binaries npm may skip on Windows. If `npm run dev` fails, manually install:
```bash
npm install @rolldown/binding-win32-x64-msvc lightningcss-win32-x64-msvc @tailwindcss/oxide-win32-x64-msvc
```
**Do NOT save these to `package.json` dependencies** — they cause `EBADPLATFORM` in Linux Docker builds.

## SEO Status (as of 2026-04-05)
All tracked as GitHub issues on `james5101/launch-gazer`.

### Done
- Meta tags: title, description, Open Graph, Twitter/X card, canonical — `client/index.html`
- `/robots.txt` and `/sitemap.xml` FastAPI endpoints — `main.py`
- `base_url` setting added to `config.py` (default: `https://launchgazer.app`)
- Registered on Google Search Console and Bing Webmaster Tools
- Sitemap submitted to both
- ~~james5101/launch-gazer#4~~ — Per-launch URL pages with SSR meta tags (2026-04-05, PR #12)
  - `template.py`, `GET /launches/{id}`, React Router, `useLaunch.ts`, `LaunchDetailScreen.tsx`
  - `autoStart` state on `LaunchCard` skips info page for list navigation; direct URLs show info first
  - Dynamic sitemap includes all upcoming launch URLs

### Pending (issues)
- james5101/launch-gazer#3 — Create OG image (`client/public/og-image.png`, 1200×630 PNG)
- james5101/launch-gazer#5 — JSON-LD Event structured data (depends on #4, now done)
- james5101/launch-gazer#6 — Server-render landing page copy on `/`
- james5101/launch-gazer#7 — Blog/guide content strategy (long-term)

## Backlog (GitHub Issues)
All tracked at https://github.com/james5101/launch-gazer/issues

| Issue | Title |
|-------|-------|
| #3  | Create OG image for social sharing |
| #5  | SEO: Add JSON-LD Event structured data to launch pages |
| #6  | SEO: Server-render landing page copy on / |
| #7  | SEO: Blog/guide content strategy |
| #8  | Feature: Trajectory arc endpoint |
| #9  | Feature: Real-time bearing/elevation tracking during launch |
| #10 | Tests: Unit tests for calculations.py |

~~**Twilight plume predictor**~~ — DONE (2026-04-04), not tracked as issue
~~**Per-launch URL pages / SSR meta tags (#4)**~~ — DONE (2026-04-05, PR #12)
~~**Fix GitHub Actions CI (#2)**~~ — DONE (2026-04-05)
~~**Livestream URLs**~~ — DONE (2026-04-05), not tracked as issue
  - `StreamURL` model + `streams`/`webcast_live` fields on `LaunchSummary`
  - `_parse_stream()` helper in `services/launches.py` — defensive, malformed entries filtered
  - `StreamsCard.tsx` on SkyView direction screen — thumbnails, external links, pulsing LIVE badge, empty state
