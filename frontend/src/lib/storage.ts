import { ChatSession, ScrapeSettings } from '@/types';

const SESSIONS_STORAGE_KEY = 'web_scraper_sessions_v1';
const ACTIVE_SESSION_STORAGE_KEY = 'web_scraper_active_session_id_v1';
const SETTINGS_STORAGE_KEY = 'web_scraper_settings_v1';

export const DEFAULT_SETTINGS: ScrapeSettings = {
  backendUrl: process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000',
  topK: 3,
  temperature: 0.1,
};

export function getSavedSettings(): ScrapeSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch (e) {
    console.error('Failed to parse saved settings:', e);
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: ScrapeSettings): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save settings:', e);
  }
}

export function getSavedSessions(): ChatSession[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(SESSIONS_STORAGE_KEY);
    if (!raw) return [];
    const sessions = JSON.parse(raw);
    return Array.isArray(sessions) ? sessions : [];
  } catch (e) {
    console.error('Failed to load sessions from localStorage:', e);
    return [];
  }
}

export function saveSessions(sessions: ChatSession[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(sessions));
  } catch (e) {
    console.error('Failed to save sessions to localStorage:', e);
  }
}

export function getActiveSessionId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ACTIVE_SESSION_STORAGE_KEY);
}

export function saveActiveSessionId(id: string | null): void {
  if (typeof window === 'undefined') return;
  if (!id) {
    localStorage.removeItem(ACTIVE_SESSION_STORAGE_KEY);
  } else {
    localStorage.setItem(ACTIVE_SESSION_STORAGE_KEY, id);
  }
}

export function createNewSession(initialTitle = 'New Scraping Query'): ChatSession {
  const now = Date.now();
  return {
    id: `session_${now}_${Math.random().toString(36).substring(2, 9)}`,
    title: initialTitle,
    createdAt: now,
    updatedAt: now,
    messages: [],
    topK: 3,
    temperature: 0.1,
  };
}
