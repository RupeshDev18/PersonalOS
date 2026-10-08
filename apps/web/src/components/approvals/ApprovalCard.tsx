'use client';

import React, { useState } from 'react';
import { ShieldCheck, ShieldX, Clock, CheckCircle2, XCircle, FileText } from 'lucide-react';
import type { ApprovalRequest } from '@/lib/types';

const ACTION_LABELS: Record<string, string> = {
  'jobs.application.submit': 'Job Application',
  'email.send':              'Send Email',
  'shopping.purchase':       'Purchase',
  'social.publish':          'Publish Post',
};

interface ApprovalCardProps {
  approval: ApprovalRequest;
  onDecide: (id: string, decision: 'approve' | 'reject', note?: string) => Promise<void>;
}

export default function ApprovalCard({ approval, onDecide }: ApprovalCardProps) {
  const [deciding, setDeciding] = useState<'approve' | 'reject' | null>(null);
  const [note, setNote] = useState('');
  const [showNote, setShowNote] = useState(false);

  const isPending = approval.status === 'pending';

  const handleDecide = async (decision: 'approve' | 'reject') => {
    setDeciding(decision);
    try {
      await onDecide(approval.id, decision, note || undefined);
    } finally {
      setDeciding(null);
      setShowNote(false);
      setNote('');
    }
  };

  const statusIcon = {
    pending:  <Clock size={13} className="text-amber-500" />,
    approved: <CheckCircle2 size={13} className="text-emerald-500" />,
    rejected: <XCircle size={13} className="text-red-400" />,
    expired:  <XCircle size={13} className="text-slate-400" />,
  }[approval.status];

  const statusBg = {
    pending:  'bg-amber-50 border-amber-200',
    approved: 'bg-emerald-50 border-emerald-200',
    rejected: 'bg-red-50 border-red-200',
    expired:  'bg-slate-50 border-slate-200',
  }[approval.status];

  return (
    <div className={`border rounded-xl p-4 space-y-3 ${statusBg}`}>
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">{statusIcon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold text-slate-800">{approval.title}</h3>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white border border-current text-slate-500">
              {ACTION_LABELS[approval.actionType] ?? approval.actionType}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">{approval.description}</p>
        </div>
      </div>

      {/* Payload details */}
      {Object.keys(approval.payload).length > 0 && (
        <div className="bg-white rounded-lg p-2.5 border border-slate-200 space-y-1">
          {Object.entries(approval.payload).map(([k, v]) => (
            <div key={k} className="flex gap-2 text-xs">
              <span className="text-slate-400 capitalize w-20 flex-shrink-0">{k}</span>
              <span className="text-slate-700 font-medium">{String(v)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Execution result (post-approval) */}
      {approval.executionResult && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2.5">
          <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-medium mb-1">
            <CheckCircle2 size={11} /> Action Executed
          </div>
          <p className="text-[11px] text-emerald-600">{approval.executionResult.details}</p>
        </div>
      )}

      {/* Decision note input */}
      {isPending && showNote && (
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Optional note…"
          rows={2}
          className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none bg-white"
        />
      )}

      {/* Actions */}
      {isPending && (
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={() => handleDecide('approve')}
            disabled={deciding !== null}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg disabled:opacity-60 transition-colors"
          >
            <ShieldCheck size={12} />
            {deciding === 'approve' ? 'Approving…' : 'Approve'}
          </button>
          <button
            onClick={() => handleDecide('reject')}
            disabled={deciding !== null}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-semibold rounded-lg disabled:opacity-60 transition-colors"
          >
            <ShieldX size={12} />
            {deciding === 'reject' ? 'Rejecting…' : 'Reject'}
          </button>
          <button
            onClick={() => setShowNote((v) => !v)}
            className="ml-auto text-xs text-slate-400 hover:text-slate-600 transition-colors"
          >
            {showNote ? 'Hide note' : 'Add note'}
          </button>
        </div>
      )}

      {/* Decided-at */}
      {approval.decidedAt && (
        <p className="text-[10px] text-slate-400">
          {approval.status === 'approved' ? 'Approved' : 'Rejected'} ·{' '}
          {new Date(approval.decidedAt).toLocaleString()}
          {approval.userDecisionNote && ` · "${approval.userDecisionNote}"`}
        </p>
      )}
    </div>
  );
}
