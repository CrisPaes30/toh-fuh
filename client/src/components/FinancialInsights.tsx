import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getUserTransactions, getUserCategories, type Transaction, type Category } from "@/lib/db";
import { TrendingDown, TrendingUp, AlertTriangle, CheckCircle, Lightbulb, PiggyBank } from "lucide-react";

interface Insight {
  type: "success" | "warning" | "danger" | "tip";
  icon: React.ReactNode;
  title: string;
  description: string;
}

function buildInsights(
  transactions: Transaction[],
  categories: Category[],
  year: number,
  month: number
): Insight[] {
  const monthTx = transactions.filter((t) => {
    const d = new Date(t.date);
    return d.getFullYear() === year && d.getMonth() + 1 === month;
  });

  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  const prevTx = transactions.filter((t) => {
    const d = new Date(t.date);
    return d.getFullYear() === prevYear && d.getMonth() + 1 === prevMonth;
  });

  const totalIncome = monthTx.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const totalExpense = monthTx.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const prevExpense = prevTx.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);

  if (monthTx.length === 0) return [];

  const insights: Insight[] = [];

  const fmt = (cents: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
  const pct = (n: number, d: number) => (d === 0 ? 0 : Math.round((n / d) * 100));

  // ── Saldo / taxa de economia ──────────────────────────────────────────────
  if (totalIncome > 0) {
    const savingsRate = pct(totalIncome - totalExpense, totalIncome);
    if (savingsRate >= 30) {
      insights.push({
        type: "success",
        icon: <PiggyBank className="h-5 w-5 text-green-600" />,
        title: `Excelente! Você economizou ${savingsRate}% da renda`,
        description: `Guardando ${fmt(totalIncome - totalExpense)} este mês. Continue assim — considere investir o excedente.`,
      });
    } else if (savingsRate >= 10) {
      insights.push({
        type: "tip",
        icon: <TrendingUp className="h-5 w-5 text-blue-600" />,
        title: `Você economizou ${savingsRate}% da renda`,
        description: `Meta recomendada: 20%. Tente cortar ${fmt(Math.round((0.2 * totalIncome - (totalIncome - totalExpense))))} a mais nos próximos meses.`,
      });
    } else if (savingsRate >= 0) {
      insights.push({
        type: "warning",
        icon: <AlertTriangle className="h-5 w-5 text-yellow-600" />,
        title: `Taxa de economia baixa: ${savingsRate}%`,
        description: `Você quase não sobrou nada este mês. Revise gastos desnecessários para chegar a pelo menos 10% de economia.`,
      });
    } else {
      insights.push({
        type: "danger",
        icon: <AlertTriangle className="h-5 w-5 text-red-600" />,
        title: `Gastos superaram a renda em ${fmt(totalExpense - totalIncome)}`,
        description: `Cuidado! Você gastou mais do que ganhou este mês. Revise suas despesas urgentemente.`,
      });
    }
  }

  // ── Comparação com mês anterior ───────────────────────────────────────────
  if (prevExpense > 0 && totalExpense > 0) {
    const diff = totalExpense - prevExpense;
    const diffPct = pct(Math.abs(diff), prevExpense);
    if (diff > 0 && diffPct >= 10) {
      insights.push({
        type: "warning",
        icon: <TrendingUp className="h-5 w-5 text-orange-500" />,
        title: `Gastos ${diffPct}% maiores que o mês passado`,
        description: `Você gastou ${fmt(diff)} a mais em relação ao mês anterior (${fmt(prevExpense)}). Analise o que mudou.`,
      });
    } else if (diff < 0 && diffPct >= 10) {
      insights.push({
        type: "success",
        icon: <TrendingDown className="h-5 w-5 text-green-600" />,
        title: `Parabéns! Gastos ${diffPct}% menores que o mês passado`,
        description: `Você economizou ${fmt(Math.abs(diff))} em comparação com o mês anterior. Ótima disciplina financeira!`,
      });
    }
  }

  // ── Análise por categoria ─────────────────────────────────────────────────
  const byCat = new Map<string, number>();
  monthTx
    .filter((t) => t.type === "expense")
    .forEach((t) => byCat.set(t.categoryId, (byCat.get(t.categoryId) ?? 0) + t.amount));

  const sorted = Array.from(byCat.entries())
    .map(([id, amount]) => ({
      id,
      amount,
      name: categories.find((c) => c.id === id)?.name ?? "Outros",
      share: pct(amount, totalExpense),
    }))
    .sort((a, b) => b.amount - a.amount);

  // Top categoria
  if (sorted.length > 0) {
    const top = sorted[0];
    insights.push({
      type: top.share > 50 ? "warning" : "tip",
      icon: <Lightbulb className="h-5 w-5 text-yellow-500" />,
      title: `${top.name} é seu maior gasto: ${fmt(top.amount)} (${top.share}%)`,
      description: top.share > 50
        ? `Mais da metade dos seus gastos foi em ${top.name}. Considere alternativas para reduzir essa categoria.`
        : `${top.name} representa ${top.share}% dos seus gastos este mês.`,
    });
  }

  // Dicas específicas por nome de categoria
  const TIPS: Array<{ keywords: string[]; threshold: number; tip: string }> = [
    {
      keywords: ["alimentação", "mercado", "supermercado", "restaurante", "comida", "ifood", "delivery"],
      threshold: 30,
      tip: "Planejar refeições semanais e cozinhar em casa pode reduzir até 40% do gasto com alimentação.",
    },
    {
      keywords: ["transporte", "combustível", "gasolina", "uber", "99", "táxi", "ônibus"],
      threshold: 20,
      tip: "Transporte acima de 20% da renda é alto. Considere transporte público, caronas ou combinar percursos.",
    },
    {
      keywords: ["entretenimento", "lazer", "streaming", "netflix", "cinema", "spotify"],
      threshold: 15,
      tip: "Revise assinaturas de streaming — muitas ficam esquecidas mas continuam sendo cobradas todo mês.",
    },
    {
      keywords: ["compras", "roupa", "vestuário", "shopping"],
      threshold: 20,
      tip: "Antes de comprar, espere 48h. Muitas compras por impulso são evitadas com essa pausa.",
    },
  ];

  for (const entry of sorted.slice(0, 3)) {
    const lower = entry.name.toLowerCase();
    for (const rule of TIPS) {
      if (rule.keywords.some((k) => lower.includes(k)) && entry.share >= rule.threshold) {
        insights.push({
          type: "tip",
          icon: <Lightbulb className="h-5 w-5 text-blue-500" />,
          title: `Dica para ${entry.name}`,
          description: rule.tip,
        });
        break;
      }
    }
  }

  // Fundo de emergência
  if (totalIncome > 0 && totalIncome - totalExpense > 0 && insights.length < 5) {
    insights.push({
      type: "tip",
      icon: <PiggyBank className="h-5 w-5 text-purple-500" />,
      title: "Construa seu fundo de emergência",
      description: `Recomenda-se ter de 3 a 6 meses de despesas guardados. Sua meta: ${fmt(totalExpense * 3)} a ${fmt(totalExpense * 6)}.`,
    });
  }

  return insights.slice(0, 5);
}

