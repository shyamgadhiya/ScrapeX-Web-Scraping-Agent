FROM python:3.12-slim

# Install Node.js 22 (required by @brightdata/mcp / pipenet >=22.0.0) and build tools
# Install Node.js 22 (required by @brightdata/mcp / pipenet >=22.0.0)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    gnupg \
    build-essential \
    && curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Pre-install CPU-only PyTorch (avoids 3GB+ CUDA wheels, cuts RAM by ~500MB)
RUN pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu

# Install remaining Python requirements
# Install Python requirements (Ultra-lightweight: No PyTorch, runs at < 150MB RAM)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Pre-cache Bright Data MCP package cleanly during build
RUN API_TOKEN=build_cache npx -y @brightdata/mcp --help > /dev/null 2>&1 || true

# Copy application source code
COPY . .

# Expose default port
EXPOSE 8000

# Start Uvicorn dynamically binding to Render's $PORT (defaults to 8000 locally)
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
