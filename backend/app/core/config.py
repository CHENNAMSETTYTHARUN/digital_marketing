from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    app_env: str = "development"
    secret_key: str = ""
    database_url: str = "sqlite:///./marketly.db"
    frontend_origins: str = "http://localhost:5500,http://127.0.0.1:5500"
    frontend_login_url: str = "http://127.0.0.1:5500/login.html"
    access_token_minutes: int = 15
    refresh_token_days: int = 14
    cookie_secure: bool = False
    cookie_samesite: str = "lax"
    require_email_verification: bool = False
    demo_oauth_enabled: bool = False
    google_client_id: str = ""
    google_client_secret: str = ""
    google_redirect_uri: str = "http://127.0.0.1:8000/api/v1/auth/google/callback"
    microsoft_client_id: str = ""
    microsoft_client_secret: str = ""
    microsoft_tenant_id: str = "common"
    microsoft_redirect_uri: str = "http://127.0.0.1:8000/api/v1/auth/microsoft/callback"
    microsoft_scopes: str = "openid profile email"
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def cors_origins(self):
        return [v.strip() for v in self.frontend_origins.split(",") if v.strip()]

settings = Settings()
