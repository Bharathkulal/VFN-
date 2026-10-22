import os
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field, field_validator


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Project metadata
    PROJECT_NAME: str = "Volleyball Friends Nalthur Trophy 2026 (VFN)"
    VERSION: str = "1.0.0"
    API_V1_PREFIX: str = "/api/v1"

    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    CORS_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000"

    # MongoDB
    MONGODB_URL: str = Field(default="mongodb://localhost:27017")
    DATABASE_NAME: str = Field(default="sportbid_vfn")

    # Security & JWT
    JWT_SECRET: str = Field(
        default="sportbid_vfn_super_secret_jwt_signing_key_replace_me_in_production_2026"
    )
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours

    # Initial Admin Bootstrap
    ADMIN_EMAIL: str = "admin@vfn.com"
    ADMIN_PASSWORD: str = "Admin@VFN2026!"
    ADMIN_FULL_NAME: str = "Tournament Admin"

    # Cloudinary
    CLOUDINARY_CLOUD_NAME: str = Field(default="wcajcjoc")
    CLOUDINARY_API_KEY: str = Field(default="822824153389891")
    CLOUDINARY_API_SECRET: str = Field(default="czWXLaFL4SJnYS2Q6lhmg6lz-0w")
    CLOUDINARY_FOLDER: str = "vfn_tournament_2026/players"
    CLOUDINARY_POSTERS_FOLDER: str = "vfn_tournament_2026/posters"

    # Uploads directory fallback for development if Cloudinary is not configured
    UPLOAD_DIR: str = os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
        "uploads",
    )

    @property
    def cors_origin_list(self) -> List[str]:
        return [origin.strip().rstrip("/") for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    @property
    def is_cloudinary_configured(self) -> bool:
        return bool(
            self.CLOUDINARY_CLOUD_NAME
            and self.CLOUDINARY_API_KEY
            and self.CLOUDINARY_API_SECRET
        )


settings = Settings()
