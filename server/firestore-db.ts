import { getFirestore } from "./firebase";
import { Timestamp } from "firebase-admin/firestore";

// Tipos de dados
export interface User {
  id: string;
  openId: string;
  name?: string;
  email?: string;
  loginMethod?: string;
  role: "user" | "admin";
  createdAt: Date;
  updatedAt: Date;
  lastSignedIn: Date;
}

export interface Transaction {
  id: string;
  userId: string;
  categoryId: string;
  amount: number; // em centavos
  description?: string;
  date: Date;
  type: "income" | "expense";
  createdAt: Date;
  updatedAt: Date;
}

export interface Category {
  id: string;
  userId: string;
  name: string;
  type: "income" | "expense";
  color?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MonthlySummary {
  id: string;
  userId: string;
  year: number;
  month: number;
  totalIncome: number;
  totalExpense: number;
  balance: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface FinancialGoal {
  id: string;
  userId: string;
  categoryId: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  year: number;
  month: number;
  status: "in_progress" | "completed" | "failed";
  createdAt: Date;
  updatedAt: Date;
}

export interface CategoryLimit {
  id: string;
  userId: string;
  categoryId: string;
  monthlyLimit: number;
  alertThreshold: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Alert {
  id: string;
  userId: string;
  categoryId?: string;
  type: "limit_exceeded" | "goal_completed" | "goal_failed";
  message: string;
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Funções de usuário
export async function upsertUser(user: Omit<User, "id">): Promise<void> {
  const db = getFirestore();
  if (!db) throw new Error("Firestore não inicializado");

  const usersRef = db.collection("users");
  const query = usersRef.where("openId", "==", user.openId);
  const snapshot = await query.get();

  if (snapshot.empty) {
    // Criar novo usuário
    await usersRef.add({
      ...user,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
  } else {
    // Atualizar usuário existente
    const docId = snapshot.docs[0].id;
    await usersRef.doc(docId).update({
      ...user,
      updatedAt: Timestamp.now(),
    });
  }
}

export async function getUserByOpenId(openId: string): Promise<User | null> {
  const db = getFirestore();
  if (!db) throw new Error("Firestore não inicializado");

  const snapshot = await db
    .collection("users")
    .where("openId", "==", openId)
    .limit(1)
    .get();

  if (snapshot.empty) return null;

  const doc = snapshot.docs[0];
  return {
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate() || new Date(),
    updatedAt: doc.data().updatedAt?.toDate() || new Date(),
    lastSignedIn: doc.data().lastSignedIn?.toDate() || new Date(),
  } as User;
}

// Funções de transações
export async function createTransaction(
  transaction: Omit<Transaction, "id" | "createdAt" | "updatedAt">
): Promise<Transaction> {
  const db = getFirestore();
  if (!db) throw new Error("Firestore não inicializado");

  const txData: Record<string, unknown> = {
    userId: transaction.userId,
    categoryId: transaction.categoryId,
    amount: transaction.amount,
    type: transaction.type,
    date: Timestamp.fromDate(transaction.date),
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };
  if (transaction.description !== undefined) {
    txData.description = transaction.description;
  }
  const docRef = await db.collection("transactions").add(txData);

  return {
    id: docRef.id,
    ...transaction,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

export async function deleteTransaction(transactionId: string): Promise<void> {
  const db = getFirestore();
  if (!db) throw new Error("Firestore não inicializado");
  await db.collection("transactions").doc(transactionId).delete();
}

export async function getUserTransactions(
  userId: string,
  limit: number = 100
): Promise<Transaction[]> {
  const db = getFirestore();
  if (!db) return [];

  try {
    const snapshot = await db
      .collection("transactions")
      .where("userId", "==", userId)
      .get();

    return snapshot.docs
      .map((doc) => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date?.toDate() || new Date(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
      }) as Transaction)
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, limit);
  } catch (err) {
    console.error("[Firestore] getUserTransactions:", String(err));
    return [];
  }
}

export async function getTransactionsByDateRange(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<Transaction[]> {
  const db = getFirestore();
  if (!db) return [];

  try {
    const start = startDate.getTime();
    const end = endDate.getTime();

    const snapshot = await db
      .collection("transactions")
      .where("userId", "==", userId)
      .get();

    return snapshot.docs
      .map((doc) => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date?.toDate ? doc.data().date.toDate() : new Date(doc.data().date),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
      }) as Transaction)
      .filter((t) => {
        const ts = t.date.getTime();
        return ts >= start && ts <= end;
      })
      .sort((a, b) => b.date.getTime() - a.date.getTime());
  } catch (err) {
    console.error("[Firestore] getTransactionsByDateRange:", String(err));
    return [];
  }
}

// Funções de categorias
export async function createCategory(
  category: Omit<Category, "id" | "createdAt" | "updatedAt">
): Promise<Category> {
  const db = getFirestore();
  if (!db) throw new Error("Firebase não inicializado. Verifique FIREBASE_SERVICE_ACCOUNT_JSON.");

  try {
    const data: Record<string, unknown> = {
      userId: category.userId,
      name: category.name,
      type: category.type,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };
    if (category.color !== undefined) {
      data.color = category.color;
    }
    const docRef = await db.collection("categories").add(data);

    return {
      id: docRef.id,
      ...category,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  } catch (err) {
    console.error("[Firestore] createCategory:", String(err));
    throw new Error(`Erro ao criar categoria: ${String(err)}`);
  }
}

export async function deleteCategory(categoryId: string, userId: string): Promise<void> {
  const db = getFirestore();
  if (!db) throw new Error("Firestore não inicializado");
  const docRef = db.collection("categories").doc(categoryId);
  const doc = await docRef.get();
  if (doc.exists && doc.data()?.userId === userId) {
    await docRef.delete();
  }
}

export async function getUserCategories(userId: string): Promise<Category[]> {
  const db = getFirestore();
  if (!db) return [];

  try {
    const snapshot = await db
      .collection("categories")
      .where("userId", "==", userId)
      .get();

    return snapshot.docs
      .map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
      }) as Category)
      .sort((a, b) => a.name.localeCompare(b.name));
  } catch (err) {
    console.error("[Firestore] getUserCategories:", String(err));
    return [];
  }
}

// Funções de resumo mensal
export async function calculateMonthlyBalance(
  userId: string,
  year: number,
  month: number
): Promise<{ income: number; expense: number; balance: number }> {
  const db = getFirestore();
  if (!db) return { income: 0, expense: 0, balance: 0 };

  try {
    const startDate = new Date(year, month - 1, 1).getTime();
    const endDate = new Date(year, month, 0, 23, 59, 59).getTime();

    const snapshot = await db
      .collection("transactions")
      .where("userId", "==", userId)
      .get();

    let income = 0;
    let expense = 0;

    snapshot.docs.forEach((doc) => {
      const t = doc.data();
      const date: Date = t.date?.toDate ? t.date.toDate() : new Date(t.date);
      const ts = date.getTime();
      if (ts < startDate || ts > endDate) return;
      if (t.type === "income") income += t.amount;
      else expense += t.amount;
    });

    return { income, expense, balance: income - expense };
  } catch (err) {
    console.error("[Firestore] calculateMonthlyBalance:", String(err));
    return { income: 0, expense: 0, balance: 0 };
  }
}

export async function getUserMonthlySummaries(
  userId: string
): Promise<MonthlySummary[]> {
  const db = getFirestore();
  if (!db) return [];

  try {
    const snapshot = await db
      .collection("monthlySummaries")
      .where("userId", "==", userId)
      .get();

    return snapshot.docs
      .map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
      }) as MonthlySummary)
      .sort((a, b) => b.year !== a.year ? b.year - a.year : b.month - a.month);
  } catch (err) {
    console.error("[Firestore] getUserMonthlySummaries:", String(err));
    return [];
  }
}