const borderColor = {
  success: "border-l-green-500 bg-green-50",
  warning: "border-l-yellow-500 bg-yellow-50",
  danger: "border-l-red-500 bg-red-50",
  tip: "border-l-blue-500 bg-blue-50",
};

const titleColor = {
  success: "text-green-800",
  warning: "text-yellow-800",
  danger: "text-red-800",
  tip: "text-blue-800",
};

const descColor = {
  success: "text-green-700",
  warning: "text-yellow-700",
  danger: "text-red-700",
  tip: "text-blue-700",
};

export function FinancialInsights() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const { data: transactions = [] } = useQuery({
    queryKey: ["transactions"],
    queryFn: () => getUserTransactions(1000),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: getUserCategories,
  });

  const insights = useMemo(
    () => buildInsights(transactions, categories, year, month),
    [transactions, categories, year, month]
  );

  if (insights.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-yellow-500" />
          Análise do Mês
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {insights.map((insight, i) => (
          <div
            key={i}
            className={`border-l-4 rounded-lg p-4 ${borderColor[insight.type]}`}
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5 shrink-0">{insight.icon}</div>
              <div>
                <p className={`font-semibold text-sm ${titleColor[insight.type]}`}>
                  {insight.title}
                </p>
                <p className={`text-sm mt-0.5 ${descColor[insight.type]}`}>
                  {insight.description}
                </p>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
