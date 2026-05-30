import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    GROQ_API_KEY: str = ""
    HOST: str = "127.0.0.1"
    PORT: int = 8000
    ENV: str = "development"
    CHROMA_DB_DIR: str = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "chroma_db")
    TEMP_DIR: str = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "tmp")

    class Config:
        env_file = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env")
        extra = "ignore"

settings = Settings()

# Ensure directories exist
os.makedirs(settings.CHROMA_DB_DIR, exist_ok=True)
os.makedirs(settings.TEMP_DIR, exist_ok=True)
