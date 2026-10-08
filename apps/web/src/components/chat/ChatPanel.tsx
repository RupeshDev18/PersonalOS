'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, RefreshCw } from 'lucide-react';
import ChatMessage from './ChatMessage';
import GhostMascot from '@/components/GhostMascot';
import type { ChatMessage as ChatMessageType } from '@/lib/types';

const SUGGESTIONS = [
  'Find me relevant jobs',
  'Check my budget',
  'Should I buy a MacBook Air M2?',
  'Check my inbox',
  'Research React Server Components',
];

interface ChatPanelProps {
  messages: ChatMessageType[];
  sending: boolean;
  onSend: (prompt: string) => void;
  onClear: () => void;
}

export default function ChatPanel({ messages, sending, onSend, onClear }: ChatPanelProps) {
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || sending) return;
    onSend(trimmed);
    setInput('');
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 flex-shrink-0">
        <div className="flex items-center gap-2">
          <GhostMascot size="sm" mood={sending ? 'thinking' : 'happy'} />
          <div>
            <p className="text-sm font-semibold text-slate-800">Chief Ghost</p>
            <p className="text-[10px] text-slate-400">
              {sending ? 'Thinking…' : 'Ready'}
            </p>
          </div>
        </div>
        {messages.length > 0 && (
          <button
            onClick={onClear}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 transition-colors px-2 py-1 rounded-lg hover:bg-slate-100"
          >
            <RefreshCw size={12} />
            Clear
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <GhostMascot size="lg" mood="happy" className="mb-4" />
            <h2 className="text-lg font-semibold text-slate-800 font-heading mb-1">
              Hey! I'm Chief Ghost
            </h2>
            <p className="text-sm text-slate-500 max-w-xs mb-6">
              Your personal AI coordinator. I can find jobs, check your budget,
              compare products, search the web, and check your inbox.
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => onSend(s)}
                  className="text-xs px-3 py-1.5 rounded-full border border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <ChatMessage key={msg.id} message={msg} />
          ))
        )}
        {sending && (
          <div className="flex gap-2.5 items-center">
            <GhostMascot size="sm" mood="thinking" />
            <div className="bg-white border border-slate-200 px-4 py-2.5 rounded-2xl rounded-tl-sm shadow-sm">
              <Loader2 size={14} className="text-indigo-500 animate-spin" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-slate-100 flex-shrink-0">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask Chief Ghost anything…"
            disabled={sending}
            className="flex-1 text-sm px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-300 disabled:opacity-60 bg-white"
          />
          <button
            type="submit"
            disabled={!input.trim() || sending}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-colors disabled:opacity-50 flex items-center gap-1.5"
          >
            {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
          </button>
        </form>
      </div>
    </div>
  );
}
