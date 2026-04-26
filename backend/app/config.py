from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    supabase_url: str = "https://qrkpbawdgiwbgcxanrnh.supabase.co"
    supabase_service_key: str = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFya3BiYXdkZ2l3YmdjeGFucm5oIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjY0MTg0MywiZXhwIjoyMDkyMjE3ODQzfQ.C5rOx3dfSeypzk4uFAFZorYj_vUOqzOyx5G9YV5Kli4"
    supabase_anon_key: str = "sb_publishable_j5zM5oH-lXzAHGejDBmchQ_77ETpFwc"
    jwt_secret: str
    storage_bucket: str = "comsos-uploads"
    anthropic_api_key: str = "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"
    anthropic_default_model: str = "claude-opus-4-7"

    class Config:
        env_file = ".env"


settings = Settings()
