'use client';

import React from 'react';
import { ArrowUp, Square, SlidersHorizontal, Sparkles } from 'lucide-react';
import { ScrapeSettings } from '@/types';

interface ChatInputProps {
  input: string;
  setInput: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onStop: () => void;
  isStreaming: boolean;
  settings: ScrapeSettings;
  onOpenSettings: () => void;
  disabled?: boolean;
}

export default function ChatInput({
  input,
  setInput,
  onSubmit,
  onStop,
  isStreaming,
  settings,
  onOpenSettings,
  disabled = false,
}: ChatInputProps) {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isStreaming && input.trim() && !disabled) {
        onSubmit(e);
      }
    }
  };

  return (
    /* 3/4 of screen container matching user request */
    <div className="w-full max-w-[90%] md:max-w-[75%] mx-auto px-2 pb-6">
      <div className="rounded-3xl border border-zinc-300 bg-white shadow-lg focus-within:border-zinc-950 focus-within:ring-2 focus-within:ring-zinc-950/10 focus-within:shadow-xl transition-all p-3">
        <form onSubmit={onSubmit} className="flex flex-col">
          {/* Main Input Textarea */}
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isStreaming
                ? 'ScrapeX is searching and streaming... (Click stop to cancel)'
                : 'Search, scrape, extract, or compare any web data...'
            }
            disabled={disabled}
            className="w-full resize-none bg-transparent px-3 py-2.5 text-sm sm:text-base text-zinc-950 placeholder-zinc-400 focus:outline-none max-h-48 min-h-[52px] leading-relaxed"
          />

          {/* Bottom Bar inside Input Box */}
          <div className="flex items-center justify-between px-2 pt-2 border-t border-zinc-100">
            {/* Tuning pills */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onOpenSettings}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-50 border border-zinc-200 text-xs font-mono text-zinc-700 hover:text-zinc-950 hover:border-zinc-400 transition-colors cursor-pointer"
                title="Configure Agent parameters"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-zinc-500" />
                <span>k = {settings.topK}</span>
                <span className="text-zinc-300">|</span>
                <span>temp = {settings.temperature}</span>
              </button>

              <span className="hidden sm:inline-block text-xs text-zinc-400">
                Shift + Enter for new line
              </span>
            </div>

            {/* Submit / Stop Button */}
            <div className="flex items-center gap-2">
              {isStreaming ? (
                <button
                  type="button"
                  onClick={onStop}
                  className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-zinc-950 hover:bg-zinc-800 text-white text-xs sm:text-sm font-semibold shadow-xs transition-all cursor-pointer"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                  <span>Stop</span>
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!input.trim() || disabled}
                  className="flex items-center justify-center w-10 h-10 rounded-2xl bg-zinc-950 hover:bg-zinc-800 disabled:opacity-30 disabled:hover:bg-zinc-950 text-white shadow-xs transition-all cursor-pointer"
                  title="Run Scraping Query"
                >
                  <ArrowUp className="w-5 h-5 stroke-[2.5]" />
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