export async function getExpensesByCategory(
  userId: string,
  year: number,
  month: number
): Promise<Array<{ categoryId: string; amount: number }>> {
  const db = getFirestore();
  if (!db) return [];

  try {
    const startDate = new Date(year, month - 1, 1).getTime();
    const endDate = new Date(year, month, 0, 23, 59, 59).getTime();

    const snapshot = await db
      .collection("transactions")
      .where("userId", "==", userId)
      .get();

    const expenses: { [key: string]: number } = {};

    snapshot.docs.forEach((doc) => {
      const t = doc.data();
      if (t.type !== "expense") return;
      const date: Date = t.date?.toDate ? t.date.toDate() : new Date(t.date);
      const ts = date.getTime();
      if (ts < startDate || ts > endDate) return;
      expenses[t.categoryId] = (expenses[t.categoryId] || 0) + t.amount;
    });

    return Object.entries(expenses).map(([categoryId, amount]) => ({ categoryId, amount }));
  } catch (err) {
    console.error("[Firestore] getExpensesByCategory:", String(err));
    return [];
  }
}

// Funções de metas financeiras
export async function createFinancialGoal(
  goal: Omit<FinancialGoal, "id" | "createdAt" | "updatedAt" | "currentAmount" | "status">
): Promise<FinancialGoal> {
  const db = getFirestore();
  if (!db) throw new Error("Firestore não inicializado");

  const docRef = await db.collection("financialGoals").add({
    ...goal,
    currentAmount: 0,
    status: "in_progress",
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });

  return {
    id: docRef.id,
    ...goal,
    currentAmount: 0,
    status: "in_progress",
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

export async function getUserFinancialGoals(
  userId: string,
  year: number,
  month: number
): Promise<FinancialGoal[]> {
  const db = getFirestore();
  if (!db) throw new Error("Firestore não inicializado");

  const snapshot = await db
    .collection("financialGoals")
    .where("userId", "==", userId)
    .where("year", "==", year)
    .where("month", "==", month)
    .get();

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate() || new Date(),
    updatedAt: doc.data().updatedAt?.toDate() || new Date(),
  })) as FinancialGoal[];
}

