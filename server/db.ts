import { and, desc, eq, gte, lte } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, categories, transactions, monthlySummaries, InsertCategory, InsertTransaction, InsertMonthlySummary, financialGoals, InsertFinancialGoal, categoryLimits, InsertCategoryLimit, alerts, InsertAlert } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ===== CATEGORIES =====
export async function getUserCategories(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(categories)
    .where(eq(categories.userId, userId))
    .orderBy(categories.type, categories.name);
}

export async function createCategory(data: InsertCategory) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(categories).values(data);
  return result;
}

// ===== TRANSACTIONS =====
export async function getUserTransactions(userId: number, limit?: number) {
  const db = await getDb();
  if (!db) return [];
  const query = db
    .select()
    .from(transactions)
    .where(eq(transactions.userId, userId))
    .orderBy(desc(transactions.date));
  if (limit) return query.limit(limit);
  return query;
}

export async function getTransactionsByDateRange(
  userId: number,
  startDate: Date,
  endDate: Date
) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        gte(transactions.date, startDate),
        lte(transactions.date, endDate)
      )
    )
    .orderBy(desc(transactions.date));
}

export async function createTransaction(data: InsertTransaction) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(transactions).values(data);
}

export async function updateTransaction(
  id: number,
  data: Partial<InsertTransaction>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(transactions).set(data).where(eq(transactions.id, id));
}

export async function deleteTransaction(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.delete(transactions).where(eq(transactions.id, id));
}

// ===== MONTHLY SUMMARIES =====
export async function getMonthlySummary(
  userId: number,
  year: number,
  month: number
) {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select()
    .from(monthlySummaries)
    .where(
      and(
        eq(monthlySummaries.userId, userId),
        eq(monthlySummaries.year, year),
        eq(monthlySummaries.month, month)
      )
    )
    .limit(1);
  return result[0] || null;
}

export async function getUserMonthlySummaries(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(monthlySummaries)
    .where(eq(monthlySummaries.userId, userId))
    .orderBy(desc(monthlySummaries.year), desc(monthlySummaries.month));
}

export async function upsertMonthlySummary(data: InsertMonthlySummary) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db
    .insert(monthlySummaries)
    .values(data)
    .onDuplicateKeyUpdate({
      set: {
        totalIncome: data.totalIncome,
        totalExpense: data.totalExpense,
        balance: data.balance,
      },
    });
}

// ===== ANALYTICS HELPERS =====
export async function calculateMonthlyBalance(
  userId: number,
  year: number,
  month: number
) {
  const db = await getDb();
  if (!db) return { income: 0, expense: 0, balance: 0 };

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  const txns = await db
    .select({
      type: transactions.type,
      amount: transactions.amount,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        gte(transactions.date, startDate),
        lte(transactions.date, endDate)
      )
    );

  let income = 0;
  let expense = 0;

  txns.forEach((t) => {
    if (t.type === "income") {
      income += t.amount;
    } else {
      expense += t.amount;
    }
  });

  return {
    income,
    expense,
    balance: income - expense,
  };
}

export async function getYearlyComparison(userId: number, year: number) {
  const db = await getDb();
  if (!db) return [];

  const summaries = await db
    .select()
    .from(monthlySummaries)
    .where(
      and(
        eq(monthlySummaries.userId, userId),
        eq(monthlySummaries.year, year)
      )
    )
    .orderBy(monthlySummaries.month);

  return summaries;
}

// ===== EXPENSE ANALYSIS =====
export async function getExpensesByCategory(
  userId: number,
  year: number,
  month: number
) {
  const db = await getDb();
  if (!db) return [];

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  const result = await db
    .select({
      categoryId: transactions.categoryId,
      categoryName: categories.name,
      totalAmount: transactions.amount,
    })
    .from(transactions)
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.type, "expense"),
        gte(transactions.date, startDate),
        lte(transactions.date, endDate)
      )
    );

  return result;
}


// ===== FINANCIAL GOALS =====
export async function createFinancialGoal(data: InsertFinancialGoal) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(financialGoals).values(data);
}

export async function getUserFinancialGoals(userId: number, year: number, month: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(financialGoals)
    .where(
      and(
        eq(financialGoals.userId, userId),
        eq(financialGoals.year, year),
        eq(financialGoals.month, month)
      )
    );
}

export async function updateFinancialGoal(
  id: number,
  data: Partial<InsertFinancialGoal>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(financialGoals).set(data).where(eq(financialGoals.id, id));
}

// ===== CATEGORY LIMITS =====
export async function createCategoryLimit(data: InsertCategoryLimit) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(categoryLimits).values(data);
}

export async function getUserCategoryLimits(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(categoryLimits)
    .where(and(eq(categoryLimits.userId, userId), eq(categoryLimits.isActive, 1)));
}

export async function updateCategoryLimit(
  id: number,
  data: Partial<InsertCategoryLimit>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(categoryLimits).set(data).where(eq(categoryLimits.id, id));
}

export async function deleteCategoryLimit(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.delete(categoryLimits).where(eq(categoryLimits.id, id));
}

// ===== ALERTS =====
export async function createAlert(data: InsertAlert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(alerts).values(data);
}

export async function getUserAlerts(userId: number, unreadOnly = false) {
  const db = await getDb();
  if (!db) return [];
  
  const conditions = [eq(alerts.userId, userId)];
  if (unreadOnly) {
    conditions.push(eq(alerts.isRead, 0));
  }
  
  return db
    .select()
    .from(alerts)
    .where(conditions.length > 1 ? and(...conditions) : conditions[0])
    .orderBy(desc(alerts.createdAt));
}

export async function markAlertAsRead(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(alerts).set({ isRead: 1 }).where(eq(alerts.id, id));
}

export async function deleteAlert(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.delete(alerts).where(eq(alerts.id, id));
}

// ===== TREND ANALYSIS =====
export async function calculateCategoryTrend(
  userId: number,
  categoryId: number,
  months: number = 3
) {
  const db = await getDb();
  if (!db) return [];

  const monthlyTotals = [];
  const now = new Date();

  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const result = await db
      .select({ total: transactions.amount })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          eq(transactions.categoryId, categoryId),
          eq(transactions.type, "expense"),
          gte(transactions.date, startDate),
          lte(transactions.date, endDate)
        )
      );

    const total = result.reduce((sum, r) => sum + (r.total || 0), 0);
    monthlyTotals.push({
      year,
      month,
      total,
    });
  }

  return monthlyTotals;
}

export async function checkCategoryLimitExceeded(
  userId: number,
  categoryId: number,
  year: number,
  month: number
) {
  const db = await getDb();
  if (!db) return null;

  const limit = await db
    .select()
    .from(categoryLimits)
    .where(
      and(
        eq(categoryLimits.userId, userId),
        eq(categoryLimits.categoryId, categoryId),
        eq(categoryLimits.isActive, 1)
      )
    )
    .limit(1);

  if (limit.length === 0) return null;

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  const spent = await db
    .select({ total: transactions.amount })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.categoryId, categoryId),
        eq(transactions.type, "expense"),
        gte(transactions.date, startDate),
        lte(transactions.date, endDate)
      )
    );

  const totalSpent = spent.reduce((sum, s) => sum + (s.total || 0), 0);
  const limitAmount = limit[0].monthlyLimit;
  const threshold = (limitAmount * limit[0].alertThreshold) / 100;

  return {
    limitAmount,
    totalSpent,
    threshold,
    percentageUsed: (totalSpent / limitAmount) * 100,
    isExceeded: totalSpent > limitAmount,
    isAboveThreshold: totalSpent > threshold,
  };
}
