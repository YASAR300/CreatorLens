"""
email_service.py — transactional email via SMTP (Brevo).

Sending is best-effort and never blocks/raises into the request path: if SMTP
is misconfigured or down, we log a warning and move on. Used for the welcome
email after registration.
"""
import os
import ssl
import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

logger = logging.getLogger(__name__)


def _smtp_configured() -> bool:
    return all(os.getenv(k) for k in ("SMTP_SERVER", "SMTP_PORT", "SMTP_USER", "SMTP_PASSWORD", "SMTP_FROM"))


def send_email(to_email: str, subject: str, html_body: str) -> bool:
    """Send an HTML email. Returns True on success, False otherwise (never raises)."""
    if not _smtp_configured():
        logger.info("SMTP not configured; skipping email to %s", to_email)
        return False

    server = os.getenv("SMTP_SERVER")
    port = int(os.getenv("SMTP_PORT", "587"))
    user = os.getenv("SMTP_USER")
    password = os.getenv("SMTP_PASSWORD")
    sender = os.getenv("SMTP_FROM")

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = sender
    msg["To"] = to_email
    msg.attach(MIMEText(html_body, "html"))

    try:
        with smtplib.SMTP(server, port, timeout=15) as smtp:
            smtp.ehlo()
            smtp.starttls(context=ssl.create_default_context())
            smtp.ehlo()
            smtp.login(user, password)
            smtp.sendmail(sender, [to_email], msg.as_string())
        logger.info("Sent email to %s (subject=%s)", to_email, subject)
        return True
    except Exception as exc:
        logger.warning("Failed to send email to %s: %s", to_email, exc)
        return False


def send_welcome_email(to_email: str, name: str = "") -> bool:
    greeting = f"Hi {name}," if name else "Hi there,"
    html = f"""
    <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:480px;margin:auto;color:#1d1d1f">
      <h2 style="font-weight:600">Welcome to CreatorLens 👁</h2>
      <p>{greeting}</p>
      <p>Your account is ready. Drop in a YouTube video and an Instagram Reel, and
      chat with their transcripts and metrics in real time.</p>
      <p style="color:#86868b;font-size:13px">— The CreatorLens team</p>
    </div>
    """
    return send_email(to_email, "Welcome to CreatorLens", html)


def send_reset_email(to_email: str, name: str, reset_link: str) -> bool:
    greeting = f"Hi {name}," if name else "Hi there,"
    html = f"""
    <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:480px;margin:auto;color:#1d1d1f">
      <h2 style="font-weight:600">Reset your CreatorLens password</h2>
      <p>{greeting}</p>
      <p>We received a request to reset your password. Click the button below to choose a new one.
      This link expires in 30 minutes.</p>
      <p style="margin:24px 0">
        <a href="{reset_link}" style="background:#5e6ad2;color:#fff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:600;display:inline-block">Reset password</a>
      </p>
      <p style="color:#86868b;font-size:13px">If you didn't request this, you can safely ignore this email.</p>
      <p style="color:#86868b;font-size:12px;word-break:break-all">{reset_link}</p>
    </div>
    """
    return send_email(to_email, "Reset your CreatorLens password", html)
