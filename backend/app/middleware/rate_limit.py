from __future__ import annotations

import threading
import time
from collections import defaultdict, deque
from dataclasses import dataclass
from typing import Deque, Dict, Tuple

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse


@dataclass(frozen=True)
class RateLimitConfig:
    enabled: bool = True
    max_requests: int = 120
    window_seconds: int = 60


class InMemoryRateLimitMiddleware(BaseHTTPMiddleware):
    """Simple per-client-IP fixed-window-ish limiter using timestamp buckets."""

    def __init__(self, app, config: RateLimitConfig):
        super().__init__(app)
        self.config = config
        self._lock = threading.Lock()
        self._hits: Dict[Tuple[str, str], Deque[float]] = defaultdict(deque)

    def _client_ip(self, request: Request) -> str:
        # Respect proxy forwarding headers when present.
        xff = request.headers.get("x-forwarded-for", "").strip()
        if xff:
            return xff.split(",")[0].strip()
        xrip = request.headers.get("x-real-ip", "").strip()
        if xrip:
            return xrip
        if request.client and request.client.host:
            return request.client.host
        return "unknown"

    def _is_exempt(self, path: str, method: str) -> bool:
        if method == "OPTIONS":
            return True
        if path in {"/health", "/docs", "/redoc", "/openapi.json"}:
            return True
        return False

    async def dispatch(self, request: Request, call_next):
        if not self.config.enabled or self._is_exempt(request.url.path, request.method):
            return await call_next(request)

        now = time.time()
        window_start = now - max(1, self.config.window_seconds)
        key = (self._client_ip(request), request.url.path)

        with self._lock:
            bucket = self._hits[key]
            while bucket and bucket[0] <= window_start:
                bucket.popleft()

            if len(bucket) >= max(1, self.config.max_requests):
                retry_after = int(max(1, self.config.window_seconds - (now - bucket[0])))
                return JSONResponse(
                    status_code=429,
                    content={"detail": "Rate limit exceeded. Please try again shortly."},
                    headers={
                        "Retry-After": str(retry_after),
                        "X-RateLimit-Limit": str(max(1, self.config.max_requests)),
                        "X-RateLimit-Remaining": "0",
                        "X-RateLimit-Window": str(max(1, self.config.window_seconds)),
                    },
                )

            bucket.append(now)
            remaining = max(0, max(1, self.config.max_requests) - len(bucket))

        response = await call_next(request)
        response.headers["X-RateLimit-Limit"] = str(max(1, self.config.max_requests))
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        response.headers["X-RateLimit-Window"] = str(max(1, self.config.window_seconds))
        return response
