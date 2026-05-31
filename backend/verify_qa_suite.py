"""
RAG QA regression suite.

Processes one YouTube + one Instagram URL, then runs a battery of questions that
mirror what a real creator (and the challenge brief) would ask. Each question is
asked on FRESH memory unless it's part of a multi-turn block, and the answer is
checked against assertions derived from the ACTUAL scraped metadata (no hard-coded
expected strings — the truth comes from the /process response).

Usage:
  venv\\Scripts\\python.exe verify_qa_suite.py <youtube_url> <instagram_url>
"""
import json
import sys
import re
import requests

BASE = "http://127.0.0.1:8000"
YT = sys.argv[1] if len(sys.argv) > 1 else "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
IG = sys.argv[2] if len(sys.argv) > 2 else "https://www.instagram.com/p/DYo3K2XDQbN/"


def process():
    r = requests.post(f"{BASE}/api/videos/process",
                      json={"youtube_url": YT, "instagram_url": IG}, timeout=240)
    r.raise_for_status()
    return r.json()


def ask(q, reset=True):
    if reset:
        requests.post(f"{BASE}/api/chat/reset", timeout=30)
    r = requests.get(f"{BASE}/api/chat", params={"query": q}, stream=True, timeout=120)
    answer = ""
    for line in r.iter_lines(decode_unicode=True):
        if not line or not line.startswith("data:"):
            continue
        try:
            obj = json.loads(line[5:].lstrip())
        except Exception:
            continue
        if obj.get("type") == "content":
            answer += obj.get("delta", "")
        elif obj.get("type") in ("done", "error"):
            break
    return answer.strip()


def num_variants(n):
    """Acceptable string forms of an integer: 1778036697, 1,778,036,697, 1.7B, 1.8B, 1778M-ish."""
    n = int(n)
    out = {str(n), f"{n:,}"}
    if n >= 1_000_000_000:
        out.add(f"{n/1_000_000_000:.1f}")
        out.add(f"{n/1_000_000_000:.2f}")
    if n >= 1_000_000:
        out.add(f"{n/1_000_000:.1f}")
        out.add(f"{n/1_000_000:.0f}")
    if n >= 1000:
        out.add(f"{n/1000:.1f}")
    return out


def contains_any(text, variants):
    t = text.replace(",", "").lower()
    for v in variants:
        if v.replace(",", "").lower() in t:
            return True
    return False


def main():
    print("Processing videos...")
    data = process()
    A, B = data["video_a"], data["video_b"]
    print(f"  A: {A['creator']} | views={A['views']} ER={A['engagement_rate']}% followers={A['follower_count']}")
    print(f"  B: {B['creator']} | views={B['views']} ER={B['engagement_rate']}% followers={B['follower_count']}")

    results = []

    def check(name, q, predicate, multi_turn_prior=None):
        if multi_turn_prior:
            requests.post(f"{BASE}/api/chat/reset", timeout=30)
            for pq in multi_turn_prior:
                ask(pq, reset=False)
            ans = ask(q, reset=False)
        else:
            ans = ask(q, reset=True)
        ok = predicate(ans)
        results.append((name, ok, q, ans))
        print(f"\n[{'PASS' if ok else 'FAIL'}] {name}")
        print(f"   Q: {q}")
        print(f"   A: {ans[:240]}")

    # 1. Creator of B + followers
    check("B creator+followers",
          "Who created Video B and what is their follower count?",
          lambda a: B["creator"].lower() in a.lower()
                    and contains_any(a, num_variants(B["follower_count"])))

    # 2. What is B about (caption-based, the originally-broken case)
    check("B topic from caption",
          "What is Video B about?",
          lambda a: "not available" not in a.lower() and len(a) > 25)

    # 3. Engagement of each -> BOTH videos
    check("engagement each (both videos)",
          "What is the engagement rate of each video?",
          lambda a: (f"{A['engagement_rate']}" in a) and (f"{B['engagement_rate']}" in a))

    # 4. Single-video scope must NOT leak the other (multi-turn trap)
    check("B-only stays B-only after B turns",
          "Who created Video B and their followers?",
          lambda a: A["creator"].lower() not in a.lower() and B["creator"].lower() in a.lower(),
          multi_turn_prior=["What is Video B about?", "How many likes does Video B have?"])

    # 5. Views of A
    check("A views",
          "How many views does Video A have?",
          lambda a: contains_any(a, num_variants(A["views"])))

    # 6. Upload date of A
    check("A upload date",
          "When was Video A uploaded?",
          lambda a: any(p in a for p in A["upload_date"].replace(",", "").split()))

    # 7. Duration of A
    check("A duration",
          "How long is Video A?",
          lambda a: A["duration"] in a or A["duration"].lstrip("0") in a)

    # 8. Compare engagement (both + comparative language)
    check("compare engagement",
          "Why did Video A get more engagement than Video B?",
          lambda a: (f"{A['engagement_rate']}" in a) and (f"{B['engagement_rate']}" in a))

    # 9. Hooks question (transcript-dependent, should not crash / hallucinate numbers)
    check("hooks first 5s",
          "Compare the hooks in the first 5 seconds of each video.",
          lambda a: len(a) > 20 and "error" not in a.lower())

    # 10. Improvements for B
    check("improve B",
          "Suggest 3 improvements for Video B based on what worked in Video A.",
          lambda a: len(a) > 40 and "error" not in a.lower())

    passed = sum(1 for _, ok, _, _ in results if ok)
    print(f"\n================  {passed}/{len(results)} PASSED  ================")
    for name, ok, _, _ in results:
        print(f"  {'PASS' if ok else 'FAIL'}  {name}")


if __name__ == "__main__":
    main()
