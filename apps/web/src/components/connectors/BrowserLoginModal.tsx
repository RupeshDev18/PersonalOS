'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  ExternalLink,
  ShieldCheck,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Laptop,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import { connectors as apiConnectors } from '@/lib/api';

interface BrowserLoginModalProps {
  platform: 'amazon' | 'flipkart' | 'linkedin' | 'naukri';
  displayName: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function BrowserLoginModal({
  platform,
  displayName,
  isOpen,
  onClose,
  onSuccess,
}: BrowserLoginModalProps) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'launching' | 'waiting' | 'success' | 'failed'>('idle');
  const [message, setMessage] = useState('');
  const [accountInfo, setAccountInfo] = useState<any>(null);

  useEffect(() => {
    if (!isOpen) {
      setStatus('idle');
      setMessage('');
      setAccountInfo(null);
      return;
    }

    let intervalId: any = null;
    let cancelled = false;

    const start = async () => {
      setLoading(true);
      setStatus('launching');
      setMessage('Opening Chrome window on your desktop...');

      try {
        const res = await apiConnectors.browserLoginStart(platform);
        if (cancelled) return;

        setStatus('waiting');
        setMessage(res.message || 'Chrome window opened. Please complete your login & OTP in the opened window.');

        // Poll every 2.5s for automatic login detection
        intervalId = setInterval(async () => {
          try {
            const check = await apiConnectors.browserLoginStatus(platform);
            if (check.status === 'success' || check.isSaved) {
              clearInterval(intervalId);
              setStatus('success');
              setAccountInfo(check.accountInfo);
              setMessage(`Successfully authenticated with ${displayName}!`);
              setTimeout(() => {
                onSuccess();
              }, 1800);
            } else if (check.status === 'failed') {
              clearInterval(intervalId);
              setStatus('failed');
              setMessage(check.message || 'Login timed out or failed.');
            }
          } catch {
            // Polling error
          }
        }, 2500);
      } catch (err: any) {
        if (!cancelled) {
          setStatus('failed');
          setMessage(err.message || 'Failed to launch desktop browser.');
        }
      } finally {
        setLoading(false);
      }
    };

    start();

    return () => {
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
    };
  }, [isOpen, platform, displayName, onSuccess]);

  if (!isOpen) return null;

  const handleManualComplete = async () => {
    setLoading(true);
    try {
      const res = await apiConnectors.browserLoginComplete(platform);
      setStatus('success');
      setAccountInfo(res.accountInfo);
      setMessage(res.message || 'Session captured successfully!');
      setTimeout(() => {
        onSuccess();
      }, 1500);
    } catch (err: any) {
      setMessage(`Sync check: ${err.message}. If you have finished logging in, wait a few seconds and try again.`);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    try {
      await apiConnectors.browserLoginCancel(platform);
    } catch {}
    onClose();
  };

  const getPlatformBrand = () => {
    switch (platform) {
      case 'amazon':
        return { color: 'amber', bg: 'bg-amber-500', lightBg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-300' };
      case 'flipkart':
        return { color: 'blue', bg: 'bg-blue-600', lightBg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-300' };
      case 'linkedin':
        return { color: 'sky', bg: 'bg-sky-600', lightBg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-300' };
      case 'naukri':
        return { color: 'indigo', bg: 'bg-indigo-600', lightBg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-300' };
    }
  };

  const brand = getPlatformBrand();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl ${brand.bg} text-white flex items-center justify-center font-bold text-sm shadow-sm`}>
              {platform[0].toUpperCase()}
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 text-sm">
                Link {displayName} Personal Account
              </h3>
              <p className="text-xs text-slate-500">Local Browser Session with OTP & 2FA support</p>
            </div>
          </div>
          <button
            onClick={handleCancel}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 flex flex-col gap-5">
          {/* Visual Step Card */}
          <div className={`p-4 rounded-xl border ${brand.border} ${brand.lightBg} flex items-start gap-3.5`}>
            <div className="p-2 rounded-lg bg-white shadow-sm text-slate-700 flex-shrink-0">
              <Laptop size={20} className={status === 'waiting' ? 'animate-pulse text-indigo-600' : ''} />
            </div>
            <div className="flex flex-col gap-1 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-900">
                  {status === 'launching' && 'Opening Desktop Chrome...'}
                  {status === 'waiting' && 'Desktop Chrome Window Active'}
                  {status === 'success' && 'Account Successfully Linked!'}
                  {status === 'failed' && 'Session Interrupted'}
                </span>
                {status === 'waiting' && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 text-amber-800">
                    <Loader2 size={10} className="animate-spin mr-1" /> Waiting for OTP / Login
                  </span>
                )}
                {status === 'success' && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-100 text-emerald-800">
                    <CheckCircle2 size={10} className="mr-1" /> Active
                  </span>
                )}
              </div>
              <p className="text-slate-600 leading-relaxed">
                {message || 'A real Google Chrome window has been launched on your desktop directly at the official login page.'}
              </p>
            </div>
          </div>

          {/* Instructions List */}
          <div className="flex flex-col gap-2.5 bg-slate-50 p-4 rounded-xl text-xs text-slate-600 border border-slate-200/80">
            <span className="font-medium text-slate-800">How this works securely:</span>
            <div className="flex items-start gap-2">
              <div className="w-4 h-4 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-[10px] flex-shrink-0 mt-0.5">1</div>
              <span>Switch to the opened Chrome window and enter your phone number / email and password.</span>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-4 h-4 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-[10px] flex-shrink-0 mt-0.5">2</div>
              <span>Enter your OTP or complete 2FA approval naturally in the browser.</span>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-4 h-4 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-[10px] flex-shrink-0 mt-0.5">3</div>
              <span>Once logged in, PersonalOS automatically saves your authenticated session into your local encrypted vault and closes the window.</span>
            </div>
          </div>

          {/* Security Guarantee Note */}
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <ShieldCheck size={14} className="text-emerald-600 flex-shrink-0" />
            <span>Credentials stay strictly on your local computer. No passwords or cards are ever transmitted externally.</span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/50">
          <button
            type="button"
            onClick={handleCancel}
            className="text-xs font-medium text-slate-600 hover:text-slate-800 px-3.5 py-2 rounded-lg hover:bg-slate-200/60 transition-colors"
          >
            Cancel
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleManualComplete}
              disabled={loading || status === 'success'}
              className="flex items-center gap-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-3.5 py-2 rounded-lg transition-colors shadow-sm disabled:opacity-50"
            >
              {loading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
              <span>I&apos;m Logged In — Sync Now</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
