'use client';

import React, { useState } from 'react';
import { RefreshCw, Loader2, Zap, FileText } from 'lucide-react';
import JobCard from './JobCard';
import JobFilters from './JobFilters';
import ResumeVault from './ResumeVault';
import type { Job, JobLifecycleStatus, ResumeProfile } from '@/lib/types';

interface JobsPanelProps {
  jobs: Job[];
  resumes: ResumeProfile[];
  loading: boolean;
  discovering: boolean;
  error: string | null;
  search: string;
  onSearch: (v: string) => void;
  statusFilter: JobLifecycleStatus | '';
  onStatusFilter: (v: JobLifecycleStatus | '') => void;
  remoteOnly: boolean;
  onRemoteOnly: (v: boolean) => void;
  minScore: number | undefined;
  onMinScore: (v: number | undefined) => void;
  onStatusChange: (id: string, status: JobLifecycleStatus) => void;
  onTriggerDiscovery: () => void;
  onResumeRefresh: () => void;
  onNavigateConnectors?: () => void;
}

export default function JobsPanel({
  jobs, resumes, loading, discovering, error,
  search, onSearch, statusFilter, onStatusFilter,
  remoteOnly, onRemoteOnly, minScore, onMinScore,
  onStatusChange, onTriggerDiscovery, onResumeRefresh,
  onNavigateConnectors,
}: JobsPanelProps) {
  const [tab, setTab] = useState<'jobs' | 'resumes'>('jobs');
  const [sourceFilter, setSourceFilter] = useState('');

  const filteredJobs = sourceFilter
    ? jobs.filter((j) => j.source.toLowerCase().includes(sourceFilter.toLowerCase()))
    : jobs;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 flex-shrink-0">
        <div className="flex gap-1">
          {(['jobs', 'resumes'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                tab === t
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              {t === 'jobs' ? <Zap size={13} /> : <FileText size={13} />}
              {t === 'jobs' ? `Jobs (${jobs.length})` : `Resumes (${resumes.length})`}
            </button>
          ))}
        </div>
        {tab === 'jobs' && (
          <button
            onClick={onTriggerDiscovery}
            disabled={discovering}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60 transition-colors"
          >
            {discovering ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
            {discovering ? 'Discovering…' : 'Discover'}
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {tab === 'jobs' ? (
          <div className="p-4 space-y-4">
            <JobFilters
              search={search} onSearch={onSearch}
              statusFilter={statusFilter} onStatusFilter={onStatusFilter}
              sourceFilter={sourceFilter} onSourceFilter={setSourceFilter}
              remoteOnly={remoteOnly} onRemoteOnly={onRemoteOnly}
              minScore={minScore} onMinScore={onMinScore}
              totalCount={filteredJobs.length}
            />

            {error && (
              <div className="flex items-center justify-between p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
                <span>{error}</span>
                {onNavigateConnectors && (
                  <button onClick={onNavigateConnectors} className="font-semibold text-indigo-600 hover:underline ml-2">
                    Check Connectors →
                  </button>
                )}
              </div>
            )}

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 size={24} className="text-indigo-400 animate-spin" />
              </div>
            ) : filteredJobs.length === 0 ? (
              <div className="text-center py-12 px-4 border border-dashed border-slate-200 rounded-2xl bg-white space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
                  <Zap size={22} />
                </div>
                <h4 className="text-sm font-semibold text-slate-800">No jobs indexed yet</h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  PersonalOS aggregates live jobs from Greenhouse ATS, Indian Unicorn boards, and startup platforms. Click below to run discovery or configure job sources in Connectors.
                </p>
                <div className="flex items-center justify-center gap-3 pt-2">
                  <button
                    onClick={onTriggerDiscovery}
                    disabled={discovering}
                    className="flex items-center gap-1.5 text-xs px-3.5 py-2 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700 shadow-sm transition-all"
                  >
                    <RefreshCw size={12} className={discovering ? 'animate-spin' : ''} />
                    {discovering ? 'Discovering…' : 'Trigger Live Discovery'}
                  </button>
                  {onNavigateConnectors && (
                    <button
                      onClick={onNavigateConnectors}
                      className="text-xs px-3.5 py-2 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition-colors"
                    >
                      Configure Connectors
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredJobs.map((job) => (
                  <JobCard key={job.id} job={job} onStatusChange={onStatusChange} />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="p-4">
            <ResumeVault resumes={resumes} onRefresh={onResumeRefresh} />
          </div>
        )}
      </div>
    </div>
  );
}
