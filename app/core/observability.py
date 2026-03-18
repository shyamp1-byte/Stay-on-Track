import json
import time
import uuid
from typing import Callable, Optional

from fastapi import Request, Response


def _get_request_id(request: Request) -> str:
    rid = request.headers.get("X-Request-ID")
    if rid and rid.strip():
        return rid.strip()
    return str(uuid.uuid4())


def _json_log(payload: dict):
    print(json.dumps(payload, separators=(",", ":"), default=str))


async def observability_middleware(request: Request, call_next: Callable):
    request_id = _get_request_id(request)
    request.state.request_id = request_id

    start = time.perf_counter()
    status_code: Optional[int] = None

    try:
        response: Response = await call_next(request)
        status_code = response.status_code
        return response
    finally:
        latency_ms = int((time.perf_counter() - start) * 1000)

        user_id = getattr(request.state, "user_id", None)

        _json_log(
            {
                "service": "stay-on-track",
                "request_id": request_id,
                "user_id": str(user_id) if user_id else None,
                "method": request.method,
                "path": request.url.path,
                "status_code": status_code,
                "latency_ms": latency_ms,
            }
        )