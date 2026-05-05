import { useMemo } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Trash2, TrendingUp, TrendingDown, Wallet, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getUserTransactions, getUserCategories, deleteTransaction } from "@/lib/db";

type FilterType = "income" | "expense" | "all";

export default function Transactions() {
  const params = useParams<{ type: string }>();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const filterType = (params.type ?? "all") as FilterType;

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ["transactions"],
    queryFn: () => getUserTransactions(1000),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: getUserCategories,
  });

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      const d = new Date(t.date);
      const sameMonth = d.getFullYear() === currentYear && d.getMonth() + 1 === currentMonth;
      if (!sameMonth) return false;
      if (filterType === "all") return true;
      return t.type === filterType;
    });
  }, [transactions, filterType, currentYear, currentMonth]);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteTransaction(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
      toast.success("Lançamento excluído.");
    },
    onError: () => toast.error("Erro ao excluir lançamento."),
  });

  const formatCurrency = (cents: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);

  const title =
    filterType === "income" ? "Entradas" :
    filterType === "expense" ? "Saídas" :
    "Todas as Transações";

  const total = filtered.reduce((sum, t) => sum + t.amount, 0);

  const Icon =
    filterType === "income" ? TrendingUp :
    filterType === "expense" ? TrendingDown :
    Wallet;

  const iconColor =
    filterType === "income" ? "text-green-600" :
    filterType === "expense" ? "text-red-600" :
    "text-blue-600";

  const totalColor =
    filterType === "income" ? "text-green-600" :
    filterType === "expense" ? "text-red-600" :
    "text-blue-600";

  const getCategoryName = (categoryId: string) =>
    categories.find((c) => c.id === categoryId)?.name ?? "—";

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Icon className={`h-6 w-6 ${iconColor}`} />
            {title}
          </h1>
          <p className="text-sm text-gray-500">
            {format(now, "MMMM yyyy", { locale: ptBR })}
          </p>
        </div>
      </div>

      {/* Total do período */}
      <Card className={`border-l-4 ${filterType === "income" ? "border-l-green-500" : filterType === "expense" ? "border-l-red-500" : "border-l-blue-500"}`}>
        <CardContent className="pt-4">
          <p className="text-sm text-gray-500">Total do mês</p>
          <p className={`text-3xl font-bold ${totalColor}`}>{formatCurrency(total)}</p>
          <p className="text-sm text-gray-400 mt-1">{filtered.length} lançamento{filtered.length !== 1 ? "s" : ""}</p>
        </CardContent>
      </Card>

      {/* Lista */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Lançamentos</CardTitle>
          <CardDescription>Clique no ícone de lixeira para excluir</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Icon className={`h-12 w-12 mx-auto mb-3 opacity-20 ${iconColor}`} />
              <p>Nenhum lançamento neste mês</p>
            </div>
          ) : (
            <div className="divide-y">
              {filtered.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between py-3 gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">
                      {tx.description || getCategoryName(tx.categoryId)}
                    </p>
                    <div className="flex gap-2 text-xs text-gray-500 mt-0.5">
                      <span>{getCategoryName(tx.categoryId)}</span>
                      <span>·</span>
                      <span>{format(new Date(tx.date), "dd MMM yyyy", { locale: ptBR })}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <p className={`text-base font-semibold ${tx.type === "income" ? "text-green-600" : "text-red-600"}`}>
                      {tx.type === "income" ? "+" : "−"}{formatCurrency(tx.amount)}
                    </p>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-gray-400 hover:text-red-600"
                      disabled={deleteMutation.isPending}
                      onClick={() => deleteMutation.mutate(tx.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
