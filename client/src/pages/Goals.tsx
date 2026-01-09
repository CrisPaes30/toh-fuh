import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Loader2, Target, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function Goals() {
  const { user } = useAuth();
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);

  const { data: categories } = trpc.categories.list.useQuery();
  const { data: goals, refetch: refetchGoals } = trpc.goals.list.useQuery({
    year: selectedYear,
    month: selectedMonth,
  });

  const [formData, setFormData] = useState({
    categoryId: "",
    name: "",
    targetAmount: "",
  });

  const createGoalMutation = trpc.goals.create.useMutation({
    onSuccess: () => {
      toast.success("Meta criada com sucesso!");
      setFormData({ categoryId: "", name: "", targetAmount: "" });
      refetchGoals();
    },
    onError: (error) => {
      toast.error(`Erro ao criar meta: ${error.message}`);
    },
  });

  const updateGoalMutation = trpc.goals.update.useMutation({
    onSuccess: () => {
      toast.success("Meta atualizada com sucesso!");
      refetchGoals();
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar meta: ${error.message}`);
    },
  });

  const handleCreateGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.categoryId || !formData.name || !formData.targetAmount) {
      toast.error("Preencha todos os campos");
      return;
    }

    createGoalMutation.mutate({
      categoryId: parseInt(formData.categoryId),
      name: formData.name,
      targetAmount: parseFloat(formData.targetAmount),
      year: selectedYear,
      month: selectedMonth,
    });
  };

  const handleCompleteGoal = (goalId: number) => {
    updateGoalMutation.mutate({
      id: goalId,
      status: "completed",
    });
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(cents / 100);
  };

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Metas Financeiras</h1>
        <p className="text-gray-600 mt-1">
          Defina e acompanhe suas metas de economia e investimento
        </p>
      </div>

      {/* Filtros */}
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

      {/* Formulário de Nova Meta */}
      <Card>
        <CardHeader>
          <CardTitle>Nova Meta</CardTitle>
          <CardDescription>Crie uma nova meta para este mês</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateGoal} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Select value={formData.categoryId} onValueChange={(v) => setFormData({ ...formData, categoryId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  {categories?.map((cat: any) => (
                    <SelectItem key={cat.id} value={cat.id.toString()}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Input
                placeholder="Nome da meta"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />

              <Input
                placeholder="Valor alvo (R$)"
                type="number"
                step="0.01"
                value={formData.targetAmount}
                onChange={(e) => setFormData({ ...formData, targetAmount: e.target.value })}
              />
            </div>

            <Button type="submit" disabled={createGoalMutation.isPending} className="w-full">
              {createGoalMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Criando...
                </>
              ) : (
                <>
                  <Target className="h-4 w-4 mr-2" />
                  Criar Meta
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Lista de Metas */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900">
          Metas de {format(new Date(selectedYear, selectedMonth - 1), "MMMM yyyy", { locale: ptBR })}
        </h2>

        {!goals || goals.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <Target className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500">Nenhuma meta criada para este período</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {goals.map((goal: any) => {
              const progress = (goal.currentAmount / goal.targetAmount) * 100;
              const isCompleted = goal.status === "completed";

              return (
                <Card key={goal.id} className={isCompleted ? "border-green-200 bg-green-50" : ""}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{goal.name}</CardTitle>
                        <CardDescription>{goal.categoryId}</CardDescription>
                      </div>
                      {isCompleted && (
                        <span className="px-2 py-1 bg-green-200 text-green-800 text-xs font-semibold rounded">
                          Concluída
                        </span>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm text-gray-600">Progresso</span>
                        <span className="text-sm font-semibold">{Math.round(progress)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all"
                          style={{ width: `${Math.min(progress, 100)}%` }}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-gray-600">Atual</p>
                        <p className="font-semibold text-blue-600">
                          {formatCurrency(goal.currentAmount)}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">Alvo</p>
                        <p className="font-semibold text-gray-900">
                          {formatCurrency(goal.targetAmount)}
                        </p>
                      </div>
                    </div>

                    {!isCompleted && progress >= 100 && (
                      <Button
                        size="sm"
                        className="w-full"
                        onClick={() => handleCompleteGoal(goal.id)}
                        disabled={updateGoalMutation.isPending}
                      >
                        {updateGoalMutation.isPending ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Marcando...
                          </>
                        ) : (
                          <>
                            <TrendingUp className="h-4 w-4 mr-2" />
                            Marcar como Concluída
                          </>
                        )}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
