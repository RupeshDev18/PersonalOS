'use client';

import { useState, useCallback, useEffect } from 'react';
import { connectors as connectorsApi, getToken } from '@/lib/api';
import type { ConnectorInfo } from '@/lib/types';

export function useConnectors(userId?: string) {
  const [list, setList] = useState<ConnectorInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!userId && !getToken()) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await connectorsApi.list();
      setList(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load connectors');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { 
    if (userId || getToken()) {
      fetch(); 
    }
  }, [fetch, userId]);

  const connectGoogle = useCallback(
    async (email: string, authMethod?: string, credential?: string) => {
      await connectorsApi.connectGoogle(email, authMethod, credential);
      await fetch();
    },
    [fetch],
  );

  const disconnectGoogle = useCallback(async () => {
    await connectorsApi.disconnectGoogle();
    await fetch();
  }, [fetch]);

  const getGoogleAuthUrl = useCallback(
    async (redirectUri?: string) => {
      return connectorsApi.googleAuthUrl(redirectUri);
    },
    [],
  );

  const setGeminiKey = useCallback(
    async (apiKey: string) => {
      const result = await connectorsApi.setGeminiKey(apiKey);
      await fetch();
      return result;
    },
    [fetch],
  );

  const testGemini = useCallback(() => connectorsApi.testGemini(), []);

  const googleConnector = list.find((c) => c.id === 'connector-google-workspace');
  const geminiConnector = list.find((c) => c.id === 'connector-gemini');
  const isGoogleConnected = googleConnector?.status === 'connected';
  const isGeminiActive = geminiConnector?.isLive === true;

  return {
    list, loading, error,
    googleConnector, geminiConnector,
    isGoogleConnected, isGeminiActive,
    refresh: fetch,
    connectGoogle, disconnectGoogle, getGoogleAuthUrl,
    setGeminiKey, testGemini,
  };
}
