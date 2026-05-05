import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useInitializeCategories } from "@/hooks/useInitializeCategories";
import { getUserTransactions, calculateMonthlyBalance, getUserMonthlySummaries } from "@/lib/db";
import { useLocation } from "wouter";
import { FinancialInsights } from "@/components/FinancialInsights";

export default function Dashboard() {
  useInitializeCategories();
  const [, setLocation] = useLocation();
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const { data: recentTransactions, isLoading: transLoading } = useQuery({
    queryKey: ["transactions", "recent"],
    queryFn: () => getUserTransactions(5),
  });

  const { data: monthlyBalance } = useQuery({
    queryKey: ["analytics", "monthlyBalance", currentYear, currentMonth],
    queryFn: () => calculateMonthlyBalance(currentYear, currentMonth),
  });

  const { data: summaries } = useQuery({
    queryKey: ["analytics", "monthlySummaries"],
    queryFn: getUserMonthlySummaries,
  });

  const formatCurrency = (cents: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);

  const chartData =
    summaries
      ?.slice(-12)
      .reverse()
      .map((s) => ({
        month: format(new Date(s.year, s.month - 1), "MMM", { locale: ptBR }),
        income: s.totalIncome / 100,
        expense: s.totalExpense / 100,
        balance: s.balance / 100,
      })) || [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card
          className="border-l-4 border-l-blue-500 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => setLocation("/transactions/all")}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Saldo Atual</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold text-gray-900">
                  {formatCurrency(monthlyBalance?.balance || 0)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {format(now, "MMMM yyyy", { locale: ptBR })}
                </p>
              </div>
              <Wallet className="h-10 w-10 text-blue-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card
          className="border-l-4 border-l-green-500 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => setLocation("/transactions/income")}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Entradas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold text-green-600">
                  {formatCurrency(monthlyBalance?.income || 0)}
                </p>
                <p className="text-xs text-gray-500 mt-1">Este mês · ver detalhes →</p>
              </div>
              <TrendingUp className="h-10 w-10 text-green-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card
          className="border-l-4 border-l-red-500 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => setLocation("/transactions/expense")}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Saídas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold text-red-600">
                  {formatCurrency(monthlyBalance?.expense || 0)}
                </p>
                <p className="text-xs text-gray-500 mt-1">Este mês · ver detalhes →</p>
              </div>
              <TrendingDown className="h-10 w-10 text-red-500 opacity-20" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Resumo dos Últimos 12 Meses</CardTitle>
          <CardDescription>Comparação entre entradas e saídas</CardDescription>
        </CardHeader>
        <CardContent>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => `R$ ${typeof value === "number" ? value.toFixed(2) : value}`} />
                <Line type="monotone" dataKey="income" stroke="#10b981" name="Entradas" />
                <Line type="monotone" dataKey="expense" stroke="#ef4444" name="Saídas" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-80 flex items-center justify-center text-gray-500">
              Nenhum dado disponível
            </div>
          )}
        </CardContent>
      </Card>

      <FinancialInsights />

      <Card>
        <CardHeader>
          <CardTitle>Últimas Transações</CardTitle>
          <CardDescription>Seus 5 últimos movimentos</CardDescription>
        </CardHeader>
        <CardContent>
          {transLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : recentTransactions && recentTransactions.length > 0 ? (
            <div className="space-y-3">
              {recentTransactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{tx.description || "Transação"}</p>
                    <p className="text-sm text-gray-500">
                      {format(new Date(tx.date), "dd MMM yyyy", { locale: ptBR })}
                    </p>
                  </div>
                  <p className={`text-lg font-semibold ${tx.type === "income" ? "text-green-600" : "text-red-600"}`}>
                    {tx.type === "income" ? "+" : "-"}
                    {formatCurrency(tx.amount)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500 py-8">Nenhuma transação registrada</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
