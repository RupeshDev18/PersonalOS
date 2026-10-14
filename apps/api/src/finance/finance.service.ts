import { Injectable, Logger } from '@nestjs/common';
import { SpendingAnalysis, Transaction, TransactionCategory, AuditEventType } from '@personal-os/shared';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';

export interface AffordabilityEvaluation {
  itemPrice: number;
  currency: string;
  isAffordable: boolean | null;
  verdict: 'comfortable' | 'stretch' | 'exceeds_budget' | 'unknown';
  monthlyIncome: number;
  monthlyDiscretionaryRemaining: number;
  postPurchaseRemaining: number;
  recurringCommitments: number;
  advice: string;
}

export interface CreateTransactionInput {
  amount: number;
  currency?: string;
  merchant: string;
  description?: string;
  category?: string;
  date?: string | Date;
  isRecurring?: boolean;
  accountId?: string;
}

export interface CsvImportResult {
  success: boolean;
  totalParsed: number;
  imported: number;
  message: string;
  transactions: Transaction[];
}

import { AccountAggregatorConnector, AABankAccount, AASyncResult } from '../connectors/account-aggregator.connector';

@Injectable()
export class FinanceService {
  private readonly logger = new Logger(FinanceService.name);
  private transactionsByUser: Map<string, Transaction[]> = new Map();
  private readonly monthlyIncome = 0;

  constructor(
    private readonly auditService: AuditService,
    private readonly prisma: PrismaService,
    private readonly accountAggregatorConnector: AccountAggregatorConnector,
  ) {}

