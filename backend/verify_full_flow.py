"""End-to-end test of the new multi-user backend: register -> process -> chat -> history."""
import time, json, requests

BASE = "http://127.0.0.1:8000"
S = requests.Session()  # keeps the auth cookie

email = f"test_{int(time.time())}@example.com"

def main():
    print("1) register")
    r = S.post(f"{BASE}/api/auth/register", json={"email": email, "password": "secret123", "name": "Test User"})
    print("   ", r.status_code, r.json().get("user", {}).get("email"))
    token = r.json()["access_token"]
    hdr = {"Authorization": f"Bearer {token}"}

    print("2) me")
    r = S.get(f"{BASE}/api/auth/me", headers=hdr)
    print("   ", r.status_code, r.json())

    print("3) process videos")
    r = S.post(f"{BASE}/api/videos/process", headers=hdr, json={
        "youtube_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        "instagram_url": "https://www.instagram.com/p/DYo3K2XDQbN/",
    }, timeout=240)
    print("   ", r.status_code)
    if r.status_code == 200:
        d = r.json()
        print("    A:", d["video_a"]["creator"], "chunks:", d["video_a"]["chunks_stored"])
        print("    B:", d["video_b"]["creator"], "chunks:", d["video_b"]["chunks_stored"])

    print("4) chat (GET stream)")
    r = S.get(f"{BASE}/api/chat", headers=hdr, params={"query": "What is the engagement rate of each video?"}, stream=True, timeout=120)
    ans = ""
    for line in r.iter_lines(decode_unicode=True):
        if line and line.startswith("data:"):
            try:
                o = json.loads(line[5:].lstrip())
            except Exception:
                continue
            if o.get("type") == "content":
                ans += o.get("delta", "")
            elif o.get("type") in ("done", "error"):
                break
    print("    A:", ans.strip()[:160])

    print("5) history")
    r = S.get(f"{BASE}/api/videos/history", headers=hdr)
    print("   ", r.status_code, "saved analyses:", len(r.json()))

    print("6) unauthorized check (no token)")
    r2 = requests.post(f"{BASE}/api/videos/process", json={"youtube_url": "x", "instagram_url": "y"})
    print("    expect 401 ->", r2.status_code)

if __name__ == "__main__":
    main()
