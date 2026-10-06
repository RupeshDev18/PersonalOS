'use client';

import React, { useState, useEffect } from 'react';
import GhostMascot from '@/components/GhostMascot';
import {
  Briefcase,
  Wallet,
  ShoppingBag,
  ShieldCheck,
  Activity,
  Send,
  Sparkles,
  Clock,
  RefreshCw,
  X,
  FileText,
  Check,
  ExternalLink,
  DollarSign,
  AlertCircle,
  Cpu,
  ChevronDown,
  ChevronUp,
  Key,
  Globe,
  Layers,
} from 'lucide-react';

interface OrchestrationStepTrace {
  id: string;
  stepNumber: number;
  phase: string;
  agent: string;
  name: string;
  description: string;
  status: string;
  durationMs: number;
  timestamp: string;
  details?: any;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'chief';
  text: string;
  plan?: {
    intent?: any;
    steps?: any[];
    summary?: string;
  };
  orchestrationTrace?: OrchestrationStepTrace[];
  timestamp: string;
}

interface ConnectorItem {
  id: string;
  name: string;
  type: string;
  status: string;
  isLive: boolean;
  description: string;
  rateLimit: string;
  lastSync: string | null;
  details: any;
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
  const [activeTab, setActiveTab] = useState<'chat' | 'jobs' | 'finance' | 'shopping' | 'approvals' | 'audit' | 'connectors'>('chat');
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [approvals, setApprovals] = useState<ApprovalItem[]>([]);
  const [auditEvents, setAuditEvents] = useState<AuditItem[]>([]);
  const [jobs, setJobs] = useState<JobItem[]>([]);
  const [connectors, setConnectors] = useState<ConnectorItem[]>([]);
  const [financeOverview, setFinanceOverview] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [affordabilitySimPrice, setAffordabilitySimPrice] = useState(89990);
  const [affordabilityResult, setAffordabilityResult] = useState<any>(null);
  const [shoppingQuery, setShoppingQuery] = useState('MacBook Air M2');
  const [shoppingResult, setShoppingResult] = useState<any>(null);

