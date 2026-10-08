'use client';

import React from 'react';
import GhostMascot from '@/components/GhostMascot';
import OrchestrationTrace from './OrchestrationTrace';
import type { ChatMessage as ChatMessageType } from '@/lib/types';

interface ChatMessageProps {
  message: ChatMessageType;
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.sender === 'user';

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[75%]">
          <div className="bg-indigo-600 text-white text-sm px-4 py-2.5 rounded-2xl rounded-tr-sm shadow-sm">
            {message.text}
          </div>
          <p className="text-[10px] text-slate-400 text-right mt-1">{message.timestamp}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-2.5 items-start">
      <div className="flex-shrink-0 mt-1">
        <GhostMascot size="sm" mood="happy" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="bg-white border border-slate-200 text-slate-800 text-sm px-4 py-2.5 rounded-2xl rounded-tl-sm shadow-sm">
          <p className="whitespace-pre-wrap leading-relaxed">{message.text}</p>
        </div>
        {message.orchestrationTrace && message.orchestrationTrace.length > 0 && (
          <OrchestrationTrace trace={message.orchestrationTrace} />
        )}
        <p className="text-[10px] text-slate-400 mt-1">{message.timestamp}</p>
      </div>
    </div>
  );
}
