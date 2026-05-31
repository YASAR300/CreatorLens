"""
auth.py — registration, login, JWT issuance, and the current-user dependency.

Passwords are hashed with bcrypt (passlib). Access tokens are signed JWTs
carrying the user id as `sub`. Tokens are read from the Authorization: Bearer
header OR an httpOnly `access_token` cookie (so the frontend can use either).
"""
import os
import datetime
import logging
from typing import Optional

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

from fastapi import Depends, HTTPException, status, Request
from jose import jwt, JWTError
from sqlalchemy.orm import Session
import bcrypt

from db import get_db, User

logger = logging.getLogger(__name__)

JWT_SECRET = os.getenv("JWT_SECRET", "dev_secret_change_me")
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", "10080"))  # 7 days


def hash_password(password: str) -> str:
    # bcrypt hard-limits input to 72 bytes; truncate explicitly (passlib's
    # auto-truncation broke with newer bcrypt, so we call bcrypt directly).
    pw = password.encode("utf-8")[:72]
    return bcrypt.hashpw(pw, bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8")[:72], hashed.encode("utf-8"))
    except Exception:
        return False


def create_access_token(user_id: str) -> str:
    expire = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(minutes=JWT_EXPIRE_MINUTES)
    payload = {"sub": user_id, "exp": expire}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def create_reset_token(user_id: str, minutes: int = 30) -> str:
    """Short-lived signed token for password reset (scoped with type=reset)."""
    expire = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(minutes=minutes)
    payload = {"sub": user_id, "type": "reset", "exp": expire}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def verify_reset_token(token: str) -> Optional[str]:
    """Return the user_id from a valid reset token, else None."""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "reset":
            return None
        return payload.get("sub")
    except JWTError:
        return None


def verify_google_id_token(id_token: str) -> Optional[dict]:
    """
    Verify a Google ID token via Google's tokeninfo endpoint (no heavy deps).
    Returns {email, name, picture, sub} on success, else None.
    Validates the audience against GOOGLE_CLIENT_ID when configured.
    """
    import requests
    try:
        resp = requests.get(
            "https://oauth2.googleapis.com/tokeninfo",
            params={"id_token": id_token},
            timeout=10,
        )
        if resp.status_code != 200:
            logger.warning("Google tokeninfo rejected token: %s", resp.text[:200])
            return None
        data = resp.json()
        client_id = os.getenv("GOOGLE_CLIENT_ID", "").strip()
        if client_id and data.get("aud") != client_id:
            logger.warning("Google token audience mismatch.")
            return None
        if data.get("email_verified") in ("false", False):
            return None
        return {
            "email": data.get("email", "").lower(),
            "name": data.get("name", "") or data.get("given_name", ""),
            "picture": data.get("picture", ""),
            "sub": data.get("sub", ""),
        }
    except Exception as exc:
        logger.error("Google token verification failed: %s", exc)
        return None


def _extract_token(request: Request) -> Optional[str]:
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        return auth.split(" ", 1)[1].strip()
    return request.cookies.get("access_token")


def get_current_user(request: Request, db: Session = Depends(get_db)) -> User:
    """Resolve the authenticated user or raise 401."""
    token = _extract_token(request)
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")

    user = db.get(User, user_id) if user_id else None
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user
