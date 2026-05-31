"""
Create an instaloader session from a manually-copied Instagram `sessionid` cookie.

Use this when browser_cookie3 can't read cookies (e.g. Brave/Chrome app-bound
encryption -> "requires admin").

HOW TO GET sessionid (Brave):
  1. Open Brave, go to instagram.com (logged in).
  2. Press F12 -> Application tab -> Storage -> Cookies -> https://www.instagram.com
  3. Find the row named `sessionid`, copy its full Value.

RUN:
  venv\\Scripts\\python.exe session_from_cookie.py "<sessionid_value>"

It validates the cookie, resolves your username, and saves the session to
backend/ig_sessions/session-<username>. instagram_service.py then reuses it.
"""
import os
import sys

try:
    from dotenv import load_dotenv
    load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))
except Exception:
    pass

import instaloader

SESSION_DIR = os.path.join(os.path.dirname(__file__), "ig_sessions")


def main():
    if len(sys.argv) < 2 or not sys.argv[1].strip():
        print('Usage: python session_from_cookie.py "<sessionid_cookie_value>"')
        sys.exit(1)

    sessionid = sys.argv[1].strip().strip('"').strip("'")
    os.makedirs(SESSION_DIR, exist_ok=True)

    L = instaloader.Instaloader()
    # Instagram only needs sessionid to authenticate read requests.
    L.context._session.cookies.set("sessionid", sessionid, domain=".instagram.com")

    print("Validating sessionid cookie...")
    try:
        username = L.test_login()
    except Exception as exc:
        print(f"VALIDATION FAILED: {exc}")
        sys.exit(2)

    if not username:
        print("FAILED: cookie did not authenticate. It may be expired — re-copy a fresh sessionid from the browser.")
        sys.exit(2)

    L.context.username = username
    session_file = os.path.join(SESSION_DIR, f"session-{username}")
    L.save_session_to_file(session_file)
    print(f"\nSUCCESS: logged in as '{username}'. Session saved to {session_file}")

    env_user = os.getenv("INSTAGRAM_USERNAME")
    if env_user and env_user.lower() != username.lower():
        print(
            f"NOTE: .env INSTAGRAM_USERNAME is '{env_user}' but this session is '{username}'.\n"
            f"      Set INSTAGRAM_USERNAME={username} in backend/.env so the app loads this session."
        )
    print("instagram_service.py will now reuse this session automatically.")


if __name__ == "__main__":
    main()
