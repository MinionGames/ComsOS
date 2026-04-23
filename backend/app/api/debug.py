from fastapi import APIRouter, Request

router = APIRouter()


@router.get("/ping")
async def ping(request: Request):
    # Return some request header info to help debug CORS / Authorization
    origin = request.headers.get("origin")
    auth = request.headers.get("authorization")
    return {
        "ok": True,
        "origin": origin,
        "authorization_present": bool(auth),
        "headers_sample": {k: v for k, v in list(request.headers.items())[:10]},
    }
