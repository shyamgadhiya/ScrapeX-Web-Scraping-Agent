import os
import sys

# Configure Windows SSL certificate verification using truststore and certifi
try:
    import certifi
    os.environ.setdefault("SSL_CERT_FILE", certifi.where())
    os.environ.setdefault("REQUESTS_CA_BUNDLE", certifi.where())
except ImportError:
    pass

try:
    import truststore
    truststore.inject_into_ssl()
except Exception:
    pass

import json
import asyncio
import logging
import datetime
from contextlib import asynccontextmanager
from typing import AsyncGenerator, Dict, Any, Optional

from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from dotenv import load_dotenv
load_dotenv()

from langchain_groq import ChatGroq
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.agents import create_agent
from langgraph.prebuilt import create_react_agent
from langchain_core.messages import AIMessage, ToolMessage, HumanMessage

# Import our modular components
from tool_retriever import SemanticToolRetriever
from mcp_tools import BrightDataMCPManager

# ---------------------------------------------------------------------------
# Logging Configuration
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger("web-scraper-api")

# Filter out non-fatal MCP notification validation warnings
class MCPNotificationFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        # Suppress the noisy progress notification validation warning
        if "Failed to validate notification" in record.getMessage():
            return False
        return True

# Apply the filter to the root and mcp loggers
logging.getLogger().addFilter(MCPNotificationFilter())
logging.getLogger("mcp").addFilter(MCPNotificationFilter())

# ---------------------------------------------------------------------------
# Global Application State Container
# ---------------------------------------------------------------------------
class AppState:
    mcp_manager: Optional[BrightDataMCPManager] = None
    retriever: Optional[SemanticToolRetriever] = None

state = AppState()

# ---------------------------------------------------------------------------
# Background Resource Initialization
# ---------------------------------------------------------------------------
async def init_background_resources():
    """
    Connects to Bright Data MCP and builds the semantic tool index.
    Runs asynchronously in the background so Uvicorn opens the listening
    port immediately (< 1s), preventing cloud port-detection timeouts.
    """
    logger.info("Initializing Bright Data MCP Manager in background...")
    state.mcp_manager = BrightDataMCPManager()
    
    try:
        all_tools = await state.mcp_manager.connect_and_get_all_tools()
        logger.info(f"Loaded {len(all_tools)} tools from MCP server.")

        logger.info("Building semantic index for tools...")
        state.retriever = SemanticToolRetriever()
        state.retriever.index_tools(all_tools)
        logger.info("Semantic tool index is ready and active.")
    except Exception as e:
        logger.critical(f"Failed to initialize MCP or Tool Index: {e}", exc_info=True)

# ---------------------------------------------------------------------------
# Lifespan: Server Startup & Shutdown
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Manages long-lived resources. Launches background initialization so
    HTTP port is bound and active immediately upon container launch.
    """
    init_task = asyncio.create_task(init_background_resources())

    yield  # Port is open immediately!

    logger.info("Shutting down Bright Data MCP connection...")
    if not init_task.done():
        init_task.cancel()
    if state.mcp_manager:
        await state.mcp_manager.close()
    logger.info("Shutdown complete.")


# ---------------------------------------------------------------------------
# FastAPI Application Declaration
# ---------------------------------------------------------------------------
app = FastAPI(
    title="Intelligent Web Scraper Agent API",
    description="Production-grade ReAct agent with dynamic semantic tool filtering via Bright Data MCP",
    version="1.0.0",
    lifespan=lifespan
)

# Production CORS Middleware (configure allowed origins for your frontend)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Replace with specific frontend URL in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Request & Response Schemas
# ---------------------------------------------------------------------------
class ScrapeRequest(BaseModel):
    query: str = Field(..., json_schema_extra={"example": "Find top rated noise cancelling headphones on Amazon and compare prices"})
    top_k_tools: int = Field(default=3, ge=1, le=6, description="Number of semantic tools to retrieve")
    temperature: float = Field(default=0.1, ge=0.0, le=1.0)

class ScrapeResponse(BaseModel):
    query: str
    selected_tools: list[str]
    result: str
    execution_time_seconds: float


# ---------------------------------------------------------------------------
# Agent Factory Helper
# ---------------------------------------------------------------------------
def build_request_agent(query: str, top_k: int, temperature: float):
    if not state.retriever or not state.retriever.tools:
        raise HTTPException(
            status_code=503, 
            detail="Tool retriever is still initializing MCP tools. Please retry in a few seconds."
        )

    selected_tools = state.retriever.get_relevant_tools(query, top_k=top_k)
    current_date = datetime.datetime.now().strftime("%B %d, %Y")

    # 1. Primary Model: Gemini 3.1 Flash Lite (Fast & cost-effective)
    primary_llm = ChatGoogleGenerativeAI(
        model="gemini-3.1-flash-lite",
        google_api_key=os.getenv("GOOGLE_API_KEY"),
        temperature=temperature,
        max_retries=1  # Fail fast to trigger fallback without long retry hangs
    )

    # 2. Fallback Model: Groq Qwen 2.5/3.8 (Takes over when Gemini hits limits/overload)
    fallback_llm = ChatGroq(
        groq_api_key=os.getenv("GROQ_API_KEY"),
        model_name="qwen/qwen3.8-27b",
        temperature=temperature,
        max_retries=1
    )

    llm_with_fallback = primary_llm.with_fallbacks([fallback_llm])

    system_prompt = f"""You are a high-speed web data extraction and web data analysis assistant. Today's date is {current_date}.
