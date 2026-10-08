'use client';

import React, { useState } from 'react';
import {
  CheckCircle2, XCircle, AlertCircle, ExternalLink,
  ChevronDown, ChevronUp, Loader2,
} from 'lucide-react';
import type { ConnectorInfo } from '@/lib/types';

interface ConnectorCardProps {
  connector: ConnectorInfo;
  /** Slot for action buttons specific to this connector type */
  actions?: React.ReactNode;
}

function StatusBadge({ status }: { status: ConnectorInfo['status'] }) {
  if (status === 'connected') {
    return (
      <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
        <CheckCircle2 size={10} /> Live
      </span>
    );
  }
  if (status === 'fallback_mode') {
    return (
      <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
        <AlertCircle size={10} /> Fallback
      </span>
    );
  }
  if (status === 'error') {
    return (
      <span className="flex items-center gap-1 text-[10px] font-semibold text-red-500 bg-red-50 px-2 py-0.5 rounded-full">
        <XCircle size={10} /> Error
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-[10px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
      <XCircle size={10} /> Disconnected
    </span>
  );
}

export default function ConnectorCard({ connector, actions }: ConnectorCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="playful-card p-4 space-y-3">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold text-slate-800">{connector.name}</h3>
            <StatusBadge status={connector.status} />
          </div>
          <p className="text-xs text-slate-500 mt-0.5 leading-snug">{connector.description}</p>
        </div>
      </div>

      {/* Meta row */}
      <div className="flex items-center gap-3 text-[10px] text-slate-400">
        {connector.rateLimit && <span>Rate: {connector.rateLimit}</span>}
        {connector.lastSync && (
          <span>Synced: {new Date(connector.lastSync).toLocaleTimeString()}</span>
        )}
      </div>

      {/* Expanded details */}
      {expanded && connector.details && Object.keys(connector.details).length > 0 && (
        <div className="bg-slate-50 rounded-xl p-3 space-y-1">
          {Object.entries(connector.details)
            .filter(([, v]) => v !== null && v !== undefined && v !== '')
            .map(([k, v]) => (
              <div key={k} className="flex gap-2 text-xs">
                <span className="text-slate-400 capitalize w-28 flex-shrink-0">
                  {k.replace(/([A-Z])/g, ' $1').toLowerCase()}
                </span>
                <span className="text-slate-700 font-medium break-all">
                  {Array.isArray(v) ? (v as string[]).join(', ') : String(v)}
                </span>
              </div>
            ))}
        </div>
      )}

      {/* Footer: actions + expand */}
      <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
        {actions}
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 transition-colors ml-auto"
        >
          {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          {expanded ? 'Less' : 'Details'}
        </button>
      </div>
    </div>
  );
}
