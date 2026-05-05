import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, AlertCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { getUserCategories, getUserLimits, createLimit, deleteLimit } from "@/lib/db";

export default function Alerts() {
  const queryClient = useQueryClient();

  const { data: categories = [] } = useQuery({ queryKey: ["categories"], queryFn: getUserCategories });
  const { data: limits = [] } = useQuery({ queryKey: ["limits"], queryFn: getUserLimits });

  const [formData, setFormData] = useState({ categoryId: "", monthlyLimit: "", alertThreshold: "80" });

  const createMutation = useMutation({
    mutationFn: (data: Parameters<typeof createLimit>[0]) => createLimit(data),
    onSuccess: () => {
      toast.success("Limite de gasto criado!");
      setFormData({ categoryId: "", monthlyLimit: "", alertThreshold: "80" });
      queryClient.invalidateQueries({ queryKey: ["limits"] });
    },
    onError: (e) => toast.error(`Erro: ${e.message}`),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteLimit(id),
    onSuccess: () => {
      toast.success("Limite removido!");
      queryClient.invalidateQueries({ queryKey: ["limits"] });
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.categoryId || !formData.monthlyLimit) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    createMutation.mutate({
      categoryId: formData.categoryId,
      monthlyLimit: Math.round(parseFloat(formData.monthlyLimit) * 100),
      alertThreshold: parseInt(formData.alertThreshold),
    });
  };

  const formatCurrency = (cents: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Alertas e Limites</h1>
        <p className="text-gray-600 mt-1">Configure limites de gastos mensais por categoria</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Limites de Gastos</CardTitle>
          <CardDescription>
            Defina limites mensais por categoria
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Select value={formData.categoryId} onValueChange={(v) => setFormData({ ...formData, categoryId: v })}>
                <SelectTrigger><SelectValue placeholder="Categoria" /></SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Input
                placeholder="Limite mensal (R$)"
                type="number"
                step="0.01"
                value={formData.monthlyLimit}
                onChange={(e) => setFormData({ ...formData, monthlyLimit: e.target.value })}
              />

              <Select value={formData.alertThreshold} onValueChange={(v) => setFormData({ ...formData, alertThreshold: v })}>
                <SelectTrigger><SelectValue placeholder="Alerta em %" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="50">50%</SelectItem>
                  <SelectItem value="75">75%</SelectItem>
                  <SelectItem value="80">80%</SelectItem>
                  <SelectItem value="90">90%</SelectItem>
                  <SelectItem value="100">100%</SelectItem>
                </SelectContent>
              </Select>

              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Adicionar"}
              </Button>
            </div>
          </form>

          {limits.length > 0 ? (
            <div className="space-y-3 mt-6">
              {limits.map((limit) => {
                const cat = categories.find((c) => c.id === limit.categoryId);
                return (
                  <div key={limit.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{cat?.name || limit.categoryId}</p>
                      <p className="text-sm text-gray-600">
                        Limite: {formatCurrency(limit.monthlyLimit)} • Alerta em {limit.alertThreshold}%
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteMutation.mutate(limit.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-center text-gray-500 py-4">Nenhum limite configurado</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Histórico de Alertas</CardTitle>
          <CardDescription>Alertas automáticos baseados em suas atividades financeiras</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">Nenhum alerta no momento</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
