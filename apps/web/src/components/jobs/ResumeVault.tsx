'use client';

import React, { useState } from 'react';
import { FileText, Star, Trash2, Plus, X } from 'lucide-react';
import type { ResumeProfile } from '@/lib/types';
import { jobs as jobsApi } from '@/lib/api';

interface ResumeVaultProps {
  resumes: ResumeProfile[];
  onRefresh: () => void;
  onNavigateConnectors?: () => void;
}

export default function ResumeVault({ resumes, onRefresh, onNavigateConnectors }: ResumeVaultProps) {
  const [showAdd, setShowAdd] = useState(false);
  const [title, setTitle] = useState('');
  const [targetRole, setTargetRole] = useState('');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const handleAdd = async () => {
    if (!title.trim() || !content.trim()) return;
    setSaving(true);
    try {
      await jobsApi.addResume({
        title: title.trim(),
        fileName: title.trim().replace(/\s+/g, '-') + '.md',
        targetRole: targetRole.trim() || 'Software Engineer',
        tags: [],
        contentMarkdown: content.trim(),
        isDefault: resumes.length === 0,
      });
      setTitle(''); setTargetRole(''); setContent('');
      setShowAdd(false);
      onRefresh();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      await jobsApi.deleteResume(id);
      onRefresh();
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-800">Resume Vault</h3>
        <button
          onClick={() => setShowAdd((v) => !v)}
          className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors"
        >
          {showAdd ? <X size={12} /> : <Plus size={12} />}
          {showAdd ? 'Cancel' : 'Add Resume'}
        </button>
      </div>

      {showAdd && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
          <input
            placeholder="Resume title (e.g. Fullstack-AWS-v3)"
            value={title} onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
          <input
            placeholder="Target role (e.g. Full Stack Engineer)"
            value={targetRole} onChange={(e) => setTargetRole(e.target.value)}
            className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
          <textarea
            placeholder="Paste your resume in Markdown format…"
            value={content} onChange={(e) => setContent(e.target.value)}
            rows={5}
            className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none font-mono"
          />
          <button
            onClick={handleAdd} disabled={saving || !title.trim() || !content.trim()}
            className="w-full py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving…' : 'Save Resume'}
          </button>
        </div>
      )}

      {resumes.length === 0 && !showAdd && (
        <div className="text-center py-10 px-4 border border-dashed border-slate-200 rounded-2xl bg-white space-y-2">
          <FileText size={26} className="text-slate-300 mx-auto mb-1" />
          <h4 className="text-xs font-semibold text-slate-700">No resumes in vault yet</h4>
          <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
            Add your markdown resume manually above, sync your repositories via GitHub connector, or connect Google Workspace to scan Drive documents.
          </p>
          {onNavigateConnectors && (
            <button
              onClick={onNavigateConnectors}
              className="text-xs text-indigo-600 font-medium hover:underline pt-1 inline-block"
            >
              Configure Connectors →
            </button>
          )}
        </div>
      )}

      {resumes.map((r) => (
        <div key={r.id} className="flex items-start gap-3 p-3 bg-white border border-slate-200 rounded-xl">
          <FileText size={16} className="text-indigo-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-800 truncate">{r.title}</span>
              {r.isDefault && (
                <span className="flex items-center gap-0.5 text-[9px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">
                  <Star size={8} /> Default
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-500 mt-0.5">{r.targetRole}</p>
            <div className="flex flex-wrap gap-1 mt-1">
              {r.tags.slice(0, 4).map((t) => (
                <span key={t} className="text-[9px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500">{t}</span>
              ))}
            </div>
          </div>
          <button
            onClick={() => handleDelete(r.id)}
            disabled={deleting === r.id}
            className="p-1.5 rounded-lg text-slate-300 hover:text-red-400 hover:bg-red-50 transition-colors flex-shrink-0"
          >
            <Trash2 size={12} />
          </button>
        </div>
      ))}
    </div>
  );
}
