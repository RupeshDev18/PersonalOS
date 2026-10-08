// ---------------------------------------------------------------------------
// Centralised API client.
//
// All network calls go through this module. Components and hooks never call
// fetch() directly. This makes it trivial to:
//   - swap the base URL in one place
//   - add global error handling
//   - mock for tests
// ---------------------------------------------------------------------------

import type {
  ApprovalRequest,
  ApprovalStatus,
  AuditEvent,
  AuthResponse,
  ChatResponse,
  ConnectorInfo,
  Job,
  JobLifecycleStatus,
  ResumeProfile,
  SpendingAnalysis,
  Transaction,
  UserCareerProfile,
  UserProfile,
} from './types';

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

// ---------------------------------------------------------------------------
// Token management (stored in memory + localStorage for persistence)
// ---------------------------------------------------------------------------

let _token: string | null = null;

export function getToken(): string | null {
  if (_token) return _token;
  if (typeof window !== 'undefined') {
    _token = localStorage.getItem('pos_token');
  }
  return _token;
}

export function setToken(token: string): void {
  _token = token;
  if (typeof window !== 'undefined') {
    localStorage.setItem('pos_token', token);
  }
}

export function clearToken(): void {
  _token = null;
  if (typeof window !== 'undefined') {
    localStorage.removeItem('pos_token');
  }
}

// ---------------------------------------------------------------------------
// Core request helper
// ---------------------------------------------------------------------------

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { ...options, headers });

  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      message = body.message ?? body.error ?? message;
    } catch { /* non-JSON body */ }
    throw new Error(message);
  }

  // 204 No Content
  if (res.status === 204) return undefined as T;

  return res.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export const auth = {
  login: (email: string, password?: string) =>
    request<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  signup: (name: string, email: string, password?: string, title?: string) =>
    request<AuthResponse>('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, title }),
    }),

  me: () => request<UserProfile>('/api/auth/me'),

  users: () => request<UserProfile[]>('/api/auth/users'),

  logout: () =>
    request<{ success: boolean }>('/api/auth/logout', { method: 'POST' }),
};

// ---------------------------------------------------------------------------
// Chat / Chief Agent
// ---------------------------------------------------------------------------

export const chat = {
  send: (prompt: string) =>
    request<ChatResponse>('/api/chat', {
      method: 'POST',
      body: JSON.stringify({ prompt }),
    }),

  tasks: () => request<unknown[]>('/api/tasks'),
};

// ---------------------------------------------------------------------------
// Jobs
// ---------------------------------------------------------------------------

