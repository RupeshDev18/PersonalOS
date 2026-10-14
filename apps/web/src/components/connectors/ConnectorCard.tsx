'use client';

import React, { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, ChevronRight, X, XCircle } from 'lucide-react';
import type { ConnectorInfo } from '@/lib/types';

interface ConnectorCardProps {
  connector: ConnectorInfo;
  actions?: React.ReactNode;
}

function StatusBadge({ status }: { status: ConnectorInfo['status'] }) {
  if (status === 'connected') {
    return <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700"><CheckCircle2 size={10} />Connected</span>;
  }
  if (status === 'fallback_mode') {
    return <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700"><AlertCircle size={10} />Limited</span>;
  }
  if (status === 'error') {
    return <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-600"><XCircle size={10} />Error</span>;
  }
  return <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500"><XCircle size={10} />Not connected</span>;
}

export default function ConnectorCard({ connector, actions }: ConnectorCardProps) {
  const [open, setOpen] = useState(false);
  const hasDetails = Boolean(connector.details && Object.keys(connector.details).length);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group flex min-h-[106px] w-full flex-col rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-indigo-200 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-400"
        aria-label={`${actions ? 'Configure' : 'View details for'} ${connector.name}`}
      >
        <span className="flex w-full items-start justify-between gap-3">
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-slate-800">{connector.name}</span>
            <span className="mt-1 line-clamp-2 block text-xs leading-relaxed text-slate-500">{connector.description}</span>
          </span>
          <ChevronRight size={16} className="mt-0.5 shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-indigo-600" />
        </span>
        <span className="mt-auto flex items-center justify-between gap-2 pt-3">
          <StatusBadge status={connector.status} />
          <span className="text-[10px] font-medium text-slate-400">{actions ? 'Open settings' : hasDetails ? 'View details' : 'Open'}</span>
        </span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-[2px]"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby={`connector-title-${connector.id}`}
            className="flex max-h-[min(85vh,760px)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
          >
            <header className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 id={`connector-title-${connector.id}`} className="text-base font-semibold text-slate-900">{connector.name}</h2>
                  <StatusBadge status={connector.status} />
                </div>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">{connector.description}</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Close connector settings">
                <X size={18} />
              </button>
            </header>

            <div className="space-y-4 overflow-y-auto p-5">
              {connector.rateLimit && <p className="text-[11px] text-slate-400">Rate limit: {connector.rateLimit}</p>}
              {actions && <div>{actions}</div>}
              {hasDetails && (
                <div className="rounded-xl bg-slate-50 p-3">
                  <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Connection details</h3>
                  <div className="space-y-1.5">
                    {Object.entries(connector.details ?? {})
                      .filter(([, value]) => value !== null && value !== undefined && value !== '')
                      .map(([key, value]) => (
                        <div key={key} className="flex gap-3 text-xs">
                          <span className="w-28 shrink-0 capitalize text-slate-400">{key.replace(/([A-Z])/g, ' $1').toLowerCase()}</span>
                          <span className="break-all font-medium text-slate-700">{Array.isArray(value) ? value.join(', ') : String(value)}</span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </>
  );
}
