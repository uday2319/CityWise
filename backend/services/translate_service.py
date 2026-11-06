"""
Text translation for the Voice Translator.

Uses Google Cloud Translation when GOOGLE_TRANSLATE_API_KEY is set, otherwise
the free MyMemory service. The key stays on the server.
"""

import html
import re
from typing import Optional

import httpx

from backend.core.config import settings
from backend.services.http_client import get_client

LANGUAGES = {
    "en": "English", "kn": "Kannada", "hi": "Hindi", "ta": "Tamil",
    "te": "Telugu", "ml": "Malayalam", "es": "Spanish", "fr": "French",
    "de": "German", "ja": "Japanese", "ko": "Korean",
}

GOOGLE_URL = "https://translation.googleapis.com/language/translate/v2"
MYMEMORY_URL = "https://api.mymemory.translated.net/get"
LOW_CONFIDENCE = 0.5

# Writing systems of the languages that don't use the Latin alphabet.
_SCRIPTS = {
    "hi": r"[\u0900-\u097F]",
    "kn": r"[\u0C80-\u0CFF]",
    "ta": r"[\u0B80-\u0BFF]",
    "te": r"[\u0C00-\u0C7F]",
    "ml": r"[\u0D00-\u0D7F]",
    "ja": r"[\u3040-\u30FF\u4E00-\u9FFF]",
    "ko": r"[\uAC00-\uD7AF]",
}


class TranslationError(Exception):
    """A translation could not be produced. The message is shown to users."""


def active_provider() -> str:
    return "google" if settings.GOOGLE_TRANSLATE_API_KEY else "mymemory"


def _clean(text: str) -> str:
    """Remove the inline markup MyMemory sometimes leaves in results."""
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", "", text))).strip()


def _is_plausible(text: str, target: str) -> bool:
    """Rejects results that are visibly not written in the target language."""
    if target in _SCRIPTS:
        return re.search(_SCRIPTS[target], text) is not None
    if target == "en":
        non_ascii = sum(not char.isascii() for char in text)
        return non_ascii <= len(text) * 0.05
    return True


def _mymemory_candidates(data: dict, result: dict) -> list[tuple[str, Optional[float]]]:
    """
    Results in order of trust. The headline result is often a crowd-sourced
    memory entry, which has returned the wrong meaning and even the wrong
    language with full confidence, so machine translations ("MT!") go first.
    """
    matches = [m for m in data.get("matches") or [] if isinstance(m, dict)]
    ordered = [m for m in matches if m.get("created-by") == "MT!"]
    ordered.append({"translation": result.get("translatedText"), "match": result.get("match")})
    ordered += [m for m in matches if m.get("created-by") != "MT!"]
    return [(_clean(str(m.get("translation") or "")), m.get("match")) for m in ordered]


async def _translate_google(text: str, source: str, target: str) -> dict:
    try:
        response = await get_client().post(
            GOOGLE_URL,
            params={"key": settings.GOOGLE_TRANSLATE_API_KEY},
            json={"q": text, "source": source, "target": target, "format": "text"},
        )
        response.raise_for_status()
        translated = response.json()["data"]["translations"][0]["translatedText"]
    except httpx.HTTPError as exc:
        # str(exc) may include the request URL, and with it the API key.
        print(f"  [Translate] Google request failed: {type(exc).__name__}")
        raise TranslationError("The translation service is unavailable.")
    except (KeyError, IndexError, ValueError):
        raise TranslationError("The translation service sent an unreadable reply.")

    return {"translated_text": html.unescape(translated), "provider": "google",
            "confidence": None, "warning": None}


async def _translate_mymemory(text: str, source: str, target: str) -> dict:
    params = {"q": text, "langpair": f"{source}|{target}", "mt": 1}
    try:
        response = await get_client().get(MYMEMORY_URL, params=params)
        response.raise_for_status()
        data = response.json()
    except (httpx.HTTPError, ValueError) as exc:
        print(f"  [Translate] MyMemory request failed: {exc}")
        raise TranslationError("The translation service is unavailable.")

    # Failures can arrive as ordinary text inside a 200 response.
    result = data.get("responseData") or {}
    headline = _clean(str(result.get("translatedText") or ""))
    status = str(data.get("responseStatus"))

    if data.get("quotaFinished") or "MYMEMORY WARNING" in headline:
        raise TranslationError("The free daily translation limit has been reached.")
    if status != "200" or not headline:
        raise TranslationError("The translation service could not translate this.")

    for translated, confidence in _mymemory_candidates(data, result):
        if translated and _is_plausible(translated, target):
            break
    else:
        raise TranslationError("The translation service could not translate this reliably.")

    warning = None
    if translated.casefold() == text.casefold():
        warning = "The service returned the text unchanged, so it may not be translated."
    elif isinstance(confidence, (int, float)) and confidence < LOW_CONFIDENCE:
        warning = "This translation is low confidence. Check it before relying on it."

    return {"translated_text": translated, "provider": "mymemory",
            "confidence": confidence, "warning": warning}


async def translate_text(text: str, source: str, target: str) -> dict:
    if settings.GOOGLE_TRANSLATE_API_KEY:
        return await _translate_google(text, source, target)
    return await _translate_mymemory(text, source, target)
