import numpy as np
import logging
from typing import List, Dict, Any
from langchain_core.tools import BaseTool

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
    "search_engine": "search Google Bing web results find products find news prices lookup articles",
    "scrape_as_markdown": "read webpage scrape URL clean text article content product details, social media, reddit comments forum threads",
    "extract": "extract structured JSON data ecommerce products prices specs from page",
    "search_scrapers": "find pre-built scraper for amazon linkedin instagram reviews datasets",
    "scraping_browser": "interact dynamic page javascript click scroll render single page app",
}

class SemanticToolRetriever:
    def __init__(self, model_name: str = "all-MiniLM-L6-v2"):
        self.mode = "faiss"
        self.tools: List[BaseTool] = []
        try:
            import faiss
            from sentence_transformers import SentenceTransformer
            self.encoder = SentenceTransformer(model_name)
            self.dimension = self.encoder.get_embedding_dimension()
            self.index = faiss.IndexFlatIP(self.dimension)
        except Exception as e:
            logger.warning(f"SentenceTransformer/FAISS unavailable or memory constrained: {e}. Using TF-IDF.")
            from sklearn.feature_extraction.text import TfidfVectorizer
            self.mode = "tfidf"
            self.tfidf = TfidfVectorizer(stop_words="english")
            self.corpus_vectors = None

    def index_tools(self, tools: List[BaseTool]):
        self.tools = [t for t in tools if t.name not in EXCLUDED_TOOLS]
        corpus = []

        for tool in self.tools:
            boost = INTENT_BOOSTS.get(tool.name, "")
            text = f"Tool: {tool.name}. Keywords: {boost}. Description: {tool.description}"
            corpus.append(text)

        if self.mode == "faiss":
            try:
                import faiss
                embeddings = self.encoder.encode(corpus, convert_to_numpy=True, show_progress_bar=False)
                faiss.normalize_L2(embeddings)
                self.index.reset()
                self.index.add(embeddings)
                logger.info(f"Successfully indexed {len(self.tools)} tools into FAISS.")
                return
            except Exception as e:
                logger.warning(f"FAISS encoding failed ({e}). Switching to lightweight TF-IDF mode.")
                from sklearn.feature_extraction.text import TfidfVectorizer
                self.mode = "tfidf"
                self.tfidf = TfidfVectorizer(stop_words="english")

        # TF-IDF fallback mode (under 15MB RAM)
        from sklearn.feature_extraction.text import TfidfVectorizer
        self.tfidf = TfidfVectorizer(stop_words="english")
        self.corpus_vectors = self.tfidf.fit_transform(corpus)
        logger.info(f"Successfully indexed {len(self.tools)} tools using lightweight vectorizer.")

    def get_relevant_tools(self, query: str, top_k: int = 3) -> List[BaseTool]:
        if not self.tools:
            return []

        selected_tools = []
        if self.mode == "faiss":
            try:
                import faiss
                query_vec = self.encoder.encode([query], convert_to_numpy=True)
                faiss.normalize_L2(query_vec)
                scores, indices = self.index.search(query_vec, min(top_k, len(self.tools)))
                for score, idx in zip(scores[0], indices[0]):
                    if idx != -1:
                        selected_tools.append(self.tools[idx])
            except Exception as e:
                logger.warning(f"FAISS search failed: {e}. Falling back to TF-IDF.")
                self.mode = "tfidf"

        if self.mode == "tfidf":
            from sklearn.metrics.pairwise import cosine_similarity
            query_vec = self.tfidf.transform([query])
            sim_scores = cosine_similarity(query_vec, self.corpus_vectors)[0]
            top_indices = np.argsort(sim_scores)[::-1][:min(top_k, len(self.tools))]
            for idx in top_indices:
                selected_tools.append(self.tools[idx])

        # Ensure search_engine is always present as an anchor tool if indexed
        tool_names = [t.name for t in selected_tools]
        if "search_engine" not in tool_names:
            search_tool = next((t for t in self.tools if t.name == "search_engine"), None)
            if search_tool:
                selected_tools[-1] = search_tool

        return selected_tools
