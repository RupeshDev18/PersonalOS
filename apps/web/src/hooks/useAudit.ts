'use client';

import { useState, useCallback, useEffect } from 'react';
import { audit as auditApi } from '@/lib/api';
import type { AuditEvent } from '@/lib/types';

export function useAudit(autoRefreshMs = 0) {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async (limit = 50) => {
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
  }, []);

  useEffect(() => {
    fetch();
    if (!autoRefreshMs) return;
    const id = setInterval(() => fetch(), autoRefreshMs);
    return () => clearInterval(id);
  }, [fetch, autoRefreshMs]);

  return { events, loading, error, refresh: fetch };
}
