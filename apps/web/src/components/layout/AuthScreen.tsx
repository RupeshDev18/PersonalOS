'use client';

import React, { useState } from 'react';
import GhostMascot from '@/components/GhostMascot';
import { AlertCircle, ArrowRight } from 'lucide-react';

interface AuthScreenProps {
  onLogin: (email: string, password?: string) => Promise<void>;
  onSignup: (name: string, email: string, password?: string, title?: string) => Promise<void>;
  error: string | null;
}

export default function AuthScreen({ onLogin, onSignup, error }: AuthScreenProps) {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [errorDismissed, setErrorDismissed] = useState(false);

  // login fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // signup extras
  const [name, setName] = useState('');
  const [title, setTitle] = useState('');

  const displayError = errorDismissed ? localError : (localError || error);

  const handleSwitchMode = (newMode: 'login' | 'signup') => {
    setMode(newMode);
    setLocalError(null);
    setErrorDismissed(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setErrorDismissed(false);
    setLoading(true);
    try {
      if (mode === 'login') {
        await onLogin(email, password);
      } else {
        await onSignup(name, email, password, title);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Authentication failed. Please check your credentials.';
      setLocalError(msg);
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    'w-full px-3.5 py-2.5 text-sm font-medium text-slate-900 bg-white placeholder:text-slate-400 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm transition-all';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <GhostMascot size="lg" mood="happy" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 font-heading">Personal AI OS</h1>
          <p className="text-slate-500 text-sm mt-1">Your Chief Agent awaits</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          {/* Tab switcher */}
          <div className="flex rounded-xl bg-slate-100 p-1 mb-5">
            {(['login', 'signup'] as const).map((m) => (
              <button
                key={m}
                onClick={() => handleSwitchMode(m)}
                className={`flex-1 py-1.5 text-sm font-semibold rounded-lg transition-colors ${
                  mode === m
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {m === 'login' ? 'Sign In' : 'Sign Up'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === 'signup' && (
              <>
                <input
                  type="text"
                  placeholder="Full name (e.g. Rupesh Yadav)"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (localError) setLocalError(null);
                  }}
                  required
                  className={inputClass}
                />
                <input
                  type="text"
                  placeholder="Job title (optional)"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className={inputClass}
                />
              </>
            )}
            <input
              type="email"
              placeholder="Email address (e.g. rupesh.dev@gmail.com)"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (localError) setLocalError(null);
              }}
              required
              className={inputClass}
            />
            <input
              type="password"
              placeholder="Password (any value for now)"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (localError) setLocalError(null);
              }}
              className={inputClass}
            />

            {displayError && (
              <div className="text-xs text-red-600 bg-red-50 border border-red-200 p-3 rounded-xl flex items-start gap-2 animate-in fade-in">
                <AlertCircle size={16} className="mt-0.5 flex-shrink-0 text-red-500" />
                <div className="flex-1 space-y-1">
                  <p className="font-semibold text-red-800">{displayError}</p>
                  {mode === 'login' && displayError.toLowerCase().includes('no account') && (
                    <button
                      type="button"
                      onClick={() => {
                        handleSwitchMode('signup');
                        if (!name && email.includes('.')) {
                          const guessedName = email.split('@')[0].replace('.', ' ');
                          setName(guessedName.charAt(0).toUpperCase() + guessedName.slice(1));
                        }
                      }}
                      className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-bold hover:underline mt-1"
                    >
                      <span>Create account as new operator</span>
                      <ArrowRight size={12} />
                    </button>
                  )}
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-60 shadow-sm"
            >
              {loading ? 'Please wait…' : mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          {/* Quick dev login */}
          <div className="mt-4 pt-4 border-t border-slate-100">
            <p className="text-xs text-slate-400 text-center mb-2">Quick access (dev)</p>
            <button
              onClick={async () => {
                setLocalError(null);
                try {
                  await onLogin('ry993494787@gmail.com');
                } catch (err: unknown) {
                  const msg = err instanceof Error ? err.message : 'Login failed';
                  setLocalError(msg);
                }
              }}
              className="w-full py-2 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-colors"
            >
              Login as Rupesh Yadav
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
