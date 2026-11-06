import asyncio
import html
import re
from typing import Optional

import httpx
from fastapi import APIRouter, Query

from backend.services.http_client import get_client

router = APIRouter()

WIKIPEDIA_API = "https://en.wikipedia.org/w/api.php"
COMMONS_API = "https://commons.wikimedia.org/w/api.php"
# Wikimedia requires clients to identify themselves with a project URL.
HEADERS = {"User-Agent": "CityWise/1.0 (https://github.com/uday2319/CityWise) httpx"}
MAX_CACHE = 1000

_photo_cache: dict[str, dict] = {}

# A page of cards asks for many photos at once; stay gentle with Wikipedia.
_wikipedia_slots = asyncio.Semaphore(4)


def _tokens(text: str) -> set[str]:
    return set(re.findall(r"\w+", text.lower()))


def _matches_place(page: dict, name: str, context: Optional[str]) -> bool:
    """
    Search results are often unrelated pages, and a wrong photo is worse
    than none: every word of the place name must be in the page title, and
    the page must mention the city when one is given.
    """
    title = page.get("title", "")
    context_words = _tokens(context or "")
    required = (_tokens(name) - context_words) or _tokens(name)
    if not required or not required <= _tokens(title):
        return False
    if context and context.lower() not in f"{title} {page.get('extract', '')}".lower():
        return False
    return True


def _strip_markup(text: str) -> str:
    return html.unescape(re.sub(r"<[^>]+>", "", text)).strip()


async def _commons_photo(name: str, context: str, width: int) -> Optional[dict]:
    """
    A photo file on Wikimedia Commons for places without a Wikipedia article.
    Filenames are less reliable than article titles, so the file must name
    both the place and its city.
    """
    params = {
        "action": "query",
        "format": "json",
        "generator": "search",
        "gsrnamespace": 6,
        "gsrsearch": f"{name} {context}",
        "gsrlimit": 5,
        "prop": "imageinfo",
        "iiprop": "url|mime|extmetadata",
        "iiurlwidth": width,
        "iiextmetadatafilter": "Artist|LicenseShortName",
    }
    async with _wikipedia_slots:
        response = await get_client().get(
            COMMONS_API, params=params, headers=HEADERS, timeout=10
        )
    response.raise_for_status()

    pages = sorted(
        response.json().get("query", {}).get("pages", {}).values(),
        key=lambda p: p.get("index", 0),
    )
    required = (_tokens(name) - _tokens(context)) or _tokens(name)

    for page in pages:
        info = (page.get("imageinfo") or [{}])[0]
        title_words = _tokens(page.get("title", ""))
        if info.get("mime") != "image/jpeg" or not info.get("thumburl"):
            continue
        if not required <= title_words or not _tokens(context) <= title_words:
            continue
        metadata = info.get("extmetadata", {})
        artist = _strip_markup(metadata.get("Artist", {}).get("value", ""))
        licence = metadata.get("LicenseShortName", {}).get("value", "")
        return {
            "found": True,
            "url": info["thumburl"],
            "title": page.get("title", "").removeprefix("File:").rsplit(".", 1)[0],
            "description": None,
            "source_url": info.get("descriptionurl"),
            "credit": ", ".join(part for part in (artist[:80], licence) if part) or None,
        }
    return None


@router.get("/photo")
async def place_photo(
    query: str = Query(..., min_length=2, max_length=150),
    context: Optional[str] = Query(None, max_length=100),
    width: int = Query(800, ge=200, le=2000),
):
    """
    Look up a photo and short description on Wikipedia.
    Returns found=false when no page confidently matches the place.
    """
    key = f"{query.lower()}|{(context or '').lower()}|{width}"
    if key in _photo_cache:
        return _photo_cache[key]

    params = {
        "action": "query",
        "format": "json",
        "generator": "search",
        "gsrsearch": f"{query} {context or ''}".strip(),
        "gsrlimit": 3,
        "prop": "pageimages|extracts|info",
        "inprop": "url",
        "piprop": "thumbnail",
        "pithumbsize": width,
        "pilimit": 3,
        "exintro": 1,
        "explaintext": 1,
        "exsentences": 2,
        "exlimit": 3,
    }

    try:
        async with _wikipedia_slots:
            response = await get_client().get(
                WIKIPEDIA_API, params=params, headers=HEADERS, timeout=10
            )
        response.raise_for_status()
        data = response.json()
    except (httpx.HTTPError, ValueError) as exc:
        # Transient failure: report it, but do not cache it.
        print(f"  [Media] Photo lookup failed for '{query}': {exc}")
        return {"found": False}

    pages = sorted(
        data.get("query", {}).get("pages", {}).values(),
        key=lambda p: p.get("index", 0),
    )

    result: dict = {"found": False}
    for page in pages:
        url = page.get("thumbnail", {}).get("source")
        if url and _matches_place(page, query, context):
            result = {
                "found": True,
                "url": url,
                "title": page.get("title"),
                "description": html.unescape(page.get("extract", "")).strip() or None,
                "source_url": page.get("fullurl"),
                "credit": "Wikipedia",
            }
            break

    if not result["found"] and context:
        try:
            result = await _commons_photo(query, context, width) or result
        except (httpx.HTTPError, ValueError) as exc:
            print(f"  [Media] Commons lookup failed for '{query}': {exc}")
            return result

    if len(_photo_cache) < MAX_CACHE:
        _photo_cache[key] = result
    return result
