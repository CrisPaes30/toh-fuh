import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, FileText } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getUserTransactions, getUserCategories, calculateMonthlyBalance, getUserMonthlySummaries } from "@/lib/db";

function downloadCSV(filename: string, rows: string[][]): void {
  const content = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
  const blob = new Blob(["﻿" + content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Reports() {
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);

  const { data: transactions = [] } = useQuery({ queryKey: ["transactions"], queryFn: () => getUserTransactions(1000) });
  const { data: categories = [] } = useQuery({ queryKey: ["categories"], queryFn: getUserCategories });
  const { data: summaries = [] } = useQuery({ queryKey: ["analytics", "monthlySummaries"], queryFn: getUserMonthlySummaries });

  const formatCurrency = (cents: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);

  const handleMonthlyCSV = () => {
    const monthTx = transactions.filter((t) => {
      const d = new Date(t.date);
      return d.getFullYear() === selectedYear && d.getMonth() + 1 === selectedMonth;
    });

    if (monthTx.length === 0) {
      toast.error("Nenhuma transação encontrada para este período.");
      return;
    }

    const rows: string[][] = [["Data", "Tipo", "Categoria", "Descrição", "Valor (R$)"]];
    for (const tx of monthTx) {
      const cat = categories.find((c) => c.id === tx.categoryId);
      rows.push([
        format(new Date(tx.date), "dd/MM/yyyy"),
        tx.type === "income" ? "Entrada" : "Gasto",
        cat?.name || tx.categoryId,
        tx.description || "",
        (tx.amount / 100).toFixed(2),
      ]);
    }

    downloadCSV(`relatorio-${selectedYear}-${String(selectedMonth).padStart(2, "0")}.csv`, rows);
    toast.success("Relatório mensal exportado!");
  };

  const handleAnnualCSV = () => {
    const yearSummaries = summaries.filter((s) => s.year === selectedYear);

    if (yearSummaries.length === 0) {
      toast.error("Nenhum dado encontrado para este ano.");
      return;
    }

    const rows: string[][] = [["Mês", "Entradas (R$)", "Saídas (R$)", "Saldo (R$)"]];
    for (const s of yearSummaries.slice().sort((a, b) => a.month - b.month)) {
      rows.push([
        format(new Date(s.year, s.month - 1), "MMMM", { locale: ptBR }),
        (s.totalIncome / 100).toFixed(2),
        (s.totalExpense / 100).toFixed(2),
        (s.balance / 100).toFixed(2),
      ]);
    }

    downloadCSV(`relatorio-anual-${selectedYear}.csv`, rows);
    toast.success("Relatório anual exportado!");
  };

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Exportar Relatórios</h1>
        <p className="text-gray-600 mt-1">Exporte seus dados financeiros em CSV</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Relatório Mensal (CSV)</CardTitle>
          <CardDescription>Todas as transações de um mês em planilha</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {years.map((y) => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {months.map((m) => (
                  <SelectItem key={m} value={m.toString()}>
                    {format(new Date(2024, m - 1), "MMMM", { locale: ptBR })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleMonthlyCSV} className="w-full" size="lg">
            <Download className="h-4 w-4 mr-2" />
            Baixar Relatório Mensal
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Relatório Anual (CSV)</CardTitle>
          <CardDescription>Resumo mensal do ano inteiro em planilha</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {years.map((y) => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={handleAnnualCSV} className="w-full" size="lg">
            <Download className="h-4 w-4 mr-2" />
            Baixar Relatório Anual
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sobre os Relatórios</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              Relatório Mensal
            </h3>
            <p className="text-sm text-gray-600">
              Exporta todas as transações do mês selecionado com data, tipo, categoria, descrição e valor.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <FileText className="h-5 w-5 text-green-600" />
              Relatório Anual
            </h3>
            <p className="text-sm text-gray-600">
              Exporta o resumo mensal do ano com totais de entradas, saídas e saldo por mês.
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-600">
              💡 <strong>Dica:</strong> Abra o arquivo CSV no Excel ou Google Planilhas para análise e formatação avançada.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
