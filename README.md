<div align="center">

<img src="docs/logo.png" alt="CreatorLens" width="96" height="96" />

# CreatorLens

### The content-intelligence system for creators — compare two videos, then chat with the data.

**CreatorLens** ingests a **YouTube video** and an **Instagram Reel**, scrapes their metrics, transcribes their audio, embeds everything into a vector database, and lets you **chat** your way to *why one outperformed the other* — with streaming, cited, timestamp-linked answers.

<br/>

![Status](https://img.shields.io/badge/status-active-30d158?style=flat-square)
![Backend](https://img.shields.io/badge/backend-FastAPI-009688?style=flat-square&logo=fastapi&logoColor=white)
![Frontend](https://img.shields.io/badge/frontend-Next.js%2016-000000?style=flat-square&logo=nextdotjs&logoColor=white)
![LLM](https://img.shields.io/badge/LLM-Groq%20Llama%203.3%2070B-f55036?style=flat-square)
![Vector%20DB](https://img.shields.io/badge/vectors-Qdrant-dc244c?style=flat-square)
![DB](https://img.shields.io/badge/database-Postgres%20(Supabase)-4169e1?style=flat-square&logo=postgresql&logoColor=white)
![Orchestration](https://img.shields.io/badge/orchestration-LangChain-1c3c3c?style=flat-square&logo=langchain&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)

</div>

---

## 📑 Table of Contents

1. [What is CreatorLens?](#-what-is-creatorlens)
2. [Screenshots & UI Walkthrough](#-screenshots--ui-walkthrough)
3. [Feature Highlights](#-feature-highlights)
4. [Tech Stack](#-tech-stack)
5. [System Architecture](#-system-architecture)
6. [Data & Request Flows](#-data--request-flows)
   - [Ingestion Pipeline](#ingestion-pipeline-process)
   - [RAG Chat Flow (SSE)](#rag-chat-flow-sse-streaming)
   - [Authentication Flow](#authentication-flow)
   - [History / Load Flow](#history--load-flow)
7. [Database Schema](#-database-schema)
8. [Vector Store Design (Qdrant)](#-vector-store-design-qdrant)
9. [Project Structure](#-project-structure)
10. [API Reference](#-api-reference)
11. [Local Setup](#-local-setup)
12. [Environment Variables](#-environment-variables)
13. [How the RAG Pipeline Works](#-how-the-rag-pipeline-works-deep-dive)
14. [Cost & Scalability Analysis](#-cost--scalability-analysis)
15. [Engineering Decisions & Trade-offs](#-engineering-decisions--trade-offs)
16. [Security Notes](#-security-notes)
17. [Testing & Verification](#-testing--verification)
18. [Roadmap](#-roadmap)
19. [FAQ](#-faq)

---

## � What is CreatorLens?

Creators constantly ask the same question: **"Why did this video do better than that one?"** Answering it usually means eyeballing two analytics tabs and guessing.

CreatorLens turns that guesswork into a grounded conversation:

- **Paste two URLs** — one YouTube video, one Instagram Reel.
- CreatorLens **scrapes** the public metrics (views, likes, comments, followers, hashtags, upload date/time, duration), **computes** the engagement rate, **transcribes** the audio (Groq Whisper), and **indexes** the transcript + caption into a vector database.
- A side-by-side **comparison** highlights the stronger performer.
- A **chat panel** lets you ask anything. Every answer **streams token-by-token**, **cites its sources**, and — for transcript-based claims — **links to the exact second** in the video.

Everything is **multi-user**: each account's analyses and chats are isolated, saved to history, and reloadable.

> **Engagement Rate** is computed as:
>
> ```
> Engagement Rate = (Likes + Comments) / Views × 100
> ```

---

## 📸 Screenshots & UI Walkthrough

### 🏠 Landing Page

The dark, Linear-inspired marketing site — hero with a live dashboard preview, alternating feature sections, changelog, social proof, and a bold call-to-action.

<div align="center">

![CreatorLens landing page](docs/screenshots/home.png)

</div>

### 📊 Dashboard

The three-column workspace: a left sidebar (logo, **New comparison**, nav, and recent analyses), the center comparison cards (side-by-side metrics with the winner highlighted), and the right chat panel with streaming, cited answers.

<div align="center">

![CreatorLens dashboard](docs/screenshots/dash.png)

</div>


---

## ✨ Feature Highlights

| Area | What it does |
| :--- | :--- |
| **Dual-platform ingestion** | YouTube (via `yt-dlp` + `youtube-transcript-api`) and Instagram (via `instaloader` + `yt-dlp`) in one concurrent pipeline. |
| **Metrics & engagement** | Views, likes, comments, follower count, hashtags, upload date **and time**, duration, plus the computed engagement rate. |
| **Whisper transcription** | Reel audio is downloaded and transcribed with Groq `whisper-large-v3` — works **without ffmpeg** (raw container handed to Whisper). |
| **Caption-grounded RAG** | Even when there's no spoken transcript (photo posts), the title + caption + hashtags are indexed so the bot can always describe a post. |
| **Streaming chat** | Server-Sent Events stream the LLM answer token-by-token with a live typing cursor. |
| **Cited answers** | Every claim is cited: `[Video X, Metadata]`, `[Video X, overview]`, or `[Video X, M:SS]` for transcript moments. |
| **Timestamp deep-links** | Transcript citations become **clickable links** that jump to that exact second on YouTube (`&t=225s`). |
| **Conversation memory** | A sliding window (last 5 turns) per analysis; scope-aware so follow-ups stay correct. |
| **Multi-user accounts** | Email + password (bcrypt), JWT in an httpOnly cookie, per-user data isolation. |
| **Saved history** | Every comparison is persisted to Postgres and reloadable; vectors stay queryable in Qdrant. |
| **Persistence everywhere** | Postgres (accounts + history), Qdrant (vectors), httpOnly cookie (session), localStorage (last analysis + cached user). |
| **Apple/Linear-grade UI** | Dark theme, frosted glass, gradient accents, Framer Motion animations, fully responsive. |

---

## 🧰 Tech Stack

```mermaid
flowchart LR
  subgraph FE["Frontend — Next.js 16 (App Router)"]
    A1["React 19"]
    A2["Framer Motion"]
    A3["Radix Tooltip"]
    A4["lucide-react"]
    A5["Tailwind CSS v4"]
  end

  subgraph BE["Backend — FastAPI"]
    B1["LangChain orchestration"]
    B2["SQLAlchemy + psycopg"]
    B3["python-jose (JWT) + bcrypt"]
    B4["yt-dlp / instaloader / youtube-transcript-api"]
  end

  subgraph AI["AI & Data"]
    C1["Groq Llama 3.3 70B"]
    C2["Groq Whisper large-v3"]
    C3["HF all-MiniLM-L6-v2 (local embeddings)"]
    C4["Qdrant Cloud (vectors)"]
    C5["Supabase Postgres"]
    C6["Brevo SMTP"]
  end

  FE -->|"HTTPS / SSE / cookies"| BE
  BE --> AI
```

| Layer | Choice | Why |
| :--- | :--- | :--- |
| **Frontend** | Next.js 16 (App Router), React 19 | Modern routing, server components, fast DX |
| **Animations** | Framer Motion | Apple-grade entrance/stagger/height-auto animations |
| **Backend** | FastAPI | Async, typed, great for SSE streaming |
| **Orchestration** | LangChain (`ConversationalRetrievalChain`) | Battle-tested RAG with memory + condense step |
| **LLM** | Groq Llama 3.3 70B | Extremely fast inference, generous free tier |
| **Transcription** | Groq Whisper `large-v3` | Accurate, fast, cheap |
| **Embeddings** | `sentence-transformers/all-MiniLM-L6-v2` (local, 384-dim) | Zero API cost, runs on CPU |
| **Vector DB** | Qdrant Cloud | Scalable, multi-tenant via payload filters |
| **Database** | Postgres (Supabase) via SQLAlchemy | Accounts + saved analyses |
| **Auth** | JWT (python-jose) + bcrypt | Stateless, cookie or bearer |
| **Email** | Brevo SMTP | Transactional welcome email |

---

## 🏗️ System Architecture

```mermaid
flowchart TB
  subgraph Client["🖥️ Browser"]
    L["Landing / Auth pages"]
    D["Dashboard (3-column)"]
    CH["Chat panel (SSE consumer)"]
  end

  subgraph API["⚙️ FastAPI Backend"]
    AR["auth_router\n/api/auth/*"]
    VR["videos router\n/api/videos/*"]
    CR["chat router\n/api/chat/*"]
    MW["JWT auth dependency\n(get_current_user)"]
  end

  subgraph SVC["🧩 Services"]
    YT["youtube_service"]
    IG["instagram_service"]
    VEC["vector_service\n(Qdrant + embeddings)"]
    RAG["rag_service\n(LangChain + Groq)"]
    EM["email_service"]
  end

  subgraph EXT["☁️ External"]
    QD[("Qdrant Cloud")]
    PG[("Supabase Postgres")]
    GROQ["Groq API\n(LLM + Whisper)"]
    YTDLP["YouTube / Instagram\n(yt-dlp, instaloader)"]
    SMTP["Brevo SMTP"]
  end

  L --> AR
  D --> VR
  CH --> CR
  AR --> MW
  VR --> MW
  CR --> MW

  VR --> YT --> YTDLP
  VR --> IG --> YTDLP
  IG --> GROQ
  VR --> VEC --> QD
  VR --> PG
  CR --> RAG --> VEC
  RAG --> GROQ
  AR --> PG
  AR --> EM --> SMTP
```

**The 7 conceptual layers:**

1. **Presentation** — Next.js pages (landing, auth, dashboard) + the SSE chat consumer.
2. **API / Auth** — FastAPI routers guarded by a JWT dependency; CORS with credentials for the cookie.
3. **Scraping & parsing** — `youtube_service` and `instagram_service` extract metadata + transcripts concurrently.
4. **Transcription** — Groq Whisper turns Reel audio into timestamped text.
5. **Embedding & indexing** — local MiniLM embeddings → Qdrant, tagged with `user_id`, `analysis_id`, `video_id`.
6. **RAG orchestration** — LangChain retrieves balanced chunks from both videos, injects a metadata block, and streams a Groq answer with memory.
7. **Transport** — Server-Sent Events stream tokens + a final `sources` event.

---

## 🔄 Data & Request Flows

### Ingestion Pipeline (`/process`)

```mermaid
sequenceDiagram
  autonumber
  participant U as User (Browser)
  participant FE as Next.js
  participant API as FastAPI /api/videos/process
  participant YT as youtube_service
  participant IG as instagram_service
  participant GR as Groq Whisper
  participant VEC as vector_service
  participant QD as Qdrant
  participant PG as Postgres

  U->>FE: Paste YouTube + Instagram URLs, click Analyze
  FE->>API: POST /process (cookie auth) { youtube_url, instagram_url }
  API->>API: generate analysis_id, scope (user_id, analysis_id)
  par Concurrent scraping
    API->>YT: get_youtube_data(url)
    YT-->>API: metadata + transcript (captions)
  and
    API->>IG: get_instagram_data(url)
    IG->>GR: transcribe reel audio (if video)
    GR-->>IG: timestamped transcript
    IG-->>API: metadata + transcript/caption
  end
  API->>API: compute engagement rate for both
  API->>VEC: process_and_store(video A), process_and_store(video B)
  VEC->>VEC: chunk (overview + transcript), embed (MiniLM)
  VEC->>QD: upsert points (user_id, analysis_id, video_id)
  API->>PG: INSERT analysis row (id = analysis_id)
  API->>API: set_video_metadata() for the RAG prompt
  API-->>FE: { analysis_id, video_a, video_b }
  FE->>U: Render comparison cards + point chat at analysis_id
```

### RAG Chat Flow (SSE Streaming)

```mermaid
sequenceDiagram
  autonumber
  participant U as User
  participant FE as ChatInterface (SSE)
  participant API as FastAPI /api/chat/stream
  participant RAG as rag_service
  participant VEC as vector_service
  participant QD as Qdrant
  participant LLM as Groq Llama 3.3 70B

  U->>FE: Ask "Why did Video A win?"
  FE->>API: POST /chat/stream?analysis_id=... { message }
  API->>RAG: ask_question(message)
  RAG->>RAG: condense follow-up (scope-preserving prompt)
  RAG->>VEC: BalancedRetriever → top-k from A and B
  VEC->>QD: query_points(filter: user_id + analysis_id + video_id)
  QD-->>VEC: relevant chunks (+ payload)
  VEC-->>RAG: documents (with timestamps + deep links)
  RAG->>LLM: system (metadata block) + context + question
  loop token by token
    LLM-->>API: token
    API-->>FE: data: <token>
    FE->>U: append to bubble (live cursor)
  end
  API-->>FE: event: sources \n data: [citations]
  API-->>FE: data: [DONE]
  FE->>U: render clickable citations / deep links
```

### Authentication Flow

```mermaid
sequenceDiagram
  autonumber
  participant U as User
  participant FE as Next.js (AuthProvider)
  participant API as /api/auth
  participant PG as Postgres
  participant SMTP as Brevo

  U->>FE: Submit register/login form
  FE->>API: POST /register or /login (credentials: include)
  API->>PG: create or verify user (bcrypt hash)
  alt new account
    API->>SMTP: send welcome email (best-effort)
  end
  API-->>FE: { access_token, user } + Set-Cookie: access_token (httpOnly)
  FE->>FE: persist user in localStorage
  FE->>API: GET /me on mount (cookie) to verify session
  API-->>FE: user (or 401 → redirect to /login)
```

### History / Load Flow

```mermaid
sequenceDiagram
  autonumber
  participant U as User
  participant FE as Dashboard
  participant API as /api/videos
  participant PG as Postgres
  participant RAG as rag_service

  U->>FE: Click a saved analysis in the sidebar
  FE->>API: POST /videos/load/{analysis_id}
  API->>PG: fetch analysis row (scoped to user)
  API->>RAG: re-hydrate metadata + reset chat memory for that scope
  API-->>FE: AnalysisSummary (video_a, video_b)
  FE->>FE: render cards, point chat at analysis_id (vectors already in Qdrant)
  U->>FE: Chat against the reopened comparison
```

---

## 🗄️ Database Schema

Postgres (Supabase). Tables are namespaced `cl_` to avoid collisions with other Supabase tables.

```mermaid
erDiagram
  CL_USERS ||--o{ CL_ANALYSES : "owns"

  CL_USERS {
    string id PK "uuid"
    string email UK
    string name
    string password_hash "bcrypt"
    datetime created_at
  }

  CL_ANALYSES {
    string id PK "uuid = analysis_id"
    string user_id FK
    text youtube_url
    text instagram_url
    json video_a "VideoMetadata card"
    json video_b "VideoMetadata card"
    int chunks_stored
    datetime created_at
  }
```

| Table | Purpose |
| :--- | :--- |
| `cl_users` | Account records; one row per registered creator. |
| `cl_analyses` | One row per saved comparison; its `id` is the `analysis_id` used to scope vectors + chat. |

---

## 🧬 Vector Store Design (Qdrant)

A single collection `creator_lens` holds every chunk from every user. Isolation and reload are achieved entirely through **payload filtering** — no per-user collections to manage.

```mermaid
flowchart LR
  subgraph Point["Qdrant Point"]
    V["384-dim vector\n(MiniLM embedding)"]
    P["payload"]
  end
  P --> p1["user_id (indexed)"]
  P --> p2["analysis_id (indexed)"]
  P --> p3["video_id: A | B (indexed)"]
  P --> p4["content_type: overview | transcript"]
  P --> p5["timestamp, source_url"]
  P --> p6["creator, views, likes, engagement_rate..."]
  P --> p7["page_content (the chunk text)"]
```

- **Chunking:** `RecursiveCharacterTextSplitter`, **500 chars / 50 overlap**.
- **Always-present overview chunk:** title + creator + caption/description, so retrieval never comes back empty.
- **Balanced retrieval:** the custom `BalancedRetriever` pulls top-k from **both** Video A and Video B and interleaves them, so neither side dominates the LLM context.
- **Deterministic point IDs:** `uuid5(user_id/analysis_id/video_id/chunk_index)` — re-ingesting a slot overwrites cleanly.

---

## 📁 Project Structure

```
CreatorLens/
├── docs/
│   ├── logo.png
│   ├── banner.png
│   └── screenshots/                  # README screenshots (01-…png … 11-…png)
│
├── backend/                          # FastAPI service
│   ├── main.py                       # App entry: routers, CORS, startup (DB init + warmup)
│   ├── db.py                         # SQLAlchemy engine + User / Analysis models (cl_*)
│   ├── auth.py                       # bcrypt hashing, JWT, get_current_user dependency
│   ├── models.py                     # Pydantic request/response schemas
│   ├── requirements.txt
│   ├── routers/
│   │   ├── auth_router.py            # /api/auth: register, login, me, logout
│   │   ├── videos.py                 # /api/videos: process, history, load, thumbnail-proxy
│   │   └── chat.py                   # /api/chat: stream (POST), legacy (GET), reset
│   ├── services/
│   │   ├── youtube_service.py        # yt-dlp metadata + youtube-transcript-api
│   │   ├── instagram_service.py      # instaloader + yt-dlp + Groq Whisper + session auth
│   │   ├── vector_service.py         # Qdrant client, embeddings, chunk/store/retrieve
│   │   ├── rag_service.py            # LangChain chain, prompts, memory, streaming, deep-links
│   │   └── email_service.py          # Brevo SMTP welcome email
│   ├── create_ig_session.py          # One-off: build an Instagram session from browser cookies
│   ├── session_from_cookie.py        # One-off: build a session from a pasted sessionid
│   └── verify_*.py                   # Regression / smoke-test scripts
│
└── frontend/                         # Next.js 16 app
    ├── app/
    │   ├── layout.jsx                # Root layout + AuthProvider + Toaster + favicon
    │   ├── page.jsx                  # Landing page (marketing)
    │   ├── globals.css               # Design system: keyframes + utilities
    │   ├── login/page.jsx            # Sign in (+ shared AuthShell/Field/SubmitButton)
    │   ├── register/page.jsx         # Sign up
    │   └── app/page.jsx              # The dashboard (protected, 3-column)
    ├── components/
    │   ├── Logo.jsx                  # Brand mark / wordmark
    │   ├── DashboardPreview.jsx      # Static dashboard replica for the landing hero
    │   ├── VideoCard.jsx             # Comparison card (metrics, winner badge, hashtags)
    │   ├── SkeletonVideoCard.jsx     # Loading placeholder
    │   ├── ChatInterface.jsx         # Chat panel (consumes useStreamingChat)
    │   ├── MessageBubble.jsx         # Markdown renderer + clickable citations
    │   ├── EmptyState.jsx            # Chat empty state (radar ripple + suggestions)
    │   └── ProcessingBar.jsx         # Indeterminate progress bar
    ├── hooks/
    │   ├── useAuth.jsx               # Auth context (login/register/logout/session)
    │   ├── useVideoProcessor.js      # Ingestion flow + step messages + loadVideos
    │   └── useStreamingChat.js       # SSE chat lifecycle (send/stop/retry/clear)
    ├── lib/
    │   └── api.js                    # Single API layer (NEXT_PUBLIC_API_URL)
    └── public/
        ├── logo.png                  # Icon mark
        └── logo-wordmark.png         # Horizontal lockup
```

---

## 🔌 API Reference

Base URL: `http://localhost:8000`. All routes except auth and the thumbnail proxy require a valid session (JWT cookie or `Authorization: Bearer <token>`).

### Auth — `/api/auth`

| Method | Endpoint | Body | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/register` | `{ email, password, name? }` | Create account, set cookie, return token + user |
| `POST` | `/login` | `{ email, password }` | Verify credentials, set cookie, return token + user |
| `GET` | `/me` | — | Return the current user (validates session) |
| `POST` | `/logout` | — | Clear the auth cookie |

### Videos — `/api/videos`

| Method | Endpoint | Body / Params | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/process` | `{ youtube_url, instagram_url }` | Run the full ingestion pipeline; returns `analysis_id` + both cards |
| `GET` | `/history` | — | List the user's saved analyses (most recent first) |
| `POST` | `/load/{analysis_id}` | — | Reopen a saved analysis (re-hydrate RAG + reset memory) |
| `GET` | `/thumbnail-proxy?url=` | query `url` | Server-side proxy for Instagram CDN thumbnails (CORS bypass) |

### Chat — `/api/chat`

| Method | Endpoint | Params / Body | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/stream?analysis_id=` | `{ message }` | SSE stream: `data: <token>` … `event: sources` … `data: [DONE]` |
| `GET` | `/?query=&analysis_id=` | query | Legacy SSE (JSON frames: `content` / `citations` / `done`) |
| `POST` | `/reset?analysis_id=` | — | Clear the conversation memory for that analysis |

### Health

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/health` | `{ status, model, vector_db, database }` |

> Interactive Swagger docs: **http://localhost:8000/docs**

---

## ⚙️ Local Setup

### Prerequisites

- **Python 3.10+**
- **Node.js 18+**
- A **Groq API key** — free at [console.groq.com](https://console.groq.com/)
- A **Qdrant** cluster (free tier at [cloud.qdrant.io](https://cloud.qdrant.io/))
- A **Postgres** database (free tier at [supabase.com](https://supabase.com/))
- *(Optional)* **Brevo** SMTP for welcome emails, **ffmpeg** for smaller audio uploads, and an Instagram throwaway account for reliable Reel scraping

### 1. Clone

```bash
git clone https://github.com/YASAR300/CreatorLens.git
cd CreatorLens
```

### 2. Backend

```bash
cd backend
python -m venv venv
# Windows
.\venv\Scripts\activate
# macOS / Linux
source venv/bin/activate

pip install -r requirements.txt
```

Create `backend/.env` (see [Environment Variables](#-environment-variables)), then run:

```bash
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

> ⚠️ The entry point is **`main:app`** (the multi-user app with Qdrant + Postgres + auth).

### 3. Frontend

```bash
cd ../frontend
npm install
# optional: echo NEXT_PUBLIC_API_URL=http://localhost:8000 > .env.local
npm run dev
```

Open **http://localhost:3000**, create an account, and run your first comparison.

### 4. (Optional) Instagram session

Anonymous Instagram scraping is rate-limited. To use an account reliably:

```bash
# from backend/ with the venv active
python create_ig_session.py            # imports cookies from your browser
# or, paste a sessionid copied from DevTools:
python session_from_cookie.py "<sessionid>"
```

---

## 🔑 Environment Variables

Create `backend/.env` (never commit it — it's gitignored). Template in [`.env.example`](.env.example):

```env
# ── Groq ──
GROQ_API_KEY=gsk_...

# ── Server ──
HOST=127.0.0.1
PORT=8000
ENV=development

# ── Instagram (optional throwaway account) ──
INSTAGRAM_USERNAME=
INSTAGRAM_PASSWORD=

# ── Postgres (Supabase) ──
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/postgres
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_ANON_KEY=

# ── Qdrant ──
QDRANT_URL=https://YOUR-CLUSTER.cloud.qdrant.io:6333
QDRANT_API_KEY=

# ── SMTP (Brevo) ──
SMTP_USER=
SMTP_PASSWORD=
SMTP_SERVER=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_FROM=you@example.com

# ── Auth ──
JWT_SECRET=generate_a_long_random_string
JWT_EXPIRE_MINUTES=10080
```

Frontend (optional) `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## 🧠 How the RAG Pipeline Works (Deep Dive)

```mermaid
flowchart TD
  Q["User question"] --> CO["Condense step\n(scope-preserving rephrase)"]
  CO --> RET["BalancedRetriever"]
  RET -->|"top-k filter video_id=A"| QA["Qdrant query (A)"]
  RET -->|"top-k filter video_id=B"| QB["Qdrant query (B)"]
  QA --> MERGE["Interleave A/B docs"]
  QB --> MERGE
  MERGE --> CTX["Context block\n(chunks + timestamps + metadata)"]
  META["Global metadata block\n(creator, views, ER, dates…)"] --> SYS["System prompt"]
  CTX --> PROMPT["Final prompt"]
  SYS --> PROMPT
  HIST["Window memory (last 5 turns)"] --> PROMPT
  PROMPT --> LLM["Groq Llama 3.3 70B (streaming)"]
  LLM --> ANS["Answer (Markdown, cited)"]
  ANS --> LINKS["Citations → deep links\n[Video A, 3:45] → &t=225s"]
```

**Key design choices inside the chain:**

1. **Metadata block as source of truth.** The exact numbers (views, likes, engagement, dates, follower counts) are injected into the system prompt, so metric questions are answered from authoritative data — not fuzzy retrieval.
2. **Scope-preserving condense prompt.** The default LangChain rephraser tends to narrow a follow-up ("engagement of each") to the last-discussed video. A custom condense prompt keeps "each/both/compare" covering **both** videos, while single-video questions stay single.
3. **Balanced retrieval.** Pulls from both videos independently and interleaves, guaranteeing both sides are represented regardless of semantic distance.
4. **Structured output rules.** Improvement/suggestion answers always render as clean numbered Markdown lists (`**lead-in**: sentence`), never a wall of text.
5. **Timestamp citations.** Transcript chunks carry `t=M:SS`; the LLM cites them as `[Video X, M:SS]`, and the frontend converts those into clickable YouTube seek links.
6. **Per-analysis memory.** Each saved comparison has its own sliding-window memory keyed by `user_id:analysis_id`.

---

## 📊 Cost & Scalability Analysis

This stack is deliberately chosen to be **near-zero cost at low volume** and **horizontally scalable** at high volume.

### Daily cost at ~1,000 active creators/day

| Component | Tech | Pricing model | Est. cost / day |
| :--- | :--- | :--- | :--- |
| **LLM inference** | Groq Llama 3.3 70B | Free tier (≈ $0.59 / M tokens retail) | **~$6** (assuming 5 long queries/user) |
| **Transcription** | Groq Whisper `large-v3` | Free tier (≈ $0.03 / hr retail) | **~$0** |
| **Embeddings** | local MiniLM (CPU) | Self-hosted, 0 API calls | **$0** |
| **Vector DB** | Qdrant Cloud | Free / starter tier | **~$0** |
| **Database** | Supabase Postgres | Free tier | **~$0** |
| **Scraping** | yt-dlp / instaloader | Direct requests | **$0** |
| **Email** | Brevo SMTP | Free tier (300/day) | **$0** |
| **Total** | | | **≈ $6 / day** |

### What breaks at 10,000+ users/day — and the fix

| Bottleneck | Why it breaks | Mitigation |
| :--- | :--- | :--- |
| **Instagram rate-limiting** | IP gets blocked on unauth scraping | Rotating residential proxies (BrightData/ScrapingBee) or Meta Graph API once creators link accounts |
| **Local embedding CPU** | MiniLM on one host saturates CPU/RAM | Move embeddings to a GPU microservice or HF Serverless Inference; batch + queue |
| **LLM throughput / rate limits** | Groq free-tier RPM caps | Paid tier, request queue, response caching for repeated questions |
| **Whisper latency** | Long reels block the pipeline | Offload to a background worker (Celery/RQ) + webhook when ready |
| **Postgres connections** | Pooler limits under spikes | PgBouncer / Supabase pooler tuning, read replicas |
| **Single API process** | One uvicorn worker is a ceiling | Horizontal scale behind a load balancer; Qdrant + Postgres are already external/shared |

> **Why this is the highest-quality, lowest-cost design:** the two genuinely expensive things (embeddings and a vector DB) are free here — embeddings run locally and Qdrant's free tier covers early scale — while Groq gives near-instant LLM + Whisper at a fraction of GPT-4-class pricing. The only variable cost is LLM tokens, and even that stays around $6/day at 1k creators.

---

## 🧩 Engineering Decisions & Trade-offs

- **Qdrant over embedded ChromaDB.** ChromaDB's single-process SQLite file locks under concurrent multi-user writes. Qdrant is purpose-built for concurrent vector search and multi-tenancy via payload filters — the right call the moment accounts exist.
- **Payload filtering over per-user collections.** One `creator_lens` collection filtered by `user_id` + `analysis_id` is far simpler to operate than thousands of collections, and Qdrant indexes those keyword fields for fast scoped queries.
- **Local embeddings over an embeddings API.** MiniLM (384-dim) is cheap, fast on CPU, and good enough for short-form transcripts — eliminating a per-call cost and an external dependency.
- **bcrypt called directly (not via passlib).** Newer `bcrypt` releases broke passlib's auto-truncation; calling `bcrypt` directly with explicit 72-byte truncation is robust.
- **ffmpeg-optional transcription.** yt-dlp normally needs ffmpeg to extract audio; we detect its absence and hand the raw container straight to Groq Whisper, removing a hard system dependency.
- **Caption as a first-class document.** Photo carousels have no audio. Indexing the title + caption guarantees the bot can always answer "what is this about?".
- **500/50 chunking.** Short-form transcripts are small; 500-char chunks with 50 overlap balance retrieval granularity against context bloat.

---

## 🔐 Security Notes

- **Secrets** live only in `backend/.env` (gitignored). `.env.example` documents the keys with placeholders. Never commit real credentials.
- **Auth tokens** are JWTs delivered via an **httpOnly cookie** (XSS-resistant) and also accepted as a bearer header. CORS is restricted to known origins with credentials enabled.
- **Passwords** are bcrypt-hashed; plaintext is never stored.
- **Per-user isolation** is enforced at the data layer: Qdrant queries and Postgres rows are always filtered by the authenticated `user_id`.
- **Instagram session files** (`backend/ig_sessions/`) contain live session cookies and are gitignored — treat them like passwords.
- **External content** (scraped pages, model output) is treated as untrusted; the thumbnail proxy validates URLs before fetching.

> 🔁 If you ever exposed credentials (e.g. in a chat or screenshot), **rotate them**: Qdrant API key, Supabase DB password, Groq key, and set a long random `JWT_SECRET`.

---

## 🧪 Testing & Verification

The backend ships with smoke/regression scripts (run from `backend/` with the venv active):

| Script | What it checks |
| :--- | :--- |
| `verify_full_flow.py` | Register → process → chat → history → 401 enforcement |
| `verify_qa_suite.py` | A battery of creator questions vs. the actually-scraped metadata |
| `verify_vector_service.py` | Chunking, embedding, store/retrieve |
| `verify_rag_service.py` | Chain wiring + memory |
| `verify_endpoints.py` | Endpoint availability |

Frontend quality gates:

```bash
cd frontend
npm run lint     # zero errors, zero warnings
npm run build    # all routes compile
```

---

## 🗺️ Roadmap

- [ ] TikTok + YouTube Shorts ingestion
- [ ] Instagram timestamp deep-links (pending platform support)
- [ ] Export a comparison as a shareable PDF/PNG report
- [ ] Multi-video (3+) comparisons
- [ ] Background job queue for long transcriptions
- [ ] Team workspaces & shared history
- [ ] Real screenshot capture in CI for the README

---

## ❓ FAQ

**Q: Instagram views show 0 — bug?**
Photo carousels (not video reels) don't expose video views; `0` is correct. Use an actual `/reel/...` URL for view counts, and add an Instagram session for reliable scraping.

**Q: Chat says "no transcript" for a reel.**
Either it's a photo post (no audio) or transcription failed. The bot still answers from the caption/title. Install ffmpeg and ensure `GROQ_API_KEY` is set for best transcription.

**Q: Timestamp links don't seek on Instagram.**
Instagram has no public timestamp-seek parameter, so Instagram citations link to the post. YouTube transcript citations seek to the exact second via `&t=`.

**Q: Where's my data stored?**
Accounts + saved analyses in Postgres, vectors in Qdrant, session in an httpOnly cookie, and a last-analysis snapshot + cached user in `localStorage`.

---

<div align="center">

**CreatorLens** — built with FastAPI, Qdrant, LangChain, Groq, and Next.js.

<sub>Compare. Chat. Improve.</sub>

</div>
