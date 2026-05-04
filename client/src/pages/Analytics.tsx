import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getUserMonthlySummaries } from "@/lib/db";

export default function Analytics() {
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  const { data: summaries = [] } = useQuery({
    queryKey: ["analytics", "monthlySummaries"],
    queryFn: getUserMonthlySummaries,
  });

  const yearlyData = summaries.filter((s) => s.year === selectedYear);

  const formatCurrency = (cents: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);

  const chartData = yearlyData
    .slice()
    .sort((a, b) => a.month - b.month)
    .map((s) => ({
      month: format(new Date(s.year, s.month - 1), "MMM", { locale: ptBR }),
      income: s.totalIncome / 100,
      expense: s.totalExpense / 100,
      balance: s.balance / 100,
    }));

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);

  return (
    <div className="space-y-6">
      <div className="flex gap-4 flex-wrap">
        <div className="flex-1 min-w-[150px]">
          <label className="text-sm font-medium text-gray-700 block mb-2">Ano</label>
          <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((year) => (
                <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Comparação Anual - {selectedYear}</CardTitle>
          <CardDescription>Entradas vs Saídas por mês</CardDescription>
        </CardHeader>
        <CardContent>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => `R$ ${typeof value === "number" ? value.toFixed(2) : value}`} />
                <Legend />
                <Bar dataKey="income" fill="#10b981" name="Entradas" />
                <Bar dataKey="expense" fill="#ef4444" name="Saídas" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-96 flex items-center justify-center text-gray-500">
              Nenhum dado disponível para este ano
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Evolução do Saldo - {selectedYear}</CardTitle>
          <CardDescription>Saldo mensal ao longo do ano</CardDescription>
        </CardHeader>
        <CardContent>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDashboard="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => `R$ ${typeof value === "number" ? value.toFixed(2) : value}`} />
                <Line type="monotone" dataKey="balance" stroke="#3b82f6" name="Saldo" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500">
              Nenhum dado disponível
            </div>
          )}
        </CardContent>
      </Card>

      {chartData.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total de Entradas</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(chartData.reduce((s, d) => s + d.income * 100, 0))}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total de Saídas</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-red-600">
                {formatCurrency(chartData.reduce((s, d) => s + d.expense * 100, 0))}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Saldo Anual</CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-2xl font-bold ${chartData.reduce((s, d) => s + d.balance, 0) >= 0 ? "text-blue-600" : "text-red-600"}`}>
                {formatCurrency(chartData.reduce((s, d) => s + d.balance * 100, 0))}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Detalhes Mensais - {selectedYear}</CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b">
                  <tr>
                    <th className="text-left py-2 px-4">Mês</th>
                    <th className="text-right py-2 px-4">Entradas</th>
                    <th className="text-right py-2 px-4">Saídas</th>
                    <th className="text-right py-2 px-4">Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {chartData.map((row, idx) => (
                    <tr key={idx} className="border-b hover:bg-gray-50">
                      <td className="py-2 px-4">{row.month}</td>
                      <td className="text-right py-2 px-4 text-green-600 font-medium">
                        {formatCurrency(row.income * 100)}
                      </td>
                      <td className="text-right py-2 px-4 text-red-600 font-medium">
                        {formatCurrency(row.expense * 100)}
                      </td>
                      <td className={`text-right py-2 px-4 font-medium ${row.balance >= 0 ? "text-blue-600" : "text-red-600"}`}>
                        {formatCurrency(row.balance * 100)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-center text-gray-500 py-8">
              Nenhum dado disponível para este período
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
