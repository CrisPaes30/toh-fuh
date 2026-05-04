import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Target, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getUserCategories, getUserGoals, createGoal, updateGoal } from "@/lib/db";

export default function Goals() {
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const queryClient = useQueryClient();

  const { data: categories = [] } = useQuery({ queryKey: ["categories"], queryFn: getUserCategories });
  const { data: goals = [] } = useQuery({
    queryKey: ["goals", selectedYear, selectedMonth],
    queryFn: () => getUserGoals(selectedYear, selectedMonth),
  });

  const [formData, setFormData] = useState({ categoryId: "", name: "", targetAmount: "" });

  const createMutation = useMutation({
    mutationFn: (data: Parameters<typeof createGoal>[0]) => createGoal(data),
    onSuccess: () => {
      toast.success("Meta criada com sucesso!");
      setFormData({ categoryId: "", name: "", targetAmount: "" });
      queryClient.invalidateQueries({ queryKey: ["goals"] });
    },
    onError: (e) => toast.error(`Erro ao criar meta: ${e.message}`),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...updates }: { id: string; status: "completed" }) => updateGoal(id, updates),
    onSuccess: () => {
      toast.success("Meta concluída!");
      queryClient.invalidateQueries({ queryKey: ["goals"] });
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.categoryId || !formData.name || !formData.targetAmount) {
      toast.error("Preencha todos os campos");
      return;
    }
    createMutation.mutate({
      categoryId: formData.categoryId,
      name: formData.name,
      targetAmount: Math.round(parseFloat(formData.targetAmount) * 100),
      year: selectedYear,
      month: selectedMonth,
    });
  };

  const formatCurrency = (cents: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Metas Financeiras</h1>
        <p className="text-gray-600 mt-1">Defina e acompanhe suas metas de economia e investimento</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
          <SelectTrigger><SelectValue placeholder="Ano" /></SelectTrigger>
          <SelectContent>
            {years.map((y) => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
          <SelectTrigger><SelectValue placeholder="Mês" /></SelectTrigger>
          <SelectContent>
            {months.map((m) => (
              <SelectItem key={m} value={m.toString()}>
                {format(new Date(2024, m - 1), "MMMM", { locale: ptBR })}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Nova Meta</CardTitle>
          <CardDescription>Crie uma nova meta para este mês</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Select value={formData.categoryId} onValueChange={(v) => setFormData({ ...formData, categoryId: v })}>
                <SelectTrigger><SelectValue placeholder="Categoria" /></SelectTrigger>
                <SelectContent>
                  {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
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
            <Button type="submit" disabled={createMutation.isPending} className="w-full">
              {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Target className="h-4 w-4 mr-2" />Criar Meta</>}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900">
          Metas de {format(new Date(selectedYear, selectedMonth - 1), "MMMM yyyy", { locale: ptBR })}
        </h2>
        {goals.length === 0 ? (
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
            {goals.map((goal) => {
              const progress = (goal.currentAmount / goal.targetAmount) * 100;
              const isCompleted = goal.status === "completed";
              const cat = categories.find((c) => c.id === goal.categoryId);
              return (
                <Card key={goal.id} className={isCompleted ? "border-green-200 bg-green-50" : ""}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{goal.name}</CardTitle>
                        <CardDescription>{cat?.name || goal.categoryId}</CardDescription>
                      </div>
                      {isCompleted && (
                        <span className="px-2 py-1 bg-green-200 text-green-800 text-xs font-semibold rounded">Concluída</span>
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
                        <div className="bg-blue-600 h-2 rounded-full transition-all" style={{ width: `${Math.min(progress, 100)}%` }} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-gray-600">Atual</p>
                        <p className="font-semibold text-blue-600">{formatCurrency(goal.currentAmount)}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Alvo</p>
                        <p className="font-semibold text-gray-900">{formatCurrency(goal.targetAmount)}</p>
                      </div>
                    </div>
                    {!isCompleted && progress >= 100 && (
                      <Button size="sm" className="w-full" onClick={() => updateMutation.mutate({ id: goal.id, status: "completed" })} disabled={updateMutation.isPending}>
                        {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><TrendingUp className="h-4 w-4 mr-2" />Marcar como Concluída</>}
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
