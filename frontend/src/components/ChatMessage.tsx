'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  User,
  Bot,
  Wrench,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Sparkles,
  Globe2,
} from 'lucide-react';
import { ChatMessage as ChatMessageType } from '@/types';

interface ChatMessageProps {
  message: ChatMessageType;
  isStreaming?: boolean;
}

export default function ChatMessage({ message, isStreaming = false }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const [copied, setCopied] = React.useState(false);
  const [toolsOpen, setToolsOpen] = React.useState(false);

  const copyToClipboard = () => {
    if (!message.content) return;
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isUser) {
    return (
      <div className="flex justify-end mb-6">
        <div className="max-w-[85%] md:max-w-[75%] rounded-3xl bg-zinc-900 text-white px-6 py-4 text-sm sm:text-base font-medium shadow-sm">
          <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
        </div>
      </div>
    );
  }

  const hasTools =
    (message.selectedTools && message.selectedTools.length > 0) ||
    (message.toolEvents && message.toolEvents.length > 0);

  return (
    <div className="mb-8">
      {/* Crisp White Card Container */}
      <div className="bg-white rounded-3xl border border-zinc-200/90 p-6 sm:p-7 shadow-xs">
        
        {/* Header Metadata */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-4 border-b border-zinc-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-zinc-950 text-white flex items-center justify-center text-sm font-semibold shadow-inner">
              <Globe2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-sm font-bold text-zinc-950 block leading-tight">
                ScrapeX Agent
              </span>
              <span className="text-xs text-zinc-500 font-mono">Gemini 3.1 Flash • Bright Data MCP</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {message.status === 'streaming' && (
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-mono bg-zinc-100 text-zinc-800 border border-zinc-200 font-medium">
                <span className="w-2 h-2 rounded-full bg-zinc-900 animate-ping" />
                Scraping live...
              </span>
            )}

            {message.status === 'completed' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono bg-zinc-50 text-zinc-800 border border-zinc-200/80 font-medium">
                <CheckCircle2 className="w-4 h-4 text-zinc-950" />
                Complete
              </span>
            )}

            {message.status === 'error' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono bg-rose-50 text-rose-700 border border-rose-200 font-medium">
                <AlertCircle className="w-4 h-4 text-rose-600" />
                Failed
              </span>
            )}

            {message.executionTime && (
              <span className="text-xs font-mono text-zinc-500 flex items-center gap-1.5 bg-zinc-50 px-2.5 py-1 rounded-xl border border-zinc-200/80">
                <Clock className="w-3.5 h-3.5 text-zinc-400" />
                {message.executionTime.toFixed(2)}s
              </span>
            )}
          </div>
        </div>

        {/* Selected Semantic Tools Badges */}
        {message.selectedTools && message.selectedTools.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="text-xs text-zinc-500 flex items-center gap-1.5 mr-1 font-medium">
              <Sparkles className="w-3.5 h-3.5 text-zinc-700" />
              Retrieved Tools:
            </span>
            {message.selectedTools.map((toolName) => (
              <span
                key={toolName}
                className="px-2.5 py-1 rounded-lg text-xs font-mono font-medium bg-zinc-100 text-zinc-800 border border-zinc-200"
              >
                {toolName}
              </span>
            ))}
          </div>
        )}

        {/* Collapsible Tool Invocation Log */}
        {hasTools && (
          <div className="mb-5 rounded-2xl border border-zinc-200/90 bg-zinc-50/70 overflow-hidden">
            <button
              onClick={() => setToolsOpen(!toolsOpen)}
              className="w-full flex items-center justify-between px-4 py-2.5 text-xs sm:text-sm font-medium text-zinc-700 hover:bg-zinc-100/70 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Wrench className="w-4 h-4 text-zinc-600" />
                <span>
                  Tool Execution Trace ({message.toolEvents?.length || 0} events)
                </span>
              </div>
              {toolsOpen ? <ChevronUp className="w-4 h-4 text-zinc-400" /> : <ChevronDown className="w-4 h-4 text-zinc-400" />}
            </button>

            {toolsOpen && (
              <div className="p-4 border-t border-zinc-200/90 space-y-2.5 max-h-80 overflow-y-auto font-mono text-xs">
                {message.toolEvents && message.toolEvents.length > 0 ? (
                  message.toolEvents.map((evt, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-xl border ${
                        evt.type === 'call'
                          ? 'bg-white border-zinc-200 text-zinc-800'
                          : 'bg-zinc-100/80 border-zinc-200 text-zinc-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-semibold text-xs uppercase tracking-wider text-zinc-500">
                          {evt.type === 'call' ? '⚡ Calling Tool' : '📦 Tool Returned'}
                        </span>
                        <span className="text-xs font-mono text-zinc-950 font-bold">{evt.tool}</span>
                      </div>

                      {evt.args && (
                        <div className="text-xs text-zinc-800 bg-zinc-50 p-2.5 rounded-lg border border-zinc-200 overflow-x-auto mt-1">
                          <code>{JSON.stringify(evt.args, null, 2)}</code>
                        </div>
                      )}

                      {evt.preview && (
                        <div className="text-xs text-zinc-700 mt-1.5">
                          <span className="text-zinc-500 font-medium">Output Preview ({evt.length} chars): </span>
                          <span className="italic">{evt.preview}</span>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-zinc-400 italic">No tool calls recorded.</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Message Content */}
        {message.error ? (
          <div className="flex items-start gap-3 text-rose-800 bg-rose-50 p-4 rounded-2xl border border-rose-200 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-600" />
            <p className="leading-relaxed">{message.error}</p>
          </div>
        ) : message.content ? (
          <div className="markdown-body">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {message.content}
            </ReactMarkdown>
          </div>
        ) : message.status === 'streaming' ? (
          <div className="flex items-center gap-2.5 text-sm text-zinc-600 py-3">
            <span className="w-2.5 h-2.5 rounded-full bg-zinc-900 animate-ping" />
            <span>Retrieving web data and synthesizing results...</span>
          </div>
        ) : null}

        {/* Bottom Copy Action */}
        {message.content && (
          <div className="flex items-center justify-end gap-2 pt-4 mt-4 border-t border-zinc-100">
            <button
              onClick={copyToClipboard}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100 border border-zinc-200 transition-colors cursor-pointer shadow-2xs"
              title="Copy markdown"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-zinc-950" />
                  <span className="text-zinc-950 font-semibold">Copied to Clipboard</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-zinc-500" />
                  <span>Copy Markdown</span>
                </>
              )}
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
