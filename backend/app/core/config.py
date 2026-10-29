from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_ROOT = Path(__file__).resolve().parents[2]


def _default_database_url() -> str:
    return f"sqlite:///{BACKEND_ROOT / 'bazaar.db'}"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=BACKEND_ROOT / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "Bazaar API"
    database_url: str = _default_database_url()
    jwt_secret_key: str = ""
    access_token_expire_minutes: int = 30

    def validate(self) -> None:
        if self.access_token_expire_minutes < 1:
            raise RuntimeError("ACCESS_TOKEN_EXPIRE_MINUTES must be a positive integer")
        if len(self.jwt_secret_key) < 32:
            raise RuntimeError(
                "JWT_SECRET_KEY must be configured with at least 32 characters"
            )


settings = Settings()
