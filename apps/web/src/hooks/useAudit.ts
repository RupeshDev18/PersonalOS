'use client';

import { useState, useCallback, useEffect } from 'react';
import { audit as auditApi, getToken } from '@/lib/api';
import type { AuditEvent } from '@/lib/types';

export function useAudit(userId?: string, autoRefreshMs = 0) {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async (limit = 50) => {
    if (!userId && !getToken()) return;
    setLoading(true);
    setError(null);
    try {
      const data = await auditApi.events(limit);
      setEvents(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load audit log');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId || getToken()) {
      fetch();
    }
    if (!autoRefreshMs || (!userId && !getToken())) return;
    const id = setInterval(() => fetch(), autoRefreshMs);
    return () => clearInterval(id);
  }, [fetch, userId, autoRefreshMs]);

  return { events, loading, error, refresh: fetch };
}
