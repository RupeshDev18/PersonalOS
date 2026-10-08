'use client';

import { useState, useCallback, useEffect } from 'react';
import { jobs as jobsApi } from '@/lib/api';
import type { Job, JobLifecycleStatus, UserCareerProfile } from '@/lib/types';

export function useJobs() {
  const [jobList, setJobList] = useState<Job[]>([]);
  const [profile, setProfile] = useState<UserCareerProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [discovering, setDiscovering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<JobLifecycleStatus | ''>('');
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [minScore, setMinScore] = useState<number | undefined>(undefined);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await jobsApi.list({
        search: search || undefined,
        status: statusFilter || undefined,
        remote: remoteOnly || undefined,
        minScore,
      });
      setJobList(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load jobs');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, remoteOnly, minScore]);

  const fetchProfile = useCallback(async () => {
    try {
      const data = await jobsApi.profile();
      setProfile(data);
    } catch { /* profile not critical */ }
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const triggerDiscovery = useCallback(async () => {
    setDiscovering(true);
    try {
      await jobsApi.triggerDiscovery();
      await fetchJobs();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Discovery failed');
    } finally {
      setDiscovering(false);
    }
  }, [fetchJobs]);

  const updateStatus = useCallback(
    async (id: string, status: JobLifecycleStatus) => {
      try {
        const updated = await jobsApi.updateStatus(id, status);
        setJobList((prev) => prev.map((j) => (j.id === id ? updated : j)));
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Update failed');
      }
    },
    [],
  );

  return {
    jobList, profile, loading, discovering, error,
    search, setSearch,
    statusFilter, setStatusFilter,
    remoteOnly, setRemoteOnly,
    minScore, setMinScore,
    fetchJobs, fetchProfile, triggerDiscovery, updateStatus,
  };
}
