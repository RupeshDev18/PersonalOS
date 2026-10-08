'use client';

import { useState, useCallback, useEffect } from 'react';
import { finance as financeApi } from '@/lib/api';
import type { SpendingAnalysis, Transaction } from '@/lib/types';

export function useFinance() {
  const [analysis, setAnalysis] = useState<SpendingAnalysis | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [a, t] = await Promise.all([
        financeApi.overview(),
        financeApi.transactions(50),
      ]);
      setAnalysis(a);
      setTransactions(t);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load finance data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const importCsv = useCallback(
    async (csv: string, accountId?: string) => {
      setActionLoading(true);
      setError(null);
      try {
        const res = await financeApi.importCsv(csv, accountId);
        await fetch();
        return res;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to import CSV';
        setError(msg);
        throw new Error(msg);
      } finally {
        setActionLoading(false);
      }
    },
    [fetch],
  );

  const createTransaction = useCallback(
    async (data: {
      amount: number;
      merchant: string;
      description?: string;
      category?: string;
      date?: string;
      isRecurring?: boolean;
      accountId?: string;
    }) => {
      setActionLoading(true);
      setError(null);
      try {
        const res = await financeApi.createTransaction(data);
        await fetch();
        return res;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to create transaction';
        setError(msg);
        throw new Error(msg);
      } finally {
        setActionLoading(false);
      }
    },
    [fetch],
  );

  return {
    analysis,
    transactions,
    loading,
    actionLoading,
    error,
    refresh: fetch,
    importCsv,
    createTransaction,
  };
}
