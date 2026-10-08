'use client';

import React, { useState } from 'react';
import {
  ExternalLink, MapPin, Building2, Bookmark, BookmarkCheck,
  ChevronDown, ChevronUp, FileText, CheckCircle2, AlertCircle,
} from 'lucide-react';
import type { Job, JobLifecycleStatus } from '@/lib/types';

const STATUS_COLORS: Record<JobLifecycleStatus, string> = {
  DISCOVERED:   'bg-slate-100 text-slate-600',
  REVIEWED:     'bg-blue-50 text-blue-600',
  RECOMMENDED:  'bg-indigo-50 text-indigo-600',
  SAVED:        'bg-emerald-50 text-emerald-600',
  IGNORED:      'bg-slate-100 text-slate-400',
  APPLIED:      'bg-violet-50 text-violet-600',
  INTERVIEWING: 'bg-amber-50 text-amber-600',
  REJECTED:     'bg-red-50 text-red-500',
  OFFER:        'bg-emerald-100 text-emerald-700',
  CLOSED:       'bg-slate-100 text-slate-400',
};

function ScoreBar({ score }: { score: number }) {
  const color = score >= 85 ? 'bg-emerald-500' : score >= 70 ? 'bg-amber-400' : 'bg-slate-300';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs font-bold text-slate-700 w-7 text-right">{score}</span>
    </div>
  );
}

interface JobCardProps {
  job: Job;
  onStatusChange: (id: string, status: JobLifecycleStatus) => void;
}

export default function JobCard({ job, onStatusChange }: JobCardProps) {
  const [expanded, setExpanded] = useState(false);
  const isSaved = job.lifecycleStatus === 'SAVED';

  return (
    <div className="playful-card p-4 space-y-3">
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold text-slate-900 truncate">{job.title}</h3>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[job.lifecycleStatus]}`}>
              {job.lifecycleStatus}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
            <span className="flex items-center gap-1"><Building2 size={11} />{job.company}</span>
            <span className="flex items-center gap-1">
              <MapPin size={11} />
              {job.remote ? 'Remote' : job.location.join(', ')}
            </span>
          </div>
        </div>

        {/* Match score */}
        {job.matchScore != null && (
          <div className="flex-shrink-0 text-center">
            <div className="text-lg font-bold text-indigo-700 leading-none">{job.matchScore}</div>
            <div className="text-[9px] text-slate-400 mt-0.5">match</div>
          </div>
        )}
      </div>

      {/* Score bar */}
      {job.matchScore != null && <ScoreBar score={job.matchScore} />}

      {/* Skills */}
      {job.skills.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {job.skills.slice(0, 6).map((s) => (
            <span key={s} className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{s}</span>
          ))}
          {job.skills.length > 6 && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-400">+{job.skills.length - 6}</span>
          )}
        </div>
      )}

      {/* Recommended resume */}
      {job.recommendedResumeId && (
        <div className="flex items-center gap-1.5 text-xs text-indigo-600 bg-indigo-50 px-2.5 py-1.5 rounded-lg">
          <FileText size={11} />
          <span>Recommended resume: <strong>{job.recommendedResumeId}</strong></span>
        </div>
      )}

      {/* Expanded: match breakdown */}
      {expanded && job.matchBreakdown && (
        <div className="border-t border-slate-100 pt-3 space-y-2">
          {[
            ['Skill match', job.matchBreakdown.skillMatch],
            ['Experience', job.matchBreakdown.experienceMatch],
            ['Role fit', job.matchBreakdown.roleMatch],
            ['Location', job.matchBreakdown.locationMatch],
            ['Salary', job.matchBreakdown.salaryMatch],
          ].map(([label, val]) => (
            <div key={label as string} className="flex items-center gap-2">
              <span className="text-xs text-slate-500 w-24 flex-shrink-0">{label as string}</span>
              <ScoreBar score={val as number} />
            </div>
          ))}
          {job.matchBreakdown.reasons.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-emerald-600 mb-1">Why relevant</p>
              {job.matchBreakdown.reasons.map((r, i) => (
                <div key={i} className="flex items-start gap-1 text-[11px] text-slate-600">
                  <CheckCircle2 size={10} className="mt-0.5 text-emerald-500 flex-shrink-0" />
                  {r}
                </div>
              ))}
            </div>
          )}
          {job.matchBreakdown.concerns.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-amber-600 mb-1">Potential concerns</p>
              {job.matchBreakdown.concerns.map((c, i) => (
                <div key={i} className="flex items-start gap-1 text-[11px] text-slate-600">
                  <AlertCircle size={10} className="mt-0.5 text-amber-500 flex-shrink-0" />
                  {c}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
        <button
          onClick={() => onStatusChange(job.id, isSaved ? 'RECOMMENDED' : 'SAVED')}
          className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg transition-colors ${
            isSaved
              ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
              : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
          }`}
        >
          {isSaved ? <BookmarkCheck size={12} /> : <Bookmark size={12} />}
          {isSaved ? 'Saved' : 'Save'}
        </button>
        <button
          onClick={() => onStatusChange(job.id, 'IGNORED')}
          className="text-xs px-2.5 py-1.5 rounded-lg bg-slate-50 text-slate-400 hover:bg-slate-100 transition-colors"
        >
          Ignore
        </button>
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-slate-50 text-slate-500 hover:bg-slate-100 transition-colors ml-auto"
        >
          {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          Details
        </button>
        <a
          href={job.url} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors"
        >
          <ExternalLink size={12} />
          Apply
        </a>
      </div>
    </div>
  );
}
