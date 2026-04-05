"""HTML template rendering for per-launch SSR meta tag injection."""
import html
import re
from pathlib import Path

from config import settings
from models import LaunchSummary

_DIST_INDEX = Path(__file__).parent / "client" / "dist" / "index.html"
_template_cache: str | None = None


def _get_template() -> str | None:
    global _template_cache
    if _template_cache is None and _DIST_INDEX.exists():
        _template_cache = _DIST_INDEX.read_text(encoding="utf-8")
    return _template_cache


def render_launch_html(launch: LaunchSummary) -> str:
    """Return index.html with launch-specific meta tags and static shell content."""
    template = _get_template()
    if not template:
        return ""

    name = html.escape(launch.name)
    provider = html.escape(launch.provider)
    rocket = html.escape(launch.rocket)
    pad_name = html.escape(launch.pad.name)
    pad_location = html.escape(launch.pad.location)
    scheduled = html.escape(launch.scheduled_at or "TBD")

    title = f"{name} — LaunchGazer"
    description = (
        f"Track {name} by {provider}, launching from {pad_location}. "
        f"Find the exact compass bearing from your location, live weather, "
        f"and twilight plume forecast."
    )
    url = f"{settings.base_url}/launches/{launch.id}"
    og_image = f"{settings.base_url}/og-image.png"

    new_seo = (
        f"<!-- SEO_START -->\n"
        f"    <title>{title}</title>\n"
        f'    <meta name="description" content="{description}" />\n'
        f"\n"
        f"    <!-- Open Graph -->\n"
        f'    <meta property="og:type" content="website" />\n'
        f'    <meta property="og:url" content="{url}" />\n'
        f'    <meta property="og:site_name" content="LaunchGazer" />\n'
        f'    <meta property="og:title" content="{title}" />\n'
        f'    <meta property="og:description" content="{description}" />\n'
        f'    <meta property="og:image" content="{og_image}" />\n'
        f"\n"
        f"    <!-- Twitter / X -->\n"
        f'    <meta name="twitter:card" content="summary_large_image" />\n'
        f'    <meta name="twitter:title" content="{title}" />\n'
        f'    <meta name="twitter:description" content="{description}" />\n'
        f'    <meta name="twitter:image" content="{og_image}" />\n'
        f"\n"
        f"    <!-- Canonical -->\n"
        f'    <link rel="canonical" href="{url}" />\n'
        f"    <!-- SEO_END -->"
    )

    new_shell = (
        f"<!-- SS_CONTENT_START -->\n"
        f'      <div id="ss-content">\n'
        f'        <div id="ss-inner">\n'
        f'          <p id="ss-label">Rocket Launch</p>\n'
        f"          <h1>{name}</h1>\n"
        f"          <p>{provider} &middot; {rocket}</p>\n"
        f"          <p>{pad_name} &mdash; {pad_location}</p>\n"
        f"          <p>Scheduled: {scheduled}</p>\n"
        f"        </div>\n"
        f"      </div>\n"
        f"      <!-- SS_CONTENT_END -->"
    )

    result = re.sub(
        r"<!-- SEO_START -->.*?<!-- SEO_END -->",
        new_seo,
        template,
        flags=re.DOTALL,
    )
    result = re.sub(
        r"<!-- SS_CONTENT_START -->.*?<!-- SS_CONTENT_END -->",
        new_shell,
        result,
        flags=re.DOTALL,
    )
    return result