Execution Strategy:
- When asked what people are discussing on Reddit, forums, or social platforms:
   - First, run `search_engine` with engine='bing' and a query like: `site:reddit.com <topic>`
   - Pick the most relevant Reddit post URL from the search results.
   - Then, call `scrape_as_markdown` on that Reddit URL to read real user comments and sentiment.
- When users request web data or current information, you MUST use these tools - do not rely on your training data.
- For product discovery, news, prices, or comparisons, call `search_engine` (use engine='bing' or engine='google').
- Do NOT search for scrapers or dataset schemas unless explicitly asked to build a bulk crawler.
- Aim to fulfill the request within 1 or 2 tool calls maximum.
- Summarize cleanly with full source URLs."""

    agent = create_react_agent(
        model=llm_with_fallback,
        tools=selected_tools,
        prompt=system_prompt
    )
    return agent, [t.name for t in selected_tools]

def extract_text_content(content: Any) -> str:
    """Safely normalizes string or block-list content from LangChain/Gemini into a plain string."""
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        # Extract and join all text blocks
        parts = []
        for item in content:
            if isinstance(item, dict) and item.get("type") == "text":
                parts.append(item.get("text", ""))
            elif isinstance(item, str):
                parts.append(item)
            else:
                parts.append(str(item))
        return "\n".join(parts)
    return str(content)


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------
@app.get("/health", tags=["System"])
async def health_check():
    """Health probe for container orchestrators (Render, Docker, Kubernetes)."""
    is_ready = state.retriever is not None and len(state.retriever.tools) > 0
    return {
        "status": "healthy" if is_ready else "initializing",
        "mcp_connected": state.mcp_manager is not None and state.mcp_manager.session is not None,
        "indexed_tools": len(state.retriever.tools) if state.retriever else 0
    }


@app.post("/api/scrape", response_model=ScrapeResponse, tags=["Scraping"])
async def execute_scrape(request: ScrapeRequest):
    start_time = datetime.datetime.now()
    agent, selected_tools = build_request_agent(request.query, request.top_k_tools, request.temperature)

    try:
        response = await agent.ainvoke({"messages": [("human", request.query)]})
        raw_content = response["messages"][-1].content
        
        final_message = extract_text_content(raw_content)
        duration = (datetime.datetime.now() - start_time).total_seconds()

        return ScrapeResponse(
            query=request.query,
            selected_tools=selected_tools,
            result=final_message,
            execution_time_seconds=round(duration, 2)
        )
    except Exception as e:
        logger.error(f"Error during agent invocation: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Agent execution failed: {str(e)}"
        )

@app.post("/api/scrape/stream", tags=["Scraping"])
async def stream_scrape(request: ScrapeRequest):
    """
    Server-Sent Events (SSE) streaming endpoint.
    Emits real-time progress events: tool calls, tool returns, and final chunks.
    """
    agent, selected_tools = build_request_agent(request.query, request.top_k_tools, request.temperature)

    async def event_generator() -> AsyncGenerator[str, None]:
        # Emit initial metadata
        yield f"event: metadata\ndata: {json.dumps({'selected_tools': selected_tools})}\n\n"

        seen_messages = 0
        try:
            async for event in agent.astream({"messages": [("human", request.query)]}, stream_mode="values"):
                messages = event.get("messages", [])
                for msg in messages[seen_messages:]:
                    # 1. LLM decided to invoke a tool
                    if isinstance(msg, AIMessage) and msg.tool_calls:
                        for tc in msg.tool_calls:
                            payload = {"tool": tc.get("name"), "args": tc.get("args")}
                            yield f"event: tool_call\ndata: {json.dumps(payload)}\n\n"

                    # 2. Tool returned output
                    elif isinstance(msg, ToolMessage):
                        preview = (msg.content[:200] + "...") if len(msg.content) > 200 else msg.content
                        payload = {"tool": msg.name, "preview": preview, "length": len(msg.content)}
                        yield f"event: tool_result\ndata: {json.dumps(payload)}\n\n"

                    # 3. Final synthesized answer
                    elif isinstance(msg, AIMessage) and not msg.tool_calls:
                        text_content = extract_text_content(msg.content)
                        payload = {"text": text_content}
                        yield f"event: final_result\ndata: {json.dumps(payload)}\n\n"

                seen_messages = len(messages)

            yield "event: complete\ndata: {}\n\n"

        except Exception as err:
            logger.error(f"Stream error: {err}", exc_info=True)
            yield f"event: error\ndata: {json.dumps({'error': str(err)})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # Disables proxy buffering (e.g. Nginx)
        }
    )


# ---------------------------------------------------------------------------
# CLI Direct Execution
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)