export const jobs = {
  list: (params?: {
    status?: JobLifecycleStatus;
    minScore?: number;
    search?: string;
    company?: string;
    remote?: boolean;
  }) => {
    const qs = new URLSearchParams();
    if (params?.status) qs.set('status', params.status);
    if (params?.minScore !== undefined) qs.set('minScore', String(params.minScore));
    if (params?.search) qs.set('search', params.search);
    if (params?.company) qs.set('company', params.company);
    if (params?.remote !== undefined) qs.set('remote', String(params.remote));
    const q = qs.toString();
    return request<Job[]>(`/api/jobs${q ? `?${q}` : ''}`);
  },

  get: (id: string) => request<Job>(`/api/jobs/${id}`),

  updateStatus: (id: string, status: JobLifecycleStatus) =>
    request<Job>(`/api/jobs/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  tailorResume: (id: string) =>
    request<{ tailoredMarkdown: string; jobId: string; resumeFile: string }>(
      `/api/jobs/${id}/tailor-resume`,
      { method: 'POST' },
    ),

  triggerDiscovery: () =>
    request<{ discovered: number; duplicatesRemoved: number; rankedCount: number }>(
      '/api/jobs/trigger-discovery',
      { method: 'POST' },
    ),

  profile: () => request<UserCareerProfile>('/api/jobs/profile'),

  updateProfile: (data: Partial<UserCareerProfile>) =>
    request<UserCareerProfile>('/api/jobs/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  addResume: (resume: Partial<ResumeProfile>) =>
    request<ResumeProfile>('/api/jobs/resumes', {
      method: 'POST',
      body: JSON.stringify(resume),
    }),

  deleteResume: (id: string) =>
    request<{ success: boolean }>(`/api/jobs/resumes/${id}`, {
      method: 'DELETE',
    }),
};

// ---------------------------------------------------------------------------
// Finance
// ---------------------------------------------------------------------------

export const finance = {
  overview: () => request<SpendingAnalysis>('/api/finance/overview'),
  transactions: (limit?: number) =>
    request<Transaction[]>(`/api/finance/transactions${limit ? `?limit=${limit}` : ''}`),
  createTransaction: (data: {
    amount: number;
    merchant: string;
    description?: string;
    category?: string;
    date?: string;
    isRecurring?: boolean;
    accountId?: string;
  }) =>
    request<Transaction>('/api/finance/transactions', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  importCsv: (csv: string, accountId?: string) =>
    request<{
      success: boolean;
      totalParsed: number;
      imported: number;
      message: string;
      transactions: Transaction[];
    }>('/api/finance/import', {
      method: 'POST',
      body: JSON.stringify({ csv, accountId }),
    }),
  affordability: (price: number, currency?: string) =>
    request<{
      itemPrice: number;
      isAffordable: boolean;
      verdict: string;
      monthlyDiscretionaryRemaining: number;
      postPurchaseRemaining: number;
      advice: string;
    }>('/api/finance/affordability', {
      method: 'POST',
      body: JSON.stringify({ price, currency }),
    }),
};

// ---------------------------------------------------------------------------
// Approvals
// ---------------------------------------------------------------------------

export const approvals = {
  list: (status?: ApprovalStatus) =>
    request<ApprovalRequest[]>(
      `/api/approvals${status ? `?status=${status}` : ''}`,
    ),

  decide: (id: string, decision: 'approve' | 'reject', note?: string) =>
    request<ApprovalRequest>(`/api/approvals/${id}/decide`, {
      method: 'POST',
      body: JSON.stringify({ decision, note }),
    }),
};

// ---------------------------------------------------------------------------
// Audit
// ---------------------------------------------------------------------------

export const audit = {
  events: (limit?: number, taskId?: string) => {
    const qs = new URLSearchParams();
    if (limit) qs.set('limit', String(limit));
    if (taskId) qs.set('taskId', taskId);
    const q = qs.toString();
    return request<AuditEvent[]>(`/api/audit${q ? `?${q}` : ''}`);
  },
};

// ---------------------------------------------------------------------------
// Connectors
// ---------------------------------------------------------------------------

export const connectors = {
  list: () => request<ConnectorInfo[]>('/api/connectors'),

  googleStatus: () => request<unknown>('/api/connectors/google/status'),

  googleAuthUrl: (redirectUri?: string) =>
    request<{ authUrl: string | null; configured: boolean; message?: string }>(
      `/api/connectors/google/auth-url${redirectUri ? `?redirectUri=${encodeURIComponent(redirectUri)}` : ''}`,
    ),

  gmailMessages: (category?: string) =>
    request<any[]>(`/api/connectors/google/gmail${category ? `?category=${category}` : ''}`),

  driveFiles: (type?: string) =>
    request<any[]>(`/api/connectors/google/drive${type ? `?type=${type}` : ''}`),

  importDriveResume: (fileId: string) =>
    request<{ success: boolean; message: string; resume: any }>(
      `/api/connectors/google/drive/import-resume/${fileId}`,
      { method: 'POST' },
    ),

  connectGoogle: (email: string, authMethod?: string, credential?: string) =>
    request<unknown>('/api/connectors/google/connect', {
      method: 'POST',
      body: JSON.stringify({ email, authMethod, credential }),
    }),

  disconnectGoogle: () =>
    request<unknown>('/api/connectors/google/disconnect', { method: 'POST' }),

  syncGoogle: () =>
    request<unknown>('/api/connectors/google/sync', { method: 'POST' }),

  setGeminiKey: (apiKey: string) =>
    request<{ success: boolean; message: string; model?: string }>(
      '/api/connectors/gemini/set-key',
      { method: 'POST', body: JSON.stringify({ apiKey }) },
    ),

  testGemini: () =>
    request<{ success: boolean; message: string; model?: string }>(
      '/api/connectors/gemini/test',
    ),
};
