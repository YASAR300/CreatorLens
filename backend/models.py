from pydantic import BaseModel, Field, field_validator
from typing import List

class VideoProcessRequest(BaseModel):
    youtube_url: str = Field(..., description="YouTube video URL to analyze")
    instagram_url: str = Field(..., description="Instagram Reel URL to analyze")

    @field_validator("youtube_url", "instagram_url")
    @classmethod
    def validate_urls(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("URL cannot be empty")
        if not v.startswith("http://") and not v.startswith("https://"):
            raise ValueError("URL must start with http:// or https://")
        return v

class VideoMetadata(BaseModel):
    video_id: str
    platform: str
    creator: str
    views: int
    likes: int
    comments: int
    engagement_rate: float
    follower_count: int
    hashtags: List[str]
    duration: str
    thumbnail_url: str
    upload_date: str
    upload_time: str = ""
    chunks_stored: int

class ProcessVideosResponse(BaseModel):
    video_a: VideoMetadata
    video_b: VideoMetadata

class ChatRequest(BaseModel):
    message: str = Field(..., description="The user message to send to the strategic RAG strategists")

    @field_validator("message")
    @classmethod
    def validate_message(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Message cannot be empty")
        if len(v) > 1000:
            raise ValueError("Message cannot exceed 1000 characters")
        return v
