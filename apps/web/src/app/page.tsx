'use client';

import React, { useState, useEffect, useCallback } from 'react';

// Layout
import AuthScreen from '@/components/layout/AuthScreen';
import Sidebar from '@/components/layout/Sidebar';
import TopBar from '@/components/layout/TopBar';

// Feature panels
import ChatPanel from '@/components/chat/ChatPanel';
import JobsPanel from '@/components/jobs/JobsPanel';
import ApprovalsPanel from '@/components/approvals/ApprovalsPanel';
import AuditPanel from '@/components/audit/AuditPanel';
import ConnectorsPanel from '@/components/connectors/ConnectorsPanel';

// Hooks
import { useAuth } from '@/hooks/useAuth';
import { useChat } from '@/hooks/useChat';
import { useJobs } from '@/hooks/useJobs';
import { useApprovals } from '@/hooks/useApprovals';
import { useAudit } from '@/hooks/useAudit';
import { useConnectors } from '@/hooks/useConnectors';
import { useFinance } from '@/hooks/useFinance';

// Types
import type { ActivePanel } from '@/lib/types';

// ---------------------------------------------------------------------------
// Finance panel — inline because it is simple enough not to warrant its own
// file, and adding it later is just extracting this block.
// ---------------------------------------------------------------------------
import {
  Wallet,
  TrendingDown,
  TrendingUp,
  ArrowUpRight,
  Loader2,
  RefreshCw,
  Plus,
  UploadCloud,
  FileSpreadsheet,
  Check,
  X,
  Search,
} from 'lucide-react';

