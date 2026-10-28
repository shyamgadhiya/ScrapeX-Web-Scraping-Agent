'use client';

import React from 'react';
import {
  Menu,
  RotateCcw,
  Download,
  SlidersHorizontal,
  Edit2,
  Check,
  Activity,
  Layers,
} from 'lucide-react';
import { ChatSession, BackendHealth } from '@/types';

interface HeaderProps {
  activeSession: ChatSession | null;
  onRenameSession: (title: string) => void;
  onClearSession: () => void;
  onOpenSettings: () => void;
  onToggleMobileMenu: () => void;
  health: BackendHealth;
}

export default function Header({
  activeSession,
  onRenameSession,
  onClearSession,
  onOpenSettings,
  onToggleMobileMenu,
  health,
}: HeaderProps) {
  const [isEditingTitle, setIsEditingTitle] = React.useState(false);
  const [titleInput, setTitleInput] = React.useState(activeSession?.title || '');

  React.useEffect(() => {
    setTitleInput(activeSession?.title || 'ScrapeX Session');
    setIsEditingTitle(false);
  }, [activeSession?.id, activeSession?.title]);

  const handleTitleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (titleInput.trim()) {
      onRenameSession(titleInput.trim());
      setIsEditingTitle(false);
    }
  };

  const exportAsMarkdown = () => {
    if (!activeSession) return;
    let md = `# ${activeSession.title}\n\n*Created on ${new Date(activeSession.createdAt).toLocaleString()}*\n\n---\n\n`;
    for (const msg of activeSession.messages) {
      if (msg.role === 'user') {
        md += `### 🧑 User Query\n\n${msg.content}\n\n`;
      } else {
        md += `### 🤖 Scraper Agent Answer\n\n`;
        if (msg.selectedTools?.length) {
          md += `*Selected Tools: ${msg.selectedTools.join(', ')}*\n\n`;
        }
        md += `${msg.content}\n\n---\n\n`;
      }
    }
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeSession.title.toLowerCase().replace(/[^a-z0-9]/g, '_')}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <header className="h-16 px-4 lg:px-6 flex items-center justify-between z-20 shrink-0">
      <div className="flex items-center gap-3 min-w-0">
        {/* Mobile menu button */}
        <button
          onClick={onToggleMobileMenu}
          className="p-2 rounded-xl text-zinc-600 hover:text-zinc-900 bg-white border border-zinc-200/80 shadow-xs lg:hidden cursor-pointer"
        >
          <Menu className="w-4 h-4" />
        </button>

        {/* Editable Title */}
        {isEditingTitle ? (
          <form onSubmit={handleTitleSubmit} className="flex items-center gap-2">
            <input
              type="text"
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
              className="px-2.5 py-1 rounded-xl bg-white text-xs font-semibold text-zinc-900 border border-zinc-900 focus:outline-none shadow-xs"
              autoFocus
              onBlur={handleTitleSubmit}
            />
            <button type="submit" className="text-zinc-900 p-1 hover:text-zinc-700">
              <Check className="w-3.5 h-3.5" />
            </button>
          </form>
        ) : (
          <div className="flex items-center gap-2 truncate">
            <h2
              onDoubleClick={() => setIsEditingTitle(true)}
              className="text-sm font-semibold text-zinc-900 tracking-tight truncate cursor-pointer hover:text-zinc-600 transition-colors"
              title="Double click to rename"
            >
              {activeSession?.title || 'ScrapeX Session'}
            </h2>
            <button
              onClick={() => setIsEditingTitle(true)}
              className="text-zinc-400 hover:text-zinc-700 p-0.5 rounded transition-colors"
              title="Rename session"
            >
              <Edit2 className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>

      {/* Header Actions matching b0 style */}
      <div className="flex items-center gap-2">
        {/* Live Status Pill */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-xl bg-white border border-zinc-200/80 shadow-xs text-xs font-medium text-zinc-700">
          <span
            className={`w-2 h-2 rounded-full ${
              health.status === 'healthy' ? 'bg-emerald-500' : 'bg-rose-500'
            }`}
          />
          <span className="text-[11px] font-mono text-zinc-600">
            {health.status === 'healthy' ? 'MCP Connected' : 'Offline'}
          </span>
        </div>

        {/* Export Markdown */}
        {activeSession && activeSession.messages.length > 0 && (
          <button
            onClick={exportAsMarkdown}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-zinc-50 border border-zinc-200/80 text-xs font-medium text-zinc-700 shadow-xs transition-colors cursor-pointer"
            title="Export as Markdown"
          >
            <Download className="w-3.5 h-3.5 text-zinc-500" />
            <span className="hidden sm:inline">Export</span>
          </button>
        )}

        {/* Clear Messages */}
        {activeSession && activeSession.messages.length > 0 && (
          <button
            onClick={() => {
              if (confirm('Clear messages in this conversation?')) {
                onClearSession();
              }
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-zinc-50 border border-zinc-200/80 text-xs font-medium text-zinc-500 hover:text-rose-600 shadow-xs transition-colors cursor-pointer"
            title="Clear chat"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Clear</span>
          </button>
        )}

        {/* Settings button */}
        <button
          onClick={onOpenSettings}
          className="p-2 rounded-xl bg-white hover:bg-zinc-50 border border-zinc-200/80 text-zinc-600 hover:text-zinc-900 shadow-xs transition-colors cursor-pointer"
          title="Tuning & Parameters"
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
}
