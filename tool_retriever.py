import numpy as np
import logging
from typing import List, Dict, Any
from langchain_core.tools import BaseTool
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

logger = logging.getLogger("tool-retriever")

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
    "search_engine": "search Google Bing web results find products find news prices lookup articles reddit forums query information",
    "scrape_as_markdown": "read webpage scrape URL clean text article content product details, social media, reddit comments forum threads text",
    "extract": "extract structured JSON data ecommerce products prices specs from page details schema",
    "search_scrapers": "find pre-built scraper for amazon linkedin instagram reviews datasets crawlers",
    "scraping_browser": "interact dynamic page javascript click scroll render single page app wait elements",
}

class SemanticToolRetriever:
    """
    Lightweight, high-speed semantic tool retriever.
    Uses TF-IDF vectorization with intent keyword boosting to select the top-k
    most relevant tools for any given query with sub-millisecond latency and
    negligible RAM footprint (< 15 MB), preventing OOM kills on cloud instances.
    """
    def __init__(self):
        self.tfidf = TfidfVectorizer(stop_words="english")
        self.corpus_vectors = None
        self.tools: List[BaseTool] = []

    def index_tools(self, tools: List[BaseTool]):
        self.tools = [t for t in tools if t.name not in EXCLUDED_TOOLS]
        corpus = []

        for tool in self.tools:
            boost = INTENT_BOOSTS.get(tool.name, "")
            text = f"Tool: {tool.name}. Keywords: {boost}. Description: {tool.description}"
            corpus.append(text)

        self.corpus_vectors = self.tfidf.fit_transform(corpus)
        logger.info(f"Successfully indexed {len(self.tools)} tools into semantic retriever (RAM: < 15MB).")

    def get_relevant_tools(self, query: str, top_k: int = 3) -> List[BaseTool]:
        if not self.tools or self.corpus_vectors is None:
            return []

        query_vec = self.tfidf.transform([query])
        sim_scores = cosine_similarity(query_vec, self.corpus_vectors)[0]
        top_indices = np.argsort(sim_scores)[::-1][:min(top_k, len(self.tools))]

        selected_tools = []
        logger.info(f"Semantic Tool Retrieval for query: '{query}'")
        for idx in top_indices:
            tool = self.tools[idx]
            selected_tools.append(tool)
            logger.info(f"   Selected: {tool.name} (Similarity: {sim_scores[idx]:.3f})")

        # Ensure search_engine is always present as an anchor tool if indexed
        tool_names = [t.name for t in selected_tools]
        if "search_engine" not in tool_names:
            search_tool = next((t for t in self.tools if t.name == "search_engine"), None)
            if search_tool:
                selected_tools[-1] = search_tool

        return selected_tools
