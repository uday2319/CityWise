"""
One HTTP client shared by outbound calls in async routes.

Creating an httpx client loads the TLS certificates, which blocks the event
loop. Sharing one avoids that and reuses connections.
"""

import asyncio
from typing import Optional

import httpx

_client: Optional[httpx.AsyncClient] = None


def get_client() -> httpx.AsyncClient:
    global _client
    if _client is None:
        _client = httpx.AsyncClient(timeout=15)
    return _client


async def get_with_retry(url: str, **kwargs) -> httpx.Response:
    """GET that waits out brief connection and DNS failures."""
    for delay in (0.5, 1.5):
        try:
            return await get_client().get(url, **kwargs)
        except httpx.ConnectError:
            await asyncio.sleep(delay)
    return await get_client().get(url, **kwargs)


async def close_client() -> None:
    global _client
    if _client is not None:
        await _client.aclose()
        _client = None
