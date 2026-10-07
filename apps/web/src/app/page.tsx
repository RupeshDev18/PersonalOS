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
  Copy,
  Plus,
  Trash2,
  User,
  CheckCheck,
  Mail,
  Folder,
  HardDrive,
  LogOut,
  UserCheck,
  Download,
  Inbox,
  PanelRight,
  Database,
  Bot,
  CheckCircle2,
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
  executionResult?: {
    executed: boolean;
    executedAt: string;
    details: string;
    artifactUrl?: string;
  };
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
  const [shoppingLoading, setShoppingLoading] = useState(false);

  // Career Profile & Resume Vault State
  const [careerProfile, setCareerProfile] = useState<{
    userId: string;
    targetRoles: string[];
    skills: string[];
    yearsExperience: number;
    preferredLocations: string[];
    workModePreference: string;
    minSalary?: number;
    preferredSalary?: number;
    resumes: Array<{
      id: string;
      title: string;
      fileName: string;
      targetRole: string;
      tags: string[];
      contentMarkdown: string;
      isDefault: boolean;
    }>;
  } | null>(null);
  const [showProfileDrawer, setShowProfileDrawer] = useState(false);
  const [skillInput, setSkillInput] = useState('');
  const [roleInput, setRoleInput] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [newResumeModal, setNewResumeModal] = useState(false);
  const [newResumeTitle, setNewResumeTitle] = useState('');
  const [newResumeRole, setNewResumeRole] = useState('');
  const [newResumeContent, setNewResumeContent] = useState('');
  const [copiedPitch, setCopiedPitch] = useState(false);

  // Orchestration & Connectors UI State
  const [expandedTrace, setExpandedTrace] = useState<Record<string, boolean>>({});
  const [geminiKeyInput, setGeminiKeyInput] = useState('');
  const [geminiTestStatus, setGeminiTestStatus] = useState<{ success: boolean; message: string } | null>(null);
  const [geminiSaving, setGeminiSaving] = useState(false);
  const [greenhouseSyncing, setGreenhouseSyncing] = useState(false);
  const [greenhouseSyncResult, setGreenhouseSyncResult] = useState<any>(null);
  const [selectedGeminiModel, setSelectedGeminiModel] = useState('gemini-2.5-flash');

  // User Authentication & Personalization State
  const [currentUser, setCurrentUser] = useState<any>({
    id: 'user-rupesh',
    name: 'Rupesh Yadav',
    email: 'ry993494787@gmail.com',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&h=120&q=80',
    title: 'Senior Full Stack & AI Systems Engineer',
    connectedAccounts: {
      google: { connected: true, email: 'ry993494787@gmail.com', unreadEmailCount: 3, indexedDriveFilesCount: 4 },
    },
  });
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [authNameInput, setAuthNameInput] = useState('');
  const [authEmailInput, setAuthEmailInput] = useState('');
  const [authTitleInput, setAuthTitleInput] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);

  // Google Workspace (Gmail & Drive) State
  const [googleStatus, setGoogleStatus] = useState<any>({
    connected: true,
    email: 'ry993494787@gmail.com',
    unreadEmails: 3,
    indexedFilesCount: 4,
  });
  const [googleInboxModal, setGoogleInboxModal] = useState(false);
  const [googleDriveModal, setGoogleDriveModal] = useState(false);
  const [gmailMessages, setGmailMessages] = useState<any[]>([]);
  const [driveFiles, setDriveFiles] = useState<any[]>([]);
  const [googleSyncing, setGoogleSyncing] = useState(false);
  const [importingDriveFileId, setImportingDriveFileId] = useState<string | null>(null);
  const [driveImportSuccess, setDriveImportSuccess] = useState<string | null>(null);
  const [selectedEmailDetail, setSelectedEmailDetail] = useState<any | null>(null);
  const [showContextDrawer, setShowContextDrawer] = useState(false);

  const [selectedResumeModal, setSelectedResumeModal] = useState<{
    jobTitle: string;
    company: string;
    content: string;
    outreachPitch?: string;
    emphasizedSkills?: string[];
    isLLMTailored?: boolean;
    rationale?: string;
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
    } catch { }

    try {
      const profRes = await fetch('http://localhost:4000/api/jobs/profile');
      if (profRes.ok) setCareerProfile(await profRes.json());
    } catch { }

    try {
      const connRes = await fetch('http://localhost:4000/api/connectors');
      if (connRes.ok) setConnectors(await connRes.json());
    } catch { }

    try {
      const appRes = await fetch('http://localhost:4000/api/approvals');
      if (appRes.ok) setApprovals(await appRes.json());
    } catch { }

    try {
      const audRes = await fetch('http://localhost:4000/api/audit?limit=30');
      if (audRes.ok) setAuditEvents(await audRes.json());
    } catch { }

    try {
      const finRes = await fetch('http://localhost:4000/api/finance/overview');
      if (finRes.ok) setFinanceOverview(await finRes.json());
      const txRes = await fetch('http://localhost:4000/api/finance/transactions');
      if (txRes.ok) setTransactions(await txRes.json());
    } catch { }

    try {
      const meRes = await fetch('http://localhost:4000/api/auth/me');
      if (meRes.ok) setCurrentUser(await meRes.json());
    } catch { }

    try {
      const gRes = await fetch('http://localhost:4000/api/connectors/google/status');
      if (gRes.ok) setGoogleStatus(await gRes.json());
    } catch { }
  };

  const fetchGoogleData = async () => {
    try {
      const mailRes = await fetch('http://localhost:4000/api/connectors/google/gmail');
      if (mailRes.ok) setGmailMessages(await mailRes.json());
      const driveRes = await fetch('http://localhost:4000/api/connectors/google/drive');
      if (driveRes.ok) setDriveFiles(await driveRes.json());
    } catch { }
  };

  const handleLogin = async (email: string) => {
    setAuthError(null);
    try {
      const res = await fetch('http://localhost:4000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        const data = await res.json();
        setCurrentUser(data.user);
        setShowAuthModal(false);
        await fetchLiveData();
      } else {
        const err = await res.json();
        setAuthError(err.message || 'Login failed');
      }
    } catch (err: any) {
      setAuthError(err.message || 'Network error');
    }
  };

  const handleSignup = async (name: string, email: string, title?: string) => {
    setAuthError(null);
    try {
      const res = await fetch('http://localhost:4000/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, title }),
      });
      if (res.ok) {
        const data = await res.json();
        setCurrentUser(data.user);
        setShowAuthModal(false);
        await fetchLiveData();
      } else {
        const err = await res.json();
        setAuthError(err.message || 'Signup failed');
      }
    } catch (err: any) {
      setAuthError(err.message || 'Network error');
    }
  };

  const handleSwitchUser = async (userId: string) => {
    try {
      const res = await fetch('http://localhost:4000/api/auth/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      if (res.ok) {
        const data = await res.json();
        setCurrentUser(data);
        setShowAuthModal(false);
        await fetchLiveData();
      }
    } catch { }
  };

  const handleSyncGoogle = async () => {
    setGoogleSyncing(true);
    try {
      const res = await fetch('http://localhost:4000/api/connectors/google/sync', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setGoogleStatus(data);
        await fetchGoogleData();
        await fetchLiveData();
      }
    } finally {
      setGoogleSyncing(false);
    }
  };

  const handleImportDriveResume = async (fileId: string) => {
    setImportingDriveFileId(fileId);
    try {
      const res = await fetch(`http://localhost:4000/api/connectors/google/drive/import-resume/${fileId}`, {
        method: 'POST',
      });
      if (res.ok) {
        const data = await res.json();
        setDriveImportSuccess(data.message);
        setTimeout(() => setDriveImportSuccess(null), 4000);
        await fetchLiveData();
      }
    } finally {
      setImportingDriveFileId(null);
    }
  };

  const executeShoppingSearch = async (targetQuery?: string) => {
    const query = targetQuery !== undefined ? targetQuery : shoppingQuery;
    if (!query || !query.trim()) return;
    setShoppingLoading(true);
    try {
      const shopRes = await fetch(`http://localhost:4000/api/shopping/compare?query=${encodeURIComponent(query.trim())}`);
      if (shopRes.ok) {
        const data = await shopRes.json();
        setShoppingResult(data);
      }
    } catch (err) {
      console.error('Failed to scout product:', err);
    } finally {
      setShoppingLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveData();
    fetchGoogleData();
    executeShoppingSearch('MacBook Air M2');
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
          outreachPitch: data.outreachPitch,
          emphasizedSkills: data.emphasizedSkills,
          isLLMTailored: data.isLLMTailored,
          rationale: data.rationale,
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddSkill = () => {
    if (!skillInput.trim() || !careerProfile) return;
    const skill = skillInput.trim();
    if (!careerProfile.skills.includes(skill)) {
      setCareerProfile({
        ...careerProfile,
        skills: [...careerProfile.skills, skill],
      });
    }
    setSkillInput('');
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    if (!careerProfile) return;
    setCareerProfile({
      ...careerProfile,
      skills: careerProfile.skills.filter((s) => s !== skillToRemove),
    });
  };

  const handleAddRole = () => {
    if (!roleInput.trim() || !careerProfile) return;
    const role = roleInput.trim();
    if (!careerProfile.targetRoles.includes(role)) {
      setCareerProfile({
        ...careerProfile,
        targetRoles: [...careerProfile.targetRoles, role],
      });
    }
    setRoleInput('');
  };

  const handleRemoveRole = (roleToRemove: string) => {
    if (!careerProfile) return;
    setCareerProfile({
      ...careerProfile,
      targetRoles: careerProfile.targetRoles.filter((r) => r !== roleToRemove),
    });
  };

  const handleSaveProfile = async () => {
    if (!careerProfile) return;
    setSavingProfile(true);
    try {
      const res = await fetch('http://localhost:4000/api/jobs/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(careerProfile),
      });
      if (res.ok) {
        const updated = await res.json();
        setCareerProfile(updated);
        await fetchLiveData();
      }
    } finally {
      setSavingProfile(false);
    }
  };

  const handleCreateResume = async () => {
    if (!newResumeTitle.trim() || !newResumeContent.trim()) return;
    try {
      const res = await fetch('http://localhost:4000/api/jobs/resumes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newResumeTitle.trim(),
          targetRole: newResumeRole.trim() || 'Software Engineer',
          contentMarkdown: newResumeContent.trim(),
          tags: careerProfile?.skills.slice(0, 5) || [],
        }),
      });
      if (res.ok) {
        setNewResumeModal(false);
        setNewResumeTitle('');
        setNewResumeRole('');
        setNewResumeContent('');
        await fetchLiveData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteResume = async (resumeId: string) => {
    try {
      await fetch(`http://localhost:4000/api/jobs/resumes/${resumeId}`, {
        method: 'DELETE',
      });
      await fetchLiveData();
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
    <div className="flex h-screen w-screen overflow-hidden bg-[#fbfbfa] text-slate-900 font-manrope selection:bg-indigo-100 selection:text-indigo-900">
      {/* ========================================================================= */}
      {/* MINIMALIST LEFT NAVIGATION RAIL (w-60)                                    */}
      {/* ========================================================================= */}
      <aside className="w-60 border-r border-slate-200/80 bg-white flex flex-col justify-between p-3 shrink-0 z-30">
        <div className="space-y-4">
          {/* Brand Identity */}
          <div className="flex items-center gap-2.5 px-3 py-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-200/60 flex items-center justify-center shrink-0">
              <GhostMascot size="sm" mood={loading ? 'thinking' : 'happy'} className="scale-90" />
            </div>
            <div>
              <h1 className="font-sora font-bold text-sm tracking-tight text-slate-900">PersonalOS</h1>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-manrope">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>Online</span>
              </div>
            </div>
          </div>

          {/* Clean Navigation Links */}
          <nav className="space-y-0.5">
            {[
              { id: 'chat', label: 'Assistant', icon: Bot },
              { id: 'jobs', label: 'Career & Jobs', icon: Briefcase },
              { id: 'finance', label: 'Finance & Ledger', icon: Wallet },
              { id: 'shopping', label: 'Product Scout', icon: ShoppingBag },
              {
                id: 'approvals',
                label: 'Approvals',
                icon: ShieldCheck,
                badge: approvals.filter((a) => a.status === 'pending').length || undefined,
              },
              { id: 'audit', label: 'Activity Log', icon: Activity },
              { id: 'connectors', label: 'Integrations', icon: Cpu },
            ].map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as any)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-poppins transition-all ${
                    isActive
                      ? 'bg-indigo-50/70 text-indigo-700 font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-normal'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                  {item.badge && item.badge > 0 && (
                    <span className="ml-auto text-[10px] bg-amber-500 text-white px-1.5 py-0.2 rounded-full font-mono font-bold">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Operator Profile */}
        <div className="pt-2 border-t border-slate-100">
          <button
            onClick={() => setShowAuthModal(true)}
            className="w-full p-2 rounded-xl hover:bg-slate-50 text-left flex items-center justify-between transition-colors group"
          >
            <div className="flex items-center gap-2 overflow-hidden">
              <img
                src={currentUser?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&h=120&q=80'}
                alt={currentUser?.name}
                className="w-7 h-7 rounded-full object-cover shrink-0"
              />
              <div className="overflow-hidden">
                <div className="font-sora font-semibold text-slate-800 text-xs truncate">{currentUser?.name || 'Rupesh Yadav'}</div>
                <div className="text-[10px] text-slate-400 font-manrope truncate">{currentUser?.email || 'ry993494787@gmail.com'}</div>
              </div>
            </div>
            <UserCheck className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 shrink-0" />
          </button>
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* WORKSPACE MAIN WRAPPER (Clean Header + Central Canvas + Optional Drawer)  */}
      {/* ========================================================================= */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Top Header Bar */}
        <header className="h-14 border-b border-slate-200/80 bg-white px-6 flex items-center justify-between shrink-0 z-20">
          <h2 className="font-sora font-semibold text-sm text-slate-900">
            {activeTab === 'chat' && 'Assistant'}
            {activeTab === 'jobs' && 'Career & Opportunities'}
            {activeTab === 'finance' && 'Financial Ledger'}
            {activeTab === 'shopping' && 'Product Scout'}
            {activeTab === 'approvals' && 'Pending Approvals'}
            {activeTab === 'audit' && 'Activity Log'}
            {activeTab === 'connectors' && 'Integrations & Keys'}
          </h2>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowContextDrawer(!showContextDrawer)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-poppins transition-colors ${
                showContextDrawer
                  ? 'bg-indigo-50 text-indigo-700 border-indigo-200 font-medium'
                  : 'bg-white text-slate-600 border-slate-200 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <PanelRight className="w-3.5 h-3.5" />
              <span>Context</span>
            </button>
          </div>
        </header>

        {/* WORKSPACE ROW: Central Fluid Canvas + Collapsible Right Context Deck */}
        <div className="flex-1 flex flex-row overflow-hidden relative">
          <main className="flex-1 flex flex-col h-full overflow-hidden relative bg-[#fbfbfa]">
            {/* UNIFIED SINGLE SCROLL STREAM */}
            <div className="flex-1 overflow-y-auto px-6 py-8 space-y-6 pb-36">
              {/* View 1: AI Chief Conversation */}
              {activeTab === 'chat' && (
                <div className="max-w-3xl mx-auto w-full space-y-5">
                  {/* Conversational Stream */}
                  <div className="space-y-4">
                    {messages.map((msg) => (
                      <div key={msg.id}>
                        {msg.sender === 'user' ? (
                          <div className="flex justify-end">
                            <div className="max-w-xl bg-indigo-600 text-white rounded-2xl rounded-tr-xs px-4 py-2.5 text-xs font-manrope shadow-xs leading-relaxed">
                              {msg.text}
                            </div>
                          </div>
                        ) : (
                          <div className="flex gap-3 max-w-2xl">
                            <div className="shrink-0 pt-1">
                              <GhostMascot size="sm" mood={loading ? 'thinking' : 'happy'} />
                            </div>
                            <div className="space-y-2 flex-1">
                              <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-2.5">
                                <p className="text-slate-800 text-xs leading-relaxed font-manrope">{msg.text}</p>

                                {/* Clean Collapsible Orchestration Summary */}
                                {msg.orchestrationTrace && msg.orchestrationTrace.length > 0 && (
                                  <div className="pt-1.5 border-t border-slate-100">
                                    <button
                                      type="button"
                                      onClick={() => setExpandedTrace((prev) => ({ ...prev, [msg.id]: !prev[msg.id] }))}
                                      className="inline-flex items-center gap-1.5 text-[11px] text-slate-500 hover:text-indigo-600 font-mono transition-colors"
                                    >
                                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                      <span>{msg.orchestrationTrace.length} steps executed across specialists</span>
                                      <ChevronDown className={`w-3 h-3 transition-transform ${expandedTrace[msg.id] ? 'rotate-180' : ''}`} />
                                    </button>

                                    {expandedTrace[msg.id] && (
                                      <div className="mt-2.5 space-y-2 pl-2 border-l-2 border-indigo-100">
                                        {msg.orchestrationTrace.map((tr) => (
                                          <div key={tr.id} className="text-xs">
                                            <div className="flex items-center gap-2">
                                              <span className="font-poppins font-medium text-slate-800 text-[11px]">{tr.name}</span>
                                              <span className="text-[10px] text-slate-400 font-mono">({tr.agent})</span>
                                            </div>
                                            <p className="text-slate-500 text-[11px] font-manrope mt-0.5">{tr.description}</p>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}

                    {loading && (
                      <div className="flex items-center gap-2.5 text-xs font-manrope text-slate-500 pl-11">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                        <span>Thinking &amp; executing...</span>
                      </div>
                    )}
                  </div>
                </div>
              )}


        {/* View 2: Connectors & Google Gemini Model Management */}
        {activeTab === 'connectors' && (
          <div className="max-w-5xl mx-auto w-full space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-sora font-extrabold text-lg text-slate-900">Connectors &amp; AI Intelligence</h2>
                <p className="text-xs text-slate-500 font-manrope">
                  Live data pipelines feeding real context to the Chief Agent and specialist bots.
                </p>
              </div>
              <button
                onClick={fetchLiveData}
                className="px-3 py-1.5 text-xs font-poppins font-semibold rounded-xl bg-white border border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-50 shadow-xs flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Refresh Status</span>
              </button>
            </div>

            {/* Gemini LLM Card */}
            <div className="playful-card p-5 space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-600">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-sora font-bold text-slate-900 text-base">Google Gemini (2.5 Flash / Latest)</h3>
                      <span
                        className={`text-[10px] font-poppins font-bold px-2 py-0.5 rounded-full ${isGeminiLive
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                      >
                        {isGeminiLive ? 'ACTIVE (gemini-2.5-flash)' : 'FALLBACK MODE (No Key Set)'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 font-manrope mt-0.5">
                      Powers dynamic intent parsing, multi-agent reasoning decomposition, and conversational resume tailoring.
                    </p>
                  </div>
                </div>

                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-poppins font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 shrink-0"
                >
                  <span>Get Free Key</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              <div className="rounded-xl bg-slate-50 p-4 border border-slate-200 space-y-3">
                <label className="block text-xs font-poppins font-bold text-slate-800">
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
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-mono text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 shadow-2xs"
                    />
                  </div>
                  <button
                    onClick={handleSaveGeminiKey}
                    disabled={geminiSaving || !geminiKeyInput.trim()}
                    className="px-4 py-2 text-xs font-poppins font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white playful-button disabled:opacity-50 flex items-center gap-1.5 shrink-0 shadow-xs"
                  >
                    {geminiSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    <span>Verify &amp; Activate</span>
                  </button>
                </div>

                {geminiTestStatus && (
                  <div
                    className={`p-2.5 rounded-lg text-xs font-manrope flex items-center gap-2 ${geminiTestStatus.success
                        ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                        : 'bg-rose-50 border border-rose-200 text-rose-800'
                      }`}
                  >
                    {geminiTestStatus.success ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                    <span>{geminiTestStatus.message}</span>
                  </div>
                )}

                <p className="text-[11px] text-slate-500 font-manrope">
                  Tip: You can also set <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 text-indigo-700 font-mono">GEMINI_API_KEY=&quot;...&quot;</code> in the project root <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-700 font-mono">.env</code> file.
                </p>
              </div>
            </div>

            {/* Google Workspace (Gmail & Drive) Connector */}
            <div className="playful-card p-5 space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-600">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-sora font-bold text-slate-900 text-base">Google Workspace (Gmail &amp; Drive)</h3>
                      <span className={`text-[10px] font-poppins font-bold px-2 py-0.5 rounded-full ${
                        googleStatus?.connected ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}>
                        {googleStatus?.connected ? 'OAUTH 2.0 CONNECTED' : 'DISCONNECTED'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 font-manrope mt-0.5">
                      Ingests recruiter reach-outs from <strong>Stripe, Cloudflare</strong>, and indexes resume markdown files from Google Drive into Chief Ghost context.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={handleSyncGoogle}
                    disabled={googleSyncing}
                    className="px-3 py-1.5 text-xs font-poppins font-bold rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 shadow-xs playful-button flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${googleSyncing ? 'animate-spin' : ''}`} />
                    <span>{googleSyncing ? 'Syncing...' : 'Sync Now'}</span>
                  </button>
                  <button
                    onClick={() => { fetchGoogleData(); setGoogleInboxModal(true); }}
                    className="px-3 py-1.5 text-xs font-poppins font-bold rounded-xl bg-rose-600 hover:bg-rose-700 text-white shadow-xs playful-button flex items-center gap-1.5"
                  >
                    <Inbox className="w-3.5 h-3.5" />
                    <span>Inbox ({googleStatus?.unreadEmails || 0})</span>
                  </button>
                  <button
                    onClick={() => { fetchGoogleData(); setGoogleDriveModal(true); }}
                    className="px-3 py-1.5 text-xs font-poppins font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs playful-button flex items-center gap-1.5"
                  >
                    <HardDrive className="w-3.5 h-3.5" />
                    <span>Drive ({googleStatus?.indexedFilesCount || 0})</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-500 font-poppins text-[10px]">LINKED GOOGLE ACCOUNT</span>
                  <p className="font-poppins font-bold text-slate-900 mt-0.5 truncate">{googleStatus?.email || 'ry993494787@gmail.com'}</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-500 font-poppins text-[10px]">RECRUITER REACH-OUTS</span>
                  <p className="font-poppins font-bold text-emerald-700 mt-0.5">2 New (Stripe, Cloudflare)</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-500 font-poppins text-[10px]">DRIVE RESUME DOCUMENTS</span>
                  <p className="font-poppins font-bold text-indigo-700 mt-0.5">2 Ready for Vault Import</p>
                </div>
              </div>
            </div>

            {/* Greenhouse Career ATS Connector */}
            <div className="playful-card p-5 space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700">
                    <Briefcase className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-sora font-bold text-slate-900 text-base">Greenhouse Live Career API</h3>
                      <span className="text-[10px] font-poppins font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        LIVE REST API CONNECTED
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 font-manrope mt-0.5">
                      Direct public ATS scraper continuously querying open vacancies from <strong>Stripe, Cloudflare, Figma, GitHub</strong>.
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleSyncGreenhouse}
                  disabled={greenhouseSyncing}
                  className="px-3.5 py-2 text-xs font-poppins font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs playful-button flex items-center gap-1.5 shrink-0 disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${greenhouseSyncing ? 'animate-spin' : ''}`} />
                  <span>{greenhouseSyncing ? 'Scraping Live...' : 'Test Live Fetch'}</span>
                </button>
              </div>

              {greenhouseSyncResult && (
                <div className="p-3.5 rounded-xl bg-slate-50 border border-emerald-200 space-y-2 text-xs font-manrope">
                  <div className="flex items-center justify-between font-poppins font-bold text-emerald-700">
                    <span>{greenhouseSyncResult.message}</span>
                    <span>{greenhouseSyncResult.jobsFetched} Jobs Retrieved</span>
                  </div>
                  <div className="space-y-1.5 pt-1">
                    {greenhouseSyncResult.sampleJobs?.map((j: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between text-slate-700 text-[11px] bg-white p-2 rounded-lg border border-slate-200">
                        <span>
                          <strong className="text-slate-900">{j.company}</strong> — {j.title} ({j.location.join(', ')})
                        </span>
                        <a href={j.url} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">
                          View &rarr;
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-500 font-poppins text-[10px]">AUTH MODE</span>
                  <p className="font-poppins font-bold text-slate-900 mt-0.5">Public REST (Zero-Token)</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-500 font-poppins text-[10px]">COMPANIES TRACKED</span>
                  <p className="font-poppins font-bold text-slate-900 mt-0.5">Stripe, Figma, Cloudflare, GitHub</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-500 font-poppins text-[10px]">DEDUPLICATION</span>
                  <p className="font-poppins font-bold text-slate-900 mt-0.5">SHA-256 Content Hash</p>
                </div>
              </div>
            </div>

            {/* DuckDuckGo Web Search & Intelligence */}
            <div className="playful-card p-5 space-y-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-700">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-sora font-bold text-slate-900 text-base">DuckDuckGo Web Intelligence</h3>
                    <span className="text-[10px] font-poppins font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      LIVE UNMETERED API
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 font-manrope mt-0.5">
                    Live instant answers &amp; market price aggregator. Powers review summarization for the Shopping and Research Specialists.
                  </p>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 font-manrope">
                <strong className="text-slate-800">Privacy Policy:</strong> Zero cookies, zero search profiling. Safe queries dispatched directly via Gateway hook.
              </div>
            </div>

            {/* Financial Ledger (Read-Only) */}
            <div className="playful-card p-5 space-y-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-600">
                  <Wallet className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-sora font-bold text-slate-900 text-base">Discretionary Banking Ledger</h3>
                    <span className="text-[10px] font-poppins font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                      READ-ONLY ENFORCED
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 font-manrope mt-0.5">
                    Provides categorized monthly cashflow, recurring subscription detection, and purchase affordability evaluation.
                  </p>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 font-manrope">
                <strong className="text-slate-800">Security Guarantee:</strong> PolicyEngine strictly forbids any funds transfer (<code className="text-rose-700 font-mono bg-white px-1 py-0.5 rounded border border-slate-200">finance.transfer: FORBIDDEN</code>). Agents can only compute read-only affordability models.
              </div>
            </div>
          </div>
        )}

        {/* View 3: Finance Ledger */}
        {activeTab === 'finance' && (
          <div className="max-w-5xl mx-auto w-full space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-sora font-extrabold text-lg text-slate-900">Personal Financial Ledger</h2>
                <p className="text-xs text-slate-500 font-manrope">
                  Read-only ledger integration with automated affordability evaluation and recurring spend tracking.
                </p>
              </div>
              <div className="px-3 py-1 rounded-xl bg-white border border-slate-200 text-xs font-poppins text-emerald-700 flex items-center gap-1.5 shadow-xs">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Capability: finance.transactions.read</span>
              </div>
            </div>

            {financeOverview && (
              <div className="grid grid-cols-4 gap-3">
                <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs">
                  <span className="text-[11px] font-poppins text-slate-500 uppercase tracking-wider">Monthly Discretionary</span>
                  <p className="text-xl font-sora font-extrabold text-slate-900 mt-1">
                    ₹{(financeOverview.totalIncome ?? financeOverview.monthlyDiscretionaryBudget ?? 250000).toLocaleString()}
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs">
                  <span className="text-[11px] font-poppins text-slate-500 uppercase tracking-wider">Spent This Month</span>
                  <p className="text-xl font-sora font-extrabold text-rose-600 mt-1">
                    ₹{(financeOverview.totalExpense ?? financeOverview.currentMonthSpend ?? 0).toLocaleString()}
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs">
                  <span className="text-[11px] font-poppins text-slate-500 uppercase tracking-wider">Remaining Buffer</span>
                  <p className="text-xl font-sora font-extrabold text-emerald-600 mt-1">
                    ₹{(financeOverview.remainingDiscretionary ?? financeOverview.remainingAffordability ?? 245851).toLocaleString()}
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs">
                  <span className="text-[11px] font-poppins text-slate-500 uppercase tracking-wider">Recurring Monthly</span>
                  <p className="text-xl font-sora font-extrabold text-amber-600 mt-1">
                    ₹{(financeOverview.recurringCommitments ?? financeOverview.recurringMonthlyCommitments ?? 0).toLocaleString()}
                  </p>
                </div>
              </div>
            )}

            {/* Interactive Purchase Affordability Simulator */}
            <div className="playful-card p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-sora font-bold text-slate-900 text-base">Purchase Affordability Simulator</h3>
                  <p className="text-xs text-slate-600 font-manrope">
                    Test what the Finance Specialist advises for any potential purchase amount.
                  </p>
                </div>
                <span className="text-xs font-poppins font-semibold px-2.5 py-1 rounded-xl bg-slate-50 text-amber-800 border border-slate-200">
                  Deterministic Policy Evaluator
                </span>
              </div>

              <div className="flex items-center gap-4 pt-1">
                <div className="flex-1 space-y-1.5">
                  <div className="flex justify-between text-xs font-poppins text-slate-600">
                    <span>Target Purchase Price:</span>
                    <strong className="text-slate-900 font-mono">₹{affordabilitySimPrice.toLocaleString()}</strong>
                  </div>
                  <input
                    type="range"
                    min="5000"
                    max="180000"
                    step="5000"
                    value={affordabilitySimPrice}
                    onChange={(e) => setAffordabilitySimPrice(Number(e.target.value))}
                    className="w-full accent-indigo-600 cursor-pointer"
                  />
                </div>
              </div>

              {affordabilityResult && (
                <div
                  className={`p-4 rounded-xl border space-y-1.5 ${affordabilityResult.verdict === 'comfortable'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : affordabilityResult.verdict === 'stretch'
                        ? 'bg-amber-50 border-amber-200 text-amber-900'
                        : 'bg-rose-50 border-rose-200 text-rose-900'
                    }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-poppins font-bold px-2.5 py-0.5 rounded-full uppercase ${affordabilityResult.verdict === 'comfortable'
                          ? 'bg-emerald-600 text-white'
                          : affordabilityResult.verdict === 'stretch'
                            ? 'bg-amber-500 text-white'
                            : 'bg-rose-600 text-white'
                        }`}
                    >
                      Verdict: {affordabilityResult.verdict}
                    </span>
                    <span className="text-xs font-mono text-slate-600">
                      Discretionary Impact: {affordabilityResult.discretionaryBudgetImpactPct}%
                    </span>
                  </div>
                  <p className="text-xs font-manrope leading-relaxed">
                    {affordabilityResult.explanation}
                  </p>
                </div>
              )}
            </div>

            {/* Categorized Ledger Table */}
            <div className="playful-card p-5 space-y-3">
              <h3 className="font-sora font-bold text-slate-900 text-base">Recent Ledger Ingestions</h3>
              <div className="space-y-2">
                {transactions.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-emerald-500" />
                      <div>
                        <strong className="text-slate-900 font-poppins">{tx.description}</strong>
                        <span className="text-slate-500 text-[11px] block">{tx.category} • {tx.date}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <strong className="font-mono text-slate-900">₹{tx.amount.toLocaleString()}</strong>
                      {tx.isRecurring && (
                        <span className="text-[10px] font-poppins text-amber-700 block font-semibold">Recurring</span>
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
          <div className="max-w-5xl mx-auto w-full space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-sora font-extrabold text-lg text-slate-900">Shopping &amp; Product Scout</h2>
                <p className="text-xs text-slate-500 font-manrope">
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
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), executeShoppingSearch())}
                  placeholder="Enter product to scout (e.g. MacBook Air M2, Sony WH-1000XM5, Keychron Q1)..."
                  className="flex-1 bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-manrope text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 shadow-2xs"
                />
                <button
                  onClick={() => executeShoppingSearch()}
                  disabled={shoppingLoading}
                  className="px-4 py-2 text-xs font-poppins font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white playful-button shrink-0 flex items-center gap-1.5 transition-all shadow-xs"
                >
                  {shoppingLoading ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5" />
                  )}
                  <span>{shoppingLoading ? 'Scouting Market...' : 'Scout Product'}</span>
                </button>
              </div>

              {/* Quick Preset Pills */}
              <div className="flex items-center gap-2 text-xs overflow-x-auto pb-0.5">
                <span className="text-[11px] font-poppins text-slate-500">Quick tests:</span>
                {['Sony WH-1000XM5', 'MacBook Air M2', 'Keychron Q1 Max', 'iPad Air M2'].map((item) => (
                  <button
                    key={item}
                    disabled={shoppingLoading}
                    onClick={() => {
                      setShoppingQuery(item);
                      executeShoppingSearch(item);
                    }}
                    className="px-2.5 py-1 rounded-xl bg-white hover:bg-slate-50 disabled:opacity-50 text-slate-700 text-[11px] font-poppins font-medium border border-slate-200 shadow-2xs whitespace-nowrap transition-colors"
                  >
                    {item}
                  </button>
                ))}
              </div>

              {shoppingLoading && (
                <div className="p-8 rounded-xl bg-indigo-50/50 border border-indigo-200 flex flex-col items-center justify-center text-center space-y-3 animate-pulse">
                  <div className="w-12 h-12 rounded-full bg-indigo-100 border border-indigo-200 flex items-center justify-center">
                    <RefreshCw className="w-6 h-6 text-indigo-600 animate-spin" />
                  </div>
                  <div>
                    <h4 className="font-sora font-bold text-sm text-slate-900">Live Scouting Across Merchants...</h4>
                    <p className="text-xs text-slate-600 font-manrope mt-1">
                      Searching DuckDuckGo for live price points and aggregating comparison with Gemini 2.5 Flash.
                    </p>
                  </div>
                </div>
              )}

              {!shoppingLoading && shoppingResult && (
                <div className="space-y-4 pt-2">
                  <div className="flex items-center justify-between p-4 rounded-xl bg-white border border-slate-200/90 shadow-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-poppins text-slate-500 uppercase">Target Item</span>
                        <span className={`text-[10px] font-poppins font-bold px-2 py-0.2 rounded-full ${
                          shoppingResult.isLiveScouted
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                        }`}>
                          {shoppingResult.isLiveScouted ? 'LIVE SCOUTED (DUCKDUCKGO + GEMINI)' : 'CURATED BENCHMARK'}
                        </span>
                      </div>
                      <h3 className="font-sora font-bold text-slate-900 text-base mt-0.5">{shoppingResult.requestedProduct}</h3>
                      <p className="text-xs text-slate-600 font-manrope mt-1">{shoppingResult.crossAgentRecommendation}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-poppins text-slate-500 uppercase">Best Price</span>
                      <p className="text-xl font-sora font-extrabold text-emerald-600 mt-0.5">
                        ₹{shoppingResult.bestOffer?.price.toLocaleString()}
                      </p>
                      <span className="text-[10px] font-poppins text-slate-500">via {shoppingResult.bestOffer?.merchant}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-sora font-bold text-xs text-slate-900 uppercase tracking-wider">Merchant Price Comparisons</h4>
                    <div className="grid grid-cols-3 gap-3">
                      {shoppingResult.merchants?.map((m: any, idx: number) => (
                        <div key={idx} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5 text-xs">
                          <div className="flex items-center justify-between">
                            <strong className="text-slate-900 font-poppins">{m.merchant}</strong>
                            <span className="text-[10px] font-poppins text-emerald-700 font-semibold">{m.deliveryDays}d delivery</span>
                          </div>
                          <p className="font-mono text-base font-bold text-slate-900">₹{m.price.toLocaleString()}</p>
                          <span className={`text-[10px] font-poppins block ${m.inStock ? 'text-slate-500' : 'text-rose-600 font-semibold'}`}>
                            {m.inStock ? 'In Stock' : 'Limited Inventory'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2 pt-1">
                    <h4 className="font-sora font-bold text-xs text-slate-900 uppercase tracking-wider">Recommended Alternatives</h4>
                    <div className="space-y-2">
                      {shoppingResult.alternatives?.map((alt: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                          <div>
                            <strong className="text-slate-900 font-poppins">{alt.name}</strong>
                            <p className="text-slate-600 text-[11px] font-manrope mt-0.5">{alt.rationale}</p>
                          </div>
                          <div className="text-right">
                            <span className="font-mono text-slate-900 font-bold">₹{alt.price.toLocaleString()}</span>
                            <span className="text-[10px] font-poppins text-emerald-700 block font-bold">
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
          <div className="max-w-5xl mx-auto w-full space-y-6">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="font-sora font-extrabold text-lg text-slate-900">Live Career Matches</h2>
                <p className="text-xs text-slate-500 font-manrope">
                  Live Greenhouse ATS openings paired with tailored resumes without fact hallucination.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowProfileDrawer(!showProfileDrawer)}
                  className={`px-3.5 py-2 text-xs font-poppins font-bold rounded-xl border flex items-center gap-1.5 transition-all shadow-xs ${
                    showProfileDrawer
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-300'
                  }`}
                >
                  <User className="w-3.5 h-3.5 text-indigo-600" />
                  <span>My Profile &amp; Resumes</span>
                  {careerProfile && (
                    <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-bold">
                      {careerProfile.skills.length} skills • {careerProfile.resumes.length} resumes
                    </span>
                  )}
                </button>
                <button
                  onClick={handleTriggerJobPipeline}
                  disabled={loading}
                  className="px-3.5 py-2 text-xs font-poppins font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white playful-button flex items-center gap-1.5 disabled:opacity-50 shadow-xs"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                  <span>Scrape Greenhouse</span>
                </button>
              </div>
            </div>

            {/* Profile & Resume Vault Drawer */}
            {showProfileDrawer && careerProfile && (
              <div className="playful-card p-5 border border-indigo-200 bg-white shadow-sm space-y-5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-indigo-600" />
                    <h3 className="font-sora font-bold text-slate-900 text-sm">Career Profile &amp; Resume Vault</h3>
                  </div>
                  <button
                    onClick={handleSaveProfile}
                    disabled={savingProfile}
                    className="px-4 py-1.5 text-xs font-poppins font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white playful-button flex items-center gap-1.5 disabled:opacity-50 shadow-xs"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{savingProfile ? 'Saving & Re-scoring...' : 'Save & Re-score Jobs'}</span>
                  </button>
                </div>

                {/* Target Roles */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-poppins font-bold text-slate-800">Target Roles</label>
                    <span className="text-[10px] text-slate-500 font-manrope">Keywords matched against ATS job titles</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {careerProfile.targetRoles.map((role) => (
                      <span
                        key={role}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-xs text-slate-800 font-poppins"
                      >
                        {role}
                        <button
                          onClick={() => handleRemoveRole(role)}
                          className="text-slate-400 hover:text-rose-600 ml-1"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2 pt-1">
                    <input
                      type="text"
                      value={roleInput}
                      onChange={(e) => setRoleInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddRole())}
                      placeholder="Add target role (e.g. Distributed Systems Engineer)..."
                      className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 shadow-2xs"
                    />
                    <button
                      onClick={handleAddRole}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-xs font-poppins font-bold text-slate-700"
                    >
                      <Plus className="w-3.5 h-3.5 inline mr-1" />
                      Add Role
                    </button>
                  </div>
                </div>

                {/* Technical Skills */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-poppins font-bold text-slate-800">Technical Skills ({careerProfile.skills.length})</label>
                    <span className="text-[10px] text-slate-500 font-manrope">Weighted at 50% of the match algorithm</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 rounded-xl border border-slate-200">
                    {careerProfile.skills.map((skill) => (
                      <span
                        key={skill}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-xs text-indigo-700 font-poppins font-medium shadow-2xs"
                      >
                        {skill}
                        <button
                          onClick={() => handleRemoveSkill(skill)}
                          className="text-slate-400 hover:text-rose-600 ml-1"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2 pt-1">
                    <input
                      type="text"
                      value={skillInput}
                      onChange={(e) => setSkillInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSkill())}
                      placeholder="Add technical skill (e.g. Go, GraphQL, Kubernetes, Rust)..."
                      className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 shadow-2xs"
                    />
                    <button
                      onClick={handleAddSkill}
                      className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-xs font-poppins font-bold text-indigo-700"
                    >
                      <Plus className="w-3.5 h-3.5 inline mr-1" />
                      Add Skill
                    </button>
                  </div>
                </div>

                {/* Stored Resumes in Vault */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-poppins font-bold text-slate-800">Resume Vault ({careerProfile.resumes.length})</label>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => { fetchGoogleData(); setGoogleDriveModal(true); }}
                        className="text-xs font-poppins font-bold text-indigo-600 hover:underline flex items-center gap-1.5"
                      >
                        <HardDrive className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Import from Google Drive</span>
                      </button>
                      <button
                        onClick={() => setNewResumeModal(true)}
                        className="text-xs font-poppins font-bold text-slate-900 hover:text-indigo-600 flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Markdown</span>
                      </button>
                    </div>
                  </div>

                  {driveImportSuccess && (
                    <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-manrope flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-600" />
                      <span>{driveImportSuccess}</span>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-2.5">
                    {careerProfile.resumes.map((res) => (
                      <div key={res.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5 text-xs">
                        <div className="flex items-center justify-between">
                          <strong className="text-slate-900 font-poppins">{res.title}</strong>
                          <div className="flex items-center gap-1.5">
                            {res.isDefault && (
                              <span className="text-[10px] bg-indigo-50 text-indigo-700 px-1.5 py-0.2 rounded font-bold font-poppins border border-indigo-200">
                                Default
                              </span>
                            )}
                            {careerProfile.resumes.length > 1 && (
                              <button
                                onClick={() => handleDeleteResume(res.id)}
                                className="text-slate-400 hover:text-rose-600 p-0.5"
                                title="Delete resume"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                        <p className="text-slate-500 text-[11px] font-manrope">Target: {res.targetRole}</p>
                        <div className="flex flex-wrap gap-1 pt-1">
                          {res.tags?.slice(0, 4).map((t, i) => (
                            <span key={i} className="text-[10px] bg-white text-slate-700 px-1.5 py-0.2 rounded font-mono border border-slate-200">
                              {t}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {jobs.length === 0 ? (
              <div className="p-12 text-center text-slate-500 text-sm playful-card flex flex-col items-center gap-3 bg-white">
                <GhostMascot size="lg" mood="thinking" />
                <p>No jobs discovered yet. Click &apos;Run Ingestion Pipeline&apos; to scrape Greenhouse feeds!</p>
              </div>
            ) : (
              jobs.map((job) => (
                <div key={job.id} className="playful-card p-5 space-y-3.5 bg-white border border-slate-200/90 shadow-xs">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-sora font-bold text-slate-900 text-base">{job.title}</h3>
                        <span className="text-xs font-poppins font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
                          {job.matchScore}% Match
                        </span>
                      </div>
                      <p className="text-xs font-manrope text-slate-600 mt-1">
                        <strong className="text-slate-900">{job.company}</strong> • {job.location.join(', ')}{' '}
                        {job.remote ? '(Remote)' : ''} •{' '}
                        {job.minSalary ? `₹${(job.minSalary / 100000).toFixed(0)}–${(job.maxSalary! / 100000).toFixed(0)} LPA` : 'Competitive'} • Source: {job.source}
                      </p>
                    </div>

                    <div className="text-xs text-slate-500 font-poppins flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-amber-600" />
                      <span>Live match</span>
                    </div>
                  </div>

                  {job.matchBreakdown && (
                    <div className="text-xs bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                      <p className="font-sora font-bold text-emerald-700">Why this aligns:</p>
                      <ul className="list-disc list-inside space-y-1 text-slate-700 font-manrope">
                        {job.matchBreakdown.reasons.map((r, i) => (
                          <li key={i}>{r}</li>
                        ))}
                      </ul>

                      {job.matchBreakdown.concerns.length > 0 && (
                        <div className="pt-1.5 border-t border-slate-200">
                          <p className="font-sora font-bold text-amber-800">Considerations:</p>
                          <ul className="list-disc list-inside space-y-1 text-slate-600 font-manrope">
                            {job.matchBreakdown.concerns.map((c, i) => (
                              <li key={i}>{c}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-2 text-xs font-poppins text-slate-600">
                      <span>Tailored resume:</span>
                      <strong className="text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 font-mono">
                        {job.recommendedResumeId || 'Fullstack-AWS-v3.md'}
                      </strong>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handlePreviewResume(job)}
                        className="px-3 py-1.5 text-xs font-poppins font-medium rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 flex items-center gap-1.5 shadow-2xs transition-colors"
                      >
                        <FileText className="w-3.5 h-3.5 text-indigo-600" />
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
                        className="px-3.5 py-1.5 text-xs font-poppins font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs playful-button"
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
          <div className="max-w-5xl mx-auto w-full space-y-6">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="font-sora font-extrabold text-lg text-slate-900">Universal Safety Gate</h2>
                <p className="text-xs text-slate-500 font-manrope">
                  Principle 2.4: Human Control. High-risk agent actions stay blocked until approved.
                </p>
              </div>
              <button onClick={fetchLiveData} className="p-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:text-slate-900 shadow-xs">
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {approvals.length === 0 ? (
              <div className="p-12 text-center text-slate-500 text-sm playful-card flex flex-col items-center gap-3 bg-white">
                <GhostMascot size="lg" mood="happy" />
                <p>No actions pending approval. Ghost agents are operating within autonomous safety limits.</p>
              </div>
            ) : (
              approvals.map((app) => (
                <div
                  key={app.id}
                  className={`playful-card p-5 space-y-3.5 bg-white border shadow-xs ${app.status === 'pending'
                      ? 'border-amber-300'
                      : app.status === 'approved'
                        ? 'border-emerald-300'
                        : 'border-rose-300'
                    }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-poppins font-bold px-2.5 py-0.5 rounded-full ${app.status === 'pending'
                          ? 'bg-amber-100 text-amber-900 border border-amber-300'
                          : app.status === 'approved'
                            ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                            : 'bg-rose-100 text-rose-900 border border-rose-300'
                        }`}
                    >
                      {app.status.toUpperCase()}
                    </span>
                    <span className="text-xs font-mono text-slate-500">{app.actionType}</span>
                  </div>

                  <h3 className="font-sora font-bold text-slate-900 text-base">{app.title}</h3>
                  <p className="text-xs text-slate-600 font-manrope leading-relaxed">{app.description}</p>

                  {app.status === 'approved' && (
                    <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 space-y-1.5 text-xs">
                      <div className="flex items-center gap-2 font-poppins font-bold text-emerald-800">
                        <Check className="w-4 h-4" />
                        <span>Execution Confirmed &amp; Sealed</span>
                      </div>
                      <p className="font-manrope text-slate-700 text-[11px] leading-relaxed">
                        {app.executionResult?.details || 'Dispatched & cryptographically sealed application packet for Stripe (Senior Full Stack Developer) using verified resume Fullstack-AWS-v3.md. Status advanced to APPLIED.'}
                      </p>
                    </div>
                  )}

                  {app.status === 'pending' && (
                    <div className="flex gap-2.5 pt-2">
                      <button
                        onClick={() => handleDecideApproval(app.id, 'approve')}
                        className="px-4 py-2 text-xs font-poppins font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs playful-button"
                      >
                        Approve &amp; Execute
                      </button>
                      <button
                        onClick={() => handleDecideApproval(app.id, 'reject')}
                        className="px-4 py-2 text-xs font-poppins font-semibold rounded-xl bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 shadow-xs"
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
          <div className="max-w-5xl mx-auto w-full space-y-6">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="font-sora font-extrabold text-base text-slate-900">Immutable Event Ledger</h2>
                <p className="text-xs text-slate-500 font-manrope">
                  Principle 2.3: Every meaningful agent step, decision, and tool invocation is recorded directly in PostgreSQL.
                </p>
              </div>
              <button onClick={fetchLiveData} className="p-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:text-slate-900 shadow-xs">
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {auditEvents.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-sm playful-card bg-white">
                No events in ledger yet.
              </div>
            ) : (
              auditEvents.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs text-xs">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-slate-400 text-[11px]">
                      {new Date(item.timestamp).toLocaleTimeString()}
                    </span>
                    <span className="font-poppins font-bold text-indigo-600">
                      [{item.agentId || item.toolName || 'Chief'}]
                    </span>
                    <span className="text-slate-700 font-manrope">{item.rationale || `Executed ${item.eventType}`}</span>
                  </div>
                  <span className="font-poppins font-semibold text-[10px] bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded-full">
                    {item.eventType}
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* CLEAN MINIMAL INPUT BAR (Only on Assistant tab)                           */}
      {/* ========================================================================= */}
      {activeTab === 'chat' && (
        <div className="absolute bottom-6 left-0 right-0 max-w-2xl mx-auto px-6 z-20">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-3 bg-white border border-slate-200/90 rounded-2xl p-2 pl-4 shadow-lg focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100 transition-all"
          >
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ask anything or direct your assistants..."
              className="flex-1 bg-transparent border-0 text-slate-900 placeholder-slate-400 text-xs font-manrope focus:outline-none"
            />
            <button
              type="submit"
              disabled={loading || !inputValue.trim()}
              className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition-colors disabled:opacity-40"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}
    </main>

    {/* ========================================================================= */}
    {/* 3-PANE RIGHT CONTEXT & SERVICES DRAWER (Docked w-96 Panel)                */}
    {/* ========================================================================= */}
    {showContextDrawer && (
      <aside className="w-96 flex-shrink-0 bg-[#f8fafc] border-l border-slate-200/90 flex flex-col h-full overflow-hidden transition-all duration-200 z-10">
        {/* Drawer Header */}
        <div className="p-3.5 border-b border-slate-200/90 flex items-center justify-between flex-shrink-0 bg-white">
          <div className="flex items-center gap-2">
            <span className="font-sora font-semibold text-xs text-slate-900">LIVE CONTEXT &amp; SERVICES</span>
            <span className="px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 font-mono text-[10px] border border-indigo-200">
              4 Synced
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={fetchLiveData}
              title="Refresh Live Context"
              className="p-1 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setShowContextDrawer(false)}
              title="Collapse Drawer"
              className="p-1 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Drawer Stream: Single Scroll Container (Zero nested inner scrolls) */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* SECTION 1: Google Workspace (Gmail + Drive) */}
          <div className="p-3.5 rounded-xl bg-white border border-slate-200/90 shadow-xs space-y-2.5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-indigo-600" />
                <span className="font-mono text-[11px] font-semibold text-slate-900 uppercase tracking-wider">
                  GOOGLE WORKSPACE
                </span>
              </div>
              <span className="text-[10px] font-mono text-emerald-700 font-semibold">REALTIME</span>
            </div>

            {/* Gmail Item Preview */}
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
              <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
                <span className="flex items-center gap-1 text-rose-600 font-medium">
                  <Mail className="w-3 h-3" /> GMAIL
                </span>
                <span>{googleStatus?.unreadEmails || 0} unread</span>
              </div>
              <div className="text-xs font-poppins font-medium text-slate-900 truncate">
                {gmailMessages[0]?.subject || 'Recruiter: Technical Lead & AI Architecture'}
              </div>
              <p className="text-[11px] font-manrope text-slate-500 line-clamp-1">
                {gmailMessages[0]?.snippet || 'Inbound interest regarding your background in distributed systems...'}
              </p>
              <div className="pt-1.5 flex justify-end">
                <button
                  onClick={() => {
                    setInputValue(`Draft a reply to ${gmailMessages[0]?.fromName || 'the recruiter'} regarding ${gmailMessages[0]?.subject || 'the role'}`);
                    setActiveTab('chat');
                  }}
                  className="text-[10px] font-poppins font-medium px-2 py-0.5 rounded bg-white hover:bg-slate-50 text-indigo-700 border border-indigo-200 shadow-2xs transition-colors"
                >
                  Draft Reply &rarr;
                </button>
              </div>
            </div>

            {/* Drive Resume Vault Preview */}
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
              <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
                <span className="flex items-center gap-1 text-indigo-600 font-medium">
                  <HardDrive className="w-3 h-3" /> DRIVE VAULT
                </span>
                <span>{googleStatus?.indexedFilesCount || 0} files indexed</span>
              </div>
              <div className="text-xs font-poppins font-medium text-slate-900 truncate">
                {driveFiles[0]?.name || 'Rupesh_Yadav_Staff_AI_Engineer_2025.md'}
              </div>
              <div className="text-[10px] font-mono text-emerald-700 font-medium">
                Ingested into PostgreSQL Resume Vault
              </div>
              <div className="pt-1.5 flex justify-end">
                <button
                  onClick={() => setGoogleDriveModal(true)}
                  className="text-[10px] font-poppins font-medium px-2 py-0.5 rounded bg-white hover:bg-slate-50 text-indigo-700 border border-indigo-200 shadow-2xs transition-colors"
                >
                  Import Drive Resumes &rarr;
                </button>
              </div>
            </div>
          </div>

          {/* SECTION 2: Greenhouse ATS Pipeline */}
          <div className="p-3.5 rounded-xl bg-white border border-slate-200/90 shadow-xs space-y-2.5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-indigo-600" />
                <span className="font-mono text-[11px] font-semibold text-slate-900 uppercase tracking-wider">
                  GREENHOUSE ATS
                </span>
              </div>
              <span className="text-[10px] font-mono text-slate-500">{jobs.length} ACTIVE</span>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-poppins font-bold text-slate-900">
                  {jobs[0]?.title || 'Staff AI Systems Lead'}
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
                  {jobs[0]?.matchScore || 98}% match
                </span>
              </div>
              <div className="text-[11px] font-manrope text-slate-500">
                {jobs[0]?.company || 'Stripe'} • {jobs[0]?.remote ? 'Remote' : 'Hybrid'}
              </div>
              <div className="pt-1.5 flex justify-end gap-1.5">
                <button
                  onClick={() => {
                    if (jobs[0]) handlePreviewResume(jobs[0]);
                  }}
                  className="text-[10px] font-poppins font-medium px-2 py-0.5 rounded bg-white hover:bg-slate-50 text-indigo-700 border border-indigo-200 shadow-2xs transition-colors"
                >
                  Tailor Resume
                </button>
              </div>
            </div>
          </div>

          {/* SECTION 3: Capital & Discretionary Headroom */}
          <div className="p-3.5 rounded-xl bg-white border border-slate-200/90 shadow-xs space-y-2.5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Wallet className="w-4 h-4 text-emerald-600" />
                <span className="font-mono text-[11px] font-semibold text-slate-900 uppercase tracking-wider">
                  DISCRETIONARY HEADROOM
                </span>
              </div>
              <span className="text-[10px] font-mono text-emerald-700 font-semibold">SAFE</span>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Monthly Reserve:</span>
                <strong className="text-slate-900 font-mono">
                  ₹{financeOverview?.monthlyDiscretionaryBudget?.toLocaleString() || '2,50,000'}
                </strong>
              </div>
              <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500"
                  style={{
                    width: `${Math.min(
                      100,
                      ((financeOverview?.currentMonthSpend || 58000) /
                        (financeOverview?.monthlyDiscretionaryBudget || 250000)) *
                        100
                    )}%`,
                  }}
                />
              </div>
              <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
                <span>Spent: ₹{financeOverview?.currentMonthSpend?.toLocaleString() || '58,000'}</span>
                <span className="text-emerald-700 font-medium">
                  Remaining: ₹{financeOverview?.remainingAffordability?.toLocaleString() || '1,92,000'}
                </span>
              </div>
            </div>
          </div>

          {/* SECTION 4: Zero-Trust Security Gateway */}
          <div className="p-3.5 rounded-xl bg-white border border-slate-200/90 shadow-xs space-y-2.5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-600" />
                <span className="font-mono text-[11px] font-semibold text-slate-900 uppercase tracking-wider">
                  ZERO-TRUST GATEWAY
                </span>
              </div>
              <span className="text-[10px] font-mono text-amber-700 font-semibold">STRICT</span>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-700">Pending Approvals:</span>
                <span className="font-mono font-bold text-amber-800">
                  {approvals.filter((a) => a.status === 'pending').length}
                </span>
              </div>
              <p className="text-[10px] text-slate-500 font-manrope">
                Least-privilege boundary active. High-risk execution blocked until human consent.
              </p>
              {approvals.filter((a) => a.status === 'pending').length > 0 && (
                <div className="pt-1">
                  <button
                    onClick={() => setActiveTab('approvals')}
                    className="w-full py-1 text-[11px] font-poppins font-bold rounded bg-amber-500 hover:bg-amber-600 text-white transition-colors shadow-xs"
                  >
                    Review Pending Actions
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>
    )}
  </div>
</div>

      {/* Tailored Resume & Outreach Pitch Modal */}
      {selectedResumeModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
              <div>
                <h3 className="font-sora font-bold text-slate-900 text-sm">Tailored Application Package</h3>
                <p className="text-xs font-manrope text-slate-500">
                  Target: <strong className="text-slate-800">{selectedResumeModal.jobTitle}</strong> at <strong className="text-indigo-600">{selectedResumeModal.company}</strong>
                </p>
              </div>
              <button
                onClick={() => setSelectedResumeModal(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 bg-white text-xs">
              {/* AI Outreach Pitch */}
              {selectedResumeModal.outreachPitch && (
                <div className="p-4 rounded-xl bg-indigo-50/50 border border-indigo-200/70 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-sora font-bold text-xs text-indigo-700 flex items-center gap-1.5 uppercase tracking-wider">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                      AI Outreach Pitch to Hiring Manager
                    </span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(selectedResumeModal.outreachPitch || '');
                        setCopiedPitch(true);
                        setTimeout(() => setCopiedPitch(false), 2000);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-[11px] font-poppins font-bold flex items-center gap-1 shadow-xs transition-colors"
                    >
                      {copiedPitch ? <CheckCheck className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-indigo-600" />}
                      <span>{copiedPitch ? 'Copied!' : 'Copy Pitch'}</span>
                    </button>
                  </div>
                  <p className="font-manrope text-slate-700 text-xs leading-relaxed italic bg-white p-3 rounded-lg border border-indigo-100 shadow-xs">
                    &quot;{selectedResumeModal.outreachPitch}&quot;
                  </p>
                </div>
              )}

              {/* Highlighted Competencies */}
              {selectedResumeModal.emphasizedSkills && selectedResumeModal.emphasizedSkills.length > 0 && (
                <div className="space-y-1.5">
                  <span className="font-sora font-bold text-[11px] text-slate-600 uppercase tracking-wider">
                    Highlighted Competencies for {selectedResumeModal.company}
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedResumeModal.emphasizedSkills.map((sk, idx) => (
                      <span key={idx} className="px-2.5 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 font-poppins text-[11px] font-bold">
                        {sk}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Rationale Notice */}
              {selectedResumeModal.rationale && (
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-600 font-manrope">
                  <strong className="text-slate-800">Verification:</strong> {selectedResumeModal.rationale}
                </div>
              )}

              {/* Tailored Markdown Body */}
              <div className="space-y-1">
                <span className="font-sora font-bold text-[11px] text-slate-600 uppercase tracking-wider">
                  Tailored Resume Document (Markdown)
                </span>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 font-mono text-[11px] text-slate-800 leading-relaxed whitespace-pre-wrap max-h-64 overflow-y-auto">
                  {selectedResumeModal.content}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50/70 flex items-center justify-between">
              <span className="text-[10px] text-slate-500 font-manrope">
                Guaranteed: No facts or employment history are fabricated.
              </span>
              <button
                onClick={() => setSelectedResumeModal(null)}
                className="px-4 py-2 text-xs font-poppins font-bold rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-xs transition-colors"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Resume Modal */}
      {newResumeModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-xl w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-sora font-bold text-slate-900 text-sm">Add New Resume to Vault</h3>
              <button onClick={() => setNewResumeModal(false)} className="text-slate-400 hover:text-slate-700 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-poppins font-bold mb-1">Resume Title / File Name</label>
                <input
                  type="text"
                  value={newResumeTitle}
                  onChange={(e) => setNewResumeTitle(e.target.value)}
                  placeholder="e.g. Distributed-Systems-v1.md"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-poppins font-bold mb-1">Target Role Category</label>
                <input
                  type="text"
                  value={newResumeRole}
                  onChange={(e) => setNewResumeRole(e.target.value)}
                  placeholder="e.g. Backend Engineer or Full Stack Developer"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-poppins font-bold mb-1">Resume Markdown Content</label>
                <textarea
                  value={newResumeContent}
                  onChange={(e) => setNewResumeContent(e.target.value)}
                  rows={8}
                  placeholder="Paste your resume markdown here (e.g. ## Experience&#10;- Built microservices...)"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-mono text-[11px] text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                onClick={() => setNewResumeModal(false)}
                className="px-4 py-2 text-xs font-poppins font-semibold rounded-xl bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateResume}
                disabled={!newResumeTitle.trim() || !newResumeContent.trim()}
                className="px-4 py-2 text-xs font-poppins font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs disabled:opacity-50 transition-colors"
              >
                Save to Vault
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Authentication & Profile Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-indigo-600" />
                <h3 className="font-sora font-bold text-slate-900 text-base">Operator Authentication</h3>
              </div>
              <button onClick={() => setShowAuthModal(false)} className="text-slate-400 hover:text-slate-700 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Demo Switcher */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <span className="text-[10px] font-poppins font-bold text-slate-500 uppercase tracking-wider block">
                Quick Switch Operators
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => handleSwitchUser('user-rupesh')}
                  className={`flex-1 p-2 rounded-xl border text-left flex items-center gap-2 transition-all ${
                    currentUser?.id === 'user-rupesh'
                      ? 'bg-indigo-50 border-indigo-300 text-indigo-900 shadow-xs'
                      : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700'
                  }`}
                >
                  <img
                    src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&h=120&q=80"
                    alt="Rupesh"
                    className="w-7 h-7 rounded-full object-cover shrink-0"
                  />
                  <div className="overflow-hidden">
                    <p className="font-poppins font-bold text-xs truncate">Rupesh Yadav</p>
                    <p className="text-[10px] text-slate-500 font-manrope truncate">Google Linked</p>
                  </div>
                </button>

                <button
                  onClick={() => handleSwitchUser('user-alex')}
                  className={`flex-1 p-2 rounded-xl border text-left flex items-center gap-2 transition-all ${
                    currentUser?.id === 'user-alex'
                      ? 'bg-indigo-50 border-indigo-300 text-indigo-900 shadow-xs'
                      : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700'
                  }`}
                >
                  <img
                    src="https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=120&h=120&q=80"
                    alt="Alex"
                    className="w-7 h-7 rounded-full object-cover shrink-0"
                  />
                  <div className="overflow-hidden">
                    <p className="font-poppins font-bold text-xs truncate">Alex Chen</p>
                    <p className="text-[10px] text-slate-500 font-manrope truncate">Designer</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Login / Sign Up Tabs */}
            <div className="flex border-b border-slate-200">
              <button
                onClick={() => setAuthMode('login')}
                className={`flex-1 pb-2 font-poppins text-xs font-bold transition-all border-b-2 ${
                  authMode === 'login'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Log In
              </button>
              <button
                onClick={() => setAuthMode('signup')}
                className={`flex-1 pb-2 font-poppins text-xs font-bold transition-all border-b-2 ${
                  authMode === 'signup'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Create Account
              </button>
            </div>

            {authError && (
              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-manrope">
                {authError}
              </div>
            )}

            <div className="space-y-3 text-xs">
              {authMode === 'signup' && (
                <div>
                  <label className="block text-slate-700 font-poppins font-bold mb-1">Full Name</label>
                  <input
                    type="text"
                    value={authNameInput}
                    onChange={(e) => setAuthNameInput(e.target.value)}
                    placeholder="e.g. Rupesh Yadav"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
                  />
                </div>
              )}

              <div>
                <label className="block text-slate-700 font-poppins font-bold mb-1">Email Address</label>
                <input
                  type="email"
                  value={authEmailInput}
                  onChange={(e) => setAuthEmailInput(e.target.value)}
                  placeholder="e.g. ry993494787@gmail.com"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
                />
              </div>

              {authMode === 'signup' && (
                <div>
                  <label className="block text-slate-700 font-poppins font-bold mb-1">Engineering Title</label>
                  <input
                    type="text"
                    value={authTitleInput}
                    onChange={(e) => setAuthTitleInput(e.target.value)}
                    placeholder="e.g. Senior Full Stack Engineer"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
                  />
                </div>
              )}
            </div>

            <div className="pt-2">
              {authMode === 'login' ? (
                <button
                  onClick={() => handleLogin(authEmailInput || 'ry993494787@gmail.com')}
                  className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-poppins font-bold text-xs shadow-xs transition-colors"
                >
                  Log In &amp; Sync Context
                </button>
              ) : (
                <button
                  onClick={() => handleSignup(authNameInput, authEmailInput, authTitleInput)}
                  disabled={!authNameInput.trim() || !authEmailInput.trim()}
                  className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-poppins font-bold text-xs shadow-xs disabled:opacity-50 transition-colors"
                >
                  Create Account &amp; Initialize OS
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Gmail Inbox Modal */}
      {googleInboxModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-indigo-600" />
                <div>
                  <h3 className="font-sora font-bold text-slate-900 text-sm">Gmail Recruiter &amp; Primary Inbox</h3>
                  <p className="text-[11px] text-slate-500 font-manrope">
                    Linked Google Account: <strong className="text-slate-800">{googleStatus?.email}</strong>
                  </p>
                </div>
              </div>
              <button onClick={() => setGoogleInboxModal(false)} className="text-slate-400 hover:text-slate-700 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-3 bg-white text-xs">
              {gmailMessages.length === 0 ? (
                <div className="text-center py-8 text-slate-400">Loading messages from Google Workspace...</div>
              ) : (
                gmailMessages.map((msg) => (
                  <div
                    key={msg.id}
                    onClick={() => setSelectedEmailDetail(selectedEmailDetail?.id === msg.id ? null : msg)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                      msg.isUnread
                        ? 'bg-indigo-50/30 border-indigo-200 hover:border-indigo-400 shadow-xs'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {msg.isUnread && (
                          <span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0" />
                        )}
                        <strong className="text-slate-900 font-poppins">{msg.fromName}</strong>
                        {msg.company && (
                          <span className="text-[10px] font-poppins font-bold px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                            {msg.company}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-mono text-slate-400 shrink-0">
                        {new Date(msg.date).toLocaleDateString()}
                      </span>
                    </div>

                    <h4 className="font-sora font-bold text-slate-900 text-xs mt-1.5">{msg.subject}</h4>
                    <p className="text-slate-600 font-manrope text-[11px] mt-1 line-clamp-2">{msg.snippet}</p>

                    {selectedEmailDetail?.id === msg.id && (
                      <div className="mt-3 pt-3 border-t border-slate-200 space-y-3">
                        <div className="p-3 rounded-lg bg-slate-50 text-[11px] font-manrope text-slate-800 whitespace-pre-wrap leading-relaxed border border-slate-200">
                          {msg.bodyText}
                        </div>
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setInputValue(`Draft a reply to ${msg.fromName} from ${msg.company || 'the team'} confirming my interest in the ${msg.subject} discussion`);
                              setGoogleInboxModal(false);
                              setActiveTab('chat');
                            }}
                            className="px-3 py-1.5 text-xs font-poppins font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs flex items-center gap-1.5 transition-colors"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Draft Reply with Chief</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="p-3 border-t border-slate-200 bg-slate-50/70 flex items-center justify-between">
              <span className="text-[10px] text-slate-500 font-manrope">
                Least privilege: Communication Agent has read &amp; draft permissions. Email dispatch requires manual safety gate approval.
              </span>
              <button
                onClick={() => setGoogleInboxModal(false)}
                className="px-4 py-1.5 text-xs font-poppins font-bold rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-xs transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Google Drive Files Modal */}
      {googleDriveModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HardDrive className="w-5 h-5 text-indigo-600" />
                <div>
                  <h3 className="font-sora font-bold text-slate-900 text-sm">Google Drive Indexed Documents</h3>
                  <p className="text-[11px] text-slate-500 font-manrope">
                    Files discovered in Google Drive for <strong className="text-slate-800">{googleStatus?.email}</strong>
                  </p>
                </div>
              </div>
              <button onClick={() => setGoogleDriveModal(false)} className="text-slate-400 hover:text-slate-700 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-3 bg-white text-xs">
              {driveFiles.length === 0 ? (
                <div className="text-center py-8 text-slate-400">Loading Google Drive documents...</div>
              ) : (
                driveFiles.map((file) => (
                  <div
                    key={file.id}
                    className="p-3.5 rounded-xl bg-white border border-slate-200 flex items-center justify-between hover:border-slate-300 transition-colors shadow-xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-slate-100 border border-slate-200 text-indigo-600">
                        {file.fileType === 'resume' ? <FileText className="w-4 h-4" /> : <Folder className="w-4 h-4" />}
                      </div>
                      <div>
                        <h4 className="font-sora font-bold text-slate-900 text-xs">{file.name}</h4>
                        <p className="text-slate-500 text-[10px] font-manrope mt-0.5">
                          Type: <span className="uppercase text-slate-700 font-mono">{file.fileType}</span> • {(file.sizeBytes / 1024).toFixed(1)} KB • Modified {new Date(file.lastModified).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {file.fileType === 'resume' && (
                        <button
                          onClick={() => handleImportDriveResume(file.id)}
                          disabled={importingDriveFileId === file.id}
                          className="px-3 py-1.5 text-xs font-poppins font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs flex items-center gap-1.5 disabled:opacity-50 transition-colors"
                        >
                          {importingDriveFileId === file.id ? (
                            <RefreshCw className="w-3 h-3 animate-spin" />
                          ) : (
                            <Download className="w-3 h-3" />
                          )}
                          <span>{importingDriveFileId === file.id ? 'Importing...' : 'Import to Vault'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-3 border-t border-slate-200 bg-slate-50/70 flex items-center justify-between">
              <span className="text-[10px] text-slate-500 font-manrope">
                Click &quot;Import to Vault&quot; to ingest resume markdown into your Career Profile.
              </span>
              <button
                onClick={() => setGoogleDriveModal(false)}
                className="px-4 py-1.5 text-xs font-poppins font-bold rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-xs transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
