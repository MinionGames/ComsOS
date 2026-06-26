from fastapi import FastAPI
import time
from fastapi.middleware.cors import CORSMiddleware
from app.api import auth, subjects, notes, uploads, cmm_service
from app.api.debug import router as debug_router
from app.api import ai as ai_api
from app.api import decks as decks_api
from app.api import cards as cards_api
from app.config import settings
import logging

app = FastAPI(title="ComsOS API")

logger = logging.getLogger("uvicorn.error")


@app.on_event("startup")
def on_startup():
    key = (settings.anthropic_api_key or "").strip()
    if not key:
        logger.error(
            "ANTHROPIC_API_KEY is not configured in environment; aborting startup"
        )
        # fail fast so the service does not run without credentials
        raise RuntimeError("ANTHROPIC_API_KEY is not configured in environment")

    try:
        masked = (key[:6] + "..." + key[-6:]) if len(key) > 12 else "(set)"
        logger.info("Anthropic API key present: %s", masked)
    except Exception:
        logger.exception("Failed to log Anthropic API key presence")

    # record start time for uptime reporting
    try:
        app.state.start_time = time.time()
    except Exception:
        logger.exception("Failed to set start_time on app.state")


app.add_middleware(
    CORSMiddleware,
    # Local dev may run Next.js on localhost, 127.0.0.1, or a LAN IP.
    # Keep explicit localhost origins and allow private-network origins via regex.
    allow_origins=[
        "https://comsos.legatusaisolutions.com",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
    ],
    allow_origin_regex=r"^http://(192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3})(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(subjects.router, prefix="/subjects", tags=["subjects"])
app.include_router(notes.router, prefix="/notes", tags=["notes"])
app.include_router(uploads.router, prefix="/uploads", tags=["uploads"])
app.include_router(decks_api.router, prefix="/decks", tags=["decks"])
app.include_router(cards_api.router, prefix="/cards", tags=["cards"])
app.include_router(cmm_service.router, tags=["cmm"])

app.include_router(debug_router, prefix="/debug", tags=["debug"])
app.include_router(ai_api.router, prefix="/ai", tags=["ai"])


@app.get("/health")
def health():
    start = getattr(app.state, "start_time", None)
    uptime = None
    if start:
        uptime = int(time.time() - start)
    try:
        key = settings.anthropic_api_key or ""
        has_key = bool(key and key.strip())
        masked = (
            (key[:6] + "..." + key[-6:])
            if has_key and len(key) > 12
            else ("(set)" if has_key else "(not set)")
        )
    except Exception:
        has_key = False
        masked = "(error)"

    return {
        "status": "ok",
        "uptime_seconds": uptime,
        "anthropic_key_present": has_key,
        "anthropic_key_masked": masked,
    }
