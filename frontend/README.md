# Web Scraper AI Agent - Next.js Frontend

A modern, responsive conversational dashboard and live scraping workbench built with Next.js (React 19 + Tailwind CSS) designed specifically for your FastAPI + Bright Data MCP web scraping agent.

## Features

- **Live Server-Sent Events (SSE) Streaming**: Connects directly to `POST /api/scrape/stream` for real-time tool execution updates, tool previews, and incremental answer synthesis.
- **Dynamic Semantic Tool Visualization**: Displays badges for FAISS-indexed semantic tools chosen for each query.
- **Interactive Tool Execution Trace**: Expandable trace viewer showing tool arguments, return data size, and output previews.
- **Session & Conversation History**: Sessions persist directly in browser `localStorage`. Switch between previous chats, search sessions, rename, or delete anytime.
- **Export & Markdown Formatter**: Format answers with GitHub-style tables, links, code blocks, and 1-click Markdown export.
- **Live Backend Health Monitor**: Displays real-time server connectivity and indexed tool count.
- **Agent Tuner**: Adjust `top_k_tools` (1–6) and `temperature` (0.0–1.0) on the fly.

## Quick Start

### 1. Start the FastAPI Backend
In the project root folder:
```bash
python main.py
```
*(Runs FastAPI at `http://localhost:8000`)*

### 2. Start the Next.js Frontend
In the `frontend` folder:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.
