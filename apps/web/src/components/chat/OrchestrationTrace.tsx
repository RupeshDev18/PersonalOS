'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, CheckCircle2, AlertCircle, Loader2, Shield, Zap } from 'lucide-react';
import type { OrchestrationStepTrace } from '@/lib/types';

const PHASE_COLOR: Record<string, string> = {
  intent_parsing:        'text-violet-600 bg-violet-50',
  policy_check:          'text-sky-600 bg-sky-50',
  connector_fetch:       'text-emerald-600 bg-emerald-50',
  specialist_processing: 'text-amber-600 bg-amber-50',
  synthesis:             'text-indigo-600 bg-indigo-50',
  audit_seal:            'text-slate-600 bg-slate-100',
};

const PHASE_LABEL: Record<string, string> = {
  intent_parsing:        'Intent',
  policy_check:          'Policy',
  connector_fetch:       'Connector',
  specialist_processing: 'Specialist',
  synthesis:             'Synthesis',
  audit_seal:            'Audit',
};

function StepIcon({ status }: { status: string }) {
  if (status === 'completed' || status === 'policy_verified') {
    return <CheckCircle2 size={13} className="text-emerald-500 flex-shrink-0 mt-0.5" />;
  }
  if (status === 'failed') return <AlertCircle size={13} className="text-red-500 flex-shrink-0 mt-0.5" />;
  if (status === 'in_progress') return <Loader2 size={13} className="text-indigo-500 animate-spin flex-shrink-0 mt-0.5" />;
  return <Shield size={13} className="text-sky-500 flex-shrink-0 mt-0.5" />;
}

interface OrchestrationTraceProps {
  trace: OrchestrationStepTrace[];
}

export default function OrchestrationTrace({ trace }: OrchestrationTraceProps) {
  const [open, setOpen] = useState(false);
  if (!trace.length) return null;

  const totalMs = trace.reduce((sum, s) => sum + s.durationMs, 0);

  return (
    <div className="mt-2 border border-slate-100 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <Zap size={12} className="text-indigo-400" />
          <span className="text-xs font-semibold text-slate-600">
            Execution trace · {trace.length} steps · {totalMs}ms
          </span>
        </div>
        {open ? <ChevronUp size={13} className="text-slate-400" /> : <ChevronDown size={13} className="text-slate-400" />}
      </button>

      {open && (
        <div className="divide-y divide-slate-50">
          {trace.map((step) => (
            <div key={step.id} className="px-3 py-2 flex gap-2.5">
              <StepIcon status={step.status} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${PHASE_COLOR[step.phase] ?? 'text-slate-600 bg-slate-100'}`}>
                    {PHASE_LABEL[step.phase] ?? step.phase}
                  </span>
                  <span className="text-xs font-medium text-slate-700 truncate">{step.name}</span>
                  <span className="text-[10px] text-slate-400 ml-auto flex-shrink-0">{step.durationMs}ms</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
