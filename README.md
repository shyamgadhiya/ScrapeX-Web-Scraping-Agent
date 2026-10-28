# ScrapeX — Intelligent Web Scraping Agent

An autonomous web data extraction and synthesis agent powered by **Bright Data Model Context Protocol (MCP)**, **LangChain / LangGraph ReAct**, **FAISS Semantic Tool Filtering**, and a modern **Next.js (React + Tailwind CSS / shadcn b0)** conversational dashboard.

---

## 🌟 Key Architecture & Features

### 1. Bright Data MCP Integration via LangChain
- Connects directly to the official `@brightdata/mcp` server over standard I/O (`stdio`).
- Converts raw MCP tools dynamically into native **LangChain `BaseTool`** instances with generated Pydantic input schemas (`mcp_tools.py`).
- **Resilient SERP Execution**: Automatically falls back between Google and Bing engines when queries contain site-specific syntax (`site:reddit.com`), preventing parser failures.
- **Output Safety Guard**: Enforces token-safe output limits (`MAX_TOOL_OUTPUT_CHARS = 4000`) on tool returns to prevent context window overflow.

### 2. Semantic Tool Retriever & Context Management
- Rather than passing all 16+ MCP tools to the LLM (which consumes excessive prompt tokens and degrades reasoning), ScrapeX uses **`SemanticToolRetriever`** (`tool_retriever.py`):
  - Uses `SentenceTransformer("all-MiniLM-L6-v2")` and **FAISS** (`IndexFlatIP`) with normalized embeddings.
  - Dynamically indexes available tools on server startup.
  - On every user query, retrieves only the **top-$k$ most relevant tools** (default $k=3$) boosted by synthetic intent keywords.
  - Drastically slashes input token costs, avoids context limits, and ensures high tool-calling precision.

### 3. Dual-LLM Resilience with Automatic Fallback
- **Primary Model**: `gemini-3.1-flash-lite` (Google Generative AI) for rapid, cost-effective inference.
- **Fallback Model**: `qwen/qwen3.8-27b` via **Groq** (`ChatGroq`) for ultra-low latency failover.
- Built with `primary_llm.with_fallbacks([fallback_llm])`: if Gemini encounters rate-limits, quota exhaustion, or API overload, Groq takes over automatically without interrupting the user's scraping task.
- **Windows SSL Verification**: Built-in `truststore.inject_into_ssl()` and `certifi` integration to ensure seamless TLS connections on corporate networks.

### 4. Real-Time Streaming & Live Dashboard (Next.js)
- **Server-Sent Events (`/api/scrape/stream`)**: Emits structured live events (`metadata`, `tool_call`, `tool_result`, `final_result`, `complete`, `error`) as the agent thinks and scrapes.
- **Live Tool Execution Trace**: Expandable trace viewer displaying tool arguments, response size, and live previews.
- **1-Click Copy & Export**: Copy formatted Markdown responses or export the whole session as a `.md` file.

### 5. Serverless Browser Session Management
- **Zero Database Required**: Chat history, sessions, and agent parameter preferences persist directly in browser `localStorage`.
- Supports creating new sessions, switching conversations, searching history, and deleting past queries privately on the client side.

---

## 🏗️ System Architecture

```text
┌────────────────────────────────────────────────────────┐
│               ScrapeX Frontend (Next.js)               │
│  - Conversational Dashboard (shadcn b0 neutral style)   │
│  - SSE Stream Consumer (/api/scrape/stream)            │
│  - LocalStorage Session Manager (No DB required)       │
└───────────────────────────┬────────────────────────────┘
                            │ HTTP POST (SSE)
                            ▼
┌────────────────────────────────────────────────────────┐
│                 FastAPI Agent Engine                   │
│                    (main.py)                           │
│                                                        │
│  1. Semantic Filter ──► FAISS Vector Store (top-k)     │
│  2. LangGraph ReAct ──► Gemini 3.1 Flash (Primary)     │
│                         └─► Groq Qwen (Fallback)       │
│  3. Tool Dispatch   ──► MCPToolWrapper (mcp_tools.py)  │
└───────────────────────────┬────────────────────────────┘
                            │ stdio ClientSession
                            ▼
┌────────────────────────────────────────────────────────┐
│             Bright Data MCP Server                     │
│               (@brightdata/mcp)                        │
│  - search_engine (Google / Bing SERP)                  │
│  - scrape_as_markdown (Clean web text & tables)        │
│  - scraping_browser (Dynamic JS & CAPTCHA unlock)      │
└────────────────────────────────────────────────────────┘
```

---

## 📂 Project Structure

```text
Web Scraping Agent/
├── main.py                # FastAPI backend & LangGraph ReAct agent pipeline
├── mcp_tools.py           # Bright Data MCP stdio manager & LangChain tool converter
├── tool_retriever.py      # FAISS semantic vector index & top-k tool retriever
├── requirements.txt       # Python backend dependencies
├── .env                   # Environment variables (API tokens)
│
└── frontend/              # Next.js 16 + Tailwind CSS + shadcn (b0 preset)
    ├── src/
    │   ├── app/           # App Router (page.tsx, layout.tsx, globals.css)
    │   ├── components/    # UI components (ChatMessage, ChatInput, Sidebar, Header, EmptyState)
    │   ├── lib/           # SSE API stream consumer & LocalStorage persistence
    │   └── types/         # TypeScript definitions
    └── package.json
```

---

## 🚀 Getting Started

### 1. Prerequisites
- **Python**: 3.10+ (Python 3.12 recommended)
- **Node.js**: v18+ (Node 24 tested)
- **NPM** or **PNPM**
- **Bright Data Account**: API token with Web Unlocker / Scraping Browser zone.
- **LLM Keys**: Google Gemini API key and Groq API key.

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

2. **Install backend dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Configure Environment Variables (`.env`)**:
   Create a `.env` file in the root folder:
   ```ini
   # LLM API Keys
   GOOGLE_API_KEY=your_gemini_api_key_here
   GROQ_API_KEY=your_groq_api_key_here

   # Bright Data MCP Configuration
   BRIGHT_DATA_API_TOKEN=your_bright_data_api_token_here
   WEB_UNLOCKER_ZONE=mcp_unlocker
   BROWSER_ZONE=mcp_browser
   ```

4. **Start the FastAPI Backend**:
   ```bash
   python main.py
   ```
   *The server will boot the Bright Data MCP server, index tools into FAISS, and listen at `http://localhost:8000`.*

---

### 3. Frontend Setup

1. **Navigate to the frontend directory**:
   ```bash
   cd frontend
   ```

2. **Install frontend dependencies**:
   ```bash
   npm install
   ```

3. **Configure backend URL (Optional)**:
   The frontend defaults to `http://localhost:8000`. To override, create a `.env.local`:
   ```ini
   NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
   ```

4. **Start the Next.js development server**:
   ```bash
   npm run dev
   ```
   Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 💬 Example Queries to Try

- **E-Commerce Comparison**:
  > *"Find the top 5 noise cancelling headphones on Amazon and compare their prices, specs, and user sentiment."*
- **Community Forum Insights**:
  > *"What are developers currently discussing on Reddit about AI Coding Agents and LangGraph?"*
- **Live Tech News**:
  > *"Search for recent breakthroughs in open-source LLMs and humanoid robotics. Summarize with source URLs."*
- **Market Research**:
  > *"Search for the latest news and discussions regarding the Reliance Jio IPO timeline and valuation."*

---

## 🛡️ License

This project is licensed under the MIT License.
