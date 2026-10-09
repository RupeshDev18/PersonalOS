'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Download,
  Sparkles,
  FileText,
  Mail,
  Copy,
  Check,
  Loader2,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import { jobs as jobsApi } from '@/lib/api';
import type { Job } from '@/lib/types';

interface TailoredApplicationModalProps {
  job: Job;
  isOpen: boolean;
  onClose: () => void;
}

export default function TailoredApplicationModal({
  job,
  isOpen,
  onClose,
}: TailoredApplicationModalProps) {
  const [activeTab, setActiveTab] = useState<'resume' | 'cover_letter'>('resume');
  const [loadingResume, setLoadingResume] = useState(false);
  const [downloadingResume, setDownloadingResume] = useState(false);
  const [tailoredResume, setTailoredResume] = useState<{
    baseResumeTitle: string;
    tailoredMarkdown: string;
    emphasizedSkills: string[];
    outreachPitch?: string;
    isLLMTailored?: boolean;
  } | null>(null);

  const [loadingCoverLetter, setLoadingCoverLetter] = useState(false);
  const [downloadingCoverLetter, setDownloadingCoverLetter] = useState(false);
  const [coverLetter, setCoverLetter] = useState<string | null>(null);
  const [isLLMCoverLetter, setIsLLMCoverLetter] = useState(false);

  const [copiedPitch, setCopiedPitch] = useState(false);
  const [copiedLetter, setCopiedLetter] = useState(false);

  // Fetch tailored resume on open
  useEffect(() => {
    if (!isOpen) return;

    let mounted = true;
    setLoadingResume(true);
    jobsApi
      .tailorResume(job.id)
      .then((res) => {
        if (mounted) setTailoredResume(res);
      })
      .catch((err) => {
        console.error('Failed to tailor resume:', err);
      })
      .finally(() => {
        if (mounted) setLoadingResume(false);
      });

    return () => {
      mounted = false;
    };
  }, [isOpen, job.id]);

  // Generate cover letter on tab click or demand
  const handleLoadCoverLetter = async () => {
    if (coverLetter) return;
    setLoadingCoverLetter(true);
    try {
      const res = await jobsApi.generateCoverLetter(job.id);
      setCoverLetter(res.coverLetter);
      setIsLLMCoverLetter(res.isLLMGenerated);
    } catch (err) {
      console.error('Failed to generate cover letter:', err);
    } finally {
      setLoadingCoverLetter(false);
    }
  };

  const handleDownloadResume = async () => {
    setDownloadingResume(true);
    try {
      const safeName = `Rupesh_Yadav_${job.company.replace(/\s+/g, '_')}_Resume.pdf`;
      await jobsApi.downloadResumePdf(job.id, safeName);
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setDownloadingResume(false);
    }
  };

  const handleDownloadCoverLetter = async () => {
    setDownloadingCoverLetter(true);
    try {
      const safeName = `Rupesh_Yadav_${job.company.replace(/\s+/g, '_')}_Cover_Letter.pdf`;
      await jobsApi.downloadCoverLetterPdf(job.id, safeName);
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setDownloadingCoverLetter(false);
    }
  };

  const handleCopyPitch = () => {
    if (!tailoredResume?.outreachPitch) return;
    navigator.clipboard.writeText(tailoredResume.outreachPitch);
    setCopiedPitch(true);
    setTimeout(() => setCopiedPitch(false), 2000);
  };

  const handleCopyLetter = () => {
    if (!coverLetter) return;
    navigator.clipboard.writeText(coverLetter);
    setCopiedLetter(true);
    setTimeout(() => setCopiedLetter(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/80 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">{job.title}</h2>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700">
                {job.company}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              ATS-Optimized Application Package & High-Conversion Compiler
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center justify-between px-6 py-2.5 bg-white border-b border-slate-100">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('resume')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === 'resume'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <FileText size={13} />
              ATS Resume
            </button>
            <button
              onClick={() => {
                setActiveTab('cover_letter');
                handleLoadCoverLetter();
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === 'cover_letter'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Mail size={13} />
              Tailored Cover Letter
            </button>
          </div>

          <div className="flex items-center gap-2">
            {activeTab === 'resume' ? (
              <button
                onClick={handleDownloadResume}
                disabled={downloadingResume || loadingResume}
                className="flex items-center gap-1.5 text-xs font-medium px-3.5 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60 transition-all shadow-sm"
              >
                {downloadingResume ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <Download size={13} />
                )}
                Download ATS PDF
              </button>
            ) : (
              <button
                onClick={handleDownloadCoverLetter}
                disabled={downloadingCoverLetter || loadingCoverLetter}
                className="flex items-center gap-1.5 text-xs font-medium px-3.5 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60 transition-all shadow-sm"
              >
                {downloadingCoverLetter ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <Download size={13} />
                )}
                Download Letter PDF
              </button>
            )}
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 text-slate-800">
          {activeTab === 'resume' ? (
            loadingResume ? (
              <div className="flex flex-col items-center justify-center py-20 space-y-2">
                <Loader2 size={24} className="text-indigo-600 animate-spin" />
                <p className="text-xs text-slate-500 font-medium">
                  Synthesizing ATS-aligned resume with Gemini...
                </p>
              </div>
            ) : (
              <>
                {/* AI Badge & Stack Alignment */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-2">
                    <Sparkles size={15} className="text-indigo-600" />
                    <span className="text-xs font-medium text-slate-700">
                      {tailoredResume?.isLLMTailored
                        ? 'Synthesized with Gemini 2.5 Flash'
                        : 'Rule-based Precision Matcher'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-emerald-600 font-medium">
                    <ShieldCheck size={13} />
                    Zero Fabricated Experience
                  </div>
                </div>

                {/* Recruiter Outreach Hook */}
                {tailoredResume?.outreachPitch && (
                  <div className="p-3.5 rounded-xl bg-indigo-50/60 border border-indigo-100/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-indigo-900 tracking-wide uppercase">
                        Recruiter Outreach DM Pitch
                      </span>
                      <button
                        onClick={handleCopyPitch}
                        className="flex items-center gap-1 text-[11px] font-medium text-indigo-700 hover:text-indigo-900"
                      >
                        {copiedPitch ? <Check size={12} /> : <Copy size={12} />}
                        {copiedPitch ? 'Copied' : 'Copy Pitch'}
                      </button>
                    </div>
                    <p className="text-xs text-indigo-950 font-mono leading-relaxed">
                      &quot;{tailoredResume.outreachPitch}&quot;
                    </p>
                  </div>
                )}

                {/* Markdown Preview */}
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 font-mono text-xs text-slate-700 whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto">
                  {tailoredResume?.tailoredMarkdown}
                </div>
              </>
            )
          ) : (
            // Cover Letter Tab
            loadingCoverLetter ? (
              <div className="flex flex-col items-center justify-center py-20 space-y-2">
                <Loader2 size={24} className="text-indigo-600 animate-spin" />
                <p className="text-xs text-slate-500 font-medium">
                  Composing high-converting cover letter tailored for {job.company}...
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-2">
                    <Sparkles size={15} className="text-indigo-600" />
                    <span className="text-xs font-medium text-slate-700">
                      {isLLMCoverLetter ? 'Synthesized with Gemini 2.5 Flash' : 'High-Impact Direct Template'}
                    </span>
                  </div>
                  <button
                    onClick={handleCopyLetter}
                    className="flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900"
                  >
                    {copiedLetter ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                    {copiedLetter ? 'Copied to Clipboard' : 'Copy Text'}
                  </button>
                </div>

                <div className="p-5 rounded-xl border border-slate-200 bg-white font-serif text-sm text-slate-800 whitespace-pre-wrap leading-relaxed shadow-sm max-h-96 overflow-y-auto">
                  {coverLetter}
                </div>
              </div>
            )
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-slate-100 bg-slate-50/50">
          <span className="text-[11px] text-slate-400">
            Compliant with Workday, Greenhouse, Lever, and Taleo ATS parsers.
          </span>
          <div className="flex items-center gap-2">
            <a
              href={job.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-medium transition-colors"
            >
              Open Application Page <ExternalLink size={12} />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
