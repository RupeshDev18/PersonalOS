'use client';

import React, { useState } from 'react';
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
} from 'lucide-react';
import ConnectorCard from './ConnectorCard';
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

  // Gemini state
  const [geminiKey, setGeminiKey] = useState('');
  const [testingGemini, setTestingGemini] = useState(false);
  const [geminiMsg, setGeminiMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Telegram state
  const [telegramToken, setTelegramToken] = useState('');
  const [telegramChatId, setTelegramChatId] = useState('');
  const [savingTelegram, setSavingTelegram] = useState(false);
  const [telegramMsg, setTelegramMsg] = useState<{ ok: boolean; text: string } | null>(null);

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

    // 4. Gemini LLM
    if (connector.id === 'connector-gemini') {
      return (
        <div className="flex items-center gap-2 flex-1 pt-1">
          <input
            type="password"
            placeholder="Gemini API key (AIzaSy…)"
            value={geminiKey}
            onChange={(e) => setGeminiKey(e.target.value)}
            className="flex-1 text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-400 min-w-0"
          />
          <button
            onClick={handleSetGeminiKey}
            disabled={testingGemini || !geminiKey.trim()}
            className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 disabled:opacity-60 transition-colors flex-shrink-0 font-medium"
          >
            {testingGemini ? <Loader2 size={11} className="animate-spin" /> : <Key size={11} />}
            Save
          </button>
          {connector.status === 'connected' && (
            <button
              onClick={handleTestGemini}
              disabled={testingGemini}
              className="text-xs px-2.5 py-1.5 rounded-lg bg-slate-50 text-slate-500 hover:bg-slate-100 transition-colors flex-shrink-0 font-medium"
            >
              Test
            </button>
          )}
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

    return null;
  };

  const statusMsg = googleMsg ?? githubMsg ?? slackMsg ?? geminiMsg ?? telegramMsg;

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
    </div>
  );
}
