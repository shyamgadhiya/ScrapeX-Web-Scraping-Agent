'use client';

import React from 'react';
import {
  ChatSession,
  ChatMessage as ChatMessageType,
  ScrapeSettings,
  BackendHealth,
  ToolEvent,
} from '@/types';
import {
  getSavedSettings,
  saveSettings,
  getSavedSessions,
  saveSessions,
  getActiveSessionId,
  saveActiveSessionId,
  createNewSession,
  DEFAULT_SETTINGS,
} from '@/lib/storage';
import { checkBackendHealth, streamScrape } from '@/lib/api';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import ChatMessage from '@/components/ChatMessage';
import ChatInput from '@/components/ChatInput';
import EmptyState from '@/components/EmptyState';
import SettingsModal from '@/components/SettingsModal';

export default function Home() {
  const [sessions, setSessions] = React.useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = React.useState<string | null>(null);
  const [settings, setSettings] = React.useState<ScrapeSettings>(DEFAULT_SETTINGS);
  const [health, setHealth] = React.useState<BackendHealth>({ status: 'checking' });
  const [input, setInput] = React.useState('');
  const [isStreaming, setIsStreaming] = React.useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const abortControllerRef = React.useRef<AbortController | null>(null);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  // 1. Initialize data from LocalStorage
  React.useEffect(() => {
    const savedSettings = getSavedSettings();
    setSettings(savedSettings);

    const savedSessions = getSavedSessions();
    if (savedSessions.length > 0) {
      setSessions(savedSessions);
      const savedActiveId = getActiveSessionId();
      const validActive = savedSessions.find((s) => s.id === savedActiveId);
      if (validActive) {
        setActiveSessionId(validActive.id);
      } else {
        setActiveSessionId(savedSessions[0].id);
        saveActiveSessionId(savedSessions[0].id);
      }
    } else {
      const initial = createNewSession();
      setSessions([initial]);
      setActiveSessionId(initial.id);
      saveSessions([initial]);
      saveActiveSessionId(initial.id);
    }
  }, []);

  // 2. Health check polling
  React.useEffect(() => {
    let isMounted = true;
    const check = async () => {
      const res = await checkBackendHealth(settings.backendUrl);
      if (isMounted) setHealth(res);
    };

    check();
    const interval = setInterval(check, 15000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [settings.backendUrl]);

  // 3. Auto-scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const activeSession = React.useMemo(() => {
    return sessions.find((s) => s.id === activeSessionId) || sessions[0] || null;
  }, [sessions, activeSessionId]);

  React.useEffect(() => {
    scrollToBottom();
  }, [activeSession?.messages, isStreaming]);

  // Session Handlers
  const handleSelectSession = (id: string) => {
    if (isStreaming) {
      if (!confirm('A query is currently streaming. Switch conversation?')) return;
      abortControllerRef.current?.abort();
      setIsStreaming(false);
    }
    setActiveSessionId(id);
    saveActiveSessionId(id);
  };

  const handleNewSession = () => {
    if (isStreaming) {
      abortControllerRef.current?.abort();
      setIsStreaming(false);
    }
    const newSession = createNewSession();
    const updated = [newSession, ...sessions];
    setSessions(updated);
    setActiveSessionId(newSession.id);
    saveSessions(updated);
    saveActiveSessionId(newSession.id);
  };

  const handleDeleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = sessions.filter((s) => s.id !== id);
    if (updated.length === 0) {
      const fresh = createNewSession();
      setSessions([fresh]);
      setActiveSessionId(fresh.id);
      saveSessions([fresh]);
      saveActiveSessionId(fresh.id);
    } else {
      setSessions(updated);
      saveSessions(updated);
      if (activeSessionId === id) {
        setActiveSessionId(updated[0].id);
        saveActiveSessionId(updated[0].id);
      }
    }
  };

  const handleRenameSession = (newTitle: string) => {
    if (!activeSession) return;
    const updated = sessions.map((s) =>
      s.id === activeSession.id ? { ...s, title: newTitle, updatedAt: Date.now() } : s
    );
    setSessions(updated);
    saveSessions(updated);
  };

  const handleClearSession = () => {
    if (!activeSession) return;
    const updated = sessions.map((s) =>
      s.id === activeSession.id ? { ...s, messages: [], updatedAt: Date.now() } : s
    );
    setSessions(updated);
    saveSessions(updated);
  };

  const handleClearAllSessions = () => {
    if (isStreaming) {
      abortControllerRef.current?.abort();
      setIsStreaming(false);
    }
    const fresh = createNewSession();
    setSessions([fresh]);
    setActiveSessionId(fresh.id);
    saveSessions([fresh]);
    saveActiveSessionId(fresh.id);
  };

  const handleSaveSettings = (newSettings: ScrapeSettings) => {
    setSettings(newSettings);
    saveSettings(newSettings);
  };

  // 4. Submit Query & Stream Execution
  const handleSubmitQuery = async (queryText: string) => {
    const trimmed = queryText.trim();
    if (!trimmed || isStreaming || !activeSession) return;

    setInput('');
    setIsStreaming(true);

    const userMessage: ChatMessageType = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: trimmed,
      timestamp: Date.now(),
    };

    const assistantMsgId = `assistant_${Date.now()}`;
    const initialAssistantMessage: ChatMessageType = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      status: 'streaming',
      selectedTools: [],
      toolEvents: [],
    };

    const startTime = Date.now();
    const isFirstMessage = activeSession.messages.length === 0;
    const smartTitle = isFirstMessage
      ? trimmed.length > 36
        ? `${trimmed.substring(0, 36)}...`
        : trimmed
      : activeSession.title;

    // Update session with user msg and placeholder assistant msg
    let currentMessages = [...activeSession.messages, userMessage, initialAssistantMessage];
    let updatedSessions = sessions.map((s) =>
      s.id === activeSession.id
        ? {
            ...s,
            title: smartTitle,
            updatedAt: Date.now(),
            messages: currentMessages,
          }
        : s
    );

    setSessions(updatedSessions);
    saveSessions(updatedSessions);

    // Setup abort controller
    const controller = new AbortController();
    abortControllerRef.current = controller;

    // Helper to update the assistant message in state
    const updateAssistantMsg = (mutator: (msg: ChatMessageType) => ChatMessageType) => {
      setSessions((prevSessions) => {
        const nextSessions = prevSessions.map((s) => {
          if (s.id !== activeSession.id) return s;
          const nextMsgs = s.messages.map((m) => (m.id === assistantMsgId ? mutator(m) : m));
          return { ...s, messages: nextMsgs, updatedAt: Date.now() };
        });
        saveSessions(nextSessions);
        return nextSessions;
      });
    };

    await streamScrape({
      backendUrl: settings.backendUrl,
      query: trimmed,
      topK: settings.topK,
      temperature: settings.temperature,
      signal: controller.signal,
      onMetadata: (data) => {
        updateAssistantMsg((msg) => ({
          ...msg,
          selectedTools: data.selected_tools || [],
        }));
      },
      onToolCall: (data) => {
        updateAssistantMsg((msg) => ({
          ...msg,
          toolEvents: [
            ...(msg.toolEvents || []),
            {
              type: 'call',
              tool: data.tool,
              args: data.args,
              timestamp: Date.now(),
            },
          ],
        }));
      },
      onToolResult: (data) => {
        updateAssistantMsg((msg) => ({
          ...msg,
          toolEvents: [
            ...(msg.toolEvents || []),
            {
              type: 'result',
              tool: data.tool,
              preview: data.preview,
              length: data.length,
              timestamp: Date.now(),
            },
          ],
        }));
      },
      onFinalResult: (data) => {
        updateAssistantMsg((msg) => ({
          ...msg,
          content: data.text || '',
        }));
      },
      onComplete: () => {
        const duration = (Date.now() - startTime) / 1000;
        updateAssistantMsg((msg) => ({
          ...msg,
          status: 'completed',
          executionTime: duration,
        }));
        setIsStreaming(false);
      },
      onError: (err) => {
        updateAssistantMsg((msg) => ({
          ...msg,
          status: 'error',
          error: err,
        }));
        setIsStreaming(false);
      },
    });

    setIsStreaming(false);
    abortControllerRef.current = null;
  };

  const handleStopStreaming = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsStreaming(false);
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#f4f4f6] text-zinc-900 font-sans antialiased">
      {/* Sidebar Navigation */}
      <Sidebar
        sessions={sessions}
        activeSessionId={activeSession?.id || null}
        onSelectSession={handleSelectSession}
        onNewSession={handleNewSession}
        onDeleteSession={handleDeleteSession}
        onOpenSettings={() => setIsSettingsOpen(true)}
        health={health}
        isOpenMobile={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Chat Workspace */}
      <div className="flex flex-1 flex-col h-full min-w-0 bg-[#f4f4f6]">
        {/* Top Header */}
        <Header
          activeSession={activeSession}
          onRenameSession={handleRenameSession}
          onClearSession={handleClearSession}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          health={health}
        />

        {/* Message Feed / Workspace Area */}
        <main className="flex-1 overflow-y-auto px-4 lg:px-6 py-4">
          <div className="w-full max-w-[90%] md:max-w-[75%] mx-auto">
            {(!activeSession || activeSession.messages.length === 0) ? (
              <EmptyState onSelectPrompt={(prompt) => handleSubmitQuery(prompt)} />
            ) : (
              <div className="space-y-6">
                {activeSession.messages.map((message) => (
                  <ChatMessage
                    key={message.id}
                    message={message}
                    isStreaming={isStreaming && message.id.startsWith('assistant_')}
                  />
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        </main>

        {/* Bottom Input Field */}
        <footer className="shrink-0 bg-gradient-to-t from-[#f4f4f6] via-[#f4f4f6]/95 to-transparent pt-3">
          <ChatInput
            input={input}
            setInput={setInput}
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmitQuery(input);
            }}
            onStop={handleStopStreaming}
            isStreaming={isStreaming}
            settings={settings}
            onOpenSettings={() => setIsSettingsOpen(true)}
          />
        </footer>
      </div>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSave={handleSaveSettings}
        onClearAllSessions={handleClearAllSessions}
      />
    </div>
  );
}
