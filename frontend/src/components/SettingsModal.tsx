'use client';

import React from 'react';
import { X, Sliders, Server, Trash2, CheckCircle2 } from 'lucide-react';
import { ScrapeSettings } from '@/types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: ScrapeSettings;
  onSave: (newSettings: ScrapeSettings) => void;
  onClearAllSessions: () => void;
}

export default function SettingsModal({
  isOpen,
  onClose,
  settings,
  onSave,
  onClearAllSessions,
}: SettingsModalProps) {
  const [backendUrl, setBackendUrl] = React.useState(settings.backendUrl);
  const [topK, setTopK] = React.useState(settings.topK);
  const [temperature, setTemperature] = React.useState(settings.temperature);
  const [savedNotice, setSavedNotice] = React.useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setBackendUrl(settings.backendUrl);
      setTopK(settings.topK);
      setTemperature(settings.temperature);
      setSavedNotice(false);
    }
  }, [isOpen, settings]);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      backendUrl: backendUrl.trim(),
      topK,
      temperature,
    });
    setSavedNotice(true);
    setTimeout(() => {
      setSavedNotice(false);
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      {/* White floating card matching screenshot Payout Threshold modal */}
      <div className="w-full max-w-md rounded-3xl border border-zinc-200/90 bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
          <div>
            <h2 className="text-base font-semibold text-zinc-900 tracking-tight">
              Agent & Engine Settings
            </h2>
            <p className="text-xs text-zinc-500">
              Configure endpoints and extraction parameters
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSave} className="mt-5 space-y-5">
          {/* Backend URL */}
          <div>
            <label className="block text-xs font-semibold text-zinc-800 mb-1.5 flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5 text-zinc-500" />
              FastAPI Backend Endpoint
            </label>
            <input
              type="text"
              value={backendUrl}
              onChange={(e) => setBackendUrl(e.target.value)}
              placeholder="http://localhost:8000"
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-xs sm:text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-500 transition-colors"
              required
            />
            <p className="mt-1 text-[11px] text-zinc-500">
              Address where <code>main.py</code> (FastAPI) is listening.
            </p>
          </div>

          {/* Top-K Tools Slider */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-semibold text-zinc-800">
                Top Semantic Tools (top_k_tools)
              </label>
              <span className="text-xs font-mono font-semibold text-zinc-900 bg-zinc-100 px-2 py-0.5 rounded border border-zinc-200">
                {topK} tools
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="6"
              step="1"
              value={topK}
              onChange={(e) => setTopK(parseInt(e.target.value, 10))}
              className="w-full h-1.5 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-zinc-900"
            />
            <div className="flex justify-between text-[10px] text-zinc-400 mt-1">
              <span>1 (Focused)</span>
              <span>3 (Default)</span>
              <span>6 (Broad)</span>
            </div>
          </div>

          {/* Temperature Slider */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-semibold text-zinc-800">
                Model Temperature
              </label>
              <span className="text-xs font-mono font-semibold text-zinc-900 bg-zinc-100 px-2 py-0.5 rounded border border-zinc-200">
                {temperature.toFixed(2)}
              </span>
            </div>
            <input
              type="range"
              min="0.0"
              max="1.0"
              step="0.05"
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-zinc-900"
            />
            <div className="flex justify-between text-[10px] text-zinc-400 mt-1">
              <span>0.0 (Deterministic)</span>
              <span>0.1 (Recommended)</span>
              <span>1.0 (Creative)</span>
            </div>
          </div>

          {/* Storage Cleanup */}
          <div className="pt-2 border-t border-zinc-100">
            <button
              type="button"
              onClick={() => {
                if (confirm('Delete all saved conversations from local storage?')) {
                  onClearAllSessions();
                  onClose();
                }
              }}
              className="flex items-center gap-1.5 text-xs text-rose-600 hover:text-rose-700 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear all local conversations
            </button>
          </div>

          {/* Action buttons matching screenshot jet-black save button */}
          <div className="flex items-center justify-end gap-2.5 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 text-white shadow-xs transition-all cursor-pointer"
            >
              {savedNotice ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  Saved!
                </>
              ) : (
                'Save Settings'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