  // Orchestration & Connectors UI State
  const [expandedTrace, setExpandedTrace] = useState<Record<string, boolean>>({});
  const [geminiKeyInput, setGeminiKeyInput] = useState('');
  const [geminiTestStatus, setGeminiTestStatus] = useState<{ success: boolean; message: string } | null>(null);
  const [geminiSaving, setGeminiSaving] = useState(false);
  const [greenhouseSyncing, setGreenhouseSyncing] = useState(false);
  const [greenhouseSyncResult, setGreenhouseSyncResult] = useState<any>(null);

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
      text: 'All set! I registered a recurring schedule (0 8 * * 1-5). The Job Specialist pipeline executed a trial run and verified live job opportunities tailored to your profile.',
      orchestrationTrace: [
        {
          id: 'trace-init-1',
          stepNumber: 1,
          phase: 'intent_parsing',
          agent: 'Chief Agent (Coordinator)',
          name: 'Deconstruct User Intent & Schedule',
          description: 'Parsed recurring schedule 0 8 * * 1-5 (Mon–Fri at 8:00 AM) targeting Job Specialist domain.',
          status: 'completed',
          durationMs: 42,
          timestamp: '08:00 AM',
          details: {
            engine: 'Google Gemini 1.5 Flash',
            taskType: 'recurring',
            scheduleExpression: '0 8 * * 1-5',
            primaryAgent: 'job',
            requiredAgents: ['job'],
          },
        },
        {
          id: 'trace-init-2',
          stepNumber: 2,
          phase: 'policy_check',
          agent: 'Policy Engine (Gateway)',
          name: 'Least-Privilege Capability Verification',
          description: 'Authorized jobs.search capability under read-only boundary. Funds movement strictly forbidden.',
          status: 'policy_verified',
          durationMs: 2,
          timestamp: '08:00 AM',
          details: {
            enforcedPolicies: [
              'jobs.search -> ALLOWED (Read-only)',
              'finance.transfer -> FORBIDDEN (No funds movement without manual approval)',
            ],
          },
        },
        {
          id: 'trace-init-3',
          stepNumber: 3,
          phase: 'connector_fetch',
          agent: 'JOB Specialist',
          name: 'Query Live Greenhouse Career ATS',
          description: 'Scraped live public job boards across Stripe, Figma, Cloudflare, GitHub.',
          status: 'completed',
          durationMs: 3063,
          timestamp: '08:00 AM',
          details: {
            sourceCount: 4,
            sources: ['Greenhouse (Stripe, Figma, Cloudflare, GitHub)'],
            rawJobsDiscovered: 12,
            deduplicatedJobs: 4,
          },
        },
        {
          id: 'trace-init-4',
          stepNumber: 4,
          phase: 'specialist_processing',
          agent: 'JOB Specialist',
          name: 'Deduplication & Skill Matching Engine',
          description: 'Filtered cross-board duplicates and scored 95% relevance match against career profile.',
          status: 'completed',
          durationMs: 18,
          timestamp: '08:00 AM',
          details: {
            topRole: 'Senior Full Stack Developer at Stripe',
            matchScore: 95,
            pairedResume: 'Fullstack-AWS-v3.md',
          },
        },
        {
          id: 'trace-init-5',
          stepNumber: 5,
          phase: 'synthesis',
          agent: 'Chief Agent (Synthesizer)',
          name: 'Synthesize Cross-Agent Verdict',
          description: 'Generated natural language status and schedule confirmation.',
          status: 'completed',
          durationMs: 35,
          timestamp: '08:00 AM',
        },
        {
          id: 'trace-init-6',
          stepNumber: 6,
          phase: 'audit_seal',
          agent: 'Audit Service',
          name: 'Cryptographic Audit Trail Sealed',
          description: 'Event logged with SHA-256 tamper-evident hash.',
          status: 'completed',
          durationMs: 3,
          timestamp: '08:00 AM',
        },
      ],
      timestamp: '08:00 AM',
    },
  ]);

  const fetchLiveData = async () => {
    try {
      const jobRes = await fetch('http://localhost:4000/api/jobs');
      if (jobRes.ok) setJobs(await jobRes.json());
    } catch {}

    try {
      const connRes = await fetch('http://localhost:4000/api/connectors');
      if (connRes.ok) setConnectors(await connRes.json());
    } catch {}

    try {
      const appRes = await fetch('http://localhost:4000/api/approvals');
      if (appRes.ok) setApprovals(await appRes.json());
    } catch {}

    try {
      const audRes = await fetch('http://localhost:4000/api/audit?limit=30');
      if (audRes.ok) setAuditEvents(await audRes.json());
    } catch {}

    try {
      const finRes = await fetch('http://localhost:4000/api/finance/overview');
      if (finRes.ok) setFinanceOverview(await finRes.json());
      const txRes = await fetch('http://localhost:4000/api/finance/transactions');
      if (txRes.ok) setTransactions(await txRes.json());
    } catch {}

    try {
      const shopRes = await fetch(`http://localhost:4000/api/shopping/compare?query=${encodeURIComponent(shoppingQuery)}`);
      if (shopRes.ok) setShoppingResult(await shopRes.json());
    } catch {}
  };

  useEffect(() => {
    fetchLiveData();
    const interval = setInterval(fetchLiveData, 4000);
    return () => clearInterval(interval);
  }, []);

  const runAffordabilityCheck = async (price: number) => {
    try {
      const res = await fetch('http://localhost:4000/api/finance/affordability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ price }),
      });
      if (res.ok) setAffordabilityResult(await res.json());
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    runAffordabilityCheck(affordabilitySimPrice);
  }, [affordabilitySimPrice]);

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
          orchestrationTrace: data.orchestrationTrace,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, chiefMsg]);
        fetchLiveData();
      }
    } catch {
      const fallbackMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'chief',
        text: `Chief Ghost processed "${text}" and delegated across specialist agents.`,
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
      const res = await fetch(`http://localhost:4000/api/jobs/${job.id}/tailor-resume`, {
        method: 'POST',
      });
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

  const handleTriggerJobPipeline = async () => {
    setLoading(true);
    try {
      await fetch('http://localhost:4000/api/jobs/discover', { method: 'POST' });
      await fetchLiveData();
    } finally {
      setLoading(false);
    }
  };

  const handleSyncGreenhouse = async () => {
    setGreenhouseSyncing(true);
    try {
      const res = await fetch('http://localhost:4000/api/connectors/sync/greenhouse', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setGreenhouseSyncResult(data);
        await fetchLiveData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setGreenhouseSyncing(false);
    }
  };

  const handleSaveGeminiKey = async () => {
    if (!geminiKeyInput.trim()) return;
    setGeminiSaving(true);
    setGeminiTestStatus(null);
    try {
      const res = await fetch('http://localhost:4000/api/connectors/gemini/set-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: geminiKeyInput.trim() }),
      });
      const data = await res.json();
      setGeminiTestStatus(data);
      if (data.success) {
        setGeminiKeyInput('');
      }
      await fetchLiveData();
    } catch (err: any) {
      setGeminiTestStatus({ success: false, message: `Network error: ${err.message}` });
    } finally {
      setGeminiSaving(false);
    }
  };

  const geminiConnector = connectors.find((c) => c.id === 'connector-gemini');
  const isGeminiLive = geminiConnector?.isLive || false;

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
              onClick={() => setActiveTab('connectors')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-poppins font-medium transition-all ${
                activeTab === 'connectors'
                  ? 'bg-brand-blue text-white border-2 border-brand-blue font-semibold'
                  : 'text-slate-300 hover:text-white hover:bg-surfaceHover'
              }`}
            >
              <Cpu className="w-4 h-4 text-sky-400" />
              <span>Connectors &amp; LLM</span>
              <span
                className={`ml-auto text-[10px] px-2 py-0.5 rounded-full font-bold ${
                  isGeminiLive ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                }`}
              >
                {isGeminiLive ? 'Gemini Live' : 'Connect'}
              </span>
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
              <span>Jobs &amp; Careers</span>
              <span className="ml-auto text-[10px] bg-brand-blueLight/20 text-brand-blueLight px-2 py-0.5 rounded-full font-bold">
                Live
              </span>
            </button>

            <button
              onClick={() => setActiveTab('finance')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-poppins font-medium transition-all ${
                activeTab === 'finance'
                  ? 'bg-brand-teal text-white border-2 border-brand-teal font-semibold'
                  : 'text-slate-300 hover:text-white hover:bg-surfaceHover'
              }`}
            >
              <Wallet className="w-4 h-4 text-brand-tealLight" />
              <span>Finance Ledger</span>
              <span className="ml-auto text-[10px] bg-brand-teal/20 text-brand-tealLight px-2 py-0.5 rounded-full font-bold">
                Read-Only
              </span>
            </button>

            <button
              onClick={() => setActiveTab('shopping')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-poppins font-medium transition-all ${
                activeTab === 'shopping'
                  ? 'bg-brand-coral text-white border-2 border-brand-coral font-semibold'
                  : 'text-slate-300 hover:text-white hover:bg-surfaceHover'
              }`}
            >
              <ShoppingBag className="w-4 h-4 text-rose-300" />
              <span>Shopping Scout</span>
              <span className="ml-auto text-[10px] bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded-full font-bold">
                Cross-Agent
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
          </nav>
        </div>

        {/* Playful Mascot Status Card */}
        <div className="p-3.5 rounded-2xl bg-card border-2 border-border text-xs flex items-center gap-3">
          <GhostMascot size="sm" mood={loading ? 'thinking' : 'happy'} />
          <div className="space-y-0.5">
            <div className="font-sora font-bold text-white text-[12px]">Multi-Agent Sentinel</div>
            <div className="text-[11px] text-slate-400 font-manrope">
              {isGeminiLive ? 'Google Gemini 1.5 Flash' : 'Rule-Engine Fallback'}
            </div>
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
              Personal OS • Live Orchestration Stream
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs font-poppins">
            <button
              onClick={() => setActiveTab('connectors')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-colors ${
                isGeminiLive
                  ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/20'
                  : 'bg-amber-500/10 border-amber-500/40 text-amber-300 hover:bg-amber-500/20'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${isGeminiLive ? 'bg-emerald-400' : 'bg-amber-400'}`} />
              <span>{isGeminiLive ? 'Gemini 1.5 Flash Live' : 'Gemini Key Needed (Click)'}</span>
            </button>

            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-card border border-border text-slate-300">
              <span className="w-2 h-2 rounded-full bg-brand-teal" />
              <span>Greenhouse: Connected</span>
            </div>

            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-card border border-border text-slate-300">
              <span className="w-2 h-2 rounded-full bg-brand-blue" />
              <span>PolicyEngine: Least Privilege</span>
            </div>
          </div>
        </header>

        {/* View 1: AI Chief Conversation with Real-time Orchestration Stream */}
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
                    <div className="flex gap-3 max-w-3xl">
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

                          {/* Live Multi-Agent Orchestration Stream */}
                          {msg.orchestrationTrace && msg.orchestrationTrace.length > 0 ? (
                            <div className="rounded-xl bg-card border border-border p-3.5 space-y-2.5 mt-2">
                              <div className="flex items-center justify-between pb-1 border-b border-border">
                                <div className="text-[11px] font-sora font-bold text-brand-amber uppercase tracking-wider flex items-center gap-1.5">
                                  <Activity className="w-3.5 h-3.5 text-brand-amber" />
                                  Multi-Agent Orchestration Stream ({msg.orchestrationTrace.length} Steps)
                                </div>
                                <span className="text-[10px] font-poppins px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                                  Cryptographically Sealed
                                </span>
                              </div>

                              <div className="space-y-2 pt-1">
                                {msg.orchestrationTrace.map((tr) => (
                                  <div
                                    key={tr.id}
                                    className="rounded-lg bg-surface/80 border border-border/80 p-2.5 text-xs transition-colors"
                                  >
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="flex items-start gap-2.5">
                                        <span
                                          className={`w-5 h-5 rounded-full flex items-center justify-center font-poppins font-bold text-[10px] shrink-0 mt-0.5 ${
                                            tr.phase === 'intent_parsing'
                                              ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                                              : tr.phase === 'policy_check'
                                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                              : tr.phase === 'connector_fetch'
                                              ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                                              : tr.phase === 'synthesis'
                                              ? 'bg-lime-500/20 text-lime-300 border border-lime-500/40'
                                              : 'bg-slate-700 text-slate-200'
                                          }`}
                                        >
                                          {tr.stepNumber}
                                        </span>
                                        <div>
                                          <div className="flex items-center gap-2">
                                            <span className="font-poppins font-bold text-white text-[12px]">{tr.name}</span>
                                            <span
                                              className={`text-[10px] font-poppins px-1.5 py-0.2 rounded font-medium ${
                                                tr.phase === 'policy_check'
                                                  ? 'bg-amber-500/20 text-amber-300'
                                                  : tr.phase === 'connector_fetch'
                                                  ? 'bg-teal-500/20 text-teal-300'
                                                  : tr.phase === 'intent_parsing'
                                                  ? 'bg-sky-500/20 text-sky-300'
                                                  : 'bg-slate-700 text-slate-300'
                                              }`}
                                            >
                                              {tr.agent}
                                            </span>
                                          </div>
                                          <p className="text-slate-300 text-[11px] font-manrope mt-0.5">{tr.description}</p>
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-2 shrink-0">
                                        {tr.durationMs > 0 && (
                                          <span className="text-[10px] font-poppins text-slate-400 flex items-center gap-1">
                                            <Clock className="w-2.5 h-2.5" />
                                            {tr.durationMs}ms
                                          </span>
                                        )}
                                        {tr.status === 'policy_verified' ? (
                                          <span className="text-[10px] font-poppins font-semibold text-amber-300 bg-amber-500/20 px-1.5 py-0.5 rounded">
                                            Policy OK
                                          </span>
                                        ) : tr.status === 'completed' ? (
                                          <span className="text-[10px] font-poppins font-semibold text-emerald-400 bg-emerald-500/20 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                            <Check className="w-2.5 h-2.5" />
                                            Done
                                          </span>
                                        ) : (
                                          <span className="text-[10px] font-poppins font-semibold text-rose-400 bg-rose-500/20 px-1.5 py-0.5 rounded">
                                            {tr.status}
                                          </span>
                                        )}
                                      </div>
                                    </div>

                                    {/* Collapsible Details */}
                                    {tr.details && (
                                      <div className="mt-2 pt-2 border-t border-border/50">
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setExpandedTrace((prev) => ({ ...prev, [tr.id]: !prev[tr.id] }))
                                          }
                                          className="text-[10px] font-poppins text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
                                        >
                                          {expandedTrace[tr.id] ? (
                                            <ChevronUp className="w-3 h-3" />
                                          ) : (
                                            <ChevronDown className="w-3 h-3" />
                                          )}
                                          <span>{expandedTrace[tr.id] ? 'Hide Payload' : 'Inspect Step Telemetry'}</span>
                                        </button>
                                        {expandedTrace[tr.id] && (
                                          <pre className="mt-1.5 p-2 rounded bg-background/90 border border-border text-[10px] font-mono text-slate-300 overflow-x-auto max-h-40">
                                            {JSON.stringify(tr.details, null, 2)}
                                          </pre>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : msg.plan && msg.plan.steps ? (
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
                          ) : null}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {loading && (
                <div className="flex items-center gap-3 p-3.5 rounded-xl bg-card border-2 border-border text-xs font-poppins text-brand-amber">
                  <GhostMascot size="sm" mood="thinking" />
                  <span>Chief Ghost is evaluating policy gateway, querying connectors &amp; orchestrating agents...</span>
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
                  placeholder="Ask Chief Ghost (e.g. 'Find engineering jobs at Stripe', 'Should I buy MacBook Air?')..."
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
                <span className="text-[11px] font-poppins font-semibold text-slate-400">Live tests:</span>
                <button
                  onClick={() => handleSendMessage('Find me remote engineering jobs at Stripe or Cloudflare.')}
                  className="px-3 py-1 rounded-xl bg-card hover:bg-surfaceHover text-slate-200 text-[11px] font-poppins font-medium border border-border whitespace-nowrap transition-colors"
                >
                  Live Greenhouse: &quot;Find Stripe &amp; Cloudflare jobs&quot;
                </button>
                <button
                  onClick={() => handleSendMessage('Should I buy a ₹90,000 MacBook Air M2 based on my current finances?')}
                  className="px-3 py-1 rounded-xl bg-card hover:bg-surfaceHover text-slate-200 text-[11px] font-poppins font-medium border border-border whitespace-nowrap transition-colors"
                >
                  Cross-Agent: &quot;Should I buy ₹90,000 laptop?&quot;
                </button>
                <button
                  onClick={() => handleSendMessage('Analyze my monthly spending and discretionary reserve.')}
                  className="px-3 py-1 rounded-xl bg-card hover:bg-surfaceHover text-slate-200 text-[11px] font-poppins font-medium border border-border whitespace-nowrap transition-colors"
                >
                  Finance: &quot;Check discretionary budget&quot;
                </button>
              </div>
            </div>
          </div>
        )}

        {/* View 2: Connectors & Google Gemini Model Management */}
        {activeTab === 'connectors' && (
          <div className="flex-1 overflow-y-auto p-6 max-w-4xl mx-auto w-full space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-sora font-extrabold text-lg text-white">Connectors &amp; AI Intelligence</h2>
                <p className="text-xs text-slate-400 font-manrope">
                  Live data pipelines feeding real context to the Chief Agent and specialist bots.
                </p>
              </div>
              <button
                onClick={fetchLiveData}
                className="px-3 py-1.5 text-xs font-poppins font-semibold rounded-xl bg-card border border-border text-slate-300 hover:text-white flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Refresh Status</span>
              </button>
            </div>

            {/* Gemini LLM Card */}
            <div className="playful-card p-5 border-2 border-border space-y-4 bg-card">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-400">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-sora font-bold text-white text-base">Google Gemini 1.5 Flash</h3>
                      <span
                        className={`text-[10px] font-poppins font-bold px-2 py-0.5 rounded-full ${
                          isGeminiLive
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        }`}
                      >
                        {isGeminiLive ? 'ACTIVE (Generative LLM)' : 'FALLBACK MODE (No Key Set)'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 font-manrope mt-0.5">
                      Powers dynamic intent parsing, multi-agent reasoning decomposition, and conversational resume tailoring.
                    </p>
                  </div>
                </div>

                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-poppins font-semibold text-sky-400 hover:text-sky-300 flex items-center gap-1 shrink-0"
                >
                  <span>Get Free Key</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              <div className="rounded-xl bg-surface p-4 border border-border space-y-3">
                <label className="block text-xs font-poppins font-bold text-slate-200">
                  Configure Gemini API Key:
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Key className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      value={geminiKeyInput}
                      onChange={(e) => setGeminiKeyInput(e.target.value)}
                      placeholder="Paste your Gemini API key (AIzaSy...)"
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-card border border-border text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-sky-400"
                    />
                  </div>
                  <button
                    onClick={handleSaveGeminiKey}
                    disabled={geminiSaving || !geminiKeyInput.trim()}
                    className="px-4 py-2 text-xs font-poppins font-bold rounded-xl bg-sky-600 hover:bg-sky-500 text-white playful-button disabled:opacity-50 flex items-center gap-1.5 shrink-0"
                  >
                    {geminiSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    <span>Verify &amp; Activate</span>
                  </button>
                </div>

                {geminiTestStatus && (
                  <div
                    className={`p-2.5 rounded-lg text-xs font-manrope flex items-center gap-2 ${
                      geminiTestStatus.success
                        ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                        : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
                    }`}
                  >
                    {geminiTestStatus.success ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                    <span>{geminiTestStatus.message}</span>
                  </div>
                )}

                <p className="text-[11px] text-slate-400 font-manrope">
                  Tip: You can also set <code className="bg-card px-1.5 py-0.5 rounded text-sky-300">GEMINI_API_KEY=&quot;...&quot;</code> in the project root <code className="bg-card px-1.5 py-0.5 rounded text-slate-200">.env</code> file.
                </p>
              </div>
            </div>

            {/* Greenhouse Career ATS Connector */}
            <div className="playful-card p-5 border-2 border-border space-y-4 bg-card">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-brand-teal/10 border border-brand-teal/30 text-brand-tealLight">
                    <Briefcase className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-sora font-bold text-white text-base">Greenhouse Live Career API</h3>
                      <span className="text-[10px] font-poppins font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                        LIVE REST API CONNECTED
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 font-manrope mt-0.5">
                      Direct public ATS scraper continuously querying open vacancies from <strong>Stripe, Cloudflare, Figma, GitHub</strong>.
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleSyncGreenhouse}
                  disabled={greenhouseSyncing}
                  className="px-3.5 py-2 text-xs font-poppins font-bold rounded-xl bg-brand-teal hover:bg-brand-tealLight text-white playful-button flex items-center gap-1.5 shrink-0 disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${greenhouseSyncing ? 'animate-spin' : ''}`} />
                  <span>{greenhouseSyncing ? 'Scraping Live...' : 'Test Live Fetch'}</span>
                </button>
              </div>

              {greenhouseSyncResult && (
                <div className="p-3.5 rounded-xl bg-surface border border-brand-teal/40 space-y-2 text-xs font-manrope">
                  <div className="flex items-center justify-between font-poppins font-bold text-brand-tealLight">
                    <span>{greenhouseSyncResult.message}</span>
                    <span>{greenhouseSyncResult.jobsFetched} Jobs Retrieved</span>
                  </div>
                  <div className="space-y-1.5 pt-1">
                    {greenhouseSyncResult.sampleJobs?.map((j: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between text-slate-300 text-[11px] bg-card p-2 rounded-lg">
                        <span>
                          <strong className="text-white">{j.company}</strong> — {j.title} ({j.location.join(', ')})
                        </span>
                        <a href={j.url} target="_blank" rel="noreferrer" className="text-brand-tealLight hover:underline">
                          View &rarr;
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-surface border border-border">
                  <span className="text-slate-400 font-poppins text-[10px]">AUTH MODE</span>
                  <p className="font-poppins font-bold text-white mt-0.5">Public REST (Zero-Token)</p>
                </div>
                <div className="p-3 rounded-xl bg-surface border border-border">
                  <span className="text-slate-400 font-poppins text-[10px]">COMPANIES TRACKED</span>
                  <p className="font-poppins font-bold text-white mt-0.5">Stripe, Figma, Cloudflare, GitHub</p>
                </div>
                <div className="p-3 rounded-xl bg-surface border border-border">
                  <span className="text-slate-400 font-poppins text-[10px]">DEDUPLICATION</span>
                  <p className="font-poppins font-bold text-white mt-0.5">SHA-256 Content Hash</p>
                </div>
              </div>
            </div>

            {/* DuckDuckGo Web Search & Intelligence */}
            <div className="playful-card p-5 border-2 border-border space-y-3 bg-card">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-brand-amber">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-sora font-bold text-white text-base">DuckDuckGo Web Intelligence</h3>
                    <span className="text-[10px] font-poppins font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                      LIVE UNMETERED API
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 font-manrope mt-0.5">
                    Live instant answers &amp; market price aggregator. Powers review summarization for the Shopping and Research Specialists.
                  </p>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-surface border border-border text-xs text-slate-300 font-manrope">
                <strong>Privacy Policy:</strong> Zero cookies, zero search profiling. Safe queries dispatched directly via Gateway hook.
              </div>
            </div>

            {/* Financial Ledger (Read-Only) */}
            <div className="playful-card p-5 border-2 border-border space-y-3 bg-card">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-brand-coral/10 border border-brand-coral/30 text-rose-300">
                  <Wallet className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-sora font-bold text-white text-base">Discretionary Banking Ledger</h3>
                    <span className="text-[10px] font-poppins font-bold px-2 py-0.5 rounded-full bg-brand-coral/20 text-rose-300 border border-brand-coral/40">
                      READ-ONLY ENFORCED
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 font-manrope mt-0.5">
                    Provides categorized monthly cashflow, recurring subscription detection, and purchase affordability evaluation.
                  </p>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-surface border border-border text-xs text-slate-300 font-manrope">
                <strong className="text-white">Security Guarantee:</strong> PolicyEngine strictly forbids any funds transfer (<code className="text-rose-300 font-mono">finance.transfer: FORBIDDEN</code>). Agents can only compute read-only affordability models.
              </div>
            </div>
          </div>
        )}

        {/* View 3: Finance Ledger */}
        {activeTab === 'finance' && (
          <div className="flex-1 overflow-y-auto p-6 max-w-4xl mx-auto w-full space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-sora font-extrabold text-lg text-white">Personal Financial Ledger</h2>
                <p className="text-xs text-slate-400 font-manrope">
                  Read-only ledger integration with automated affordability evaluation and recurring spend tracking.
                </p>
              </div>
              <div className="px-3 py-1 rounded-xl bg-card border border-border text-xs font-poppins text-brand-tealLight flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-brand-teal" />
                <span>Capability: finance.transactions.read</span>
              </div>
            </div>

            {financeOverview && (
              <div className="grid grid-cols-4 gap-3">
                <div className="p-4 rounded-2xl bg-card border-2 border-border">
                  <span className="text-[11px] font-poppins text-slate-400 uppercase tracking-wider">Monthly Discretionary</span>
                  <p className="text-xl font-sora font-extrabold text-white mt-1">₹{financeOverview.monthlyDiscretionaryBudget?.toLocaleString()}</p>
                </div>
                <div className="p-4 rounded-2xl bg-card border-2 border-border">
                  <span className="text-[11px] font-poppins text-slate-400 uppercase tracking-wider">Spent This Month</span>
                  <p className="text-xl font-sora font-extrabold text-rose-400 mt-1">₹{financeOverview.currentMonthSpend?.toLocaleString()}</p>
                </div>
                <div className="p-4 rounded-2xl bg-card border-2 border-border">
                  <span className="text-[11px] font-poppins text-slate-400 uppercase tracking-wider">Remaining Buffer</span>
                  <p className="text-xl font-sora font-extrabold text-emerald-400 mt-1">₹{financeOverview.remainingAffordability?.toLocaleString()}</p>
                </div>
                <div className="p-4 rounded-2xl bg-card border-2 border-border">
                  <span className="text-[11px] font-poppins text-slate-400 uppercase tracking-wider">Recurring Monthly</span>
                  <p className="text-xl font-sora font-extrabold text-brand-amber mt-1">₹{financeOverview.recurringMonthlyCommitments?.toLocaleString()}</p>
                </div>
              </div>
            )}

            {/* Interactive Purchase Affordability Simulator */}
            <div className="playful-card p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-sora font-bold text-white text-base">Purchase Affordability Simulator</h3>
                  <p className="text-xs text-slate-300 font-manrope">
                    Test what the Finance Specialist advises for any potential purchase amount.
                  </p>
                </div>
                <span className="text-xs font-poppins font-semibold px-2.5 py-1 rounded-xl bg-surface text-brand-amber border border-border">
                  Deterministic Policy Evaluator
                </span>
              </div>

              <div className="flex items-center gap-4 pt-1">
                <div className="flex-1 space-y-1.5">
                  <div className="flex justify-between text-xs font-poppins text-slate-300">
                    <span>Target Purchase Price:</span>
                    <strong className="text-white font-mono">₹{affordabilitySimPrice.toLocaleString()}</strong>
                  </div>
                  <input
                    type="range"
                    min="5000"
                    max="180000"
                    step="5000"
                    value={affordabilitySimPrice}
                    onChange={(e) => setAffordabilitySimPrice(Number(e.target.value))}
                    className="w-full accent-brand-teal cursor-pointer"
                  />
                </div>
              </div>

              {affordabilityResult && (
                <div
                  className={`p-4 rounded-xl border-2 space-y-1.5 ${
                    affordabilityResult.verdict === 'comfortable'
                      ? 'bg-card border-brand-teal'
                      : affordabilityResult.verdict === 'stretch'
                      ? 'bg-card border-brand-amber'
                      : 'bg-card border-brand-coral'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-poppins font-bold px-2.5 py-0.5 rounded-full uppercase ${
                        affordabilityResult.verdict === 'comfortable'
                          ? 'bg-brand-teal text-white'
                          : affordabilityResult.verdict === 'stretch'
                          ? 'bg-brand-amber text-slate-950'
                          : 'bg-brand-coral text-white'
                      }`}
                    >
                      Verdict: {affordabilityResult.verdict}
                    </span>
                    <span className="text-xs font-mono text-slate-300">
                      Discretionary Impact: {affordabilityResult.discretionaryBudgetImpactPct}%
                    </span>
                  </div>
                  <p className="text-xs text-slate-200 font-manrope leading-relaxed">
                    {affordabilityResult.explanation}
                  </p>
                </div>
              )}
            </div>

            {/* Categorized Ledger Table */}
            <div className="playful-card p-5 space-y-3">
              <h3 className="font-sora font-bold text-white text-base">Recent Ledger Ingestions</h3>
              <div className="space-y-2">
                {transactions.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between p-3 rounded-xl bg-card border border-border text-xs">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-brand-teal" />
                      <div>
                        <strong className="text-white font-poppins">{tx.description}</strong>
                        <span className="text-slate-400 text-[11px] block">{tx.category} • {tx.date}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <strong className="font-mono text-white">₹{tx.amount.toLocaleString()}</strong>
                      {tx.isRecurring && (
                        <span className="text-[10px] font-poppins text-brand-amber block">Recurring</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* View 4: Shopping Scout */}
        {activeTab === 'shopping' && (
          <div className="flex-1 overflow-y-auto p-6 max-w-4xl mx-auto w-full space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-sora font-extrabold text-lg text-white">Shopping &amp; Product Scout</h2>
                <p className="text-xs text-slate-400 font-manrope">
                  Multi-merchant price comparison, model discovery, and cross-agent affordability verification.
                </p>
              </div>
            </div>

            <div className="playful-card p-5 space-y-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={shoppingQuery}
                  onChange={(e) => setShoppingQuery(e.target.value)}
                  placeholder="Enter product to scout (e.g. MacBook Air M2, Sony WH-1000XM5)..."
                  className="flex-1 bg-card border-2 border-border rounded-xl px-3.5 py-2 text-xs font-manrope text-white placeholder-slate-400 focus:outline-none focus:border-brand-coral"
                />
                <button
                  onClick={fetchLiveData}
                  className="px-4 py-2 text-xs font-poppins font-bold rounded-xl bg-brand-coral hover:bg-rose-500 text-white playful-button shrink-0"
                >
                  Scout Product
                </button>
              </div>

              {shoppingResult && (
                <div className="space-y-4 pt-2">
                  <div className="flex items-center justify-between p-4 rounded-xl bg-card border-2 border-brand-coral/40">
                    <div>
                      <span className="text-[10px] font-poppins text-slate-400 uppercase">Target Item</span>
                      <h3 className="font-sora font-bold text-white text-base mt-0.5">{shoppingResult.requestedProduct}</h3>
                      <p className="text-xs text-slate-300 font-manrope mt-1">{shoppingResult.crossAgentRecommendation}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-poppins text-slate-400 uppercase">Best Price</span>
                      <p className="text-xl font-sora font-extrabold text-emerald-400 mt-0.5">
                        ₹{shoppingResult.bestOffer?.price.toLocaleString()}
                      </p>
                      <span className="text-[10px] font-poppins text-slate-400">via {shoppingResult.bestOffer?.merchant}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-sora font-bold text-xs text-white uppercase tracking-wider">Merchant Price Comparisons</h4>
                    <div className="grid grid-cols-3 gap-3">
                      {shoppingResult.merchants?.map((m: any, idx: number) => (
                        <div key={idx} className="p-3.5 rounded-xl bg-card border border-border space-y-1.5 text-xs">
                          <div className="flex items-center justify-between">
                            <strong className="text-white font-poppins">{m.merchant}</strong>
                            <span className="text-[10px] font-poppins text-emerald-400">{m.deliveryDays}d delivery</span>
                          </div>
                          <p className="font-mono text-base font-bold text-white">₹{m.price.toLocaleString()}</p>
                          <span className={`text-[10px] font-poppins block ${m.inStock ? 'text-slate-400' : 'text-rose-400'}`}>
                            {m.inStock ? 'In Stock' : 'Limited Inventory'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2 pt-1">
                    <h4 className="font-sora font-bold text-xs text-white uppercase tracking-wider">Recommended Alternatives</h4>
                    <div className="space-y-2">
                      {shoppingResult.alternatives?.map((alt: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-card border border-border text-xs">
                          <div>
                            <strong className="text-white font-poppins">{alt.name}</strong>
                            <p className="text-slate-300 text-[11px] font-manrope mt-0.5">{alt.rationale}</p>
                          </div>
                          <div className="text-right">
                            <span className="font-mono text-white font-bold">₹{alt.price.toLocaleString()}</span>
                            <span className="text-[10px] font-poppins text-brand-tealLight block font-bold">
                              Value Score: {alt.valueScore}/100
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* View 5: Jobs & Careers */}
        {activeTab === 'jobs' && (
          <div className="flex-1 overflow-y-auto p-6 max-w-4xl mx-auto w-full space-y-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="font-sora font-extrabold text-lg text-white">Live Career Matches</h2>
                <p className="text-xs text-slate-400 font-manrope">
                  Live Greenhouse ATS openings paired with tailored resumes without fact hallucination.
                </p>
              </div>
              <button
                onClick={handleTriggerJobPipeline}
                disabled={loading}
                className="px-4 py-2 text-xs font-poppins font-bold rounded-xl bg-brand-blue hover:bg-brand-blueLight text-white playful-button flex items-center gap-1.5 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>Run Ingestion Pipeline</span>
              </button>
            </div>

            {jobs.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-sm playful-card flex flex-col items-center gap-3">
                <GhostMascot size="lg" mood="thinking" />
                <p>No jobs discovered yet. Click &apos;Run Ingestion Pipeline&apos; to scrape Greenhouse feeds!</p>
              </div>
            ) : (
              jobs.map((job) => (
                <div key={job.id} className="playful-card p-5 border-2 border-border space-y-3.5">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-sora font-bold text-white text-base">{job.title}</h3>
                        <span className="text-xs font-poppins font-bold px-2.5 py-0.5 rounded-full bg-brand-teal text-white">
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

        {/* View 6: Safety Approvals Gate */}
        {activeTab === 'approvals' && (
          <div className="flex-1 overflow-y-auto p-6 max-w-4xl mx-auto w-full space-y-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="font-sora font-extrabold text-lg text-white">Universal Safety Gate</h2>
                <p className="text-xs text-slate-400 font-manrope">
                  Principle 2.4: Human Control. High-risk agent actions stay blocked until approved.
                </p>
              </div>
              <button onClick={fetchLiveData} className="p-2 rounded-xl bg-card border border-border text-slate-300 hover:text-white">
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

        {/* View 7: Audit Ledger */}
        {activeTab === 'audit' && (
          <div className="flex-1 overflow-y-auto p-6 max-w-4xl mx-auto w-full space-y-3">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="font-sora font-extrabold text-lg text-white">Immutable Event Ledger</h2>
                <p className="text-xs text-slate-400 font-manrope">
                  Principle 2.3: Every meaningful agent step, decision, and tool invocation is recorded.
                </p>
              </div>
              <button onClick={fetchLiveData} className="p-2 rounded-xl bg-card border border-border text-slate-300 hover:text-white">
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
