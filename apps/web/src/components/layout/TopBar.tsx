'use client';

import React from 'react';
import { LogOut, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import type { UserProfile, ActivePanel } from '@/lib/types';

const PANEL_LABELS: Record<ActivePanel, string> = {
  chat:       'Chief Agent',
  jobs:       'Job Discovery',
  finance:    'Finance',
  approvals:  'Approvals',
  audit:      'Audit Log',
  connectors: 'Connectors',
  profile:    'Profile',
};

interface TopBarProps {
  user: UserProfile | null;
  activePanel: ActivePanel;
  isApiReachable: boolean;
  onLogout: () => void;
  onRefresh?: () => void;
}

export default function TopBar({
  user, activePanel, isApiReachable, onLogout, onRefresh,
}: TopBarProps) {
  return (
    <header className="h-14 flex items-center justify-between px-5 bg-white border-b border-slate-200 flex-shrink-0">
      {/* Left: breadcrumb */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-slate-800">
          {PANEL_LABELS[activePanel]}
        </span>
      </div>

      {/* Right: status + user */}
      <div className="flex items-center gap-3">
        {/* API reachability */}
        <span className={`flex items-center gap-1.5 text-xs font-medium ${isApiReachable ? 'text-emerald-600' : 'text-red-500'}`}>
          {isApiReachable ? <Wifi size={13} /> : <WifiOff size={13} />}
          {isApiReachable ? 'Connected' : 'Offline'}
        </span>

        {onRefresh && (
          <button
            onClick={onRefresh}
            title="Refresh"
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          >
            <RefreshCw size={15} />
          </button>
        )}

        {/* User avatar */}
        {user && (
          <div className="flex items-center gap-2">
            {user.avatar ? (
              <img
                src={user.avatar}
                alt={user.name}
                className="w-7 h-7 rounded-full object-cover ring-2 ring-slate-200"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 text-xs font-bold">
                {user.name[0]}
              </div>
            )}
            <span className="text-sm font-medium text-slate-700 hidden sm:block">
              {user.name.split(' ')[0]}
            </span>
          </div>
        )}

        <button
          onClick={onLogout}
          title="Sign out"
          className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
        >
          <LogOut size={15} />
        </button>
      </div>
    </header>
  );
}
