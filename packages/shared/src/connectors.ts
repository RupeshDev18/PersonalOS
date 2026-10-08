// ---------------------------------------------------------------------------
// Connector registry types shared between the backend and frontend.
// The frontend renders these; the backend produces them.
// ---------------------------------------------------------------------------

export type ConnectorStatus = 'connected' | 'disconnected' | 'fallback_mode' | 'error';
export type ConnectorType =
  | 'personal_context'
  | 'job_board'
  | 'web_search'
  | 'llm_engine'
  | 'financial_ledger'
  | 'communication'
  | 'social';

export interface ConnectorInfo {
  id: string;
  name: string;
  type: ConnectorType;
  status: ConnectorStatus;
  /** Whether the connector is making real live network calls */
  isLive: boolean;
  description: string;
  rateLimit?: string;
  lastSync?: string | null;
  details?: Record<string, unknown>;
}

export interface ConnectorRegistry {
  connectors: ConnectorInfo[];
}
