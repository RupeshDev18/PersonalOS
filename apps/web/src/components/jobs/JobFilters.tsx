'use client';

import React from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';
import type { JobLifecycleStatus } from '@/lib/types';

const STATUSES: Array<{ value: JobLifecycleStatus | ''; label: string }> = [
  { value: '',            label: 'All' },
  { value: 'RECOMMENDED', label: 'Recommended' },
  { value: 'SAVED',       label: 'Saved' },
  { value: 'APPLIED',     label: 'Applied' },
  { value: 'IGNORED',     label: 'Ignored' },
];

interface JobFiltersProps {
  search: string;
  onSearch: (v: string) => void;
  statusFilter: JobLifecycleStatus | '';
  onStatusFilter: (v: JobLifecycleStatus | '') => void;
  remoteOnly: boolean;
  onRemoteOnly: (v: boolean) => void;
  minScore: number | undefined;
  onMinScore: (v: number | undefined) => void;
  totalCount: number;
}

export default function JobFilters({
  search, onSearch,
  statusFilter, onStatusFilter,
  remoteOnly, onRemoteOnly,
  minScore, onMinScore,
  totalCount,
}: JobFiltersProps) {
  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Search jobs, companies, skills…"
          className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
        />
      </div>

      {/* Status tabs + toggles */}
      <div className="flex items-center gap-2 flex-wrap">
        {STATUSES.map((s) => (
          <button
            key={s.value}
            onClick={() => onStatusFilter(s.value)}
            className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
              statusFilter === s.value
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {s.label}
          </button>
        ))}

        <div className="ml-auto flex items-center gap-2">
          {/* Remote only */}
          <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
            <input
              type="checkbox"
              checked={remoteOnly}
              onChange={(e) => onRemoteOnly(e.target.checked)}
              className="rounded accent-indigo-600"
            />
            Remote only
          </label>

          {/* Min score */}
          <div className="flex items-center gap-1 text-xs text-slate-600">
            <SlidersHorizontal size={12} />
            <input
              type="number" min={0} max={100} placeholder="Min score"
              value={minScore ?? ''}
              onChange={(e) => onMinScore(e.target.value ? Number(e.target.value) : undefined)}
              className="w-20 px-2 py-1 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-300"
            />
          </div>
        </div>
      </div>

      <p className="text-xs text-slate-400">{totalCount} job{totalCount !== 1 ? 's' : ''} found</p>
    </div>
  );
}
