'use client';

import { useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { chat } from '@/lib/api';
import type { ChatMessage, OrchestrationStepTrace } from '@/lib/types';

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sending, setSending] = useState(false);
  const [lastTrace, setLastTrace] = useState<OrchestrationStepTrace[]>([]);

  const sendMessage = useCallback(async (prompt: string) => {
    if (!prompt.trim()) return;

    // Optimistically add the user message
    const userMsg: ChatMessage = {
      id: uuidv4(),
      sender: 'user',
      text: prompt,
      timestamp: new Date().toLocaleTimeString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setSending(true);

    try {
      const res = await chat.send(prompt);

      const chiefMsg: ChatMessage = {
        id: uuidv4(),
        sender: 'chief',
        text: res.summary,
        orchestrationTrace: res.orchestrationTrace,
        timestamp: new Date().toLocaleTimeString(),
      };
      setMessages((prev) => [...prev, chiefMsg]);
      setLastTrace(res.orchestrationTrace ?? []);
    } catch (err: unknown) {
      const text =
        err instanceof Error ? err.message : 'Chief Agent is unavailable.';
      const errMsg: ChatMessage = {
        id: uuidv4(),
        sender: 'chief',
        text: `⚠️ ${text}`,
        timestamp: new Date().toLocaleTimeString(),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setSending(false);
    }
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setLastTrace([]);
  }, []);

  return { messages, sending, lastTrace, sendMessage, clearMessages };
}
