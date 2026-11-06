from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from backend.services.translate_service import (
    LANGUAGES,
    TranslationError,
    active_provider,
    translate_text,
)

router = APIRouter()


class TranslateRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=500)
    source: str = Field(..., min_length=2, max_length=5)
    target: str = Field(..., min_length=2, max_length=5)


@router.get("/languages")
async def languages():
    return {"languages": LANGUAGES, "provider": active_provider()}


@router.post("")
async def translate(request: TranslateRequest):
    if not request.text.strip():
        raise HTTPException(status_code=422, detail="Nothing to translate")
    if request.source not in LANGUAGES or request.target not in LANGUAGES:
        raise HTTPException(status_code=422, detail="Unsupported language")
    if request.source == request.target:
        raise HTTPException(status_code=422, detail="Choose two different languages")

    try:
        return await translate_text(request.text.strip(), request.source, request.target)
    except TranslationError as exc:
        raise HTTPException(status_code=502, detail=str(exc))
