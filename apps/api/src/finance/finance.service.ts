import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { SpendingAnalysis, Transaction, TransactionCategory, AuditEventType } from '@personal-os/shared';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';

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

@Injectable()
export class FinanceService implements OnModuleInit {
  private readonly logger = new Logger(FinanceService.name);
  private transactionsByUser: Map<string, Transaction[]> = new Map();
  private readonly monthlyIncome = 240_000; // ₹2.4 L / month default baseline

  constructor(
    private readonly auditService: AuditService,
    private readonly prisma: PrismaService,
  ) {}

  async onModuleInit() {
    try {
      const count = await this.prisma.transaction.count();
      if (count === 0) {
        this.logger.log('No transactions in PostgreSQL. Seeding realistic initial ledger...');
        await this.seedInitialDbTransactions('user-rupesh');
      }

      await this.refreshUserCache('user-rupesh');
      this.logger.log(`FinanceService initialized with PostgreSQL. User 'user-rupesh' ledger active.`);
    } catch (err) {
      this.logger.warn(`Could not connect to PostgreSQL for transactions: ${(err as Error).message}. Using in-memory seed.`);
      this.seedDemoTransactionsInMemory('user-rupesh');
    }
  }

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
        }));
      }
    } catch (err) {
      this.logger.warn(`DB read error in getTransactions: ${(err as Error).message}`);
    }

    return (this.transactionsByUser.get(userId) ?? []).slice(0, limit);
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

    const remainingDiscretionary = Math.max(0, this.monthlyIncome - totalExpense);

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

    if (postPurchase < 0) {
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
      isAffordable: verdict !== 'exceeds_budget',
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

  private async seedInitialDbTransactions(userId: string): Promise<void> {
    const defaults = [
      {
        userId, accountId: 'acc-hdfc-salary',
        amount: 32_000, currency: 'INR',
        merchant: 'Apartment Maintenance & Rent',
        category: TransactionCategory.HOUSING,
        description: 'Monthly flat rent and maintenance',
        isRecurring: true,
      },
      {
        userId, accountId: 'acc-hdfc-salary',
        amount: 8_500, currency: 'INR',
        merchant: 'Tata Power & ACT Broadband',
        category: TransactionCategory.UTILITIES,
        description: 'Electricity and gigabit fiber bill',
        isRecurring: true,
      },
      {
        userId, accountId: 'acc-icici-credit',
        amount: 3_800, currency: 'INR',
        merchant: 'AWS Cloud Services',
        category: TransactionCategory.SUBSCRIPTIONS,
        description: 'Developer personal infrastructure lab',
        isRecurring: true,
      },
      {
        userId, accountId: 'acc-icici-credit',
        amount: 6_200, currency: 'INR',
        merchant: 'Nature Basket Grocery',
        category: TransactionCategory.FOOD_AND_DINING,
        description: 'Weekly household groceries',
        isRecurring: false,
      },
      {
        userId, accountId: 'acc-icici-credit',
        amount: 1_499, currency: 'INR',
        merchant: 'Netflix & Spotify Premium',
        category: TransactionCategory.SUBSCRIPTIONS,
        description: 'Streaming entertainment services',
        isRecurring: true,
      },
    ];

    for (const d of defaults) {
      await this.prisma.transaction.create({ data: d });
    }
  }

  private seedDemoTransactionsInMemory(userId: string): void {
    this.transactionsByUser.set(userId, [
      {
        id: 'tx-1', userId, accountId: 'acc-hdfc-salary',
        amount: 32_000, currency: 'INR',
        merchant: 'Apartment Maintenance & Rent',
        category: TransactionCategory.HOUSING,
        timestamp: new Date(), description: 'Monthly flat rent and maintenance',
        isRecurring: true,
      },
      {
        id: 'tx-2', userId, accountId: 'acc-hdfc-salary',
        amount: 8_500, currency: 'INR',
        merchant: 'Tata Power & ACT Broadband',
        category: TransactionCategory.UTILITIES,
        timestamp: new Date(), description: 'Electricity and gigabit fiber bill',
        isRecurring: true,
      },
      {
        id: 'tx-3', userId, accountId: 'acc-icici-credit',
        amount: 3_800, currency: 'INR',
        merchant: 'AWS Cloud Services',
        category: TransactionCategory.SUBSCRIPTIONS,
        timestamp: new Date(), description: 'Developer personal infrastructure lab',
        isRecurring: true,
      },
    ]);
  }
}
