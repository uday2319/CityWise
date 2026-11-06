"""
One HTTP client shared by outbound calls in async routes.

Creating an httpx client loads the TLS certificates, which blocks the event
loop. Sharing one avoids that and reuses connections.
"""

from typing import Optional

import httpx

_client: Optional[httpx.AsyncClient] = None


def get_client() -> httpx.AsyncClient:
    global _client
    if _client is None:
        _client = httpx.AsyncClient(timeout=15)
    return _client


async def close_client() -> None:
    global _client
    if _client is not None:
        await _client.aclose()
        _client = None
