export enum TransactionCategory {
  HOUSING = 'housing',
  UTILITIES = 'utilities',
  FOOD_AND_DINING = 'food_and_dining',
  TRANSPORTATION = 'transportation',
  SHOPPING = 'shopping',
  ENTERTAINMENT = 'entertainment',
  HEALTHCARE = 'healthcare',
  SUBSCRIPTIONS = 'subscriptions',
  INVESTMENTS = 'investments',
  OTHER = 'other',
}

export interface Transaction {
  id: string;
  userId: string;
  accountId: string;
  amount: number;
  currency: string;
  merchant: string;
  category: TransactionCategory;
  timestamp: Date;
  description?: string;
  isRecurring: boolean;
}

export interface SpendingAnalysis {
  userId: string;
  month: string;
  totalIncome: number;
  totalExpense: number;
  remainingDiscretionary: number;
  byCategory: Record<TransactionCategory, number>;
  recurringCommitments: number;
}
