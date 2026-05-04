import { createCategory, getUserCategories } from "./firestore-db";

const DEFAULT_INCOME_CATEGORIES = [
  { name: "Salário", color: "#10b981", icon: "briefcase" },
  { name: "Freelance", color: "#10b981", icon: "code" },
  { name: "Investimentos", color: "#10b981", icon: "trending-up" },
  { name: "Bônus", color: "#10b981", icon: "gift" },
  { name: "Outros", color: "#10b981", icon: "plus-circle" },
];

const DEFAULT_EXPENSE_CATEGORIES = [
  { name: "Alimentação", color: "#ef4444", icon: "utensils" },
  { name: "Transporte", color: "#ef4444", icon: "car" },
  { name: "Moradia", color: "#ef4444", icon: "home" },
  { name: "Saúde", color: "#ef4444", icon: "heart" },
  { name: "Educação", color: "#ef4444", icon: "book" },
  { name: "Entretenimento", color: "#ef4444", icon: "film" },
  { name: "Compras", color: "#ef4444", icon: "shopping-bag" },
  { name: "Contas", color: "#ef4444", icon: "zap" },
  { name: "Outros", color: "#ef4444", icon: "minus-circle" },
];

export async function initializeDefaultCategories(userId: string) {
  try {
    const existingCategories = await getUserCategories(userId);

    if (existingCategories.length > 0) {
      return;
    }

    // Create income categories
    for (const cat of DEFAULT_INCOME_CATEGORIES) {
      await createCategory({
        userId,
        type: "income",
        ...cat,
      });
    }

    // Create expense categories
    for (const cat of DEFAULT_EXPENSE_CATEGORIES) {
      await createCategory({
        userId,
        type: "expense",
        ...cat,
      });
    }
  } catch (error) {
    console.error("Error initializing categories:", error);
  }
}
