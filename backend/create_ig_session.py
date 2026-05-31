"""
One-off helper to create a persistent Instagram session file for instaloader.

Recommended (no password, bypasses Instagram's automated-login block):
    1. Log in to Instagram in your browser (Chrome / Edge / Firefox) on THIS machine.
    2. Run:  venv\\Scripts\\python.exe create_ig_session.py
       (optionally pass the browser:  ... create_ig_session.py chrome|edge|firefox)

It reads the instagram.com cookies from your browser session and saves them as an
instaloader session at backend/ig_sessions/session-<username>. After this succeeds,
instagram_service.py reuses the saved session automatically.

Fallback: if no browser cookies are found, it tries INSTAGRAM_USERNAME / INSTAGRAM_PASSWORD
from .env (this often fails on real accounts due to Instagram's login challenges).
"""
import os
import sys

try:
    from dotenv import load_dotenv
    load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))
except Exception:
    pass

import instaloader

USERNAME = os.getenv("INSTAGRAM_USERNAME")
PASSWORD = os.getenv("INSTAGRAM_PASSWORD")
SESSION_DIR = os.path.join(os.path.dirname(__file__), "ig_sessions")


def _browser_loader(browser_name):
    """Return a browser_cookie3 loader function for the given browser, or None."""
    import browser_cookie3
    table = {
        "chrome": browser_cookie3.chrome,
        "edge": browser_cookie3.edge,
        "firefox": browser_cookie3.firefox,
        "brave": browser_cookie3.brave,
        "opera": browser_cookie3.opera,
        "chromium": browser_cookie3.chromium,
    }
    return table.get(browser_name)


def import_from_browser(preferred=None):
    """
    Pull instagram.com cookies from the local browser and build an instaloader session.
    Returns (instaloader.Instaloader, resolved_username) on success, else (None, None).
    """
    import browser_cookie3

    browsers = [preferred] if preferred else ["chrome", "edge", "firefox", "brave", "opera", "chromium"]

    for name in browsers:
        loader_fn = _browser_loader(name)
        if loader_fn is None:
            continue
        try:
            cj = loader_fn(domain_name="instagram.com")
        except Exception as exc:
            print(f"  - {name}: could not read cookies ({exc})")
            continue

        cookie_dict = {c.name: c.value for c in cj}
        if "sessionid" not in cookie_dict:
            print(f"  - {name}: no Instagram session cookie found (not logged in there?)")
            continue

        print(f"  - {name}: found Instagram session cookie ✓")

        L = instaloader.Instaloader()
        L.context._session.cookies.update(cj)
        try:
            username = L.test_login()
        except Exception as exc:
            print(f"  - {name}: cookie present but test_login failed ({exc})")
            username = None

        if not username:
            print(f"  - {name}: cookies did not authenticate (maybe expired). Re-login in browser.")
            continue

        L.context.username = username
        return L, username

    return None, None


def main():
    os.makedirs(SESSION_DIR, exist_ok=True)
    preferred = sys.argv[1].lower() if len(sys.argv) > 1 else None

    print("Looking for an existing Instagram login in your browser cookies...")
    try:
        L, username = import_from_browser(preferred)
    except ImportError:
        print("browser_cookie3 not installed. Run: pip install browser_cookie3")
        L, username = None, None

    if L and username:
        session_file = os.path.join(SESSION_DIR, f"session-{username}")
        L.save_session_to_file(session_file)
        print(f"\nSUCCESS: logged in as '{username}'. Session saved to {session_file}")
        if USERNAME and username.lower() != USERNAME.lower():
            print(
                f"NOTE: .env INSTAGRAM_USERNAME is '{USERNAME}' but the browser session is '{username}'.\n"
                f"      Update INSTAGRAM_USERNAME to '{username}' in backend/.env so the app loads this session."
            )
        print("instagram_service.py will now reuse this session automatically.")
        return

    # Fallback: password login from .env
    print("\nNo usable browser cookies found. Trying password login from .env...")
    if not USERNAME or not PASSWORD:
        print("ERROR: INSTAGRAM_USERNAME / INSTAGRAM_PASSWORD missing in .env, and no browser cookies.")
        sys.exit(1)

    from instaloader.exceptions import TwoFactorAuthRequiredException
    L = instaloader.Instaloader()
    try:
        L.login(USERNAME, PASSWORD)
    except TwoFactorAuthRequiredException:
        code = input("Two-factor code: ").strip()
        L.two_factor_login(code)
    except Exception as exc:
        print(f"LOGIN FAILED: {exc}")
        print(
            "\nInstagram blocked the automated password login.\n"
            "Best fix: log in to Instagram in Chrome/Edge/Firefox on this machine, then re-run this script."
        )
        sys.exit(2)

    session_file = os.path.join(SESSION_DIR, f"session-{USERNAME}")
    L.save_session_to_file(session_file)
    print(f"SUCCESS: session saved to {session_file}")


if __name__ == "__main__":
    main()
