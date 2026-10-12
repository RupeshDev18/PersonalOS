'use client';

import { useState, useCallback, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { chat, getToken } from '@/lib/api';
import type { ChatMessage, OrchestrationStepTrace } from '@/lib/types';

const STORAGE_CONV_KEY = 'pos_active_conversation_id';

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sending, setSending] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [lastTrace, setLastTrace] = useState<OrchestrationStepTrace[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Load chat history from PostgreSQL on mount or when token is present
  useEffect(() => {
    let isMounted = true;
    const token = getToken();
    if (!token) return;

    const savedConvId = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_CONV_KEY) : null;

    async function loadHistory() {
      setLoadingHistory(true);
      try {
        const res = await chat.history(savedConvId || undefined);
        if (isMounted && res) {
          if (res.conversationId) {
            setConversationId(res.conversationId);
            localStorage.setItem(STORAGE_CONV_KEY, res.conversationId);
          }
          if (res.messages && res.messages.length > 0) {
            setMessages(res.messages);
            const lastWithTrace = [...res.messages].reverse().find((m) => m.orchestrationTrace?.length);
            if (lastWithTrace?.orchestrationTrace) {
              setLastTrace(lastWithTrace.orchestrationTrace);
            }
          }
        }
      } catch {
        // Fall back gracefully if offline or unauthorized
      } finally {
        if (isMounted) setLoadingHistory(false);
      }
    }

    loadHistory();

    return () => {
      isMounted = false;
    };
  }, []);

  const sendMessage = useCallback(
    async (prompt: string) => {
      if (!prompt.trim() || sending) return;

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
        const res = await chat.send(prompt, conversationId || undefined);

        if (res.conversationId) {
          setConversationId(res.conversationId);
          if (typeof window !== 'undefined') {
            localStorage.setItem(STORAGE_CONV_KEY, res.conversationId);
          }
        }

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
    },
    [conversationId, sending],
  );

  const clearMessages = useCallback(async () => {
    setMessages([]);
    setLastTrace([]);
    try {
      const res = await chat.clear();
      if (res?.conversationId) {
        setConversationId(res.conversationId);
        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_CONV_KEY, res.conversationId);
        }
      }
    } catch {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(STORAGE_CONV_KEY);
      }
      setConversationId(null);
    }
  }, []);

  return {
    messages,
    sending,
    loadingHistory,
    conversationId,
    lastTrace,
    sendMessage,
    clearMessages,
  };
}
