import { Injectable, OnModuleInit } from '@nestjs/common';
import {
  SpendingAnalysis,
  Transaction,
  TransactionCategory,
} from '@personal-os/shared';
import { AuditService } from '../audit/audit.service';
import { AuditEventType } from '@personal-os/shared';
import { PrismaService } from '../prisma/prisma.service';

export interface AffordabilityEvaluation {
  itemPrice: number;
  currency: string;
  isAffordable: boolean;
  verdict: 'comfortable' | 'stretch' | 'exceeds_budget';
  monthlyIncome: number;
  monthlyDiscretionaryRemaining: number;
  postPurchaseRemaining: number;
  recurringCommitments: number;
  advice: string;
}

@Injectable()
export class FinanceService implements OnModuleInit {
  private transactions: Transaction[] = [];
  private monthlyIncome = 240000; // ₹2.4 Lakh per month

  constructor(
    private readonly auditService: AuditService,
    private readonly prisma: PrismaService,
  ) {
    this.seedMockTransactions();
  }

  async onModuleInit() {
    try {
      const dbTx = await this.prisma.transaction.findMany({
        orderBy: { date: 'desc' },
      });
      if (dbTx && dbTx.length > 0) {
        this.transactions = dbTx.map((t) => ({
          id: t.id,
          userId: t.userId,
          accountId: 'acc-primary-hdfc',
          amount: t.amount,
          currency: 'INR',
          category: TransactionCategory.SHOPPING,
          merchant: t.merchant,
          description: t.description,
          timestamp: t.date,
          isRecurring: t.category === 'Tech & Cloud' || t.category === 'Productivity',
        }));
      }
    } catch {
      // Memory fallback
    }
  }

  public getTransactions(limit = 20): Transaction[] {
    return this.transactions.slice(0, limit);
  }

  public getSpendingAnalysis(): SpendingAnalysis {
    const byCategory = {} as Record<TransactionCategory, number>;
    for (const cat of Object.values(TransactionCategory)) {
      byCategory[cat] = 0;
    }

    let totalExpense = 0;
    let recurringCommitments = 0;

    for (const t of this.transactions) {
      byCategory[t.category] = (byCategory[t.category] || 0) + t.amount;
      totalExpense += t.amount;
      if (t.isRecurring) {
        recurringCommitments += t.amount;
      }
    }

    const remainingDiscretionary = Math.max(0, this.monthlyIncome - totalExpense);

    return {
      userId: 'default-user',
      month: 'October 2026',
      totalIncome: this.monthlyIncome,
      totalExpense,
      remainingDiscretionary,
      byCategory,
      recurringCommitments,
    };
  }

  /**
   * Strictly read-only evaluation of whether the user can afford a contemplated purchase
   */
  public evaluateAffordability(price: number, currency = 'INR'): AffordabilityEvaluation {
    const analysis = this.getSpendingAnalysis();
    const remaining = analysis.remainingDiscretionary;
    const postPurchase = remaining - price;

    let verdict: AffordabilityEvaluation['verdict'] = 'comfortable';
    let advice = '';

    if (postPurchase < 0) {
      verdict = 'exceeds_budget';
      advice = `This purchase (₹${price.toLocaleString()}) exceeds your remaining monthly discretionary cashflow of ₹${remaining.toLocaleString()}. Consider postponing until next billing cycle.`;
    } else if (postPurchase < 25000) {
      verdict = 'stretch';
      advice = `You can afford this, but it will leave only ₹${postPurchase.toLocaleString()} in your discretionary reserve for the rest of October.`;
    } else {
      verdict = 'comfortable';
      advice = `Safe to purchase. You will retain ₹${postPurchase.toLocaleString()} in discretionary savings after this expense.`;
    }

    this.auditService.log({
      taskId: 'finance-affordability-eval',
      userId: 'default-user',
      agentId: 'agent-finance',
      eventType: AuditEventType.DECISION_CREATED,
      toolName: 'finance.affordability.evaluate',
      inputPayload: { price, currency },
      outputPayload: { verdict, postPurchaseRemaining: postPurchase },
      rationale: advice,
    });

    return {
      itemPrice: price,
      currency,
      isAffordable: verdict !== 'exceeds_budget',
      verdict,
      monthlyIncome: this.monthlyIncome,
      monthlyDiscretionaryRemaining: remaining,
      postPurchaseRemaining: postPurchase,
      recurringCommitments: analysis.recurringCommitments,
      advice,
    };
  }

  private seedMockTransactions() {
    this.transactions = [
      {
        id: 'tx-1',
        userId: 'default-user',
        accountId: 'acc-hdfc-salary',
        amount: 32000,
        currency: 'INR',
        merchant: 'Apartment Maintenance & Rent',
        category: TransactionCategory.HOUSING,
        timestamp: new Date('2026-10-01'),
        description: 'Monthly flat rent and maintenance',
        isRecurring: true,
      },
      {
        id: 'tx-2',
        userId: 'default-user',
        accountId: 'acc-hdfc-salary',
        amount: 8500,
        currency: 'INR',
        merchant: 'Tata Power & ACT Broadband',
        category: TransactionCategory.UTILITIES,
        timestamp: new Date('2026-10-02'),
        description: 'Electricity and gigabit fiber bill',
        isRecurring: true,
      },
      {
        id: 'tx-3',
        userId: 'default-user',
        accountId: 'acc-icici-credit',
        amount: 3800,
        currency: 'INR',
        merchant: 'AWS Cloud Services',
        category: TransactionCategory.SUBSCRIPTIONS,
        timestamp: new Date('2026-10-03'),
        description: 'Developer personal infrastructure lab',
        isRecurring: true,
      },
      {
        id: 'tx-4',
        userId: 'default-user',
        accountId: 'acc-icici-credit',
        amount: 6200,
        currency: 'INR',
        merchant: 'Nature Basket Grocery',
        category: TransactionCategory.FOOD_AND_DINING,
        timestamp: new Date('2026-10-04'),
        description: 'Weekly household groceries',
        isRecurring: false,
      },
      {
        id: 'tx-5',
        userId: 'default-user',
        accountId: 'acc-icici-credit',
        amount: 1499,
        currency: 'INR',
        merchant: 'Netflix & Spotify Premium',
        category: TransactionCategory.SUBSCRIPTIONS,
        timestamp: new Date('2026-10-05'),
        description: 'Streaming entertainment services',
        isRecurring: true,
      },
    ];
  }
}
