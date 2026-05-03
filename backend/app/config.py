from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Values are loaded from environment (root .env). Do not hardcode secrets.
    supabase_url: str = ""
    supabase_service_key: str = ""
    supabase_anon_key: str = ""
    jwt_secret: str
    storage_bucket: str = "comsos-uploads"
    anthropic_api_key: str = ""
    anthropic_default_model: str = "claude-haiku-4-5-20251001"

    # Allow extra environment variables (e.g., CMM tuning params) without failing
    model_config = {"extra": "ignore", "env_file": ".env"}


settings = Settings()
