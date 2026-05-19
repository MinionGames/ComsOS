from pydantic_settings import BaseSettings
from pydantic import Field
import os
from pathlib import Path

# Prefer the backend/.env file for backend runtime configuration. Load it into
# the process environment so uvicorn or other runners pick it up regardless of
# working directory. Falls back to repository root .env if backend/.env is
# missing.
ROOT_ENV = Path(__file__).resolve().parents[1] / ".env"
if not ROOT_ENV.exists():
    ROOT_ENV = Path(__file__).resolve().parents[2] / ".env"
if ROOT_ENV.exists():
    try:
        with ROOT_ENV.open("r", encoding="utf-8") as f:
            for raw in f:
                line = raw.strip()
                if not line or line.startswith("#"):
                    continue
                if "=" not in line:
                    continue
                k, v = line.split("=", 1)
                k = k.strip()
                v = v.strip().strip('"')
                # do not overwrite existing environment variables
                if k and k not in os.environ:
                    os.environ[k] = v
    except Exception:
        # best-effort; avoid failing import if .env parsing errors occur
        pass


class Settings(BaseSettings):
    # Prefer the new env names; fall back to legacy names if not present.
    supabase_url: str = Field("", env="SUPABASE_URL")
    supabase_service_key: str = Field("", env="SUPABASE_SECRET_KEY")
    supabase_anon_key: str = Field("", env="SUPABASE_PUBLISHABLE_KEY")
    jwt_secret: str = Field("", env="JWT_SECRET")
    storage_bucket: str = Field("comsos-uploads", env="STORAGE_BUCKET")
    anthropic_api_key: str = Field("", env="ANTHROPIC_API_KEY")
    anthropic_default_model: str = Field(
        "claude-haiku-4-5-20251001", env="ANTHROPIC_DEFAULT_MODEL"
    )

    # Allow additional tuning vars in backend/.env (preferred) or repo .env
    model_config = {"extra": "ignore", "env_file": str(ROOT_ENV)}

    def __init__(self, **data):
        super().__init__(**data)
        # If new-style keys are empty, fall back to legacy env names.
        if not self.supabase_service_key:
            self.supabase_service_key = os.getenv("SUPABASE_SERVICE_KEY", "")
        if not self.supabase_anon_key:
            self.supabase_anon_key = os.getenv("SUPABASE_ANON_KEY", "")


settings = Settings()