export async function updateFinancialGoal(
  goalId: string,
  updates: Partial<FinancialGoal>
): Promise<void> {
  const db = getFirestore();
  if (!db) throw new Error("Firestore não inicializado");

  await db
    .collection("financialGoals")
    .doc(goalId)
    .update({
      ...updates,
      updatedAt: Timestamp.now(),
    });
}

// Funções de limites de categoria
export async function createCategoryLimit(
  limit: Omit<CategoryLimit, "id" | "createdAt" | "updatedAt">
): Promise<CategoryLimit> {
  const db = getFirestore();
  if (!db) throw new Error("Firestore não inicializado");

  const docRef = await db.collection("categoryLimits").add({
    ...limit,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });

  return {
    id: docRef.id,
    ...limit,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

export async function getUserCategoryLimits(userId: string): Promise<CategoryLimit[]> {
  const db = getFirestore();
  if (!db) throw new Error("Firestore não inicializado");

  const snapshot = await db
    .collection("categoryLimits")
    .where("userId", "==", userId)
    .where("isActive", "==", true)
    .get();

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate() || new Date(),
    updatedAt: doc.data().updatedAt?.toDate() || new Date(),
  })) as CategoryLimit[];
}

export async function updateCategoryLimit(
  limitId: string,
  updates: Partial<CategoryLimit>
): Promise<void> {
  const db = getFirestore();
  if (!db) throw new Error("Firestore não inicializado");

  await db
    .collection("categoryLimits")
    .doc(limitId)
    .update({
      ...updates,
      updatedAt: Timestamp.now(),
    });
}

export async function deleteCategoryLimit(limitId: string): Promise<void> {
  const db = getFirestore();
  if (!db) throw new Error("Firestore não inicializado");

  await db.collection("categoryLimits").doc(limitId).delete();
}

export async function checkCategoryLimitExceeded(
  userId: string,
  categoryId: string,
  year: number,
  month: number
): Promise<{ exceeded: boolean; percentage: number; limit: number; spent: number } | null> {
  const db = getFirestore();
  if (!db) throw new Error("Firestore não inicializado");

  // Obter o limite
  const limitSnapshot = await db
    .collection("categoryLimits")
    .where("userId", "==", userId)
    .where("categoryId", "==", categoryId)
    .limit(1)
    .get();

  if (limitSnapshot.empty) return null;

  const limitDoc = limitSnapshot.docs[0].data() as CategoryLimit;

  // Calcular gastos do mês
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  const transactionsSnapshot = await db
    .collection("transactions")
    .where("userId", "==", userId)
    .where("categoryId", "==", categoryId)
    .where("type", "==", "expense")
    .where("date", ">=", Timestamp.fromDate(startDate))
    .where("date", "<=", Timestamp.fromDate(endDate))
    .get();

  let spent = 0;
  transactionsSnapshot.docs.forEach((doc) => {
    spent += doc.data().amount;
  });

  const percentage = (spent / limitDoc.monthlyLimit) * 100;

  return {
    exceeded: percentage >= 100,
    percentage: Math.round(percentage),
    limit: limitDoc.monthlyLimit,
    spent,
  };
}

// Funções de alertas
export async function getUserAlerts(userId: string, unreadOnly: boolean = false): Promise<Alert[]> {
  const db = getFirestore();
  if (!db) throw new Error("Firestore não inicializado");

  let query = db.collection("alerts").where("userId", "==", userId);

  if (unreadOnly) {
    query = query.where("isRead", "==", false);
  }

  const snapshot = await query.orderBy("createdAt", "desc").get();

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate() || new Date(),
    updatedAt: doc.data().updatedAt?.toDate() || new Date(),
  })) as Alert[];
}

export async function markAlertAsRead(alertId: string): Promise<void> {
  const db = getFirestore();
  if (!db) throw new Error("Firestore não inicializado");

  await db.collection("alerts").doc(alertId).update({
    isRead: true,
    updatedAt: Timestamp.now(),
  });
}

export async function deleteAlert(alertId: string): Promise<void> {
  const db = getFirestore();
  if (!db) throw new Error("Firestore não inicializado");

  await db.collection("alerts").doc(alertId).delete();
}
