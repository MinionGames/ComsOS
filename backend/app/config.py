from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    supabase_url: str = "https://qrkpbawdgiwbgcxanrnh.supabase.co"
    supabase_service_key: str = "[REDACTED_SUPABASE_SERVICE_KEY]"
    supabase_anon_key: str = "[REDACTED_SUPABASE_ANON_KEY]"
    jwt_secret: str
    storage_bucket: str = "studyos-uploads"

    class Config:
        env_file = ".env"


settings = Settings()
