'use client';

import { useState, useCallback, useEffect } from 'react';
import { finance as financeApi } from '@/lib/api';
import type { SpendingAnalysis, Transaction } from '@/lib/types';

export interface BankAccountInfo {
  fipId: string;
  fipName: string;
  accountType: string;
  maskedAccountNumber: string;
  currentBalance: number;
  currency: string;
  lastUpdated: string;
}

export function useFinance() {
  const [analysis, setAnalysis] = useState<SpendingAnalysis | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccountInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [a, t, b] = await Promise.all([
        financeApi.overview(),
        financeApi.transactions(50),
        financeApi.bankAccounts().catch(() => []),
      ]);
      setAnalysis(a);
      setTransactions(t);
      setBankAccounts(b || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load finance data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const syncBanks = useCallback(async () => {
    setActionLoading(true);
    setError(null);
    try {
      const res = await financeApi.syncBanks();
      await fetch();
      return res;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to sync bank accounts';
      setError(msg);
      throw new Error(msg);
    } finally {
      setActionLoading(false);
    }
  }, [fetch]);

  const linkAa = useCallback(
    async (vpaOrMobile: string, banks?: string[]) => {
      setActionLoading(true);
      setError(null);
      try {
        const res = await financeApi.linkAa(vpaOrMobile, banks);
        await fetch();
        return res;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to link Account Aggregator';
        setError(msg);
        throw new Error(msg);
      } finally {
        setActionLoading(false);
      }
    },
    [fetch],
  );

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
    bankAccounts,
    loading,
    actionLoading,
    error,
    refresh: fetch,
    syncBanks,
    linkAa,
    importCsv,
    createTransaction,
  };
}
