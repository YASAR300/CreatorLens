"""
routers/auth_router.py — /api/auth endpoints: register, login, me, logout.

On register/login we set an httpOnly access_token cookie AND return the token
in the body, so the frontend can use cookies or Authorization headers.
"""
import logging
import os
from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session

from db import get_db, User
from auth import (
    hash_password, verify_password, create_access_token, get_current_user, JWT_EXPIRE_MINUTES,
    verify_google_id_token, create_reset_token, verify_reset_token,
)
from models import (
    RegisterRequest, LoginRequest, AuthResponse, UserOut,
    GoogleAuthRequest, ForgotPasswordRequest, ResetPasswordRequest,
)
from services.email_service import send_welcome_email, send_reset_email

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/auth", tags=["Auth"])

# In production the frontend (e.g. Vercel) and backend (e.g. Render) are on
# different domains, so the auth cookie must be SameSite=None; Secure to be
# sent on cross-site requests. Locally we use Lax over http.
_IS_PROD = os.getenv("ENV", "development").lower() in ("production", "prod")
_COOKIE_SAMESITE = "none" if _IS_PROD else "lax"
_COOKIE_SECURE = _IS_PROD


def _set_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        samesite=_COOKIE_SAMESITE,
        secure=_COOKIE_SECURE,
        max_age=JWT_EXPIRE_MINUTES * 60,
        path="/",
    )


def _user_out(u: User) -> UserOut:
    return UserOut(id=u.id, email=u.email, name=u.name or "", avatar_url=u.avatar_url or "")


@router.post("/register", response_model=AuthResponse)
def register(payload: RegisterRequest, response: Response, db: Session = Depends(get_db)):
    email = payload.email.lower().strip()
    existing = db.query(User).filter(User.email == email).first()
    if existing:
        raise HTTPException(status_code=409, detail="An account with this email already exists.")

    user = User(email=email, name=payload.name.strip(), password_hash=hash_password(payload.password))
    db.add(user)
    db.commit()
    db.refresh(user)

    # Best-effort welcome email (never blocks the response on failure).
    try:
        send_welcome_email(user.email, user.name)
    except Exception:
        pass

    token = create_access_token(user.id)
    _set_cookie(response, token)
    logger.info("Registered new user %s", email)
    return AuthResponse(access_token=token, user=_user_out(user))


@router.post("/login", response_model=AuthResponse)
def login(payload: LoginRequest, response: Response, db: Session = Depends(get_db)):
    email = payload.email.lower().strip()
    user = db.query(User).filter(User.email == email).first()
    if not user or not user.password_hash or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    token = create_access_token(user.id)
    _set_cookie(response, token)
    logger.info("User logged in: %s", email)
    return AuthResponse(access_token=token, user=_user_out(user))


@router.post("/google", response_model=AuthResponse)
def google_auth(payload: GoogleAuthRequest, response: Response, db: Session = Depends(get_db)):
    """Sign in / sign up with a Google ID token (Google Identity Services credential)."""
    info = verify_google_id_token(payload.id_token)
    if not info or not info.get("email"):
        raise HTTPException(status_code=401, detail="Invalid Google sign-in. Please try again.")

    email = info["email"]
    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(
            email=email,
            name=info.get("name", ""),
            password_hash=None,
            auth_provider="google",
            avatar_url=info.get("picture", ""),
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        try:
            send_welcome_email(user.email, user.name)
        except Exception:
            pass
        logger.info("Created Google account: %s", email)
    else:
        # Keep avatar fresh and ensure the account is google-capable.
        if info.get("picture") and user.avatar_url != info["picture"]:
            user.avatar_url = info["picture"]
            db.commit()
        logger.info("Google login: %s", email)

    token = create_access_token(user.id)
    _set_cookie(response, token)
    return AuthResponse(access_token=token, user=_user_out(user))


@router.post("/forgot-password")
def forgot_password(payload: ForgotPasswordRequest, db: Session = Depends(get_db)):
    """
    Email a password-reset link. Always returns 200 (never reveals whether an
    email exists) to avoid account enumeration.
    """
    email = payload.email.lower().strip()
    user = db.query(User).filter(User.email == email).first()
    if user and user.password_hash is not None:
        token = create_reset_token(user.id)
        frontend = os.getenv("FRONTEND_URL", "http://localhost:3000").rstrip("/")
        reset_link = f"{frontend}/reset-password?token={token}"
        try:
            send_reset_email(user.email, user.name, reset_link)
        except Exception as exc:
            logger.warning("Could not send reset email: %s", exc)
    return {"status": "ok", "message": "If an account exists, a reset link has been sent."}


@router.post("/reset-password", response_model=AuthResponse)
def reset_password(payload: ResetPasswordRequest, response: Response, db: Session = Depends(get_db)):
    user_id = verify_reset_token(payload.token)
    if not user_id:
        raise HTTPException(status_code=400, detail="This reset link is invalid or has expired.")
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=400, detail="Account not found.")

    user.password_hash = hash_password(payload.password)
    if user.auth_provider == "google":
        user.auth_provider = "local"  # now has a local password too
    db.commit()
    db.refresh(user)

    token = create_access_token(user.id)
    _set_cookie(response, token)
    logger.info("Password reset for %s", user.email)
    return AuthResponse(access_token=token, user=_user_out(user))


@router.get("/me", response_model=UserOut)
def me(current: User = Depends(get_current_user)):
    return _user_out(current)


@router.post("/logout")
def logout(response: Response):
    response.delete_cookie("access_token", path="/", samesite=_COOKIE_SAMESITE, secure=_COOKIE_SECURE)
    return {"status": "logged_out"}
