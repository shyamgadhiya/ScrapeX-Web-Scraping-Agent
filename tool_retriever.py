import numpy as np
import faiss
from typing import List, Dict, Any
from sentence_transformers import SentenceTransformer
from langchain_core.tools import BaseTool

# Tools that trigger schema/enum traps on general web tasks
EXCLUDED_TOOLS = {
    "list_dataset_fields",
    "search_dataset",
    "ask_brightdata_assistant",
    "get_scraper_progress",
    "refresh_scrapers",
    "scraping_browser_go_back"
}

# Synthetic intent keywords to boost cosine similarity
INTENT_BOOSTS = {
    "search_engine": "search Google Bing web results find products find news prices lookup articles",
    "scrape_as_markdown": "read webpage scrape URL clean text article content product details, social media, reddit comments forum threads",
    "extract": "extract structured JSON data ecommerce products prices specs from page",
    "search_scrapers": "find pre-built scraper for amazon linkedin instagram reviews datasets",
    "scraping_browser": "interact dynamic page javascript click scroll render single page app",
}

class SemanticToolRetriever:
    def __init__(self, model_name: str = "all-MiniLM-L6-v2"):
        self.encoder = SentenceTransformer(model_name)
        # Replaced deprecated method with get_embedding_dimension()
        self.dimension = self.encoder.get_embedding_dimension()
        self.index = faiss.IndexFlatIP(self.dimension)
        self.tools: List[BaseTool] = []

    def index_tools(self, tools: List[BaseTool]):
        # Filter out fragile/restricted tools
        self.tools = [t for t in tools if t.name not in EXCLUDED_TOOLS]
        corpus = []

        for tool in self.tools:
            boost = INTENT_BOOSTS.get(tool.name, "")
            text = f"Tool: {tool.name}. Keywords: {boost}. Description: {tool.description}"
            corpus.append(text)

        embeddings = self.encoder.encode(corpus, convert_to_numpy=True, show_progress_bar=False)
        faiss.normalize_L2(embeddings)

        self.index.reset()
        self.index.add(embeddings)
        print(f"✅ Successfully indexed {len(self.tools)} tools into FAISS (Excluded: {len(tools) - len(self.tools)} restricted tools).")

    def get_relevant_tools(self, query: str, top_k: int = 3) -> List[BaseTool]:
        if not self.tools:
            return []

        query_vec = self.encoder.encode([query], convert_to_numpy=True)
        faiss.normalize_L2(query_vec)

        scores, indices = self.index.search(query_vec, min(top_k, len(self.tools)))

        selected_tools = []
        print(f"\n🔍 [SEMANTIC TOOL RETRIEVER] Query: '{query}'")
        for score, idx in zip(scores[0], indices[0]):
            if idx != -1:
                tool = self.tools[idx]
                selected_tools.append(tool)
                print(f"   ⭐ Selected: {tool.name} (Similarity: {score:.3f})")

        # Ensure search_engine is always present as an anchor tool if indexed
        tool_names = [t.name for t in selected_tools]
        if "search_engine" not in tool_names:
            search_tool = next((t for t in self.tools if t.name == "search_engine"), None)
            if search_tool:
                selected_tools[-1] = search_tool  # Replace lowest ranked tool

        return selected_tools