  private async refreshUserCache(userId: string): Promise<void> {
    try {
      const records = await this.prisma.transaction.findMany({
        where: { userId },
        orderBy: { date: 'desc' },
      });

      const list: Transaction[] = records.map((r) => ({
        id: r.id,
        userId: r.userId,
        accountId: r.accountId || 'acc-primary',
        amount: r.amount,
        currency: r.currency || 'INR',
        merchant: r.merchant,
        category: (r.category as TransactionCategory) || TransactionCategory.OTHER,
        timestamp: r.date,
        description: r.description,
        isRecurring: r.isRecurring,
      }));

      this.transactionsByUser.set(userId, list);
    } catch (err) {
      this.logger.warn(`Failed refreshing cache for ${userId}: ${(err as Error).message}`);
    }
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  public async getTransactions(userId: string, limit = 50): Promise<Transaction[]> {
    try {
      const records = await this.prisma.transaction.findMany({
        where: { userId },
        orderBy: { date: 'desc' },
        take: limit,
      });

      if (records.length > 0) {
        return records.map((r) => ({
          id: r.id,
          userId: r.userId,
          accountId: r.accountId || 'acc-primary',
          amount: r.amount,
          currency: r.currency || 'INR',
          merchant: r.merchant,
          category: (r.category as TransactionCategory) || TransactionCategory.OTHER,
          timestamp: r.date,
          description: r.description,
          isRecurring: r.isRecurring,
        })).filter((transaction) => !this.isLegacyDemoTransaction(transaction));
      }
    } catch (err) {
      this.logger.warn(`DB read error in getTransactions: ${(err as Error).message}`);
    }

    return (this.transactionsByUser.get(userId) ?? [])
      .filter((transaction) => !this.isLegacyDemoTransaction(transaction))
      .slice(0, limit);
  }

  public async getSpendingAnalysis(userId: string): Promise<SpendingAnalysis> {
    const transactions = await this.getTransactions(userId, 500);

    const byCategory = {} as Record<TransactionCategory, number>;
    for (const cat of Object.values(TransactionCategory)) {
      byCategory[cat] = 0;
    }

    let totalExpense = 0;
    let recurringCommitments = 0;

    for (const t of transactions) {
      const cat = Object.values(TransactionCategory).includes(t.category)
        ? t.category
        : TransactionCategory.OTHER;
      byCategory[cat] = (byCategory[cat] ?? 0) + t.amount;
      totalExpense += t.amount;
      if (t.isRecurring) recurringCommitments += t.amount;
    }

    const remainingDiscretionary = this.monthlyIncome > 0
      ? Math.max(0, this.monthlyIncome - totalExpense)
      : 0;

    return {
      userId,
      month: new Date().toLocaleString('en-IN', { month: 'long', year: 'numeric' }),
      totalIncome: this.monthlyIncome,
      totalExpense,
      remainingDiscretionary,
      byCategory,
      recurringCommitments,
    };
  }

  public async addTransaction(userId: string, input: CreateTransactionInput): Promise<Transaction> {
    const category = (input.category as TransactionCategory) || this.inferCategory(`${input.merchant} ${input.description || ''}`);
    const date = input.date ? new Date(input.date) : new Date();

    const created = await this.prisma.transaction.create({
      data: {
        userId,
        accountId: input.accountId || 'acc-manual',
        amount: Math.abs(input.amount),
        currency: input.currency || 'INR',
        merchant: input.merchant,
        description: input.description || input.merchant,
        category,
        isRecurring: Boolean(input.isRecurring),
        date,
      },
    });

    const tx: Transaction = {
      id: created.id,
      userId: created.userId,
      accountId: created.accountId,
      amount: created.amount,
      currency: created.currency,
      merchant: created.merchant,
      category: created.category as TransactionCategory,
      timestamp: created.date,
      description: created.description,
      isRecurring: created.isRecurring,
    };

    // Update in-memory cache
    const current = this.transactionsByUser.get(userId) ?? [];
    this.transactionsByUser.set(userId, [tx, ...current]);

    this.auditService.log({
      taskId: 'finance-manual-log',
      userId,
      agentId: 'agent-finance',
      eventType: AuditEventType.TOOL_COMPLETED,
      toolName: 'finance.transaction.create',
      outputPayload: tx as unknown as Record<string, unknown>,
      rationale: `Manually recorded transaction ₹${tx.amount} at ${tx.merchant} (${tx.category})`,
    });

    return tx;
  }

  /**
   * Universal CSV Bank Statement Parser
   * Supports standard HDFC, ICICI, SBI, Chase, Revolut, and generic CSV formats.
   */
  public async importCsvTransactions(
    userId: string,
    csvContent: string,
    accountId = 'acc-imported',
  ): Promise<CsvImportResult> {
    const lines = csvContent
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length < 2) {
      return {
        success: false,
        totalParsed: 0,
        imported: 0,
        message: 'CSV file is empty or missing headers.',
        transactions: [],
      };
    }

    // Split headers
    const delimiter = lines[0].includes('\t') ? '\t' : lines[0].includes(';') ? ';' : ',';
    const headerRow = lines[0].split(delimiter).map((h) => h.replace(/^["']|["']$/g, '').trim().toLowerCase());

    const dateColIdx = headerRow.findIndex((h) =>
      h.includes('date') || h.includes('time') || h.includes('txn date') || h.includes('value date'),
    );
    const descColIdx = headerRow.findIndex((h) =>
      h.includes('desc') || h.includes('narration') || h.includes('particulars') || h.includes('merchant') || h.includes('payee') || h.includes('details'),
    );
    const amountColIdx = headerRow.findIndex((h) =>
      h === 'amount' || h.includes('txn amount') || h.includes('net amount'),
    );
    const debitColIdx = headerRow.findIndex((h) =>
      h.includes('debit') || h.includes('withdrawal') || h.includes('dr'),
    );
    const creditColIdx = headerRow.findIndex((h) =>
      h.includes('credit') || h.includes('deposit') || h.includes('cr'),
    );
    const categoryColIdx = headerRow.findIndex((h) => h.includes('category') || h.includes('tag'));

    const importedTransactions: Transaction[] = [];

    for (let i = 1; i < lines.length; i++) {
      const rawLine = lines[i];
      // Basic CSV token parser respecting quotes
      const cells = this.parseCsvLine(rawLine, delimiter);
      if (cells.length < 2) continue;

      const dateStr = dateColIdx !== -1 ? cells[dateColIdx] : new Date().toISOString();
      const descStr = descColIdx !== -1 ? cells[descColIdx] : `Transaction #${i}`;

      let amount = 0;
      if (amountColIdx !== -1 && cells[amountColIdx]) {
        amount = Math.abs(parseFloat(cells[amountColIdx].replace(/[^0-9.-]/g, '')) || 0);
      } else if (debitColIdx !== -1 && cells[debitColIdx] && parseFloat(cells[debitColIdx].replace(/[^0-9.-]/g, ''))) {
        amount = Math.abs(parseFloat(cells[debitColIdx].replace(/[^0-9.-]/g, '')) || 0);
      } else if (creditColIdx !== -1 && cells[creditColIdx] && parseFloat(cells[creditColIdx].replace(/[^0-9.-]/g, ''))) {
        // Income or credit
        amount = Math.abs(parseFloat(cells[creditColIdx].replace(/[^0-9.-]/g, '')) || 0);
      }

      if (amount <= 0) continue;

      const parsedDate = this.parseDateSafely(dateStr);
      const merchant = this.cleanMerchantName(descStr);
      const category = categoryColIdx !== -1 && cells[categoryColIdx]
        ? (cells[categoryColIdx].toLowerCase() as TransactionCategory)
        : this.inferCategory(descStr);

      const isRecurring = /rent|netflix|spotify|aws|broadband|electricity|sip|maintenance/i.test(descStr);

      try {
        const created = await this.prisma.transaction.create({
          data: {
            userId,
            accountId,
            amount,
            currency: 'INR',
            merchant,
            description: descStr,
            category,
            isRecurring,
            date: parsedDate,
          },
        });

        importedTransactions.push({
          id: created.id,
          userId: created.userId,
          accountId: created.accountId,
          amount: created.amount,
          currency: created.currency,
          merchant: created.merchant,
          category: created.category as TransactionCategory,
          timestamp: created.date,
          description: created.description,
          isRecurring: created.isRecurring,
        });
      } catch (insertErr) {
        this.logger.warn(`Error inserting row ${i}: ${(insertErr as Error).message}`);
      }
    }

    await this.refreshUserCache(userId);

    this.auditService.log({
      taskId: 'finance-statement-import',
      userId,
      agentId: 'agent-finance',
      eventType: AuditEventType.TOOL_COMPLETED,
      toolName: 'finance.csv.import',
      outputPayload: { importedCount: importedTransactions.length, accountId },
      rationale: `Successfully imported ${importedTransactions.length} bank transactions via statement CSV parser.`,
    });

    return {
      success: true,
      totalParsed: lines.length - 1,
      imported: importedTransactions.length,
      message: `Parsed ${lines.length - 1} rows, imported ${importedTransactions.length} transactions into PostgreSQL.`,
      transactions: importedTransactions,
    };
  }

  public async evaluateAffordability(
    userId: string,
    price: number,
    currency = 'INR',
  ): Promise<AffordabilityEvaluation> {
    const analysis = await this.getSpendingAnalysis(userId);
    const remaining = analysis.remainingDiscretionary;
    const postPurchase = remaining - price;

    let verdict: AffordabilityEvaluation['verdict'];
    let advice: string;

    if (analysis.totalIncome <= 0) {
      verdict = 'unknown';
      advice = 'Affordability cannot be assessed because monthly income or a budget has not been configured.';
    } else if (postPurchase < 0) {
      verdict = 'exceeds_budget';
      advice = `This purchase (₹${price.toLocaleString('en-IN')}) exceeds your remaining monthly discretionary reserve of ₹${remaining.toLocaleString('en-IN')}. Consider waiting until next month.`;
    } else if (postPurchase < 25_000) {
      verdict = 'stretch';
      advice = `You can afford this, but it will leave only ₹${postPurchase.toLocaleString('en-IN')} in reserve for the rest of the month.`;
    } else {
      verdict = 'comfortable';
      advice = `Safe to purchase. You will retain ₹${postPurchase.toLocaleString('en-IN')} in discretionary savings.`;
    }

    this.auditService.log({
      taskId: 'finance-affordability-eval',
      userId,
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
      isAffordable: verdict === 'unknown' ? null : verdict !== 'exceeds_budget',
      verdict,
      monthlyIncome: this.monthlyIncome,
      monthlyDiscretionaryRemaining: remaining,
      postPurchaseRemaining: postPurchase,
      recurringCommitments: analysis.recurringCommitments,
      advice,
    };
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  public inferCategory(text: string): TransactionCategory {
    const lower = text.toLowerCase();
    if (lower.match(/rent|apartment|maintenance|flat|landlord|pg|hostel|society/)) return TransactionCategory.HOUSING;
    if (lower.match(/electricity|power|bescom|tata power|water|broadband|act fiber|wifi|airtel|jio|gas|utility/)) return TransactionCategory.UTILITIES;
    if (lower.match(/swiggy|zomato|starbucks|restaurant|cafe|dining|mcdonald|food|burger|pizza|subway|bistro|bake|eatclub/)) return TransactionCategory.FOOD_AND_DINING;
    if (lower.match(/uber|ola|rapido|metro|fuel|petrol|shell|hp|flight|indigo|irctc|train|toll|fastag/)) return TransactionCategory.TRANSPORTATION;
    if (lower.match(/netflix|spotify|youtube|prime video|hotstar|disney|apple music|hulu|playstation|patreon/)) return TransactionCategory.SUBSCRIPTIONS;
    if (lower.match(/amazon|flipkart|myntra|zara|h&m|ikea|apple store|croma|shopping|retail|blinkit|zepto|instamart/)) return TransactionCategory.SHOPPING;
    if (lower.match(/cinema|pvr|inox|movie|concert|bookmyshow|game|steam/)) return TransactionCategory.ENTERTAINMENT;
    if (lower.match(/hospital|pharmacy|apollo|medplus|doctor|clinic|health|1mg|practo|dentist|cult\.fit/)) return TransactionCategory.HEALTHCARE;
    if (lower.match(/zerodha|groww|mutual fund|sip|etf|stocks|upstox|indmoney|coin/)) return TransactionCategory.INVESTMENTS;
    return TransactionCategory.OTHER;
  }

  private isLegacyDemoTransaction(transaction: Transaction): boolean {
    const demoRows = [
      ['AWS Cloud Services', 1499, 'Monthly compute & ECS container runtime'],
      ['Anthropic & OpenAI', 2200, 'Monthly API inference token credits'],
      ['GitHub Copilot Enterprise', 450, 'Developer workspace license'],
      ['Apartment Maintenance & Rent', 32000, 'Monthly flat rent and maintenance'],
      ['Tata Power & ACT Broadband', 8500, 'Electricity and gigabit fiber bill'],
      ['AWS Cloud Services', 3800, 'Developer personal infrastructure lab'],
      ['Nature Basket Grocery', 6200, 'Weekly household groceries'],
      ['Netflix & Spotify Premium', 1499, 'Streaming entertainment services'],
    ];
    return demoRows.some(([merchant, amount, description]) =>
      transaction.merchant === merchant && transaction.amount === amount && transaction.description === description,
    );
  }

  private cleanMerchantName(desc: string): string {
    const cleaned = desc.replace(/^upi[-/:]|pos[-/:]|e-commerce[-/:]/i, '').trim();
    const parts = cleaned.split(/[-/|]/);
    return (parts[0] || cleaned).substring(0, 40).trim();
  }

  private parseCsvLine(line: string, delimiter: string): string[] {
    const result: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"' || c === "'") {
        inQuotes = !inQuotes;
      } else if (c === delimiter && !inQuotes) {
        result.push(cur.trim().replace(/^["']|["']$/g, ''));
        cur = '';
      } else {
        cur += c;
      }
    }
    result.push(cur.trim().replace(/^["']|["']$/g, ''));
    return result;
  }

  private parseDateSafely(str: string): Date {
    const parsed = new Date(str);
    if (!isNaN(parsed.getTime())) return parsed;
    // Try DD/MM/YYYY or DD-MM-YYYY
    const parts = str.split(/[-/]/);
    if (parts.length === 3) {
      const d = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const y = parseInt(parts[2], 10);
      const custom = new Date(y < 100 ? 2000 + y : y, m, d);
      if (!isNaN(custom.getTime())) return custom;
    }
    return new Date();
  }

  public async linkAccountAggregator(userId: string, mobileOrVpa: string, banks?: string[]) {
    const consent = await this.accountAggregatorConnector.initiateConsent(mobileOrVpa, banks);

    this.auditService.log({
      taskId: 'aa-consent-link',
      userId,
      agentId: 'agent-finance',
      eventType: AuditEventType.TOOL_COMPLETED,
      toolName: 'finance.aa_link',
      outputPayload: consent as unknown as Record<string, unknown>,
      rationale: `Linked Indian Bank accounts via RBI Account Aggregator for user ${userId}`,
    });

    return consent;
  }

  public async getBankAccounts(_userId: string): Promise<AABankAccount[]> {
    const data = await this.accountAggregatorConnector.fetchLiveAccountsAndTransactions();
    return data.accounts;
  }

  public async syncBankAccounts(userId: string): Promise<AASyncResult> {
    const taskId = uuidv4();
    const data = await this.accountAggregatorConnector.fetchLiveAccountsAndTransactions();

    let newCount = 0;
    for (const rawTx of data.transactions) {
      // Check if already in DB
      const existing = await this.prisma.transaction.findFirst({
        where: {
          userId,
          merchant: rawTx.merchant,
          amount: Math.abs(rawTx.amount),
        },
      });

      if (!existing) {
        await this.addTransaction(userId, {
          merchant: rawTx.merchant,
          amount: rawTx.amount,
          currency: 'INR',
          description: rawTx.narration,
          category: rawTx.category,
          date: rawTx.timestamp,
          accountId: `acc-${rawTx.bank.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
          isRecurring: false,
        });
        newCount++;
      }
    }

    this.auditService.log({
      taskId,
      userId,
      agentId: 'agent-finance',
      eventType: AuditEventType.TOOL_COMPLETED,
      toolName: 'finance.aa_sync',
      outputPayload: {
        accountsSynced: data.accounts.length,
        syncedTransactionsCount: data.transactions.length,
        newTransactionsImported: newCount,
      },
      rationale: `Reconciled ${data.accounts.length} bank accounts and imported ${newCount} new transactions via Account Aggregator.`,
    });

    return {
      success: true,
      accounts: data.accounts,
      syncedTransactionsCount: data.transactions.length,
      newTransactionsCount: newCount,
      syncedAt: new Date().toISOString(),
      message: `Successfully synchronized ${data.accounts.length} bank accounts and imported ${newCount} new transactions.`,
    };
  }
}
