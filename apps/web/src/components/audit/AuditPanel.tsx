'use client';

import React, { useState } from 'react';
import { Activity, RefreshCw, Loader2, Search } from 'lucide-react';
import AuditEventRow from './AuditEventRow';
import type { AuditEvent } from '@/lib/types';

interface AuditPanelProps {
  events: AuditEvent[];
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
}

export default function AuditPanel({ events, loading, error, onRefresh }: AuditPanelProps) {
  const [search, setSearch] = useState('');

  const filtered = search
    ? events.filter((e) =>
        e.eventType.toLowerCase().includes(search.toLowerCase()) ||
        e.toolName?.toLowerCase().includes(search.toLowerCase()) ||
        e.agentId?.toLowerCase().includes(search.toLowerCase()) ||
        e.rationale?.toLowerCase().includes(search.toLowerCase()),
      )
    : events;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Activity size={15} className="text-slate-500" />
          <span className="text-sm font-semibold text-slate-800">Audit Log</span>
          <span className="text-xs text-slate-400">({events.length} events)</span>
        </div>
        <button
          onClick={onRefresh}
          className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
        >
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Search */}
      <div className="px-4 pt-3 flex-shrink-0">
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter events…"
            className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto mt-3 bg-white border border-slate-100 mx-4 mb-4 rounded-xl">
        {error && (
          <p className="text-xs text-red-500 px-4 py-3">{error}</p>
        )}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={20} className="text-indigo-400 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <Activity size={24} className="text-slate-200 mx-auto mb-2" />
            <p className="text-sm text-slate-400">No audit events yet.</p>
            <p className="text-xs text-slate-300 mt-1">Every agent action, tool call, and approval will appear here.</p>
          </div>
        ) : (
          <div>
            {filtered.map((event) => (
              <AuditEventRow key={event.id} event={event} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
