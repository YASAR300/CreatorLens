import os
from dotenv import load_dotenv
from pydantic_settings import BaseSettings

# Load .env file variables directly into os.environ
ENV_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env")
load_dotenv(ENV_FILE)

class Settings(BaseSettings):
    GROQ_API_KEY: str = ""
    HOST: str = "127.0.0.1"
    PORT: int = 8000
    ENV: str = "development"
    CHROMA_DB_DIR: str = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "chroma_db")
    TEMP_DIR: str = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "tmp")

    class Config:
        env_file = ENV_FILE
        extra = "ignore"

settings = Settings()

# Synchronize loaded settings to os.environ so all external libraries/services can access them
os.environ["GROQ_API_KEY"] = settings.GROQ_API_KEY

# Ensure directories exist
os.makedirs(settings.CHROMA_DB_DIR, exist_ok=True)
os.makedirs(settings.TEMP_DIR, exist_ok=True)
