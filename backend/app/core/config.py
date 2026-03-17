import os
from functools import lru_cache
from typing import List


class Settings:
    APP_NAME: str = os.getenv("APP_NAME", "Inventory Management System")
    APP_VERSION: str = os.getenv("APP_VERSION", "0.1.0")

    DEBUG: bool = os.getenv("DEBUG", "false").lower() == "true"

    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "postgresql://inventory_user:password@postgres:5432/inventory_db",
    )

    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "change-this-secret")
    JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(
        os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60")
    )

    BCRYPT_ROUNDS: int = int(os.getenv("BCRYPT_ROUNDS", "12"))

    AWS_ACCESS_KEY_ID: str | None = os.getenv("AWS_ACCESS_KEY_ID")
    AWS_SECRET_ACCESS_KEY: str | None = os.getenv("AWS_SECRET_ACCESS_KEY")
    AWS_REGION_NAME: str | None = os.getenv("AWS_REGION_NAME")
    AWS_S3_BUCKET_NAME: str | None = os.getenv("AWS_S3_BUCKET_NAME")

    CORS_ALLOW_ORIGINS: List[str] = os.getenv(
        "CORS_ALLOW_ORIGINS", "http://localhost:5173,http://localhost"
    ).split(",")


@lru_cache
def get_settings() -> Settings:
    return Settings()

