'use client';

import React, { useState } from 'react';
import { Loader2, RefreshCw, ShieldCheck } from 'lucide-react';
import ApprovalCard from './ApprovalCard';
import type { ApprovalRequest, ApprovalStatus } from '@/lib/types';

const TABS: Array<{ value: ApprovalStatus | 'all'; label: string }> = [
  { value: 'all',      label: 'All' },
  { value: 'pending',  label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
];

interface ApprovalsPanelProps {
  approvals: ApprovalRequest[];
  loading: boolean;
  error: string | null;
  onDecide: (id: string, decision: 'approve' | 'reject', note?: string) => Promise<void>;
  onRefresh: () => void;
  onNavigateConnectors?: () => void;
}

export default function ApprovalsPanel({
  approvals, loading, error, onDecide, onRefresh, onNavigateConnectors,
}: ApprovalsPanelProps) {
  const [tab, setTab] = useState<ApprovalStatus | 'all'>('all');

  const filtered = tab === 'all' ? approvals : approvals.filter((a) => a.status === tab);
  const pendingCount = approvals.filter((a) => a.status === 'pending').length;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 flex-shrink-0">
        <div className="flex items-center gap-2">
          <ShieldCheck size={16} className="text-amber-500" />
          <span className="text-sm font-semibold text-slate-800">Safety Gate</span>
          {pendingCount > 0 && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-400 text-white">
              {pendingCount} pending
            </span>
          )}
        </div>
        <button
          onClick={onRefresh}
          className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
        >
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-4 pt-3 flex-shrink-0">
        {TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
              tab === t.value
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {t.label}
            {t.value === 'pending' && pendingCount > 0 && ` (${pendingCount})`}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {error && (
          <div className="flex items-center justify-between p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
            <span>{error}</span>
            {onNavigateConnectors && (
              <button onClick={onNavigateConnectors} className="font-semibold text-indigo-600 hover:underline ml-2">
                Connectors →
              </button>
            )}
          </div>
        )}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={24} className="text-indigo-400 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 px-4">
            <ShieldCheck size={28} className="text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-medium text-slate-600">
              {tab === 'pending' ? 'No pending approvals' : 'Nothing here yet'}
            </p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              High-risk agent actions (send email, apply for job, external integrations) pause here for your manual sign-off.
            </p>
            {onNavigateConnectors && (
              <button
                onClick={onNavigateConnectors}
                className="mt-3 text-xs text-indigo-600 font-medium hover:underline inline-block"
              >
                Connect Slack or Telegram for instant approval push notifications →
              </button>
            )}
          </div>
        ) : (
          filtered.map((a) => (
            <ApprovalCard key={a.id} approval={a} onDecide={onDecide} />
          ))
        )}
      </div>
    </div>
  );
}
