'use client';

import React from 'react';
import {
  MessageSquare, Briefcase, Wallet, ShieldCheck,
  Activity, Plug, User, ChevronRight,
} from 'lucide-react';
import GhostMascot from '@/components/GhostMascot';
import type { ActivePanel } from '@/lib/types';

interface NavItem {
  id: ActivePanel;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}

interface SidebarProps {
  active: ActivePanel;
  onNavigate: (panel: ActivePanel) => void;
  pendingApprovals: number;
  collapsed?: boolean;
}

export default function Sidebar({
  active, onNavigate, pendingApprovals, collapsed = false,
}: SidebarProps) {
  const navItems: NavItem[] = [
    { id: 'chat',       label: 'Chief Agent', icon: <MessageSquare size={18} /> },
    { id: 'jobs',       label: 'Jobs',        icon: <Briefcase size={18} /> },
    { id: 'finance',    label: 'Finance',     icon: <Wallet size={18} /> },
    { id: 'approvals',  label: 'Approvals',   icon: <ShieldCheck size={18} />, badge: pendingApprovals },
    { id: 'audit',      label: 'Audit Log',   icon: <Activity size={18} /> },
    { id: 'connectors', label: 'Connectors',  icon: <Plug size={18} /> },
    { id: 'profile',    label: 'Profile',     icon: <User size={18} /> },
  ];

  return (
    <aside
      className={`
        flex flex-col h-full bg-white border-r border-slate-200
        transition-all duration-200
        ${collapsed ? 'w-16' : 'w-56'}
      `}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-slate-100">
        <GhostMascot size="sm" mood="happy" />
        {!collapsed && (
          <div>
            <p className="text-sm font-bold text-slate-800 font-heading leading-none">PersonalOS</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Chief Ghost</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = active === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`
                w-full flex items-center gap-3 px-4 py-2.5 text-left
                transition-colors duration-100 relative group
                ${isActive
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}
              `}
            >
              <span className={`flex-shrink-0 ${isActive ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'}`}>
                {item.icon}
              </span>
              {!collapsed && (
                <span className="text-sm font-medium flex-1">{item.label}</span>
              )}
              {/* Badge */}
              {item.badge != null && item.badge > 0 && (
                <span className="flex-shrink-0 min-w-[18px] h-[18px] rounded-full bg-amber-400 text-white text-[10px] font-bold flex items-center justify-center px-1">
                  {item.badge}
                </span>
              )}
              {/* Active indicator */}
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-indigo-600 rounded-r" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Collapse hint */}
      {!collapsed && (
        <div className="p-3 border-t border-slate-100">
          <p className="text-[10px] text-slate-300 text-center">v1.0 · Personal AI OS</p>
        </div>
      )}
    </aside>
  );
}
