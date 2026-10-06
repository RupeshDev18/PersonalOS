'use client';

import React, { useState } from 'react';
import {
  Bot,
  Briefcase,
  Wallet,
  ShoppingBag,
  Mail,
  ShieldCheck,
  Activity,
  Cpu,
  Calendar,
  Send,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Clock,
  Terminal,
} from 'lucide-react';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<'chat' | 'jobs' | 'approvals' | 'audit'>('chat');
  const [inputValue, setInputValue] = useState('Every morning at 8:00 AM, find the 20 best backend & fullstack jobs for me.');

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-gray-100">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-surface/50 backdrop-blur-md flex flex-col justify-between p-4">
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
              <span className="ml-auto text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded">Gate</span>
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

            <div className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-400 hover:bg-gray-800/20 cursor-pointer">
              <Wallet className="w-4 h-4 text-emerald-400" />
              <span>Finance (Read-only)</span>
            </div>
            <div className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-400 hover:bg-gray-800/20 cursor-pointer">
              <ShoppingBag className="w-4 h-4 text-pink-400" />
              <span>Shopping</span>
            </div>
            <div className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-400 hover:bg-gray-800/20 cursor-pointer">
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
              Engine Status
            </span>
            <span className="text-emerald-400 font-mono text-[11px]">Ready</span>
          </div>
          <div className="text-[11px] text-gray-500">Least-privilege Policy: Enforced</div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top Header Bar */}
        <header className="h-14 border-b border-border bg-surface/30 px-6 flex items-center justify-between backdrop-blur-md">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-gray-200">Personal AI Operating System</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
              Architecture Phase 0 Initialized
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs text-gray-400">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-purple-400" />
              <span>Scheduler: BullMQ Active</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-blue-400" />
              <span>Tool Gateway: Active</span>
            </div>
          </div>
        </header>

        {/* View Content */}
        {activeTab === 'chat' && (
          <div className="flex-1 flex flex-col overflow-hidden p-6 max-w-5xl mx-auto w-full gap-6">
            {/* Conversation Timeline */}
            <div className="flex-1 overflow-y-auto space-y-5 pr-2">
              {/* User Prompt */}
              <div className="flex justify-end">
                <div className="max-w-xl bg-purple-600/20 border border-purple-500/30 text-purple-100 rounded-2xl rounded-tr-sm px-4 py-3 text-sm">
                  Every morning at 8:00 AM, find the 20 best backend & fullstack jobs for me.
                </div>
              </div>

              {/* Chief Agent Response */}
              <div className="flex gap-3 max-w-2xl">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-600 to-blue-500 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="space-y-3">
                  <div className="bg-surface border border-border text-gray-200 rounded-2xl rounded-tl-sm px-4 py-3.5 text-sm space-y-3">
                    <p className="font-medium text-white flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-purple-400" />
                      Plan created and workflow scheduled
                    </p>
                    <p className="text-gray-300 leading-relaxed">
                      I have configured a recurring workflow for you at <strong>8:00 AM Asia/Kolkata (Mon–Fri)</strong>. 
                      Here is how I delegated your task:
                    </p>

                    {/* Multi-Agent Delegation Plan */}
                    <div className="rounded-xl bg-background/60 border border-border p-3 space-y-2">
                      <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        Execution Pipeline (Chief Orchestration)
                      </div>
                      
                      <div className="flex items-center gap-2 text-xs text-gray-300">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span><strong>Scheduler</strong> registered cron <code className="text-purple-400 bg-purple-950/40 px-1 py-0.5 rounded">0 8 * * 1-5</code></span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-300">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span><strong>Job Specialist</strong> searches target sources & normalizes postings</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-300">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span><strong>Deduplication Engine</strong> filters repeat posts across platforms</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-300">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span><strong>Resume Specialist</strong> pairs the top 20 matches with your customized resume profiles</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-300">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span><strong>Audit Engine</strong> records complete tool usage and match rationale</span>
                      </div>
                    </div>

                    <p className="text-xs text-gray-400">
                      Tomorrow at 8:00 AM, your first daily job intelligence report will be ready for review.
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <button 
                      onClick={() => setActiveTab('jobs')}
                      className="text-xs px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 flex items-center gap-1.5 transition-colors"
                    >
                      <span>Preview Job Discovery Feed</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                    <button 
                      onClick={() => setActiveTab('audit')}
                      className="text-xs px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 flex items-center gap-1.5 transition-colors"
                    >
                      <span>View Audit Log</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Input Bar */}
            <div className="relative pt-2">
              <div className="glass-panel rounded-2xl p-2 flex items-center gap-2 focus-within:border-purple-500/50 transition-colors">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Ask Chief Agent anything (e.g. 'Should I buy this laptop?', 'Find jobs', 'Summarize emails')..."
                  className="w-full bg-transparent border-0 px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none"
                />
                <button className="p-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white transition-colors shrink-0 shadow-md shadow-purple-600/20">
                  <Send className="w-4 h-4" />
                </button>
              </div>

              {/* Quick suggestion pills */}
              <div className="flex items-center gap-2 mt-2 px-1 text-xs text-gray-400 overflow-x-auto py-1">
                <span className="text-[11px] text-gray-500">Quick tests:</span>
                <button
                  onClick={() => setInputValue('Should I buy a ₹90,000 MacBook Air M2 based on my recent finances?')}
                  className="px-2.5 py-1 rounded-full bg-gray-800/80 hover:bg-gray-700 text-gray-300 text-[11px] whitespace-nowrap border border-gray-700"
                >
                  Shopping + Finance: &quot;Should I buy this?&quot;
                </button>
                <button
                  onClick={() => setInputValue('Summarize all high-priority unread emails received today.')}
                  className="px-2.5 py-1 rounded-full bg-gray-800/80 hover:bg-gray-700 text-gray-300 text-[11px] whitespace-nowrap border border-gray-700"
                >
                  Communication: &quot;Summarize unread emails&quot;
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Jobs Tab (Milestone 1 Preview) */}
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
                  <button className="px-3 py-1.5 text-xs rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium">
                    Prepare Application
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Approvals Tab */}
        {activeTab === 'approvals' && (
          <div className="flex-1 overflow-y-auto p-6 max-w-5xl mx-auto w-full space-y-4">
            <div className="mb-4">
              <h2 className="text-lg font-bold text-white">Universal Safety Approval Gate</h2>
              <p className="text-xs text-gray-400">Principle 2.4: Human Control. High-risk actions require explicit consent.</p>
            </div>

            <div className="glass-panel rounded-xl p-5 border border-amber-500/30 bg-amber-950/10 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300">
                  PENDING HUMAN APPROVAL
                </span>
                <span className="text-xs text-gray-400">Job Agent • Action: jobs.application.submit</span>
              </div>
              <h3 className="font-semibold text-white">Submit Job Application to Stripe</h3>
              <p className="text-xs text-gray-300">
                Agent has prepared your verified resume profile and application package. 
                Submitting requires your confirmation.
              </p>
              <div className="flex gap-2 pt-2">
                <button className="px-3 py-1.5 text-xs rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium">
                  Approve &amp; Submit
                </button>
                <button className="px-3 py-1.5 text-xs rounded-lg bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/30">
                  Reject Action
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Audit Tab */}
        {activeTab === 'audit' && (
          <div className="flex-1 overflow-y-auto p-6 max-w-5xl mx-auto w-full space-y-3">
            <div className="mb-4">
              <h2 className="text-lg font-bold text-white">Immutable Event &amp; Audit Ledger</h2>
              <p className="text-xs text-gray-400">Principle 2.3: Everything important is auditable.</p>
            </div>

            {[
              { time: '10:00:01', agent: 'Chief', event: 'TASK_CREATED', detail: 'Received user schedule instruction' },
              { time: '10:00:02', agent: 'Scheduler', event: 'SCHEDULE_CREATED', detail: 'Registered cron 0 8 * * 1-5' },
              { time: '10:00:03', agent: 'PolicyEngine', event: 'PERMISSION_CHECKED', detail: 'Agent "job" capability "jobs.search" verified' },
              { time: '10:00:05', agent: 'Job Agent', event: 'TOOL_CALLED', detail: 'Tool jobs.search returned 147 raw postings' },
              { time: '10:00:06', agent: 'Job Agent', event: 'DEDUPLICATION_COMPLETED', detail: 'Filtered 62 duplicates across providers' },
            ].map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-surface border border-border text-xs">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-gray-500">{item.time}</span>
                  <span className="font-medium text-purple-400">[{item.agent}]</span>
                  <span className="text-gray-300">{item.detail}</span>
                </div>
                <span className="font-mono text-[10px] bg-gray-800 text-gray-400 px-2 py-0.5 rounded">
                  {item.event}
                </span>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
