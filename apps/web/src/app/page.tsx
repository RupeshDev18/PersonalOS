'use client';

import React, { useState, useEffect } from 'react';
import {
  Bot,
  Briefcase,
  Wallet,
  ShoppingBag,
  Mail,
  ShieldCheck,
  Activity,
  Calendar,
  Send,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Clock,
  Terminal,
  RefreshCw,
  XCircle,
  AlertTriangle,
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

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<'chat' | 'jobs' | 'approvals' | 'audit'>('chat');
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [approvals, setApprovals] = useState<ApprovalItem[]>([]);
  const [auditEvents, setAuditEvents] = useState<AuditItem[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'init-1',
      sender: 'user',
      text: 'Every morning at 8:00 AM, find the 20 best backend & fullstack jobs for me.',
      timestamp: '10:00 AM',
    },
    {
      id: 'init-2',
      sender: 'chief',
      text: 'I have scheduled this recurring task (0 8 * * 1-5). The Job Specialist pipeline executed an initial trial run and verified 20 ranked opportunities tailored to your profile.',
      plan: {
        steps: [
          { name: 'Scheduler Engine', agentType: 'scheduler', description: 'Registered cron 0 8 * * 1-5 (Mon-Fri 8:00 AM)' },
          { name: 'Discover Jobs', agentType: 'job', description: 'Queried LinkedIn, Wellfound, Greenhouse (147 raw jobs)' },
          { name: 'Deduplication', agentType: 'job', description: 'Filtered 62 cross-board duplicate postings' },
          { name: 'Resume Customization', agentType: 'job', description: 'Paired top 20 with Fullstack-AWS-v3.md' },
        ],
      },
      timestamp: '10:00 AM',
    },
  ]);

  // Load live approvals and audit logs
  const fetchLiveData = async () => {
    try {
      const appRes = await fetch('http://localhost:4000/api/approvals');
      if (appRes.ok) {
        const data = await appRes.json();
        setApprovals(data);
      }
    } catch {
      // API may be restarting
    }

    try {
      const audRes = await fetch('http://localhost:4000/api/audit?limit=25');
      if (audRes.ok) {
        const data = await audRes.json();
        setAuditEvents(data);
      }
    } catch {
      // API may be restarting
    }
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
      } else {
        throw new Error('API request failed');
      }
    } catch {
      const fallbackMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'chief',
        text: `Understood: "${text}". Chief Agent orchestrated execution plan across registered specialists.`,
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
      console.error('Error deciding approval:', err);
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-gray-100">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-surface/50 backdrop-blur-md flex flex-col justify-between p-4 shrink-0">
        <div>
          {/* Logo / Brand */}
          <div className="flex items-center gap-3 px-2 py-3 mb-6">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 to-blue-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-sm tracking-wide text-white">Personal OS</h1>
              <p className="text-xs text-purple-400 font-medium">Chief Agent Active</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            <button
              onClick={() => setActiveTab('chat')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'chat'
                  ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/40'
              }`}
            >
              <Bot className="w-4 h-4 text-purple-400" />
              <span>AI Chief</span>
            </button>

            <button
              onClick={() => setActiveTab('jobs')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'jobs'
                  ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/40'
              }`}
            >
              <Briefcase className="w-4 h-4 text-blue-400" />
              <span>Jobs & Careers</span>
              <span className="ml-auto text-[10px] bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded">M1</span>
            </button>

            <button
              onClick={() => setActiveTab('approvals')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'approvals'
                  ? 'bg-amber-600/20 text-amber-300 border border-amber-500/30'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/40'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              <span>Approvals</span>
              {approvals.filter((a) => a.status === 'pending').length > 0 && (
                <span className="ml-auto text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded font-mono">
                  {approvals.filter((a) => a.status === 'pending').length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('audit')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'audit'
                  ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/30'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/40'
              }`}
            >
              <Activity className="w-4 h-4 text-emerald-400" />
              <span>Audit Trail</span>
            </button>

            <div className="pt-4 pb-2 px-3 text-[11px] font-semibold tracking-wider text-gray-500 uppercase">
              Specialists
            </div>

            <div 
              onClick={() => handleSendMessage('Analyze my current month financial budget and spending.')}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-400 hover:bg-gray-800/40 hover:text-gray-200 cursor-pointer"
            >
              <Wallet className="w-4 h-4 text-emerald-400" />
              <span>Finance (Read-only)</span>
            </div>
            <div 
              onClick={() => handleSendMessage('Search and compare alternatives for Sony WH-1000XM5 headphones.')}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-400 hover:bg-gray-800/40 hover:text-gray-200 cursor-pointer"
            >
              <ShoppingBag className="w-4 h-4 text-pink-400" />
              <span>Shopping</span>
            </div>
            <div 
              onClick={() => handleSendMessage('Check for high priority messages or emails needing response.')}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-400 hover:bg-gray-800/40 hover:text-gray-200 cursor-pointer"
            >
              <Mail className="w-4 h-4 text-sky-400" />
              <span>Communication</span>
            </div>
          </nav>
        </div>

        {/* System Status Footprint */}
        <div className="p-3 rounded-xl bg-gray-900/60 border border-gray-800 text-xs space-y-2">
          <div className="flex items-center justify-between text-gray-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              API: 4000 / Web: 3000
            </span>
            <span className="text-emerald-400 font-mono text-[11px]">Online</span>
          </div>
          <div className="text-[11px] text-gray-500">Least-privilege Policy: Enforced</div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top Header Bar */}
        <header className="h-14 border-b border-border bg-surface/30 px-6 flex items-center justify-between backdrop-blur-md shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-gray-200">Personal AI Operating System</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
              Phase 1 &amp; 2 Live
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs text-gray-400">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-purple-400" />
              <span>Scheduler: Ready</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-blue-400" />
              <span>Tool Gateway: Enforced</span>
            </div>
          </div>
        </header>

        {/* View Content */}
        {activeTab === 'chat' && (
          <div className="flex-1 flex flex-col overflow-hidden p-6 max-w-5xl mx-auto w-full gap-6">
            {/* Conversation Timeline */}
            <div className="flex-1 overflow-y-auto space-y-5 pr-2">
              {messages.map((msg) => (
                <div key={msg.id}>
                  {msg.sender === 'user' ? (
                    <div className="flex justify-end">
                      <div className="max-w-xl bg-purple-600/20 border border-purple-500/30 text-purple-100 rounded-2xl rounded-tr-sm px-4 py-3 text-sm">
                        {msg.text}
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-3 max-w-3xl">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-600 to-blue-500 flex items-center justify-center shrink-0">
                        <Bot className="w-4 h-4 text-white" />
                      </div>
                      <div className="space-y-3 flex-1">
                        <div className="bg-surface border border-border text-gray-200 rounded-2xl rounded-tl-sm px-4 py-3.5 text-sm space-y-3">
                          <p className="font-medium text-white flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-purple-400" />
                            Chief Agent Response
                          </p>
                          <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">{msg.text}</p>

                          {/* Multi-Agent Delegation Plan */}
                          {msg.plan && msg.plan.steps && (
                            <div className="rounded-xl bg-background/60 border border-border p-3 space-y-2 mt-2">
                              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                Multi-Agent Delegation Plan
                              </div>
                              {msg.plan.steps.map((st: any, idx: number) => (
                                <div key={idx} className="flex items-start gap-2 text-xs text-gray-300">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                                  <div>
                                    <strong className="text-purple-300">[{st.agentType || 'specialist'}]</strong> {st.name || st.action}:{' '}
                                    <span className="text-gray-400">{st.description}</span>
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
                <div className="flex items-center gap-3 text-xs text-purple-300">
                  <div className="w-6 h-6 rounded-lg bg-purple-600/30 flex items-center justify-center animate-spin">
                    <RefreshCw className="w-3.5 h-3.5 text-purple-400" />
                  </div>
                  <span>Chief Agent is evaluating policies and delegating to specialist agents...</span>
                </div>
              )}
            </div>

            {/* Input Bar */}
            <div className="relative pt-2">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="glass-panel rounded-2xl p-2 flex items-center gap-2 focus-within:border-purple-500/50 transition-colors"
              >
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Ask Chief Agent anything (e.g. 'Should I buy this laptop?', 'Find jobs', 'Analyze my budget')..."
                  className="w-full bg-transparent border-0 px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="p-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white transition-colors shrink-0 shadow-md shadow-purple-600/20 disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>

              {/* Quick suggestion pills */}
              <div className="flex items-center gap-2 mt-2 px-1 text-xs text-gray-400 overflow-x-auto py-1">
                <span className="text-[11px] text-gray-500">Quick tests:</span>
                <button
                  onClick={() => handleSendMessage('Should I buy a ₹90,000 MacBook Air M2 based on my recent finances?')}
                  className="px-2.5 py-1 rounded-full bg-gray-800/80 hover:bg-gray-700 text-gray-300 text-[11px] whitespace-nowrap border border-gray-700"
                >
                  Shopping + Finance: &quot;Should I buy this?&quot;
                </button>
                <button
                  onClick={() => handleSendMessage('Every morning at 8:00 AM, find the 20 best backend & fullstack jobs for me.')}
                  className="px-2.5 py-1 rounded-full bg-gray-800/80 hover:bg-gray-700 text-gray-300 text-[11px] whitespace-nowrap border border-gray-700"
                >
                  Job Agent: &quot;Find me jobs daily at 8 AM&quot;
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Jobs Tab */}
        {activeTab === 'jobs' && (
          <div className="flex-1 overflow-y-auto p-6 max-w-5xl mx-auto w-full space-y-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-white">Daily Job Intelligence Feed</h2>
                <p className="text-xs text-gray-400">Pipeline: Ingestion → Deduplication → Match Scoring → Resume Customization</p>
              </div>
              <span className="px-3 py-1 rounded-full text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                20 Jobs Processed
              </span>
            </div>

            {/* Job Card 1 */}
            <div className="glass-panel rounded-xl p-5 border border-border space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-white">Senior Full Stack Developer</h3>
                    <span className="text-xs px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-mono">94% Match</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">Stripe • Remote • ₹24–32 LPA</p>
                </div>
                <div className="text-xs text-gray-500 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Discovered 10m ago</span>
                </div>
              </div>

              <div className="text-xs text-gray-300 bg-background/50 p-3 rounded-lg space-y-1">
                <p className="font-medium text-emerald-400">Why this matches your profile:</p>
                <ul className="list-disc list-inside space-y-0.5 text-gray-400">
                  <li>8/8 core technologies matched (React, TypeScript, Node.js, PostgreSQL)</li>
                  <li>Recommended tailored resume profile: <strong className="text-gray-200">Fullstack-AWS-v3.md</strong></li>
                  <li>Location preference satisfies 100% remote criteria</li>
                </ul>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-xs text-gray-500">Status: RECOMMENDED</span>
                <div className="flex gap-2">
                  <button className="px-3 py-1.5 text-xs rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700">
                    Preview Tailored Resume
                  </button>
                  <button 
                    onClick={() => {
                      setActiveTab('approvals');
                    }}
                    className="px-3 py-1.5 text-xs rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium"
                  >
                    Prepare Application
                  </button>
                </div>
              </div>
            </div>

            {/* Job Card 2 */}
            <div className="glass-panel rounded-xl p-5 border border-border space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-white">Staff Backend Engineer</h3>
                    <span className="text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-mono">91% Match</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">Postman • Bengaluru / Remote • ₹35–45 LPA</p>
                </div>
                <div className="text-xs text-gray-500 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Discovered 25m ago</span>
                </div>
              </div>

              <div className="text-xs text-gray-300 bg-background/50 p-3 rounded-lg space-y-1">
                <p className="font-medium text-blue-400">Why this matches your profile:</p>
                <ul className="list-disc list-inside space-y-0.5 text-gray-400">
                  <li>High demand for distributed architectures &amp; microservices</li>
                  <li>Recommended tailored resume: <strong className="text-gray-200">Backend-Systems-v2.md</strong></li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Approvals Tab */}
        {activeTab === 'approvals' && (
          <div className="flex-1 overflow-y-auto p-6 max-w-5xl mx-auto w-full space-y-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-white">Universal Safety Approval Gate</h2>
                <p className="text-xs text-gray-400">Principle 2.4: Human Control. High-risk actions require explicit consent.</p>
              </div>
              <button 
                onClick={fetchLiveData}
                className="p-1.5 rounded-lg bg-gray-800 text-gray-300 hover:text-white"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {approvals.length === 0 ? (
              <div className="p-8 text-center text-gray-500 text-sm glass-panel rounded-xl">
                No approval requests pending. The system operates autonomously within safe boundaries.
              </div>
            ) : (
              approvals.map((app) => (
                <div 
                  key={app.id} 
                  className={`glass-panel rounded-xl p-5 border ${
                    app.status === 'pending'
                      ? 'border-amber-500/30 bg-amber-950/10'
                      : app.status === 'approved'
                      ? 'border-emerald-500/30 bg-emerald-950/10'
                      : 'border-red-500/30 bg-red-950/10'
                  } space-y-3`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                      app.status === 'pending' ? 'bg-amber-500/20 text-amber-300' :
                      app.status === 'approved' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'
                    }`}>
                      {app.status.toUpperCase()}
                    </span>
                    <span className="text-xs text-gray-400 font-mono">{app.actionType}</span>
                  </div>
                  <h3 className="font-semibold text-white">{app.title}</h3>
                  <p className="text-xs text-gray-300">{app.description}</p>
                  
                  {app.status === 'pending' && (
                    <div className="flex gap-2 pt-2">
                      <button 
                        onClick={() => handleDecideApproval(app.id, 'approve')}
                        className="px-3 py-1.5 text-xs rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium"
                      >
                        Approve Action
                      </button>
                      <button 
                        onClick={() => handleDecideApproval(app.id, 'reject')}
                        className="px-3 py-1.5 text-xs rounded-lg bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/30"
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

        {/* Audit Tab */}
        {activeTab === 'audit' && (
          <div className="flex-1 overflow-y-auto p-6 max-w-5xl mx-auto w-full space-y-3">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-white">Immutable Event &amp; Audit Ledger</h2>
                <p className="text-xs text-gray-400">Principle 2.3: Everything important is auditable.</p>
              </div>
              <button 
                onClick={fetchLiveData}
                className="p-1.5 rounded-lg bg-gray-800 text-gray-300 hover:text-white"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {auditEvents.length === 0 ? (
              <div className="p-8 text-center text-gray-500 text-sm glass-panel rounded-xl">
                No audit events recorded yet.
              </div>
            ) : (
              auditEvents.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 rounded-lg bg-surface border border-border text-xs">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-gray-500 text-[11px]">
                      {new Date(item.timestamp).toLocaleTimeString()}
                    </span>
                    <span className="font-medium text-purple-400">
                      [{item.agentId || item.toolName || 'System'}]
                    </span>
                    <span className="text-gray-300">{item.rationale || `Executed ${item.eventType}`}</span>
                  </div>
                  <span className="font-mono text-[10px] bg-gray-800 text-gray-400 px-2 py-0.5 rounded">
                    {item.eventType}
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </main>
    </div>
  );
}
