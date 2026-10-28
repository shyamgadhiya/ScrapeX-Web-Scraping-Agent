import { BackendHealth } from '@/types';

export async function checkBackendHealth(backendUrl: string): Promise<BackendHealth> {
  const url = `${backendUrl.replace(/\/+$/, '')}/health`;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) {
      return {
        status: 'offline',
        lastChecked: Date.now(),
        error: `HTTP ${res.status}: ${res.statusText}`,
      };
    }

    const data = await res.json();
    return {
      status: 'healthy',
      mcp_connected: Boolean(data.mcp_connected),
      indexed_tools: data.indexed_tools ?? 0,
      lastChecked: Date.now(),
    };
  } catch (err: any) {
    return {
      status: 'offline',
      lastChecked: Date.now(),
      error: err.name === 'AbortError' ? 'Connection timed out' : (err.message || 'Server unreachable'),
    };
  }
}

export interface StreamScrapeParams {
  backendUrl: string;
  query: string;
  topK: number;
  temperature: number;
  signal?: AbortSignal;
  onMetadata?: (data: { selected_tools: string[] }) => void;
  onToolCall?: (data: { tool: string; args?: Record<string, any> }) => void;
  onToolResult?: (data: { tool: string; preview: string; length: number }) => void;
  onFinalResult?: (data: { text: string }) => void;
  onComplete?: () => void;
  onError?: (error: string) => void;
}

export async function streamScrape({
  backendUrl,
  query,
  topK,
  temperature,
  signal,
  onMetadata,
  onToolCall,
  onToolResult,
  onFinalResult,
  onComplete,
  onError,
}: StreamScrapeParams): Promise<void> {
  const endpoint = `${backendUrl.replace(/\/+$/, '')}/api/scrape/stream`;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        top_k_tools: topK,
        temperature,
      }),
      signal,
    });

    if (!response.ok) {
      let errorMsg = `Server error ${response.status}: ${response.statusText}`;
      try {
        const errJson = await response.json();
        if (errJson?.detail) errorMsg = errJson.detail;
      } catch {
        // use default error message
      }
      onError?.(errorMsg);
      return;
    }

    if (!response.body) {
      onError?.('No response stream received from server');
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // SSE packets are separated by double newlines (\n\n or \r\n\r\n)
      const parts = buffer.split(/\r?\n\r?\n/);
      // The last element is the remaining incomplete buffer
      buffer = parts.pop() || '';

      for (const part of parts) {
        if (!part.trim()) continue;

        let eventType = 'message';
        let dataStr = '';

        const lines = part.split(/\r?\n/);
        for (const line of lines) {
          if (line.startsWith('event:')) {
            eventType = line.slice(6).trim();
          } else if (line.startsWith('data:')) {
            dataStr = line.slice(5).trim();
          }
        }

        try {
          const parsedData = dataStr ? JSON.parse(dataStr) : {};

          switch (eventType) {
            case 'metadata':
              onMetadata?.(parsedData);
              break;
            case 'tool_call':
              onToolCall?.(parsedData);
              break;
            case 'tool_result':
              onToolResult?.(parsedData);
              break;
            case 'final_result':
              onFinalResult?.(parsedData);
              break;
            case 'complete':
              onComplete?.();
              break;
            case 'error':
              onError?.(parsedData.error || 'Unknown error occurred in agent stream');
              break;
          }
        } catch (parseErr) {
          console.warn('Failed to parse SSE payload:', dataStr, parseErr);
        }
      }
    }

    // Flush any remaining complete blocks
    if (buffer.trim()) {
      const lines = buffer.split(/\r?\n/);
      let eventType = 'message';
      let dataStr = '';
      for (const line of lines) {
        if (line.startsWith('event:')) eventType = line.slice(6).trim();
        else if (line.startsWith('data:')) dataStr = line.slice(5).trim();
      }
      if (dataStr) {
        try {
          const parsedData = JSON.parse(dataStr);
          if (eventType === 'final_result') onFinalResult?.(parsedData);
          else if (eventType === 'complete') onComplete?.();
        } catch {
          // ignore trailing invalid chunk
        }
      }
    }
  } catch (err: any) {
    if (err.name === 'AbortError') {
      onError?.('Scraping stream was cancelled.');
    } else {
      onError?.(err.message || 'Failed to connect to backend server');
    }
  }
}
