export interface ToolEvent {
  type: 'call' | 'result';
  tool: string;
  args?: Record<string, any>;
  preview?: string;
  length?: number;
  timestamp: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  status?: 'idle' | 'streaming' | 'completed' | 'error';
  selectedTools?: string[];
  toolEvents?: ToolEvent[];
  executionTime?: number;
  error?: string;
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: ChatMessage[];
  topK?: number;
  temperature?: number;
}

export interface ScrapeSettings {
  backendUrl: string;
  topK: number;
  temperature: number;
}

export interface BackendHealth {
  status: 'healthy' | 'offline' | 'checking';
  mcp_connected?: boolean;
  indexed_tools?: number;
  lastChecked?: number;
  error?: string;
}
