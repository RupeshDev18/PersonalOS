'use client';

import { useState, useCallback, useEffect } from 'react';
import { approvals as approvalsApi, getToken } from '@/lib/api';
import type { ApprovalRequest } from '@/lib/types';

export function useApprovals(userId?: string) {
  const [list, setList] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!userId && !getToken()) return;
    setLoading(true);
    setError(null);
    try {
      const data = await approvalsApi.list();
      setList(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load approvals');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { 
    if (userId || getToken()) {
      fetch(); 
    }
  }, [fetch, userId]);

  const decide = useCallback(
    async (id: string, decision: 'approve' | 'reject', note?: string) => {
      try {
        const updated = await approvalsApi.decide(id, decision, note);
        setList((prev) => prev.map((a) => (a.id === id ? updated : a)));
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Decision failed');
        throw err;
      }
    },
    [],
  );

  const pendingCount = list.filter((a) => a.status === 'pending').length;

  return { list, loading, error, pendingCount, refresh: fetch, decide };
}
