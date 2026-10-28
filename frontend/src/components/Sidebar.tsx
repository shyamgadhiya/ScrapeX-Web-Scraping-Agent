'use client';

import React from 'react';
import {
  Plus,
  MessageSquare,
  Trash2,
  Settings2,
  Search,
  Bot,
  Globe2,
  X,
  Layers,
} from 'lucide-react';
import { ChatSession, BackendHealth } from '@/types';

interface SidebarProps {
  sessions: ChatSession[];
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewSession: () => void;
  onDeleteSession: (id: string, e: React.MouseEvent) => void;
  onOpenSettings: () => void;
  health: BackendHealth;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

export default function Sidebar({
  sessions,
  activeSessionId,
  onSelectSession,
  onNewSession,
  onDeleteSession,
  onOpenSettings,
  health,
  isOpenMobile,
  onCloseMobile,
}: SidebarProps) {
  const [searchQuery, setSearchQuery] = React.useState('');

  const filteredSessions = sessions.filter((s) =>
    s.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      {/* Mobile backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 lg:w-80 flex flex-col p-3 transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Floating Sidebar Card */}
        <div className="flex-1 flex flex-col bg-[#18181b] text-zinc-100 rounded-3xl border border-zinc-800 shadow-xl overflow-hidden p-4">
          
          {/* Brand Header */}
          <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-zinc-900 border border-zinc-700 flex items-center justify-center text-white shadow-inner">
                <Globe2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-base font-bold tracking-tight text-white">ScrapeX</h1>
                <p className="text-xs text-zinc-400">Web Scraping Agent</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  health.status === 'healthy'
                    ? 'bg-emerald-400 animate-pulse'
                    : health.status === 'checking'
                    ? 'bg-amber-400'
                    : 'bg-rose-500'
                }`}
                title={`Status: ${health.status}`}
              />
              <button
                onClick={onCloseMobile}
                className="lg:hidden p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* New Scrape Session Primary Button */}
          <div className="pt-4 pb-3">
            <button
              onClick={() => {
                onNewSession();
                onCloseMobile();
              }}
              className="w-full py-3 px-4 rounded-2xl bg-white hover:bg-zinc-100 active:scale-[0.98] text-zinc-950 text-sm font-semibold shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 text-zinc-950 stroke-[2.5]" />
              <span>New Scraping Chat</span>
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-3 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Search chat history..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-600"
            />
          </div>

          {/* Sessions List Header */}
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-zinc-400 px-1 pb-1">
            <span>Recent Sessions</span>
            <span className="font-mono text-xs text-zinc-500">{sessions.length}</span>
          </div>

          {/* Sessions Scrollable List */}
          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 py-1">
            {filteredSessions.length === 0 ? (
              <p className="text-center py-8 text-xs text-zinc-500">No conversations found</p>
            ) : (
              filteredSessions.map((session) => {
                const isActive = session.id === activeSessionId;
                return (
                  <div
                    key={session.id}
                    onClick={() => {
                      onSelectSession(session.id);
                      onCloseMobile();
                    }}
                    className={`group relative flex items-center justify-between p-3 rounded-2xl cursor-pointer text-xs sm:text-sm transition-all ${
                      isActive
                        ? 'bg-zinc-800 text-white font-medium border border-zinc-700 shadow-xs'
                        : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 pr-3">
                      <MessageSquare className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-zinc-500'}`} />
                      <span className="truncate">{session.title}</span>
                    </div>

                    <button
                      onClick={(e) => onDeleteSession(session.id, e)}
                      title="Delete conversation"
                      className="opacity-0 group-hover:opacity-100 p-1 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* Bottom Settings Bar */}
          <div className="pt-3 border-t border-zinc-800 space-y-2">
            <div className="flex items-center justify-between px-2 py-1 text-xs text-zinc-400">
              <span className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-zinc-400" />
                Bright Data MCP
              </span>
              <span className="font-mono text-zinc-300 font-medium">
                {health.indexed_tools ?? 16} Tools
              </span>
            </div>

            <button
              onClick={onOpenSettings}
              className="w-full py-2.5 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-medium text-zinc-300 flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Settings2 className="w-4 h-4 text-zinc-400" />
              <span>Agent Settings & API</span>
            </button>
          </div>

        </div>
      </aside>
    </>
  );
}
