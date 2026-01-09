import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Loader2, Download, FileText } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function Reports() {
  const { user } = useAuth();
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);

  const generateMonthlyMutation = trpc.reports.generateMonthlyPDF.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        // Decode base64 and create blob
        const binaryString = atob(data.data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: "application/pdf" });

        // Create download link
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = data.fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        toast.success("Relatório mensal gerado com sucesso!");
      }
    },
    onError: (error) => {
      toast.error(`Erro ao gerar relatório: ${error.message}`);
    },
  });

  const generateAnnualMutation = trpc.reports.generateAnnualPDF.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        // Decode base64 and create blob
        const binaryString = atob(data.data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: "application/pdf" });

        // Create download link
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = data.fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        toast.success("Relatório anual gerado com sucesso!");
      }
    },
    onError: (error) => {
      toast.error(`Erro ao gerar relatório: ${error.message}`);
    },
  });

  const handleGenerateMonthly = () => {
    generateMonthlyMutation.mutate({
      year: selectedYear,
      month: selectedMonth,
    });
  };

  const handleGenerateAnnual = () => {
    generateAnnualMutation.mutate({
      year: selectedYear,
    });
  };

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Exportar Relatórios</h1>
        <p className="text-gray-600 mt-1">
          Gere e baixe relatórios em PDF de seus dados financeiros
        </p>
      </div>

      {/* Relatório Mensal */}
      <Card>
        <CardHeader>
          <CardTitle>Relatório Mensal</CardTitle>
          <CardDescription>
            Gere um relatório detalhado com todas as transações de um mês específico
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o ano" />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o mês" />
                </SelectTrigger>
                <SelectContent>
                  {months.map((month) => (
                    <SelectItem key={month} value={month.toString()}>
                      {format(new Date(2024, month - 1), "MMMM", { locale: ptBR })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900">
                <strong>Conteúdo do relatório:</strong> Resumo de entradas e saídas, tabela detalhada de transações,
                gráficos de comparação e análises.
              </p>
            </div>

            <Button
              onClick={handleGenerateMonthly}
              disabled={generateMonthlyMutation.isPending}
              className="w-full"
              size="lg"
            >
              {generateMonthlyMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Gerando PDF...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Baixar Relatório Mensal
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Relatório Anual */}
      <Card>
        <CardHeader>
          <CardTitle>Relatório Anual</CardTitle>
          <CardDescription>
            Gere um relatório completo com resumo mensal e insights do ano inteiro
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o ano" />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-900">
                <strong>Conteúdo do relatório:</strong> Resumo anual de entradas e saídas, tabela mensal detalhada,
                insights sobre padrões de gastos e taxa de economia.
              </p>
            </div>

            <Button
              onClick={handleGenerateAnnual}
              disabled={generateAnnualMutation.isPending}
              className="w-full"
              size="lg"
            >
              {generateAnnualMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Gerando PDF...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Baixar Relatório Anual
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Informações Adicionais */}
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
              Inclui um resumo das entradas e saídas do mês, tabela detalhada de todas as transações, e comparação
              visual entre receitas e despesas.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <FileText className="h-5 w-5 text-green-600" />
              Relatório Anual
            </h3>
            <p className="text-sm text-gray-600">
              Apresenta um resumo completo do ano com dados de cada mês, insights sobre seus padrões de gastos, mês
              com maior entrada/saída, e taxa de economia anual.
            </p>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 mt-4">
            <p className="text-sm text-gray-600">
              💡 <strong>Dica:</strong> Use os relatórios para análise financeira, planejamento orçamentário e
              compartilhamento com contadores ou consultores financeiros.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
