'use client';

import React from 'react';
import {
  Globe2,
  Sparkles,
  Search,
  ShoppingCart,
  MessageSquare,
  Newspaper,
  Cpu,
  ArrowRight,
  ShieldCheck,
  Zap,
} from 'lucide-react';

interface EmptyStateProps {
  onSelectPrompt: (prompt: string) => void;
}

const SCRAPER_TEMPLATES = [
  {
    icon: ShoppingCart,
    tag: 'E-Commerce Scraper',
    title: 'Amazon Product & Review Comparison',
    query: 'Find top rated noise cancelling headphones on Amazon and compare their prices, specs, and user reviews',
    desc: 'Extracts real-time pricing, ratings, and customer sentiment from Amazon listings.',
  },
  {
    icon: MessageSquare,
    tag: 'Social & Forum Scraper',
    title: 'Reddit Community Insights',
    query: 'What are developers discussing on Reddit about AI Coding Agents and LangGraph?',
    desc: 'Performs site:reddit.com search and parses discussion threads into structured markdown.',
  },
  {
    icon: Newspaper,
    tag: 'News & Media Synthesizer',
    title: 'Tech News & Source Extraction',
    query: 'Search for recent news about open source LLMs and summarize key findings with full source URLs',
    desc: 'Searches multi-source tech publications and aggregates factual insights with live links.',
  },
  {
    icon: Cpu,
    tag: 'Market & Financial Research',
    title: 'Company & Market Analysis',
    query: 'Search for latest discussions and news regarding Reliance Jio IPO timeline and valuation',
    desc: 'Aggregates news releases, analyst commentary, and community forum sentiment.',
  },
];

export default function EmptyState({ onSelectPrompt }: EmptyStateProps) {
  return (
    <div className="py-6 sm:py-10 max-w-4xl mx-auto flex flex-col items-center text-center">
      
      {/* Brand Icon Badge */}
      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-zinc-200/70 border border-zinc-300/80 text-zinc-800 text-xs sm:text-sm font-medium mb-5 shadow-2xs">
        <Globe2 className="w-4 h-4 text-zinc-900" />
        <span>ScrapeX Web Scraping Agent</span>
      </div>

      {/* Hero Headline */}
      <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-zinc-950 tracking-tight mb-4">
        Where web data meets intelligence.
      </h2>
      <p className="text-zinc-600 text-sm sm:text-base max-w-2xl mx-auto mb-8 leading-relaxed">
        Ask complex queries across the web. ScrapeX semantically picks the right scraping tools via FAISS, bypasses bot blocks with Bright Data MCP, and delivers structured synthesized answers in real-time.
      </p>

      {/* Feature Highlights Row */}
      <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 mb-10 text-xs sm:text-sm font-medium text-zinc-700">
        <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-zinc-200 shadow-2xs">
          <Zap className="w-3.5 h-3.5 text-zinc-900" />
          Live SSE Stream
        </span>
        <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-zinc-200 shadow-2xs">
          <ShieldCheck className="w-3.5 h-3.5 text-zinc-900" />
          Bright Data MCP
        </span>
        <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-zinc-200 shadow-2xs">
          <Sparkles className="w-3.5 h-3.5 text-zinc-900" />
          FAISS Semantic Search
        </span>
      </div>

      {/* Scraper Prompt Cards Grid */}
      <div className="w-full text-left">
        <div className="flex items-center justify-between mb-3 px-1">
          <span className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-zinc-500">
            Suggested Scrapes
          </span>
          <span className="text-xs text-zinc-400">Click to run immediately</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {SCRAPER_TEMPLATES.map((item, idx) => {
            const Icon = item.icon;
            return (
              <button
                key={idx}
                onClick={() => onSelectPrompt(item.query)}
                className="group relative p-5 rounded-3xl bg-white border border-zinc-200 hover:border-zinc-400 hover:shadow-md text-left transition-all cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-100 text-zinc-800 text-xs font-semibold">
                      <Icon className="w-3.5 h-3.5 text-zinc-900" />
                      {item.tag}
                    </span>
                    <ArrowRight className="w-4 h-4 text-zinc-400 group-hover:text-zinc-900 group-hover:translate-x-0.5 transition-all" />
                  </div>
                  <h3 className="text-sm sm:text-base font-semibold text-zinc-950 mb-1 leading-snug">
                    {item.title}
                  </h3>
                  <p className="text-xs text-zinc-500 line-clamp-2 leading-relaxed">
                    {item.desc}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-zinc-100 text-xs font-mono text-zinc-700 bg-zinc-50/70 p-2 rounded-xl truncate">
                  &ldquo;{item.query}&rdquo;
                </div>
              </button>
            );
          })}
        </div>
      </div>

    </div>
  );
}