function FinancePanel() {
  const { analysis, transactions, loading, actionLoading, error, refresh, importCsv, createTransaction } = useFinance();

  // Modals state
  const [showImportModal, setShowImportModal] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);

  // Import form state
  const [csvContent, setCsvContent] = useState('');
  const [importStatus, setImportStatus] = useState<string | null>(null);

  // Manual form state
  const [manualAmount, setManualAmount] = useState('');
  const [manualMerchant, setManualMerchant] = useState('');
  const [manualCategory, setManualCategory] = useState('food_and_dining');
  const [manualIsRecurring, setManualIsRecurring] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const sampleCsv = `Date,Description,Amount,Category
2026-10-01,Swiggy Gourmet Order,1250,food_and_dining
2026-10-02,Uber Premier to Airport,850,transportation
2026-10-03,Blinkit Household Supplies,640,shopping
2026-10-04,Cult.fit Elite Fitness Pass,1800,healthcare
2026-10-05,Zerodha Coin SIP Index Fund,15000,investments
2026-10-06,Starbucks Reserve Coffee,490,food_and_dining`;

  const handleImportSubmit = async () => {
    if (!csvContent.trim()) return;
    try {
      const res = await importCsv(csvContent);
      setImportStatus(`Success: ${res.message}`);
      setTimeout(() => {
        setShowImportModal(false);
        setImportStatus(null);
        setCsvContent('');
      }, 1500);
    } catch {
      // error handled in hook
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(manualAmount);
    if (!amt || !manualMerchant.trim()) return;
    try {
      await createTransaction({
        amount: amt,
        merchant: manualMerchant.trim(),
        category: manualCategory,
        isRecurring: manualIsRecurring,
      });
      setShowManualModal(false);
      setManualAmount('');
      setManualMerchant('');
      setManualIsRecurring(false);
    } catch {
      // error handled in hook
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) setCsvContent(text);
    };
    reader.readAsText(file);
  };

  const filteredTransactions = transactions.filter((t) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      t.merchant.toLowerCase().includes(q) ||
      (t.category && t.category.toLowerCase().includes(q))
    );
  });

  if (loading && !analysis) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 size={24} className="text-indigo-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50/50">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200/80 bg-white/80 backdrop-blur-sm flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-200/60 flex items-center justify-center text-emerald-600">
            <Wallet size={15} />
          </div>
          <div>
            <span className="text-sm font-semibold text-slate-800">Finance & Ledger</span>
            <span className="ml-2 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
              PostgreSQL Live
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shadow-sm transition-all"
            title="Import bank statement CSV"
          >
            <UploadCloud size={13} className="text-indigo-600" />
            <span>Import CSV</span>
          </button>

          <button
            onClick={() => setShowManualModal(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-sm transition-all"
            title="Log single transaction manually"
          >
            <Plus size={13} />
            <span>Log Txn</span>
          </button>

          <button
            onClick={refresh}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            title="Refresh from Database"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {error && (
          <p className="text-xs text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">
            {error}
          </p>
        )}

        {analysis && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                {
                  label: 'Monthly Income',
                  value: analysis.totalIncome,
                  icon: <TrendingUp size={14} className="text-emerald-500" />,
                  color: 'text-emerald-700',
                  sub: 'Target Baseline',
                },
                {
                  label: 'Total Expenses',
                  value: analysis.totalExpense,
                  icon: <TrendingDown size={14} className="text-rose-500" />,
                  color: 'text-rose-600',
                  sub: `${transactions.length} transactions`,
                },
                {
                  label: 'Remaining Discretionary',
                  value: analysis.remainingDiscretionary,
                  icon: <Wallet size={14} className="text-indigo-500" />,
                  color: 'text-indigo-700',
                  sub: `${Math.round((analysis.remainingDiscretionary / analysis.totalIncome) * 100)}% buffer left`,
                },
                {
                  label: 'Recurring Commitments',
                  value: analysis.recurringCommitments,
                  icon: <ArrowUpRight size={14} className="text-amber-500" />,
                  color: 'text-amber-700',
                  sub: 'Fixed overheads',
                },
              ].map(({ label, value, icon, color, sub }) => (
                <div key={label} className="bg-white rounded-xl border border-slate-200/80 p-3.5 shadow-sm hover:shadow transition-shadow">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    {icon}
                    <span className="text-[11px] font-medium text-slate-500">{label}</span>
                  </div>
                  <p className={`text-lg font-bold ${color}`}>
                    ₹{value.toLocaleString('en-IN')}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{sub}</p>
                </div>
              ))}
            </div>

            {/* Category breakdown */}
            <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-slate-800">Spending Breakdown</p>
                <span className="text-[11px] text-slate-400">Current Billing Cycle</span>
              </div>
              <div className="space-y-2.5">
                {Object.entries(analysis.byCategory)
                  .filter(([, v]) => v > 0)
                  .sort(([, a], [, b]) => b - a)
                  .map(([cat, amount]) => {
                    const pct = Math.round((amount / (analysis.totalExpense || 1)) * 100) || 0;
                    return (
                      <div key={cat}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="capitalize font-medium text-slate-700">{cat.replace(/_/g, ' ')}</span>
                          <span className="text-slate-600 font-semibold">₹{amount.toLocaleString('en-IN')} <span className="text-[10px] font-normal text-slate-400">({pct}%)</span></span>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </>
        )}

        {/* Transactions Table */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="p-3.5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs font-semibold text-slate-800">Live PostgreSQL Ledger</p>
              <p className="text-[10px] text-slate-400">Persisted transactions surviving all restarts</p>
            </div>

            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search merchant or category..."
                className="pl-8 pr-3 py-1 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 w-48"
              />
            </div>
          </div>

          <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
            {filteredTransactions.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <FileSpreadsheet size={28} className="mx-auto mb-2 opacity-40" />
                <p className="text-xs">No transactions match your search.</p>
              </div>
            ) : (
              filteredTransactions.map((t) => (
                <div key={t.id} className="flex items-center justify-between px-4 py-2.5 hover:bg-slate-50/80 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200/70 flex items-center justify-center flex-shrink-0 text-slate-600 font-bold text-xs uppercase">
                      {t.merchant[0] || 'T'}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-semibold text-slate-800 truncate">{t.merchant}</p>
                        {t.isRecurring && (
                          <span className="text-[9px] px-1 py-0.2 rounded bg-amber-50 text-amber-700 border border-amber-200 font-medium">
                            Recurring
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 truncate">
                        <span className="capitalize font-medium text-slate-500">{String(t.category).replace(/_/g, ' ')}</span>
                        {t.description && t.description !== t.merchant ? ` • ${t.description}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 pl-3">
                    <span className="text-xs font-bold text-slate-800">
                      −₹{t.amount.toLocaleString('en-IN')}
                    </span>
                    <p className="text-[10px] text-slate-400">
                      {new Date(t.timestamp).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* CSV Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
                  <UploadCloud size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Import Bank Statement CSV</h3>
                  <p className="text-[11px] text-slate-500">Universal parser for HDFC, ICICI, SBI & CSV formats</p>
                </div>
              </div>
              <button
                onClick={() => setShowImportModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100"
              >
                <X size={16} />
              </button>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-700">Statement CSV Content</label>
                <button
                  type="button"
                  onClick={() => setCsvContent(sampleCsv)}
                  className="text-[11px] text-indigo-600 hover:text-indigo-800 font-medium underline"
                >
                  Load Sample Bank Statement
                </button>
              </div>

              <textarea
                value={csvContent}
                onChange={(e) => setCsvContent(e.target.value)}
                placeholder="Paste CSV contents here, or click 'Upload File' below..."
                rows={7}
                className="w-full text-xs font-mono p-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-slate-50"
              />
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <label className="cursor-pointer text-slate-600 hover:text-indigo-600 flex items-center gap-1.5 font-medium">
                <FileSpreadsheet size={15} />
                <span>Upload .csv File</span>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              {importStatus && (
                <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                  <Check size={14} /> {importStatus}
                </span>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading || !csvContent.trim()}
                onClick={handleImportSubmit}
                className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow disabled:opacity-50 transition-all"
              >
                {actionLoading ? <Loader2 size={13} className="animate-spin" /> : <UploadCloud size={13} />}
                <span>Import Into PostgreSQL</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Transaction Modal */}
      {showManualModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <form
            onSubmit={handleManualSubmit}
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
                  <Plus size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Log Transaction</h3>
                  <p className="text-[11px] text-slate-500">Record a new personal debit entry</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowManualModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Amount (₹)</label>
                <input
                  type="number"
                  required
                  min="1"
                  step="any"
                  value={manualAmount}
                  onChange={(e) => setManualAmount(e.target.value)}
                  placeholder="e.g. 1500"
                  className="w-full text-sm p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Merchant / Payee</label>
                <input
                  type="text"
                  required
                  value={manualMerchant}
                  onChange={(e) => setManualMerchant(e.target.value)}
                  placeholder="e.g. Swiggy, Amazon, ACT Fibernet"
                  className="w-full text-sm p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
                <select
                  value={manualCategory}
                  onChange={(e) => setManualCategory(e.target.value)}
                  className="w-full text-sm p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
                >
                  <option value="housing">Housing & Rent</option>
                  <option value="utilities">Utilities & Bills</option>
                  <option value="food_and_dining">Food & Dining</option>
                  <option value="transportation">Transportation & Travel</option>
                  <option value="subscriptions">Subscriptions & SaaS</option>
                  <option value="shopping">Shopping & Electronics</option>
                  <option value="entertainment">Entertainment</option>
                  <option value="healthcare">Healthcare & Fitness</option>
                  <option value="investments">Investments / SIP</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="recurring-toggle"
                  checked={manualIsRecurring}
                  onChange={(e) => setManualIsRecurring(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="recurring-toggle" className="text-xs text-slate-600">
                  Mark as monthly recurring expense
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowManualModal(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow disabled:opacity-50 transition-all"
              >
                {actionLoading ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                <span>Save to Database</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Profile panel — inline lightweight implementation
// ---------------------------------------------------------------------------
import { User } from 'lucide-react';
function ProfilePanel({ user }: { user: ReturnType<typeof useAuth>['user'] }) {
  if (!user) return null;
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-5 py-3 border-b border-slate-100 flex-shrink-0">
        <User size={15} className="text-slate-500" />
        <span className="text-sm font-semibold text-slate-800">Profile</span>
      </div>
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        <div className="flex items-center gap-4">
          {user.avatar ? (
            <img src={user.avatar} alt={user.name} className="w-16 h-16 rounded-2xl object-cover ring-2 ring-slate-200" />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-indigo-100 flex items-center justify-center text-indigo-700 text-2xl font-bold">
              {user.name[0]}
            </div>
          )}
          <div>
            <h2 className="text-base font-bold text-slate-900 font-heading">{user.name}</h2>
            {user.title && <p className="text-sm text-slate-500">{user.title}</p>}
            <p className="text-xs text-slate-400">{user.email}</p>
          </div>
        </div>
        {user.bio && (
          <div className="playful-card p-4">
            <p className="text-xs font-semibold text-slate-600 mb-1">Bio</p>
            <p className="text-sm text-slate-700">{user.bio}</p>
          </div>
        )}
        <div className="playful-card p-4">
          <p className="text-xs font-semibold text-slate-600 mb-2">Preferences</p>
          <div className="space-y-1.5 text-xs text-slate-600">
            <div className="flex justify-between"><span>Theme</span><span className="font-medium capitalize">{user.preferences.theme ?? 'dark'}</span></div>
            <div className="flex justify-between"><span>AI Tone</span><span className="font-medium capitalize">{user.preferences.aiTone ?? 'playful'}</span></div>
          </div>
        </div>
        <div className="playful-card p-4">
          <p className="text-xs font-semibold text-slate-600 mb-2">Connected Accounts</p>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-600">Google Workspace</span>
            {user.connectedAccounts?.google?.connected ? (
              <span className="text-emerald-600 font-medium">{user.connectedAccounts.google.email}</span>
            ) : (
              <span className="text-slate-400">Not connected</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Root Dashboard
// ---------------------------------------------------------------------------

export default function Dashboard() {
  const [activePanel, setActivePanel] = useState<ActivePanel>('chat');
  const [isApiReachable, setIsApiReachable] = useState(true);

  // Hooks
  const { user, loading: authLoading, error: authError, login, signup, logout } = useAuth();
  const chat = useChat();
  const jobsHook = useJobs();
  const approvals = useApprovals();
  const audit = useAudit();
  const connectorsHook = useConnectors();

  // Periodically check API reachability
  useEffect(() => {
    const check = async () => {
      try {
        await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'}/health`);
        setIsApiReachable(true);
      } catch {
        setIsApiReachable(false);
      }
    };
    check();
    const id = setInterval(check, 30_000);
    return () => clearInterval(id);
  }, []);

  // Global refresh for the currently visible panel
  const handleRefresh = useCallback(() => {
    if (activePanel === 'jobs')       jobsHook.fetchJobs();
    if (activePanel === 'approvals')  approvals.refresh();
    if (activePanel === 'audit')      audit.refresh();
    if (activePanel === 'connectors') connectorsHook.refresh();
  }, [activePanel, jobsHook, approvals, audit, connectorsHook]);

  // Auth loading state
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 size={32} className="text-indigo-400 animate-spin" />
      </div>
    );
  }

  // Not authenticated
  if (!user) {
    return (
      <AuthScreen
        onLogin={async (email, pw) => { await login(email, pw); }}
        onSignup={async (name, email, pw, title) => { await signup(name, email, pw, title); }}
        error={authError}
      />
    );
  }

  // Main app shell
  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Sidebar */}
      <Sidebar
        active={activePanel}
        onNavigate={setActivePanel}
        pendingApprovals={approvals.pendingCount}
      />

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar
          user={user}
          activePanel={activePanel}
          isApiReachable={isApiReachable}
          onLogout={logout}
          onRefresh={handleRefresh}
        />

        <main className="flex-1 overflow-hidden">
          {activePanel === 'chat' && (
            <ChatPanel
              messages={chat.messages}
              sending={chat.sending}
              onSend={chat.sendMessage}
              onClear={chat.clearMessages}
            />
          )}

          {activePanel === 'jobs' && (
            <JobsPanel
              jobs={jobsHook.jobList}
              resumes={jobsHook.profile?.resumes ?? []}
              loading={jobsHook.loading}
              discovering={jobsHook.discovering}
              error={jobsHook.error}
              search={jobsHook.search}
              onSearch={jobsHook.setSearch}
              statusFilter={jobsHook.statusFilter}
              onStatusFilter={jobsHook.setStatusFilter}
              remoteOnly={jobsHook.remoteOnly}
              onRemoteOnly={jobsHook.setRemoteOnly}
              minScore={jobsHook.minScore}
              onMinScore={jobsHook.setMinScore}
              onStatusChange={jobsHook.updateStatus}
              onTriggerDiscovery={jobsHook.triggerDiscovery}
              onResumeRefresh={jobsHook.fetchProfile}
            />
          )}

          {activePanel === 'finance' && <FinancePanel />}

          {activePanel === 'approvals' && (
            <ApprovalsPanel
              approvals={approvals.list}
              loading={approvals.loading}
              error={approvals.error}
              onDecide={approvals.decide}
              onRefresh={approvals.refresh}
            />
          )}

          {activePanel === 'audit' && (
            <AuditPanel
              events={audit.events}
              loading={audit.loading}
              error={audit.error}
              onRefresh={audit.refresh}
            />
          )}

          {activePanel === 'connectors' && (
            <ConnectorsPanel
              connectors={connectorsHook.list}
              loading={connectorsHook.loading}
              error={connectorsHook.error}
              onRefresh={connectorsHook.refresh}
              onConnectGoogle={connectorsHook.connectGoogle}
              onDisconnectGoogle={connectorsHook.disconnectGoogle}
              onGetGoogleAuthUrl={connectorsHook.getGoogleAuthUrl}
              onSetGeminiKey={connectorsHook.setGeminiKey}
              onTestGemini={connectorsHook.testGemini}
              isGoogleConnected={connectorsHook.isGoogleConnected}
            />
          )}

          {activePanel === 'profile' && <ProfilePanel user={user} />}
        </main>
      </div>
    </div>
  );
}
