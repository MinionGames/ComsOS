from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import auth, subjects, notes, uploads
from app.api.debug import router as debug_router

app = FastAPI(title="ComsOS API")

app.add_middleware(
    CORSMiddleware,
    # broadened dev origins to include 127.0.0.1 and common dev ports
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(subjects.router, prefix="/subjects", tags=["subjects"])
app.include_router(notes.router, prefix="/notes", tags=["notes"])
app.include_router(uploads.router, prefix="/uploads", tags=["uploads"])

app.include_router(debug_router, prefix="/debug", tags=["debug"])


@app.get("/health")
def health():
    return {"status": "ok"}
