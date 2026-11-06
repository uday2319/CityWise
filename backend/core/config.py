from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional
from dotenv import load_dotenv
load_dotenv()

class Settings(BaseSettings):
    APP_NAME: str = "Itinera API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False

    DATABASE_URL: str = "postgresql+asyncpg://itinera:itinera123@localhost:5432/itinera_db"
    DATABASE_URL_SYNC: str = "postgresql://itinera:itinera123@localhost:5432/itinera_db"

    REDIS_URL: str = "redis://localhost:6379/0"

    SECRET_KEY: str = "your-secret-key-change-in-production"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    SBERT_MODEL: str = "all-MiniLM-L6-v2"
    FAISS_INDEX_DIR: str = "data/models"

    ALLOWED_ORIGINS: list = ["http://localhost:3000", "http://localhost:5173"]
    # Vite moves to the next free port when 5173 is taken, so accept any
    # local port rather than one fixed development address.
    ALLOWED_ORIGIN_REGEX: str = r"http://(localhost|127\.0\.0\.1)(:\d+)?"

    GEOAPIFY_API_KEY: Optional[str] = None
    USE_GEOAPIFY: bool = False

    # Optional. When set, translation uses Google Cloud Translation;
    # otherwise the free, key-less MyMemory service is used.
    GOOGLE_TRANSLATE_API_KEY: Optional[str] = None

    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=True
    )


settings = Settings()