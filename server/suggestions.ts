import { getExpensesByCategory, getUserTransactions, getTransactionsByDateRange } from "./db";

export interface Suggestion {
  type: "warning" | "opportunity" | "advice";
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
}

/**
 * Analyzes monthly balance and generates behavioral suggestions
 */
export async function generateBehavioralSuggestions(
  userId: number,
  year: number,
  month: number,
  balance: number
): Promise<Suggestion[]> {
  const suggestions: Suggestion[] = [];

  if (balance < 0) {
    // Negative balance - suggest expense cuts
    suggestions.push({
      type: "warning",
      title: "Saldo Negativo Detectado",
      description: `Você está no vermelho em R$ ${Math.abs(balance / 100).toFixed(2)} este mês. Considere revisar suas despesas.`,
      priority: "high",
    });

    // Get top expense categories
    const expensesByCategory = await getExpensesByCategory(userId, year, month);

    if (expensesByCategory.length > 0) {
      // Sort by amount and get top 3
      const topExpenses = expensesByCategory
        .sort((a, b) => (b.totalAmount || 0) - (a.totalAmount || 0))
        .slice(0, 3);

      const topCategoryNames = topExpenses
        .map((e) => e.categoryName)
        .filter(Boolean)
        .join(", ");

      if (topCategoryNames) {
        suggestions.push({
          type: "advice",
          title: "Principais Categorias de Gasto",
          description: `Suas maiores despesas estão em: ${topCategoryNames}. Tente reduzir gastos nessas categorias.`,
          priority: "high",
        });
      }
    }

    // Check for spending trends
    const lastThreeMonths = [];
    for (let i = 0; i < 3; i++) {
      let m = month - i;
      let y = year;
      if (m <= 0) {
        m += 12;
        y -= 1;
      }
      lastThreeMonths.push({ year: y, month: m });
    }

    // If consistently negative, suggest budget planning
    if (lastThreeMonths.length >= 3) {
      suggestions.push({
        type: "warning",
        title: "Considere um Orçamento",
        description: "Você está com saldo negativo. Recomendamos criar um orçamento mensal para controlar melhor seus gastos.",
        priority: "medium",
      });
    }
  }

  return suggestions;
}

/**
 * Analyzes monthly surplus and generates investment suggestions
 */
export async function generateInvestmentSuggestions(
  userId: number,
  year: number,
  month: number,
  balance: number
): Promise<Suggestion[]> {
  const suggestions: Suggestion[] = [];

  if (balance > 0) {
    const surplusPercentage = 20; // Suggest investing 20% of surplus

    suggestions.push({
      type: "opportunity",
      title: "Oportunidade de Investimento",
      description: `Você tem um superávit de R$ ${(balance / 100).toFixed(2)} este mês. Considere investir ${surplusPercentage}% (R$ ${((balance * surplusPercentage) / 100 / 100).toFixed(2)}) em aplicações de renda fixa ou fundos.`,
      priority: "medium",
    });

    if (balance > 500000) {
      // More than R$ 5000
      suggestions.push({
        type: "opportunity",
        title: "Diversifique seus Investimentos",
        description: "Com um saldo positivo significativo, considere diversificar entre diferentes tipos de investimentos: renda fixa, ações e fundos imobiliários.",
        priority: "medium",
      });
    }

    suggestions.push({
      type: "advice",
      title: "Mantenha uma Reserva de Emergência",
      description: "Antes de investir, certifique-se de ter uma reserva de emergência equivalente a 3-6 meses de despesas.",
      priority: "low",
    });
  }

  return suggestions;
}

/**
 * Generates all suggestions for a given month
 */
export async function generateAllSuggestions(
  userId: number,
  year: number,
  month: number,
  balance: number
): Promise<Suggestion[]> {
  const allSuggestions: Suggestion[] = [];

  const behavioralSuggestions = await generateBehavioralSuggestions(
    userId,
    year,
    month,
    balance
  );
  allSuggestions.push(...behavioralSuggestions);

  const investmentSuggestions = await generateInvestmentSuggestions(
    userId,
    year,
    month,
    balance
  );
  allSuggestions.push(...investmentSuggestions);

  return allSuggestions.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
}
