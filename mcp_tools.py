import os
import sys
import logging
from typing import Any, Dict, List, Type
from dotenv import load_dotenv
from pydantic import BaseModel, Field, create_model

from langchain_core.tools import BaseTool
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

# Load variables from .env
load_dotenv()

logger = logging.getLogger("mcp-tools")
MAX_TOOL_OUTPUT_CHARS = 4000  # Token safety limit

def build_pydantic_schema(tool_name: str, input_schema: dict) -> Type[BaseModel]:
    properties = input_schema.get("properties", {}) if isinstance(input_schema, dict) else {}
    required_fields = input_schema.get("required", []) if isinstance(input_schema, dict) else []

    field_definitions = {}
    type_map = {
        "string": str,
        "integer": int,
        "number": float,
        "boolean": bool,
        "array": list,
        "object": dict,
    }

    for prop_name, prop_attrs in properties.items():
        prop_type = type_map.get(prop_attrs.get("type", "string"), Any)
        prop_desc = (prop_attrs.get("description", "") or "")[:150]
        default_val = prop_attrs.get("default", ... if prop_name in required_fields else None)

        field_definitions[prop_name] = (
            prop_type,
            Field(default=default_val, description=prop_desc)
        )

    if not field_definitions:
        field_definitions["query"] = (str, Field(default="", description="Input argument"))

    model_name = "".join(part.capitalize() for part in tool_name.replace("-", "_").split("_")) + "Input"
    return create_model(model_name, **field_definitions)


class MCPToolWrapper(BaseTool):
    name: str
    description: str
    session: Any
    args_schema: Type[BaseModel]
    raw_schema: dict

    def _run(self, *args, **kwargs):
        raise NotImplementedError("Use async execution for MCP tools.")

    async def _arun(self, **kwargs) -> Any:
        clean_args = {k: v for k, v in kwargs.items() if v is not None}
        required_props = self.raw_schema.get("required", [])

        # Auto-map query/url
        if "query" in required_props and "query" not in clean_args:
            for alt in ["input", "search", "q", "url"]:
                if alt in clean_args:
                    clean_args["query"] = clean_args.pop(alt)
                    break

        if "url" in required_props and "url" not in clean_args:
            for alt in ["input", "query", "link"]:
                if alt in clean_args and str(clean_args[alt]).startswith("http"):
                    clean_args["url"] = clean_args.pop(alt)
                    break

        # Proactively use Bing for site: queries to avoid Bright Data Google SERP non-JSON failures
        if self.name == "search_engine" and "query" in clean_args:
            q_str = str(clean_args["query"]).lower()
            if "site:" in q_str and "engine" not in clean_args:
                clean_args["engine"] = "bing"

        try:
            result = await self.session.call_tool(self.name, arguments=clean_args)
            texts = [c.text for c in result.content if getattr(c, "type", "") == "text"]
            full_output = "\n".join(texts) if texts else str(result.content)

            # Fallback for search_engine: Google often fails with non-JSON on complex/site: queries.
            # Seamlessly fallback to Bing SERP which returns Markdown reliably.
            if self.name == "search_engine" and ("non-JSON response" in full_output or "execution failed" in full_output):
                current_engine = clean_args.get("engine", "google")
                fallback_engine = "bing" if current_engine != "bing" else "yandex"
                logger.info(f"search_engine failed with '{current_engine}'. Retrying with '{fallback_engine}'...")
                
                fallback_args = dict(clean_args)
                fallback_args["engine"] = fallback_engine
                fb_result = await self.session.call_tool(self.name, arguments=fallback_args)
                fb_texts = [c.text for c in fb_result.content if getattr(c, "type", "") == "text"]
                fb_output = "\n".join(fb_texts) if fb_texts else str(fb_result.content)

                if "non-JSON response" not in fb_output and "execution failed" not in fb_output:
                    full_output = fb_output

            if len(full_output) > MAX_TOOL_OUTPUT_CHARS:
                return full_output[:MAX_TOOL_OUTPUT_CHARS] + f"\n\n... [TRUNCATED to {MAX_TOOL_OUTPUT_CHARS} chars] ..."

            return full_output
        except Exception as e:
            return f"Tool Execution Error on '{self.name}': {str(e)}"


class BrightDataMCPManager:
    def __init__(self):
        self.session = None
        self.stdio_ctx = None
        self.session_ctx = None
        self._err_file = None

    async def connect_and_get_all_tools(self) -> List[BaseTool]:
        token = os.getenv("BRIGHT_DATA_API_TOKEN", "")
        if not token:
            raise ValueError(
                "BRIGHT_DATA_API_TOKEN is missing or empty! "
                "Ensure it is set in your .env file or system environment."
            )

        # Clone current environment to ensure PATH, SYSTEMROOT, and Node locations are preserved
        env = dict(os.environ)
        env["API_TOKEN"] = token
        if os.getenv("WEB_UNLOCKER_ZONE"):
            env["WEB_UNLOCKER_ZONE"] = os.getenv("WEB_UNLOCKER_ZONE")
        if os.getenv("BROWSER_ZONE"):
            env["BROWSER_ZONE"] = os.getenv("BROWSER_ZONE")

        command = "npx.cmd" if os.name == "nt" else "npx"
        server_params = StdioServerParameters(
            command=command,
            args=["-y", "@brightdata/mcp"],
            env=env
        )

        # Write stderr to a persistent log file so errors are never lost
        self._err_file = open("mcp_stderr.log", "a", encoding="utf-8")
        
        self.stdio_ctx = stdio_client(server_params, errlog=self._err_file)
        read_stream, write_stream = await self.stdio_ctx.__aenter__()

        self.session_ctx = ClientSession(read_stream, write_stream)
        self.session = await self.session_ctx.__aenter__()
        await self.session.initialize()

        tools_resp = await self.session.list_tools()
        raw_tools = tools_resp.tools

        lc_tools = []
        for tool in raw_tools:
            safe_name = tool.name.replace("-", "_")
            input_schema = getattr(tool, "inputSchema", {}) or {}
            schema_model = build_pydantic_schema(safe_name, input_schema)
            clean_desc = (tool.description or f"Tool: {tool.name}").split(".")[0] + "."

            lc_tools.append(
                MCPToolWrapper(
                    name=safe_name,
                    description=clean_desc,
                    args_schema=schema_model,
                    raw_schema=input_schema,
                    session=self.session
                )
            )

        logger.info(f"Successfully converted {len(lc_tools)} MCP tools.")
        return lc_tools

    async def close(self):
        try:
            if self.session_ctx:
                await self.session_ctx.__aexit__(None, None, None)
        except Exception:
            pass
        try:
            if self.stdio_ctx:
                await self.stdio_ctx.__aexit__(None, None, None)
        except Exception:
            pass
        if self._err_file and not self._err_file.closed:
            self._err_file.close()