'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { AuditEvent, AuditEventType } from '@/lib/types';

const EVENT_COLOR: Record<AuditEventType, string> = {
  TASK_CREATED:       'bg-indigo-50 text-indigo-700',
  TASK_STARTED:       'bg-indigo-50 text-indigo-600',
  TASK_COMPLETED:     'bg-emerald-50 text-emerald-700',
  TASK_FAILED:        'bg-red-50 text-red-600',
  AGENT_ASSIGNED:     'bg-violet-50 text-violet-600',
  AGENT_STARTED:      'bg-violet-50 text-violet-500',
  AGENT_COMPLETED:    'bg-emerald-50 text-emerald-600',
  TOOL_CALLED:        'bg-sky-50 text-sky-600',
  TOOL_COMPLETED:     'bg-sky-50 text-sky-700',
  TOOL_FAILED:        'bg-red-50 text-red-500',
  DATA_ACCESSED:      'bg-slate-100 text-slate-600',
  SEARCH_PERFORMED:   'bg-amber-50 text-amber-600',
  DECISION_CREATED:   'bg-amber-50 text-amber-700',
  APPROVAL_REQUESTED: 'bg-orange-50 text-orange-600',
  APPROVAL_GRANTED:   'bg-emerald-50 text-emerald-700',
  APPROVAL_REJECTED:  'bg-red-50 text-red-500',
  ACTION_EXECUTED:    'bg-emerald-50 text-emerald-600',
  ACTION_FAILED:      'bg-red-50 text-red-600',
};

interface AuditEventRowProps {
  event: AuditEvent;
}

export default function AuditEventRow({ event }: AuditEventRowProps) {
  const [expanded, setExpanded] = useState(false);
  const hasPayload = event.inputPayload || event.outputPayload || event.rationale;
  const colorClass = EVENT_COLOR[event.eventType] ?? 'bg-slate-100 text-slate-600';

  return (
    <div className="border-b border-slate-50 last:border-0">
      <div
        className={`flex items-start gap-3 px-4 py-2.5 ${hasPayload ? 'cursor-pointer hover:bg-slate-50' : ''}`}
        onClick={() => hasPayload && setExpanded((v) => !v)}
      >
        {/* Event type badge */}
        <span className={`flex-shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded mt-0.5 ${colorClass}`}>
          {event.eventType.replace(/_/g, ' ')}
        </span>

        {/* Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {event.toolName && (
              <span className="text-xs font-medium text-slate-700">{event.toolName}</span>
            )}
            {event.agentId && (
              <span className="text-[10px] text-slate-400">[{event.agentId}]</span>
            )}
            {event.durationMs != null && (
              <span className="text-[10px] text-slate-300 ml-auto flex-shrink-0">{event.durationMs}ms</span>
            )}
          </div>
          {event.rationale && (
            <p className="text-[11px] text-slate-500 mt-0.5 truncate">{event.rationale}</p>
          )}
        </div>

        {/* Timestamp + expand */}
        <div className="flex-shrink-0 flex items-center gap-1.5 text-[10px] text-slate-300">
          <span>{new Date(event.timestamp).toLocaleTimeString()}</span>
          {hasPayload && (expanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />)}
        </div>
      </div>

      {/* Expanded payload */}
      {expanded && hasPayload && (
        <div className="px-4 pb-3 space-y-2">
          {event.rationale && (
            <p className="text-xs text-slate-600 bg-slate-50 px-3 py-2 rounded-lg">{event.rationale}</p>
          )}
          {event.inputPayload && (
            <details className="text-[11px]">
              <summary className="cursor-pointer text-slate-400 mb-1">Input payload</summary>
              <pre className="bg-slate-50 rounded-lg p-2 overflow-x-auto text-slate-600 leading-relaxed">
                {JSON.stringify(event.inputPayload, null, 2)}
              </pre>
            </details>
          )}
          {event.outputPayload && (
            <details className="text-[11px]">
              <summary className="cursor-pointer text-slate-400 mb-1">Output payload</summary>
              <pre className="bg-slate-50 rounded-lg p-2 overflow-x-auto text-slate-600 leading-relaxed">
                {JSON.stringify(event.outputPayload, null, 2)}
              </pre>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
