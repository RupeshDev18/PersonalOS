'use client';

import React, { useState, useEffect } from 'react';
import {
  Plug,
  RefreshCw,
  Loader2,
  Key,
  Mail,
  LogOut,
  Send,
  Bot,
  Github,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  ExternalLink,
  Code2,
  Cpu,
  Sparkles,
  Server,
  Search,
  ShoppingBag,
  Globe,
  Building2,
  Laptop,
} from 'lucide-react';
import ConnectorCard from './ConnectorCard';
import BrowserLoginModal from './BrowserLoginModal';
import { notifications, connectors as apiConnectors } from '@/lib/api';
import type { ConnectorInfo } from '@/lib/types';

interface ConnectorsPanelProps {
  connectors: ConnectorInfo[];
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  onConnectGoogle: (email: string, authMethod?: string, credential?: string) => Promise<void>;
  onDisconnectGoogle: () => Promise<void>;
  onGetGoogleAuthUrl?: (redirectUri?: string) => Promise<{ authUrl: string | null; configured: boolean; message?: string }>;
  onSetGeminiKey: (key: string) => Promise<{ success: boolean; message: string }>;
  onTestGemini: () => Promise<{ success: boolean; message: string }>;
  isGoogleConnected: boolean;
}

export default function ConnectorsPanel({
  connectors,
  loading,
  error,
  onRefresh,
  onConnectGoogle,
  onDisconnectGoogle,
  onGetGoogleAuthUrl,
  onSetGeminiKey,
  onTestGemini,
  isGoogleConnected,
}: ConnectorsPanelProps) {
  // Google state
  const [googleEmail, setGoogleEmail] = useState('');
  const [googleClientId, setGoogleClientId] = useState('');
  const [googleClientSecret, setGoogleClientSecret] = useState('');
  const [showGoogleKeysConfig, setShowGoogleKeysConfig] = useState(false);
  const [connectingGoogle, setConnectingGoogle] = useState(false);
  const [savingGoogleKeys, setSavingGoogleKeys] = useState(false);
  const [googleMsg, setGoogleMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // GitHub state
  const [githubToken, setGithubToken] = useState('');
  const [connectingGithub, setConnectingGithub] = useState(false);
  const [syncingGithub, setSyncingGithub] = useState(false);
  const [githubMsg, setGithubMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Slack state
  const [slackWebhook, setSlackWebhook] = useState('');
  const [slackChannel, setSlackChannel] = useState('#personal-os-alerts');
  const [savingSlack, setSavingSlack] = useState(false);
  const [testingSlack, setTestingSlack] = useState(false);
  const [slackMsg, setSlackMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Multi-Provider LLM state (LangGraph Engine)
  const [llmProvider, setLlmProvider] = useState<'gemini' | 'ollama' | 'openai' | 'openrouter'>('gemini');
  const [llmModel, setLlmModel] = useState('gemini-3.8-flash');
  const [llmApiKey, setLlmApiKey] = useState('');
  const [llmBaseUrl, setLlmBaseUrl] = useState('http://localhost:11434/v1');
  const [savingLlm, setSavingLlm] = useState(false);
  const [llmMsg, setLlmMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    apiConnectors
      .getLLMConfig()
      .then((cfg) => {
        if (cfg) {
          if (cfg.provider) setLlmProvider(cfg.provider as any);
          if (cfg.modelName) setLlmModel(cfg.modelName);
          if (cfg.baseURL) setLlmBaseUrl(cfg.baseURL);
        }
      })
      .catch(() => {});
  }, []);

  // Gemini state (legacy helper)
  const [geminiKey, setGeminiKey] = useState('');
  const [testingGemini, setTestingGemini] = useState(false);
  const [geminiMsg, setGeminiMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Telegram state
  const [telegramToken, setTelegramToken] = useState('');
  const [telegramChatId, setTelegramChatId] = useState('');
  const [savingTelegram, setSavingTelegram] = useState(false);
  const [telegramMsg, setTelegramMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Naukri state
  const [naukriRole, setNaukriRole] = useState('Senior Backend Engineer');
  const [searchingNaukri, setSearchingNaukri] = useState(false);
  const [naukriMsg, setNaukriMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // LinkedIn state
  const [linkedinRole, setLinkedinRole] = useState('Staff Software Engineer');
  const [searchingLinkedin, setSearchingLinkedin] = useState(false);
  const [linkedinMsg, setLinkedinMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Amazon & Flipkart state
  const [amazonProduct, setAmazonProduct] = useState('MacBook Air M2');
  const [searchingAmazon, setSearchingAmazon] = useState(false);
  const [amazonMsg, setAmazonMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const [flipkartProduct, setFlipkartProduct] = useState('Sony WH-1000XM5');
  const [searchingFlipkart, setSearchingFlipkart] = useState(false);
  const [flipkartMsg, setFlipkartMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Google Search & History state
  const [googleQuery, setGoogleQuery] = useState('Next.js 14 App Router');
  const [searchingGoogle, setSearchingGoogle] = useState(false);
  const [googleSearchMsg, setGoogleSearchMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [recentSearches, setRecentSearches] = useState<any[]>([]);
  const [showSearchHistory, setShowSearchHistory] = useState(false);

  // Browser Session Customer Accounts state (Amazon, Flipkart, LinkedIn, Naukri)
  const [browserAccounts, setBrowserAccounts] = useState<Record<string, any>>({});
  const [browserModal, setBrowserModal] = useState<{
    open: boolean;
    platform: 'amazon' | 'flipkart' | 'linkedin' | 'naukri';
    displayName: string;
  } | null>(null);
  const [syncingPlatform, setSyncingPlatform] = useState<string | null>(null);

  const fetchBrowserAccounts = async () => {
    const platforms: Array<'amazon' | 'flipkart' | 'linkedin' | 'naukri'> = [
      'amazon',
      'flipkart',
      'linkedin',
      'naukri',
    ];
    const results: Record<string, any> = {};
    await Promise.allSettled(
      platforms.map(async (p) => {
        try {
          const acc = await apiConnectors.browserAccount(p);
          results[p] = acc;
        } catch {
          results[p] = { connected: false };
        }
      }),
    );
    setBrowserAccounts(results);
  };

  useEffect(() => {
    fetchBrowserAccounts();
  }, []);

  const openBrowserLogin = (platform: 'amazon' | 'flipkart' | 'linkedin' | 'naukri', displayName: string) => {
    setBrowserModal({ open: true, platform, displayName });
  };

  const handleSyncBrowser = async (platform: string) => {
    setSyncingPlatform(platform);
    try {
      const res = await apiConnectors.browserSync(platform);
      setBrowserAccounts((prev) => ({ ...prev, [platform]: res }));
    } catch (err: any) {
      alert(`Sync failed: ${err.message}`);
    } finally {
      setSyncingPlatform(null);
    }
  };

  const handleDisconnectBrowser = async (platform: string) => {
    if (!confirm(`Are you sure you want to disconnect your ${platform} session?`)) return;
    try {
      await apiConnectors.browserDisconnect(platform);
      await fetchBrowserAccounts();
      onRefresh();
    } catch (err: any) {
      alert(`Disconnect failed: ${err.message}`);
    }
  };

  // ---------------------------------------------------------------------------
  // Google handlers
  // ---------------------------------------------------------------------------
  const handleSaveGoogleKeys = async () => {
    if (!googleClientId.trim() || !googleClientSecret.trim()) return;
    setSavingGoogleKeys(true);
    setGoogleMsg(null);
    try {
      const res = await apiConnectors.saveGoogleOAuthKeys(googleClientId.trim(), googleClientSecret.trim());
      setGoogleMsg({ ok: res.success, text: res.message });
      if (res.success) {
        setGoogleClientId('');
        setGoogleClientSecret('');
        setShowGoogleKeysConfig(false);
        onRefresh();
      }
    } catch (e: unknown) {
      setGoogleMsg({ ok: false, text: e instanceof Error ? e.message : 'Failed to save Google Cloud keys.' });
    } finally {
      setSavingGoogleKeys(false);
    }
  };

  const handleOAuthRedirect = async () => {
    if (!onGetGoogleAuthUrl) return;
    setConnectingGoogle(true);
    setGoogleMsg(null);
    try {
      const res = await onGetGoogleAuthUrl();
      if (res.configured && res.authUrl) {
        window.location.href = res.authUrl;
      } else {
        setShowGoogleKeysConfig(true);
        setGoogleMsg({
          ok: false,
          text: res.message || 'Google Cloud OAuth credentials not configured. Please enter them below.',
        });
      }
    } catch (e: unknown) {
      setGoogleMsg({ ok: false, text: e instanceof Error ? e.message : 'Failed to launch Google OAuth.' });
    } finally {
      setConnectingGoogle(false);
    }
  };

  const handleConnectGoogle = async () => {
    if (!googleEmail.trim()) return;
    setConnectingGoogle(true);
    setGoogleMsg(null);
    try {
      await onConnectGoogle(googleEmail.trim(), 'oauth_consent');
      setGoogleMsg({ ok: true, text: 'Google Workspace connected.' });
      setGoogleEmail('');
      onRefresh();
    } catch (e: unknown) {
      setGoogleMsg({ ok: false, text: e instanceof Error ? e.message : 'Connection failed.' });
    } finally {
      setConnectingGoogle(false);
    }
  };

  const handleDisconnectGoogle = async () => {
    try {
      await onDisconnectGoogle();
      setGoogleMsg({ ok: true, text: 'Google Workspace disconnected.' });
      onRefresh();
    } catch {
      /* ignore */
    }
  };

  // ---------------------------------------------------------------------------
  // GitHub handlers
  // ---------------------------------------------------------------------------
  const handleConnectGithub = async () => {
    if (!githubToken.trim()) return;
    setConnectingGithub(true);
    setGithubMsg(null);
    try {
      const res = await apiConnectors.githubConnect(githubToken.trim());
      setGithubMsg({ ok: true, text: `Connected to GitHub as @${res.username}! ${res.repoCount} repos indexed.` });
      setGithubToken('');
      onRefresh();
    } catch (e: unknown) {
      setGithubMsg({ ok: false, text: e instanceof Error ? e.message : 'Failed to connect GitHub.' });
    } finally {
      setConnectingGithub(false);
    }
  };

  const handleDisconnectGithub = async () => {
    try {
      await apiConnectors.githubDisconnect();
      setGithubMsg({ ok: true, text: 'GitHub disconnected.' });
      onRefresh();
    } catch {
      /* ignore */
    }
  };

  const handleSyncGithubToProfile = async () => {
    setSyncingGithub(true);
    setGithubMsg(null);
    try {
      const res = await apiConnectors.githubSyncProfile();
      setGithubMsg({ ok: res.success, text: res.message });
      onRefresh();
    } catch (e: unknown) {
      setGithubMsg({ ok: false, text: e instanceof Error ? e.message : 'Failed to sync GitHub to profile.' });
    } finally {
      setSyncingGithub(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Slack handlers
  // ---------------------------------------------------------------------------
  const handleConnectSlack = async () => {
    if (!slackWebhook.trim()) return;
    setSavingSlack(true);
    setSlackMsg(null);
    try {
      await apiConnectors.slackConnect(slackWebhook.trim(), slackChannel.trim());
      setSlackMsg({ ok: true, text: `Slack webhook connected for ${slackChannel}!` });
      setSlackWebhook('');
      onRefresh();
    } catch (e: unknown) {
      setSlackMsg({ ok: false, text: e instanceof Error ? e.message : 'Failed to connect Slack.' });
    } finally {
      setSavingSlack(false);
    }
  };

  const handleDisconnectSlack = async () => {
    try {
      await apiConnectors.slackDisconnect();
      setSlackMsg({ ok: true, text: 'Slack disconnected.' });
      onRefresh();
    } catch {
      /* ignore */
    }
  };

  const handleTestSlack = async () => {
    setTestingSlack(true);
    setSlackMsg(null);
    try {
      const res = await apiConnectors.slackTest();
      setSlackMsg({ ok: res.success, text: res.message });
    } catch (e: unknown) {
      setSlackMsg({ ok: false, text: e instanceof Error ? e.message : 'Failed to dispatch Slack test alert.' });
    } finally {
      setTestingSlack(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Multi-Provider LLM handlers (LangGraph)
  // ---------------------------------------------------------------------------
  const handleSaveLLMConfig = async () => {
    setSavingLlm(true);
    setLlmMsg(null);
    try {
      const res = await apiConnectors.updateLLMConfig({
        provider: llmProvider,
        apiKey: llmApiKey.trim() || undefined,
        modelName: llmModel.trim() || undefined,
        baseURL: llmBaseUrl.trim() || undefined,
      });
      setLlmMsg({ ok: res.success, text: res.message });
      if (res.success) {
        setLlmApiKey('');
        onRefresh();
      }
    } catch (e: unknown) {
      setLlmMsg({ ok: false, text: e instanceof Error ? e.message : 'Failed to update LLM configuration.' });
    } finally {
      setSavingLlm(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Telegram handlers
  // ---------------------------------------------------------------------------
  const handleSaveTelegram = async () => {
    if (!telegramToken.trim()) return;
    setSavingTelegram(true);
    setTelegramMsg(null);
    try {
      const res = await notifications.config(telegramToken.trim(), telegramChatId.trim() || undefined);
      setTelegramMsg({ ok: res.success, text: res.message });
      if (res.success) {
        setTelegramToken('');
        setTelegramChatId('');
        onRefresh();
      }
    } catch (e: unknown) {
      setTelegramMsg({ ok: false, text: e instanceof Error ? e.message : 'Failed to configure Telegram.' });
    } finally {
      setSavingTelegram(false);
    }
  };

  const handleTestTelegram = async () => {
    setSavingTelegram(true);
    setTelegramMsg(null);
    try {
      const res = await notifications.test();
      setTelegramMsg({ ok: res.success, text: res.message });
    } catch (e: unknown) {
      setTelegramMsg({ ok: false, text: e instanceof Error ? e.message : 'Test dispatch failed.' });
    } finally {
      setSavingTelegram(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Gemini handlers
  // ---------------------------------------------------------------------------
  const handleSetGeminiKey = async () => {
    if (!geminiKey.trim()) return;
    setTestingGemini(true);
    setGeminiMsg(null);
    try {
      const result = await onSetGeminiKey(geminiKey.trim());
      setGeminiMsg({ ok: result.success, text: result.message });
      if (result.success) {
        setGeminiKey('');
        onRefresh();
      }
    } catch (e: unknown) {
      setGeminiMsg({ ok: false, text: e instanceof Error ? e.message : 'Failed to set key.' });
    } finally {
      setTestingGemini(false);
    }
  };

  const handleTestGemini = async () => {
    setTestingGemini(true);
    setGeminiMsg(null);
    try {
      const result = await onTestGemini();
      setGeminiMsg({ ok: result.success, text: result.message });
    } finally {
      setTestingGemini(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Naukri & LinkedIn Handlers
  // ---------------------------------------------------------------------------
  const handleSearchNaukri = async () => {
    if (!naukriRole.trim()) return;
    setSearchingNaukri(true);
    setNaukriMsg(null);
    try {
      const res = await apiConnectors.naukriSearch(naukriRole.trim(), 'Bengaluru');
      setNaukriMsg({ ok: true, text: `Discovered ${(res as any).length} active unicorn roles for "${naukriRole}".` });
    } catch (e: unknown) {
      setNaukriMsg({ ok: false, text: e instanceof Error ? e.message : 'Naukri search failed.' });
    } finally {
      setSearchingNaukri(false);
    }
  };

  const handleSearchLinkedin = async () => {
    if (!linkedinRole.trim()) return;
    setSearchingLinkedin(true);
    setLinkedinMsg(null);
    try {
      const res = await apiConnectors.linkedInSearch(linkedinRole.trim(), 'India');
      setLinkedinMsg({ ok: true, text: `Discovered ${(res as any).length} tech GCC roles for "${linkedinRole}".` });
    } catch (e: unknown) {
      setLinkedinMsg({ ok: false, text: e instanceof Error ? e.message : 'LinkedIn search failed.' });
    } finally {
      setSearchingLinkedin(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Amazon & Flipkart Handlers
  // ---------------------------------------------------------------------------
  const handleSearchAmazon = async () => {
    if (!amazonProduct.trim()) return;
    setSearchingAmazon(true);
    setAmazonMsg(null);
    try {
      const res = await apiConnectors.amazonSearch(amazonProduct.trim());
      setAmazonMsg({ ok: true, text: `Retrieved ${(res as any).length} verified Amazon India listings for "${amazonProduct}".` });
    } catch (e: unknown) {
      setAmazonMsg({ ok: false, text: e instanceof Error ? e.message : 'Amazon search failed.' });
    } finally {
      setSearchingAmazon(false);
    }
  };

  const handleSearchFlipkart = async () => {
    if (!flipkartProduct.trim()) return;
    setSearchingFlipkart(true);
    setFlipkartMsg(null);
    try {
      const res = await apiConnectors.flipkartSearch(flipkartProduct.trim());
      setFlipkartMsg({ ok: true, text: `Retrieved ${(res as any).length} Flipkart deals for "${flipkartProduct}".` });
    } catch (e: unknown) {
      setFlipkartMsg({ ok: false, text: e instanceof Error ? e.message : 'Flipkart search failed.' });
    } finally {
      setSearchingFlipkart(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Google Search & History Handlers
  // ---------------------------------------------------------------------------
  const handleSearchGoogle = async () => {
    if (!googleQuery.trim()) return;
    setSearchingGoogle(true);
    setGoogleSearchMsg(null);
    try {
      const res = await apiConnectors.googleSearch(googleQuery.trim());
      setGoogleSearchMsg({ ok: true, text: res.summary || `Retrieved results for "${googleQuery}".` });
      handleFetchSearchHistory();
    } catch (e: unknown) {
      setGoogleSearchMsg({ ok: false, text: e instanceof Error ? e.message : 'Google search failed.' });
    } finally {
      setSearchingGoogle(false);
    }
  };

  const handleFetchSearchHistory = async () => {
    try {
      const hist = await apiConnectors.searchHistory();
      setRecentSearches(hist || []);
    } catch {
      /* ignore */
    }
  };

  // ---------------------------------------------------------------------------
  // Build per-connector action slots
  // ---------------------------------------------------------------------------
  const actionsFor = (connector: ConnectorInfo): React.ReactNode => {
    // 1. Google Workspace
    if (connector.id === 'connector-google-workspace') {
      if (connector.status === 'connected') {
        return (
          <div className="flex items-center gap-2">
            <button
              onClick={handleDisconnectGoogle}
              className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
            >
              <LogOut size={11} /> Disconnect
            </button>
          </div>
        );
      }
      return (
        <div className="flex flex-col gap-2.5 w-full pt-1">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleOAuthRedirect}
              disabled={connectingGoogle}
              className="flex items-center gap-1.5 text-xs px-3.5 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm transition-all font-semibold"
            >
              {connectingGoogle ? <Loader2 size={13} className="animate-spin" /> : <Mail size={13} />}
              Connect with Google (OAuth 2.0)
            </button>
            <button
              onClick={() => setShowGoogleKeysConfig(!showGoogleKeysConfig)}
              className="flex items-center gap-1 text-xs px-2.5 py-2 text-slate-500 hover:text-slate-800 transition-colors"
            >
              <span>{showGoogleKeysConfig ? 'Hide Cloud Config' : 'Setup Cloud Client Keys'}</span>
              {showGoogleKeysConfig ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
          </div>

          {showGoogleKeysConfig && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs space-y-2 mt-1">
              <p className="font-semibold text-slate-800">Google Cloud Console OAuth Setup</p>
              <p className="text-slate-500 text-[11px] leading-relaxed">
                1. Go to <a href="https://console.cloud.google.com" target="_blank" rel="noreferrer" className="text-indigo-600 underline">Google Cloud Console</a>.<br />
                2. Enable <strong>Gmail API</strong> and <strong>Google Drive API</strong>.<br />
                3. Under Credentials, create an <strong>OAuth 2.0 Client ID</strong> (Web Application).<br />
                4. Add Authorized redirect URI: <code className="bg-white px-1 py-0.5 rounded border border-slate-200 text-indigo-700 font-mono">http://localhost:4000/api/connectors/google/callback</code>
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                <input
                  type="text"
                  placeholder="Client ID (...apps.googleusercontent.com)"
                  value={googleClientId}
                  onChange={(e) => setGoogleClientId(e.target.value)}
                  className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white text-slate-900"
                />
                <input
                  type="password"
                  placeholder="Client Secret (GOCSPX-...)"
                  value={googleClientSecret}
                  onChange={(e) => setGoogleClientSecret(e.target.value)}
                  className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white text-slate-900"
                />
              </div>
              <button
                onClick={handleSaveGoogleKeys}
                disabled={savingGoogleKeys || !googleClientId.trim() || !googleClientSecret.trim()}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium text-xs disabled:opacity-50 transition-colors"
              >
                {savingGoogleKeys ? 'Saving…' : 'Save Google Credentials'}
              </button>
            </div>
          )}
        </div>
      );
    }

    // 2. GitHub Developer Index
    if (connector.id === 'connector-github') {
      if (connector.status === 'connected') {
        return (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              onClick={handleSyncGithubToProfile}
              disabled={syncingGithub}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors font-medium"
            >
              {syncingGithub ? <Loader2 size={12} className="animate-spin" /> : <Code2 size={12} />}
              Sync Repos to Resume
            </button>
            <button
              onClick={handleDisconnectGithub}
              className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
            >
              <LogOut size={11} /> Disconnect
            </button>
          </div>
        );
      }
      return (
        <div className="flex flex-col gap-2 w-full pt-1">
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="password"
              placeholder="Personal Access Token (ghp_...)"
              value={githubToken}
              onChange={(e) => setGithubToken(e.target.value)}
              className="flex-1 text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-400 min-w-[200px]"
            />
            <button
              onClick={handleConnectGithub}
              disabled={connectingGithub || !githubToken.trim()}
              className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60 transition-colors flex-shrink-0 font-medium"
            >
              {connectingGithub ? <Loader2 size={11} className="animate-spin" /> : <Github size={11} />}
              Connect GitHub
            </button>
          </div>
          <p className="text-[11px] text-slate-400">
            Generate a token with <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-600">repo</code> scope at{' '}
            <a href="https://github.com/settings/tokens" target="_blank" rel="noreferrer" className="text-indigo-600 underline">
              github.com/settings/tokens
            </a>
          </p>
        </div>
      );
    }

    // 3. Slack Webhook Bridge
    if (connector.id === 'connector-slack') {
      if (connector.status === 'connected') {
        return (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              onClick={handleTestSlack}
              disabled={testingSlack}
              className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors font-medium"
            >
              {testingSlack ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />}
              Test Message
            </button>
            <button
              onClick={handleDisconnectSlack}
              className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
            >
              <LogOut size={11} /> Disconnect
            </button>
          </div>
        );
      }
      return (
        <div className="flex flex-col gap-2 w-full pt-1">
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="password"
              placeholder="Incoming Webhook URL (https://hooks.slack.com/...)"
              value={slackWebhook}
              onChange={(e) => setSlackWebhook(e.target.value)}
              className="flex-1 text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-400 min-w-[200px]"
            />
            <input
              type="text"
              placeholder="#channel"
              value={slackChannel}
              onChange={(e) => setSlackChannel(e.target.value)}
              className="w-28 text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-400"
            />
            <button
              onClick={handleConnectSlack}
              disabled={savingSlack || !slackWebhook.trim()}
              className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60 transition-colors flex-shrink-0 font-medium"
            >
              {savingSlack ? <Loader2 size={11} className="animate-spin" /> : <MessageSquare size={11} />}
              Link Slack
            </button>
          </div>
          <p className="text-[11px] text-slate-400">
            Create an Incoming Webhook at{' '}
            <a href="https://api.slack.com/apps" target="_blank" rel="noreferrer" className="text-indigo-600 underline">
              api.slack.com/apps
            </a>{' '}
            to receive approval notifications in Slack.
          </p>
        </div>
      );
    }

    // 4. Multi-Provider LLM & Reasoning Engine (LangGraph)
    if (connector.id === 'connector-gemini') {
      return (
        <div className="flex flex-col gap-3 w-full pt-1">
          {/* Provider Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg">
            {(
              [
                { id: 'gemini', label: 'Gemini', icon: Sparkles },
                { id: 'ollama', label: 'Ollama (Hermes)', icon: Server },
                { id: 'openai', label: 'OpenAI', icon: Cpu },
                { id: 'openrouter', label: 'OpenRouter', icon: Bot },
              ] as const
            ).map((p) => {
              const Icon = p.icon;
              const isActive = llmProvider === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setLlmProvider(p.id);
                    if (p.id === 'gemini' && !['gemini-3.8-flash', 'gemini-3.6-flash', 'gemini-1.5-flash'].includes(llmModel)) {
                      setLlmModel('gemini-3.8-flash');
                    } else if (p.id === 'ollama') {
                      setLlmModel('hermes3');
                      setLlmBaseUrl('http://localhost:11434/v1');
                    } else if (p.id === 'openai') {
                      setLlmModel('gpt-4o-mini');
                    } else if (p.id === 'openrouter') {
                      setLlmModel('meta-llama/llama-3.3-70b-instruct');
                    }
                  }}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-white text-indigo-700 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Icon size={12} />
                  <span>{p.label}</span>
                </button>
              );
            })}
          </div>

          {/* Quick Model Selector Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
            <span className="text-[11px] text-slate-400 font-medium">Model:</span>
            {llmProvider === 'gemini' && (
              <>
                {['gemini-3.8-flash', 'gemini-3.6-flash', 'gemini-1.5-flash'].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setLlmModel(m)}
                    className={`text-[11px] px-2 py-0.5 rounded-full border transition-colors ${
                      llmModel === m
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700 font-medium'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </>
            )}
            {llmProvider === 'ollama' && (
              <>
                {['hermes3', 'llama3.2', 'mistral', 'qwen2.5-coder'].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setLlmModel(m)}
                    className={`text-[11px] px-2 py-0.5 rounded-full border transition-colors ${
                      llmModel === m
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700 font-medium'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </>
            )}
            {llmProvider === 'openai' && (
              <>
                {['gpt-4o-mini', 'gpt-4o', 'o3-mini'].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setLlmModel(m)}
                    className={`text-[11px] px-2 py-0.5 rounded-full border transition-colors ${
                      llmModel === m
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700 font-medium'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </>
            )}
            {llmProvider === 'openrouter' && (
              <>
                {[
                  'meta-llama/llama-3.3-70b-instruct',
                  'deepseek/deepseek-chat',
                  'anthropic/claude-3.5-sonnet',
                ].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setLlmModel(m)}
                    className={`text-[11px] px-2 py-0.5 rounded-full border transition-colors ${
                      llmModel === m
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700 font-medium'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    {m.split('/')[1] || m}
                  </button>
                ))}
              </>
            )}
          </div>

          {/* Configuration Inputs */}
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                placeholder="Model Name"
                value={llmModel}
                onChange={(e) => setLlmModel(e.target.value)}
                className="w-48 text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-400 font-mono"
              />

              {llmProvider === 'ollama' ? (
                <input
                  type="text"
                  placeholder="Ollama Base URL (http://localhost:11434/v1)"
                  value={llmBaseUrl}
                  onChange={(e) => setLlmBaseUrl(e.target.value)}
                  className="flex-1 text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-400 min-w-[200px]"
                />
              ) : (
                <input
                  type="password"
                  placeholder={
                    llmProvider === 'gemini'
                      ? 'Gemini API Key (AIzaSy...)'
                      : llmProvider === 'openai'
                      ? 'OpenAI API Key (sk-...)'
                      : 'OpenRouter API Key (sk-or-...)'
                  }
                  value={llmApiKey}
                  onChange={(e) => setLlmApiKey(e.target.value)}
                  className="flex-1 text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-400 min-w-[200px]"
                />
              )}

              <button
                type="button"
                onClick={handleSaveLLMConfig}
                disabled={savingLlm}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60 transition-colors flex-shrink-0 font-medium shadow-sm"
              >
                {savingLlm ? <Loader2 size={11} className="animate-spin" /> : <Key size={11} />}
                Apply & Test Engine
              </button>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400">
              {llmProvider === 'ollama' ? (
                <span>
                  Runs 100% locally on your machine via Ollama. No API key required.
                </span>
              ) : llmProvider === 'gemini' ? (
                <span>
                  Get a free Gemini API key at{' '}
                  <a
                    href="https://aistudio.google.com/apikey"
                    target="_blank"
                    rel="noreferrer"
                    className="text-indigo-600 underline"
                  >
                    aistudio.google.com
                  </a>
                </span>
              ) : llmProvider === 'openai' ? (
                <span>
                  Configure at{' '}
                  <a
                    href="https://platform.openai.com/api-keys"
                    target="_blank"
                    rel="noreferrer"
                    className="text-indigo-600 underline"
                  >
                    platform.openai.com
                  </a>
                </span>
              ) : (
                <span>
                  Access open-weight models at{' '}
                  <a
                    href="https://openrouter.ai/keys"
                    target="_blank"
                    rel="noreferrer"
                    className="text-indigo-600 underline"
                  >
                    openrouter.ai
                  </a>
                </span>
              )}
              <span className="font-mono text-slate-500">
                Active: {llmProvider}/{llmModel}
              </span>
            </div>
          </div>
        </div>
      );
    }

    // 5. Telegram Bot Bridge
    if (connector.id === 'connector-telegram') {
      return (
        <div className="flex flex-col gap-2 w-full pt-1">
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="password"
              placeholder="Bot Token (e.g. 123456:ABC...)"
              value={telegramToken}
              onChange={(e) => setTelegramToken(e.target.value)}
              className="flex-1 text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-400 min-w-[170px]"
            />
            <input
              type="text"
              placeholder="Chat ID (optional)"
              value={telegramChatId}
              onChange={(e) => setTelegramChatId(e.target.value)}
              className="w-28 text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-400"
            />
            <button
              onClick={handleSaveTelegram}
              disabled={savingTelegram || !telegramToken.trim()}
              className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 disabled:opacity-60 transition-colors flex-shrink-0 font-medium"
            >
              {savingTelegram ? <Loader2 size={11} className="animate-spin" /> : <Bot size={11} />}
              Save & Link
            </button>
            {connector.status === 'connected' && (
              <button
                onClick={handleTestTelegram}
                disabled={savingTelegram}
                className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors flex-shrink-0 font-medium"
              >
                <Send size={11} /> Test Alert
              </button>
            )}
          </div>
          <p className="text-[11px] text-slate-400">
            Tip: Message your bot with <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-600">/start</code> to automatically bind your chat ID.
          </p>
        </div>
      );
    }

    // 6. Naukri.com
    if (connector.id === 'connector-naukri') {
      const acc = browserAccounts['naukri'];
      const isConnected = acc?.connected;

      return (
        <div className="flex flex-col gap-3 w-full pt-1">
          {/* Customer Account Session Status Banner */}
          <div className="flex items-center justify-between p-3 rounded-xl border border-indigo-200/80 bg-indigo-50/50">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                N
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-slate-800">
                    {isConnected ? `Naukri Candidate Account: Linked (@${acc?.username || 'User'})` : 'Naukri.com Personal Account'}
                  </span>
                  <span className={`inline-flex items-center px-1.5 py-0.2 rounded-full text-[10px] font-medium ${isConnected ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'}`}>
                    {isConnected ? 'Active Session' : 'Not Connected'}
                  </span>
                </div>
                <span className="text-[11px] text-slate-500">
                  {isConnected
                    ? `${acc?.summary || 'Recruiter search appearances & applied jobs tracked'}`
                    : 'Link your personal Naukri account with 1-click desktop login (OTP supported).'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isConnected ? (
                <>
                  <button
                    onClick={() => handleSyncBrowser('naukri')}
                    disabled={syncingPlatform === 'naukri'}
                    className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg bg-white text-slate-700 hover:bg-slate-50 border border-slate-300 font-medium shadow-xs transition-colors"
                  >
                    {syncingPlatform === 'naukri' ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />}
                    Sync Activity
                  </button>
                  <button
                    onClick={() => handleDisconnectBrowser('naukri')}
                    className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg text-rose-600 hover:bg-rose-50 font-medium transition-colors"
                  >
                    Disconnect
                  </button>
                </>
              ) : (
                <button
                  onClick={() => openBrowserLogin('naukri', 'Naukri.com')}
                  className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 font-medium shadow-sm transition-colors"
                >
                  <Laptop size={12} />
                  Link Account (Browser Login)
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              placeholder="Target Role (e.g. Senior Backend Engineer)"
              value={naukriRole}
              onChange={(e) => setNaukriRole(e.target.value)}
              className="flex-1 text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-400 min-w-[200px]"
            />
            <button
              onClick={handleSearchNaukri}
              disabled={searchingNaukri || !naukriRole.trim()}
              className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition-colors font-medium flex-shrink-0"
            >
              {searchingNaukri ? <Loader2 size={11} className="animate-spin" /> : <Building2 size={11} />}
              Search Unicorns
            </button>
          </div>
        </div>
      );
    }

    // 7. LinkedIn
    if (connector.id === 'connector-linkedin') {
      const acc = browserAccounts['linkedin'];
      const isConnected = acc?.connected;

      return (
        <div className="flex flex-col gap-3 w-full pt-1">
          {/* Customer Account Session Status Banner */}
          <div className="flex items-center justify-between p-3 rounded-xl border border-sky-200/80 bg-sky-50/50">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-sky-600 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                in
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-slate-800">
                    {isConnected ? `LinkedIn Professional: Linked (@${acc?.username || 'User'})` : 'LinkedIn Personal Account'}
                  </span>
                  <span className={`inline-flex items-center px-1.5 py-0.2 rounded-full text-[10px] font-medium ${isConnected ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'}`}>
                    {isConnected ? 'Active Session' : 'Not Connected'}
                  </span>
                </div>
                <span className="text-[11px] text-slate-500">
                  {isConnected
                    ? `${acc?.summary || 'Applied jobs tracker and profile sync active'}`
                    : 'Link your personal LinkedIn to let Chief Agent track applied jobs & recruiter views.'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isConnected ? (
                <>
                  <button
                    onClick={() => handleSyncBrowser('linkedin')}
                    disabled={syncingPlatform === 'linkedin'}
                    className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg bg-white text-slate-700 hover:bg-slate-50 border border-slate-300 font-medium shadow-xs transition-colors"
                  >
                    {syncingPlatform === 'linkedin' ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />}
                    Sync Applications
                  </button>
                  <button
                    onClick={() => handleDisconnectBrowser('linkedin')}
                    className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg text-rose-600 hover:bg-rose-50 font-medium transition-colors"
                  >
                    Disconnect
                  </button>
                </>
              ) : (
                <button
                  onClick={() => openBrowserLogin('linkedin', 'LinkedIn')}
                  className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-sky-600 text-white hover:bg-sky-700 font-medium shadow-sm transition-colors"
                >
                  <Laptop size={12} />
                  Link Account (Browser Login)
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              placeholder="Target Role (e.g. Staff Software Engineer)"
              value={linkedinRole}
              onChange={(e) => setLinkedinRole(e.target.value)}
              className="flex-1 text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-400 min-w-[200px]"
            />
            <button
              onClick={handleSearchLinkedin}
              disabled={searchingLinkedin || !linkedinRole.trim()}
              className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-colors font-medium flex-shrink-0"
            >
              {searchingLinkedin ? <Loader2 size={11} className="animate-spin" /> : <Search size={11} />}
              Search GCCs
            </button>
          </div>
        </div>
      );
    }

    // 8. Amazon India
    if (connector.id === 'connector-amazon') {
      const acc = browserAccounts['amazon'];
      const isConnected = acc?.connected;

      return (
        <div className="flex flex-col gap-3 w-full pt-1">
          {/* Customer Account Session Status Banner */}
          <div className="flex items-center justify-between p-3 rounded-xl border border-amber-200/80 bg-amber-50/50">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                a
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-slate-800">
                    {isConnected ? `Amazon Prime: Linked (@${acc?.username || 'User'})` : 'Amazon India Customer Account'}
                  </span>
                  <span className={`inline-flex items-center px-1.5 py-0.2 rounded-full text-[10px] font-medium ${isConnected ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'}`}>
                    {isConnected ? 'Active Session' : 'Not Connected'}
                  </span>
                </div>
                <span className="text-[11px] text-slate-500">
                  {isConnected
                    ? `${acc?.summary || 'Orders and delivery tracking active'}`
                    : 'Log in once on desktop to let Chief Agent track orders & shipments.'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isConnected ? (
                <>
                  <button
                    onClick={() => handleSyncBrowser('amazon')}
                    disabled={syncingPlatform === 'amazon'}
                    className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg bg-white text-slate-700 hover:bg-slate-50 border border-slate-300 font-medium shadow-xs transition-colors"
                  >
                    {syncingPlatform === 'amazon' ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />}
                    Sync Orders
                  </button>
                  <button
                    onClick={() => handleDisconnectBrowser('amazon')}
                    className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg text-rose-600 hover:bg-rose-50 font-medium transition-colors"
                  >
                    Disconnect
                  </button>
                </>
              ) : (
                <button
                  onClick={() => openBrowserLogin('amazon', 'Amazon India')}
                  className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-amber-600 text-white hover:bg-amber-700 font-medium shadow-sm transition-colors"
                >
                  <Laptop size={12} />
                  Link Account (Browser Login)
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              placeholder="Search product (e.g. MacBook Air M2, Sony WH-1000XM5)"
              value={amazonProduct}
              onChange={(e) => setAmazonProduct(e.target.value)}
              className="flex-1 text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-400 min-w-[200px]"
            />
            <button
              onClick={handleSearchAmazon}
              disabled={searchingAmazon || !amazonProduct.trim()}
              className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 transition-colors font-medium flex-shrink-0"
            >
              {searchingAmazon ? <Loader2 size={11} className="animate-spin" /> : <ShoppingBag size={11} />}
              Check Amazon Deals
            </button>
          </div>
        </div>
      );
    }

    // 9. Flipkart
    if (connector.id === 'connector-flipkart') {
      const acc = browserAccounts['flipkart'];
      const isConnected = acc?.connected;

      return (
        <div className="flex flex-col gap-3 w-full pt-1">
          {/* Customer Account Session Status Banner */}
          <div className="flex items-center justify-between p-3 rounded-xl border border-blue-200/80 bg-blue-50/50">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                F
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-slate-800">
                    {isConnected ? `Flipkart Customer: Linked (@${acc?.username || 'User'})` : 'Flipkart Customer Account'}
                  </span>
                  <span className={`inline-flex items-center px-1.5 py-0.2 rounded-full text-[10px] font-medium ${isConnected ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'}`}>
                    {isConnected ? 'Active Session' : 'Not Connected'}
                  </span>
                </div>
                <span className="text-[11px] text-slate-500">
                  {isConnected
                    ? `${acc?.summary || 'Order history & package delivery tracking active'}`
                    : 'Link your personal Flipkart account with 1-click desktop login (OTP supported).'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isConnected ? (
                <>
                  <button
                    onClick={() => handleSyncBrowser('flipkart')}
                    disabled={syncingPlatform === 'flipkart'}
                    className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg bg-white text-slate-700 hover:bg-slate-50 border border-slate-300 font-medium shadow-xs transition-colors"
                  >
                    {syncingPlatform === 'flipkart' ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />}
                    Sync Orders
                  </button>
                  <button
                    onClick={() => handleDisconnectBrowser('flipkart')}
                    className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg text-rose-600 hover:bg-rose-50 font-medium transition-colors"
                  >
                    Disconnect
                  </button>
                </>
              ) : (
                <button
                  onClick={() => openBrowserLogin('flipkart', 'Flipkart')}
                  className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-medium shadow-sm transition-colors"
                >
                  <Laptop size={12} />
                  Link Account (Browser Login)
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              placeholder="Search product (e.g. iPhone 15, Mechanical Keyboard)"
              value={flipkartProduct}
              onChange={(e) => setFlipkartProduct(e.target.value)}
              className="flex-1 text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-400 min-w-[200px]"
            />
            <button
              onClick={handleSearchFlipkart}
              disabled={searchingFlipkart || !flipkartProduct.trim()}
              className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200 transition-colors font-medium flex-shrink-0"
            >
              {searchingFlipkart ? <Loader2 size={11} className="animate-spin" /> : <ShoppingBag size={11} />}
              Check Flipkart Prices
            </button>
          </div>
        </div>
      );
    }

    // 10. Google Web Search & Search History
    if (connector.id === 'connector-google-search') {
      return (
        <div className="flex flex-col gap-2 w-full pt-1">
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              placeholder="Search web or docs (e.g. Next.js 14 server actions)"
              value={googleQuery}
              onChange={(e) => setGoogleQuery(e.target.value)}
              className="flex-1 text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-400 min-w-[200px]"
            />
            <button
              onClick={handleSearchGoogle}
              disabled={searchingGoogle || !googleQuery.trim()}
              className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors font-medium flex-shrink-0 shadow-sm"
            >
              {searchingGoogle ? <Loader2 size={11} className="animate-spin" /> : <Globe size={11} />}
              Search Google
            </button>
            <button
              onClick={() => {
                setShowSearchHistory(!showSearchHistory);
                if (!showSearchHistory) handleFetchSearchHistory();
              }}
              className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors font-medium flex-shrink-0"
            >
              {showSearchHistory ? 'Hide History' : 'View History'}
            </button>
          </div>
          {showSearchHistory && (
            <div className="mt-2 p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
              <span className="text-[11px] font-semibold text-slate-600 uppercase">Recent Search Logs</span>
              {recentSearches.length === 0 ? (
                <p className="text-xs text-slate-400">No search queries recorded yet.</p>
              ) : (
                recentSearches.slice(0, 5).map((s, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs text-slate-700 py-0.5 border-b border-slate-100 last:border-none">
                    <span className="font-medium text-indigo-700">{s.query}</span>
                    <span className="text-[10px] text-slate-400">{new Date(s.timestamp).toLocaleTimeString()}</span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      );
    }

    return null;
  };

  const statusMsg =
    googleSearchMsg ??
    naukriMsg ??
    linkedinMsg ??
    amazonMsg ??
    flipkartMsg ??
    llmMsg ??
    googleMsg ??
    githubMsg ??
    slackMsg ??
    geminiMsg ??
    telegramMsg;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Plug size={15} className="text-slate-500" />
          <span className="text-sm font-semibold text-slate-800">Connectors</span>
          <span className="text-xs text-slate-400">({connectors.length})</span>
        </div>
        <button
          onClick={onRefresh}
          className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          title="Refresh connectors status"
        >
          <RefreshCw size={14} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {error && <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

        {statusMsg && (
          <p className={`text-xs px-3 py-2 rounded-lg ${statusMsg.ok ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
            {statusMsg.text}
          </p>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={20} className="text-indigo-400 animate-spin" />
          </div>
        ) : (
          connectors.map((connector) => (
            <ConnectorCard
              key={connector.id}
              connector={connector}
              actions={actionsFor(connector)}
            />
          ))
        )}
      </div>

      {browserModal && (
        <BrowserLoginModal
          platform={browserModal.platform}
          displayName={browserModal.displayName}
          isOpen={browserModal.open}
          onClose={() => setBrowserModal(null)}
          onSuccess={async () => {
            setBrowserModal(null);
            await fetchBrowserAccounts();
            onRefresh();
          }}
        />
      )}
    </div>
  );
}
