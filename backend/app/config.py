from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    supabase_url: str
    supabase_service_key: str
    supabase_anon_key: str
    jwt_secret: str
    storage_bucket: str = "studyos-uploads"

    class Config:
        env_file = ".env"

settings = Settings()