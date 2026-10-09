'use client';

import React, { useState } from 'react';
import { Plug, RefreshCw, Loader2, Key, Mail, LogOut, Send, Bot } from 'lucide-react';
import ConnectorCard from './ConnectorCard';
import { notifications } from '@/lib/api';
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
  connectors, loading, error, onRefresh,
  onConnectGoogle, onDisconnectGoogle, onGetGoogleAuthUrl,
  onSetGeminiKey, onTestGemini,
  isGoogleConnected,
}: ConnectorsPanelProps) {
  // Google form state
  const [googleEmail, setGoogleEmail] = useState('');
  const [connectingGoogle, setConnectingGoogle] = useState(false);
  const [googleMsg, setGoogleMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Gemini form state
  const [geminiKey, setGeminiKey] = useState('');
  const [testingGemini, setTestingGemini] = useState(false);
  const [geminiMsg, setGeminiMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Telegram form state
  const [telegramToken, setTelegramToken] = useState('');
  const [telegramChatId, setTelegramChatId] = useState('');
  const [savingTelegram, setSavingTelegram] = useState(false);
  const [telegramMsg, setTelegramMsg] = useState<{ ok: boolean; text: string } | null>(null);

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

  const handleOAuthRedirect = async () => {
    if (!onGetGoogleAuthUrl) return;
    setConnectingGoogle(true);
    setGoogleMsg(null);
    try {
      const res = await onGetGoogleAuthUrl();
      if (res.configured && res.authUrl) {
        window.location.href = res.authUrl;
      } else {
        setGoogleMsg({
          ok: false,
          text: res.message || 'Google OAuth credentials not configured in .env. Use direct email connect below.',
        });
      }
    } catch (e: unknown) {
      setGoogleMsg({ ok: false, text: e instanceof Error ? e.message : 'Failed to launch OAuth.' });
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
    } catch (e: unknown) {
      setGoogleMsg({ ok: false, text: e instanceof Error ? e.message : 'Connection failed.' });
    } finally {
      setConnectingGoogle(false);
    }
  };

  const handleDisconnectGoogle = async () => {
    try {
      await onDisconnectGoogle();
      setGoogleMsg({ ok: true, text: 'Disconnected.' });
    } catch { /* ignore */ }
  };

  const handleSetGeminiKey = async () => {
    if (!geminiKey.trim()) return;
    setTestingGemini(true);
    setGeminiMsg(null);
    try {
      const result = await onSetGeminiKey(geminiKey.trim());
      setGeminiMsg({ ok: result.success, text: result.message });
      if (result.success) setGeminiKey('');
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

  // Build per-connector action slots
  const actionsFor = (connector: ConnectorInfo): React.ReactNode => {
    if (connector.id === 'connector-google-workspace') {
      if (isGoogleConnected) {
        return (
          <button
            onClick={handleDisconnectGoogle}
            className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
          >
            <LogOut size={11} /> Disconnect
          </button>
        );
      }
      return (
        <div className="flex flex-wrap items-center gap-2 flex-1">
          {onGetGoogleAuthUrl && (
            <button
              onClick={handleOAuthRedirect}
              disabled={connectingGoogle}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm transition-all"
              title="Official Google OAuth 2.0"
            >
              {connectingGoogle ? <Loader2 size={11} className="animate-spin" /> : <Mail size={11} />}
              OAuth Consent
            </button>
          )}
          <input
            type="email" placeholder="Or enter Gmail (e.g. dev@gmail.com)"
            value={googleEmail} onChange={(e) => setGoogleEmail(e.target.value)}
            className="flex-1 text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-300 min-w-[160px]"
          />
          <button
            onClick={handleConnectGoogle}
            disabled={connectingGoogle || !googleEmail.trim()}
            className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-60 transition-colors flex-shrink-0"
          >
            Connect
          </button>
        </div>
      );
    }

    if (connector.id === 'connector-gemini') {
      return (
        <div className="flex items-center gap-2 flex-1">
          <input
            type="password" placeholder="Gemini API key (AIzaSy…)"
            value={geminiKey} onChange={(e) => setGeminiKey(e.target.value)}
            className="flex-1 text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-300 min-w-0"
          />
          <button
            onClick={handleSetGeminiKey}
            disabled={testingGemini || !geminiKey.trim()}
            className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 disabled:opacity-60 transition-colors flex-shrink-0"
          >
            {testingGemini ? <Loader2 size={11} className="animate-spin" /> : <Key size={11} />}
            Save
          </button>
          {connector.status === 'connected' && (
            <button
              onClick={handleTestGemini}
              disabled={testingGemini}
              className="text-xs px-2.5 py-1.5 rounded-lg bg-slate-50 text-slate-500 hover:bg-slate-100 transition-colors flex-shrink-0"
            >
              Test
            </button>
          )}
        </div>
      );
    }

    if (connector.id === 'connector-telegram') {
      return (
        <div className="flex flex-col gap-2 w-full pt-1">
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="password"
              placeholder="Bot Token (e.g. 123456:ABC...)"
              value={telegramToken}
              onChange={(e) => setTelegramToken(e.target.value)}
              className="flex-1 text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-300 min-w-[170px]"
            />
            <input
              type="text"
              placeholder="Chat ID (optional)"
              value={telegramChatId}
              onChange={(e) => setTelegramChatId(e.target.value)}
              className="w-28 text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-300"
            />
            <button
              onClick={handleSaveTelegram}
              disabled={savingTelegram || !telegramToken.trim()}
              className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 disabled:opacity-60 transition-colors flex-shrink-0"
            >
              {savingTelegram ? <Loader2 size={11} className="animate-spin" /> : <Bot size={11} />}
              Save & Link
            </button>
            {connector.status === 'connected' && (
              <button
                onClick={handleTestTelegram}
                disabled={savingTelegram}
                className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors flex-shrink-0"
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

  // Status messages
  const statusMsg = googleMsg ?? geminiMsg ?? telegramMsg;

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
        >
          <RefreshCw size={14} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {error && (
          <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
        )}

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
