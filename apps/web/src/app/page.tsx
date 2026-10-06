'use client';

import React, { useState, useEffect } from 'react';
import GhostMascot from '@/components/GhostMascot';
import {
  Briefcase,
  Wallet,
  ShoppingBag,
  Mail,
  ShieldCheck,
  Activity,
  Send,
  CheckCircle2,
  Sparkles,
  Clock,
  RefreshCw,
  X,
  FileText,
  Play,
  ArrowUpRight,
  Sliders,
  Check,
} from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'chief';
  text: string;
  plan?: {
    intent?: any;
    steps?: any[];
    summary?: string;
  };
  timestamp: string;
}

interface ApprovalItem {
  id: string;
  taskId: string;
  actionType: string;
  title: string;
  description: string;
  status: string;
  payload: any;
  createdAt: string;
}

interface AuditItem {
  id: string;
  taskId: string;
  agentId?: string;
  eventType: string;
  toolName?: string;
  rationale?: string;
  timestamp: string;
}

interface JobItem {
  id: string;
  title: string;
  company: string;
  location: string[];
  remote: boolean;
  minSalary?: number;
  maxSalary?: number;
  source: string;
  skills: string[];
  matchScore: number;
  matchBreakdown?: {
    overallScore: number;
    skillMatch: number;
    roleMatch: number;
    reasons: string[];
    concerns: string[];
  };
  recommendedResumeId?: string;
  lifecycleStatus: string;
}

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<'chat' | 'jobs' | 'approvals' | 'audit'>('chat');
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [approvals, setApprovals] = useState<ApprovalItem[]>([]);
  const [auditEvents, setAuditEvents] = useState<AuditItem[]>([]);
  const [jobs, setJobs] = useState<JobItem[]>([]);
  const [selectedResumeModal, setSelectedResumeModal] = useState<{
    jobTitle: string;
    company: string;
    content: string;
  } | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'init-1',
      sender: 'user',
      text: 'Every morning at 8:00 AM, find the 20 best backend & fullstack jobs for me.',
      timestamp: '08:00 AM',
    },
    {
      id: 'init-2',
      sender: 'chief',
      text: 'All set! I registered a recurring schedule (0 8 * * 1-5). The Job Specialist executed a dry-run and discovered top matches paired with your tailored resume.',
      plan: {
        steps: [
          { name: 'Schedule Engine', agentType: 'scheduler', description: 'Registered cron 0 8 * * 1-5 (Mon–Fri at 8:00 AM)' },
          { name: 'Job Connectors', agentType: 'job', description: 'Ingested roles from Greenhouse, Lever & Wellfound' },
          { name: 'Deduplication', agentType: 'job', description: 'Removed cross-posted duplicate listings' },
          { name: 'Resume Customization', agentType: 'job', description: 'Paired verified competencies with Fullstack-AWS-v3.md' },
        ],
      },
      timestamp: '08:00 AM',
    },
  ]);

  const fetchLiveData = async () => {
    try {
      const jobRes = await fetch('http://localhost:4000/api/jobs');
      if (jobRes.ok) {
        const data = await jobRes.json();
        setJobs(data);
      }
    } catch {}

    try {
      const appRes = await fetch('http://localhost:4000/api/approvals');
      if (appRes.ok) {
        const data = await appRes.json();
        setApprovals(data);
      }
    } catch {}

    try {
      const audRes = await fetch('http://localhost:4000/api/audit?limit=30');
      if (audRes.ok) {
        const data = await audRes.json();
        setAuditEvents(data);
      }
    } catch {}
  };

  useEffect(() => {
    fetchLiveData();
    const interval = setInterval(fetchLiveData, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleSendMessage = async (promptToSend?: string) => {
    const text = promptToSend || inputValue;
    if (!text.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!promptToSend) setInputValue('');
    setLoading(true);

    try {
      const res = await fetch('http://localhost:4000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: text }),
      });

      if (res.ok) {
        const data = await res.json();
        const chiefMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          sender: 'chief',
          text: data.summary,
          plan: {
            intent: data.intent,
            steps: data.steps,
          },
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, chiefMsg]);
        fetchLiveData();
      }
    } catch {
      const fallbackMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'chief',
        text: `Got it! Chief Ghost delegated "${text}" across specialist agents.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleDecideApproval = async (id: string, decision: 'approve' | 'reject') => {
    try {
      await fetch(`http://localhost:4000/api/approvals/${id}/decide`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision }),
      });
      fetchLiveData();
    } catch (err) {
      console.error(err);
    }
  };

  const handlePreviewResume = async (job: JobItem) => {
    try {
      const res = await fetch(`http://localhost:4000/api/jobs/${job.id}/resume`);
      if (res.ok) {
        const data = await res.json();
        setSelectedResumeModal({
          jobTitle: job.title,
          company: job.company,
          content: data.tailoredMarkdown,
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleTriggerDiscovery = async () => {
    setLoading(true);
    try {
      await fetch('http://localhost:4000/api/jobs/discover', { method: 'POST' });
      await fetchLiveData();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-slate-100 font-manrope">
      {/* Sidebar Navigation */}
      <aside className="w-64 border-r-2 border-border bg-surface flex flex-col justify-between p-4 shrink-0">
        <div>
          {/* Playful Ghost Brand Header */}
          <div className="flex items-center gap-3 px-2 py-3 mb-6 bg-card rounded-2xl border-2 border-border">
            <GhostMascot size="sm" mood={loading ? 'thinking' : 'happy'} />
            <div>
              <h1 className="font-sora font-extrabold text-sm tracking-tight text-white flex items-center gap-1.5">
                Personal OS
                <span className="w-2 h-2 rounded-full bg-brand-teal inline-block" />
              </h1>
              <p className="text-[11px] font-poppins text-brand-tealLight font-medium">Chief Ghost Online</p>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="space-y-1.5">
            <button
              onClick={() => setActiveTab('chat')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-poppins font-medium transition-all ${
                activeTab === 'chat'
                  ? 'bg-brand-teal text-white border-2 border-brand-teal font-semibold'
                  : 'text-slate-300 hover:text-white hover:bg-surfaceHover'
              }`}
            >
              <GhostMascot size="sm" className="scale-75 -my-2 -ml-1" />
              <span>AI Chief</span>
            </button>

            <button
              onClick={() => setActiveTab('jobs')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-poppins font-medium transition-all ${
                activeTab === 'jobs'
                  ? 'bg-brand-blue text-white border-2 border-brand-blue font-semibold'
                  : 'text-slate-300 hover:text-white hover:bg-surfaceHover'
              }`}
            >
              <Briefcase className="w-4 h-4 text-brand-blueLight" />
              <span>Jobs & Careers</span>
              <span className="ml-auto text-[10px] bg-brand-blueLight/20 text-brand-blueLight px-2 py-0.5 rounded-full font-bold">
                M1
              </span>
            </button>

            <button
              onClick={() => setActiveTab('approvals')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-poppins font-medium transition-all ${
                activeTab === 'approvals'
                  ? 'bg-brand-amber text-slate-900 border-2 border-brand-amber font-semibold'
                  : 'text-slate-300 hover:text-white hover:bg-surfaceHover'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-brand-amber" />
              <span>Safety Gate</span>
              {approvals.filter((a) => a.status === 'pending').length > 0 && (
                <span className="ml-auto text-[10px] bg-brand-amber text-slate-950 px-2 py-0.5 rounded-full font-bold">
                  {approvals.filter((a) => a.status === 'pending').length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('audit')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-poppins font-medium transition-all ${
                activeTab === 'audit'
                  ? 'bg-brand-lime text-slate-950 border-2 border-brand-lime font-semibold'
                  : 'text-slate-300 hover:text-white hover:bg-surfaceHover'
              }`}
            >
              <Activity className="w-4 h-4 text-brand-lime" />
              <span>Audit Ledger</span>
            </button>

            <div className="pt-5 pb-2 px-3 text-[11px] font-sora font-bold tracking-wider text-slate-400 uppercase">
              Specialist Squad
            </div>

            <div
              onClick={() => handleSendMessage('Analyze my current month financial budget and spending.')}
              className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-poppins font-medium text-slate-300 hover:bg-surfaceHover hover:text-white cursor-pointer transition-colors"
            >
              <div className="w-6 h-6 rounded-lg bg-emerald-950/80 border border-emerald-500/40 flex items-center justify-center">
                <Wallet className="w-3.5 h-3.5 text-brand-tealLight" />
              </div>
              <span>Finance Specialist</span>
              <span className="ml-auto text-[10px] text-slate-400">Read-only</span>
            </div>

            <div
              onClick={() => handleSendMessage('Search and compare alternatives for Sony WH-1000XM5 headphones.')}
              className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-poppins font-medium text-slate-300 hover:bg-surfaceHover hover:text-white cursor-pointer transition-colors"
            >
              <div className="w-6 h-6 rounded-lg bg-rose-950/80 border border-rose-500/40 flex items-center justify-center">
                <ShoppingBag className="w-3.5 h-3.5 text-brand-coral" />
              </div>
              <span>Shopping Specialist</span>
            </div>

            <div
              onClick={() => handleSendMessage('Check for important unread communications and summarize.')}
              className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-poppins font-medium text-slate-300 hover:bg-surfaceHover hover:text-white cursor-pointer transition-colors"
            >
              <div className="w-6 h-6 rounded-lg bg-sky-950/80 border border-sky-500/40 flex items-center justify-center">
                <Mail className="w-3.5 h-3.5 text-brand-blueLight" />
              </div>
              <span>Communication Specialist</span>
            </div>
          </nav>
        </div>

        {/* Playful Mascot Status Card */}
        <div className="p-3.5 rounded-2xl bg-card border-2 border-border text-xs flex items-center gap-3">
          <GhostMascot size="sm" mood={loading ? 'thinking' : 'happy'} />
          <div className="space-y-0.5">
            <div className="font-sora font-bold text-white text-[12px]">Agent Sentinel</div>
            <div className="text-[11px] text-slate-400 font-manrope">Zero unapproved actions</div>
          </div>
        </div>
      </aside>

      {/* Main Experience Viewport */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top Header */}
        <header className="h-16 border-b-2 border-border bg-surface px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="font-sora font-extrabold text-base text-white">Chief Command Center</h2>
            <span className="text-[11px] font-poppins font-semibold px-2.5 py-0.5 rounded-full bg-brand-teal/20 text-brand-tealLight border border-brand-teal/40">
              Autonomous Team Ready
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs font-poppins">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-card border border-border text-slate-300">
              <span className="w-2 h-2 rounded-full bg-brand-lime" />
              <span>BullMQ Scheduler</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-card border border-border text-slate-300">
              <span className="w-2 h-2 rounded-full bg-brand-blue" />
              <span>Tool Gateway</span>
            </div>
          </div>
        </header>

        {/* View 1: AI Chief Conversation */}
        {activeTab === 'chat' && (
          <div className="flex-1 flex flex-col overflow-hidden p-6 max-w-4xl mx-auto w-full gap-5">
            <div className="flex-1 overflow-y-auto space-y-4 pr-2">
              {messages.map((msg) => (
                <div key={msg.id}>
                  {msg.sender === 'user' ? (
                    <div className="flex justify-end">
                      <div className="max-w-xl bg-surfaceHover border-2 border-border text-white rounded-2xl rounded-tr-xs px-4 py-3 text-sm font-manrope shadow-xs">
                        {msg.text}
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-3 max-w-2xl">
                      <div className="shrink-0 pt-1">
                        <GhostMascot size="sm" mood={loading ? 'thinking' : 'happy'} />
                      </div>
                      <div className="space-y-2.5 flex-1">
                        <div className="playful-card p-4 space-y-3">
                          <div className="flex items-center justify-between border-b border-border pb-2">
                            <span className="font-sora font-bold text-xs text-brand-tealLight uppercase tracking-wider flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5" />
                              Chief Ghost
                            </span>
                            <span className="text-[10px] font-poppins text-slate-400">{msg.timestamp}</span>
                          </div>

                          <p className="text-slate-200 text-sm leading-relaxed">{msg.text}</p>

                          {msg.plan && msg.plan.steps && (
                            <div className="rounded-xl bg-card border border-border p-3 space-y-2 mt-2">
                              <div className="text-[11px] font-sora font-bold text-brand-amber uppercase tracking-wider">
                                Delegated Execution Pipeline
                              </div>
                              {msg.plan.steps.map((st: any, idx: number) => (
                                <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-300">
                                  <div className="w-4 h-4 rounded-full bg-brand-teal/20 text-brand-tealLight flex items-center justify-center shrink-0 mt-0.5">
                                    <Check className="w-3 h-3" />
                                  </div>
                                  <div>
                                    <strong className="font-poppins text-white">{st.name || st.action}:</strong>{' '}
                                    <span className="text-slate-300 font-manrope">{st.description}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {loading && (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-card border-2 border-border text-xs font-poppins text-brand-amber">
                  <GhostMascot size="sm" mood="thinking" />
                  <span>Chief Ghost is consulting policy engine &amp; specialists...</span>
                </div>
              )}
            </div>

            {/* Chat Input Bar */}
            <div className="pt-2">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="flex items-center gap-2 p-2 rounded-2xl bg-surface border-2 border-border focus-within:border-brand-teal transition-colors"
              >
                <div className="pl-2">
                  <GhostMascot size="sm" mood={loading ? 'thinking' : 'happy'} />
                </div>
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Tell Chief Ghost what to do (e.g. 'Find me jobs', 'Should I buy this laptop?')..."
                  className="w-full bg-transparent border-0 px-3 py-2 text-sm font-manrope text-white placeholder-slate-400 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2.5 rounded-xl bg-brand-teal hover:bg-brand-tealLight text-white font-poppins font-bold text-xs playful-button shrink-0 flex items-center gap-1.5 disabled:opacity-50"
                >
                  <span>Dispatch</span>
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>

              {/* Quick Prompt Pills */}
              <div className="flex items-center gap-2 mt-2.5 px-1 text-xs overflow-x-auto pb-1">
                <span className="text-[11px] font-poppins font-semibold text-slate-400">Try asking:</span>
                <button
                  onClick={() => handleSendMessage('Should I buy a ₹90,000 MacBook Air M2 based on my recent finances?')}
                  className="px-3 py-1 rounded-xl bg-card hover:bg-surfaceHover text-slate-200 text-[11px] font-poppins font-medium border border-border whitespace-nowrap transition-colors"
                >
                  Shopping + Finance: &quot;Should I buy this?&quot;
                </button>
                <button
                  onClick={() => handleSendMessage('Every morning at 8:00 AM, find the 20 best backend & fullstack jobs for me.')}
                  className="px-3 py-1 rounded-xl bg-card hover:bg-surfaceHover text-slate-200 text-[11px] font-poppins font-medium border border-border whitespace-nowrap transition-colors"
                >
                  Job Specialist: &quot;Daily job search at 8 AM&quot;
                </button>
              </div>
            </div>
          </div>
        )}

        {/* View 2: Jobs Feed */}
        {activeTab === 'jobs' && (
          <div className="flex-1 overflow-y-auto p-6 max-w-4xl mx-auto w-full space-y-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h2 className="font-sora font-extrabold text-lg text-white">Daily Job Intelligence Feed</h2>
                <p className="text-xs text-slate-400 font-manrope">
                  Deduplicated from Greenhouse, Lever &amp; Wellfound • Ranked by Career Algorithm
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleTriggerDiscovery}
                  disabled={loading}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-brand-blue hover:bg-brand-blueLight text-white text-xs font-poppins font-bold playful-button transition-colors"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Run Pipeline</span>
                </button>
                <button
                  onClick={fetchLiveData}
                  className="p-2 rounded-xl bg-card border border-border text-slate-300 hover:text-white"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {jobs.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-sm playful-card flex flex-col items-center gap-3">
                <GhostMascot size="lg" mood="alert" />
                <p>No jobs discovered yet. Click &quot;Run Pipeline&quot; to fetch postings.</p>
              </div>
            ) : (
              jobs.map((job) => (
                <div key={job.id} className="playful-card p-5 space-y-3.5">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2.5">
                        <h3 className="font-sora font-bold text-white text-base">{job.title}</h3>
                        <span className={`text-xs px-2.5 py-0.5 rounded-full font-poppins font-bold ${
                          job.matchScore >= 90
                            ? 'bg-brand-teal text-white'
                            : 'bg-brand-blue text-white'
                        }`}>
                          {job.matchScore}% Match
                        </span>
                      </div>
                      <p className="text-xs font-manrope text-slate-300 mt-1">
                        <strong className="text-white">{job.company}</strong> • {job.location.join(', ')}{' '}
                        {job.remote ? '(Remote)' : ''} •{' '}
                        {job.minSalary ? `₹${(job.minSalary / 100000).toFixed(0)}–${(job.maxSalary! / 100000).toFixed(0)} LPA` : 'Competitive'} • Source: {job.source}
                      </p>
                    </div>

                    <div className="text-xs text-slate-400 font-poppins flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-brand-amber" />
                      <span>Live match</span>
                    </div>
                  </div>

                  {job.matchBreakdown && (
                    <div className="text-xs bg-card p-3.5 rounded-xl border border-border space-y-2">
                      <p className="font-sora font-bold text-brand-tealLight">Why this aligns:</p>
                      <ul className="list-disc list-inside space-y-1 text-slate-200 font-manrope">
                        {job.matchBreakdown.reasons.map((r, i) => (
                          <li key={i}>{r}</li>
                        ))}
                      </ul>

                      {job.matchBreakdown.concerns.length > 0 && (
                        <div className="pt-1.5 border-t border-border">
                          <p className="font-sora font-bold text-brand-amber">Considerations:</p>
                          <ul className="list-disc list-inside space-y-1 text-slate-300 font-manrope">
                            {job.matchBreakdown.concerns.map((c, i) => (
                              <li key={i}>{c}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-2 text-xs font-poppins text-slate-300">
                      <span>Tailored resume:</span>
                      <strong className="text-white bg-card px-2.5 py-1 rounded-lg border border-border font-mono">
                        {job.recommendedResumeId || 'Fullstack-AWS-v3.md'}
                      </strong>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handlePreviewResume(job)}
                        className="px-3 py-1.5 text-xs font-poppins font-medium rounded-xl bg-card hover:bg-surfaceHover text-slate-200 border border-border flex items-center gap-1.5 transition-colors"
                      >
                        <FileText className="w-3.5 h-3.5 text-brand-blueLight" />
                        <span>Inspect Resume</span>
                      </button>
                      <button
                        onClick={async () => {
                          await fetch('http://localhost:4000/api/chat', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ prompt: `Apply for ${job.title} at ${job.company}` }),
                          });
                          setActiveTab('approvals');
                        }}
                        className="px-3.5 py-1.5 text-xs font-poppins font-bold rounded-xl bg-brand-blue hover:bg-brand-blueLight text-white playful-button"
                      >
                        Prepare Application
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* View 3: Safety Approvals Gate */}
        {activeTab === 'approvals' && (
          <div className="flex-1 overflow-y-auto p-6 max-w-4xl mx-auto w-full space-y-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="font-sora font-extrabold text-lg text-white">Universal Safety Gate</h2>
                <p className="text-xs text-slate-400 font-manrope">
                  Principle 2.4: Human Control. High-risk agent actions stay blocked until approved.
                </p>
              </div>
              <button
                onClick={fetchLiveData}
                className="p-2 rounded-xl bg-card border border-border text-slate-300 hover:text-white"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {approvals.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-sm playful-card flex flex-col items-center gap-3">
                <GhostMascot size="lg" mood="happy" />
                <p>No actions pending approval. Ghost agents are operating within autonomous safety limits.</p>
              </div>
            ) : (
              approvals.map((app) => (
                <div
                  key={app.id}
                  className={`playful-card p-5 border-2 space-y-3.5 ${
                    app.status === 'pending'
                      ? 'border-brand-amber bg-card'
                      : app.status === 'approved'
                      ? 'border-brand-teal bg-card'
                      : 'border-brand-coral bg-card'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-poppins font-bold px-2.5 py-0.5 rounded-full ${
                        app.status === 'pending'
                          ? 'bg-brand-amber text-slate-950'
                          : app.status === 'approved'
                          ? 'bg-brand-teal text-white'
                          : 'bg-brand-coral text-white'
                      }`}
                    >
                      {app.status.toUpperCase()}
                    </span>
                    <span className="text-xs font-mono text-slate-400">{app.actionType}</span>
                  </div>

                  <h3 className="font-sora font-bold text-white text-base">{app.title}</h3>
                  <p className="text-xs text-slate-300 font-manrope leading-relaxed">{app.description}</p>

                  {app.status === 'pending' && (
                    <div className="flex gap-2.5 pt-2">
                      <button
                        onClick={() => handleDecideApproval(app.id, 'approve')}
                        className="px-4 py-2 text-xs font-poppins font-bold rounded-xl bg-brand-teal hover:bg-brand-tealLight text-white playful-button"
                      >
                        Approve &amp; Execute
                      </button>
                      <button
                        onClick={() => handleDecideApproval(app.id, 'reject')}
                        className="px-4 py-2 text-xs font-poppins font-semibold rounded-xl bg-card hover:bg-surfaceHover text-brand-coral border-2 border-brand-coral/40"
                      >
                        Reject Action
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* View 4: Audit Ledger */}
        {activeTab === 'audit' && (
          <div className="flex-1 overflow-y-auto p-6 max-w-4xl mx-auto w-full space-y-3">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="font-sora font-extrabold text-lg text-white">Immutable Event Ledger</h2>
                <p className="text-xs text-slate-400 font-manrope">
                  Principle 2.3: Every meaningful agent step, decision, and tool invocation is recorded.
                </p>
              </div>
              <button
                onClick={fetchLiveData}
                className="p-2 rounded-xl bg-card border border-border text-slate-300 hover:text-white"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {auditEvents.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm playful-card">
                No events in ledger yet.
              </div>
            ) : (
              auditEvents.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3.5 rounded-xl bg-card border border-border text-xs">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-slate-400 text-[11px]">
                      {new Date(item.timestamp).toLocaleTimeString()}
                    </span>
                    <span className="font-poppins font-bold text-brand-tealLight">
                      [{item.agentId || item.toolName || 'Chief'}]
                    </span>
                    <span className="text-slate-200 font-manrope">{item.rationale || `Executed ${item.eventType}`}</span>
                  </div>
                  <span className="font-poppins font-semibold text-[10px] bg-surface text-slate-300 border border-border px-2 py-0.5 rounded-full">
                    {item.eventType}
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </main>

      {/* Tailored Resume Modal */}
      {selectedResumeModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="playful-card bg-surface border-2 border-border rounded-2xl max-w-2xl w-full max-h-[80vh] flex flex-col shadow-2xl">
            <div className="p-4 border-b-2 border-border flex items-center justify-between">
              <div>
                <h3 className="font-sora font-bold text-white text-sm">Tailored Non-Fabricating Resume</h3>
                <p className="text-xs font-manrope text-slate-400">
                  Target: {selectedResumeModal.jobTitle} at {selectedResumeModal.company}
                </p>
              </div>
              <button
                onClick={() => setSelectedResumeModal(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-card"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto font-mono text-xs text-slate-200 leading-relaxed whitespace-pre-wrap bg-card">
              {selectedResumeModal.content}
            </div>
            <div className="p-4 border-t-2 border-border flex justify-end">
              <button
                onClick={() => setSelectedResumeModal(null)}
                className="px-4 py-2 text-xs font-poppins font-bold rounded-xl bg-card hover:bg-surfaceHover text-white border border-border"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
