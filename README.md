# ScrapeX — Autonomous Web Scraping Agent

An autonomous web data extraction, multi-source research, and synthesis agent powered by **Bright Data Model Context Protocol (MCP)**, **LangChain / LangGraph ReAct**, a lightweight **TF-IDF Semantic Tool Retriever** (< 15 MB RAM), and a modern **Next.js 16 (React + Tailwind CSS / shadcn b0)** conversational interface.

---

## 🌟 Key Architecture & Features

### 1. Bright Data MCP Integration via LangChain
- Connects directly to the official `@brightdata/mcp` server over standard I/O (`stdio`) with Node 22+.
- Automatically converts raw MCP tools into native **LangChain `BaseTool`** instances with runtime Pydantic schema validation (`mcp_tools.py`).
- **Resilient SERP Execution**: Automatically detects `site:` queries and transparently falls back between Google and Bing engines to prevent search syntax failures.

### 2. Multi-Layer Guardrails & Rate Limiting
- **In-Memory Rate Limiting**: Sliding-window rate limiter per client IP (10 requests/minute, `X-Forwarded-For` proxy aware) preventing denial-of-service and API quota exhaustion.
- **Input Bounds Validation**: Pydantic constraints enforce query lengths strictly between 3 and 1500 characters, mitigating prompt injection and payload flooding.
- **Output Safety Guard**: Enforces token-safe truncation (`MAX_TOOL_OUTPUT_CHARS = 4000`) on tool returns to prevent context window overflow.
- **Dual-LLM Failover**: Automatically recovers from Gemini rate limits or quota drops by routing instantly to Groq Qwen.

### 3. Ultra-Lightweight TF-IDF Semantic Tool Retriever (< 15 MB RAM)
- Rather than passing all 32+ MCP tools to the LLM (which wastes prompt tokens and causes reasoning dilution), ScrapeX dynamically indexes and filters tools on every query (`tool_retriever.py`):
  - Uses `scikit-learn` **TF-IDF Vectorizer** with cosine similarity and synthetic query-intent boosting.
  - Replaces heavy PyTorch/FAISS embeddings, cutting memory usage from **> 500 MB down to < 15 MB** and eliminating 2.5 GB of CUDA container bloat.
  - Indexes tools in **< 0.005 seconds**, allowing the service to run smoothly on constrained hosting environments (e.g., Render 512 MB free tier).

### 4. Non-Blocking Startup & Instant Port Binding
- Uses an asynchronous background task (`asyncio.create_task`) inside the FastAPI `lifespan` handler.
- Binds to the network port and serves `/health` checks in **< 1 second**, preventing deployment timeouts ("No open ports detected") on platforms like Render, Railway, and AWS ECS while MCP initializes in the background.

### 5. Dual-LLM Resilience with Automatic Fallback
- **Primary Model**: `gemini-3.1-flash-lite` (Google Generative AI) for rapid, cost-effective reasoning.
- **Fallback Model**: `qwen/qwen3.8-27b` via **Groq** (`ChatGroq`) for ultra-low latency failover.
- Chained with `primary_llm.with_fallbacks([fallback_llm])`: automatically switches to Groq if Gemini hits rate limits, quotas, or outages.
- **Enterprise TLS Compatibility**: Automatic system certificate injection via `truststore` and `certifi` for corporate firewall and Windows environments.

### 6. Real-Time Streaming & Live Dashboard (Next.js 16)
- **Server-Sent Events (`/api/scrape/stream`)**: Streams structured agent stages in real time: `metadata`, `tool_call`, `tool_result`, `final_result`, `complete`, and `error`.
- **Live Tool Execution Tracing**: Collapsible UI drawer inspecting tool arguments, execution duration, and previewing raw returned data.
- **Modern Minimalist UI**: Built with Tailwind CSS and shadcn neutral b0 design tokens, featuring a centered 3/4-width prompt bar.

### 7. Zero-Database Client-Side Persistence
- Chat history, sessions, and agent configurations persist directly in browser `localStorage`.
- Supports creating new sessions, switching conversations, searching history, and exporting sessions to formatted Markdown without requiring an external database.

---

## 🏗️ System Architecture

```text
┌────────────────────────────────────────────────────────┐
│               ScrapeX Frontend (Next.js 16)            │
│  - Conversational Dashboard (shadcn b0 neutral style)   │
│  - SSE Stream Consumer (/api/scrape/stream)            │
│  - LocalStorage Session Manager (Zero DB required)     │
└───────────────────────────┬────────────────────────────┘
                            │ HTTP POST (SSE)
                            ▼
┌────────────────────────────────────────────────────────┐
│                 FastAPI Agent Engine                   │
│                      (main.py)                         │
│                                                        │
│  1. Non-Blocking Boot ──► Instant Port Binding (<1s)   │
│  2. In-Memory Guard   ──► IP Rate Limiting (10 req/m)  │
│  3. Tool Retriever    ──► TF-IDF Vectorizer (top-k)    │
│  4. LangGraph ReAct   ──► Gemini 3.1 Flash (Primary)   │
│                           └─► Groq Qwen (Fallback)     │
│  5. Tool Dispatch     ──► MCPToolWrapper (mcp_tools.py)│
└───────────────────────────┬────────────────────────────┘
                            │ stdio ClientSession (Node 22)
                            ▼
┌────────────────────────────────────────────────────────┐
│             Bright Data MCP Server                     │
│               (@brightdata/mcp)                        │
│  - search_engine (Google / Bing SERP with fallback)    │
│  - scrape_as_markdown (Clean web text & tables)        │
│  - scraping_browser (Dynamic JS & CAPTCHA unlock)      │
└────────────────────────────────────────────────────────┘
```

---

## 📂 Project Structure

