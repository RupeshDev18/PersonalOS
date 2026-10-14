'use client';

import React, { useState, useEffect } from 'react';
import {
  Clock,
  Play,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Loader2,
  Calendar,
  AlertCircle,
  Briefcase,
  ShoppingBag,
  Bell,
  Search,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { routines as apiRoutines, RoutineItem } from '@/lib/api';

export default function RoutinesPanel() {
  const [routinesList, setRoutinesList] = useState<RoutineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningId, setRunningId] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const fetchRoutines = async () => {
    try {
      setLoading(true);
      const res = await apiRoutines.list();
      setRoutinesList(res || []);
    } catch (err: any) {
      setStatusMsg({ ok: false, text: err.message || 'Failed to load autonomous routines.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoutines();
  }, []);

  const handleRunNow = async (id: string) => {
    setRunningId(id);
    setStatusMsg(null);
    try {
      const res = await apiRoutines.run(id);
      setStatusMsg({ ok: res.success, text: res.summary });
      await fetchRoutines();
    } catch (err: any) {
      setStatusMsg({ ok: false, text: err.message || 'Routine execution failed.' });
    } finally {
      setRunningId(null);
    }
  };

  const getCategoryBadge = (cat: string) => {
    switch (cat) {
      case 'briefing':
        return (
          <span className="flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
            <Bell size={11} /> Executive Briefing
          </span>
        );
      case 'career':
        return (
          <span className="flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
            <Briefcase size={11} /> Career Scout
          </span>
        );
      case 'shopping':
        return (
          <span className="flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            <ShoppingBag size={11} /> Deals & Price Tracker
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-50 text-slate-700 border border-slate-200">
            <Sparkles size={11} /> Intelligence
          </span>
        );
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200 flex-shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
              <Clock size={18} />
            </div>
            <h1 className="text-base font-bold text-slate-900">Manual Routines</h1>
            <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-semibold">
              Scheduling not configured
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Run a connector workflow on demand. Recurring schedules are not active yet.
          </p>
        </div>

        <button
          onClick={fetchRoutines}
          disabled={loading}
          className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Status banner */}
      {statusMsg && (
        <div
          className={`mx-6 mt-4 p-3 rounded-lg text-xs flex items-center gap-2 ${
            statusMsg.ok ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          {statusMsg.ok ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {loading && routinesList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-2">
            <Loader2 size={24} className="animate-spin text-indigo-500" />
            <span className="text-xs">Loading autonomous routines...</span>
          </div>
        ) : (
          routinesList.map((routine) => {
            const isRunning = runningId === routine.id;
            const isExpanded = expandedLogId === routine.id;

            return (
              <div
                key={routine.id}
                className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm transition-all hover:border-slate-300"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <h2 className="text-sm font-bold text-slate-900">{routine.name}</h2>
                      {getCategoryBadge(routine.category)}
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                        {routine.schedule}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed mb-3">
                      {routine.description}
                    </p>

                    {routine.lastSummary && (
                      <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-xs text-slate-700 flex items-start gap-2">
                        <CheckCircle2 size={13} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <span className="font-semibold text-slate-800">Latest Run Result: </span>
                          <span>{routine.lastSummary}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col items-end gap-3 flex-shrink-0">
                    <span className="text-xs font-medium text-slate-500">Manual only</span>

                    <button
                      type="button"
                      onClick={() => handleRunNow(routine.id)}
                      disabled={isRunning}
                      className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition-colors disabled:opacity-60 shadow-sm"
                    >
                      {isRunning ? (
                        <>
                          <Loader2 size={12} className="animate-spin" /> Executing...
                        </>
                      ) : (
                        <>
                          <Play size={12} fill="currentColor" /> Run Now
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Footer with logs toggle */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                  <div className="flex items-center gap-3">
                    {routine.lastRun && (
                      <span>Last triggered: {new Date(routine.lastRun).toLocaleTimeString()}</span>
                    )}
                    {routine.nextRun && (
                      <span>Next scheduled: {new Date(routine.nextRun).toLocaleDateString()}</span>
                    )}
                  </div>

                  {routine.logs && routine.logs.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setExpandedLogId(isExpanded ? null : routine.id)}
                      className="flex items-center gap-1 text-indigo-600 hover:underline font-medium"
                    >
                      <span>Execution Logs ({routine.logs.length})</span>
                      {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    </button>
                  )}
                </div>

                {/* Expanded logs */}
                {isExpanded && routine.logs && (
                  <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
                    <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                      Recent Execution History
                    </span>
                    {routine.logs.map((log) => (
                      <div
                        key={log.id}
                        className="text-xs p-2 rounded bg-slate-50 border border-slate-100 flex items-center justify-between gap-2"
                      >
                        <span className="text-slate-700">{log.summary}</span>
                        <span className="text-[10px] text-slate-400 font-mono flex-shrink-0">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
