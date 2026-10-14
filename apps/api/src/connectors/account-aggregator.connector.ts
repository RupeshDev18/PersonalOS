import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConnectorInfo } from '@personal-os/shared';

export interface AAConsentResponse {
  consentHandle: string;
  status: 'PENDING' | 'ACTIVE' | 'REJECTED' | 'EXPIRED';
  url: string;
  expiresAt?: string;
  fipsCovered: string[];
}

export interface AABankAccount {
  fipId: string;
  fipName: string;
  accountType: 'SAVINGS' | 'CURRENT' | 'CREDIT_CARD';
  maskedAccountNumber: string;
  currentBalance: number;
  currency: string;
  lastUpdated: string;
}

export interface AATransaction {
  txnId: string;
  narration: string;
  merchant: string;
  amount: number;
  type: 'DEBIT' | 'CREDIT';
  mode: 'UPI' | 'NEFT' | 'IMPS' | 'POS' | 'CARD';
  timestamp: string;
  category: string;
  bank: string;
}

export interface AASyncResult {
  success: boolean;
  accounts: AABankAccount[];
  syncedTransactionsCount: number;
  newTransactionsCount: number;
  syncedAt: string;
  message: string;
}

@Injectable()
export class AccountAggregatorConnector {
  public getInfo(): ConnectorInfo {
    return {
      id: 'connector-account-aggregator',
      name: 'Account Aggregator',
      type: 'financial_ledger',
      status: 'disconnected',
      isLive: false,
      description: 'Bank consent and transaction sync are not implemented. No bank account or balance is connected.',
      details: { accessMode: 'disabled' },
    };
  }

  public async initiateConsent(_mobileOrVpa: string, _selectedFIPs?: string[]): Promise<AAConsentResponse> {
    throw new ServiceUnavailableException('Bank Account Aggregator consent is not implemented; no consent was created.');
  }

  public async fetchLiveAccountsAndTransactions(): Promise<{
    accounts: AABankAccount[];
    transactions: AATransaction[];
  }> {
    return { accounts: [], transactions: [] };
  }

  public disconnect(): void {}
}
