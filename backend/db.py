"""
db.py — Postgres (Supabase) persistence layer via SQLAlchemy.

Tables:
  users    — account records (email + bcrypt password hash)
  analyses — saved video-comparison sessions, scoped to a user

A single Engine/Session factory is created at import. Tables are created on
startup via init_db().
"""
import os
import uuid
import datetime
import logging
from typing import Optional

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

from sqlalchemy import (
    create_engine, String, Integer, Float, DateTime, ForeignKey, Text, JSON,
)
from sqlalchemy.orm import (
    DeclarativeBase, Mapped, mapped_column, relationship, sessionmaker, Session,
)

logger = logging.getLogger(__name__)

DATABASE_URL = os.getenv("DATABASE_URL", "")

# SQLAlchemy needs the psycopg (v3) driver name. Normalize the URL.
if DATABASE_URL.startswith("postgresql://"):
    SQLALCHEMY_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg://", 1)
elif DATABASE_URL.startswith("postgres://"):
    SQLALCHEMY_URL = DATABASE_URL.replace("postgres://", "postgresql+psycopg://", 1)
else:
    SQLALCHEMY_URL = DATABASE_URL

engine = create_engine(
    SQLALCHEMY_URL,
    pool_pre_ping=True,     # survive Supabase pooler idle drops
    pool_size=5,
    max_overflow=10,
    pool_recycle=1800,
)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


def _uuid() -> str:
    return str(uuid.uuid4())


def _now() -> datetime.datetime:
    return datetime.datetime.now(datetime.timezone.utc)


class User(Base):
    __tablename__ = "cl_users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(120), default="")
    # Nullable: Google-only accounts have no local password.
    password_hash: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    # "local" or "google" — how the account was created / can sign in.
    auth_provider: Mapped[str] = mapped_column(String(20), default="local")
    avatar_url: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime(timezone=True), default=_now)

    analyses: Mapped[list["Analysis"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )


class Analysis(Base):
    """One saved YouTube-vs-Instagram comparison for a user."""
    __tablename__ = "cl_analyses"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(ForeignKey("cl_users.id", ondelete="CASCADE"), index=True)

    youtube_url: Mapped[str] = mapped_column(Text, default="")
    instagram_url: Mapped[str] = mapped_column(Text, default="")
    # Full metadata payloads returned to the frontend (video_a / video_b dicts).
    video_a: Mapped[dict] = mapped_column(JSON, default=dict)
    video_b: Mapped[dict] = mapped_column(JSON, default=dict)
    chunks_stored: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime(timezone=True), default=_now)

    user: Mapped["User"] = relationship(back_populates="analyses")


def init_db() -> None:
    """Create tables if they don't exist, and add any newly-introduced columns."""
    Base.metadata.create_all(engine)
    # Lightweight migration: add columns that may be missing on an existing table.
    from sqlalchemy import text
    alters = [
        "ALTER TABLE cl_users ALTER COLUMN password_hash DROP NOT NULL",
        "ALTER TABLE cl_users ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(20) DEFAULT 'local'",
        "ALTER TABLE cl_users ADD COLUMN IF NOT EXISTS avatar_url TEXT DEFAULT ''",
    ]
    with engine.begin() as conn:
        for stmt in alters:
            try:
                conn.execute(text(stmt))
            except Exception as exc:
                logger.warning("Migration step skipped (%s): %s", stmt, exc)
    logger.info("Database tables ensured (cl_users, cl_analyses).")


def get_db() -> Session:
    """FastAPI dependency: yields a session and always closes it."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
