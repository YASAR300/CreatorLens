# CreatorLens: Full-Stack RAG Creator Chatbot

An elite, cost-efficient full-stack RAG (Retrieval-Augmented Generation) dashboard that enables content creators to dynamically compare a **YouTube Video** and an **Instagram Reel**, analyze metrics, and chat with their transcripts in real-time.

---

## 🏗️ Architectural Overview

CreatorLens implements a robust 7-layer architecture designed for high-performance and zero cold-starts:

```
┌─────────────────────────────────────────────────────────────┐
│                       Next.js Frontend                      │
│   (Comparison Cards, Glassmorphic Chat Panel, SSE Stream)    │
└──────────────┬───────────────────────────────▲──────────────┘
               │ POST /api/ingest              │ SSE Stream
               ▼                               │ (Chat response)
┌──────────────────────────────────────────────┴──────────────┐
│                       FastAPI Backend                       │
│    (Orchestrates scraping, transcribing, indexing & RAG)    │
└──────────────┬───────────────────────────────▲──────────────┘
               │ Scrapes / Transcribes         │ Retrieves Context
               ▼                               │ Chunks
┌──────────────────────────────────────────────┴──────────────┐
│  Data Layer: instaloader, youtube-transcript-api, yt-dlp   │
│  Embeddings: HuggingFace sentence-transformers (Local CPU)  │
│  Vector Index: ChromaDB (Embedded local instance)            │
└─────────────────────────────────────────────────────────────┘
```

1. **Ingestion & Parsing**: Scraping engines automatically extract views, likes, comments, and follower metrics.
2. **Dynamic Metrics Calculation**: Computes engagement rate using the formula:
   $$\text{Engagement Rate} = \frac{\text{Likes} + \text{Comments}}{\text{Views}} \times 100$$
3. **Audio Extraction & Whisper Transcribing**: Uses `yt-dlp` to pull Instagram Reel audio tracks, transcribing them asynchronously via Groq's super-fast Whisper API (`whisper-large-v3`).
4. **Local Vector Embeddings**: Uses LangChain and `sentence-transformers/all-MiniLM-L6-v2` locally to split the transcripts into semantic chunks (500 characters, 50 overlap) and embed them into 384-dimensional vectors.
5. **ChromaDB Vector Store**: Persists documents locally under `backend/chroma_db` tagged with metadata like `video_id` (`A` or `B`) and `timestamp`.
6. **Streaming RAG Orchestration**: Integrates LangChain with `ConversationBufferWindowMemory` (retains the past 5 turns) and Groq's Llama 3.3 70B model to generate strategic creator suggestions with exact inline citations (e.g. `[Video A, 01:15]`).
7. **Server-Sent Events (SSE)**: Streams responses chunk-by-chunk to the frontend in standard SSE JSON frames.

---

## 📊 Cost & Scalability Analysis (1,000+ Creators / Day)

As a senior backend and AI architect, this stack is selected specifically to minimize operating costs while maximizing reliability and speed.

### Detailed Daily Pricing Breakdown

| Infrastructure Component | Tech Choice | Pricing Model | Cost at 1,000 active creators/day |
| :--- | :--- | :--- | :--- |
| **LLM Inference** | Groq Llama 3.3 70B | Free Tier (or $0.59 / Million Tokens retail) | **~$6.00 / day** (assuming 5 long queries/user) |
| **Embeddings** | local all-MiniLM-L6-v2 | Locally hosted on server (0 API keys) | **$0.00** |
| **Vector DB** | ChromaDB (Migrates to Qdrant) | Local SQLite instance (or Qdrant Free Tier) | **$0.00** |
| **Instagram Scraping** | `instaloader` + `yt-dlp` | Direct connection requests | **$0.00** |
| **Whisper Transcription** | Groq Whisper (`whisper-large-v3`) | Free Tier (or $0.03 / hour equivalent) | **$0.00** |
| **Total Operating Cost** | | | **~$6.00 / Day** |

### Trade-offs & Production Bottlenecks

What breaks at **10,000 users/day** and how do we defend the system?

1. **Instagram IP Rate-Limiting**:
   * *Problem*: Instagram actively blocks IP addresses that make unauthenticated requests to read shortcodes or download audio tracks using `yt-dlp`.
   * *Solution*: Migrate to a rotating residential proxy network (e.g., BrightData, ScrapingBee) or implement Meta Graph API integration if creators register and link their accounts.
2. **Concurrent Vector DB Queries**:
   * *Problem*: Embedded ChromaDB uses a simple single-process SQLite file. Under high concurrent write/read volume, it will bottleneck and experience file locks.
   * *Solution*: Migrate to a dedicated, highly scalable vector search engine like **Qdrant** or **pgvector** in PostgreSQL, deployed in a highly available Docker Swarm or Kubernetes cluster.
3. **Server Memory & CPU**:
   * *Problem*: Running `sentence-transformers` locally for 10,000 concurrent users will bottleneck the host CPU/Memory.
   * *Solution*: Offload embeddings to a serverless endpoint (e.g. HuggingFace Serverless Inference API) or provision GPU-backed microservices to handle text embedding pipelines asynchronously.

---

## 🛠️ Local Setup Instructions

### Prerequisites
- Python 3.10+
- Node.js 18+
- Groq API Key (Create yours for free at [console.groq.com](https://console.groq.com/))

### 1. Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a Python virtual environment:
   ```bash
   python -m venv venv
   # On Windows:
   .\venv\Scripts\activate
   # On macOS/Linux:
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Create a `.env` file in the `backend/` folder based on `.env.example`:
   ```env
   GROQ_API_KEY=your_actual_groq_api_key_here
   ```
5. Run the FastAPI development server:
   ```bash
   python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
   ```
   *The Swagger interactive docs will be available at [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)*.

### 2. Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd ../frontend
   ```
2. Install npm packages:
   ```bash
   npm install
   ```
3. Run the Next.js development server:
   ```bash
   npm run dev
   ```
4. Open your browser and navigate to [http://localhost:3000](http://localhost:3000) to access the interactive dashboard.

---

## 🌟 Strategic Creator RAG Questions to Try
Once you ingest a YouTube video and an Instagram Reel, try these built-in strategic query buttons:
* *"Why did Video A get more engagement than Video B?"*
* *"What's the engagement rate of each?"*
* *"Compare the hooks in the first 5 seconds."*
* *"Who's the creator of Video B and what's their follower count?"*
* *"Suggest improvements for B based on what worked in A."*