```text
ScrapeX-Web-Scraping-Agent/
├── main.py                # FastAPI backend & LangGraph ReAct agent pipeline
├── mcp_tools.py           # Bright Data MCP stdio manager & LangChain tool converter
├── tool_retriever.py      # TF-IDF semantic vector index & top-k tool retriever
├── requirements.txt       # Lean Python backend dependencies (no torch/CUDA)
├── Dockerfile             # Multi-stage production container (Node 22 + Python 3.12)
├── .dockerignore          # Docker build ignore rules
├── .gitignore             # Git ignore rules
├── .env.example           # Environment template
│
└── frontend/              # Next.js 16 + Tailwind CSS + shadcn (b0 preset)
    ├── src/
    │   ├── app/           # App Router (page.tsx, layout.tsx, globals.css)
    │   ├── components/    # UI components (ChatMessage, ChatInput, Sidebar, Header)
    │   ├── lib/           # SSE API stream consumer & LocalStorage persistence
    │   └── types/         # TypeScript definitions
    ├── package.json
    └── tailwind.config.ts
```

---

## 🚀 Local Development Setup

### 1. Prerequisites
- **Python**: 3.10+ (Python 3.12 recommended)
- **Node.js**: v22+ (required by `@brightdata/mcp`)
- **API Keys**:
  - [Google AI Studio](https://aistudio.google.com/) (`GOOGLE_API_KEY`)
  - [Groq Console](https://console.groq.com/) (`GROQ_API_KEY`)
  - [Bright Data](https://brightdata.com/) (`BRIGHT_DATA_API_TOKEN`)

---

### 2. Backend Setup

1. **Create and activate a virtual environment**:
   ```bash
   python -m venv venv
   # On Windows:
   .\venv\Scripts\activate
   # On macOS/Linux:
   source venv/bin/activate
   ```

2. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Configure Environment Variables (`.env`)**:
   Create a `.env` file in the project root:
   ```ini
   # LLM Keys
   GOOGLE_API_KEY=AIzaSy...
   GROQ_API_KEY=gsk_...

   # Bright Data MCP
   BRIGHT_DATA_API_TOKEN=...
   WEB_UNLOCKER_ZONE=mcp_unlocker
   BROWSER_ZONE=mcp_browser

   # Optional LangSmith Tracing
   LANGCHAIN_TRACING_V2=false
   LANGCHAIN_API_KEY=
   ```

4. **Start the FastAPI Backend**:
   ```bash
   python main.py
   ```
   *The backend binds immediately to `http://localhost:8000` and initializes the Bright Data MCP tools in the background.*

---

### 3. Frontend Setup

1. **Navigate to the frontend directory**:
   ```bash
   cd frontend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables (Optional)**:
   Defaults to `http://localhost:8000`. To customize, create `frontend/.env.local`:
   ```ini
   NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
   ```

4. **Run the Next.js development server**:
   ```bash
   npm run dev
   ```
   Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 🌐 Production Deployment

The recommended production architecture deploys the backend container on **Render** (or Railway/Fly.io) and the static/SSR frontend on **Vercel**.

### Backend on Render (Web Service)

1. Create a new **Web Service** on [Render](https://dashboard.render.com/) and connect your GitHub repository.
2. Select **Docker** as the runtime environment:
   - **Root Directory**: `.` (leave default)
   - **Dockerfile Path**: `./Dockerfile`
   - **Instance Type**: Free or Starter (512 MB RAM is fully sufficient with ScrapeX's TF-IDF retriever)
3. Set Environment Variables in Render:
   - `GOOGLE_API_KEY`
   - `GROQ_API_KEY`
   - `BRIGHT_DATA_API_TOKEN`
   - `WEB_UNLOCKER_ZONE`
   - `BROWSER_ZONE`
4. Deploy. The Docker container binds dynamically to `${PORT:-8000}` and responds to health checks instantly.

---

### Frontend on Vercel

1. Import your repository into [Vercel](https://vercel.com/).
2. Set the **Root Directory** to `frontend`.
3. Add the production environment variable:
   - `NEXT_PUBLIC_BACKEND_URL` = `https://your-backend-app.onrender.com`
4. Deploy. Vercel will automatically build and serve the Next.js app.

---

## 🔍 Observability & Logs

To inspect agent execution traces, errors, or memory events:

1. **Render Cloud Logs**:
   - Access **Render Dashboard → Your Service → Logs** to monitor MCP child process spawning, port bindings, and memory usage.
2. **Browser Network EventStream**:
   - Open Developer Tools (`F12`) → **Network** → filter by `Fetch/XHR`.
   - Click the `/api/scrape/stream` request and switch to the **EventStream** tab to see real-time JSON packets:
     - `metadata`: Selected model and retrieved tools.
     - `tool_call`: Tool invocation parameters.
     - `tool_result`: Output preview and character counts.
     - `final_result`: Formatted agent synthesis.
3. **LangSmith Graph Tracing (Optional)**:
   - Set `LANGCHAIN_TRACING_V2=true` and provide `LANGCHAIN_API_KEY` in `.env` to visualize the full LangGraph ReAct execution graph, token usage, and latency.

---

## 💬 Example Queries to Try

- **E-Commerce Comparison**:
  > *"Find the top 5 noise-cancelling headphones on Amazon and compare prices, specifications, and user consensus."*
- **Developer & Tech Forums**:
  > *"What are developers currently discussing on Reddit regarding AI coding agents and LangGraph architectures?"*
- **Live Financial & Business News**:
  > *"Search for recent reports and announcements regarding the Reliance Jio IPO valuation and timeline. Include source links."*
- **Product Reviews & Extraction**:
  > *"Scrape the main features and pricing tiers of Supabase from their website and summarize them in a Markdown table."*

---

## 🛡️ License

This project is licensed under the MIT License.
