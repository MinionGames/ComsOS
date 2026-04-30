from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    supabase_url: str = "https://qrkpbawdgiwbgcxanrnh.supabase.co"
    supabase_service_key: str = "[REDACTED_SUPABASE_SERVICE_KEY]"
    supabase_anon_key: str = "[REDACTED_SUPABASE_ANON_KEY]"
    jwt_secret: str
    storage_bucket: str = "comsos-uploads"
    anthropic_api_key: str = "[REDACTED_ANTHROPIC_API_KEY_1]"
    anthropic_default_model: str = "claude-haiku-4-5-20251001"

    # Allow extra environment variables (e.g., CMM tuning params) without failing
    model_config = {"extra": "ignore", "env_file": ".env"}


settings = Settings()
