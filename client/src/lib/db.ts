import { db, auth } from "./firebase";
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  query,
  where,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";

function uid(): string {
  const user = auth.currentUser;
  if (!user) throw new Error("Usuário não autenticado");
  return user.uid;
}

function toDate(val: unknown): Date {
  if (val instanceof Timestamp) return val.toDate();
  if (val instanceof Date) return val;
  return new Date();
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Category {
  id: string;
  userId: string;
  name: string;
  type: "income" | "expense";
  color?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Transaction {
  id: string;
  userId: string;
  categoryId: string;
  amount: number; // centavos
  description?: string;
  date: Date;
  type: "income" | "expense";
  createdAt: Date;
  updatedAt: Date;
}

export interface MonthlySummary {
  year: number;
  month: number;
  totalIncome: number;
  totalExpense: number;
  balance: number;
}

// ─── Categories ───────────────────────────────────────────────────────────────

export async function getUserCategories(): Promise<Category[]> {
  const userId = uid();
  const snap = await getDocs(
    query(collection(db, "categories"), where("userId", "==", userId))
  );
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data(), createdAt: toDate(d.data().createdAt), updatedAt: toDate(d.data().updatedAt) } as Category))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function createCategory(data: {
  name: string;
  type: "income" | "expense";
  color?: string;
}): Promise<Category> {
  const userId = uid();
  const doc_data: Record<string, unknown> = {
    userId,
    name: data.name,
    type: data.type,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  if (data.color !== undefined) doc_data.color = data.color;
  const ref = await addDoc(collection(db, "categories"), doc_data);
  return {
    id: ref.id,
    userId,
    name: data.name,
    type: data.type,
    color: data.color,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

export async function deleteCategory(categoryId: string): Promise<void> {
  await deleteDoc(doc(db, "categories", categoryId));
}

// ─── Transactions ─────────────────────────────────────────────────────────────

export async function getUserTransactions(limitCount = 100): Promise<Transaction[]> {
  const userId = uid();
  const snap = await getDocs(
    query(collection(db, "transactions"), where("userId", "==", userId))
  );
  return snap.docs
    .map((d) => ({
      id: d.id,
      ...d.data(),
      date: toDate(d.data().date),
      createdAt: toDate(d.data().createdAt),
      updatedAt: toDate(d.data().updatedAt),
    } as Transaction))
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, limitCount);
}

export async function createTransaction(data: {
  categoryId: string;
  amount: number;
  description?: string;
  date: Date;
  type: "income" | "expense";
}): Promise<Transaction> {
  const userId = uid();
  const doc_data: Record<string, unknown> = {
    userId,
    categoryId: data.categoryId,
    amount: Math.round(data.amount * 100),
    type: data.type,
    date: Timestamp.fromDate(data.date),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  if (data.description !== undefined) doc_data.description = data.description;
  const ref = await addDoc(collection(db, "transactions"), doc_data);
  return {
    id: ref.id,
    userId,
    categoryId: data.categoryId,
    amount: Math.round(data.amount * 100),
    description: data.description,
    date: data.date,
    type: data.type,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

// ─── Analytics ────────────────────────────────────────────────────────────────

export async function calculateMonthlyBalance(
  year: number,
  month: number
): Promise<{ income: number; expense: number; balance: number }> {
  const userId = uid();
  const startMs = new Date(year, month - 1, 1).getTime();
  const endMs = new Date(year, month, 0, 23, 59, 59, 999).getTime();

  const snap = await getDocs(
    query(collection(db, "transactions"), where("userId", "==", userId))
  );

  let income = 0;
  let expense = 0;
  snap.docs.forEach((d) => {
    const t = d.data();
    const ts = toDate(t.date).getTime();
    if (ts < startMs || ts > endMs) return;
    if (t.type === "income") income += t.amount;
    else expense += t.amount;
  });

  return { income, expense, balance: income - expense };
}

export async function getUserMonthlySummaries(): Promise<MonthlySummary[]> {
  const userId = uid();
  const snap = await getDocs(
    query(collection(db, "transactions"), where("userId", "==", userId))
  );

  const map = new Map<string, { income: number; expense: number }>();

  snap.docs.forEach((d) => {
    const t = d.data();
    const date = toDate(t.date);
    const key = `${date.getFullYear()}-${date.getMonth() + 1}`;
    const cur = map.get(key) ?? { income: 0, expense: 0 };
    if (t.type === "income") cur.income += t.amount;
    else cur.expense += t.amount;
    map.set(key, cur);
  });

  return Array.from(map.entries())
    .map(([key, v]) => {
      const [y, m] = key.split("-").map(Number);
      return { year: y, month: m, totalIncome: v.income, totalExpense: v.expense, balance: v.income - v.expense };
    })
    .sort((a, b) => b.year !== a.year ? b.year - a.year : b.month - a.month);
}

// ─── Default categories ───────────────────────────────────────────────────────

const DEFAULT_INCOME: Array<{ name: string; color: string }> = [
  { name: "Salário", color: "#10b981" },
  { name: "Freelance", color: "#10b981" },
  { name: "Investimentos", color: "#10b981" },
  { name: "Bônus", color: "#10b981" },
  { name: "Outros", color: "#10b981" },
];

const DEFAULT_EXPENSE: Array<{ name: string; color: string }> = [
  { name: "Alimentação", color: "#ef4444" },
  { name: "Transporte", color: "#ef4444" },
  { name: "Moradia", color: "#ef4444" },
  { name: "Saúde", color: "#ef4444" },
  { name: "Educação", color: "#ef4444" },
  { name: "Entretenimento", color: "#ef4444" },
  { name: "Compras", color: "#ef4444" },
  { name: "Contas", color: "#ef4444" },
  { name: "Outros", color: "#ef4444" },
];

// ─── Goals ────────────────────────────────────────────────────────────────────

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

export async function getUserGoals(year: number, month: number): Promise<FinancialGoal[]> {
  const userId = uid();
  const snap = await getDocs(
    query(
      collection(db, "financialGoals"),
      where("userId", "==", userId),
      where("year", "==", year),
      where("month", "==", month)
    )
  );
  return snap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
    createdAt: toDate(d.data().createdAt),
    updatedAt: toDate(d.data().updatedAt),
  } as FinancialGoal));
}

export async function createGoal(data: {
  categoryId: string;
  name: string;
  targetAmount: number;
  year: number;
  month: number;
}): Promise<FinancialGoal> {
  const userId = uid();
  const ref = await addDoc(collection(db, "financialGoals"), {
    userId,
    ...data,
    currentAmount: 0,
    status: "in_progress",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return { id: ref.id, userId, ...data, currentAmount: 0, status: "in_progress", createdAt: new Date(), updatedAt: new Date() };
}

export async function updateGoal(goalId: string, updates: { status?: "completed" | "failed" | "in_progress"; currentAmount?: number }): Promise<void> {
  const { updateDoc } = await import("firebase/firestore");
  await updateDoc(doc(db, "financialGoals", goalId), { ...updates, updatedAt: serverTimestamp() });
}

// ─── Limits ───────────────────────────────────────────────────────────────────

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

export async function getUserLimits(): Promise<CategoryLimit[]> {
  const userId = uid();
  const snap = await getDocs(
    query(collection(db, "categoryLimits"), where("userId", "==", userId), where("isActive", "==", true))
  );
  return snap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
    createdAt: toDate(d.data().createdAt),
    updatedAt: toDate(d.data().updatedAt),
  } as CategoryLimit));
}

export async function createLimit(data: { categoryId: string; monthlyLimit: number; alertThreshold: number }): Promise<CategoryLimit> {
  const userId = uid();
  const ref = await addDoc(collection(db, "categoryLimits"), {
    userId,
    ...data,
    isActive: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return { id: ref.id, userId, ...data, isActive: true, createdAt: new Date(), updatedAt: new Date() };
}

export async function deleteLimit(limitId: string): Promise<void> {
  await deleteDoc(doc(db, "categoryLimits", limitId));
}

// ─── Default categories ───────────────────────────────────────────────────────

export async function initializeDefaultCategories(): Promise<void> {
  const existing = await getUserCategories();
  if (existing.length > 0) return;
  for (const c of DEFAULT_INCOME) await createCategory({ ...c, type: "income" });
  for (const c of DEFAULT_EXPENSE) await createCategory({ ...c, type: "expense" });
}
